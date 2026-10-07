/* Square Editorial Spotlight: deterministic seeks, real speech and waveform. */
window.createSocialEditorial = () => {
  const d=window.BWIB_SOCIAL,root=document.getElementById('social-editorial');
  root.dataset.duration=String(d.duration);
  document.querySelector('h1').textContent=d.title;
  document.getElementById('social-event-name').textContent=window.BWIB_KIT_EVENT.name;
  document.getElementById('social-event-date').textContent=window.BWIB_KIT_EVENT.date;
  document.querySelector('.eyebrow').textContent=d.exampleOnly?'Layout demo · Placeholder captions':(d.eyebrow||'The conversation');
  document.getElementById('social-footer-label').textContent=d.exampleOnly?'Silent layout demo · No event quotations':'BWIB · Voices advancing women’s health';
  const activePeople=d.people.filter(p=>d.speakers.some(s=>s.id===p.id));
  const layers=new Map();
  const node=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  activePeople.forEach(p=>{
    const img=node('img','portrait');img.src=p.portrait;img.alt=p.name;img.dataset.id=p.id;
    document.getElementById('portraits').append(img);
    const identity=node('div','identity');
    const state=node('div','state');
    identity.append(state,node('div','name',p.name),node('div','description',p.affiliation));
    document.getElementById('identities').append(identity);layers.set(p.id,{img,identity,state,role:p.role==='Moderator'?'Moderator':'Panelist'});
  });
  const caption=document.getElementById('caption'),path=document.getElementById('wave');
  const ease=x=>.5-.5*Math.cos(Math.PI*Math.min(1,Math.max(0,x)));
  const at=(items,t)=>{let i=-1;for(let k=0;k<items.length&&items[k].start<=t;k++)i=k;return i;};
  function draw(t){
    const ci=at(d.captions,t),q=ci>=0&&t<d.captions[ci].end?d.captions[ci]:null;
    caption.textContent=q?q.text:'';
    let si=at(d.speakers,t);if(si<0)si=0;
    const s=d.speakers[si],prev=si>0?d.speakers[si-1]:null;
    const transition=prev&&prev.id!==s.id&&t<s.start+.25;
    const f=transition?ease((t-s.start)/.25):1;
    for(const [id,v] of layers){
      const alpha=id===s.id?f:transition&&id===prev.id?1-f:0;
      v.state.textContent=v.role+(d.exampleOnly?' · Layout demo':t>=s.start&&t<s.end?' · Speaking':'');
      v.img.style.opacity=String(alpha);v.identity.style.opacity=String(alpha);
      v.img.style.translate=`${id===s.id?8*(1-f):-6*f}px 0`;
    }
    const k=Math.floor(t*d.waveformHz),parts=[];
    for(let i=0;i<33;i++){
      const j=k+i-16,a=j<0||j>=d.waveform.length?0:d.waveform[j];
      const h=Math.max(.7,Math.min(1,a)*17);parts.push(`M${3+i*10.6} ${19-h}V${19+h}`);
    }
    path.setAttribute('d',parts.join(''));
  }
  gsap.registerPlugin({name:'bwibSocialVisuals',rawVars:true,init(target,value){this.value=value;return true;},render(ratio,data){data.value.draw(ratio*data.value.duration);}});
  const tl=gsap.timeline({paused:true});
  tl.to(root,{bwibSocialVisuals:{draw,duration:d.duration},duration:d.duration,ease:'none'},0);
  tl.fromTo('h1',{y:5,opacity:.85},{y:0,opacity:1,duration:.35,ease:'power2.out'},0);
  draw(0);return tl;
};
