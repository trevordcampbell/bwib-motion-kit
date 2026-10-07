#!/usr/bin/env python3
"""Prepare a square excerpt from mastered audio, edited SRT and reviewed speakers."""
import argparse
import array
import json
import math
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def input_path(name):
    path = (ROOT / name).resolve()
    assert path.is_relative_to(ROOT) and path.is_file(), f'Copy input into the kit first: {name}'
    return path


def timestamp(value):
    h, m, s = map(float, value.strip().replace(',', '.').split(':'))
    return h * 3600 + m * 60 + s


def srt_time(value):
    ms = round(value * 1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--audio', required=True, help='Kit-relative mastered audio')
    parser.add_argument('--captions', required=True, help='Kit-relative edited SRT')
    parser.add_argument('--speakers', required=True, help='Kit-relative JSON array of reviewed {start,end,id}')
    parser.add_argument('--title', required=True, help='Brief editorial headline, not a fabricated quotation')
    parser.add_argument('--caption-origin', type=float, default=0, help='0 or 3600 for the source SRT origin')
    parser.add_argument('--start', type=float, default=0, help='Excerpt start in source audio seconds')
    parser.add_argument('--end', type=float, help='Excerpt end in source audio seconds; defaults to its duration')
    args = parser.parse_args()
    audio = input_path(args.audio)
    srt = input_path(args.captions)
    speaker_path = input_path(args.speakers)
    source_duration = float(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=nw=1:nk=1', str(audio)]))
    end = args.end if args.end is not None else source_duration
    assert math.isfinite(args.start) and math.isfinite(end) and 0 <= args.start < end <= source_duration + .001
    assert math.isfinite(args.caption_origin) and args.title.strip()
    duration = round(end - args.start, 9)
    captions = []
    for block in re.split(r'\r?\n\s*\r?\n', srt.read_text(encoding='utf-8-sig').strip()):
        lines = block.splitlines()
        index = next(i for i, line in enumerate(lines) if ' --> ' in line)
        start_time, end_time = [timestamp(v) - args.caption_origin for v in lines[index].split(' --> ')]
        assert 0 <= start_time < end_time <= source_duration + .05, 'Check the explicit SRT origin.'
        text = '\n'.join(lines[index + 1:])
        assert text.strip()
        if end_time > args.start and start_time < end:
            captions.append(dict(start=round(max(0, start_time-args.start), 9),
                                 end=round(min(duration, end_time-args.start), 9), text=text))
    assert captions, 'No edited captions overlap this excerpt.'
    speakers = []
    ids = {person['id'] for person in json.loads((ROOT/'config/people.json').read_text())}
    for interval in json.loads(speaker_path.read_text()):
        a, b = interval['start'], interval['end']
        assert interval['id'] in ids and 0 <= a < b <= source_duration + .05
        if b > args.start and a < end:
            speakers.append(dict(start=round(max(0, a-args.start), 9), end=round(min(duration, b-args.start), 9), id=interval['id']))
    assert speakers, 'No reviewed speaker intervals overlap this excerpt.'
    media = ROOT/'assets/user-media'
    media.mkdir(exist_ok=True)
    excerpt = media/'social-excerpt.wav'
    assert excerpt.resolve() != audio, 'Use the original audio input, not the generated excerpt.'
    subprocess.run(['ffmpeg', '-hide_banner', '-v', 'error', '-y', '-ss', str(args.start),
                    '-i', str(audio), '-t', str(duration), '-ar', '48000',
                    '-c:a', 'pcm_s24le', str(excerpt)], check=True)
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(excerpt),
                                   '-ac', '1', '-ar', '48000', '-f', 's16le', '-'])
    samples = array.array('h'); samples.frombytes(raw)
    values = []
    for i in range(0, len(samples), 1600):
        chunk = samples[i:i+1600]
        rms = math.sqrt(sum(sample*sample for sample in chunk)/len(chunk))/32768
        values.append(round(min(1, math.sqrt(rms)*2.8), 5))
    result = dict(title=args.title.strip(), duration=duration, audio=excerpt.relative_to(ROOT).as_posix(),
                  captions=sorted(captions, key=lambda x:x['start']),
                  speakers=sorted(speakers, key=lambda x:x['start']),
                  waveform=dict(hz=30, samples=values), exampleOnly=False)
    (ROOT/'config/social.json').write_text(json.dumps(result, indent=2, ensure_ascii=False)+'\n')
    chunks = [f'{i}\n{srt_time(c["start"])} --> {srt_time(c["end"])}\n{c["text"]}'
              for i, c in enumerate(result['captions'], 1)]
    (media/'social-excerpt.srt').write_text('\n\n'.join(chunks)+'\n')
    from configure import main as configure
    configure()
    print('Prepared square excerpt: audio, captions and speakers start at zero; no intro offset added.')
    print('Private audio and SRT stay in assets/user-media. Do not publish imported config or compiled social-data.js.')


if __name__ == '__main__':
    main()
