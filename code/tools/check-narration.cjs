/* Trace narration from the actual active child configurations and displayed UI.
   Audio events are simulated; no recordings, network calls or study responses are submitted. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const {JSDOM}=require(process.env.TORT_JSDOM_MODULE||require.resolve('jsdom',{paths:[__dirname]}));
const root=path.resolve(__dirname,'../..'),normal=s=>s.replace(/\s+/g,' ').trim();
const traces=[],required=new Map();
for(const experiment of [1,2])for(const judgment of ['fault_first','carelessness_first'])for(const side of ['left','right']){
 const dom=new JSDOM('<div id="target"></div>',{url:'http://localhost/'}),w=dom.window,doc=w.document;
 let now=0,id=0,trial=null,rows=[],audios=[],timers=new Map();
 const prefix=`tort_pilot_v3_exp${experiment}_children_`,store={[prefix+'judgment_order']:JSON.stringify(judgment),[prefix+'victim_side']:JSON.stringify(side)};
 const psych={finishTrial:r=>rows.push(r)};
 const context={document:doc,window:w,Image:w.Image,jsPsychModule:{ParameterType:{FUNCTION:'function'}},initJsPsych:()=>psych,TORT_LOCAL_OPTIONS:{review:true,mute:false},
  sessionStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},performance:{now:()=>now},
  setTimeout:(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),console:{log(){}},
  Audio:function(src){const a=new w.EventTarget();Object.assign(a,{src,done:false,preload:'',play(){audios.push(a);return Promise.resolve();},pause(){a.done=true;},removeAttribute(){},load(){}});return a;}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(root+'/code/shared/js/pilot-runtime.js','utf8'),context);
 vm.runInContext(fs.readFileSync(root+`/code/experiments/experiment${experiment}/children/js/chs-task.js`,'utf8'),context);
 const config=JSON.parse(vm.runInContext('JSON.stringify(PILOT_CONFIG)',context)),pilot=vm.runInContext('pilot',context);
 const sentences=new Map(Object.entries(config.texts).filter(([key])=>!['cookie_explanation','fault_explanation_first','carelessness_explanation_first'].includes(key)).map(([key,text])=>[config.clips[key],{key,text,screen:key}]));
 for(const s of config.scenarios)for(const slide of s.slides)if(!slide.narration_repeat_of)sentences.set(slide.audio,{key:`${s.scenario_key}_${String(slide.slide_number).padStart(2,'0')}`,text:slide.text,screen:'story',scenario_key:s.scenario_key,slide_number:slide.slide_number});
 const seen=new Set();
 function record(a){
  const expected=sentences.get(a.src);assert(expected,'Unknown active audio reference '+a.src);
  const sentence=doc.querySelector(`[data-narration-key="${expected.key}"]`);
  const displayed=sentence?sentence.textContent:expected.screen==='story'?doc.querySelector('.story-image').alt:
   expected.key.endsWith('_explanation_first')?[...doc.querySelectorAll('.scale-instructions p')].map(e=>e.textContent).join(' '):
   expected.key==='warmup_welcome'?[doc.querySelector('h1').textContent,...doc.querySelectorAll('.welcome-copy p')].map(x=>typeof x==='string'?x:x.textContent).join(' '):
   expected.key.startsWith('cookie_identify_')?config.texts[expected.key]:
   expected.key.startsWith('cookie_explanation_')?config.texts[expected.key]:doc.querySelector('.prompt').textContent;
  assert.equal(normal(displayed),normal(expected.text),expected.key+' UI/audio wording mismatch');
  if(expected.key.startsWith('cookie_explanation_'))assert.equal(config.texts.cookie_explanation,['opening','person','jar'].map(p=>config.texts['cookie_explanation_'+p]).join(' '));
  if(/^(fault|carelessness)_practice_/.test(expected.key)){const names=[...doc.querySelectorAll('.two-scale-name')].map(e=>e.textContent);assert(displayed.indexOf(names[0])<displayed.indexOf(names[1]));}
  if(expected.key.startsWith('cookie_identify_')){const role={cookie_identify_claire:'v',cookie_identify_michael:'p',cookie_identify_jar:'jar'}[expected.key];assert.equal(doc.querySelector('.explanation-highlight').dataset.role,role);}
  const destination=`code/experiments/experiment${experiment}/children/${a.src}`;
  const request={experiment,destination,...expected};
  if(required.has(destination))assert.equal(required.get(destination).text,request.text);else required.set(destination,request);
  seen.add(destination);
 }
 function respond(){
  if(doc.querySelector('#gate-yes')&&!doc.querySelector('#cookie-gate').hidden){doc.querySelector('#gate-yes').click();return;}
  const rating=doc.querySelector('#rating-continue');
  if(rating&&!trial._debugLabel.includes(': explanation')){
   const values=trial._debugLabel.endsWith('large')?{p:80,v:0}:trial._debugLabel.endsWith('small')?{p:0,v:30}:trial._debugLabel.endsWith('zero')?{p:0,v:0}:{p:63,v:17};
   for(const role of ['p','v']){const bar=doc.querySelector('#rating-'+role+'-track');bar.getBoundingClientRect=()=>({left:0,width:100});for(const name of ['pointerdown','pointerup']){const e=new w.MouseEvent(name,{bubbles:true,clientX:values[role],button:0});Object.defineProperty(e,'pointerId',{value:1});bar.dispatchEvent(e);}}
  }
  const allocation=doc.querySelector('#confirm-btn');
  if(allocation&&trial._debugLabel!=='Cookie explanation'){
   const cookie=doc.querySelector('#p-cookie-0'),role=trial._debugLabel==='Cookie jar'?'jar':'v';[...doc.querySelectorAll('.cookie-plate')].forEach((zone,i)=>zone.getBoundingClientRect=()=>({left:i*230,top:200,width:180,height:180}));const r=doc.querySelector('#'+role+'-plate').getBoundingClientRect();cookie.getBoundingClientRect=()=>({left:0,top:0});
   for(const [name,x,y]of[['pointerdown',10,10],['pointermove',r.left+90,290],['pointerup',r.left+90,290]]){const e=new w.MouseEvent(name,{bubbles:true,clientX:x,clientY:y,button:0});Object.defineProperty(e,'pointerId',{value:1});cookie.dispatchEvent(e);}
  }
  const button=[...doc.querySelectorAll('#text-continue,#rating-continue,#confirm-btn')].find(b=>!b.disabled&&!b.hidden);if(button)button.click();
 }
 for(trial of pilot.timeline){
  const before=rows.length;trial.screen(doc.querySelector('#target'),psych);
  for(let steps=0;rows.length===before&&steps<500;steps++){
   const audio=audios.find(a=>!a.done);
   if(audio){audio.dispatchEvent(new w.Event('playing'));record(audio);audio.done=true;audio.dispatchEvent(new w.Event('ended'));continue;}
   const timer=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];
   if(timer&&timer[1].at<=now){timers.delete(timer[0]);timer[1].fn();continue;}
   respond();if(rows.length!==before)break;if(audios.some(a=>!a.done))continue;
   const nextTimer=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];
   if(nextTimer){timers.delete(nextTimer[0]);now=nextTimer[1].at;nextTimer[1].fn();}else throw Error('Unable to advance '+trial._debugLabel);
  }
  assert.equal(rows.length,before+1,'Incomplete active screen '+trial._debugLabel);assert.equal(timers.size,0,'Leaked timer '+trial._debugLabel);
 }
 traces.push({experiment,judgment_order:judgment,victim_side:side,screens:rows.length,required_destinations:seen.size});dom.window.close();
}
const sources=Object.fromEntries(['code/shared/js/pilot-runtime.js',... [1,2].map(e=>`code/experiments/experiment${e}/children/js/chs-task.js`)].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(root+'/'+p)).digest('hex')]));
const report={authority:'Executed active children/js/chs-task.js + shared pilot-runtime.js; displayed text and real audio references traced under simulated playback.',sources,conditions:traces,requests:[...required.values()].sort((a,b)=>a.experiment-b.experiment||a.destination.localeCompare(b.destination))};
const destination=path.join(__dirname,'generated/narration-active-trace.json');fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n');
console.log(`Active child narration audit passed: ${traces.length} order/side conditions; ${required.size} required destinations, exact displayed wording, all eight stories per experiment.`);
