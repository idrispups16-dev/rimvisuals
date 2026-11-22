import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const home = read('../index.html');
const account = read('../account.html');
const contact = read('../payment.html');
const css = read('../assets/next.css');

test('next homepage has real ecosystem, Jarvis concept, existing showcase and roadmap', () => {
  for (const section of ['ecosystem','jarvis','roadmap','studio','features','gallery','pricing','community']) {
    assert.match(home, new RegExp('id="'+section+'"'), 'section '+section);
  }
  assert.match(home, /assets\/screenshots\/latest-world-clean\.webp/);
  assert.match(home, /assets\/next\.css/);
  assert.match(css, /prefers-reduced-motion/);
});
test('RIMVISUALS plans agree across all visible pages and legacy numbers are absent', () => {
  for (const page of [home, account, contact]) {
    for (const price of ['75 ₽','135 ₽','235 ₽']) assert.ok(page.includes(price),price);
    assert.ok(!page.includes('209 ₽') && !page.includes('325 ₽'),'stale plan price');
  }
});
test('new official support Telegram and claimed wallet are consistent', () => {
  for (const page of [home, account, contact]) assert.ok(page.includes('Sybo_6647'));
  assert.ok(home.includes('UQBX6lVo2xJDW53lBhD9Qwp7oxDr_BYgz7DoJXOKCYnhjYGY'));
  assert.ok(contact.includes('UQBX6lVo2xJDW53lBhD9Qwp7oxDr_BYgz7DoJXOKCYnhjYGY'));
  assert.ok(!home.includes('@puwewa') && !contact.includes('@puwewa'));
});
test('showcase does not portray future assistant and launcher as already released', () => {
  assert.match(home, /RIM JARVIS/);
  assert.match(home, /В разработке/);
  assert.match(home, /Планируется/);
  assert.match(contact, /Автоматическая оплата на сайте не подключена/);
});
