"""Stage only the current Experiment 1 child media for HTTPS hosting."""
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
    if len(records) != 195:
        raise ValueError(f'Expected 195 approved media files, found {len(records)}')
    (OUTPUT / '.nojekyll').touch()
    (OUTPUT / 'media-manifest.json').write_text(json.dumps({'study': 6208, 'experiment': 1, 'files': records}, indent=2) + '\n')
    print(json.dumps({'files': len(records), 'bytes': sum(r['bytes'] for r in records), 'output': str(OUTPUT)}))

if __name__ == '__main__':
    stage()
