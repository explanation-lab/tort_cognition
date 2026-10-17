/* Adult consent integration, exact material matching, and complete response/export checks. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {pathToFileURL}=require('url');
const {JSDOM}=require(process.env.TORT_JSDOM_MODULE||require.resolve('jsdom',{paths:[__dirname]}));
const root=path.resolve(__dirname,'../..'),entry=root+'/code/experiments/experiment2/consent/adults';
async function run(condition,judgment,side){
 const dom=new JSDOM('<div id="jspsych-target"></div>',{url:'https://example.invalid/pilot/?study=synthetic&mode=sandbox'}),w=dom.window,doc=w.document;
 w.HTMLElement.prototype.getBoundingClientRect=function(){if(this.classList.contains('cookie-plate')){const left=[...doc.querySelectorAll('.cookie-plate')].indexOf(this)*230;return {left,top:200,width:180,height:180,right:left+180,bottom:380};}return{left:0,top:0,width:100,height:100,right:100,bottom:100};};
 w.HTMLElement.prototype.setPointerCapture=function(){};w.HTMLElement.prototype.releasePointerCapture=function(){};
 const rows=[],store={},timers=[],captured=[],properties={};let current,options,saveCompleted=false,releaseSave;
 const client={study:{conditions:['consent','no_consent'],experimentVersion:'adult-consent-1.0.0'},launch:{studyKey:'synthetic',mode:'sandbox',condition,participant:{prolificPid:'',studyId:'',sessionId:''}},submitAndRedirect:async(input,meta)=>{captured.push({rows:JSON.parse(JSON.stringify(input.values())),meta});await new Promise(r=>releaseSave=r);saveCompleted=true;}};
 const psych={data:{addProperties:p=>Object.assign(properties,p),get:()=>({values:()=>rows})},run:timeline=>{psych.ran=timeline;},finishTrial:row=>{rows.push({...current.data,...properties,...row});}};
 const context={document:doc,window:w,location:w.location,URLSearchParams,sessionStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},jsPsychModule:{ParameterType:{FUNCTION:'FUNCTION'}},jsPsychHtmlButtonResponse:function(){},initJsPsych:o=>{options=o;return psych;},performance:{now:()=>Date.now()},setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout(){},Image:w.Image,Math,console,Event:w.Event,dispatchEvent:()=>{},mockClient:()=>Promise.resolve(client)};
 vm.createContext(context);vm.runInContext(fs.readFileSync(entry+'/consent-runtime.js','utf8'),context);vm.runInContext(fs.readFileSync(root+'/code/shared/js/pilot-adult-forms.js','utf8'),context);vm.runInContext(fs.readFileSync(entry+'/configuration.js','utf8'),context);
 // The attempt reset happens before the task is built; retain the requested
 // internal assignments for this synthetic participant, as on a refresh.
 store.tort_adult_consent_attempt=JSON.stringify([client.launch.studyKey,client.launch.mode,client.launch.participant,condition]);
 const experiment=2,prefix=context.TORT_CONSENT_CONDITIONS[condition].sessionNamespace;
 store[prefix+'judgment_order']=JSON.stringify(judgment);store[prefix+'victim_side']=JSON.stringify(side);
 const source=fs.readFileSync(entry+'/study.js','utf8').replace("await import(CLIENT_PATH)","({default:mockClient})");
 vm.runInContext(source,context);await new Promise(setImmediate);
 assert.equal(context.TORT_ADULT_CONDITION,condition);assert.equal(context.pilot.scenarios.length,8);assert.equal(context.timeline.length,52);
 const tick=()=>{for(let i=0;i<2;i++){const batch=timers.splice(0);batch.forEach(f=>f());}};
 const pointer=(el,type,x,y)=>{const event=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0});Object.defineProperties(event,{pointerId:{value:1},pointerType:{value:'mouse'}});el.dispatchEvent(event);};
 const drag=to=>{const el=doc.querySelector('#p-cookie-0'),r=doc.querySelector('#'+to+'-plate').getBoundingClientRect();pointer(el,'pointerdown',20,20);pointer(el,'pointermove',r.left+90,r.top+90);pointer(el,'pointerup',r.left+90,r.top+90);};
 const bars=(p,v)=>{for(const role of ['p','v']){const el=doc.querySelector('#rating-'+role+'-track');pointer(el,'pointerdown',role==='p'?p:v,20);pointer(el,'pointerup',role==='p'?p:v,20);}};
 for(const trial of context.timeline){
  current=trial;const before=rows.length;
  if(trial.screen){trial.screen(doc.querySelector('#jspsych-target'),psych);tick();
   const label=trial._debugLabel;
   if(trial.data.phase==='story'){let guard=0;while(rows.length===before&&guard++<20)doc.querySelector('#story-next').click();}
   else if(label==='Welcome')doc.querySelector('#text-continue').click();
   else if(label==='Cookie explanation')doc.querySelector('#confirm-btn').click();
   else if(label==='Cookie jar'||label==='Cookie person'){drag(label==='Cookie jar'?'jar':'v');assert(!doc.querySelector('#confirm-btn').disabled);doc.querySelector('#confirm-btn').click();}
   else if(trial.data.phase==='cookies'){if(trial.data.presentation_position%2){doc.querySelector('#gate-yes').click();tick();drag('jar');doc.querySelector('#confirm-btn').click();}else doc.querySelector('#gate-no').click();}
   else{assert(!doc.querySelector('.bar-demo-pointer'),'Adults must have no cursor demo');if(label.includes(': practice'))bars(label.endsWith('large')?80:0,label.endsWith('large')?0:30);else if(!label.includes(': explanation'))bars(0,100);assert(!doc.querySelector('#rating-continue').disabled);doc.querySelector('#rating-continue').click();}
  }else{
   doc.querySelector('#jspsych-target').innerHTML=trial.stimulus;
   if(trial._debugLabel==='Consent Form'){assert(trial.stimulus.includes('$1.50'));assert(trial.stimulus.includes('5-minute'));assert(!/Qualtrics|15 minutes|\$2\.00/.test(trial.stimulus));trial.on_finish({});psych.finishTrial({response:0});}
   else if(trial._debugLabel==='Demographics'){trial.on_load();doc.querySelector('#demo-age').value='30';for(const [name,value]of[['gender','Female'],['race','Asian'],['ethnicity','Non-Hispanic']])doc.querySelector(`input[name="${name}"][value="${value}"]`).checked=true;doc.querySelector('#demo-state').value='New York';doc.querySelector('#demo-submit-btn').click();}
   else if(trial.data.phase==='consent_recall'){const response=(trial.data.presentation_position-1)%3;const data={...trial.data,response};trial.on_finish(data);psych.finishTrial(data);}
   else if(trial._debugLabel==='Feedback'){trial.on_load();doc.querySelector('#feedback-input').value='Synthetic QA';doc.querySelector('#feedback-submit-btn').click();}
   else psych.finishTrial({response:0});
  }
  assert.equal(rows.length,before+1,trial._debugLabel+' must finish once');
 }
 const saving=options.on_finish();await new Promise(setImmediate);assert.equal(captured.length,1);assert(!saveCompleted);assert(doc.body.textContent.includes('Saving your responses'));
 releaseSave();await saving;assert(saveCompleted);assert(doc.body.textContent.includes('Responses saved'));
 assert(rows.every(r=>r.condition===condition&&r.experiment===experiment&&r.material_experiment===1&&r.base_material_condition==='victim_not_careless'&&r.study_version==='adult-consent-1.0.0'&&r.judgment_order===judgment&&r.victim_side===side));
 const summary=rows.filter(r=>r.is_case_summary);assert.equal(summary.length,8);assert(summary.every(r=>r.fault_rating_p===0&&r.fault_rating_v===100&&r.carelessness_rating_p===0&&r.carelessness_rating_v===100));
 assert(summary.every(r=>r.cookies_kept_by_p+r.cookies_from_p_to_c+r.cookies_from_p_to_v===8));
 assert.equal(rows.filter(r=>r.trial_role==='demographic').length,1);
 const recalls=rows.filter(r=>r.phase==='consent_recall');assert.equal(recalls.length,8);
 for(const r of recalls){const expected=condition==='consent'?'yes':'no';assert.equal(r.expected_consent_recall_response,expected);assert.equal(r.consent_recall_correct,r.consent_recall_response===expected);}
 for(const r of summary){const scenario=context.TORT_CONSENT_CONDITIONS[condition].scenarios.find(s=>s.scenario_key===r.scenario_key);assert.equal(r.story_slide_rts.length,scenario.slides.length);assert.equal(r.victim_statement,scenario.victim_statement);assert.equal(r.consent_response_text,condition==='consent'?'I’m okay with that.':'I’m not okay with that.');assert.equal(r.story_slide_ids.length,scenario.slides.length);}
 assert.equal(store[prefix+'victim_side'],JSON.stringify(side));
 assert(!Object.keys(store).some(k=>k.startsWith('tort_pilot_v3_exp')));

 assert(Buffer.byteLength(JSON.stringify(captured[0]))<900000);
 dom.window.close();return{condition,judgment,side,rows:captured[0].rows};
}
async function checkStartup(){
 async function startup({query='?study=synthetic&mode=sandbox',review=false,studyConditions=['consent','no_consent'],version='adult-consent-1.0.0',condition='consent',store={}}={}){
  const dom=new JSDOM('<div id="jspsych-target"></div>',{url:'https://example.invalid/consent/'+query});const w=dom.window,removed=[];
  const client={study:{conditions:studyConditions,experimentVersion:version},launch:{studyKey:'synthetic',mode:'sandbox',condition,participant:{sessionId:'fixture'}}};
  const context={document:w.document,window:w,location:w.location,URLSearchParams,sessionStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>{removed.push(k);delete store[k];}},jsPsychModule:{ParameterType:{FUNCTION:'FUNCTION'}},jsPsychHtmlButtonResponse:function(){},initJsPsych:()=>({data:{addProperties(){}}}),performance:{now:()=>0},setTimeout,clearTimeout,Image:w.Image,Math,console:{error(){}},Event:w.Event,dispatchEvent:()=>{},TORT_LOCAL_OPTIONS:{review},mockClient:()=>Promise.resolve(client)};
  vm.createContext(context);
  for(const source of [entry+'/consent-runtime.js',root+'/code/shared/js/pilot-adult-forms.js',entry+'/configuration.js'])vm.runInContext(fs.readFileSync(source,'utf8'),context);
  vm.runInContext(fs.readFileSync(entry+'/study.js','utf8').replace('await import(CLIENT_PATH)','({default:mockClient})'),context);
  await new Promise(setImmediate);
  const result={context,removed,store,text:w.document.body.textContent};dom.window.close();return result;
 }
 for(const options of [
  {query:''},
  {review:true,query:'?condition=invalid'},
  {review:true,query:'?condition=consent&PROLIFIC_PID=synthetic'},
  {studyConditions:['victim_not_careless','victim_careless']},
  {version:'adult-between-1.0.0'},
  {condition:'invalid'},
 ]){const result=await startup(options);assert(!result.context.pilot,'Invalid launch started a task');assert(result.text.trim().length>0,'Missing launch error');}
 const store={tort_pilot_v3_exp1_adults_victim_side:'"left"'};
 const first=await startup({review:true,query:'?condition=no_consent',store});assert.equal(first.context.TORT_ADULT_CONDITION,'no_consent');assert.equal(first.removed.length,0);
 const newAttempt=await startup({store});assert.equal(newAttempt.removed.length,3);assert(newAttempt.removed.every(k=>k.startsWith('tort_adult_consent_v1_consent_')));
 store.tort_adult_consent_v1_consent_judgment_order='"carelessness_first"';store.tort_adult_consent_v1_consent_victim_side='"right"';
 const refresh=await startup({store});assert.equal(refresh.removed.length,0);assert.equal(refresh.context.pilot.assignments.judgment_order,'carelessness_first');assert.equal(refresh.context.pilot.assignments.victim_side,'right');assert.equal(store.tort_pilot_v3_exp1_adults_victim_side,'"left"');
}
function checkMaterials(){
 const {createHash}=require('crypto');const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(entry+'/configuration.js','utf8'),context);
 const material=JSON.parse(fs.readFileSync(path.dirname(entry)+'/materials.json','utf8'));
 const baseline=JSON.parse(fs.readFileSync(root+'/docs/scenarios.json','utf8')).scenarios.filter(s=>s.experiment===1);
 const manifest=JSON.parse(fs.readFileSync(entry+'/assets-manifest.json','utf8'));
 const edited=manifest.source_mode==='edited_case_decks';
 assert.equal(Object.keys(manifest.images).length,edited?baseline.reduce((n,s)=>n+2*(s.slides.length+2),0):24);
 for(const item of material.cases){
  const original=baseline.find(s=>s.scenario_key===item.scenario_key);
  const yes=context.TORT_CONSENT_CONDITIONS.consent.scenarios.find(s=>s.scenario_key===item.scenario_key);
  const no=context.TORT_CONSENT_CONDITIONS.no_consent.scenarios.find(s=>s.scenario_key===item.scenario_key);
  for(const [condition,scenario]of[['consent',yes],['no_consent',no]]){
   assert.equal(scenario.slides.length,original.slides.length+2);
   const old=scenario.slides.filter(s=>s.base_slide_number);
   if(edited){
    assert.deepEqual(old.map(s=>[s.base_slide_number,s.base_image]),original.slides.map(s=>[s.slide_number,s.image]));
    const saved=manifest.decks[condition+'-'+item.scenario_key].slides;
    assert.deepEqual(JSON.parse(JSON.stringify(scenario.slides.map(s=>[s.text,s.image.split('?')[0],s.slide_number]))),saved.map(s=>[s.text,s.image,s.slide_number]));
   }else assert.deepEqual(old.map(s=>[s.base_slide_number,s.text,s.image]),original.slides.map(s=>[s.slide_number,s.text,s.image]));
   const index=scenario.slides.findIndex(s=>s.slide_role==='knowledge');
   assert.equal(index,item.insert_after_base_slide);assert.equal(scenario.slides[index+1].slide_role,'response');
   assert.equal(scenario.slides[index].statement,item.knowledge_text);
   assert.equal(scenario.slides[index+1].statement,material.responses[condition]);
   assert.equal(scenario.slides[index].speaker,original.v_name);assert.equal(scenario.slides[index].listener,original.p_name);
   assert.equal(scenario.reminder_image,edited?scenario.slides.find(s=>s.base_image===original.reminder_image).image:original.reminder_image);
   for(const slide of scenario.slides){const p=path.resolve(entry,context.TORT_CONSENT_CONDITIONS[condition].assetRoot,slide.image.split('?')[0]);assert(fs.existsSync(p),'Missing image: '+p);}
  }
  for(let i=0;i<yes.slides.length;i++){const a=JSON.parse(JSON.stringify(yes.slides[i])),b=JSON.parse(JSON.stringify(no.slides[i]));if(a.slide_role==='response'){assert.equal(a.statement,b.statement.replace(' not',''));continue;}if(edited){delete a.image;delete b.image;}assert.deepEqual(a,b);}
  assert.equal(hash(fs.readFileSync(root+'/'+original.deck)),original.deck_sha256);
 }
 for(const [name,image]of Object.entries(manifest.images))assert.equal(hash(fs.readFileSync(entry+'/'+name)),image.sha256);
 assert.equal(Object.keys(manifest.decks).length,16);
 for(const deck of Object.values(manifest.decks)){const original=baseline.find(s=>s.scenario_key===deck.scenario_key);assert.equal(deck.slides.length,original.slides.length+2);assert.equal(hash(fs.readFileSync(entry+'/'+deck.path)),deck.sha256);for(const slide of deck.slides)if(slide.slide_role)assert.equal(manifest.images[slide.image].statement,slide.statement);}
 for(const image of Object.values(manifest.images)){if(edited){assert.equal(hash(fs.readFileSync(entry+'/'+image.source_deck)),image.source_deck_sha256);assert(image.source_slide>0);assert(image.caption.length>0);}else{assert.deepEqual(image.caption_frame,{left:80,top:604,width:1120,height:96});assert.equal(image.font_family,'Arial');const item=material.cases.find(item=>item.scenario_key===image.scenario_key);assert.equal(image.source_scene_slide,item.background_base_slide);}}
 for(const scenario of baseline)for(const slide of scenario.slides)assert.equal(hash(fs.readFileSync(entry+'/'+slide.image)),hash(fs.readFileSync(root+'/code/experiments/experiment1/adults/'+slide.image)));
 assert(!fs.readFileSync(entry+'/index.html','utf8').includes('review.js'));
}
(async()=>{checkMaterials();await checkStartup();const results=[];for(const condition of ['consent','no_consent'])for(const judgment of ['fault_first','carelessness_first'])for(const side of ['left','right'])results.push(await run(condition,judgment,side));
 const {verifyObservedCondition}=await import(pathToFileURL(root+'/code/experiments/experiment1/adults/between-subjects/explanation-lab-client.js'));
 for(const r of results)assert.equal(verifyObservedCondition(r.rows,{assignmentType:'between_participant',integrationMode:'converted',conditions:['consent','no_consent']},r.condition).status,'matched');
 const out=root+'/code/tools/generated';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/adult-consent-synthetic.json',JSON.stringify(results));console.log(JSON.stringify({syntheticSessions:results.length,conditions:2,allPassed:true,completeSaveAwaited:true,rowsPerSession:results.map(r=>r.rows.length)}));
})().catch(e=>{console.error(e);process.exitCode=1});
