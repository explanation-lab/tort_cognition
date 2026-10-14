/* Re-export approved decks; source PPTX packages remain unchanged.
   Default: strict-liability decks. Use --experiment 2 --scenario KEY to scope an export. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
const {FileBlob,PresentationFile}=await import(process.env.TORT_ARTIFACT_MODULE || '@oai/artifact-tool');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {scenarios}=JSON.parse(await fs.readFile(path.join(root,'docs/scenarios.json'),'utf8'));
const {values}=parseArgs({options:{experiment:{type:'string'},scenario:{type:'string',multiple:true}}});
const selected=scenarios.filter(s=>(!values.experiment||s.experiment===Number(values.experiment))&&(values.scenario?values.scenario.includes(s.scenario_key):s.harm_type==='strict_liability'));
if(!selected.length)throw Error('No matching deck exports');
for(const s of selected){
 const source=await fs.readFile(path.join(root,s.deck));
 if(createHash('sha256').update(source).digest('hex')!==s.deck_sha256)throw Error('Source deck changed; synchronize the manifest first');
 const ppt=await PresentationFile.importPptx(await FileBlob.load(path.join(root,s.deck)));
 if(ppt.slides.items.length!==s.slides.length)throw Error('Manifest/deck slide count differs');
 const mapped=s.slides.map(slide=>slide.slide_number);
 const expected=ppt.slides.items.map((_,i)=>i+1);
 if(JSON.stringify(mapped)!==JSON.stringify(expected))throw Error('Source slide map/order differs');
 for(const slide of s.slides){
  const blob=await ppt.export({slide:ppt.slides.items[slide.slide_number-1],format:'png',scale:.75});
  const target=path.join(root,`code/experiments/experiment${s.experiment}/adults`,slide.image);
  await fs.writeFile(target,new Uint8Array(await blob.arrayBuffer()));
 }
 console.log(`Rendered Experiment ${s.experiment} ${s.scenario_key}: ${s.slides.length} slides at 960×540`);
}
