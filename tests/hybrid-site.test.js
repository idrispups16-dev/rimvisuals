import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const file = name => readFileSync(new URL('../'+name,import.meta.url),'utf8');
const home=file('index.html'),exp=file('experience.html'),lab=file('config-lab.html');
const sharedCSS=file('assets/hybrid.css');

test('product pages are linked from homepage and use real site assets',()=>{
  assert.match(home,/href="experience\.html"/);
  assert.match(home,/href="config-lab\.html"/);
  assert.match(home,/id="hybrid-showcase"/);
  assert.match(exp,/assets\/screenshots\/latest-menu-columns\.webp/);
  assert.match(exp,/assets\/screenshots\/latest-world-clean\.webp/);
  assert.match(lab,/assets\/screenshots\/latest-world-clean\.webp/);
  assert.match(sharedCSS,/prefers-reduced-motion/);
});
test('three product states are represented without claiming a live inject or Jarvis',()=>{
  assert.match(exp,/NOT LIVE/);
  assert.match(exp,/PREVIEW/);
  assert.match(exp,/Not connected/);
  assert.match(exp,/In development/);
  assert.match(lab,/Это браузерный предпросмотр/);
  assert.match(lab,/не изменяет настройки установленного RIMVISUALS/);
});
test('config lab exports non-game JSON and stores drafts in browser only',()=>{
  assert.match(lab,/rimvisuals\.web-preview\.v1/);
  assert.match(lab,/localStorage\.setItem/);
  assert.match(lab,/source:'browser-only'/);
  assert.match(lab,/RIMVISUALS-web-preview\.json/);
  assert.match(lab,/Это не игровой CFG/);
});
test('inline interactive config script passes JavaScript syntax check',()=>{
  const code=lab.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(code);
  const checked=spawnSync(process.execPath,['--check'],{input:code,encoding:'utf8'});
  assert.equal(checked.status,0,checked.stderr);
});
test('new pages have balanced section tags and mobile layout',()=>{
  for(const page of [home,exp,lab]){
    assert.equal((page.match(/<section\b/g)||[]).length,(page.match(/<\/section>/g)||[]).length);
  }
  assert.match(sharedCSS,/max-width:780px/);
});
