#!/usr/bin/env python3
"""Preview a template with the same closed asset layout used by rendering."""
import argparse
import json
import os
import subprocess
import shutil
from pathlib import Path
from configure import main as configure
from stage import stage
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser()
p.add_argument('template',choices=[t['id'] for t in json.loads((ROOT/'templates.json').read_text())])
mode=p.add_mutually_exclusive_group()
mode.add_argument('--stop',action='store_true')
mode.add_argument('--status',action='store_true')
a=p.parse_args()
project=ROOT/'renders/.preview'/a.template
command=['hyperframes','preview',str(project)]
if a.status:
    subprocess.run(command+['--status'],check=True)
elif a.stop:
    subprocess.run(command+['--stop'],check=True)
    if project.exists():shutil.rmtree(project)
else:
    configure()
    if project.exists():
        subprocess.run(command+['--stop'],check=True)
        shutil.rmtree(project)
    project.parent.mkdir(parents=True,exist_ok=True)
    stage(a.template,project)
    # The pinned CLI defaults to container loopback. Bind inside the container;
    # Compose exposes this port only on the host's localhost interface.
    subprocess.run(command+['--port','3040','--no-open','--background'],check=True,
                   env={**os.environ,'HYPERFRAMES_PREVIEW_HOST':'0.0.0.0'})
    print(f'Open http://localhost:3040/#project/{a.template}')
    print(f'Stop and clean staged files: npm run preview -- {a.template} --stop')
