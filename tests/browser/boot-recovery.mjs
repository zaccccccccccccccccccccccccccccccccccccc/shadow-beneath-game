import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const {chromium}=await import('../../outputs/browser-deps/node_modules/playwright/index.mjs');
const root=fileURLToPath(new URL('../../',import.meta.url)),out=root+'/outputs/boot-recovery';await mkdir(out,{recursive:true});
const server=await createServer({root,cacheDir:out+'/vite-cache',server:{host:'127.0.0.1',port:21817,hmr:false,watch:{ignored:['**/outputs/**']}}});await server.listen();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={cases:[],errors:[]};
try {
 for(const mode of ['blocked-blob','asset-failure-retry','canvas-renderer']) {
  const context=await browser.newContext({viewport:{width:1280,height:800}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try {
   if(mode==='blocked-blob')await context.addInitScript(()=>{const original=URL.createObjectURL;URL.createObjectURL=function(blob){return 'blob:https://invalid.example/unavailable';};});
   if(mode==='asset-failure-retry')await page.route('**/*tutorial-courtyard*',r=>{if(['image','xhr'].includes(r.request().resourceType())){console.log('ABORT',r.request().url());return r.abort();}return r.continue();});
   await page.goto(server.resolvedUrls.local[0]+(mode==='canvas-renderer'?'?renderer=canvas':''),{waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('#music-enabled').uncheck();await page.locator('#start-game').click();
   if(mode==='asset-failure-retry') {
    await page.locator('#retry-loading').waitFor({state:'visible',timeout:10000});
    assert.match(await page.locator('#asset-loading-title').innerText(),/未能|失敗/);
    await page.unroute('**/*tutorial-courtyard*');await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#retry-loading').click()]);await page.locator('#start-game').click();
   }
   await page.getByRole('button',{name:/跳[過过]序幕/}).waitFor({state:'visible',timeout:60000});
   assert.equal(await page.locator('#asset-loading').getAttribute('data-visible'),'false');
   if(mode==='canvas-renderer')assert.equal(await page.locator('body').getAttribute('data-renderer'),'canvas');
   assert.deepEqual(errors,[]);await page.screenshot({path:out+'/'+mode+'.png'});report.cases.push({mode,status:'passed'});console.log('PASS',mode);
  }catch(e){report.cases.push({mode,status:'failed',error:String(e.stack||e),errors});process.exitCode=1;console.error('FAIL',mode,e.message);await page.screenshot({path:out+'/'+mode+'-failed.png'});}
  finally{await context.close();}
 }
}finally{await browser.close();await server.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
