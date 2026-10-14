"""Check current decks, images, references and installed narration without historical files."""
from pathlib import Path
import hashlib,json,posixpath,re,struct,zipfile
import xml.etree.ElementTree as E
from html.parser import HTMLParser
import av
import numpy as np

R=Path(__file__).resolve().parents[2]
N={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
scenarios=json.loads((R/'docs/scenarios.json').read_text())['scenarios']
manifest=json.loads((R/'docs/narration/manifest.json').read_text())
recordings=json.loads((R/'docs/narration/recordings.json').read_text())
expected={c['clip_key']:c for c in recordings['clips']}
assert len(expected)==len(manifest['clips'])==recordings['unique_clips']
slides=0;assets=set();conditions=[]
for s in scenarios:
    assert sha(R/s['deck'])==s['deck_sha256'],s['deck']
    assets.add(s['deck'])
    with zipfile.ZipFile(R/s['deck'])as z:
        rels={x.get('Id'):x.get('Target')for x in E.fromstring(z.read('ppt/_rels/presentation.xml.rels'))}
        targets=[rels[x.get('{'+N['r']+'}id')]for x in E.fromstring(z.read('ppt/presentation.xml')).findall('p:sldIdLst/p:sldId',N)]
        ordered=[t.lstrip('/')if t.startswith('/')else posixpath.normpath('ppt/'+t)for t in targets]
        assert ordered==[f"ppt/slides/slide{x['slide_number']}.xml"for x in s['slides']]
        for slide in s['slides']:
            root=E.fromstring(z.read(f"ppt/slides/slide{slide['slide_number']}.xml"))
            captions=[sp for sp in root.findall('.//p:sp',N)if sp.findall('.//a:t',N)]
            assert len(captions)==1
            sp=captions[0]
            caption='\n'.join(''.join(t.text or ''for t in p.findall('.//a:t',N))for p in sp.findall('p:txBody/a:p',N)).strip()
            assert caption==slide['text'],(s['scenario_key'],slide['slide_number'])
            assert sp.find('p:spPr/a:xfrm/a:off',N).attrib=={'x':'762000','y':'5753100'}
            assert sp.find('p:spPr/a:xfrm/a:ext',N).attrib=={'cx':'10668000','cy':'914400'}
            body=sp.find('p:txBody/a:bodyPr',N)
            assert body.get('anchor')=='ctr'and body.find('a:noAutofit',N)is not None
            for run in sp.findall('.//a:rPr',N):
                assert run.get('sz')=='3000'and run.get('b')=='1'
                assert run.find('a:latin',N).get('typeface')=='Arial'
            for audience in ['adults','children']:
                p=R/f"code/experiments/experiment{s['experiment']}/{audience}"/slide['image']
                assert struct.unpack('>II',p.read_bytes()[16:24])==(960,540)
                assets.add(str(p.relative_to(R)))
            a=R/f"code/experiments/experiment{s['experiment']}/adults"/slide['image']
            b=R/f"code/experiments/experiment{s['experiment']}/children"/slide['image']
            assert sha(a)==sha(b)
            slides+=1
    assert s['reminder_image']==s['slides'][-1]['image']
for e in [1,2]:
    for audience in ['adults','children']:
        base=R/f'code/experiments/experiment{e}/{audience}'
        name='experiment.js'if audience=='adults'else'chs-task.js'
        config=json.loads((base/'js'/name).read_text().split('const PILOT_CONFIG = ',1)[1].split(';\nconst pilot',1)[0])
        assert config['scenarios']==[{k:v for k,v in s.items()if k not in ['deck','deck_sha256','experiment']}for s in scenarios if s['experiment']==e]
        refs={'images/michael.png','images/claire.png','images/pilot_cookie_jar_empty.png'}
        refs.update('images/'+s[k]for s in config['scenarios']for k in ['p_img','v_img'])
        for rel in refs:
            assert(base/rel).is_file(),rel;assets.add(str((base/rel).relative_to(R)))
        if audience=='children':
            assert config['imageVersions']=={rel:sha(base/rel)[:12]for rel in sorted(refs)}
            assert sum((base/rel).stat().st_size for rel in refs)<3*1024*1024,'Destination identifiers are too large for slow connections'
            assert all(max(struct.unpack('>II',(base/rel).read_bytes()[16:24]))<=448 for rel in refs)
        assert config['texts']==json.loads((R/'docs/narration/source.json').read_text())
        assert config['demoTiming']==json.loads((R/'docs/narration/demo-timing.json').read_text())
        conditions.append(f'Experiment {e} {audience}')
audio=[]
for clip in manifest['clips']:
    reference=expected[clip['clip_key']]
    assert reference['text']==clip['text']
    first=R/clip['destinations'][0]
    assert sha(first)==reference['sha256'],clip['clip_key']
    with av.open(str(first))as container:
        stream=container.streams.audio[0]
        assert stream.codec_context.name=='aac'
        assert stream.codec_context.channels==1 and stream.codec_context.sample_rate==48000
        frames=list(container.decode(stream));assert frames
        peak=max(float(np.max(np.abs(frame.to_ndarray())))for frame in frames)
        assert peak<.99,'Clipping: '+clip['clip_key']
        duration=sum(f.samples for f in frames)/48000
    for dest in clip['destinations']:
        assert sha(R/dest)==reference['sha256'],dest;assets.add(dest)
    audio.append({'clip_key':clip['clip_key'],'destinations':len(clip['destinations']),'duration':round(duration,3),'sha256':reference['sha256']})
for key,cue in json.loads((R/'docs/narration/demo-timing.json').read_text()).items():
    assert 0<=cue['press']<=cue['motion_start']<cue['motion_end']<=cue['duration']
    assert expected[key]['sha256']==cue['audio_sha256']
class Links(HTMLParser):
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key in ['href','src']and value and not re.match(r'^(?:https?:|data:|#|mailto:)',value):
                target=(self.page.parent/value.split('?',1)[0].split('#',1)[0]).resolve()
                assert target.is_file(),f'{self.page}: broken {value}'
parser=Links()
for page in (R/'code/experiments').rglob('*.html'):
    parser.page=page;parser.feed(page.read_text())
preservation=R/'code/tools/generated/cleanup-preservation.json'
if preservation.exists():
    for copy in json.loads(preservation.read_text())['byte_identical_copies']:
        # Cleanup preservation concerns media bytes; maintained source code can
        # subsequently change through authorized implementation work.
        if Path(copy['new']).suffix.lower()not in ['.png','.jpg','.jpeg','.m4a','.pptx']:continue
        assert sha(R/copy['new'])==copy['sha256'],'Cleanup changed retained bytes: '+copy['new']
actual={str(p.relative_to(R))for p in (R/'code/experiments').rglob('*')if p.is_file()and p.suffix in ['.png','.jpg','.jpeg','.m4a','.pptx','.mp4','.mov']}
assert actual==assets,{'unreferenced':sorted(actual-assets),'missing':sorted(assets-actual)}
report={'status':'pass','studies':conditions,'decks':len(scenarios),'slides':slides,'caption_font_pt':30,'caption_frame_px':[1120,96],'unique_audio_clips':len(audio),'audio_destinations':sum(c['destinations']for c in audio),'required_media_files':len(assets),'unreferenced_media':[],'all_retained_media_bytes_unchanged':preservation.exists(),'audio':audio}
out=R/'code/tools/generated';out.mkdir(exist_ok=True)
(out/'asset-checks.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items()if k!='audio'},indent=2))
