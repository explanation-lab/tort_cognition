"""Rebuild final recording materials from active child configs and approved decks.
No behavioral code, stimulus wording or live study is changed.
"""
from pathlib import Path
import hashlib,json,re,html,xml.etree.ElementTree as ET,zipfile
R=Path(__file__).resolve().parents[2]
N={'a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
def normal(text):return re.sub(r'\s+',' ',text).strip()
def active_config(experiment):
 path=R/f'code/experiments/experiment{experiment}/children/js/chs-task.js'
 return json.loads(path.read_text().split('const PILOT_CONFIG = ',1)[1].split(';\nconst pilot',1)[0])
def generate():
 configs={e:active_config(e)for e in [1,2]}
 catalog=json.loads((R/'docs/scenarios.json').read_text())['scenarios']
 catalog={(s['experiment'],s['scenario_key']):s for s in catalog}
 requests=[];paths={'code/shared/js/pilot-runtime.js','docs/narration/demo-timing.json',*(f'code/experiments/experiment{e}/children/js/chs-task.js'for e in [1,2])}
 instructions=configs[1]['texts']
 if instructions!=configs[2]['texts']:raise ValueError('Active Experiment 1/2 instruction wording differs; review before recording.')
 if instructions!=json.loads((R/'docs/narration/source.json').read_text()):raise ValueError('Editable narration source differs from active child wording; review before recording.')
 assert instructions['cookie_explanation']==' '.join(instructions['cookie_explanation_'+part]for part in ['opening','person','jar'])
 for construct in ['fault','carelessness']:
  assert instructions[construct+'_explanation_first']==' '.join(instructions[construct+'_explanation_'+part]for part in ['intro','large','small','zero'])
 for key,text in instructions.items():
  if key in ['cookie_explanation','fault_explanation_first','carelessness_explanation_first']:continue # Display-only composites; individual sentences are narrated.
  for e,cfg in configs.items():
   audio=cfg['clips'][key]
   if Path(audio).parent!=Path('audio'):raise ValueError('Unexpected active narration path '+audio)
   requests.append(dict(clip_key=key,audio=audio,text=text,experiment=e,screen=key,scenario_key=None,slide_number=None))
 for e,cfg in configs.items():
  assert len(cfg['scenarios'])==8
  for scenario in cfg['scenarios']:
   source=catalog[(e,scenario['scenario_key'])];deck=R/source['deck'];paths.add(source['deck'])
   if hashlib.sha256(deck.read_bytes()).hexdigest()!=source['deck_sha256']:raise ValueError('Approved deck fingerprint changed: '+source['deck'])
   with zipfile.ZipFile(deck)as archive:
    slide_names=[n for n in archive.namelist()if re.fullmatch(r'ppt/slides/slide\d+\.xml',n)]
    assert len(slide_names)==len(scenario['slides'])
    for slide in scenario['slides']:
     xml=ET.fromstring(archive.read(f"ppt/slides/slide{slide['slide_number']}.xml"))
     caption='\n'.join(''.join(run.text or ''for run in paragraph.findall('.//a:t',N))for paragraph in xml.findall('.//a:p',N)).strip()
     if caption!=slide['text']:raise ValueError(f"Active slide/deck caption mismatch: experiment {e} {scenario['scenario_key']} slide {slide['slide_number']}")
     if slide.get('narration_repeat_of'):
      previous=next(s for s in scenario['slides']if s['slide_number']==slide['narration_repeat_of'])
      assert previous['slide_number']<slide['slide_number']and previous['text']==caption
      continue # Approved visual continuation; caption retained, narration played once.
     requests.append(dict(clip_key=f"{scenario['scenario_key']}_{slide['slide_number']:02}",audio=slide['audio'],text=caption,experiment=e,screen='story',scenario_key=scenario['scenario_key'],slide_number=slide['slide_number']))
 unique={};clips=[];maps={1:{},2:{}}
 for req in requests:
  spoken=normal(req['text'])
  if not spoken:raise ValueError('Empty current caption '+str(req))
  if spoken not in unique:
   key=('exp2_'if req['screen']=='story'and req['experiment']==2 else '')+req['clip_key']
   assert key not in {c['clip_key']for c in clips}
   clip=dict(recording_index=len(clips)+1,clip_key=key,filename=key+'.m4a',text=spoken,experiments=[],screen=req['screen'],scenario_key=req['scenario_key'],slide_number=req['slide_number'],destinations=[],uses=[],shared=False)
   clips.append(clip);unique[spoken]=clip
  clip=unique[spoken];e=req['experiment'];dest=f"code/experiments/experiment{e}/children/{req['audio']}"
  if e not in clip['experiments']:clip['experiments'].append(e)
  if dest not in clip['destinations']:clip['destinations'].append(dest)
  clip['uses'].append({**{k:req[k]for k in ['experiment','screen','scenario_key','slide_number']},'reference_key':req['clip_key'],'destination':dest})
  maps[e][req['clip_key']]=req['audio']
 for clip in clips:clip['shared']=len(clip['destinations'])>1
 if any(re.search(r'\b(?:Maggie|punish\w*)\b',c['text'],re.I)for c in clips):raise ValueError('Obsolete Maggie/punishment narration found; review before recording.')
 word_count=sum(len(re.findall(r"\b[\w’']+\b",c['text']))for c in clips)
 stats={'unique_clips':len(clips),'instruction_clips':sum(c['screen']!='story'for c in clips),'story_clips':sum(c['screen']=='story'for c in clips),'story_slide_uses':sum(r['screen']=='story'for r in requests),'destinations':sum(len(c['destinations'])for c in clips),'words':word_count,'spoken_minutes_at_140_wpm':round(word_count/140,1),'spoken_minutes_at_110_wpm':round(word_count/110,1),'between_clip_silence_minutes':round((len(clips)-1)*3/60,1)}
 total_time=f"{round(stats['spoken_minutes_at_140_wpm']+stats['between_clip_silence_minutes'])}–{round(stats['spoken_minutes_at_110_wpm']+stats['between_clip_silence_minutes'])}"
 manifest={'schema_version':2,'source_authority':'Current active child configurations + shared runtime + exact approved editable PowerPoint captions; old narration manifests are not input.','sources':{path:hashlib.sha256((R/path).read_bytes()).hexdigest()for path in sorted(paths)},'format':'AAC mono .m4a, 48 kHz, 128 kbps','silence_between_segments_seconds':3,'summary':stats,'clips':clips}
 trace_path=R/'code/tools/generated/narration-active-trace.json'
 if not trace_path.exists():raise ValueError('Run code/tools/check-narration.cjs before generating final recording materials.')
 trace=json.loads(trace_path.read_text());by_dest={d:c for c in clips for d in c['destinations']}
 assert len(trace['conditions'])==8
 if any(trace.get('sources',{}).get(path)!=manifest['sources'][path]for path in ['code/shared/js/pilot-runtime.js',*(f'code/experiments/experiment{e}/children/js/chs-task.js'for e in [1,2])]):raise ValueError('Active narration trace is stale; rerun code/tools/check-narration.cjs before validation.')
 assert set(by_dest)=={r['destination']for r in trace['requests']}
 for request in trace['requests']:assert by_dest[request['destination']]['text']==normal(request['text'])
 review_notes=[]
 for e,cfg in configs.items():
  for scenario in cfg['scenarios']:
   for slide in scenario['slides']:
    if re.search(r"\bof (?:Nora|Eric) cookies\b",slide['text']):review_notes.append(f"Experiment {e} {scenario['scenario_key']} slide {slide['slide_number']}: “{normal(slide['text'])}” retained verbatim; possessive wording needs transcript review.")
 squirrel={e:next(s for s in cfg['scenarios']if s['scenario_key']=='control_squirrel')for e,cfg in configs.items()}
 if any(squirrel[1][key]!=squirrel[2][key]for key in ['p_name','v_name']):review_notes.append('Squirrel actor/victim roles differ across the current approved experiments; runtime and decks agree.')
 escape={e:next(normal(slide['text'])for s in cfg['scenarios']if s['scenario_key']=='strict_liability_alligator'for slide in s['slides']if 'breaks out of' in slide['text'])for e,cfg in configs.items()}
 if escape[1]!=escape[2]:review_notes.append('Alligator escape wording differs across the approved experiments; preserved with separate recordings.')
 review_text='Transcript review items: '+' '.join(review_notes)if review_notes else 'No outstanding squirrel/alligator wording or role inconsistencies. Both experiments use Nora as actor and Eric as victim; the alligator escape wording is shared.'
 report={'summary':stats,'sources':manifest['sources'],'active_conditions':trace['conditions'],'uncovered_references':[],'unused_destinations':[],'obsolete_narration':[],'duplicate_text_recordings':[],'wording_review_items':review_notes,'notes':[review_text,'Display-only cookie explanation is recorded as three complete rule sentences, not a duplicate combined clip. First-construct explanation composites likewise use four sentence clips, with audio-clock demonstrations only on the first explanation.','The ten-line update supplies the shared child practice cue and revised cookie question. Zero-response explanation clips retain the user-approved ending “of their bar”.','Only PowerPoint layout whitespace is normalized. Child platform consent/debrief frames remain historical and are not newly recorded behavioral narration.']}
 (R/'docs/narration/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 (R/'docs/narration/runtime.json').write_text(json.dumps(maps,ensure_ascii=False,indent=2)+'\n')
 intro=f"Record these **{len(clips)} unique clips** in numerical order in one continuous WAV or M4A. Each numbered entry is one final clip. Read only the blockquote under **READ ALOUD**. Do not say clip numbers, filenames, keys, notes or destinations. Leave about **3 seconds of silence between clips**; keep pauses within a clip comfortably under 2 seconds. Read numerals naturally as numbers. Keep the original master unchanged."
 lines=['# Final pilot narration recording script','',intro,'',f"Approximately **{word_count} spoken words**, **{stats['spoken_minutes_at_140_wpm']}–{stats['spoken_minutes_at_110_wpm']} minutes of speech**, plus **{stats['between_clip_silence_minutes']} minutes between clips** (about {total_time} minutes total, excluding retakes).",'', 'Story text comes from the current approved PowerPoint captions. Only layout whitespace is normalized; words and punctuation are preserved. Identical text is recorded once, even if used on several slides. Both construct orders and both spatial layouts are covered. Experiment-2-only story recording filenames use the `exp2_` prefix; the installer copies each file to the existing runtime destination(s).','', review_text,'']
 html_sections=[]
 for c in clips:
  exps='Both experiments'if c['experiments']==[1,2]else'Experiment '+str(c['experiments'][0])
  context='; '.join(f"Experiment {u['experiment']}: {u['scenario_key'] or u['screen']}"+(f", slide {u['slide_number']}"if u['slide_number']is not None else'')for u in c['uses'])
  lines.extend([f"## Clip {c['recording_index']:03} — {c['filename']}",'','**READ ALOUD**','', '> '+c['text'],'','*Recording notes — do not read aloud*',f"- Clip key: `{c['clip_key']}`",f"- Used in: {exps}; screen/use: `{c['screen']}`; shared: {'yes'if c['shared']else'no'}.",f'- Contexts: {context}.','- Final destinations: '+', '.join('`'+d+'`'for d in c['destinations']), ''])
  notes=f"<p><b>Clip key:</b> <code>{html.escape(c['clip_key'])}</code><br><b>Experiments:</b> {exps}<br><b>Screen/use:</b> {html.escape(c['screen'])}<br><b>Shared:</b> {c['shared']}<br><b>Contexts:</b> {html.escape(context)}</p><p><b>Final destinations:</b></p><ul>"+''.join('<li><code>'+html.escape(d)+'</code></li>'for d in c['destinations'])+'</ul>'
  html_sections.append(f"<section id=\"clip-{c['recording_index']}\" data-clip-key=\"{c['clip_key']}\"><h2>Clip {c['recording_index']:03} — <span>{c['filename']}</span></h2><div class=\"label\">READ ALOUD</div><p class=\"spoken\">{html.escape(c['text'])}</p><details><summary>Recording notes — do not read aloud</summary>{notes}</details></section>")
 (R/'docs/narration/script.md').write_text('\n'.join(lines).rstrip()+'\n')
 css="body{font:18px/1.6 system-ui;max-width:1000px;margin:32px auto;padding:0 24px;color:#243240}h1{font-size:32px}h2{font-size:20px;font-weight:600}h2 span{font:15px ui-monospace,monospace;color:#5b6978}.spoken{font-size:28px;line-height:1.55;color:#111;border-left:4px solid #4C78A8;padding:14px 20px;background:#f6f8fa;margin:8px 0 18px}.label{font-size:12px;letter-spacing:.12em;color:#526477;font-weight:700}section{break-inside:avoid;border-top:1px solid #ced7df;padding:22px 0}details{font-size:13px;color:#5b6978}code{overflow-wrap:anywhere}header{margin-bottom:32px}@media print{body{font-size:15px;margin:0}.spoken{font-size:23px}details{display:none}}"
 (R/'docs/narration/script.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Final pilot narration recording script</title><style>'+css+'</style><header><h1>Final pilot narration recording script</h1><p>'+html.escape(intro.replace('**',''))+'</p><p>'+str(len(clips))+' clips · '+str(word_count)+' spoken words · '+str(stats['spoken_minutes_at_140_wpm'])+'–'+str(stats['spoken_minutes_at_110_wpm'])+' minutes of speech, or '+total_time+' minutes including the gaps.</p><p>'+html.escape(review_text)+' Technical notes are expandable below each spoken paragraph.</p></header>'+''.join(html_sections)+'</html>\n')
 template={'instructions':'Enter master-file seconds for each clip in order. Null timestamps are deliberately unusable until filled. Prefer editing segments.json from a successful automatic split when only one boundary needs correction.','segments':[{'recording_index':c['recording_index'],'start':None,'end':None}for c in clips]}
 (R/'code/tools/generated/narration-segments-template.json').write_text(json.dumps(template,indent=2)+'\n')
 (R/'code/tools/generated/narration-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(stats,indent=2))
if __name__=='__main__':generate()
