import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const script = fs.readFileSync(new URL('../assets/device-account.js', import.meta.url),'utf8').replace('export async function','async function');
async function page({signedIn=true,result={status:'pending',has_access:true,device_name:'My Minecraft'},failure=false}={}) {
  const nodes=new Map(),calls=[];
  const make=()=>({value:'',textContent:'',disabled:false,children:[],events:{},hidden:false,classList:{toggle(){},add(){},remove(){}},addEventListener(name,fn){this.events[name]=fn;},replaceChildren(){this.children=[];},append(...nodes){this.children.push(...nodes);}});
  const get=id=>{if(!nodes.has(id))nodes.set(id,make());return nodes.get(id);};
  const db={auth:{getUser:async()=>({data:{user:signedIn?{id:'member'}:null},error:null}),onAuthStateChange(){}},
    from:()=>({select:()=>({eq:()=>({gt:async()=>({data:[],error:null})})})}),
    rpc:async(name,args)=>{calls.push({name,args});return failure?{error:{message:'Connection failed'}}:{data:result,error:null};}};
  const context=vm.createContext({db,document:{getElementById:get,createElement:make},location:{href:'https://example.test/account.html?device=ABCD1234'},sessionStorage:{getItem:()=> 'ABCD1234',setItem(){},removeItem(){}},URL,setTimeout(){},fetch:async()=>({json:async()=>({authEnabled:true})}),createClient:()=>db});
  await vm.runInContext('(async()=>{'+script+'; await initializeDeviceAccount(db);})()',context);
  return {get,calls};
}
test('signed-out visitor cannot request device approval',async()=>{const{get,calls}=await page({signedIn:false});await get('lookupDevice').onclick();assert.equal(calls.length,0);assert.match(get('deviceMessage').textContent,/войдите/);});
test('checking a code never automatically approves it',async()=>{const{get,calls}=await page();await get('lookupDevice').onclick();assert.equal(calls.length,1);assert.equal(calls[0].name,'mod_device_info');assert.match(get('deviceMessage').textContent,/ABCD-1234/);});
test('no-access response cannot enable approval',async()=>{const{get,calls}=await page({result:{status:'pending',has_access:false}});await get('lookupDevice').onclick();await get('approveDevice').onclick();assert.equal(calls.length,1);assert.match(get('deviceMessage').textContent,/не выдан/);});
test('editing code invalidates previous confirmation',async()=>{const{get,calls}=await page();await get('lookupDevice').onclick();get('deviceCode').value='FFFF1111';get('deviceCode').events.input();await get('approveDevice').onclick();assert.equal(calls.length,1);});
test('lookup network error permits retry and displays failure',async()=>{const{get}=await page({failure:true});await get('lookupDevice').onclick();assert.equal(get('lookupDevice').disabled,false);assert.equal(get('deviceMessage').textContent,'Connection failed');});
