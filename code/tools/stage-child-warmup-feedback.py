"""Append versioned warm-up recordings while preserving the complete staged site."""
from pathlib import Path
import hashlib,json

ROOT=Path(__file__).resolve().parents[2]
OUTPUT=ROOT/'code/tools/generated/chs-pages'
SOURCE=ROOT/'code/shared/audio/child-warmup-feedback-v1'

def hashes():
    return {str(p.relative_to(OUTPUT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in OUTPUT.rglob('*') if p.is_file()}

def stage():
    if not (OUTPUT/'child-full-study-manifest.json').exists() or not (OUTPUT/'child-consent-study-manifest.json').exists():
        raise ValueError('Stage the existing complete site first')
    before=hashes()
    manifest=json.loads((ROOT/'code/shared/child-warmup-feedback/v1/audio.json').read_text())
    expected={r['filename'] for r in manifest}
    if len(expected)!=13 or {p.name for p in SOURCE.iterdir()}!=expected:
        raise ValueError('Unexpected feedback recording inventory')
    records=[]
    for row in manifest:
        source=SOURCE/row['filename'];relative=source.relative_to(ROOT);target=OUTPUT/relative
        if source.is_symlink() or target.exists(): raise ValueError('Refusing source link or existing URL: '+str(relative))
        data=source.read_bytes()
        if hashlib.sha256(data).hexdigest()!=row['sha256']: raise ValueError('Recording hash mismatch')
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
        records.append({'path':str(relative),'sha256':row['sha256']})
    report=OUTPUT/'child-warmup-feedback-v1-manifest.json'
    if report.exists(): raise ValueError('Refusing existing manifest URL')
    report.write_text(json.dumps({'version':1,'files':records},indent=2)+'\n')
    after=hashes()
    if any(after.get(path)!=sha for path,sha in before.items()): raise ValueError('Existing staged file changed')
    print(json.dumps({'newRecordings':len(records),'existingHostedFilesPreserved':len(before),'existingHostedFilesUnchanged':True}))

if __name__=='__main__':stage()
