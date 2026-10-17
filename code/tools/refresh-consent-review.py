"""Refresh browser assets from the saved case PowerPoints, without rewriting them.

Set TORT_PRESENTATIONS_SKILL, TORT_RUNTIME_NODE and RUNTIME_NODE_MODULES
to the bundled presentation runtime. Unchanged deck renders are reused.
"""
from pathlib import Path
import hashlib
import json
import os
import posixpath
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
STUDY = ROOT / 'code/experiments/experiment2/consent'
ADULT = STUDY / 'adults'
RENDERS = ROOT / 'code/tools/generated/consent-edited-review'
NS = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
      'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_slides(path):
    """Read PowerPoint's current slide order and native caption text."""
    with ZipFile(path) as archive:
        relations = {r.attrib['Id']: r.attrib['Target'] for r in
                     ET.fromstring(archive.read('ppt/_rels/presentation.xml.rels'))}
        presentation = ET.fromstring(archive.read('ppt/presentation.xml'))
        size = presentation.find('p:sldSz', NS)
        scale = int(size.attrib['cx']) / 1280
        slides = []
        for slide_id in presentation.find('p:sldIdLst', NS):
            target = relations[slide_id.attrib['{' + NS['r'] + '}id']]
            member = target.lstrip('/') if target.startswith('/') else posixpath.normpath('ppt/' + target)
            slide = ET.fromstring(archive.read(member))
            captions = []
            for shape in slide.findall('.//p:sp', NS):
                prop = shape.find('p:nvSpPr/p:cNvPr', NS)
                if prop is None or prop.attrib.get('name') != 'Study story caption':
                    continue
                text = ' '.join(''.join(t.text or '' for t in p.findall('.//a:t', NS))
                                for p in shape.findall('p:txBody/a:p', NS)).strip()
                transform = shape.find('p:spPr/a:xfrm', NS)
                frame = None
                if transform is not None:
                    offset, extent = transform.find('a:off', NS), transform.find('a:ext', NS)
                    frame = dict(zip(['left', 'top', 'width', 'height'],
                                     [round(int(v) / scale, 4) for v in
                                      [offset.attrib['x'], offset.attrib['y'],
                                       extent.attrib['cx'], extent.attrib['cy']]]))
                captions.append((text, frame))
            if len(captions) != 1:
                raise ValueError(f'Expected one story caption in {path}: {member}')
            slides.append({'text': captions[0][0], 'caption_frame': captions[0][1],
                           'source_xml': member})
        return slides


