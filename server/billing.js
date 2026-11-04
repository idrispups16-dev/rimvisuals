import crypto from 'node:crypto';
export const plans={monthly:{days:30,stars:80,nanoTon:'2000000000'},quarterly:{days:90,stars:270,nanoTon:'3000000000'},lifetime:{days:null,stars:450,nanoTon:'5000000000'}};
export const isUuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
export function matchesPayment(order,payment,sender){return Boolean(order&&order.provider==='stars'&&order.telegram_user_id===String(sender)&&payment.invoice_payload===order.id&&payment.currency==='XTR'&&payment.total_amount===Number(order.amount)&&typeof payment.telegram_payment_charge_id==='string'&&payment.telegram_payment_charge_id.length>0);}
export function safeEqual(a,b){if(typeof a!=='string'||typeof b!=='string'||!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y);}
export function ready(){return process.env.AUTO_BILLING_ENABLED==='true'&&Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY);}
export async function db(path,body,method='POST'){
 const r=await fetch(process.env.SUPABASE_URL+'/rest/v1/'+path,{method,headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(7000)});
 if(!r.ok){const e=Error('Database unavailable');e.stage='database';e.code=r.status;throw e;}const text=await r.text();return text?JSON.parse(text):null;
}
export async function user(req){const token=req.headers.authorization;if(!/^Bearer [A-Za-z0-9._-]+$/.test(token||''))return null;const r=await fetch(process.env.SUPABASE_URL+'/auth/v1/user',{headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:token},signal:AbortSignal.timeout(7000)});if(!r.ok)return null;const u=await r.json();return u.email_confirmed_at?u:null;}
export async function telegram(method,body){
 if(!process.env.TELEGRAM_BOT_TOKEN)throw Error('Bot unavailable');
 try{const r=await fetch('https://api.telegram.org/bot'+process.env.TELEGRAM_BOT_TOKEN+'/'+method,{method:'POST',headers:body instanceof FormData?undefined:{'Content-Type':'application/json'},body:body instanceof FormData?body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});let value;try{value=await r.json();}catch{value={};}if(!r.ok||!value.ok){const e=Error('Telegram unavailable');e.stage=method;e.code=r.status;e.reason=String(value.description||'').slice(0,180).replace(/\b[0-9]{5,}:[A-Za-z0-9_-]+\b/g,'[redacted]');throw e;}return value.result;}
 catch(e){if(!e.stage)e.stage=method;throw e;}
}
export async function releaseUrl(){const object=process.env.MOD_STORAGE_OBJECT;if(!object||object.includes('..'))throw Error('Release unavailable');const path='/storage/v1/object/sign/mod-releases/'+object.split('/').map(encodeURIComponent).join('/');const r=await fetch(process.env.SUPABASE_URL+path,{method:'POST',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:120}),signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error('Release unavailable');const {signedURL}=await r.json();if(typeof signedURL!=='string'||!signedURL.startsWith('/object/sign/mod-releases/'))throw Error('Invalid storage response');return process.env.SUPABASE_URL+'/storage/v1'+signedURL;}
export async function signedDownload(uid){if(!await db('rpc/paid_download_access',{p_user:uid}))throw Error('No paid access');return releaseUrl();}
export async function sendJar(chat,url,caption='RIMVISUALS'){
 const parsed=new URL(url);if(parsed.origin!==new URL(process.env.SUPABASE_URL).origin||!parsed.pathname.startsWith('/storage/v1/object/sign/mod-releases/'))throw Error('Invalid release origin');
 const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok||!response.body)throw Error('Release download failed');
 const reader=response.body.getReader(),chunks=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>4*1024*1024){await reader.cancel();throw Error('Release exceeds configured bot limit');}chunks.push(value);}
 const bytes=Buffer.concat(chunks);if(bytes.length<4||bytes[0]!==80||bytes[1]!==75)throw Error('Invalid JAR release');
 const form=new FormData();form.set('chat_id',String(chat));form.set('caption',caption);form.set('document',new Blob([bytes],{type:'application/java-archive'}),process.env.MOD_STORAGE_OBJECT.split('/').at(-1));return telegram('sendDocument',form);
}
export function headers(res){res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');}

export async function isAdmin(req,u){
 if(!process.env.SUPABASE_ANON_KEY)return false;
 const r=await fetch(process.env.SUPABASE_URL+'/rest/v1/site_admins?user_id=eq.'+encodeURIComponent(u.id)+'&select=user_id',{headers:{apikey:process.env.SUPABASE_ANON_KEY,Authorization:req.headers.authorization},signal:AbortSignal.timeout(7000)});
 if(!r.ok)return false;const rows=await r.json();return Array.isArray(rows)&&rows.some(row=>row.user_id===u.id);
}
