/* Two-case condition isolation, task parity, complete responses, and save checks. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),{pathToFileURL}=require('url');
const {JSDOM}=require(process.env.TORT_JSDOM_MODULE||require.resolve('jsdom',{paths:[__dirname]}));
const root=path.resolve(__dirname,'../..'),entry=root+'/code/experiments/experiment3/adults-pilot2';
const conditions=['necessity','no_necessity'],version='adult-necessity-2.0.0';
async function setup({condition='necessity',judgment='fault_first',side='left',order=[1,2],review=false,query,studyConditions=conditions,studyVersion=version}={}){
 const dom=new JSDOM('<div id="jspsych-target"></div>',{url:'https://example.invalid/necessity/'+(query||'?study=synthetic&mode=sandbox')}),w=dom.window,doc=w.document;
 w.HTMLElement.prototype.getBoundingClientRect=function(){if(this.classList.contains('cookie-plate')){const left=[...doc.querySelectorAll('.cookie-plate')].indexOf(this)*230;return{left,top:200,width:180,height:180,right:left+180,bottom:380};}return{left:0,top:0,width:100,height:100,right:100,bottom:100};};
 w.HTMLElement.prototype.setPointerCapture=function(){};w.HTMLElement.prototype.releasePointerCapture=function(){};
 const rows=[],store={},timers=[],captured=[],properties={};let current,options,imports=0,releaseSave,saveCompleted=false;
 const client={study:{conditions:studyConditions,experimentVersion:studyVersion},launch:{studyKey:'synthetic',mode:'sandbox',condition,participant:{sessionId:'fixture'}},submitAndRedirect:async(input,meta)=>{captured.push({rows:JSON.parse(JSON.stringify(input.values())),meta});await new Promise(resolve=>releaseSave=resolve);saveCompleted=true;}};
 const psych={data:{addProperties:p=>Object.assign(properties,p),get:()=>({values:()=>rows})},run:timeline=>psych.ran=timeline,finishTrial:row=>rows.push({...current.data,...properties,...row})};
 const context={document:doc,window:w,location:w.location,URLSearchParams,sessionStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},jsPsychModule:{ParameterType:{FUNCTION:'FUNCTION'}},jsPsychHtmlButtonResponse:function(){},initJsPsych:o=>{options=o;return psych;},performance:{now:()=>Date.now()},setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout(){},Image:w.Image,Math,console:{...console,error(){}},Event:w.Event,dispatchEvent:()=>{},TORT_LOCAL_OPTIONS:{review},mockClient:()=>{imports++;return Promise.resolve(client);}};
 vm.createContext(context);
 for(const file of [entry+'/js/necessity-runtime.js',root+'/code/shared/js/pilot-adult-forms.js',entry+'/js/configuration.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
 const prefix=context.TORT_NECESSITY_CONDITIONS[condition].sessionNamespace+(review?'review_':'participant_');
 store.tort_adult_necessity_attempt=JSON.stringify([client.launch.studyKey,client.launch.mode,client.launch.participant,condition,version]);
 store[prefix+'judgment_order']=JSON.stringify(judgment);store[prefix+'victim_side']=JSON.stringify(side);store[prefix+'scenario_order']=JSON.stringify(order);
 vm.runInContext(fs.readFileSync(entry+'/js/study.js','utf8').replace('await import(CLIENT_PATH)','({default:mockClient})'),context);await new Promise(setImmediate);
 return{dom,w,doc,context,rows,store,timers,captured,properties,psych,prefix,client,get options(){return options;},get imports(){return imports;},get saveCompleted(){return saveCompleted;},releaseSave:()=>releaseSave(),setCurrent:t=>current=t};
}
async function run(condition,judgment,side,order,review=false){
 const f=await setup({condition,judgment,side,order,review,query:review?'?condition='+condition:undefined}),{context,doc,w,rows,timers,psych}=f;
 assert.equal(context.TORT_ADULT_CONDITION,condition);assert.equal(context.pilot.scenarios.length,2);assert.equal(context.timeline.length,20);assert.deepEqual(Array.from(context.pilot.scenarios,s=>s.scenario_id),order);assert.equal(f.imports,review?0:1);
 assert.deepEqual(JSON.parse(f.store[f.prefix+'scenario_order']),order,'Two-case assignments must survive reload');
 const tick=()=>{for(let i=0;i<2;i++)timers.splice(0).forEach(fn=>fn());};
 const pointer=(el,type,x,y)=>{const event=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0});Object.defineProperties(event,{pointerId:{value:1},pointerType:{value:'mouse'}});el.dispatchEvent(event);};
 const drag=(index,to)=>{const el=doc.querySelector('#p-cookie-'+index),r=doc.querySelector('#'+to+'-plate').getBoundingClientRect();pointer(el,'pointerdown',20,20);pointer(el,'pointermove',r.left+90,r.top+90);pointer(el,'pointerup',r.left+90,r.top+90);};
 const bars=(p,v)=>{for(const who of ['p','v']){const el=doc.querySelector('#rating-'+who+'-track');pointer(el,'pointerdown',who==='p'?p:v,20);pointer(el,'pointerup',who==='p'?p:v,20);}};
 for(const trial of context.timeline){
  f.setCurrent(trial);const before=rows.length;
  if(trial.screen){trial.screen(doc.querySelector('#jspsych-target'),psych);tick();const label=trial._debugLabel;
   if(trial.data.phase==='story'){let clicks=0;while(rows.length===before&&clicks++<15)doc.querySelector('#story-next').click();assert.equal(clicks,11);}
   else if(label==='Welcome')doc.querySelector('#text-continue').click();
   else if(label==='Cookie explanation')doc.querySelector('#confirm-btn').click();
   else if(label==='Cookie jar'||label==='Cookie person'){drag(0,label==='Cookie jar'?'jar':'v');assert(!doc.querySelector('#confirm-btn').disabled);doc.querySelector('#confirm-btn').click();}
   else if(trial.data.phase==='cookies'){
    if(trial.data.presentation_position===1){doc.querySelector('#gate-yes').click();tick();drag(0,'v');drag(1,'jar');assert(!doc.querySelector('#confirm-btn').disabled);doc.querySelector('#confirm-btn').click();}
    else doc.querySelector('#gate-no').click();
   }else{assert(!doc.querySelector('.bar-demo-pointer'));if(label.includes(': practice'))bars(label.endsWith('large')?80:0,label.endsWith('large')?0:30);else if(!label.includes(': explanation'))bars(0,100);assert(!doc.querySelector('#rating-continue').disabled);doc.querySelector('#rating-continue').click();}
  }else{
   doc.querySelector('#jspsych-target').innerHTML=trial.stimulus;
   if(trial._debugLabel==='Consent Form'){assert(trial.stimulus.includes('$1.50'));assert(!/Qualtrics|15 minutes|\$2\.00/.test(trial.stimulus));trial.on_finish({});psych.finishTrial({response:0});}
   else if(trial._debugLabel==='Demographics'){trial.on_load();doc.querySelector('#demo-age').value='30';for(const [name,value]of[['gender','Female'],['race','Asian'],['ethnicity','Non-Hispanic']])doc.querySelector(`input[name="${name}"][value="${value}"]`).checked=true;doc.querySelector('#demo-state').value='New York';doc.querySelector('#demo-submit-btn').click();}
   else if(trial._debugLabel==='Feedback'){trial.on_load();doc.querySelector('#feedback-input').value='Synthetic QA';doc.querySelector('#feedback-submit-btn').click();}
   else psych.finishTrial({response:0});
  }
  assert.equal(rows.length,before+1,trial._debugLabel+' must finish once');
 }
 if(review){await f.options.on_finish();assert.equal(f.captured.length,0);assert(doc.body.textContent.includes('No responses were submitted'));}
 else{const saving=f.options.on_finish();await new Promise(setImmediate);assert.equal(f.captured.length,1);assert(!f.saveCompleted);assert(doc.body.textContent.includes('Saving your responses'));f.releaseSave();await saving;assert(f.saveCompleted);assert(doc.body.textContent.includes('Responses saved'));assert.equal(f.captured[0].meta.metadata.experiment,3);}
 assert(rows.every(r=>r.condition===condition&&r.necessity_condition===condition&&r.experiment===3&&r.material_experiment===3&&r.judgment_order===judgment&&r.victim_side===side&&r.review_mode===review&&r.valid_participant_data===!review));
 const summary=rows.filter(r=>r.is_case_summary);assert.equal(summary.length,2);assert.deepEqual(new Set(summary.map(r=>r.scenario_key)),new Set(['hallway','stairs']));assert(summary.every(r=>r.fault_rating_p===0&&r.fault_rating_v===100&&r.carelessness_rating_p===0&&r.carelessness_rating_v===100));
 assert(summary.every(r=>r.cookies_kept_by_p+r.cookies_from_p_to_c+r.cookies_from_p_to_v===8));assert.equal(summary[0].cookies_from_p_to_v,1);assert.equal(summary[0].cookies_from_p_to_c,1);assert.equal(summary[1].cookies_kept_by_p,8);assert(summary[1].do_nothing);assert(summary.every(r=>r.story_slide_rts.length===11&&r.story_slide_ids.length===11&&r.source_deck_sha256.length===64));
 assert.equal(rows.filter(r=>r.trial_role==='demographic').length,1);assert(!rows.some(r=>r.trial_role==='manipulation_check'));assert(!Object.keys(f.store).some(k=>k.startsWith('tort_pilot_v3_exp')));
 f.dom.window.close();return{condition,judgment,side,order,rows};
}
function checkMaterials(){
 const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(entry+'/js/configuration.js','utf8'),context);const cfg=context.TORT_NECESSITY_CONDITIONS,manifest=JSON.parse(fs.readFileSync(entry+'/assets/pilot-manifest.json','utf8'));assert.deepEqual(Object.keys(cfg),conditions);
 const hash=p=>require('crypto').createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 assert.equal(Object.keys(manifest.decks).length,4);assert.equal(Object.keys(manifest.images).length,44);
 for(const condition of conditions){assert.equal(cfg[condition].studyVersion,version);assert.equal(cfg[condition].scenarios.length,2);for(const s of cfg[condition].scenarios){assert.equal(s.necessity_condition,condition);assert.equal(s.slides.length,11);assert.equal(hash(entry+'/assets/'+s.source_deck),s.source_deck_sha256);assert.equal(s.reminder_image,s.slides[10].image);assert.equal(s.p_after,8);assert.equal(s.v_after_harm,0);assert(!/angry|deliberately knocks off/.test(s.event_text));assert(s.slides[5].text.includes(condition==='necessity'?'only one direction':'five different directions'));assert(s.slides[6].text.startsWith('Suddenly,'));assert(s.slides[7].text.includes(condition==='necessity'?'nowhere to run except':'four other ways'));for(const slide of s.slides)assert.equal(hash(entry+'/assets/'+slide.image.split('?')[0]),manifest.images[slide.image.split('?')[0]].sha256);}}
 const baseline=fs.readFileSync(root+'/code/experiments/experiment3/adults/js/necessity-runtime.js','utf8');assert.equal(fs.readFileSync(entry+'/js/necessity-runtime.js','utf8'),baseline);
 for(const [name,s]of Object.entries(manifest.support_images))assert.equal(hash(entry+'/assets/'+name),hash(root+'/code/experiments/experiment3/adults/assets/'+name));assert(!fs.readFileSync(entry+'/index.html','utf8').includes('review.js'));
}
async function checkStartup(){
 let f=await setup({condition:'necessity',query:'?study=synthetic&condition=no_necessity'});assert.equal(f.context.TORT_ADULT_CONDITION,'necessity');await assert.rejects(f.options.on_finish(),/Consent is required/);f.context.timeline[0].on_finish({});await assert.rejects(f.options.on_finish(),/Both assigned cases/);f.dom.window.close();
 f=await setup({query:'?study=synthetic',studyVersion:'adult-consent-1.0.0'});assert(!f.context.timeline);assert(f.doc.body.textContent.includes('different study'));f.dom.window.close();
 f=await setup({query:'?study=synthetic',studyVersion:'adult-necessity-1.0.0'});assert(!f.context.timeline);assert(f.doc.body.textContent.includes('different study'));f.dom.window.close();
 f=await setup({review:true,query:'?condition=necessity&PROLIFIC_PID=synthetic'});assert(!f.context.timeline);assert.equal(f.imports,0);f.dom.window.close();
 f=await setup({review:true,query:'?condition=unknown'});assert(!f.context.timeline);assert(f.doc.body.textContent.includes('Unknown necessity condition'));f.dom.window.close();
 f=await setup({query:'?condition=necessity'});assert(!f.context.timeline);assert(f.doc.body.textContent.includes('Study Console link'));f.dom.window.close();
}
(async()=>{checkMaterials();await checkStartup();const results=[];for(const condition of conditions)for(const judgment of ['fault_first','carelessness_first'])for(const side of ['left','right'])for(const order of [[1,2],[2,1]])results.push(await run(condition,judgment,side,order));for(const c of conditions)await run(c,'fault_first','left',[1,2],true);
 const {verifyObservedCondition}=await import(pathToFileURL(entry+'/js/explanation-lab-client.js'));for(const r of results)assert.equal(verifyObservedCondition(r.rows,{assignmentType:'between_participant',integrationMode:'converted',conditions},r.condition).status,'matched');
 fs.writeFileSync(root+'/code/tools/generated/adult-necessity-pilot2-synthetic.json',JSON.stringify(results));console.log(JSON.stringify({allPassed:true,syntheticParticipantSessions:results.length,fullPreviewSessions:2,rowsPerSession:20,casesPerParticipant:2,conditionMixing:false,sourceDecks:4,sourceSlides:44,completeSaveAwaited:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
