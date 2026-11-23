import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {resumeFixture,SAVE} from './fixtures.mjs';
import {setupFixture,waitForScene,clickCanvas} from './helpers.mjs';
const {chromium}=await import('../../outputs/browser-deps/node_modules/playwright/index.mjs');
const root=fileURLToPath(new URL('../../',import.meta.url)),out=root+'/outputs/hud-save-guards';
await mkdir(out,{recursive:true});
const server=await createServer({root,configFile:false,cacheDir:out+'/vite-cache',server:{host:'127.0.0.1',port:0,hmr:false,watch:{ignored:['**/outputs/**']}},optimizeDeps:{entries:['tests/browser/index.html'],include:['phaser']}});await server.listen();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={startedAt:new Date().toISOString(),results:[]};
async function boot(fixture,prepare){
  const context=await browser.newContext({viewport:{width:1600,height:1000}});await setupFixture(context,fixture);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(server.resolvedUrls.local[0]+'tests/browser/index.html',{waitUntil:'commit'});
  await page.waitForFunction(()=>document.body.dataset.sandbox==='ready',null,{timeout:60000});
  if(prepare)await page.evaluate(prepare);
  await page.locator('#sandbox-resume').click();await waitForScene(page,'world');
  return {context,page,errors};
}
try{
  const malformed={...resumeFixture(),[SAVE.chapter]:'3','under-shadow-act-two-v1':JSON.stringify({completed:['ledger','yongqi','tea-house','register'],rewardClaimed:true}), 'under-shadow-act-three-v1':JSON.stringify({completed:['mentor'],rewardClaimed:true})};
  const checkpoint=JSON.parse(malformed[SAVE.checkpoint]);checkpoint.area='oldTown';checkpoint.position={x:1330,y:900};malformed[SAVE.checkpoint]=JSON.stringify(checkpoint);
  const a=await boot(malformed);
  try{
    await a.page.waitForFunction(()=>{const c=window.sandboxGame.scene.keys.world.cameras.main;return Math.abs(c.scrollX-530)<.1&&Math.abs(c.scrollY-450)<.1;});
    const before=await a.page.evaluate(()=>{const s=window.sandboxGame.scene.keys.world;return {steps:s.thirdSteps,reward:s.thirdReward,opaque:s.objectiveHudObjects[0].alpha};});
    assert.deepEqual(before.steps,[]);assert.equal(before.reward,false);assert.equal(before.opaque,1);
    await clickCanvas(a.page,150,175);
    assert.deepEqual(await a.page.evaluate(()=>{const s=window.sandboxGame.scene.keys.world;return {path:s.path.length,area:s.area,actor:s.pendingInteraction?.id??null};}),{path:0,area:'oldTown',actor:null});
    assert.deepEqual(a.errors,[]);report.results.push({name:'malformed-third-act-and-opaque-HUD',status:'passed'});console.log('PASS malformed third-act prefix repair and opaque HUD blocks hidden portal');
  }finally{await a.context.close();}
  const b=await boot({...resumeFixture(),[SAVE.chapter]:'5'},async()=>{const {lateActs}=await import('/src/game/late-acts.ts');localStorage.setItem('under-shadow-late-acts-v1',JSON.stringify({4:{completed:lateActs[4].steps.map(s=>s.id),rewardClaimed:true}}));});
  try{
    const s=await b.page.evaluate(()=>{const s=window.sandboxGame.scene.keys.world;return{chapter:s.chapter,late:[...s.lateFollowers.keys()],ownsQilin:s.ownsSpirit('qilin')};});
    assert.deepEqual(s,{chapter:2,late:[],ownsQilin:false});assert.deepEqual(b.errors,[]);report.results.push({name:'missing-earlier-act-prerequisite',status:'passed'});console.log('PASS resume cannot skip missing earlier chapter or spawn future rewards');
  }finally{await b.context.close();}
  report.status='passed';
}catch(e){process.exitCode=1;report.status='failed';report.error=String(e.stack||e);console.error(e);}
finally{report.finishedAt=new Date().toISOString();await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();await server.close();}
