#!/usr/bin/env python3
"""Compile editable JSON into synchronous, offline template data."""
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(name):
    return json.loads((ROOT / f'config/{name}.json').read_text())


def local_asset(name):
    path = (ROOT / name).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        raise ValueError(f'Asset must be an existing file inside the kit: {name}')
    return '../../' + path.relative_to(ROOT).as_posix()


def main():
    event, guest, people, panel = [read(n) for n in ['event','interview','people','panel']]
    assert all(isinstance(event[k], str) and event[k] for k in ['name','date','title','subtitle'])
    assert all(isinstance(guest[k], str) and guest[k] for k in ['name','role','portrait'])
    guest['portrait'] = local_asset(guest['portrait'])
    for tier in event['sponsors']:
        assert tier['label'] and tier['names']
        for ident, name, ext in tier['names']:
            assert re.fullmatch(r'[a-z0-9-]+',ident) and ext in {'png','svg','jpg','webp'} and name
            local_asset(f'assets/sponsors/{ident}.{ext}')
    # Both final panel designs were composed for six people.
    assert len(people) == 6 and len({p['id'] for p in people}) == 6
    for p in people:
        p['portrait'] = local_asset(p['portrait'])
    seconds = panel['discussionDuration']
    assert math.isfinite(seconds) and seconds > 0
    ids = {p['id'] for p in people}
    for s in panel['speakers']:
        assert s['id'] in ids and 0 <= s['start'] < s['end'] <= seconds
    for c in panel['captions']:
        assert isinstance(c['text'],str) and 0 <= c['start'] < c['end'] <= seconds + .05
    wf = panel['waveform']
    assert wf['hz'] > 0 and wf['samples'] and all(0 <= s <= 1 for s in wf['samples'])
    if panel['audio']:
        local_asset(panel['audio'])
    projection = {'width':3840,'height':2160,'fps':30,'introDuration':4,'discussionDuration':seconds,
                  'duration':seconds+4,'audio':panel['audio'],'people':people,
                  'waveform':wf,'unassignedCues':[]}
    for key in ['captions','speakers']:
        projection[key] = sorted([dict(x,start=x['start']+4,end=x['end']+4) for x in panel[key]],key=lambda x:x['start'])
    shared = ROOT / 'templates/shared'
    shared.mkdir(parents=True, exist_ok=True)
    shared.joinpath('panel-data.js').write_text('window.BWIB_PANEL='+json.dumps(projection,ensure_ascii=False)+';\n')
    config = 'window.BWIB_KIT_EVENT='+json.dumps(event,ensure_ascii=False)+';\nwindow.BWIB_KIT_GUEST='+json.dumps(guest,ensure_ascii=False)+';\n'
    config += '''window.BWIBKitCustomize=()=>{
const e=window.BWIB_KIT_EVENT;
for(const s of ['.title-block h1','.editorial-copy h1']){const n=document.querySelector(s);if(n)n.textContent=e.title;}
for(const s of ['.subtitle','.theme']){const n=document.querySelector(s);if(n)n.textContent=e.subtitle;}
const a=document.querySelector('.event');if(a)a.textContent=e.name;
const c=document.querySelector('.event-label');if(c){c.textContent=e.name;const d=document.createElement('span');d.textContent=e.date;c.append(d);}
const f=document.querySelector('.footer p');if(f)f.textContent=e.date;
};\n'''
    shared.joinpath('config.js').write_text(config)
    social = read('social')
    assert isinstance(social['title'], str) and social['title']
    duration = social['duration']
    assert math.isfinite(duration) and duration > 0
    assert social['speakers'], 'Supply reviewed speaker intervals for the social excerpt.'
    for s in social['speakers']:
        assert s['id'] in ids and 0 <= s['start'] < s['end'] <= duration
    for c in social['captions']:
        assert isinstance(c['text'], str) and 0 <= c['start'] < c['end'] <= duration + .05
    waveform = social['waveform']
    assert waveform['hz'] > 0 and waveform['samples'] and all(0 <= s <= 1 for s in waveform['samples'])
    if social['audio']:
        local_asset(social['audio'])
    projection = dict(title=social['title'], duration=duration, people=people,
                      captions=sorted(social['captions'], key=lambda x:x['start']),
                      speakers=sorted(social['speakers'], key=lambda x:x['start']),
                      waveform=waveform['samples'], waveformHz=waveform['hz'],
                      exampleOnly=social.get('exampleOnly', False))
    shared.joinpath('social-data.js').write_text('window.BWIB_SOCIAL='+json.dumps(projection,ensure_ascii=False)+';\n')
    social_entry = ROOT/'templates/social-editorial/index.html'
    social_entry.write_text(re.sub(r'data-duration="[^"]+"',f'data-duration="{duration}"',social_entry.read_text(),count=1))
    for folder in ['panel-airy','panel-editorial']:
        p=ROOT/f'templates/{folder}/index.html'
        p.write_text(re.sub(r'data-duration="[^"]+"',f'data-duration="{seconds+4}"',p.read_text(),count=1))
    print('Configured six reusable templates from config/*.json')


if __name__ == '__main__':
    main()
