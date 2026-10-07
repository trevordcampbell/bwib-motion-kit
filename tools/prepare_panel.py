#!/usr/bin/env python3
"""Import edited audio, SRT and reviewed speaker intervals with an explicit origin."""
import argparse
import array
import json
import math
import re
import subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--audio',required=True,help='Kit-relative mastered audio path')
    p.add_argument('--captions',required=True,help='Edited SRT, not an unedited transcription')
    p.add_argument('--speakers',required=True,help='JSON array of reviewed {start,end,id} in discussion seconds')
    p.add_argument('--caption-origin',type=float,default=0,help='0 for zero-based SRT; 3600 for one-hour Resolve SRT')
    args=p.parse_args()
    audio=(ROOT/args.audio).resolve();assert audio.is_relative_to(ROOT) and audio.is_file()
    seconds=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(audio)]))
    def timestamp(s):
        h,m,sec=map(float,s.replace(',','.').split(':'));return h*3600+m*60+sec-args.caption_origin
    captions=[]
    for block in re.split(r'\n\s*\n',Path(args.captions).read_text(encoding='utf-8-sig').strip()):
        lines=block.splitlines();i=next(i for i,l in enumerate(lines) if ' --> ' in l)
        start,end=map(timestamp,lines[i].split(' --> '))
        assert 0<=start<end<=seconds+.05,(start,end,'Check caption origin')
        captions.append({'start':start,'end':end,'text':'\n'.join(lines[i+1:])})
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(audio),'-ac','1','-ar','8000','-f','f32le','-'])
    samples=array.array('f');samples.frombytes(raw)
    values=[math.sqrt(sum(v*v for v in samples[i:i+400])/len(samples[i:i+400])) for i in range(0,len(samples),400)]
    reference=sorted(values)[max(0,int(len(values)*.95)-1)] or 1
    result={'discussionDuration':seconds,'audio':audio.relative_to(ROOT).as_posix(),
            'captions':captions,'speakers':json.loads(Path(args.speakers).read_text()),
            'waveform':{'hz':20,'samples':[round(min(1,v/reference),5) for v in values]},'exampleOnly':False}
    (ROOT/'config/panel.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
    from configure import main as configure
    configure()
    print('Imported discussion data. Stage reveal adds four seconds once; audio and captions stay aligned.')


if __name__=='__main__':main()
