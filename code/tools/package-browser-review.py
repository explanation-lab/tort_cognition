"""Build four click-to-open collaborator review pages with included local media.

Packaging adapters affect these copies only, never the active study sources.
"""
from pathlib import Path
import hashlib
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'code/tools/generated/browser-review'
ZIP = OUT.parent / 'tort_cognition_review.zip'


def inline_js(source):
    return '<script>' + source.replace('</script', '<\\/script') + '</script>'


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((ROOT / 'docs/narration/manifest.json').read_text())
    pending = {d for clip in manifest['clips'] for d in clip['destinations'] if not (ROOT/d).is_file()}
    if pending: raise ValueError('Install missing final narration before packaging: '+str(sorted(pending)))
    sources = {}
    pages = []
    packaged_assets = set()
    reports = []
    for experiment in [1, 2]:
        for audience in ['adults', 'children']:
            child = audience == 'children'
            origin = ROOT / f'code/experiments/experiment{experiment}/{audience}'
            config_name = 'chs-task.js' if child else 'experiment.js'
            source = (origin / 'js' / config_name).read_text()
            config = json.loads(source.split('const PILOT_CONFIG = ', 1)[1].split(';\nconst pilot', 1)[0])
            assets = {'images/michael.png', 'images/claire.png', 'images/pilot_cookie_jar_empty.png'}
            for scenario in config['scenarios']:
                assets.update(['images/' + scenario['p_img'], 'images/' + scenario['v_img'], scenario['reminder_image']])
                assets.update(slide['image'] for slide in scenario['slides'])
            if child:
                prefix = f'code/experiments/experiment{experiment}/children/'
                assets.update(destination[len(prefix):] for clip in manifest['clips']
                              for destination in clip['destinations'] if destination.startswith(prefix))
            for relative in sorted(assets):
                file = origin / relative
                if not file.is_file():
                    assert str(file.relative_to(ROOT)) in pending, 'Unexpected missing asset: ' + str(file)
                    continue
                data = file.read_bytes()  # Materializes historical symlink targets.
                sources[str(file.relative_to(ROOT))] = hashlib.sha256(data).hexdigest()
                destination = OUT / f'exp{experiment}/assets' / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                if destination in packaged_assets:
                    assert destination.read_bytes() == data, f'Conflicting adult/child asset {relative}'
                else:
                    destination.write_bytes(data)
                    packaged_assets.add(destination)

            html = (origin / 'pilot-preview.html').read_text()
            html = re.sub(r'<link rel="stylesheet" href="([^\"]+)">',
                          lambda m: '<style>' + (origin / m[1]).read_text() + '</style>', html)
            bootstrap = '''
const TORT_PACKAGE_STORAGE = (() => {
  try { const storage = window.sessionStorage; storage.setItem('tort_package_probe','1'); storage.removeItem('tort_package_probe'); return storage; } catch (_) {}
  const prefix = 'tort-browser-review:';
  let values = {};
  try { if (window.name.startsWith(prefix)) values = JSON.parse(window.name.slice(prefix.length)); } catch (_) {}
  const save = () => { window.name = prefix + JSON.stringify(values); };
  return {getItem:key=>values[key]??null,setItem(key,value){values[key]=String(value);save();},removeItem(key){delete values[key];save();}};
})();
'''
            html = html.replace('</head>', inline_js(bootstrap) + '</head>')

            def script(match):
                path = origin / match[1].split('?', 1)[0]
                code = path.read_text()
                sources[str(path.resolve().relative_to(ROOT))] = hashlib.sha256(path.read_bytes()).hexdigest()
                if path.name == 'pilot-runtime.js':
                    code = code.replace('sessionStorage.', 'TORT_PACKAGE_STORAGE.')
                if path.name == 'pilot-review.js':
                    code = code.replace('<div id="panel-content" hidden>', '<div id="panel-content">')
                return inline_js(code)

            html = re.sub(r'<script src="([^\"]+)"></script>', script, html)
            html = html.replace('{review:true,mute:', "{review:true,assetRoot:'../assets/',mute:")
            if child:
                html = html.replace("get('mute')!=='0'", "get('mute')==='1'")
            html = html.replace('No participant submission, CHS consent, camera or platform storage is performed.',
                'This file opens directly in your browser; no installation or server is needed. Review responses are not submitted.')
            if child:
                html = html.replace('Use Panel On/Off to jump to task screens.',
                    'Narration is on by default. To skip ahead, choose a screen in the panel and click Jump. The selected screen opens directly. Panel On/Off expands or collapses the controls.')
            else:
                html = html.replace('Use Panel On/Off to jump to task screens.',
                    'To skip ahead, choose a screen in the panel and click Jump. Panel On/Off expands or collapses the controls.')
            # Scripts/fonts are inline, and native image/audio loading uses the
            # included local files without fetch/XHR or a web server.
            assert not re.search(r'<(?:script|link)[^>]+(?:src|href)=', html)
            page = OUT / f'exp{experiment}/{audience}/index.html'
            page.parent.mkdir(parents=True, exist_ok=True)
            page.write_text(html)
            pages.append(page)
            reports.append({'study': f'exp{experiment}/{audience}', 'assets': len(assets),
                            'pending_narration_clips': 0,
                            'narration_default': child, 'panel_expanded': True,
                            'html_bytes': page.stat().st_size})
    scenarios = json.loads((ROOT/'docs/scenarios.json').read_text())['scenarios']
    for scenario in scenarios:
        deck = ROOT/scenario['deck']
        destination = OUT/f"exp{scenario['experiment']}/powerpoints/{deck.name}"
        destination.parent.mkdir(parents=True,exist_ok=True)
        destination.write_bytes(deck.read_bytes())
        packaged_assets.add(destination)
    with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for page in [*pages, *sorted(packaged_assets)]:
            archive.write(page, str(page.relative_to(OUT)))
    with zipfile.ZipFile(ZIP) as archive:
        assert len([name for name in archive.namelist() if name.endswith('/index.html')]) == 4
        assert all(name.startswith(('exp1/', 'exp2/')) for name in archive.namelist())
        assert archive.testzip() is None
    # Verify the original repository assets/scripts stayed byte-identical.
    assert all(hashlib.sha256((ROOT / path).read_bytes()).hexdigest() == digest for path, digest in sources.items())
    report = {'zip': str(ZIP), 'zip_bytes': ZIP.stat().st_size, 'studies': reports,
              'source_files_unchanged': True, 'sources': sources, 'deployment_performed': False}
    (OUT / 'package-validation.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({key:value for key,value in report.items() if key!='sources'}, indent=2))


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--zip-name', default=ZIP.name)
    name = parser.parse_args().zip_name
    if Path(name).name != name or not name.endswith('.zip'):
        raise ValueError('Use a ZIP filename without directory components.')
    ZIP = OUT.parent / name
    build()
