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
   const width=entry.width||3840,height=entry.height||2160;
   const page=await browser.newPage();await page.setViewport({width,height,deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
   await page.setRequestInterception(true);page.on('request',r=>{if(r.url().startsWith('http://127.0.0.1:')||r.url().startsWith('data:'))r.continue();else{errors.push('External request '+r.url());r.abort();}});
   await page.goto(`http://127.0.0.1:${server.address().port}/${entry.id}/index.html`,{waitUntil:'networkidle0'});
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.complete?Promise.resolve():new Promise((resolve,reject)=>{i.onload=resolve;i.onerror=reject;})));});
   const info=await page.evaluate(()=>{const root=document.querySelector('[data-composition-id]'),tl=window.__timelines[root.dataset.compositionId];return {id:root.dataset.compositionId,width:+root.dataset.width,height:+root.dataset.height,duration:+root.dataset.duration,timeline:tl?.duration(),images:[...document.images].every(i=>i.naturalWidth>0)};});
   assert.equal(info.width,width);assert.equal(info.height,height);assert(info.timeline>0);assert(info.images);assert(Math.abs(info.timeline-info.duration)<1e-6);
   const t=Math.min(info.duration-.1,4.5);
   const seek=async n=>page.evaluate(n=>{const el=document.querySelector('[data-composition-id]');window.__timelines[el.dataset.compositionId].seek(n,true);return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));},n);
   let captionSamples=0;
   if(entry.id==='social-editorial'){
    const times=await page.evaluate(()=>[...window.BWIB_SOCIAL.captions.map(c=>(c.start+c.end)/2),...window.BWIB_SOCIAL.speakers.map(s=>s.start+.3)]);
    for(const time of times){
     await seek(time);
     const layout=await page.evaluate(()=>{const a=document.querySelector('#caption').getBoundingClientRect(),b=document.querySelector('.caption-band').getBoundingClientRect();return {fits:a.top>=b.top&&a.bottom<=b.bottom,font:getComputedStyle(document.querySelector('#caption')).fontSize};});
     assert(layout.fits,'Square caption fits its band');assert.equal(layout.font,'78px');captionSamples++;
    }
   }
   const snapshot=()=>page.evaluate(()=>JSON.stringify({caption:document.querySelector('#caption')?.textContent,heading:document.querySelector('h1')?.style.cssText,layers:[...document.querySelectorAll('.portrait,.identity')].map(el=>el.style.cssText)}));
   await seek(t);const firstState=await snapshot(),first=await page.screenshot();await seek(.6);await seek(t);const secondState=await snapshot(),second=await page.screenshot();
   let pixelDelta=0;
   if(!first.equals(second)){
    const pixels=buffer=>execFileSync('ffmpeg',['-v','error','-i','pipe:0','-frames:v','1','-pix_fmt','rgba','-f','rawvideo','-'],{input:buffer,maxBuffer:64*1024*1024});
    const a=pixels(first),b=pixels(second);assert.equal(a.length,b.length);
    for(let i=0;i<a.length;i++)pixelDelta=Math.max(pixelDelta,Math.abs(a[i]-b[i]));
   }
   // Browser compositing can round translucent surfaces one 8-bit level
   // differently after a seek. Scene state must match; visible changes fail.
   assert.equal(firstState,secondState,entry.id+' repeated seek scene');
   assert(pixelDelta<=1,entry.id+' repeated seek pixels');
   const overflow=await page.evaluate(({width,height})=>[...document.querySelectorAll('h1,.gc-name,.gc-role,.bwib-event-title,.bwib-event-subtitle,.person-name,.speaker-name,.theme,#caption,.identity .name')].filter(el=>{for(let p=el;p;p=p.parentElement){const s=getComputedStyle(p);if(+s.opacity<.05||s.visibility==='hidden')return false;}return true;}).flatMap(el=>{const r=el.getBoundingClientRect();return r.left<0||r.top<0||r.right>width+1||r.bottom>height+1||el.scrollWidth>el.clientWidth+3?[el.className||el.tagName]:[];}),{width,height});
   assert.deepEqual(overflow,[],entry.id+' text overflow');assert.deepEqual(errors,[],entry.id);
   fs.writeFileSync(path.join(out,entry.id+'.png'),first);
   records.push({template:entry.id,...info,externalRequests:0,errors,visibleTextOverflow:overflow,repeatedSeekSceneIdentical:true,repeatedSeekPixelsIdentical:pixelDelta===0,repeatedSeekMaxChannelDelta:pixelDelta,allowedCompositingRounding:1,captionSamples});
   await page.close();console.log('Verified',entry.id);
  }
 }finally{await browser.close();await new Promise(r=>server.close(r));fs.rmSync(staged,{recursive:true,force:true});}
 fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({status:'pass',templates:records},null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
