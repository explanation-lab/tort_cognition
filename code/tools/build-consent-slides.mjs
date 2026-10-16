/* Copy the full victim-not-careless case decks and insert matched statements.
   Native source scenes, white bottom caption boxes, and original story order
   are retained. New browser images come from the final editable case decks.
   Use the bundled Artifact Tool, presentation skill, Node, and Python runtime. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const {PresentationFile,FileBlob}=await import(process.env.TORT_ARTIFACT_MODULE||'@oai/artifact-tool');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const study=path.join(root,'code/experiments/experiment2/consent');
const adult=path.join(study,'adults');
const build=path.join(root,'code/tools/generated/adult-consent-format');
const material=JSON.parse(await fs.readFile(path.join(study,'materials.json'),'utf8'));
const base=JSON.parse(await fs.readFile(path.join(root,'docs/scenarios.json'),'utf8')).scenarios.filter(s=>s.experiment===1);
const skill=process.env.TORT_PRESENTATIONS_SKILL,python=process.env.TORT_RUNTIME_PYTHON;
if(!skill||!python)throw Error('Set TORT_PRESENTATIONS_SKILL and TORT_RUNTIME_PYTHON to the bundled presentation skill and Python.');
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
for(const dir of [build,path.join(build,'validated'),path.join(build,'superseded-portrait-decks'),path.join(adult,'images'),path.join(adult,'slides')])await fs.mkdir(dir,{recursive:true});
const manifest={study_version:material.study_version,source_materials:'../materials.json',
 artwork_status:material.artwork_status,slide_size:{width:1280,height:720},decks:{},images:{}};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonicalId=slide=>slide.id.startsWith('sl/')?slide.id:'sl/'+slide.id;
for(const [condition,response] of Object.entries(material.responses)){
 await fs.mkdir(path.join(adult,'slides',condition),{recursive:true});
 for(const item of material.cases){
  const scenario=base.find(s=>s.scenario_key===item.scenario_key);
  const reference=path.join(root,scenario.deck),sourceBytes=await fs.readFile(reference);
  if(hash(sourceBytes)!==scenario.deck_sha256)throw Error('Baseline source changed: '+scenario.scenario_key);
  const deck=await PresentationFile.importPptx(await FileBlob.load(reference));
  const originals=deck.slides.items.slice();
  if(originals.length!==scenario.slides.length)throw Error('Baseline slide count differs');
  const sourceScene=originals[item.background_base_slide-1];
  const additions=[];
  for(const [role,statement] of [['knowledge',item.knowledge_text],['response',response]]){
   const slide=sourceScene.duplicate();
   const caption=slide.shapes.items.find(shape=>shape.name==='Study story caption');
   if(!caption)throw Error('Original bottom caption missing: '+item.scenario_key);
   const frame=caption.position;
   if(frame.left!==80||frame.top!==604||frame.width!==1120||frame.height!==96)throw Error('Unexpected original caption frame');
   const captionText=`${scenario.v_name} tells ${scenario.p_name}, “${statement}”`;
   caption.text=captionText;
   caption.text.style={typeface:'Arial',fontSize:role==='knowledge'?36:40,bold:true,color:'#111111',
    alignment:'center',verticalAlignment:'middle',autoFit:'none',wrap:'square',
    insets:{left:16,right:16,top:role==='knowledge'?0:8,bottom:role==='knowledge'?0:8}};
   slide.speakerNotes.text=`Source scene: ${scenario.deck}, slide ${item.background_base_slide}.\nWording: code/experiments/experiment2/consent/materials.json.\n${scenario.v_name} tells ${scenario.p_name}: ${statement}`;
   const filename=`${item.scenario_key}_${role==='knowledge'?'shared':condition}_${role}.png`;
   manifest.images['images/'+filename]={scenario_key:item.scenario_key,slide_role:role,statement,
    caption:captionText,speaker:scenario.v_name,listener:scenario.p_name,source_deck:scenario.deck,
    source_deck_sha256:scenario.deck_sha256,source_scene_slide:item.background_base_slide,
    caption_frame:{left:80,top:604,width:1120,height:96},font_family:'Arial',font_size_px:role==='knowledge'?36:40};
   additions.push({slide,slide_role:role,statement,image:'images/'+filename});
  }
  const ordered=[],mapping=[];
  for(const [index,slide] of originals.entries()){
   ordered.push(slide);
   mapping.push({slide_number:mapping.length+1,base_slide_number:index+1,
    image:scenario.slides[index].image,text:scenario.slides[index].text});
   if(index+1===item.insert_after_base_slide)for(const addition of additions){
    ordered.push(addition.slide);
    mapping.push({slide_number:mapping.length+1,scenario_key:item.scenario_key,
     slide_role:addition.slide_role,statement:addition.statement,image:addition.image});
   }
  }
  deck.slides.reorder(ordered.map(canonicalId));
  const stem=condition+'-'+item.scenario_key;
  const candidate=path.join(build,stem+'-candidate.pptx');
  await(await PresentationFile.exportPptx(deck)).save(candidate);
  const finalized=path.join(build,'validated',stem+'-'+Date.now()+'.pptx');
  await finalizePresentation({workspaceDir:root,candidatePath:candidate,finalPath:finalized,
   explicitTotalSlideCount:scenario.slides.length+2,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],
   pythonExecutable:python,
   integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),
   layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),
   layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],
   fontPolicy:{basis:'reference',families:['Arial'],referencePath:reference,referenceSha256:hash(sourceBytes)},
   verifyArtifactToolImport:true,receiptPath:path.join(build,path.basename(finalized)+'.validation.json')});
  const relativeDeck=`slides/${condition}/${item.scenario_key}.pptx`;
  await fs.copyFile(finalized,path.join(adult,relativeDeck));
  const finalDeck=await PresentationFile.importPptx(await FileBlob.load(path.join(adult,relativeDeck)));
  for(const [index,slide] of finalDeck.slides.items.entries()){
   const rendered=new Uint8Array(await(await finalDeck.export({slide,format:'png',scale:.75})).arrayBuffer());
   await fs.writeFile(path.join(build,stem+'-'+String(index+1).padStart(2,'0')+'.png'),rendered);
   if(!mapping[index].slide_role)continue;
   const target=path.join(adult,mapping[index].image);
   if(condition==='no_consent'&&mapping[index].slide_role==='knowledge'){
    if(hash(await fs.readFile(target))!==hash(rendered))throw Error('Knowledge slide differs by condition: '+item.scenario_key);
   }else await fs.writeFile(target,rendered);
   manifest.images[mapping[index].image].sha256=hash(rendered);
  }
  manifest.decks[stem]={path:relativeDeck,condition,scenario_key:item.scenario_key,
   source_deck:scenario.deck,source_deck_sha256:scenario.deck_sha256,
   sha256:hash(await fs.readFile(path.join(adult,relativeDeck))),slides:mapping};
  console.log(`Built ${condition}: ${item.scenario_key}, ${mapping.length} slides in the original story format.`);
 }
}
// Preserve the superseded portrait-only decks privately. The study folder
// contains only the corrected full case decks for review.
for(const condition of Object.keys(material.responses)){
 const old=path.join(adult,'slides',condition+'-additions.pptx');
 try{await fs.rename(old,path.join(build,'superseded-portrait-decks',condition+'-additions.pptx'));}
 catch(error){if(error.code!=='ENOENT')throw error;}
}
await fs.writeFile(path.join(adult,'assets-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
execFileSync(python,[path.join(root,'code/tools/generate-adult-consent.py')],{stdio:'inherit'});
