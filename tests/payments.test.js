import test from 'node:test';import assert from 'node:assert/strict';
import {initializePayments,WALLET} from '../assets/payments.js';
function fixture(){let elements=new Map();const doc={getElementById(id){if(!elements.has(id))elements.set(id,{value:'',textContent:'',href:'',addEventListener(event,fn){this[event]=fn;}});return elements.get(id);}};return doc;}
test('payment choice shows approved prices and TON amount for each plan',()=>{
 const cases=[['monthly',80,2,75],['quarterly',270,3,209],['lifetime',450,5,325]];
 for(const [plan,stars,ton,rub] of cases){const d=fixture();initializePayments(d,'?plan='+plan);
 assert.equal(d.getElementById('starsPrice').textContent,stars+' Stars');assert.equal(d.getElementById('tonPrice').textContent,ton+' TON');assert.equal(d.getElementById('funpayPrice').textContent,rub+' ₽ + комиссия FunPay');
 assert.equal(d.getElementById('tonPay').href,`ton://transfer/${WALLET}?amount=${ton*1000000000}`);
 assert.equal(d.getElementById('starsContact').href,'/account.html?plan='+plan+'#purchases');}
});
test('changing tariff updates wallet link and unknown input falls back safely',()=>{const d=fixture();initializePayments(d,'?plan=__proto__');const s=d.getElementById('plan');assert.equal(s.value,'monthly');s.value='lifetime';s.change();assert.ok(d.getElementById('tonPay').href.endsWith('amount=5000000000'));assert.ok(d.getElementById('funpayPay').href.endsWith('81279020'));});
