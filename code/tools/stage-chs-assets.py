"""Stage approved child media plus the adult pilot, preserving child media bytes."""
from pathlib import Path
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'code/experiments/experiment1/children'
OUTPUT = ROOT / 'code/tools/generated/chs-pages'

def stage():
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    records = []
    for folder, extensions in [('images', {'.png', '.jpg', '.jpeg'}), ('audio', {'.m4a'})]:
        for source in sorted((SOURCE / folder).rglob('*')):
            if not source.is_file():
                continue
            if source.suffix.lower() not in extensions or source.is_symlink():
                raise ValueError(f'Unexpected media: {source}')
            relative = source.relative_to(ROOT)
            target = OUTPUT / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            records.append({'path': str(relative), 'bytes': source.stat().st_size,
                            'sha256': hashlib.sha256(source.read_bytes()).hexdigest()})
    expected = {'images/michael.png', 'images/claire.png', 'images/pilot_cookie_jar_empty.png'}
    scenarios = json.loads((ROOT / 'docs/scenarios.json').read_text())['scenarios']
    for scenario in scenarios:
        if scenario['experiment'] != 1:
            continue
        expected.update(['images/' + scenario['p_img'], 'images/' + scenario['v_img'], scenario['reminder_image']])
        expected.update(slide['image'] for slide in scenario['slides'])
    prefix = str(SOURCE.relative_to(ROOT)) + '/'
    clips = json.loads((ROOT / 'docs/narration/manifest.json').read_text())['clips']
    expected.update(dest[len(prefix):] for clip in clips for dest in clip['destinations'] if dest.startswith(prefix))
    if {str(Path(record['path']).relative_to(SOURCE.relative_to(ROOT))) for record in records} != expected:
        raise ValueError('Staged media differ from the current approved references')
    (OUTPUT / '.nojekyll').touch()
    (OUTPUT / 'media-manifest.json').write_text(json.dumps({'study': 6208, 'experiment': 1, 'files': records}, indent=2) + '\n')
    adult_records = []
    adult_paths = []
    for experiment in [1, 2]:
        adult = ROOT / f'code/experiments/experiment{experiment}/adults'
        adult_paths.extend(p for p in (adult / 'images').rglob('*') if p.is_file())
    entry = ROOT / 'code/experiments/experiment1/adults/between-subjects'
    adult_paths.extend(entry / name for name in ['index.html', 'pilot-preview.html', 'study.js', 'configuration.js',
                                               'explanation-lab.config.json', 'explanation-lab-client.js'])
    adult_paths.extend(ROOT / 'code/shared/js' / name for name in ['jspsych-7.3.4.js',
        'plugin-html-button-response-1.1.3.js', 'pilot-runtime.js', 'pilot-adult-forms.js', 'pilot-review.js'])
    adult_paths.append(ROOT / 'code/shared/css/jspsych-7.3.4.css')
    for source in sorted(adult_paths):
        if not source.is_file() or source.is_symlink():
            raise ValueError(f'Unexpected adult pilot input: {source}')
        relative = source.relative_to(ROOT)
        target = OUTPUT / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        adult_records.append({'path': str(relative), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()})
    (OUTPUT / 'adult-pilot-manifest.json').write_text(json.dumps({'files': adult_records}, indent=2) + '\n')
    print(json.dumps({'child_files': len(records), 'adult_files': len(adult_records), 'output': str(OUTPUT)}))

if __name__ == '__main__':
    stage()
