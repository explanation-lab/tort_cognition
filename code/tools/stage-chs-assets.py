"""Stage existing studies unchanged, optionally adding the consent review."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'code/experiments/experiment1/children'
OUTPUT = ROOT / 'code/tools/generated/chs-pages'

def stage(consent_review=True):
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
        # Freeze the runtime used by the already deployed carelessness pilot.
        # Consent has its own generated runtime; hosting it must not update this one.
        content = (ROOT / 'code/tools/hosting/adult-pilot-runtime.js').read_bytes() if str(relative) == 'code/shared/js/pilot-runtime.js' else source.read_bytes()
        target.write_bytes(content)
        adult_records.append({'path': str(relative), 'sha256': hashlib.sha256(content).hexdigest()})
    (OUTPUT / 'adult-pilot-manifest.json').write_text(json.dumps({'files': adult_records}, indent=2) + '\n')
    review_records = []
    if consent_review:
        review = ROOT / 'code/experiments/experiment2/consent/adults'
        review_paths = [review / name for name in [
            'materials-preview.html', 'pilot-preview.html', 'configuration.js',
            'study.js', 'review.js', 'consent-runtime.js', 'assets-manifest.json']]
        asset_manifest = json.loads((review / 'assets-manifest.json').read_text())
        if asset_manifest.get('source_mode') == 'edited_case_decks':
            review_paths.extend(review / name for name in
                                list(asset_manifest['images']) + asset_manifest['support_images'])
        else:
            review_paths.extend(p for p in (review / 'images').rglob('*')
                                if p.is_file() and p.suffix.lower() in {'.png', '.jpg', '.jpeg'})
        review_paths.extend(review / deck['path'] for deck in asset_manifest['decks'].values())
        for source in sorted(review_paths):
            if not source.is_file() or source.is_symlink():
                raise ValueError(f'Unexpected consent review input: {source}')
            relative = source.relative_to(ROOT)
            target = OUTPUT / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            review_records.append({'path': str(relative), 'bytes': source.stat().st_size,
                                   'sha256': hashlib.sha256(source.read_bytes()).hexdigest()})
        # Participant index.html is deliberately absent from this review publication.
        (OUTPUT / 'consent-review-manifest.json').write_text(json.dumps({
            'review_only': True, 'response_submission': False, 'files': review_records,
        }, indent=2) + '\n')
    print(json.dumps({'child_files': len(records), 'adult_files': len(adult_records),
                      'consent_review_files': len(review_records), 'output': str(OUTPUT)}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--consent-review', choices=['include', 'exclude'], default='include')
    stage(parser.parse_args().consent_review == 'include')
