export function initializePurchaseAccount(sb){
 const $=id=>document.getElementById(id),message=text=>$('purchaseStatus').textContent=text;
 async function call(path,body){const {data:{session}}=await sb.auth.getSession();if(!session)throw Error('Сначала войдите в аккаунт.');const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify(body||{})});let value={};try{value=await r.json();}catch{}if(!r.ok)throw Error(value.error||'Операция пока недоступна.');return value;}
 async function run(button,action){button.disabled=true;message('Проверяем…');try{await action();}catch(e){message(e.message);}finally{button.disabled=false;}}
 $('payStarsAuto').onclick=()=>run($('payStarsAuto'),async()=>{const order=await call('/api/create-order',{provider:'stars',plan:$('purchasePlan').value});if(!order.url.startsWith('https://t.me/RIMVISUALSPAY_bot?start='))throw Error('Неверная ссылка оплаты.');location.assign(order.url);});
 $('redeemPurchaseKey').onclick=()=>run($('redeemPurchaseKey'),async()=>{await call('/api/redeem-key',{code:$('purchaseKey').value});$('purchaseKey').value='';message('Ключ активирован. Нажмите «Скачать мод».');});
 $('downloadPaidMod').onclick=()=>run($('downloadPaidMod'),async()=>{const result=await call('/api/download');const url=new URL(result.url);if(url.origin!=='https://pixqnuuvpxxxwaxjntpl.supabase.co'||!url.pathname.startsWith('/storage/v1/object/sign/mod-releases/'))throw Error('Неверная ссылка загрузки.');location.assign(url.href);message('Загрузка запущена.');});
}