def refresh():
    materials = json.loads((STUDY / 'materials.json').read_text())
    baseline = {s['scenario_key']: s for s in
                json.loads((ROOT / 'docs/scenarios.json').read_text())['scenarios']
                if s['experiment'] == 1}
    manifest = {
        'study_version': materials['study_version'], 'source_mode': 'edited_case_decks',
        'artwork_status': 'user_edited_case_decks_for_review',
        'slide_size': {'width': 1280, 'height': 720}, 'decks': {}, 'images': {},
        'support_images': sorted({'images/michael.png', 'images/claire.png',
                                  'images/pilot_cookie_jar_empty.png'} |
                                 {'images/' + s[k] for s in baseline.values()
                                  for k in ['p_img', 'v_img']}),
    }
    pending_images = []
    for item in materials['cases']:
        key = item['scenario_key']
        original = baseline[key]
        pair = {}
        for condition, response in materials['responses'].items():
            relative = f'slides/{condition}/{key}.pptx'
            path = ADULT / relative
            deck_hash = digest(path)
            rendered = RENDERS / condition / key
            receipt = rendered / 'source.sha256'
            if not receipt.exists() or receipt.read_text().strip() != deck_hash:
                skill, node = os.environ.get('TORT_PRESENTATIONS_SKILL'), os.environ.get('TORT_RUNTIME_NODE')
                if not skill or not node:
                    raise ValueError('Set TORT_PRESENTATIONS_SKILL and TORT_RUNTIME_NODE to render the edited decks.')
                rendered.mkdir(parents=True, exist_ok=True)
                result = subprocess.run([
                    node, str(Path(skill) / 'container_tools/render_presentation.mjs'),
                    '--input', str(path), '--output_dir', str(rendered), '--scale', '.75',
                ], capture_output=True, text=True)
                (rendered / 'render.log').write_text(result.stdout + result.stderr)
                if result.returncode:
                    raise ValueError(f'Rendering failed for {relative}; see {rendered / "render.log"}')
                assert digest(path) == deck_hash, f'Deck changed during rendering: {relative}'
                receipt.write_text(deck_hash + '\n')
            current = read_slides(path)
            assert len(current) == len(original['slides']) + 2, (key, 'slide count changed')
            mapping = []
            base_index = 0
            knowledge_index = response_index = None
            statement = None
            for index, slide in enumerate(current, 1):
                quoted = re.fullmatch(re.escape(original['v_name'] + ' tells ' + original['p_name'] + ', ')
                                      + '[“"](.+)[”"]', slide['text'])
                quote = quoted.group(1) if quoted else None
                role = 'response' if quote == response else 'knowledge' if quote and quote.startswith('I know ') else None
                mapped = {'slide_number': index, 'text': slide['text'],
                          'image': f'images/review/{condition}/{key}_{index:02}.png'}
                if role:
                    assert role not in [s.get('slide_role') for s in mapping], (key, role)
                    mapped.update(slide_role=role, statement=quote,
                                  speaker=original['v_name'], listener=original['p_name'])
                    if role == 'knowledge':
                        knowledge_index, statement = index - 1, quote
                    else:
                        response_index = index - 1
                else:
                    base_index += 1
                    mapped.update(base_slide_number=base_index,
                                  base_image=original['slides'][base_index - 1]['image'])
                image = RENDERS / condition / key / f'slide-{index}.png'
                if not image.is_file():
                    raise ValueError(f'Render missing: {image}')
                pending_images.append((image, ADULT / mapped['image']))
                manifest['images'][mapped['image']] = {
                    'scenario_key': key, 'condition': condition, 'slide_role': role or 'story',
                    'statement': quote if role else None, 'caption': slide['text'],
                    'caption_frame': slide['caption_frame'], 'source_deck': relative,
                    'source_deck_sha256': deck_hash, 'source_slide': index,
                    'source_xml': slide['source_xml'], 'sha256': digest(image),
                }
                mapping.append(mapped)
            assert base_index == len(original['slides']), key
            assert knowledge_index is not None and response_index == knowledge_index + 1, key
            pair[condition] = (statement, knowledge_index)
            manifest['decks'][condition + '-' + key] = {
                'path': relative, 'condition': condition, 'scenario_key': key,
                'source_deck': original['deck'], 'source_deck_sha256': original['deck_sha256'],
                'sha256': deck_hash, 'slides': mapping,
            }
        assert pair['consent'] == pair['no_consent'], (key, 'knowledge/order differs by condition')
        item['knowledge_text'], item['insert_after_base_slide'] = pair['consent']
    manifest['materials_revision'] = hashlib.sha256(
        ''.join(d['sha256'] for d in manifest['decks'].values()).encode()).hexdigest()[:12]
    for source, target in pending_images:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    materials['artwork_status'] = manifest['artwork_status']
    (STUDY / 'materials.json').write_text(json.dumps(materials, ensure_ascii=False, indent=2) + '\n')
    (ADULT / 'assets-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    subprocess.run([sys.executable, str(ROOT / 'code/tools/generate-adult-consent.py')], check=True)
    print(json.dumps({'decks': len(manifest['decks']), 'slides': len(manifest['images']),
                      'materials_revision': manifest['materials_revision']}))


if __name__ == '__main__':
    refresh()
