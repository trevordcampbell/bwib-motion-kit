#!/usr/bin/env python3
"""Prepare a user-downloaded logo soundtrack locally, outside Git."""
import argparse
import subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('source',help='Your downloaded Electronic Technology Logo MP3')
args=parser.parse_args()
destination=ROOT/'assets/user-media/logo-sting.wav'
assert not destination.exists(),f'Preserving {destination}'
subprocess.run(['ffmpeg','-hide_banner','-v','error','-i',args.source,'-ar','48000','-ac','2',
                '-af','volume=-4dB','-c:a','pcm_s24le',str(destination)],check=True)
print('Prepared the approved Electronic soundtrack at its production gain. Kept outside Git.')
