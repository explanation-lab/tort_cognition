"""Regenerate small experiment configurations from the scenario/narration manifests."""
from pathlib import Path
import hashlib,json,re
R=Path(__file__).resolve().parents[2]
def generate():
 scenarios=json.loads((R/'docs/scenarios.json').read_text())['scenarios']
 texts=json.loads((R/'docs/narration/source.json').read_text())
 clips=json.loads((R/'docs/narration/runtime.json').read_text())
 timing=json.loads((R/'docs/narration/demo-timing.json').read_text())
 for e in [1,2]:
  for audience in ['adults','children']:
   # The same scenario configuration is used by adults and CHS children.
   config={'experiment':e,'audience':audience,'assetRoot':'','scenarios':[{k:v for k,v in s.items()if k not in ['deck','deck_sha256','experiment']}for s in scenarios if s['experiment']==e],'texts':texts,'clips':clips[str(e)],'demoTiming':timing}
   if audience=='children':
    names={'michael.png','claire.png','pilot_cookie_jar_empty.png'}|{s[k]for s in scenarios if s['experiment']==e for k in ['p_img','v_img']}
    config['imageVersions']={'images/'+name:hashlib.sha256((R/f'code/experiments/experiment{e}/children/images'/name).read_bytes()).hexdigest()[:12]for name in sorted(names)}
   text='// Generated configuration; regenerate with code/tools/generate-pilot.py.\nconst PILOT_CONFIG = '+json.dumps(config,ensure_ascii=False,indent=2)+';\n'
   text+='const pilot = TortPilot.create({...PILOT_CONFIG, ...(globalThis.TORT_LOCAL_OPTIONS || {})});\n'
   if audience=='children':
    text+='''const jsPsych = initJsPsych({display_element:pilot.review?'jspsych-target':undefined,show_progress_bar:true,
 on_finish(){
   // CHS receives raw trial rows and case_summary rows, including presentation position.
   console.log('Pilot task complete', {review_mode:pilot.review, case_rows:pilot.mergedRows()});
 }
});
const timeline = pilot.timeline;
'''
    name='chs-task.js'
   else:
    text+='''var participantConsented = false;
const jsPsych = initJsPsych({display_element:'jspsych-target',show_progress_bar:true,
 on_finish(){
   const demographics=jsPsych.data.get().filter({is_demographic:true}).values();
   if(pilot.review){document.getElementById('jspsych-target').innerHTML='<p style="text-align:center">Local review finished. Responses are review data and were not submitted.</p>';return;}
   if(!participantConsented)return;
   const trials=pilot.mergedRows();
   if(typeof proliferate!=='undefined')proliferate.submit({trials,demographics});
 }
});
const forms=buildPilotAdultForms(jsPsych,()=>{participantConsented=true;});
Object.values(forms).forEach(t=>{t.data={...t.data,review_mode:pilot.review,valid_participant_data:!pilot.review};});
const endScreen={type:jsPsychHtmlButtonResponse,stimulus:'<h2>Thank you!</h2>',choices:['Finish'],_debugLabel:'Finish'};
const timeline=[forms.consentScreen,...pilot.timeline,forms.demographicsScreen,forms.feedbackScreen,endScreen];
if(!pilot.review)jsPsych.run(timeline);
'''
    name='experiment.js'
   (R/f'code/experiments/experiment{e}/{audience}/js/{name}').write_text(text)
   # Version the active local assets together. Reloaded preview pages must not
   # pair a cached pre-segmentation runtime with current narration/configuration.
   if audience=='children':
    # Participant task begins automatically after the host's consent/start flow.
    # The standalone HTML mirrors that task; Lookit uses build-chs.py instead.
    (R/f'code/experiments/experiment{e}/children/index.html').write_text(f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Experiment {e} — children</title>
  <link rel="stylesheet" href="../../../shared/css/jspsych-7.3.4.css">
  <script src="../../../shared/js/jspsych-7.3.4.js"></script>
  <script src="../../../shared/js/plugin-html-button-response-1.1.3.js"></script>
  <script src="../../../shared/js/pilot-runtime.js"></script>
</head>
<body>
  <script src="js/chs-task.js"></script>
  <script>jsPsych.run(timeline);</script>
</body>
</html>
''')
   pages=['pilot-preview.html','index.html']
   for page in pages:
    html_path=R/f'code/experiments/experiment{e}/{audience}/{page}'
    def version(match):
     src=match[1].split('?',1)[0]
     asset=html_path.parent/src
     digest=hashlib.sha256(asset.read_bytes()).hexdigest()[:12]
     return f'<script src="{src}?v={digest}"></script>'
    html_path.write_text(re.sub(r'<script src="([^\"]*(?:pilot-runtime|pilot-adult-forms|pilot-review|experiment|chs-task)\.js)(?:\?[^\"]*)?"></script>',version,html_path.read_text()))
 # The entry HTML itself can be cached independently of its versioned scripts.
 # Give each launcher link the current entry-page fingerprint, so an old
 # cached page cannot bypass the shared runtime/configuration versions above.
 launcher=R/'code/experiments/index.html'
 def version_entry(match):
  relative=match[1]
  digest=hashlib.sha256((R/'code/experiments'/relative).read_bytes()).hexdigest()[:12]
  return f'href="{relative}?v={digest}"'
 launcher.write_text(re.sub(r'href="(experiment[12]/(?:children|adults)/(?:pilot-preview|index)\.html)(?:\?[^\"]*)?"',version_entry,launcher.read_text()))
 # Named adult entries reuse the same current story sources and assets.
 import runpy
 runpy.run_path(str(R/'code/tools/generate-adult-between.py'))['generate']()
 runpy.run_path(str(R/'code/tools/generate-adult-consent.py'))['generate']()
if __name__=='__main__':generate()
