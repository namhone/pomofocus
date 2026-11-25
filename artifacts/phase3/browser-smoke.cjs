const {chromium}=require('@playwright/test');
const {spawn}=require('child_process'); const fs=require('fs'); const assert=require('assert/strict');
const base='http://127.0.0.1:5193'; let browser;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5193','--strictPort'],{cwd:process.cwd(),windowsHide:true,stdio:'ignore'});
(async()=>{try{
 for(let i=0;i<80;i++){try {const r=await fetch(base);if(r.ok)break;}catch{} await new Promise(r=>setTimeout(r,250));}
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 const context=await browser.newContext({viewport:{width:390,height:844},permissions:['camera','microphone']});
 await context.route('**/*',route=>route.request().url().startsWith(base)||route.request().url().startsWith('data:')?route.continue():route.abort());
 const page=await context.newPage(); const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message);});
 await page.addInitScript(()=>{
  window.__streams=[];window.__workers=[];window.__contexts=[];window.__urls=[];window.__revoked=[];
  const gum=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async(...a)=>{const s=await gum(...a);window.__streams.push(s);return s;};
  const AC=window.AudioContext;window.AudioContext=class extends AC {constructor(...a){super(...a);window.__contexts.push(this);}createMediaStreamSource(...a){this.__roomAnalyser=true;return super.createMediaStreamSource(...a);}};
  const W=window.Worker;window.Worker=class extends W {constructor(...a){super(...a);this.__terminated=false;window.__workers.push(this);}terminate(){this.__terminated=true;return super.terminate();}};
  const make=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);URL.createObjectURL=(b)=>{const u=make(b);window.__urls.push(u);return u;};URL.revokeObjectURL=u=>{window.__revoked.push(u);revoke(u);};
 });
 await page.goto(base+'/artifacts/phase3/browser-harness.html',{waitUntil:'commit',timeout:60000});await page.waitForFunction(()=>window.mountPhase3,{},{timeout:120000});console.log('HARNESS_READY');
 await page.evaluate(()=>window.mountPhase3('focus'));await page.getByTestId('mobile-timer-main-action').waitFor();
 for(const id of ['mobile-timer-reset','mobile-timer-skip']) {const b=await page.getByTestId(id).boundingBox();assert(b.width>=48&&b.height>=48,id);}
 const main=await page.getByTestId('mobile-timer-main-action').boundingBox();assert(main.width>=64&&main.height>=64);
 await page.screenshot({path:'artifacts/phase3/focus-390x844.png'});
 await page.evaluate(()=>window.mountPhase3('room'));await page.getByTestId('btn-join-room-confirm').waitFor();await page.waitForFunction(()=>window.__streams.length>0);
 await page.screenshot({path:'artifacts/phase3/room-prejoin-390x844.png'});
 await page.getByTestId('btn-join-room-confirm').click();await page.getByTestId('btn-room-mic').waitFor();
 await page.waitForFunction(()=>window.__workers.length>0&&window.__contexts.length>0);
 await page.screenshot({path:'artifacts/phase3/room-390x844.png'});
 await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'artifacts/phase3/room-1440x900.png'});
 await page.evaluate(()=>{window.__mediaNodes=[...document.querySelectorAll('video,audio')];window.unmountPhase3();});
 await page.waitForFunction(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));
 const result=await page.evaluate(()=>({streams:window.__streams.length,allTracksEnded:window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')),mediaDetached:window.__mediaNodes.every(n=>n.srcObject===null),workersTerminated:window.__workers.every(w=>w.__terminated),workerURLsRevoked:window.__urls.every(u=>window.__revoked.includes(u)),roomContexts:window.__contexts.filter(c=>c.__roomAnalyser).length,contextsClosed:window.__contexts.filter(c=>c.__roomAnalyser).every(c=>c.state==='closed')}));
 assert(result.roomContexts>0,'room VAD context exercised');
 for(const [key,val] of Object.entries(result))if(typeof val==='boolean')assert.equal(val,true,key);
 assert.deepEqual(errors,[]);fs.writeFileSync('artifacts/phase3/browser-results.json',JSON.stringify({...result,pageErrors:errors,mobileTargets:{reset:48,skip:48,main:64}},null,2));console.log(JSON.stringify(result));
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
