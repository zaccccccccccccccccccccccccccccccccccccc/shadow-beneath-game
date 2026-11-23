import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const {chromium} = await import('../../outputs/browser-deps/node_modules/playwright/index.mjs');
const out = fileURLToPath(new URL('../../outputs/public-six-act-smoke/',import.meta.url));
await mkdir(out,{recursive:true});
const url = process.env.GAME_PREVIEW_URL || 'https://zaccccccccccccccccccccccccccccccccccccc.github.io/shadow-beneath-game/';
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:900},locale:'zh-TW'});
const page=await context.newPage(), errors=[];
page.on('pageerror',e=>errors.push(String(e.stack||e)));
const report={url,startedAt:new Date().toISOString(),errors};
try {
  await page.goto(url+'?verify='+Date.now(),{waitUntil:'domcontentloaded',timeout:90000});
  assert.match(await page.title(),/六幕/);
  await page.locator('#player-name').fill('決賽驗收');
  await page.locator('#music-enabled').uncheck();
  await page.locator('#start-game').click();
  const skip=page.getByRole('button',{name:/跳[過过]序幕/});
  await skip.waitFor({state:'visible',timeout:90000});
  await page.screenshot({path:out+'/intro.png'});
  await skip.click();
  await page.waitForFunction(()=>document.body.dataset.gameUi==='world',null,{timeout:120000});
  await page.waitForFunction(()=>document.querySelector('#asset-loading')?.dataset.visible==='false');
  report.initialSave=await page.evaluate(()=>({chapter:localStorage.getItem('under-shadow-current-chapter'),pet:localStorage.getItem('under-shadow-xiezhi-chapter1-claimed-v2'),checkpoint:JSON.parse(localStorage.getItem('under-shadow-world-checkpoint-v1'))}));
  assert.equal(report.initialSave.pet,null);assert.equal(report.initialSave.checkpoint.area,'hq');
  await page.mouse.move(5, 10);
  report.movement = [];
  for (const [key, sign] of [['ArrowRight', 1], ['ArrowLeft', -1]]) {
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('under-shadow-world-checkpoint-v1')).position);
    await page.keyboard.down(key);
    try {
      await page.waitForFunction(({ x, sign }) => {
        const save = JSON.parse(localStorage.getItem('under-shadow-world-checkpoint-v1'));
        return sign * (save.position.x - x) > 70;
      }, { x: before.x, sign }, { timeout: 5000 });
    } finally { await page.keyboard.up(key); }
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('under-shadow-world-checkpoint-v1')).position);
    report.movement.push({key, before, after});
  }
  for(const [key,mode] of [['m','map'],['l','notebook'],['p','dialogue'],['h','help']]){
    await page.keyboard.press(key,{delay:80});
    await page.waitForFunction(mode=>document.body.dataset.gameUi===mode,mode);
    await page.keyboard.press('Escape',{delay:80});
    await page.waitForFunction(()=>document.body.dataset.gameUi==='world');
  }
  await page.screenshot({path:out+'/fresh-world.png'});
  assert.deepEqual(errors,[]);report.status='passed';console.log('PASS published six-act homepage, intro skip, fresh no-pet tutorial, M/L/P/H open and close');
}catch(error){report.status='failed';report.failure=String(error.stack||error);process.exitCode=1;console.error(error);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally {report.finishedAt=new Date().toISOString();await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
