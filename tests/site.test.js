import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');const account=fs.readFileSync(new URL('../account.html',import.meta.url),'utf8');const checkout=fs.readFileSync(new URL('../api/checkout.js',import.meta.url),'utf8');
test('AI concept image gallery removed',()=>{assert.ok(!html.includes('Concept art'));assert.ok(html.includes('assets/screenshots/clickgui.webp'));assert.ok(html.includes('assets/screenshots/hw-helper.webp'))});
test('membership pages and user profile present',()=>{assert.ok(html.includes('id="pricing"'));assert.ok(account.includes('id="authForm"'));assert.ok(account.includes('id="dashboard"'));assert.ok(account.includes('Minecraft nickname'))});
test('no paid mod checkout enabled',()=>{assert.ok(checkout.includes('503'));assert.ok(checkout.includes('not currently selling mod subscriptions'))});
test('private database rules present',()=>{const sql=fs.readFileSync(new URL('../supabase/schema.sql',import.meta.url),'utf8');assert.ok(sql.includes('enable row level security'));assert.ok(sql.includes('auth.uid()=user_id'))});
