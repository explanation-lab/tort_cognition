"""Append only the approved second necessity pilot to the existing Pages staging tree."""
from pathlib import Path
import hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[2]
OUTPUT=ROOT/'code/tools/generated/chs-pages'
PILOT=Path('code/experiments/experiment3/adults-pilot2')
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
if not (OUTPUT/'adult-necessity-pilot-manifest.json').is_file():raise ValueError('Stage the existing hosted studies first')
# Existing staging recounts newer CHS files in this historical receipt. Keep
# the already published receipt byte for byte; every file record must still match.
legacy=OUTPUT/'adult-consent-check-pilot-manifest.json'
receipt=json.loads(legacy.read_text())
receipt['preserved_hosted_files']=1416
frozen=(json.dumps(receipt,indent=2)+'\n').encode()
if hashlib.sha256(frozen).hexdigest()!='1fb6fe9a7cd252497d0d0b2ccca270f1d1bfea818e39e498f5579b4610066563':raise ValueError('Existing consent-check release changed; review its baseline first')
legacy.write_bytes(frozen)
before={str(p.relative_to(OUTPUT)):digest(p) for p in OUTPUT.rglob('*') if p.is_file()}
records=[]
for source in sorted((ROOT/PILOT).rglob('*')):
 if not source.is_file():continue
 relative=source.relative_to(ROOT);target=OUTPUT/relative
 if source.is_symlink() or target.exists():raise ValueError(f'Would replace a hosted URL: {relative}')
 if source.suffix not in {'.html','.js','.json','.png','.pptx','.md'}:raise ValueError(f'Unexpected pilot file: {relative}')
 target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target)
 records.append({'path':str(relative),'sha256':digest(target),'bytes':target.stat().st_size})
after={name:digest(OUTPUT/name) for name in before}
if after!=before:raise ValueError('An existing hosted file changed')
report={'experiment':3,'conditions':{'necessity':25,'no_necessity':25},'preserved_hosted_files':len(before),'existing_hosted_files_unchanged':True,'files':records}
(OUTPUT/'adult-necessity-pilot2-manifest.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'new_pilot_files':len(records),'existing_hosted_files_preserved':len(before),'existing_hosted_files_unchanged':True}))
