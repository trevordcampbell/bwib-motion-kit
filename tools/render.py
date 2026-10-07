#!/usr/bin/env python3
"""Render at native 4K, optionally mux local audio, then derive a 1080p copy."""
import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from configure import main as configure
from stage import stage

ROOT=Path(__file__).resolve().parents[1]


def run(args):
    subprocess.run(args,check=True,cwd=ROOT)


def main():
    registry=json.loads((ROOT/'templates.json').read_text())
    parser=argparse.ArgumentParser()
    parser.add_argument('template',choices=[t['id'] for t in registry])
    parser.add_argument('--1080p',dest='hd',action='store_true')
    parser.add_argument('--workers',type=int,default=1)
    args=parser.parse_args()
    configure()
    entry=next(t for t in registry if t['id']==args.template)
    out=ROOT/'renders';out.mkdir(exist_ok=True)
    destination=out/f'{args.template}-4K.mp4'
    assert not destination.exists(),f'Preserving {destination}; move it before rendering a new revision.'
    if args.hd:
        assert not (out/f'{args.template}-1080p.mp4').exists(), 'Preserving the existing 1080p export; move it first.'
    with tempfile.TemporaryDirectory(dir=out,prefix='.render-') as temporary:
        picture=Path(temporary)/'picture.mp4'
        project=stage(args.template,Path(temporary)/args.template)
        run(['hyperframes','render',str(project),'--output',str(picture),
             '--fps',entry['fps'],'--quality','delivery','--workers',str(args.workers),'--strict'])
        audio=None;delay=0;duration=entry['seconds']
        if args.template=='logo-opener':
            p=ROOT/'assets/user-media/logo-sting.wav'
            if p.exists():audio=p
        elif args.template.startswith('panel-'):
            panel=json.loads((ROOT/'config/panel.json').read_text());duration=panel['discussionDuration']+4;delay=4000
            if panel['audio']:audio=ROOT/panel['audio']
        elif args.template=='social-editorial':
            social=json.loads((ROOT/'config/social.json').read_text());duration=social['duration']
            if social['audio']:audio=ROOT/social['audio']
        if audio:
            chain=(f'adelay={delay}:all=1,' if delay else '')+f'apad=whole_dur={duration}'
            run(['ffmpeg','-hide_banner','-v','error','-i',str(picture),'-i',str(audio),
                 '-filter_complex',f'[1:a]{chain}[a]','-map','0:v:0','-map','[a]',
                 '-c:v','copy','-c:a','aac','-b:a','320k','-ar','48000','-t',str(duration),'-movflags','+faststart',str(destination)])
        else:
            shutil.move(picture,destination)
            print('Silent output: this template has no local soundtrack or panel audio.')
        if args.hd:
            hd_width=round(entry.get('width',3840)/entry.get('height',2160)*1080)
            run(['ffmpeg','-hide_banner','-v','error','-i',str(destination),'-vf',f'scale={hd_width}:1080:flags=lanczos',
                 '-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','copy',
                 '-movflags','+faststart',str(out/f'{args.template}-1080p.mp4')])
    print(destination)


if __name__=='__main__':main()
