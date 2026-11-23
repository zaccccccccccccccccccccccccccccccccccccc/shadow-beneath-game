import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { setupFixture, inspectScene, clickCanvas, clickCanvasText, waitForScene, waitForWorld, collectUiText } from './helpers.mjs';
import { freshFixture, resumeFixture } from './fixtures.mjs';
const { chromium } = await import('../../outputs/browser-deps/node_modules/playwright/index.mjs');
const root = fileURLToPath(new URL('../../', import.meta.url));
const out = root + '/outputs/campaign-sandbox';
await mkdir(out, {recursive:true});
const report = {startedAt:new Date().toISOString(), steps:[], errors:[]};
const server = await createServer({root,configFile:false,base:'/',clearScreen:false,cacheDir:root+'/outputs/browser-vite-cache',server:{host:'127.0.0.1',port:0,hmr:false,watch:{ignored:['**/outputs/**']}},optimizeDeps:{entries:['tests/browser/index.html'],include:['phaser']}});
await server.listen();
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-background-networking','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context = await browser.newContext({viewport:{width:1600,height:1000},locale:'zh-TW'});
const initialFixture = process.env.CAMPAIGN_RESUME === '1' ? JSON.parse(await readFile(out+'/report.json','utf8')).storage : process.env.CAMPAIGN_START_ACT === '3' ? {...resumeFixture(), 'under-shadow-current-chapter':'3','under-shadow-act-two-v1':JSON.stringify({completed:['ledger','yongqi','tea-house','register'],rewardClaimed:true,lampOil:100})} : freshFixture();
report.startAct=initialFixture['under-shadow-current-chapter'] || '1';
await setupFixture(context, initialFixture);
const page = await context.newPage();
page.on('pageerror', e => report.errors.push(String(e.stack || e)));
const state = fn => page.evaluate(fn);
async function record(label) {
  const s = await inspectScene(page);
  report.steps.push({label,chapter:s.chapter,area:s.area,player:s.player,companions:s.companions});
  console.log('PASS',label,'chapter',s.chapter,s.area);
  await writeFile(out+'/progress.json',JSON.stringify(report,null,2));
}
async function shot(label) {
  await page.waitForFunction(()=>{
    const s=window.sandboxGame.scene.keys.world;
    return !s.chapterLayer || s.chapterLayer.list.every(child=>child.type!=='Image'||child.alpha>.99);
  });
  await page.screenshot({path:out+'/'+label+'.png'});
}
async function tapKey(key) { await page.keyboard.press(key,{delay:70}); }
async function settled() { await waitForWorld(page,s=>!s.transitioning&&!s.cameras.main.fadeEffect.isRunning); }
async function walkAxis(axis, value) {
  const start = await state(()=>{const p=window.sandboxGame.scene.keys.world.player;return {x:p.x,y:p.y};});
  const delta = value-start[axis]; if(Math.abs(delta)<3)return;
  const key = axis==='x' ? delta>0?'d':'a' : delta>0?'s':'w';
  await page.keyboard.down(key);
  try {
    await page.waitForFunction(({axis,value,sign})=>{
      const s=window.sandboxGame.scene.keys.world;
      return sign*(value-s.player[axis])<18;
    },{axis,value,sign:Math.sign(delta)},{timeout:Math.ceil(Math.abs(delta)/200*1000)+5000,polling:'raf'});
  } finally { await page.keyboard.up(key); }
  // Fine alignment matters at narrow corners: stopping 7px before a grid turn
  // can leave the feet beside a wall even though the next grid leg is clear.
  for(let attempt=0;attempt<14;attempt++) {
    const position=await state(()=>{const p=window.sandboxGame.scene.keys.world.player;return {x:p.x,y:p.y};});
    const d=value-position[axis];if(Math.abs(d)<3)return;
    const correction=axis==='x' ? d>0?'d':'a' : d>0?'s':'w';
    await page.keyboard.press(correction,{delay:20});
  }
  const end=await state(()=>{const p=window.sandboxGame.scene.keys.world.player;return{x:p.x,y:p.y};});
  if(Math.abs(end[axis]-value)>8)throw new Error(`Keyboard corner alignment ${axis}: ${end[axis]} vs ${value}`);
}
async function walkTo(point, radius=0) {
  const startArea=(await inspectScene(page)).area;
  for(let attempt=0;attempt<70;attempt++) {
    const nav=await page.evaluate(async target=>{
      const {findWorldPath}=await import('/src/game/world-geometry.ts');
      const {districtMaps,DISTRICT_WIDTH,DISTRICT_HEIGHT}=await import('/src/game/world-data.ts');
      const s=window.sandboxGame.scene.keys.world,c=s.cameras.main;
      return {area:s.area,transitioning:s.transitioning,player:{x:s.player.x,y:s.player.y},scroll:{x:c.scrollX,y:c.scrollY},dim:s.miniGraphics.alpha<.5,dimLeft:s.objectiveHudObjects?.[0]?.alpha<.5,route:findWorldPath(s.player,target,districtMaps[s.area].blockers,DISTRICT_WIDTH,DISTRICT_HEIGHT)};
    },point);
    if(nav.area!==startArea)return;
    if(nav.transitioning){await settled();continue;}
    if(Math.hypot(nav.player.x-point.x,nav.player.y-point.y)<Math.max(45,radius))return;
    assert.ok(nav.route?.length,'reachable route '+JSON.stringify(point));
    const target=[...nav.route].reverse().find(p=>{
      const x=p.x-nav.scroll.x,y=p.y-nav.scroll.y;
      return x>=44&&x<=1560&&y>=44&&y<=800&&!(x<470&&y<365&&!nav.dimLeft)&&!(x>1320&&y<225&&!nav.dim);
    });
    assert.ok(target,'visible walkable path click');
    await clickCanvas(page,target.x-nav.scroll.x,target.y-nav.scroll.y);
    await page.waitForFunction(()=>{
      const s=window.sandboxGame.scene.keys.world;
      return s.walking||s.dialogueLayer||s.companionLayer||s.transitioning;
    },null,{timeout:5000});
    if(await state(()=>Boolean(window.sandboxGame.scene.keys.world.companionLayer))){await tapKey('Escape');continue;}
    await page.waitForFunction(target=>{
      const s=window.sandboxGame.scene.keys.world;
      return Math.hypot(s.player.x-target.x,s.player.y-target.y)<27 || (!s.walking&&s.pathIndex>=s.path.length)||s.dialogueLayer||s.transitioning;
    },target,{timeout:20000});
    if(await state(()=>Boolean(window.sandboxGame.scene.keys.world.dialogueLayer)))return;
  }
  throw new Error('Ground-click navigation did not reach '+JSON.stringify(point));
}
let maps, npcs;
async function travelTo(target) {
  const current=(await inspectScene(page)).area; if(current===target)return;
  const queue=[[current]],seen=new Set([current]); let path;
  while(queue.length){const p=queue.shift(),a=p.at(-1);if(a===target){path=p;break;}for(const port of maps[a].portals)if(!seen.has(port.target)){seen.add(port.target);queue.push([...p,port.target]);}}
  assert.ok(path,'map connection '+current+'→'+target);
  for (let i=1;i<path.length;i++) {
    const port=maps[path[i-1]].portals.find(p=>p.target===path[i]);
    const center={x:port.x+port.width/2,y:port.y+port.height/2};
    await walkTo(center,143);
    await settled();
    if((await inspectScene(page)).area===path[i])continue;
    // Use actual canvas portal click (E can prefer a nearby NPC).
    const point=await state(()=>{const s=window.sandboxGame.scene.keys.world,c=s.cameras.main;return {x:c.scrollX,y:c.scrollY};});
    await clickCanvas(page,center.x-point.x,center.y-point.y);
    await page.waitForFunction(area=>window.sandboxGame.scene.keys.world.area===area,path[i]);
    await settled();
  }
}
async function talk(id,index=0) {
  const npc=npcs.find(n=>n.id===id); assert.ok(npc);
  await travelTo(npc.region); await walkTo(npc,100); await settled();
  if(!await state(()=>Boolean(window.sandboxGame.scene.keys.world.dialogueLayer)))await tapKey('e');
  await waitForWorld(page,s=>Boolean(s.dialogueLayer));
  assert.equal(await state(()=>window.sandboxGame.scene.keys.world.activeInteraction?.id),id);
  const count=await state(()=>window.sandboxGame.scene.keys.world.activeDialogueActions.length);
  if (count) {
    const x=count===1?1020:820+index*420;
    await clickCanvas(page,x,828);
    await waitForWorld(page,s=>s.responseMode);
  }
  const chapter=(await inspectScene(page)).chapter;
  if(chapter===2&&id==='cafe-owner')await tapKey('Escape');
  else await clickCanvas(page,1190,828);
  await waitForWorld(page,s=>!s.dialogueLayer);
  await record('interview '+id);
}
async function claimAndNext(chapter) {
  await waitForWorld(page,s=>Boolean(s.chapterLayer));
  await shot('act-'+chapter+'-rules');
  const position=(await inspectScene(page)).player;
  await clickCanvas(page,800,chapter===1?816:chapter>=4?760:720);
  await shot('act-'+chapter+'-reward');
  const owned=await state(()=>{const s=window.sandboxGame.scene.keys.world;return ['xiezhi','baize','pixiu','qilin','xuanwu','qinglong'].map(id=>s.ownsSpirit(id));});
  assert.deepEqual(owned,owned.map((_,i)=>i<chapter));
  await record('earned reward '+chapter);
  await clickCanvas(page,800,chapter>=4?760:720);
  if(chapter<6){await page.waitForFunction(c=>window.sandboxGame.scene.keys.world.chapter===c,chapter+1);}
  const after=(await inspectScene(page)).player;
  assert.equal(after.x,position.x,'act switch must not teleport X');assert.equal(after.y,position.y,'act switch must not teleport Y');
  if(chapter>=3&&chapter<6){await waitForWorld(page,s=>Boolean(s.dialogueLayer));await clickCanvas(page,1190,828);await waitForWorld(page,s=>!s.dialogueLayer);}
  await record('act transition '+chapter);
}
try {
  await page.goto(server.resolvedUrls.local[0]+'tests/browser/index.html',{waitUntil:'commit',timeout:45000});
  await page.waitForFunction(()=>document.body.dataset.sandbox==='ready',null,{timeout:45000});
  await page.locator('#sandbox-resume').click(); await waitForScene(page,'world'); await settled();
  ({maps,npcs}=await page.evaluate(async()=>{const m=await import('/src/game/world-data.ts');return {maps:m.districtMaps,npcs:m.worldInteractions};}));
  const initialChapter=(await inspectScene(page)).chapter;
  if(initialChapter===1) {
  assert.equal((await inspectScene(page)).companionUnlocked,false);
  await page.mouse.move(5,10); // Outside canvas: keyboard-only movement owns facing.
  await page.keyboard.down('d'); await waitForWorld(page,s=>s.tutorial.moved); await page.keyboard.up('d');
  await tapKey('h');await waitForWorld(page,s=>Boolean(s.helpLayer));await clickCanvas(page,800,520);await waitForWorld(page,s=>s.tutorial.helpUsed);
  assert.equal(await state(()=>window.sandboxGame.scene.keys.world.semiAutoArrow.visible),true);
  await talk('mentor');await talk('supervisor');await talk('case-file',0);
  await tapKey('l');await waitForWorld(page,s=>Boolean(s.notebookLayer));await clickCanvas(page,800,740);
  await tapKey('m');await waitForWorld(page,s=>Boolean(s.mapLayerUi));await clickCanvas(page,800,830);
  await talk('informant');await talk('cafe-owner');await talk('treasurer');await talk('case-file',1);
  await claimAndNext(1);
  }
  if((await inspectScene(page)).chapter===2) {
  for(const id of ['treasurer','student','informant','cafe-owner'])await talk(id);
  await claimAndNext(2);
  }
  if((await inspectScene(page)).chapter===3) {
    for(const id of ['developer','hill-guard','supervisor','mentor'])await talk(id);
    await claimAndNext(3);
  }
  const acts=await page.evaluate(async()=>{const m=await import('/src/game/late-acts.ts');return m.lateActs;});
  for(const chapter of [4,5,6]){
    if((await inspectScene(page)).chapter!==chapter)continue;
    for(const step of acts[chapter].steps)await talk(step.npcId,(chapter+step.id.length)%2);
    await claimAndNext(chapter);
  }
  await waitForWorld(page,s=>s.lateConclusionPage==='finale'); await shot('six-act-finale');
  await clickCanvas(page,800,760); await waitForWorld(page,s=>!s.chapterLayer);
  await tapKey('p');await waitForWorld(page,s=>s.companionRosterOpen);await shot('six-spirit-roster');
  await clickCanvas(page,800,785);await waitForWorld(page,s=>!s.companionLayer);
  assert.equal(await state(()=>window.sandboxGame.scene.keys.world.availableFruitSpots().length),36);
  await record('complete tutorial and all six acts');
  report.storage=await state(()=>Object.fromEntries(Object.entries(localStorage)));
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('#sandbox-resume').click();await waitForScene(page,'world');
  assert.equal((await inspectScene(page)).chapter,6);
  assert.deepEqual(await state(()=>{const s=window.sandboxGame.scene.keys.world;return ['xiezhi','baize','pixiu','qilin','xuanwu','qinglong'].map(id=>s.ownsSpirit(id));}),[true,true,true,true,true,true]);
  await record('all six rewards survive reload');
  assert.deepEqual(report.errors,[]); report.status='passed';
} catch(error) {
  report.status='failed';report.failure=String(error.stack||error);process.exitCode=1;console.error(error);
  await shot('failure').catch(()=>{});
  report.lastState=await inspectScene(page).catch(()=>null); report.ui=await collectUiText(page).catch(()=>[]);
  report.storage=await state(()=>Object.fromEntries(Object.entries(localStorage))).catch(()=>null);
} finally {
  report.finishedAt=new Date().toISOString();
  await writeFile(out+'/report.json',JSON.stringify(report,null,2));
  await context.close();await browser.close();await server.close();
  console.log('Campaign report:',out+'/report.json');
}
