"""Build the adult consent configurations from the approved baseline and wording.

Original Experiment 1 images are copied into the new study without alteration.
Full case decks and added slide images are built by build-consent-slides.mjs.
"""
from copy import deepcopy
from pathlib import Path
import hashlib
import json
import re
import shutil
from html import escape

ROOT = Path(__file__).resolve().parents[2]
STUDY = ROOT / 'code/experiments/experiment2/consent'
ADULT = STUDY / 'adults'
BASE_ASSET_ROOT = ''
ADDITION_ASSET_ROOT = ''


def generate():
    # Keep this runtime independent of the already hosted adult pilot.
    shutil.copyfile(ROOT / 'code/shared/js/pilot-runtime.js', ADULT / 'consent-runtime.js')
    materials = json.loads((STUDY / 'materials.json').read_text())
    source = json.loads((ROOT / 'docs/scenarios.json').read_text())['scenarios']
    baseline = {s['scenario_key']: s for s in source if s['experiment'] == 1}
    texts = json.loads((ROOT / 'docs/narration/source.json').read_text())
    manifest_path = ADULT / 'assets-manifest.json'
    assets = json.loads(manifest_path.read_text())['images'] if manifest_path.exists() else {}
    names = {'images/michael.png', 'images/claire.png', 'images/pilot_cookie_jar_empty.png'}
    for scenario in baseline.values():
        names.update(slide['image'] for slide in scenario['slides'])
        names.update('images/' + scenario[key] for key in ['p_img', 'v_img'])
    for name in names:
        original = ROOT / 'code/experiments/experiment1/adults' / name
        copied = ADULT / name
        copied.parent.mkdir(parents=True, exist_ok=True)
        if not copied.exists() or copied.read_bytes() != original.read_bytes():
            shutil.copyfile(original, copied)
    conditions = {}
    for condition, response in materials['responses'].items():
        scenarios = []
        for item in materials['cases']:
            original = baseline[item['scenario_key']]
            scenario = {k: deepcopy(v) for k, v in original.items()
                        if k not in ['deck', 'deck_sha256', 'experiment', 'caption_format']}
            scenario.update(
                consent_condition=condition,
                consent_knowledge_text=item['knowledge_text'],
                consent_response_text=response,
                victim_statement=item['knowledge_text'] + ' ' + response,
                base_material_experiment=1,
                base_material_condition='victim_not_careless',
            )
            slides = []
            for old_slide in scenario['slides']:
                slide = deepcopy(old_slide)
                slide['base_slide_number'] = old_slide['slide_number']
                slide['slide_id'] = f"{item['scenario_key']}:base:{old_slide['slide_number']}"
                slide.pop('audio', None)
                # This is a silent adult study. Preserve the repeated visual,
                # without retaining a child-only narration index after insertion.
                slide.pop('narration_repeat_of', None)
                slides.append(slide)
                if old_slide['slide_number'] == item['insert_after_base_slide']:
                    for role, statement in [('knowledge', item['knowledge_text']), ('response', response)]:
                        image_condition = 'shared' if role == 'knowledge' else condition
                        image_path = f"images/{item['scenario_key']}_{image_condition}_{role}.png"
                        image_version = '?v=' + assets[image_path]['sha256'][:12] if image_path in assets else ''
                        slides.append({
                            'slide_id': f"{item['scenario_key']}:{role}",
                            'slide_role': role,
                            'speaker': original['v_name'],
                            'listener': original['p_name'],
                            'statement': statement,
                            'text': f"{original['v_name']} tells {original['p_name']}, “{statement}”",
                            'image': ADDITION_ASSET_ROOT + image_path + image_version,
                        })
            for index, slide in enumerate(slides, 1):
                slide['slide_number'] = index
            scenario['slides'] = slides
            # The on-screen allocation reminder keeps its original image. Its
            # machine-readable description also records the prior statement.
            scenario['base_event_text'] = original['event_text']
            scenario['event_text'] = (
                f"Before the loss, {original['v_name']} tells {original['p_name']}, “{scenario['victim_statement']}” "
                + original['event_text']
            )
            scenarios.append(scenario)
        conditions[condition] = {
            'experiment': 2, 'audience': 'adults',
            'assetRoot': BASE_ASSET_ROOT,
            'sessionNamespace': f"tort_adult_consent_v1_{condition}_",
            'studyVersion': materials['study_version'],
            'scenarios': scenarios, 'texts': texts, 'clips': {},
        }
    ADULT.mkdir(parents=True, exist_ok=True)
    (ADULT / 'configuration.js').write_text(
        '// Generated by code/tools/generate-adult-consent.py.\n'
        'globalThis.TORT_CONSENT_CONDITIONS = '
        + json.dumps(conditions, ensure_ascii=False, indent=2) + ';\n')
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())
        sections = []
        for item in materials['cases']:
            key = item['scenario_key']
            if 'consent-' + key not in manifest['decks']:
                continue
            scenario = baseline[key]
            def image(role, condition='shared'):
                name = f'images/{key}_{condition}_{role}.png'
                version = assets[name]['sha256'][:12]
                return (f'<a href="{name}?v={version}" target="_blank">'
                        f'<img width="960" height="540" loading="lazy" src="{name}?v={version}" '
                        f'alt="{escape(scenario["v_name"])}: {escape(item["knowledge_text"] if role == "knowledge" else materials["responses"][condition])}"></a>')
            before = scenario['slides'][item['insert_after_base_slide'] - 1]
            after = scenario['slides'][item['insert_after_base_slide']]
            sections.append(f'''<section id="{key}">
<h2>{escape(scenario['event_title'])}</h2>
<p><a href="pilot-preview.html?condition=consent&amp;case={key}&amp;autostart=1">Play consent case</a> · <a href="pilot-preview.html?condition=no_consent&amp;case={key}&amp;autostart=1">Play no-consent case</a></p>
<figure class="knowledge"><figcaption>Same knowledge statement in both conditions</figcaption>{image('knowledge')}</figure>
<div class="responses"><figure><figcaption>Consent</figcaption>{image('response','consent')}</figure><figure><figcaption>No consent</figcaption>{image('response','no_consent')}</figure></div>
<p>Complete editable case: <a href="slides/consent/{key}.pptx">Consent PowerPoint</a> · <a href="slides/no_consent/{key}.pptx">No-consent PowerPoint</a></p>
<details><summary>Original slides immediately before and after the new statements</summary><div class="responses"><figure><figcaption>Before</figcaption><img width="960" height="540" loading="lazy" src="{before['image']}" alt="{escape(before['text'])}"></figure><figure><figcaption>After</figcaption><img width="960" height="540" loading="lazy" src="{after['image']}" alt="{escape(after['text'])}"></figure></div></details>
</section>''')
        if sections:
            navigation = ' · '.join(f'<a href="#{item["scenario_key"]}">{escape(baseline[item["scenario_key"]]["v_name"])}</a>' for item in materials['cases'])
            (ADULT / 'materials-preview.html').write_text('''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Adult consent cases — slide review</title>
<style>body{font:18px/1.5 system-ui;color:#263342;max-width:1140px;margin:36px auto;padding:0 20px}h1{font-size:30px}h2{font-size:25px}a{color:#14578c}nav{line-height:2}section{margin:46px 0 70px;border-top:1px solid #d8e0e7;padding-top:16px}figure{margin:12px 0}figcaption{font-size:16px;margin:8px 0;font-weight:600}img{width:100%;height:auto;display:block;outline:1px solid #d8e0e7}.knowledge{max-width:960px;margin:16px auto}.responses{display:grid;grid-template-columns:1fr 1fr;gap:20px}summary{cursor:pointer}details{margin:20px 0}@media(max-width:700px){.responses{grid-template-columns:1fr}body{font-size:16px}}</style></head><body>
<h1>Adult consent cases: first slide draft</h1>
<p>The new statements use copied original scenes and the original white caption box at the bottom. Review their placement and how each conversation fits the story. Click a slide to enlarge it.</p>
<p><a href="pilot-preview.html?condition=consent">Full study preview</a></p>
<nav>''' + navigation + '</nav>' + '\n'.join(sections) + '</body></html>\n')
    for name in ['index.html', 'pilot-preview.html']:
        page = ADULT / name
        if not page.exists():
            continue
        page.write_text(page.read_text().replace('../../../../shared/js/pilot-runtime.js', 'consent-runtime.js'))
        def version(match):
            src = match[1].split('?', 1)[0]
            digest = hashlib.sha256((page.parent / src).read_bytes()).hexdigest()[:12]
            return f'<script src="{src}?v={digest}"></script>'
        page.write_text(re.sub(r'<script src="([^"]+\.js)(?:\?[^\"]*)?"></script>', version, page.read_text()))


if __name__ == '__main__':
    generate()
