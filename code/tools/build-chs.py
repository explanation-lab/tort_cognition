"""Build paste-ready CHS code from the same revised task used in local previews.
Production requires every final child narration clip. --qa only permits loopback builds.
No upload, deployment, or live CHS edit is performed.
"""
from pathlib import Path
import argparse,hashlib,json,re,urllib.parse as U
R=Path(__file__).resolve().parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def build(experiment,asset_base,qa=False):
 u=U.urlsplit(asset_base);loopback=u.hostname in ['localhost','127.0.0.1','::1']
 if not u.netloc or u.query or u.fragment or u.username or u.password:raise ValueError('Use an absolute asset directory URL without credentials/query/fragment')
 if u.scheme!='https'and not(u.scheme=='http'and loopback):raise ValueError('Use HTTPS or localhost HTTP')
 if qa and not loopback:raise ValueError('--qa builds require loopback assets; they cannot be used for participant deployment')
 base=U.urlunsplit((u.scheme,u.netloc,U.quote(U.unquote(u.path),safe='/'),'','')).rstrip('/')+'/'
 child=R/f'code/experiments/experiment{experiment}/children';task=child/'js/chs-task.js';wrapper=child/'js/chs-platform-wrapper.js';engine=R/'code/shared/js/pilot-runtime.js'
 manifest=json.loads((R/'docs/scenarios.json').read_text())['scenarios'];narration=json.loads((R/'docs/narration/manifest.json').read_text())['clips']
 images=[child/'images'/name for name in ['pilot_cookie_jar_empty.png','michael.png','claire.png']]
 images += [child/'images'/s[key]for s in manifest if s['experiment']==experiment for key in ['p_img','v_img']]
 images += [child/s['reminder_image']for s in manifest if s['experiment']==experiment]
 images += [child/slide['image']for s in manifest if s['experiment']==experiment for slide in s['slides']]
 if missing:=sorted({str(p.relative_to(R))for p in images if not p.is_file()}):raise ValueError('Missing story images: '+str(missing))
 audios=[R/d for clip in narration for d in clip['destinations']if d.startswith(f'code/experiments/experiment{experiment}/')]
 missing=[str(p.relative_to(R))for p in audios if not p.is_file()]
 if missing and not qa:raise ValueError(f'{len(missing)} final audio files missing. Install verified narration first; only --qa loopback builds may omit audio.')
 fingerprints={c['clip_key']:c['sha256']for c in json.loads((R/'docs/narration/recordings.json').read_text())['clips']}
 for clip in narration:
  for destination in clip['destinations']:
   path=R/destination
   if destination.startswith(f'code/experiments/experiment{experiment}/')and path.is_file()and sha(path)!=fingerprints[clip['clip_key']]:raise ValueError('Final narration fingerprint changed: '+destination)
 source=task.read_text().replace('"assetRoot": ""','"assetRoot": '+json.dumps(base))
 local='const pilot = TortPilot.create({...PILOT_CONFIG, ...(globalThis.TORT_LOCAL_OPTIONS || {})});'
 if source.count(local)!=1:raise ValueError('Unexpected local-options entry; build stopped')
 source=source.replace(local,f'const pilot = TortPilot.create({{...PILOT_CONFIG, review:false, mute:{str(qa).lower()}}});')
 header='// GENERATED: rebuild instead of hand editing.\n'+('// LOCAL QA ONLY: missing final narration permitted; DO NOT DEPLOY.\n'if qa else'// Participant build: review tools off; final narration verified present locally.\n')
 result=header+engine.read_text()+'\n'+source+'\n'+wrapper.read_text()+'\njsPsych.run(chsTimeline);\n'
 for forbidden in ['Panel On/Off','pilot-review-panel','panel-toggle','TORT_LOCAL_OPTIONS','jumpTo']:
  if forbidden in result:raise ValueError('Review tool leaked into CHS code: '+forbidden)
 output=R/f'code/tools/generated/experiment{experiment}-chs-pilot.js';output.parent.mkdir(exist_ok=True);output.write_text(result)
 report={'experiment':experiment,'qa_only':qa,'missing_final_audio':missing,'review_tools_present':False,'asset_base':base,'task_sha256':sha(task),'engine_sha256':sha(engine),'wrapper_sha256':sha(wrapper),'output_sha256':sha(output),'deployment_performed':False}
 output.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--experiment',type=int,choices=[1,2],required=True);p.add_argument('--asset-base',required=True);p.add_argument('--qa',action='store_true');a=p.parse_args()
 try:print(json.dumps(build(a.experiment,a.asset_base,a.qa),indent=2))
 except ValueError as e:p.exit(1,str(e)+'\n')
