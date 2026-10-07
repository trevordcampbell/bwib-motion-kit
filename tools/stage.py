#!/usr/bin/env python3
"""Materialize a closed HyperFrames project with plain root-relative assets."""
import argparse
import json
import shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]


def stage(template, destination):
    allowed={t['id'] for t in json.loads((ROOT/'templates.json').read_text())}
    assert template in allowed
    shutil.copytree(ROOT/'templates'/template,destination)
    shutil.copytree(ROOT/'templates/shared',destination/'shared')
    shutil.copytree(ROOT/'assets',destination/'assets',ignore=shutil.ignore_patterns('user-media'))
    for p in destination.rglob('*'):
        if p.is_file() and p.suffix in {'.html','.css','.js'}:
            p.write_text(p.read_text().replace('../../assets/','assets/').replace('../shared/','shared/'))
    return destination


def main():
    p=argparse.ArgumentParser();p.add_argument('destination');p.add_argument('--all',action='store_true');p.add_argument('--template')
    a=p.parse_args();destination=Path(a.destination)
    if a.all:
        for t in json.loads((ROOT/'templates.json').read_text()):stage(t['id'],destination/t['id'])
    else:stage(a.template,destination)


if __name__=='__main__':main()
