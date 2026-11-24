import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {setupFixture,waitForScene,clickCanvasText} from './helpers.mjs';
import {SAVE} from './fixtures.mjs';
const {chromium}=await import('../../outputs/browser-deps/node_modules/playwright/index.mjs');
const root=fileURLToPath(new URL('../../',import.meta.url)),out=root+'/outputs/four-way-animation';await mkdir(out,{recursive:true});
const server=await createServer({root,configFile:false,cacheDir:out+'/vite-cache',server:{host:'127.0.0.1',port:21827,hmr:false,watch:{ignored:['**/outputs/**']}},optimizeDeps:{entries:['tests/browser/index.html'],include:['phaser']}});await server.listen();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ids=['xiezhi','baize','pixiu','qilin','xuanwu','qinglong'],report={startedAt:new Date().toISOString(),cases:[],errors:[]};
const earned=JSON.parse(await readFile(out+'/../campaign-sandbox/report.json','utf8')).storage;
try {
 const stages=[['young',0,0],['growing',3,1],['guardian',6,2]].filter(([stage])=>(process.env.FOUR_WAY_STAGES||'young,growing,guardian').split(',').includes(stage));
 const directions=[['s','front','y',1320,1],['w','back','y',650,-1],['a','left','x',350,-1],['d','right','x',2000,1]].filter(([,facing])=>(process.env.FOUR_WAY_DIRECTIONS||'front,back,left,right').split(',').includes(facing));
 for(const [stage,fed,column] of stages) {
  const context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));
  const fixture={...earned};const checkpoint=JSON.parse(fixture[SAVE.checkpoint]);checkpoint.area='hq';checkpoint.position={x:1190,y:650};fixture[SAVE.checkpoint]=JSON.stringify(checkpoint);
  const progress=Object.fromEntries(ids.map(id=>[id,{claimedSnackIds:[],snacks:0,fed}]));fixture[SAVE.species]=JSON.stringify(progress);fixture[SAVE.legacyPet]=JSON.stringify(progress.xiezhi);await setupFixture(context,fixture);
  try {
   await page.goto(server.resolvedUrls.local[0]+'tests/browser/index.html',{waitUntil:'domcontentloaded',timeout:90000});await page.locator('#sandbox-resume').click({timeout:60000});await waitForScene(page,'world');await page.waitForFunction(()=>!window.sandboxGame.scene.keys.world.cameras.main.fadeEffect.isRunning);
   if(await page.evaluate(()=>Boolean(window.sandboxGame.scene.keys.world.chapterLayer))){await clickCanvasText(page,'六靈集結 · 開啟終局檔案');await clickCanvasText(page,'回到街區 · 繼續培育六靈');}
   await page.mouse.move(5,10);
   for(const [key,facing,axis,target,sign] of directions) {
    await page.keyboard.down(key);let observations;
    try{observations=await page.evaluate(async ({axis,target,sign})=>{
      const all=[];const started=performance.now();let frames=0;
      while(performance.now()-started<15000 && frames++<1600){
       const s=window.sandboxGame.scene.keys.world;
       const sprites=[['xiezhi',s.companion],['baize',s.baizeFollower],['pixiu',s.pixiuFollower],...s.lateFollowers];
       all.push({player:{x:s.player.x,y:s.player.y,facing:s.facing,walking:s.walking,frame:String(s.actorSprite.frame.name),texture:s.actorSprite.texture.key},pets:sprites.map(([id,p])=>({id,x:p.x,y:p.y,texture:p.texture.key,frame:String(p.frame.name),flip:p.flipX,width:p.displayWidth,height:p.displayHeight,motion:s.followerMotion.get(id)}))});
       if(sign*(s.player[axis]-target)>=0)break;
       await new Promise(requestAnimationFrame);
      }return all;
    },{axis,target,sign});}finally{await page.keyboard.up(key);}
    const last=observations.at(-1);assert.ok(sign*(last.player[axis]-target)>=0,`Player did not reach ${facing} lane end: start=${JSON.stringify(observations[0]?.player)} last=${JSON.stringify(last?.player)} samples=${observations.length}`);assert.equal(last.player.facing,facing);
    for(const id of ids){
      const moving=observations.flatMap(o=>o.pets).filter(p=>p.id===id&&p.motion?.moving&&p.motion.facing===facing);
      assert.ok(moving.length>2,`${stage}/${id}/${facing}: no actual motion`);
      const frames=new Set(moving.map(p=>p.frame));
      if(facing==='front'||facing==='back') {
       const base=facing==='front'?0:9;assert.ok(frames.has(String(base+3+column))&&frames.has(String(base+6+column)),`${id}/${stage}/${facing} needs opposite leading paws: ${[...frames]}`);
       assert.ok(moving.every(p=>p.texture===`spirit-${id}-vertical-v2`));
      }else{assert.ok(frames.size===4,`${id}/${stage}/${facing}: expected4 side poses`);assert.ok(moving.every(p=>p.flip===(facing==='left')));}
      report.cases.push({stage,id,facing,status:'passed',frames:[...frames],distance:moving.at(-1).motion.distance});
    }
    if(facing==='front'||facing==='back') {
      const frames=new Set(observations.filter(o=>o.player.walking&&o.player.facing===facing).map(o=>o.player.frame));
      assert.ok(frames.has(facing==='front'?'0':'2')&&frames.has(facing==='front'?'1':'3'),'Player boots must alternate');
    }
    await page.waitForFunction(()=>!window.sandboxGame.scene.keys.world.walking);
    const stopped=await page.evaluate(()=>{const s=window.sandboxGame.scene.keys.world;const sprites=[['xiezhi',s.companion],['baize',s.baizeFollower],['pixiu',s.pixiuFollower],...s.lateFollowers];return sprites.map(([id,p])=>({id,x:p.x,y:p.y,texture:p.texture.key,frame:String(p.frame.name),...s.followerMotion.get(id)}));});
    await page.evaluate(()=>new Promise(resolve=>{let n=0;const step=()=>++n>12?resolve():requestAnimationFrame(step);requestAnimationFrame(step);}));
    const later=await page.evaluate(()=>{const s=window.sandboxGame.scene.keys.world;const sprites=[['xiezhi',s.companion],['baize',s.baizeFollower],['pixiu',s.pixiuFollower],...s.lateFollowers];return sprites.map(([id,p])=>({id,x:p.x,y:p.y,texture:p.texture.key,frame:String(p.frame.name),...s.followerMotion.get(id)}));});assert.deepEqual(later,stopped,'Pets must stop positions and displayed walk frames with the player');
    await page.screenshot({path:out+'/'+stage+'-'+facing+'.png'});console.log('PASS',stage,facing,'all6species and player');
   }
  }finally{await context.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e.stack||e);process.exitCode=1;console.error(e);}
finally{report.finishedAt=new Date().toISOString();await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();await server.close();}
