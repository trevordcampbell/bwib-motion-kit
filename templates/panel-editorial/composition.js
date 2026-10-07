/* All caption/speaker times include the explicit intro offset exactly once. */
window.createEditorialSpotlight4K = () => {
  'use strict';
  const stageStart = 0;
  const panel = window.BWIB_PANEL;
  if (!panel) throw new Error('Editorial Spotlight Panel requires shared/panel-data.js');
  if (panel.width !== 3840 || panel.height !== 2160 || panel.introDuration !== 4) throw new Error('Round 2 data must match the frozen production timing contract');
  const assetPath = path => path;
  const root = document.getElementById('editorial-spotlight-4k');
  root.dataset.duration = String(panel.duration);
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const featured = new Map();
  const roster = new Map();
  panel.people.forEach(person => {
    const portrait = make('img', 'featured-portrait');
    portrait.dataset.personId = person.id;
    if (person.id === 'liyang-diao') portrait.dataset.layoutAllowOverflow = '';
    portrait.src = assetPath(person.portrait);
    portrait.alt = person.name;
    const identity = make('div', 'speaker-identity');
    identity.dataset.personId = person.id;
    const state = make('div', 'speaker-state', 'Now speaking');
    identity.append(state, make('div', 'speaker-name', person.name), make('div', 'speaker-description', [person.role, person.affiliation].filter(Boolean).join(' · ')));
    document.getElementById('featured-portraits').append(portrait);
    document.getElementById('speaker-identities').append(identity);
    featured.set(person.id, { portrait, identity, state });
    const row = make('div', 'roster-person');
    const rosterPortrait = make('img', 'roster-photo');
    rosterPortrait.src = assetPath(person.portrait);
    rosterPortrait.alt = person.name;
    const label = make('div', 'roster-label');
    const role = /moderator/i.test(person.role) ? 'Moderator' : 'Panelist';
    label.append(make('div', 'roster-name', person.name), make('div', 'roster-role', role));
    row.append(rosterPortrait, label);
    document.getElementById('roster').append(row);
    roster.set(person.id, { portrait:rosterPortrait, label });
  });
  const caption = make('p', 'caption');
  document.getElementById('captions').append(caption);
  const waveformPath = document.getElementById('waveform-path');

  // Upper-bound search is independent of playback direction and scales with
  // log(cue count). Only one caption node and six cached portrait layers exist.
  const indexAt = (items, time) => {
    let low = 0;
    let high = items.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (items[middle].start <= time) low = middle + 1;
      else high = middle;
    }
    return low - 1;
  };
  const ease = value => .5 - .5 * Math.cos(Math.PI * Math.min(1, Math.max(0, value)));
  const speakers = panel.speakers.filter(segment => segment.id && featured.has(segment.id));
  let captionIndex = -2;
  let waveformIndex = -2;
  let speakerStateKey = '';
  const draw = time => {
    const candidate = indexAt(panel.captions, time);
    const cueIndex = candidate >= 0 && time < panel.captions[candidate].end ? candidate : -1;
    if (cueIndex !== captionIndex) {
      caption.textContent = cueIndex >= 0 ? panel.captions[cueIndex].text : '';
      caption.style.opacity = cueIndex >= 0 ? '1' : '0';
      captionIndex = cueIndex;
    }
    const segmentIndex = indexAt(speakers, time);
    const segment = segmentIndex >= 0 ? speakers[segmentIndex] : speakers[0];
    const heldId = segment?.id || panel.people[0].id;
    const unassignedIndex = indexAt(panel.unassignedCues || [], time);
    const explicitlyNeutral = unassignedIndex >= 0 && time < panel.unassignedCues[unassignedIndex].end;
    const active = !explicitlyNeutral && segmentIndex >= 0 && time < segment.end;
    const previous = segmentIndex > 0 ? speakers[segmentIndex - 1] : null;
    const changing = previous && previous.id !== heldId && time < segment.start + .32;
    const handoff = changing ? ease((time - segment.start) / .32) : 1;
    const identityOut = changing ? 1 - ease((time - segment.start) / .16) : 0;
    const identityIn = changing ? ease((time - segment.start - .16) / .16) : 1;
    const activity = explicitlyNeutral ? 0 : active ? ease((time - segment.start) / .28) : segmentIndex >= 0 ? 1 - ease((time - segment.end) / .25) : 0;
    const nextSpeakerStateKey = [segmentIndex, active, handoff, identityOut, identityIn, activity].join('|');
    if (nextSpeakerStateKey !== speakerStateKey) featured.forEach((entry, id) => {
      const incoming = id === heldId;
      const outgoing = changing && id === previous.id;
      entry.portrait.style.translate = `${incoming ? 12 * (1 - handoff) : outgoing ? -8 * handoff : 0}px 0px`;
      entry.portrait.style.opacity = String(incoming ? handoff : outgoing ? 1 - handoff : 0);
      entry.identity.style.opacity = String(incoming ? identityIn : outgoing ? identityOut : 0);
      entry.portrait.style.filter = `grayscale(${incoming ? 1 - activity : 1})`;
      entry.state.style.opacity = incoming && active ? '1' : '0';
      const row = roster.get(id);
      row.portrait.style.filter = `grayscale(${incoming ? 1 - activity : 1})`;
      row.portrait.style.transform = `scale(${incoming ? 1 + .04 * activity : 1})`;
      const blend = incoming ? activity : 0;
      row.label.style.color = `rgb(${Math.round(20 + 122 * blend)},${Math.round(44 + 49 * blend)},${Math.round(54 + 79 * blend)})`;
    });
    speakerStateKey = nextSpeakerStateKey;
    const { samples, hz } = panel.waveform;
    const sampleIndex = time < panel.introDuration || time >= panel.duration ? -1 : Math.floor((time - panel.introDuration) * hz);
    if (sampleIndex !== waveformIndex) {
      const pieces = [];
      for (let bar = 0; bar < 33; bar += 1) {
        const index = sampleIndex + bar - 16;
        const amplitude = sampleIndex < 0 || index < 0 || index >= samples.length ? 0 : Math.min(1, Math.max(0, samples[index]));
        const halfHeight = amplitude * 24;
        pieces.push(`M${8 + bar * 12.5} ${29 - halfHeight}V${29 + halfHeight}`);
      }
      waveformPath.setAttribute('d', pieces.join(''));
      waveformIndex = sampleIndex;
    }
  };

  // A visual GSAP plugin renders the panel state even on callback-suppressed
  // seeks. This avoids a playback clock, asynchronous asset switching, and an
  // hour of per-frame waveform tweens while preserving the player contract.
  gsap.registerPlugin({
    name:'bwibPanelVisuals',
    rawVars:true,
    init(target, value) { this.value = value; return true; },
    render(ratio, data) { data.value.draw(ratio * data.value.duration); }
  });
  const tl = gsap.timeline({ paused:true });
  tl.to(root, { bwibPanelVisuals:{ draw, duration:panel.duration }, duration:panel.duration, ease:'none' }, 0);
  tl.fromTo('#discussion-stage',{opacity:0},{opacity:1,duration:.7,ease:'sine.inOut',immediateRender:true},0);
  tl.from('.brand',{opacity:0,x:-12,duration:.85,ease:'power3.out'},stageStart+0.15);
  tl.from('.event-label',{opacity:0,y:-10,duration:.7,ease:'power2.out'},stageStart+0.3);
  tl.from('.portrait-halo',{opacity:0,scale:.96,duration:1.4,ease:'sine.out'},stageStart+0.2);
  tl.from('.portrait-stage',{opacity:0,y:18,duration:1.05,ease:'power2.out'},stageStart+0.3);
  tl.from('.eyebrow',{opacity:0,y:8,duration:.55,ease:'power3.out'},stageStart+0.45);
  tl.from('#discussion-stage h1',{opacity:0,x:-14,duration:.9,ease:'power2.out'},stageStart+0.55);
  tl.from('.theme',{opacity:0,y:8,duration:.8,ease:'sine.out'},stageStart+0.75);
  tl.from('.roster-panel h3',{opacity:0,x:12,duration:.65,ease:'power3.out'},stageStart+0.65);
  tl.from('.roster-person',{opacity:0,x:14,duration:.85,stagger:.065,ease:'power2.out'},stageStart+0.8);
  tl.from('.speaker-identities',{opacity:0,y:8,duration:.8,ease:'sine.out'},stageStart+1.1);
  tl.from('.audio-readout',{opacity:0,y:5,duration:.65,ease:'power3.out'},stageStart+1.45);
  tl.from('.caption-band',{opacity:0,duration:.7,ease:'sine.out'},stageStart+1.3);
  tl.from('footer',{opacity:0,duration:.8,ease:'power2.out'},stageStart+1.5);
  draw(0);
  return tl;
};
