/* Offline browser verification of all portable template entry points. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const puppeteer=require('/usr/local/lib/node_modules/hyperframes/node_modules/puppeteer-core');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
async function main(){
 const out=path.join(root,'verification');fs.mkdirSync(out,{recursive:true});
 const staged=fs.mkdtempSync(path.join(out,'.projects-'));
 execFileSync('python3',[path.join(root,'tools/stage.py'),staged,'--all']);
 const server=http.createServer((req,res)=>{const p=path.resolve(staged,'.'+decodeURIComponent(req.url.split('?')[0]));if(!p.startsWith(staged+path.sep)){res.writeHead(403);return res.end();}fs.readFile(p,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(data);});});
 await new Promise(r=>server.listen(0,'0.0.0.0',r));
 const browser=await puppeteer.launch({executablePath:process.env.HYPERFRAMES_BROWSER_PATH||'/usr/local/bin/chrome-headless-shell',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const records=[];
 try{
  for(const entry of JSON.parse(fs.readFileSync(path.join(root,'templates.json')))){
   execFileSync('hyperframes',['lint',path.join(staged,entry.id)],{stdio:'inherit'});
   const page=await browser.newPage();await page.setViewport({width:3840,height:2160,deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
   await page.setRequestInterception(true);page.on('request',r=>{if(r.url().startsWith('http://127.0.0.1:')||r.url().startsWith('data:'))r.continue();else{errors.push('External request '+r.url());r.abort();}});
   await page.goto(`http://127.0.0.1:${server.address().port}/${entry.id}/index.html`,{waitUntil:'networkidle0'});
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.complete?Promise.resolve():new Promise((resolve,reject)=>{i.onload=resolve;i.onerror=reject;})));});
   const info=await page.evaluate(()=>{const root=document.querySelector('[data-composition-id]'),tl=window.__timelines[root.dataset.compositionId];return {id:root.dataset.compositionId,width:+root.dataset.width,height:+root.dataset.height,duration:+root.dataset.duration,timeline:tl?.duration(),images:[...document.images].every(i=>i.naturalWidth>0)};});
   assert.equal(info.width,3840);assert.equal(info.height,2160);assert(info.timeline>0);assert(info.images);assert.equal(info.timeline,info.duration);
   const t=Math.min(info.duration-.1,4.5);
   const seek=async n=>page.evaluate(n=>{const el=document.querySelector('[data-composition-id]');window.__timelines[el.dataset.compositionId].seek(n,true);return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));},n);
   await seek(t);const first=await page.screenshot();await seek(.6);await seek(t);const second=await page.screenshot();
   assert.equal(crypto.createHash('sha256').update(first).digest('hex'),crypto.createHash('sha256').update(second).digest('hex'),entry.id+' repeated seek');
   const overflow=await page.evaluate(()=>[...document.querySelectorAll('h1,.gc-name,.gc-role,.bwib-event-title,.bwib-event-subtitle,.person-name,.speaker-name,.theme')].filter(el=>{for(let p=el;p;p=p.parentElement){const s=getComputedStyle(p);if(+s.opacity<.05||s.visibility==='hidden')return false;}return true;}).flatMap(el=>{const r=el.getBoundingClientRect();return r.left<0||r.top<0||r.right>3841||r.bottom>2161||el.scrollWidth>el.clientWidth+3?[el.className||el.tagName]:[];}));
   assert.deepEqual(overflow,[],entry.id+' text overflow');assert.deepEqual(errors,[],entry.id);
   fs.writeFileSync(path.join(out,entry.id+'.png'),first);
   records.push({template:entry.id,...info,externalRequests:0,errors,visibleTextOverflow:overflow,repeatedSeekPixelsIdentical:true});
   await page.close();console.log('Verified',entry.id);
  }
 }finally{await browser.close();await new Promise(r=>server.close(r));fs.rmSync(staged,{recursive:true,force:true});}
 fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({status:'pass',templates:records},null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
