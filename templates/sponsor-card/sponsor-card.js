/* Six-second event card. Authentic approved marks; see ASSET-NOTICES.md. */
(() => {
  'use strict';
  const tiers = [
    {label:'Gold DNA Sponsors', names:[['diamond-age','Diamond Age Data Science','png'],['seqera','Seqera','png'],['zifo','Zifo','png']]},
    {label:'Silver RNA Sponsors', names:[['benchling','Benchling','png'],['zs','ZS','svg']]},
    {label:'Bronze Protein Sponsors', names:[['bioteam','BioTeam','png'],['sprout-informatics','Sprout Informatics','png'],['brandeis','Brandeis University','png']]}
  ];
  window.BWIBEventIntro = {
    create({container,duration=6,background='#F7F8F5',sponsorBase='assets/sponsors'}) {
      if (!container || duration < 6) throw new Error('Event intro requires a container and at least six seconds.');
      const scene=document.createElement('section'); scene.className='bwib-event-intro'; scene.style.backgroundColor=background;
      const content=document.createElement('div'); content.className='bwib-event-content';
      content.style.transform=`scale(${container.clientWidth / 1920 || 2})`;
      content.style.backgroundColor=background;
      const eyebrow=document.createElement('p'); eyebrow.className='bwib-event-eyebrow'; eyebrow.textContent=`${window.BWIB_KIT_EVENT.name} · ${window.BWIB_KIT_EVENT.date}`;
      const title=document.createElement('h2'); title.className='bwib-event-title'; title.textContent=window.BWIB_KIT_EVENT.title;
      const subtitle=document.createElement('p'); subtitle.className='bwib-event-subtitle'; subtitle.textContent=window.BWIB_KIT_EVENT.subtitle;
      const rule=document.createElement('span'); rule.className='bwib-event-rule'; rule.setAttribute('aria-hidden','true');
      const sponsors=document.createElement('div'); sponsors.className='bwib-event-sponsors';
      for (const tier of (window.BWIB_KIT_EVENT.sponsors || tiers)) {
        const row=document.createElement('section'); row.className='bwib-event-tier'; row.style.backgroundColor=background;
        const label=document.createElement('p'); label.className='bwib-event-tier-label'; label.textContent=tier.label;
        const marks=document.createElement('div'); marks.className='bwib-event-marks';
        for (const [id,name,extension] of tier.names) {
          const mark=document.createElement('img'); mark.className=`bwib-event-mark bwib-mark-${id}`;
          mark.src=`${sponsorBase.replace(/\/$/,'')}/${id}.${extension}`; mark.alt=name; marks.append(mark);
        }
        row.append(label,marks); sponsors.append(row);
      }
      content.append(eyebrow,title,subtitle,rule,sponsors); scene.append(content); container.append(scene);
      const tl=gsap.timeline({defaults:{ease:'power2.out'}});
      tl.from(eyebrow,{opacity:0,y:12,duration:.75},.1);
      tl.from(title,{opacity:0,y:20,duration:.9},.25);
      tl.from(subtitle,{opacity:0,y:14,duration:.85},.45);
      tl.from(rule,{opacity:0,scaleX:.45,duration:.9},.55);
      tl.from(scene.querySelectorAll('.bwib-event-tier'),{opacity:0,y:16,duration:.85,stagger:.18},.85);
      tl.to({}, {duration:duration},0);
      return tl;
    }
  };
})();
