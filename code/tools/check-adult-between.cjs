/* Synthetic condition integration and complete adult response/export checks. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {pathToFileURL}=require('url');
const {JSDOM}=require(process.env.TORT_JSDOM_MODULE||require.resolve('jsdom',{paths:[__dirname]}));
const root=path.resolve(__dirname,'../..'),entry=root+'/code/experiments/experiment1/adults/between-subjects';
async function run(condition,judgment,side){
 const dom=new JSDOM('<div id="jspsych-target"></div>',{url:'https://example.invalid/pilot/?study=synthetic&mode=sandbox'}),w=dom.window,doc=w.document;
 w.HTMLElement.prototype.getBoundingClientRect=function(){if(this.classList.contains('cookie-plate')){const left=[...doc.querySelectorAll('.cookie-plate')].indexOf(this)*230;return {left,top:200,width:180,height:180,right:left+180,bottom:380};}return{left:0,top:0,width:100,height:100,right:100,bottom:100};};
 w.HTMLElement.prototype.setPointerCapture=function(){};w.HTMLElement.prototype.releasePointerCapture=function(){};
 const rows=[],store={},timers=[],captured=[],properties={};let current,options,saveCompleted=false,releaseSave;
 const client={launch:{studyKey:'synthetic',mode:'sandbox',condition,participant:{prolificPid:'',studyId:'',sessionId:''}},submitAndRedirect:async(input,meta)=>{captured.push({rows:JSON.parse(JSON.stringify(input.values())),meta});await new Promise(r=>releaseSave=r);saveCompleted=true;}};
 const psych={data:{addProperties:p=>Object.assign(properties,p),get:()=>({values:()=>rows})},run:timeline=>{psych.ran=timeline;},finishTrial:row=>{rows.push({...current.data,...properties,...row});}};
 const context={document:doc,window:w,location:w.location,URLSearchParams,sessionStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},jsPsychModule:{ParameterType:{FUNCTION:'FUNCTION'}},jsPsychHtmlButtonResponse:function(){},initJsPsych:o=>{options=o;return psych;},performance:{now:()=>Date.now()},setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout(){},Image:w.Image,Math,console,mockClient:()=>Promise.resolve(client)};
 vm.createContext(context);vm.runInContext(fs.readFileSync(root+'/code/shared/js/pilot-runtime.js','utf8'),context);vm.runInContext(fs.readFileSync(root+'/code/shared/js/pilot-adult-forms.js','utf8'),context);vm.runInContext(fs.readFileSync(entry+'/configuration.js','utf8'),context);
 // The attempt reset happens before the task is built; retain the requested
 // internal assignments for this synthetic participant, as on a refresh.
 store.tort_adult_between_attempt=JSON.stringify([client.launch.studyKey,client.launch.mode,client.launch.participant,condition]);
 const experiment=context.TORT_ADULT_CONDITIONS[condition].experiment,prefix=`tort_pilot_v3_exp${experiment}_adults_`;
 store[prefix+'judgment_order']=JSON.stringify(judgment);store[prefix+'victim_side']=JSON.stringify(side);
 const source=fs.readFileSync(entry+'/study.js','utf8').replace("await import('./explanation-lab-client.js')","({default:mockClient})");
 vm.runInContext(source,context);await new Promise(setImmediate);
 assert.equal(context.TORT_ADULT_CONDITION,condition);assert.equal(context.pilot.scenarios.length,8);assert.equal(context.timeline.length,44);
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
   else if(trial._debugLabel==='Feedback'){trial.on_load();doc.querySelector('#feedback-input').value='Synthetic QA';doc.querySelector('#feedback-submit-btn').click();}
   else psych.finishTrial({response:0});
  }
  assert.equal(rows.length,before+1,trial._debugLabel+' must finish once');
 }
 const saving=options.on_finish();await new Promise(setImmediate);assert.equal(captured.length,1);assert(!saveCompleted);assert(doc.body.textContent.includes('Saving your responses'));
 releaseSave();await saving;assert(saveCompleted);assert(doc.body.textContent.includes('Responses saved'));
 assert(rows.every(r=>r.condition===condition&&r.material_experiment===experiment&&r.judgment_order===judgment&&r.victim_side===side));
 const summary=rows.filter(r=>r.is_case_summary);assert.equal(summary.length,8);assert(summary.every(r=>r.fault_rating_p===0&&r.fault_rating_v===100&&r.carelessness_rating_p===0&&r.carelessness_rating_v===100));
 assert(summary.every(r=>r.cookies_kept_by_p+r.cookies_from_p_to_c+r.cookies_from_p_to_v===8));
 assert.equal(rows.filter(r=>r.trial_role==='demographic').length,1);
 assert(Buffer.byteLength(JSON.stringify(captured[0]))<900000);
 dom.window.close();return{condition,judgment,side,rows:captured[0].rows};
}
(async()=>{const results=[];for(const condition of ['victim_not_careless','victim_careless'])for(const judgment of ['fault_first','carelessness_first'])for(const side of ['left','right'])results.push(await run(condition,judgment,side));
 const {verifyObservedCondition}=await import(pathToFileURL(entry+'/explanation-lab-client.js'));
 for(const r of results)assert.equal(verifyObservedCondition(r.rows,{assignmentType:'between_participant',integrationMode:'converted',conditions:['victim_not_careless','victim_careless']},r.condition).status,'matched');
 const out=root+'/code/tools/generated';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/adult-between-synthetic.json',JSON.stringify(results));console.log(JSON.stringify({syntheticSessions:results.length,conditions:2,allPassed:true,completeSaveAwaited:true,rowsPerSession:results.map(r=>r.rows.length)}));
})().catch(e=>{console.error(e);process.exitCode=1});
