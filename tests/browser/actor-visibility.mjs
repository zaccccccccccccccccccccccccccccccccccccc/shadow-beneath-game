import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {setupFixture,waitForScene} from './helpers.mjs';
import {resumeFixture,SAVE} from './fixtures.mjs';
const {chromium}=await import('../../outputs/browser-deps/node_modules/playwright/index.mjs');
const out='outputs/actor-visibility';await mkdir(out,{recursive:true});
const server=await createServer({configFile:false,cacheDir:out+'/cache',server:{host:'127.0.0.1',port:21941,hmr:false,watch:{ignored:['**/outputs/**']}},optimizeDeps:{entries:['tests/browser/index.html'],include:['phaser']}});await server.listen();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={cases:[],errors:[]};
try{
 for(const area of ['hq','oldTown','campus','harbor','hill']){
  const ctx=await browser.newContext({viewport:{width:1600,height:1000}});const fixture=resumeFixture();const cp=JSON.parse(fixture[SAVE.checkpoint]);
  cp.area=area;cp.position=area==='oldTown'?{x:1600,y:680}:{x:1190,y:1120};fixture[SAVE.checkpoint]=JSON.stringify(cp);await setupFixture(ctx,fixture);
  const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(String(e)));
  await page.goto(server.resolvedUrls.local[0]+'tests/browser/index.html',{waitUntil:'domcontentloaded',timeout:60000});await page.locator('#sandbox-resume').click();await waitForScene(page,'world');
  await page.waitForTimeout(900);
  const check=await page.evaluate(()=>{const s=window.sandboxGame.scene.keys.world,p=s.actorSprite,c=s.cameras.main;const bounds=p.getBounds();return{chapter:s.chapter,area:s.area,idle:{sx:p.scaleX,sy:p.scaleY},bounds:{x:bounds.x-c.scrollX,y:bounds.y-c.scrollY,w:bounds.width,h:bounds.height},roofPatches:s.roofFronts.map(({image})=>({hasMask:!!image.mask,w:image.width,h:image.height})),active:s.player.active,visible:s.player.visible,alpha:s.player.alpha};});
  assert.equal(check.chapter,2);assert.equal(check.area,area);assert.equal(check.idle.sx,check.idle.sy,'Idle must preserve art aspect ratio');assert.ok(check.active&&check.visible&&check.alpha>0);
  assert.ok(check.roofPatches.every(p=>!p.hasMask&&p.w<2400&&p.h<1600),'Roof must be local alpha patches, never screen stencil masks');
  await page.screenshot({path:out+'/'+area+'-idle.png'});
  for(const key of ['ArrowDown','ArrowUp','ArrowRight','ArrowLeft']){await page.keyboard.down(key);await page.waitForTimeout(380);await page.keyboard.up(key);await page.waitForTimeout(120);const scale=await page.evaluate(()=>{const p=window.sandboxGame.scene.keys.world.actorSprite;return[p.scaleX,p.scaleY];});assert.equal(scale[0],scale[1]);}
  await page.screenshot({path:out+'/'+area+'-after-walk.png'});report.cases.push(check);console.log('PASS act2 visible and uniform idle',area);await ctx.close();
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e.stack||e);console.error(e);process.exitCode=1;}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();await server.close();}
