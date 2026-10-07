(function(){
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function markup(guest){
    const words=guest.name.split(' '), name=words.length>1?`<span>${escape(words.shift())}</span><span>${escape(words.join(' '))}</span>`:escape(guest.name);
    return `<div class="bwib-guest-card"><div class="gc-pane" data-layout-ignore></div><div class="gc-pane-inner" data-layout-ignore></div><div class="gc-accent-line" data-layout-ignore></div><div class="gc-depth-line" data-layout-ignore></div><div class="gc-content"><header class="gc-header"><div class="gc-brand"><img class="gc-logo" src="../../assets/brand/bwib-full-logo-original.png" alt="Original multicolor Women+ in Bioinformatics logo"><p class="gc-brand-name">Boston Women<br>in Bioinformatics</p></div><p class="gc-event">${escape(window.BWIB_KIT_EVENT.name)}<span>${escape(window.BWIB_KIT_EVENT.date)}</span></p></header><div class="gc-body"><section class="gc-copy"><p class="gc-series">Voices of BWIB</p><div class="gc-rule" aria-hidden="true"></div><h1 class="gc-name">${name}</h1><p class="gc-role">${escape(guest.role)}</p></section></div><footer class="gc-footer"><p class="gc-topic">${escape(guest.topic||'')}</p></footer></div><div class="gc-portrait-stage"><img class="gc-portrait" data-person="${escape(guest.personId)}" src="${escape(guest.portrait)}" alt="${escape(guest.name)}"></div></div>`;
  }
  function create({container,guest,duration=6.006,delivery=true}){
    if(!container||!guest?.name||!guest?.role||!(duration>=5))throw new Error('Guest card requires container, verified guest and duration≥5.');
    if(/clean-v3|eli\s+lilly/i.test(JSON.stringify(guest)))throw new Error('Rejected asset or prohibited added graphic content.');
    container.innerHTML=markup(guest);
    const q=s=>container.querySelector(s), all=s=>container.querySelectorAll(s);
    const tl=gsap.timeline({defaults:{ease:'power3.out'}});
    tl.from(q('.gc-pane'),{x:95,scaleX:.92,autoAlpha:0,duration:.86},0)
      .from(q('.gc-pane-inner'),{x:135,autoAlpha:0,duration:.92},.12)
      .from(q('.gc-accent-line'),{scaleX:0,autoAlpha:0,duration:.95},.18)
      .from(q('.gc-depth-line'),{scaleX:.5,autoAlpha:0,duration:.8},.32)
      .from(q('.gc-portrait-stage'),{x:58,y:24,autoAlpha:0,duration:1.05,ease:'power4.out'},.13)
      .from(q('.gc-portrait'),{rotation:.6,duration:1.1,ease:'sine.out'},.13)
      .from(q('.gc-logo'),{autoAlpha:0,y:11,duration:.6},.08)
      .from(all('.gc-brand-name,.gc-event'),{autoAlpha:0,y:10,duration:.55,stagger:.07},.12)
      .from(q('.gc-series'),{autoAlpha:0,y:13,duration:.6},.22)
      .from(q('.gc-rule'),{scaleX:0,duration:.68},.32)
      .from(all('.gc-name span'),{autoAlpha:0,y:27,duration:.75,stagger:.08},.34)
      .from(q('.gc-role'),{autoAlpha:0,y:16,duration:.65},.54)
      .from(q('.gc-topic'),{autoAlpha:0,y:10,duration:.55},.72);
    tl.to(q('.gc-pane-inner'),{x:-9,y:-5,duration:3.6,ease:'sine.inOut'},1.35)
      .to(q('.gc-portrait-stage'),{x:-7,duration:3.6,ease:'sine.inOut'},1.35);
    // Composed release precedes the caller's 18-frame dissolve; the card remains
    // fully photographic and readable throughout it, without a black fade.
    const exit=duration-.78;
    tl.to(q('.gc-copy'),{y:-9,duration:.78,ease:'sine.inOut'},exit)
      .to(q('.gc-rule'),{scaleX:.62,duration:.78,ease:'sine.inOut'},exit)
      .to(q('.gc-pane'),{x:14,duration:.78,ease:'sine.inOut'},exit)
      .to(q('.gc-portrait-stage'),{x:5,duration:.78,ease:'sine.inOut'},exit);
    if(!delivery)tl.to(q('.bwib-guest-card'),{autoAlpha:0,duration:.3,ease:'sine.inOut'},duration-.3);
    tl.to({}, {duration:.001},duration-.001);
    return tl;
  }
  window.BWIBGuestCard={create,markup};
})();
