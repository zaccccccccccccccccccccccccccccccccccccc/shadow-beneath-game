import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {freshFixture, SAVE} from './fixtures.mjs';
import {setupFixture,waitForScene,clickCanvas,canvasClientPoint,clickWorldPoint} from './helpers.mjs';
const {chromium}=await import('../../outputs/browser-deps/node_modules/playwright/index.mjs');
const root=fileURLToPath(new URL('../../',import.meta.url)),out=root+'/outputs/movement-regression';
await mkdir(out,{recursive:true});
const server=await createServer({root,configFile:false,cacheDir:out+'/vite-cache',server:{host:'127.0.0.1',port:21000+Math.floor(Math.random()*10000),hmr:false,watch:{ignored:['**/outputs/**']}},optimizeDeps:{entries:['tests/browser/index.html'],include:['phaser']}});await server.listen();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={startedAt:new Date().toISOString(),cases:[],errors:[]};
const selected=process.env.MOVEMENT_CASES?.split(',');
async function read(page){return page.evaluate(()=>{const s=window.sandboxGame.scene.keys.world;return {x:s.player.x,y:s.player.y,facing:s.facing,walking:s.walking,gait:s.gaitDistance,texture:s.actorSprite.texture.key,frame:s.actorSprite.frame.name,flip:s.actorSprite.flipX,aim:s.pointerAim,path:s.path.length,index:s.pathIndex};});}
async function moveMouse(page,x,y){const pt=canvasClientPoint(await page.locator('canvas').boundingBox(),x,y);await page.mouse.move(pt.x,pt.y);}
async function test(name,fn,{position={x:1190,y:1120},tutorial={},area='hq'}={}){
 if(selected&&!selected.includes(name))return;
 const context=await browser.newContext({viewport:{width:1600,height:1000},hasTouch:true});
 const fixture=freshFixture();fixture[SAVE.checkpoint]=JSON.stringify({area,position,tutorial,visitedAreas:['hq',area]});await setupFixture(context,fixture);
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));
 try{
  await page.goto(server.resolvedUrls.local[0]+'tests/browser/index.html',{waitUntil:'commit',timeout:90000});
  await page.locator('#sandbox-resume').click({timeout:60000});await waitForScene(page,'world');
  await page.waitForFunction(()=>!window.sandboxGame.scene.keys.world.cameras.main.fadeEffect.isRunning);
  await page.mouse.move(5,10);
  const details=await fn(page);report.cases.push({name,status:'passed',details});console.log('PASS',name);
 }catch(e){report.cases.push({name,status:'failed',error:String(e.stack||e),state:await read(page).catch(()=>null)});process.exitCode=1;console.error('FAIL',name,e.message);await page.screenshot({path:out+'/'+name+'.png'}).catch(()=>{});}
 finally{await context.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
}
async function held(page,key,axis,sign){const before=await read(page);await page.keyboard.down(key);try{await page.waitForFunction(({axis,sign,start})=>sign*(window.sandboxGame.scene.keys.world.player[axis]-start)>65,{axis,sign,start:before[axis]},{timeout:2200});}finally{await page.keyboard.up(key);}const after=await read(page);assert.ok(sign*(after[axis]-before[axis])>65);return {before,after};}
try{
 await test('all-WASD-directions',async page=>{
   const results=[];
   for(const [key,axis,sign,facing] of [['a','x',-1,'left'],['d','x',1,'right'],['w','y',-1,'back'],['s','y',1,'front']]) {
     const r=await held(page,key,axis,sign);assert.equal(r.after.facing,facing);results.push(r);
   }return results;
 });
 await test('mouse-alone-does-not-turn-player',async page=>{
   const before=await read(page);
   for(const [x,y] of [[1120,450],[550,450],[800,200],[800,700]])await moveMouse(page,x,y);
   const after=await read(page);assert.equal(after.facing,before.facing);assert.equal(after.walking,false);return {before,after};
 });
 await test('touch-axis-uses-movement-heading',async page=>{
   await moveMouse(page,1120,450);const before=await read(page);
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('under-shadow-touch-axis',{detail:{x:-1,y:0}})));
   try {await page.waitForFunction(x=>window.sandboxGame.scene.keys.world.player.x<x-70,before.x,{timeout:2000});const after=await read(page);assert.equal(after.facing,'left');return after;}
   finally{await page.evaluate(()=>window.dispatchEvent(new CustomEvent('under-shadow-touch-axis',{detail:{x:0,y:0}})));}
 });
 await test('side-cycle-canvas-alignment',async page=>{
   await page.keyboard.down('d');
   const captures=[];
   try {
     for(const frame of [0,1,2,3]) {
       await page.waitForFunction(f=>{const s=window.sandboxGame.scene.keys.world;return s.walking&&s.actorSprite.texture.key==='player-side-approved'&&s.actorSprite.frame.name===f;},frame,{timeout:3000});
       // Inspect the actual source alpha data and display transform, not a duplicate animation implementation.
       const measurement=await page.evaluate(()=>{
         const s=window.sandboxGame.scene.keys.world,a=s.actorSprite,f=a.frame,canvas=document.createElement('canvas');canvas.width=f.width;canvas.height=f.height;
         const ctx=canvas.getContext('2d');ctx.drawImage(f.source.image,f.cutX,f.cutY,f.cutWidth,f.cutHeight,0,0,f.width,f.height);
         const pixels=ctx.getImageData(0,0,f.width,190).data;let lo=f.width,hi=0;
         for(let y=0;y<190;y++)for(let x=0;x<f.width;x++)if(pixels[(y*f.width+x)*4+3]>180){lo=Math.min(lo,x);hi=Math.max(hi,x);}
         return {frame:f.name,headX:((lo+hi)/2-f.width/2)*a.scaleX+a.x,offset:a.x};
       });
       assert.ok(Math.abs(measurement.headX)<.01,JSON.stringify(measurement));captures.push(measurement);
       await page.screenshot({path:out+'/side-frame-'+frame+'.png'});
     }
   }finally{await page.keyboard.up('d');}
   return captures;
 });
 for(const [key,axis,sign,facing] of [['ArrowLeft','x',-1,'left'],['ArrowRight','x',1,'right'],['ArrowUp','y',-1,'back'],['ArrowDown','y',1,'front']])await test(key,async page=>{const result=await held(page,key,axis,sign);assert.equal(result.after.facing,facing);return result;});
 await test('WASD-and-idle',async page=>{const r=await held(page,'d','x',1);await page.waitForFunction(()=>!window.sandboxGame.scene.keys.world.walking);const idle=await read(page);await page.evaluate(()=>new Promise(resolve=>{let n=0;const frame=()=>++n>=15?resolve():requestAnimationFrame(frame);requestAnimationFrame(frame);}));const later=await read(page);assert.equal(later.gait,idle.gait);assert.equal(later.walking,false);return {r,idle,later};});
 await test('movement-wins-over-opposite-mouse',async page=>{
   await moveMouse(page,1120,450);const r=await held(page,'a','x',-1);assert.equal(r.after.facing,'left');return r;
 });
 await test('mouse-click-then-WASD-uses-new-movement',async page=>{
   await clickWorldPoint(page,1550,1120);await page.waitForFunction(()=>window.sandboxGame.scene.keys.world.walking);
   const r=await held(page,'a','x',-1);assert.equal(r.after.facing,'left');assert.equal(r.after.path,0);return r;
 });
 await test('UI-hover-does-not-turn-player',async page=>{
   const before=await read(page);await moveMouse(page,1120,450);await moveMouse(page,150,175);const after=await read(page);assert.equal(after.facing,before.facing);return after;
 });
 await test('overlay-pointer-does-not-leak-aim',async page=>{
   const before=await read(page);await page.keyboard.press('h',{delay:80});await page.waitForFunction(()=>Boolean(window.sandboxGame.scene.keys.world.helpLayer));
   await moveMouse(page,500,450);await page.keyboard.press('Escape',{delay:80});await page.waitForFunction(()=>!window.sandboxGame.scene.keys.world.helpLayer);
   const after=await read(page);assert.equal(after.facing,before.facing);return after;
 });
 await test('touch-route-retains-arrival-heading',async page=>{await clickWorldPoint(page,1368,1128,{touch:true});await page.waitForFunction(()=>window.sandboxGame.scene.keys.world.walking);await page.waitForFunction(()=>{const s=window.sandboxGame.scene.keys.world;return !s.walking&&s.pathIndex>=s.path.length;},null,{timeout:6000});const r=await read(page);assert.equal(r.facing,'right');assert.ok(Math.hypot(r.x-1368,r.y-1128)<5);return r;});
 await test('keyboard-overrides-click-route',async page=>{await clickWorldPoint(page,1650,1128,{touch:true});await page.waitForFunction(()=>window.sandboxGame.scene.keys.world.walking);const r=await held(page,'a','x',-1);assert.equal(r.after.path,0);assert.equal(r.after.facing,'left');return r;});
 await test('old-save-inside-refined-wall-stays-in-district',async page=>{
   const state=await page.evaluate(()=>{const s=window.sandboxGame.scene.keys.world;return {area:s.area,x:s.player.x,y:s.player.y,alpha:s.actorSprite.alpha};});
   assert.deepEqual({area:state.area,x:state.x,y:state.y},{area:'oldTown',x:1600,y:680});
   await page.keyboard.down('w');try{await page.waitForFunction(()=>window.sandboxGame.scene.keys.world.player.y<545,null,{timeout:3000});}finally{await page.keyboard.up('w');}
   await page.waitForFunction(()=>!window.sandboxGame.scene.keys.world.walking);
   const edge=await page.evaluate(()=>{const s=window.sandboxGame.scene.keys.world;return {x:s.player.x,y:s.player.y,alpha:s.actorSprite.alpha,fronts:s.roofFronts.map(front=>front.image.alpha),walkable:s.canOccupy(s.player.x,s.player.y)};});
   assert.ok(edge.y>=520,`the traced upper building footprint blocks passage; reached ${edge.y}`);
   assert.ok(edge.fronts.some(alpha=>alpha<1),`white-marked eave overlay becomes translucent where it overlaps player: ${edge.fronts}`);
   await page.screenshot({path:out+'/old-town-traced-wall-edge.png'});
   return {spawn:state,edge};
 },{position:{x:696,y:456},area:'oldTown'});
 await test('short-click-within-one-path-cell',async page=>{await clickWorldPoint(page,1198,1122,{touch:true});await page.waitForFunction(()=>{const p=window.sandboxGame.scene.keys.world.player;return Math.hypot(p.x-1198,p.y-1122)<2.1;},null,{timeout:2000});return read(page);});
 await test('wall-slide-follows-actual-displacement',async page=>{await page.keyboard.down('w');await page.keyboard.down('d');try{await page.waitForFunction(()=>window.sandboxGame.scene.keys.world.player.x>1270,null,{timeout:2200});const r=await read(page);assert.equal(r.facing,'right');return r;}finally{await page.keyboard.up('w');await page.keyboard.up('d');}},{position:{x:1190,y:650}});
 await test('portal-clears-old-route',async page=>{await clickWorldPoint(page,2330,795,{touch:true});await page.waitForFunction(()=>window.sandboxGame.scene.keys.world.player.x>2200,null,{timeout:5000});await clickWorldPoint(page,2330,795,{touch:true});await page.waitForFunction(()=>{const s=window.sandboxGame.scene.keys.world;return s.area==='oldTown'&&!s.transitioning;},null,{timeout:6000});const before=await read(page);await page.evaluate(()=>new Promise(resolve=>{let n=0;const frame=()=>++n>=20?resolve():requestAnimationFrame(frame);requestAnimationFrame(frame);}));const after=await read(page);assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<.01,'Old map route must not resume after portal');assert.equal(after.path,0);return {before,after};},{position:{x:2000,y:800},tutorial:{moved:true,mentor:true,supervisor:true,file:true,notebook:true,map:true,helpUsed:true,oldTown:true,informant:true}});
}finally{report.finishedAt=new Date().toISOString();report.passed=report.cases.filter(c=>c.status==='passed').length;report.failed=report.cases.length-report.passed;await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();await server.close();console.log(JSON.stringify({passed:report.passed,failed:report.failed,errors:report.errors.length}));}
