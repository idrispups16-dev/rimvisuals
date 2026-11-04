import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../account.html', import.meta.url), 'utf8');
async function page(signInWithOAuth, suffix = '') {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, { textContent: '', value: '', disabled: false, classList: { toggle() {} }, addEventListener() {} });
    return elements.get(id);
  };
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/import\{[^}]+\}from'[^']+';/g, '');
  const context = vm.createContext({
    initializeDeviceAccount: async () => {},
    initializePurchaseAccount: () => {},
    document: { getElementById: get, querySelectorAll: () => [] },
    location: { origin: 'https://rimvisuals.example', search: suffix, hash: '', pathname: '/account.html', href: 'https://rimvisuals.example/account.html' + suffix },
    history: { replaceState() {} }, URL, URLSearchParams, setTimeout() {},
    fetch: async () => ({ json: async () => ({ authEnabled: true }) }),
    createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }), onAuthStateChange() {}, signInWithOAuth } })
  });
  await vm.runInContext('(async()=>{' + script + '})()', context);
  return get;
}

test('Google button is independent of required email/password fields', () => {
  assert.match(html, /<button[^>]*type="button"[^>]*id="googleSignIn"[^>]*>Continue with Google<\/button>/);
});
test('Google OAuth uses current origin and prevents duplicate clicks', async () => {
  let calls = 0, finish;
  const get = await page(async options => {
    calls++;
    assert.equal(options.provider, 'google');
    assert.equal(options.options.redirectTo, 'https://rimvisuals.example/account.html');
    await new Promise(resolve => { finish = resolve; });
    return { error: null };
  });
  const button = get('googleSignIn');
  assert.equal(typeof button.onclick, 'function');
  const pending = button.onclick();
  assert.equal(button.disabled, true);
  await button.onclick();
  assert.equal(calls, 1);
  finish();
  await pending;
});
for (const thrown of [false, true]) test(`Google ${thrown ? 'network' : 'API'} failure allows retry`, async () => {
  const get = await page(async () => {
    if (thrown) throw new Error('Network unavailable');
    return { error: { message: 'Provider unavailable' } };
  });
  assert.equal(typeof get('googleSignIn').onclick, 'function');
  await get('googleSignIn').onclick();
  assert.equal(get('googleSignIn').disabled, false);
  assert.match(get('message').textContent, /unavailable/);
  assert.equal(get('googleSignIn').textContent, 'Continue with Google');
});
test('OAuth callback cancellation is shown as text', async () => {
  const get = await page(async () => ({}), '?error=access_denied&error_description=Access+was+denied');
  assert.match(get('message').textContent, /Access was denied/);
});

