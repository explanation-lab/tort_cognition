"""Append only the approved consent-check pilot to the existing Pages staging tree."""
from pathlib import Path
import hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[2]
OUTPUT=ROOT/'code/tools/generated/chs-pages'
PILOT=Path('code/experiments/experiment2/adults-consent-check')
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
if not (OUTPUT/'adult-pilot-manifest.json').is_file():raise ValueError('Stage the existing hosted studies first')
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
report={'experiment':2,'conditions':{'consent':25,'no_consent':25},'preserved_hosted_files':len(before),'existing_hosted_files_unchanged':True,'files':records}
(OUTPUT/'adult-consent-check-pilot-manifest.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'new_pilot_files':len(records),'existing_hosted_files_preserved':len(before),'existing_hosted_files_unchanged':True}))
