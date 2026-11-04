export const WALLET = 'UQAI4TNeZSkk0KncuMLVN0JPtGhvrLsGZHEMe1Hy5YQa__2h';
export const CONTACT = 'https://t.me/puwewa';
export const PLANS = Object.freeze({
 monthly: {name:'1 месяц',rub:75,stars:80,ton:2,offer:81278796},
 quarterly: {name:'3 месяца',rub:209,stars:270,ton:3,offer:81278914},
 lifetime: {name:'Бессрочно',rub:325,stars:450,ton:5,offer:81279020}
});
export function tonLink(plan){return `ton://transfer/${WALLET}?amount=${PLANS[plan].ton*1_000_000_000}`;}
export function initializePayments(doc=document,search=location.search){
 const select=doc.getElementById('plan');const requested=new URLSearchParams(search).get('plan');
 select.value=Object.hasOwn(PLANS,requested)?requested:'monthly';
 const render=()=>{const key=select.value,p=PLANS[key];
  doc.getElementById('starsPrice').textContent=p.stars+' Stars';
  doc.getElementById('tonPrice').textContent=p.ton+' TON';
  doc.getElementById('funpayPrice').textContent=p.rub+' ₽ + комиссия FunPay';
  doc.getElementById('tonPay').href=tonLink(key);
  doc.getElementById('funpayPay').href='https://funpay.com/lots/offer?id='+p.offer;
  for(const method of ['stars','crypto'])doc.getElementById(method+'Contact').href=CONTACT+'?text='+encodeURIComponent('Здравствуйте! Хочу RIMVISUALS: '+p.name+'. Оплата '+(method==='stars'?p.stars+' Stars':p.ton+' TON')+'. Подскажите порядок оплаты и активации.');
 };select.addEventListener('change',render);render();
 doc.getElementById('copyWallet').addEventListener('click',async()=>{const status=doc.getElementById('copyStatus');try{await navigator.clipboard.writeText(WALLET);status.textContent='Адрес скопирован.';}catch{status.textContent='Не удалось скопировать. Выделите адрес кошелька и скопируйте вручную.';}});
}
