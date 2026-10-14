/* Local synthetic behavioral tests. No participant services or live CHS access. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {JSDOM}=require(process.env.TORT_JSDOM_MODULE||require.resolve('jsdom',{paths:[__dirname]}));
const root=path.resolve(__dirname,'../..');
const engine=fs.readFileSync(root+'/code/shared/js/pilot-runtime.js','utf8');
const scenarios=JSON.parse(fs.readFileSync(root+'/docs/scenarios.json')).scenarios;
const texts=JSON.parse(fs.readFileSync(root+'/docs/narration/source.json'));
const clips=JSON.parse(fs.readFileSync(root+'/docs/narration/runtime.json'));
const demoTiming=JSON.parse(fs.readFileSync(root+'/docs/narration/demo-timing.json'));
const results=[];
function setup(exp,audience,judgment,side,store=null,seed=1,mute=true,review=true){
 const dom=new JSDOM('<div id="target"></div>',{url:'http://localhost/'}),w=dom.window,doc=w.document;
 w.HTMLMediaElement.prototype.play=function(){return Promise.resolve()};w.HTMLMediaElement.prototype.pause=function(){};w.HTMLMediaElement.prototype.load=function(){};
 w.HTMLElement.prototype.getBoundingClientRect=function(){if(this.classList.contains('cookie-plate')){const left=[...doc.querySelectorAll('.cookie-plate')].indexOf(this)*230;return {left,top:200,width:180,height:180,right:left+180,bottom:380};}return {left:0,top:0,width:100,height:100,right:100,bottom:100}};
 w.HTMLElement.prototype.setPointerCapture=function(id){this.captured=id};w.HTMLElement.prototype.releasePointerCapture=function(){this.captured=null};
 const prefix=`tort_pilot_v3_exp${exp}_${audience}_`;store=store||{};
 if(judgment)store[prefix+'judgment_order']=JSON.stringify(judgment);if(side)store[prefix+'victim_side']=JSON.stringify(side);
 let n=Math.imul(seed,2654435761)>>>0;const math=Object.create(Math);math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/2**32};
 const audios=[],animations=[];w.HTMLElement.prototype.animate=function(frames,options){animations.push({id:this.id,frames,options});return {cancel(){}};};let timers=new Map(),timerDelays=new Map(),clock=0,id=0,finished=[],liveDisplay=doc.getElementById('target');
 const context={Math:math,document:doc,window:w,sessionStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},jsPsychModule:{ParameterType:{FUNCTION:'FUNCTION'}},Audio:function(src){const a=new w.Audio(src);audios.push(a);return a;},Image:w.Image,performance:{now:()=>++clock},setTimeout:(f,ms)=>{timers.set(++id,f);timerDelays.set(id,ms);return id;},clearTimeout:i=>{timers.delete(i);timerDelays.delete(i);}};
 vm.createContext(context);vm.runInContext(engine,context);let pilot=context.TortPilot.create({experiment:exp,audience,scenarios:scenarios.filter(s=>s.experiment===exp),texts,clips:clips[exp],demoTiming,review,mute});
 const psych={finishTrial:r=>finished.push(r)};
 const tick=()=>{const batch=[...timers];timers.clear();batch.forEach(([id,f])=>f());};
 const render=t=>{t.screen(liveDisplay,psych);tick();tick();if(t._debugLabel==='Cookie explanation'&&mute){for(let i=0;i<30&&doc.querySelector('#confirm-btn').disabled;i++)tick();assert(!doc.querySelector('#confirm-btn').disabled);}if(audience==='children'&&mute&&t._debugLabel.includes(': explanation')&&!t._debugLabel.includes('(second)')){for(let i=0;i<1000&&doc.querySelector('#rating-continue').disabled;i++)tick();assert(!doc.querySelector('#rating-continue').disabled);}};
 const event=(el,type,x=20,pointerType='mouse',pid=1,y=20)=>{const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0});Object.defineProperties(e,{pointerId:{value:pid},pointerType:{value:pointerType}});el.dispatchEvent(e);return e};
 const drag=(i,to,input='mouse',cancel=false)=>{const el=doc.querySelector('#p-cookie-'+i),r=to?doc.querySelector('#'+to+'-plate').getBoundingClientRect():{left:-1000,top:-1000,width:0,height:0},x=r.left+r.width/2,y=r.top+r.height/2;event(el,'pointerdown',20,input);event(el,'pointermove',x,input,1,y);event(el,cancel?'pointercancel':'pointerup',x,input,1,y);};
 const bars=(p,v)=>{for(const role of ['p','v']){const el=doc.querySelector('#rating-'+role+'-track');event(el,'pointerdown',role==='p'?p:v);event(el,'pointerup',role==='p'?p:v);} };
 return {pilot,dom,doc,finished,render,event,drag,bars,tick,store,timers,timerDelays,advanceClock:ms=>{clock+=ms;},context,psych,audios,animations};
}
for(const exp of [1,2])for(const audience of ['adults','children'])for(const judgment of ['fault_first','carelessness_first'])for(const side of ['left','right']){
 const h=setup(exp,audience,judgment,side);const{pilot:p,doc}=h;
 assert.equal(p.warmup.length,audience==='children'?10:8);assert.equal(p.timeline.length,audience==='children'?45:40);assert.equal(p.scenarios.length,8);
 assert(p.scenarios.every(s=>s.v_initial===2&&s.v_after_harm===0&&s.harm_amount===2));
 const first=judgment==='fault_first'?'fault':'carelessness',second=first==='fault'?'carelessness':'fault';
 const practices=p.warmup.filter(t=>t._debugLabel.includes(': practice'));assert.equal(practices.length,2);assert(practices.every(t=>t.data.phase===first));
 // Allocation practice reuses main pointer mechanics and fixed layout.
 const explain=p.warmup.find(t=>t._debugLabel==='Cookie explanation');h.render(explain);assert.equal(doc.querySelectorAll('.plate-surface').length,0);assert.equal(doc.querySelectorAll('.jar-picture img').length,1);assert(doc.querySelector('[data-role=jar] .station-portrait .jar-picture'));assert(!doc.querySelector('#jar-plate .jar-picture'));assert.equal(doc.querySelectorAll('#v-plate .cookie,#jar-plate .cookie').length,0);assert([...doc.querySelectorAll('.cookie')].every(el=>el.disabled));assert(!doc.querySelector('#undo-btn'));
 for(const target of ['jar','person']){
  h.render(p.warmup.find(t=>t._debugLabel===`Cookie ${target}`));
  assert.equal(doc.querySelectorAll('.cookie').length,3);assert.equal(doc.querySelectorAll('.allocation-person')[1].dataset.role,'p');
  const button=doc.querySelector('#confirm-btn'),to=target==='person'?'v':'jar',other=target==='person'?'jar':'v';
  assert(button.disabled);
  h.drag(0,other,'mouse');assert(button.disabled,'Wrong destination alone must not pass');
  h.drag(1,to,'touch');assert(!button.disabled,'Earlier practice accepts a target cookie even with cookies at the other destination');
  h.drag(1,'p','pen');assert(button.disabled,'Removing the last instructed-destination cookie must disable Continue');
  h.drag(1,to,'touch');assert(!button.disabled);
  h.drag(0,'p','pen');assert(!button.disabled);
  h.drag(2,to,'touch');assert(!button.disabled,'More than one cookie at the correct destination is allowed');
  h.drag(0,other,'mouse');assert(!button.disabled,'Cookies at the other destination do not invalidate earlier practice');
  h.drag(0,to,'pen');assert(!button.disabled,'All cookies at the correct destination is allowed');
  h.drag(0,'p');h.drag(1,'p');h.drag(2,'p');assert(button.disabled,'Returning every cookie must disable Continue');
  h.drag(0,to,'touch');assert(!button.disabled);button.click();
  const row=h.finished.at(-1);assert.equal(row[target==='jar'?'cookies_from_p_to_c':'cookies_from_p_to_v'],1);assert.equal(row[target==='jar'?'cookies_from_p_to_v':'cookies_from_p_to_c'],0);
 }
 for(const t of practices){h.render(t);const names=[...doc.querySelectorAll('.two-scale-name')].map(e=>e.textContent),prompt=doc.querySelector('.prompt span:last-child').textContent;assert.equal(doc.querySelector('.prompt').textContent,(audience==='children'?'Now you try! ':'')+prompt);assert(prompt.indexOf(names[0])<prompt.indexOf(names[1]));assert(prompt.startsWith('Show that '+names[0]));if(t._debugLabel.endsWith('zero'))assert.equal(prompt,`Show that ${names[0]} and ${names[1]} ${first==='fault'?'are not at fault':'were not careful'}.`);const button=doc.querySelector('#rating-continue');assert(button.disabled);h.bars(50,50);assert(button.disabled);if(t._debugLabel.endsWith('large'))h.bars(80,0);else if(t._debugLabel.endsWith('small'))h.bars(0,30);else h.bars(0,0);assert(!button.disabled);assert.equal(doc.querySelectorAll('.two-scale-pct').length,audience==='adults'?2:0);button.click();}
 for(let i=0;i<8;i++){
  const s=p.scenarios[i],caseTrials=p.timeline.filter(t=>t.data.scenario_id===s.scenario_id);
  assert.deepEqual(caseTrials.map(t=>t.data.phase),['story','cookies',first,second]);assert(caseTrials.every(t=>t.data.presentation_position===i+1));
  const alloc=caseTrials[1];h.render(alloc);assert(!doc.querySelector('#undo-btn'));assert.equal(doc.querySelector('.allocation-person').dataset.role,side==='left'?'v':'jar');doc.querySelector('#gate-no').click();let row=h.finished.at(-1);assert.equal(row.move_cookies_response,'no');assert.equal(row.allocation_rt,null);assert.equal(row.cookies_kept_by_p,s.p_after);
  h.render(alloc);doc.querySelector('#gate-yes').click();h.tick();h.tick();assert(doc.querySelector('#confirm-btn').disabled);
  // All pointer types, cancellations, invalid drops, actor return and synthetic clicks.
  for(const input of ['mouse','touch','pen']){
   h.drag(0,'v',input);assert(doc.querySelector('#v-plate').classList.contains('drop-pulse'));assert.equal(h.animations.at(-1).options.duration,180);assert.equal(doc.querySelector('#v-plate .cookie').id,'p-cookie-0');
   h.drag(0,'jar',input,true);assert.equal(doc.querySelector('#v-plate .cookie').id,'p-cookie-0');
   h.drag(0,null,input);assert.equal(doc.querySelector('#v-plate .cookie').id,'p-cookie-0');
   h.drag(0,'p',input);assert(doc.querySelector('#confirm-btn').disabled);
   h.drag(0,'jar',input);assert(doc.querySelector('#jar-plate').classList.contains('drop-pulse'));assert.equal(h.animations.at(-1).options.duration,180);assert.equal(h.animations.at(-1).options.easing,'cubic-bezier(.2,.6,.3,1)');h.drag(0,'p',input);assert(doc.querySelector('#confirm-btn').disabled);
  }
  // Reverse move order still yields the same centered deterministic accumulation.
  for(let j=s.p_after-1;j>=0;j--)h.drag(j,'jar');assert.deepEqual([...doc.querySelectorAll('#jar-plate .cookie')].map(c=>c.id),Array.from({length:s.p_after},(_,j)=>'p-cookie-'+j));if(s.p_after===7){assert.equal(doc.querySelector('#p-cookie-6').style.gridColumn,'3 / span 2');assert.equal(doc.querySelector('#p-cookie-6').style.gridRow,'3');}for(let j=0;j<s.p_after;j++)h.drag(j,'p');
  h.drag(0,'v','touch');h.drag(1,'jar','pen');doc.querySelector('#p-cookie-1').click();assert(doc.querySelector('#jar-plate .cookie'));assert.equal(doc.querySelectorAll('.cookie').length,s.p_after);doc.querySelector('#confirm-btn').click();row=h.finished.at(-1);assert.equal(row.cookies_from_p_to_v,1);assert.equal(row.cookies_from_p_to_c,1);assert.equal(row.cookies_kept_by_p,s.p_after-2);assert.equal(row.move_cookies_response,'yes');assert.equal(typeof row.allocation_rt,'number');
  for(const t of caseTrials.slice(2)){h.render(t);assert.equal(doc.querySelector('.two-scale-col').dataset.role,side==='left'?'v':'p');let btn=doc.querySelector('#rating-continue');assert(btn.disabled);h.bars(1,1);for(const f of doc.querySelectorAll('.two-scale-fill')){assert(f.style.background.startsWith('rgba(76, 120, 168,'));const alpha=Number(f.style.background.match(/, ([\d.]+)\)$/)[1]);assert(alpha>=.08&&alpha<=.10);}for(const [value,opacity] of [[10,.172],[25,.31],[50,.54],[75,.77],[100,1]]){h.bars(value,value);for(const f of doc.querySelectorAll('.two-scale-fill')){const alpha=f.style.background.startsWith('rgb(')?1:Number(f.style.background.match(/, ([\d.]+)\)$/)[1]);assert(Math.abs(alpha-opacity)<.005);}}h.bars(0,0);assert([...doc.querySelectorAll('.two-scale-fill')].every(f=>f.style.background==='transparent'));h.render(t);btn=doc.querySelector('#rating-continue');h.event(doc.querySelector('#rating-p-track'),'pointerdown',0);h.event(doc.querySelector('#rating-p-track'),'pointerup',0);assert(btn.disabled);h.bars(63,17);assert(!btn.disabled);if(audience==='adults'){assert.equal(doc.querySelector('#rating-p-pct').textContent,'63%');assert.equal(doc.querySelector('#rating-v-pct').textContent,'17%');}else assert(!doc.querySelector('.two-scale-pct'));btn.click();row=h.finished.at(-1);assert.equal(row[t.data.phase+'_rating_p'],63);assert.equal(row[t.data.phase+'_rating_v'],17);}
  row=h.finished.at(-1);assert(row.is_case_summary);assert.equal(row.fault_rating_p,63);assert.equal(row.carelessness_rating_v,17);assert.equal(row.scenario_key,s.scenario_key);assert.equal(row.presentation_position,i+1);assert(!Object.keys(row).some(k=>k.includes('checker')||k.includes('carefulness')));
 }
 assert.equal(p.mergedRows().length,8);assert.deepEqual(p.mergedRows().map(r=>r.presentation_position),[1,2,3,4,5,6,7,8]);
 const thanks=p.timeline.filter(t=>t.data.phase==='thank_you');assert.equal(thanks.length,audience==='children'?3:0);assert.deepEqual(thanks.map(t=>t.data.completed_case_position),audience==='children'?[1,5,8]:[]);
 const copy=setup(exp,audience,null,null,h.store);assert.deepEqual(copy.pilot.assignments,p.assignments);copy.dom.window.close();
 results.push({experiment:exp,audience,judgment_order:judgment,victim_side:side,passed:true});h.dom.window.close();
}
// Adult cookie explanations are static and immediately continuable. Child
// explanation stays on one screen; identifiers follow the displayed order,
// rules stay highlighted through their clips, the opening stays neutral, and Continue
// waits for neutral completion. Silent/failed audio uses slower speech-like placeholders.
for(const exp of [1,2])for(const audience of ['adults','children'])for(const side of ['left','right'])for(const ending of ['ended','error','timeout']){
 const h=setup(exp,audience,'fault_first',side,null,1,false),{doc}=h;
 const take=ms=>{const timer=[...h.timers].find(([id])=>h.timerDelays.get(id)===ms);assert(timer,'Missing timer '+ms);h.timers.delete(timer[0]);timer[1]();};
 h.pilot.warmup.find(t=>t._debugLabel==='Cookie explanation').screen(doc.querySelector('#target'),h.psych);
 const board=doc.querySelector('.allocation-board'),prompt=doc.querySelector('#cookie-prompt'),button=doc.querySelector('#confirm-btn');
 assert.equal(prompt.textContent,texts.cookie_explanation);
 const roles=[...doc.querySelectorAll('.allocation-person')].map(c=>c.dataset.role),keys={v:'cookie_identify_claire',p:'cookie_identify_michael',jar:'cookie_identify_jar'};
 if(audience==='adults'){
  assert.equal(h.audios.length,0);assert.equal(h.timers.size,0);assert.equal(board.dataset.explanationPhase,'complete');assert(!doc.querySelector('.explanation-highlight'));assert(!button.disabled);
  button.click();assert.equal(h.finished.length,1);assert.equal(h.finished[0].audio_failures.length,0);assert.equal(h.finished[0].movement_count,0);assert.equal(h.finished[0].cookies_kept_by_p,3);h.dom.window.close();continue;
 }
 assert.equal(texts.cookie_identify_michael,'This is Michael. He has three cookies.');assert.equal(texts.cookie_identify_claire,'This is Claire.');assert.equal(texts.cookie_identify_jar,'This is the cookie jar.');
 const phases=[...(audience==='children'?roles.map(role=>({name:'identify',role,key:keys[role],ms:role==='p'?3000:1800})):[]),{name:'opening',key:'cookie_explanation_opening',ms:3500},{name:'person',role:'v',key:'cookie_explanation_person',ms:5000},{name:'jar',role:'jar',key:'cookie_explanation_jar',ms:4200}];
 const styles=[];
 for(const phase of phases){
  assert.equal(board.dataset.explanationPhase,phase.name);assert.strictEqual(doc.querySelector('.allocation-board'),board);assert(button.disabled);assert([...doc.querySelectorAll('.cookie')].every(c=>c.disabled));
  assert(!doc.querySelector('.explanation-highlight')); // Nothing highlights while audio loads.
  if(audience==='children'){
   assert(h.audios.at(-1).src.endsWith(clips[exp][phase.key]));
   if(ending==='ended')h.audios.at(-1).dispatchEvent(new h.dom.window.Event('playing'));
   else if(ending==='timeout')take(Math.max(15000,texts[phase.key].length*90+10000));
   else h.audios.at(-1).dispatchEvent(new h.dom.window.Event(ending));
  }else{assert.equal(h.audios.length,0);take(0);}
  assert.deepEqual([...doc.querySelectorAll('.explanation-highlight')].map(c=>c.dataset.role),phase.role?[phase.role]:[]);
  if(phase.role==='p'){assert.equal(doc.querySelectorAll('.explanation-highlight #p-plate .cookie').length,3);assert([...doc.querySelectorAll('.cookie')].every(c=>c.closest('.explanation-highlight')));}
  if(['person','jar'].includes(phase.name)){const col=doc.querySelector('.explanation-highlight'),zone=col.querySelector('.cookie-plate'),style=h.dom.window.getComputedStyle(zone);styles.push({background:style.backgroundColor,border:style.borderColor,column:h.dom.window.getComputedStyle(col).backgroundColor});}
  if(audience==='children'&&ending==='ended'){
   assert.equal(h.timers.size,0); // Real playback has no highlight-duration timer or cutoff.
   h.advanceClock(30000);assert.deepEqual([...doc.querySelectorAll('.explanation-highlight')].map(c=>c.dataset.role),phase.role?[phase.role]:[]);assert(button.disabled);
   h.audios.at(-1).dispatchEvent(new h.dom.window.Event('ended'));take(0);
  }else{take(0);assert.deepEqual([...doc.querySelectorAll('.explanation-highlight')].map(c=>c.dataset.role),phase.role?[phase.role]:[]);take(phase.ms);}
  assert(!doc.querySelector('.explanation-highlight'));assert(button.disabled);take(160);
 }
 assert.deepEqual(styles[0],styles[1]);assert.equal(styles[0].background,'rgba(76, 120, 168, 0.08)');assert.equal(board.dataset.explanationPhase,'complete');assert(!button.disabled);assert(!doc.querySelector('.explanation-highlight'));button.click();assert.equal(h.timers.size,0);
 assert.equal(h.finished.length,1);assert.equal(h.finished[0].audio_failures.length,audience==='children'&&ending!=='ended'?6:0);assert.equal(h.finished[0].movement_count,0);assert.equal(h.finished[0].cookies_kept_by_p,3);
 h.dom.window.close();
}
// Playback buffering keeps the current highlight; a resumed clip cancels the
// buffering watchdog, and a genuine stalled connection still returns to neutral.
for(const resume of [true,false]){
 const h=setup(1,'children','fault_first','left',null,1,false),doc=h.doc;
 const take=ms=>{const timer=[...h.timers].find(([id])=>h.timerDelays.get(id)===ms);assert(timer);h.timers.delete(timer[0]);timer[1]();};
 h.pilot.warmup.find(t=>t._debugLabel==='Cookie explanation').screen(doc.querySelector('#target'),h.psych);
 const audio=h.audios.at(-1);audio.dispatchEvent(new h.dom.window.Event('playing'));audio.dispatchEvent(new h.dom.window.Event('waiting'));assert(doc.querySelector('[data-role=v]').classList.contains('explanation-highlight'));
 if(resume){audio.dispatchEvent(new h.dom.window.Event('playing'));assert.equal(h.timers.size,0);audio.dispatchEvent(new h.dom.window.Event('ended'));}
 else take(15000);
 take(0);assert(!doc.querySelector('.explanation-highlight'));assert(doc.querySelector('#confirm-btn').disabled);h.dom.window.close();
}
// Child practice recordings must follow the same displayed left/right order.
for(const exp of [1,2])for(const judgment of ['fault_first','carelessness_first'])for(const side of ['left','right']){
 const h=setup(exp,'children',judgment,side,null,1,false);
 for(const t of h.pilot.warmup.filter(t=>t._debugLabel.includes(': practice'))){
  t.screen(h.doc.getElementById('target'),h.psych);
  const prompt=h.doc.querySelector('.prompt span:last-child').textContent,names=[...h.doc.querySelectorAll('.two-scale-name')].map(e=>e.textContent);
  assert(prompt.indexOf(names[0])<prompt.indexOf(names[1]));
  const key=Object.keys(texts).find(k=>texts[k]===prompt);assert(key);
  assert.equal(h.doc.querySelector('.prompt').textContent,'Now you try! '+prompt);assert(h.audios.at(-1).src.endsWith(clips[exp].rating_practice_try));
  h.audios.at(-1).dispatchEvent(new h.dom.window.Event('ended'));h.tick();assert(h.doc.querySelector('#rating-continue').disabled);
  assert(h.audios.at(-1).src.endsWith(clips[exp][key]));
  if(key.includes('_large'))h.bars(80,0);else if(key.includes('_small'))h.bars(0,30);else h.bars(0,0);
  assert(h.doc.querySelector('#rating-continue').disabled);h.audios.at(-1).dispatchEvent(new h.dom.window.Event('ended'));h.tick();assert(!h.doc.querySelector('#rating-continue').disabled);h.doc.querySelector('#rating-continue').click();assert.equal(h.timers.size,0);
 }
 h.dom.window.close();
}
// UI refinements must not add trials, produce demonstration responses, or expose Undo to participants.
for(const exp of [1,2])for(const audience of ['adults','children'])for(const judgment of ['fault_first','carelessness_first'])for(const side of ['left','right']){
 const h=setup(exp,audience,judgment,side,null,1,true,false),{doc,pilot:p}=h;
 const circleGeometry=()=>{assert.equal(h.dom.window.getComputedStyle(doc.querySelector('.allocation-board')).getPropertyValue('--zone-size'),'180px');for(const zone of doc.querySelectorAll('.cookie-plate')){const style=h.dom.window.getComputedStyle(zone);assert.equal(style.width,'var(--zone-size)');assert.equal(style.height,'var(--zone-size)');assert.equal(style.borderRadius,'50%');assert.equal(style.backgroundColor,'rgb(245, 246, 247)');}};
 h.render(p.warmup[0]);circleGeometry();assert.equal(doc.querySelectorAll('.welcome-copy p').length,4);assert.equal(doc.querySelectorAll('.allocation-person').length,3);assert(doc.querySelector('.jar-picture img').src.endsWith('/images/pilot_cookie_jar_empty.png'));assert(!doc.querySelector('.jar-glass'));
 for(const t of p.warmup.filter(t=>t._debugLabel.startsWith('Cookie '))){h.render(t);assert(!doc.querySelector('#undo-btn'));assert.equal(doc.querySelectorAll('.cookie-plate').length,3);circleGeometry();}
 const alloc=p.timeline.find(t=>t.data.scenario_id&&t.data.phase==='cookies');h.render(alloc);assert(!doc.querySelector('#undo-btn'));assert(doc.querySelector('.jar-picture img').src.endsWith('/images/pilot_cookie_jar_empty.png'));assert(!doc.querySelector('.jar-glass'));assert(doc.querySelector('.allocation-gate'));const gateCookies=doc.querySelectorAll('.cookie').length;circleGeometry();doc.querySelector('#gate-yes').click();h.tick();h.tick();assert(doc.querySelector('.allocation-drag'));assert(!doc.querySelector('.allocation-gate'));assert.equal(doc.querySelectorAll('.cookie').length,gateCookies);circleGeometry();
 const hoverFeedback=[];for(const target of ['v','jar']){const cookie=doc.querySelector('#p-cookie-0'),zone=doc.querySelector('#'+target+'-plate');const r=zone.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;h.event(cookie,'pointerdown',20);h.event(cookie,'pointermove',x,'mouse',1,y);assert(zone.classList.contains('drop-hover'));const style=h.dom.window.getComputedStyle(zone);hoverFeedback.push({background:style.backgroundColor,border:style.borderColor});h.event(cookie,'pointerup',x,'mouse',1,y);h.drag(0,'p');}assert.deepEqual(hoverFeedback[0],hoverFeedback[1]);assert.equal(hoverFeedback[0].background,'rgb(251, 253, 255)');assert.equal(hoverFeedback[0].border,'rgb(76, 120, 168)');
 // Tolerance applies in every direction; the space between expanded circles is invalid.
 const dropAt=(x,y)=>{const c=doc.querySelector('#p-cookie-0');h.event(c,'pointerdown',20);h.event(c,'pointermove',x,'touch',1,y);h.event(c,'pointerup',x,'touch',1,y);};
 for(const target of ['v','jar']){const r=doc.querySelector('#'+target+'-plate').getBoundingClientRect(),cx=r.left+90,cy=r.top+90;for(const angle of [0,Math.PI/2,Math.PI,3*Math.PI/2,Math.PI/4]){dropAt(cx+110*Math.cos(angle),cy+110*Math.sin(angle));assert(doc.querySelector('#'+target+'-plate #p-cookie-0'));h.drag(0,'p');dropAt(cx+116*Math.cos(angle),cy+116*Math.sin(angle));assert(doc.querySelector('#p-plate #p-cookie-0'));}}
 const regions=[...doc.querySelectorAll('.cookie-plate')].map(z=>z.getBoundingClientRect());dropAt((regions[0].left+regions[1].left)/2+90,290);assert(doc.querySelector('#p-plate #p-cookie-0'));
 // A crowded layout automatically shrinks the tolerance, never overlapping targets.
 const zoneNodes=[...doc.querySelectorAll('.cookie-plate')];zoneNodes.forEach((z,i)=>z.getBoundingClientRect=()=>({left:i*190,top:200,width:180,height:180}));const crowded=doc.querySelector('#jar-plate').getBoundingClientRect();dropAt(crowded.left+90,382);assert(doc.querySelector('#jar-plate #p-cookie-0'));h.drag(0,'p');dropAt(crowded.left+90,385);assert(doc.querySelector('#p-plate #p-cookie-0'));zoneNodes.forEach(z=>delete z.getBoundingClientRect);
 h.drag(0,'v','touch');h.drag(0,'jar','mouse');h.drag(0,'p','pen');assert(doc.querySelector('#confirm-btn').disabled);assert.equal(doc.querySelectorAll('#p-plate .cookie').length,p.scenarios[0].p_after);
 const explanations=p.warmup.filter(t=>t._debugLabel.includes(': explanation'));
 explanations[0].screen(doc.querySelector('#target'),h.psych);assert.equal(doc.querySelectorAll('.scale-instructions p').length,3);assert.equal([...doc.querySelectorAll('.scale-instructions p')].map(e=>e.textContent).join(' '),texts[explanations[0].data.phase+'_explanation_first']);assert(!doc.querySelector('.scale-explanation h2'));assert.equal(h.dom.window.getComputedStyle(doc.querySelector('.scale-instructions')).textAlign,'center');assert(texts[explanations[0].data.phase+'_explanation_first'].indexOf('a lot of their bar blue')<texts[explanations[0].data.phase+'_explanation_first'].indexOf('a small part of their bar blue'));assert.equal(h.dom.window.getComputedStyle(doc.querySelector('.two-scale-track-bg')).backgroundColor,'rgb(243, 246, 248)');assert.equal(doc.querySelector('.two-scale-outline path').getAttribute('stroke'),'#334155');assert.equal(doc.querySelectorAll('[data-demonstration]').length,audience==='children'?1:0);assert.equal(doc.querySelectorAll('.two-scale-track-mid').length,2);assert([...doc.querySelectorAll('.two-scale-track-mid')].every(e=>e.getAttribute('d')==='M240 38.4 V120'));
 if(audience==='adults'){assert(!doc.querySelector('.bar-demo-pointer'));assert(['','0%'].includes(doc.querySelector('#rating-p-wrap').style.width));assert(![...h.timers].some(([id])=>[500,3000,5100,40].includes(h.timerDelays.get(id))));}
 // Child silent QA is segment-local too, and cannot start any action in the intro.
 if(audience==='children'){assert(doc.querySelector('.bar-demo-pointer').hidden);assert(doc.querySelector('#rating-continue').disabled);assert(![...h.timers].some(([id])=>[500,3000,5100].includes(h.timerDelays.get(id))));for(let i=0;i<1000&&doc.querySelector('#rating-continue').disabled;i++)h.tick();}
 h.tick();h.tick();assert(!doc.querySelector('#rating-continue').disabled);doc.querySelector('#rating-continue').click();assert(!Object.keys(h.finished.at(-1)).some(k=>k.includes('_rating_')));assert.equal(h.timers.size,0);
 h.render(explanations[1]);assert(!doc.querySelector('[data-demonstration]'));assert(!doc.querySelector('.scale-instructions'));assert.equal(doc.querySelector('.prompt').textContent,texts[explanations[1].data.phase+'_explanation_second']);h.dom.window.close();
}
// First child explanations play four clips in teaching order. Gesture progress
// uses the actual media clock and stays put through loading/buffering, even if
// wall time advances. The second construct remains a single clip without a demo.
for(const exp of [1,2])for(const judgment of ['fault_first','carelessness_first'])for(const side of ['left','right']){
 const h=setup(exp,'children',judgment,side,null,1,false),doc=h.doc;
 const take=ms=>{const timer=[...h.timers].find(([id])=>h.timerDelays.get(id)===ms);assert(timer,'Missing timer '+ms);h.timers.delete(timer[0]);timer[1]();};
 const first=judgment==='fault_first'?'fault':'carelessness',explanations=h.pilot.warmup.filter(t=>t._debugLabel.includes(': explanation'));
 explanations[0].screen(doc.querySelector('#target'),h.psych);
 for(const part of ['intro','large','small','zero']){
  const key=first+'_explanation_'+part,audio=h.audios.at(-1);assert(audio.src.endsWith(clips[exp][key]));assert(doc.querySelector('#rating-continue').disabled);assert.equal(doc.querySelector('#rating-p-wrap').style.width,'0%');assert(doc.querySelector('.bar-demo-pointer').hidden);
  audio.dispatchEvent(new h.dom.window.Event('playing'));
  if(part==='intro'){h.advanceClock(10000);audio.currentTime=5;audio.dispatchEvent(new h.dom.window.Event('timeupdate'));assert(doc.querySelector('.bar-demo-pointer').hidden);assert.equal(doc.querySelector('#rating-p-wrap').style.width,'0%');assert(![...h.timers].some(([id])=>h.timerDelays.get(id)===40));assert.equal(h.audios.length,1);}
  else{
   const cue=demoTiming[key],target=part==='large'?85:part==='small'?25:0,meaning=part==='large'?'a-lot':part==='small'?'a-little':'none';
   audio.currentTime=cue.press;audio.dispatchEvent(new h.dom.window.Event('timeupdate'));assert.equal(doc.querySelector('[data-demonstration]').dataset.demoState,'pressed');assert.equal(doc.querySelector('[data-demonstration]').dataset.demoMeaning,meaning);assert.equal(doc.querySelector('#rating-p-wrap').style.width,'0%');
   audio.currentTime=(cue.motion_start+cue.motion_end)/2;take(40);assert(Math.abs(parseFloat(doc.querySelector('#rating-p-wrap').style.width)-target/2)<.001);
   const before=doc.querySelector('#rating-p-wrap').style.width;audio.dispatchEvent(new h.dom.window.Event('waiting'));h.advanceClock(10000);take(40);assert.equal(doc.querySelector('#rating-p-wrap').style.width,before);assert(h.audios.at(-1)===audio);assert(doc.querySelector('#rating-continue').disabled);
   audio.currentTime=cue.motion_end;audio.dispatchEvent(new h.dom.window.Event('timeupdate'));assert.equal(doc.querySelector('#rating-p-wrap').style.width,target+'%');assert.equal(doc.querySelector('.bar-demo-pointer').dataset.gesture,'released');assert.equal(doc.querySelector('[data-demonstration]').dataset.demoState,'complete');assert(h.audios.at(-1)===audio,'Completed animation must still wait for audio ended');assert(doc.querySelector('#rating-continue').disabled);assert(![...h.timers].some(([id])=>h.timerDelays.get(id)===40));
  }
  audio.dispatchEvent(new h.dom.window.Event('ended'));take(0);
 }
 assert(!doc.querySelector('#rating-continue').disabled);assert.equal(doc.querySelector('#rating-p-wrap').style.width,'0%');assert(doc.querySelector('.bar-demo-pointer').hidden);assert.equal(doc.querySelectorAll('.two-scale-pct').length,0);doc.querySelector('#rating-continue').click();assert.equal(h.timers.size,0);assert(!Object.keys(h.finished.at(-1)).some(k=>k.includes('_rating_')));
 explanations[1].screen(doc.querySelector('#target'),h.psych);assert(!doc.querySelector('[data-demonstration]'));assert(h.audios.at(-1).src.endsWith(clips[exp][explanations[1].data.phase+'_explanation_second']));h.audios.at(-1).dispatchEvent(new h.dom.window.Event('ended'));take(0);doc.querySelector('#rating-continue').click();assert.equal(h.timers.size,0);h.dom.window.close();
}
// If the browser throttles frame callbacks, audio ended still completes exactly
// the current gesture before the next segment starts. Error/silent fallback is
// also segment-local, with an idle intro and no overlapping phases.
for(const exp of [1,2])for(const judgment of ['fault_first','carelessness_first'])for(const failure of [false,true]){
 const h=setup(exp,'children',judgment,'left',null,1,false),doc=h.doc,first=judgment.split('_')[0];
 const t=h.pilot.warmup.find(t=>t._debugLabel===first+': explanation');t.screen(doc.querySelector('#target'),h.psych);
 for(const part of ['intro','large','small','zero']){
  const audio=h.audios.at(-1);assert(audio.src.endsWith(clips[exp][first+'_explanation_'+part]));assert(doc.querySelector('.bar-demo-pointer').hidden);assert.equal(doc.querySelector('#rating-p-wrap').style.width,'0%');
  if(failure){audio.dispatchEvent(new h.dom.window.Event('error'));const initial=h.audios.length;assert.equal(h.audios.length,initial);if(part==='intro')assert(![...h.timers].some(([id])=>h.timerDelays.get(id)===40));for(let i=0;i<1000&&h.audios.at(-1)===audio&&doc.querySelector('#rating-continue').disabled;i++)h.tick();}
  else {audio.dispatchEvent(new h.dom.window.Event('playing'));assert(doc.querySelector('.bar-demo-pointer').hidden);audio.dispatchEvent(new h.dom.window.Event('ended'));if(part!=='intro'){assert.equal(doc.querySelector('[data-demonstration]').dataset.demoState,'complete');assert.equal(doc.querySelector('#rating-p-wrap').style.width,(part==='large'?85:part==='small'?25:0)+'%');}assert(h.audios.at(-1)===audio);const pending=[...h.timers].find(([id])=>h.timerDelays.get(id)===0);assert(pending);h.timers.delete(pending[0]);pending[1]();}
 }
 assert(!doc.querySelector('#rating-continue').disabled);assert(doc.querySelector('.bar-demo-pointer').hidden);doc.querySelector('#rating-continue').click();assert.equal(h.timers.size,0);h.dom.window.close();
}
// Appreciation lasts at least 2.8 seconds (4 seconds final), and never cuts narration short.
for(const key of ['thank_you_practice','ready','thank_you_case_1','thank_you_case_5','thank_you_case_8'])for(const mute of [false,true]){
 const h=setup(1,'children','fault_first','left',null,1,mute),t=h.pilot.timeline.find(t=>t.data.phase===key||t.data.phase==='thank_you'&&t.data.completed_case_position===Number(key.split('_').at(-1)));
 t.screen(h.doc.querySelector('#target'),h.psych);assert(h.doc.querySelector('.encouragement'));const before=h.finished.length;
 if(mute){h.tick();h.tick();}else{h.advanceClock(6000);assert.equal(h.finished.length,before);h.audios.at(-1).dispatchEvent(new h.dom.window.Event('ended'));const timer=[...h.timers].find(([id])=>h.timerDelays.get(id)===0);assert(timer);h.timers.delete(timer[0]);timer[1]();}
 const hold=[...h.timers].map(([id])=>h.timerDelays.get(id)).filter(ms=>ms<15000);assert.equal(hold.length,1);if(mute)assert(hold[0]>=(key==='thank_you_case_8'?3950:2750)&&hold[0]<=(key==='thank_you_case_8'?4000:2800));else assert.equal(hold[0],500);
 assert.equal(h.finished.length,before);h.tick();assert.equal(h.finished.length,before+1);h.dom.window.close();
}
// Every narrated-slide visual flow traverses all slides in mute mode.
for(const exp of [1,2])for(const audience of ['adults','children']){
 const h=setup(exp,audience,'fault_first','left');
 for(const t of h.pilot.timeline.filter(t=>t.data.phase==='story')){
  h.render(t);const s=h.pilot.scenarios.find(s=>s.scenario_id===t.data.scenario_id);const before=h.finished.length;
  for(const slide of s.slides){assert(h.doc.querySelector('.story-image').src.endsWith(slide.image));h.doc.querySelector('#story-next').click();}
  assert.equal(h.finished.length,before+1);assert.equal(h.finished.at(-1).story_slide_rts.length,s.slides.length);
 }
 h.dom.window.close();
}
// Kai's movement continuation stays visible without narrating its repeated
// caption again. Other captions (including Ruby's Exp 2 line) remain narrated.
for(const exp of [1,2])for(const judgment of ['fault_first','carelessness_first'])for(const side of ['left','right']){
 const h=setup(exp,'children',judgment,side,null,1,false),s=h.pilot.scenarios.find(s=>s.scenario_key==='negligence_phone');
 const story=h.pilot.timeline.find(t=>t.data.scenario_key===s.scenario_key&&t.data.phase==='story');
 const take=ms=>{const timer=[...h.timers].find(([id])=>h.timerDelays.get(id)===ms);assert(timer,'Missing story dwell timer '+ms);h.timers.delete(timer[0]);timer[1]();};
 const playedPaths=[];story.screen(h.doc.querySelector('#target'),h.psych);
 for(const slide of s.slides){
  assert(h.doc.querySelector('.story-image').src.endsWith(slide.image));
  if(slide.narration_repeat_of){
   assert.equal(exp,1);assert.equal(slide.slide_number,6);assert.equal(h.audios.length,5);
   assert.equal(h.doc.querySelector('.story-image').alt,'Kai is walking and staring at his phone.');
   h.advanceClock(1000);assert(h.doc.querySelector('.story-image').src.endsWith(slide.image));
   take(2700); // Same 2.4-second clip duration + existing 300 ms transition.
  }else{
   const a=h.audios.at(-1);assert(a.src.endsWith(slide.audio));playedPaths.push(a.src);
   Object.defineProperty(a,'duration',{configurable:true,value:2.4});a.currentTime=2.4;
   a.dispatchEvent(new h.dom.window.Event('ended'));take(300);
  }
 }
 assert.equal(playedPaths.filter(src=>src.endsWith('negligence_phone_05.m4a')).length,1);
 assert.equal(playedPaths.filter(src=>src.endsWith('negligence_phone_06.m4a')).length,exp===1?0:1);
 assert.equal(h.finished.length,1);assert.equal(h.finished[0].story_slide_rts.length,s.slides.length);
 h.dom.window.close();
}
// Narration ended/error paths cannot strand welcome or narrated stories.
for(const exp of [1,2]){
 const h=setup(exp,'children','fault_first','left',null,1,false);
 const welcome=h.pilot.warmup[0];welcome.screen(h.doc.querySelector('#target'),h.psych);assert(!h.doc.querySelector('#text-continue'));assert.equal(h.finished.length,0);
 h.audios.at(-1).dispatchEvent(new h.dom.window.Event('ended'));h.tick();h.tick();assert.equal(h.finished.at(-1).audio_failures.length,0);
 welcome.screen(h.doc.querySelector('#target'),h.psych);h.audios.at(-1).dispatchEvent(new h.dom.window.Event('error'));h.tick();h.tick();assert(h.finished.at(-1).audio_failures.includes('warmup_welcome'));
 const story=h.pilot.timeline.find(t=>t.data.phase==='story');story.screen(h.doc.querySelector('#target'),h.psych);const s=h.pilot.scenarios[0];
 for(let i=0;i<s.slides.length;i++){assert(h.doc.querySelector('.story-image').src.endsWith(s.slides[i].image));h.audios.at(-1).dispatchEvent(new h.dom.window.Event('ended'));h.tick();}
 assert.equal(h.finished.at(-1).story_slide_rts.length,s.slides.length);h.dom.window.close();
}
// Generated platform scripts execute the same task and six retained wrapper frames.
for(const exp of [1,2]){
 const h=setup(exp,'children','fault_first','right');Object.assign(h.context,{initJsPsych:()=>({...h.psych,run(){},data:{get:()=>({values:()=>[]})}}),console:{log(){}},chsRecord:new Proxy({},{get:(o,k)=>k}),jsPsychHtmlButtonResponse:'html',jsPsychHtmlKeyboardResponse:'keyboard'});
 vm.runInContext(fs.readFileSync(__dirname+`/generated/experiment${exp}-chs-pilot.js`,'utf8'),h.context);
 assert.equal(vm.runInContext('chsTimeline.length',h.context),51);
 assert.equal(vm.runInContext('pilot.review',h.context),false);
 const buildReport=JSON.parse(fs.readFileSync(__dirname+`/generated/experiment${exp}-chs-pilot.json`,'utf8'));
 assert.equal(vm.runInContext('pilot.mute',h.context),buildReport.qa_only);
 assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(chsTimeline.slice(0,4).map(t=>t.type))',h.context)),['VideoConfigPlugin','VideoConsentPlugin','html','StartRecordPlugin']);
 assert.equal(vm.runInContext('instructions.choices[0]',h.context),'Start ▶');
 assert.equal(vm.runInContext('chsTimeline[4] === timeline[0]',h.context),true);
 assert.equal(vm.runInContext('chsTimeline.at(-2).type',h.context),'StopRecordPlugin');
 assert.equal(vm.runInContext('chsTimeline.at(-1).data.trial_type',h.context),'debrief');
 assert(!fs.readFileSync(__dirname+`/generated/experiment${exp}-chs-pilot.js`,'utf8').includes('enable-study-sound'));
 h.dom.window.close();
}
// Adult entry-point submission and demographics are tested with an inert service.
for(const exp of [1,2])for(const review of [false,true]){
 const h=setup(exp,'adults','fault_first','left');let config,payload=null;const demoRows=[{is_demographic:true,age:30,state:'New York'}];
 Object.assign(h.context,{initJsPsych:c=>(config=c,{...h.psych,run(){},data:{get:()=>({filter:()=>({values:()=>demoRows})})}}),jsPsychHtmlButtonResponse:'html',proliferate:{submit:p=>payload=p},console:{log(){}}});
 h.context.TORT_LOCAL_OPTIONS={review,mute:true};
 // The actual entry uses jspsych-target; align the fixture display with that ID.
 h.doc.querySelector('#target').id='jspsych-target';
 vm.runInContext(fs.readFileSync(root+'/code/shared/js/pilot-adult-forms.js','utf8'),h.context);
 vm.runInContext(fs.readFileSync(root+`/code/experiments/experiment${exp}/adults/js/experiment.js`,'utf8'),h.context);
 const task=vm.runInContext('pilot',h.context);
 for(const t of task.timeline.filter(t=>t.data.scenario_id)){
  if(t.data.phase==='story')continue;
  h.render(t);
  if(t.data.phase==='cookies')h.doc.querySelector('#gate-no').click();
  else{h.bars(63,17);h.doc.querySelector('#rating-continue').click();}
 }
 vm.runInContext('participantConsented=true',h.context);config.on_finish();
 if(review)assert.equal(payload,null);else{assert.equal(payload.trials.length,8);assert.equal(payload.demographics.length,1);assert.deepEqual(payload.trials.map(r=>r.presentation_position),[1,2,3,4,5,6,7,8]);assert(payload.trials.every(r=>r.fault_rating_p===63&&r.carelessness_rating_v===17&&r.move_cookies_response==='no'&&r.valid_participant_data===true));}
 h.dom.window.close();
}
// V3 practices auto-advance only for children, after narration and pointer release.
for(const exp of [1,2])for(const judgment of ['fault_first','carelessness_first'])for(const side of ['left','right']){
 const h=setup(exp,'children',judgment,side,null,1,false),{doc}=h;
 const practice=h.pilot.warmup.find(t=>t._debugLabel.endsWith('practice large'));
 practice.screen(doc.querySelector('#target'),h.psych);
 h.audios.at(-1).dispatchEvent(new h.dom.window.Event('playing'));
 h.audios.at(-1).dispatchEvent(new h.dom.window.Event('ended'));h.tick();
 h.audios.at(-1).dispatchEvent(new h.dom.window.Event('playing'));
 h.bars(80,0);h.tick();assert.equal(h.finished.length,0,'Correct response must wait for narration');
 h.audios.at(-1).dispatchEvent(new h.dom.window.Event('ended'));h.tick();
 const bar=doc.querySelector('#rating-v-track');h.event(bar,'pointerdown',0);h.tick();
 assert.equal(h.finished.length,0,'Practice must not finish during an active gesture');
 h.event(bar,'pointerup',0);h.tick();assert.equal(h.finished.length,1);assert.equal(h.finished[0].deliberate_p,true);
 assert.equal(h.finished[0][practice.data.phase+'_rating_p'],80);
 h.dom.window.close();
 const c=setup(exp,'children',judgment,side,null,1,false);
 c.pilot.warmup.find(t=>t._debugLabel==='Cookie jar').screen(c.doc.querySelector('#target'),c.psych);
 c.audios.at(-1).dispatchEvent(new c.dom.window.Event('playing'));
 c.drag(0,'v');c.tick();assert.equal(c.finished.length,0,'Non-target-only response remains invalid');
 c.drag(0,'jar');c.tick();assert.equal(c.finished.length,0,'Correct cookie response must wait for narration');
 c.audios.at(-1).dispatchEvent(new c.dom.window.Event('ended'));c.tick();c.tick();
 assert.equal(c.finished.length,1);assert.equal(c.finished[0].cookies_from_p_to_c,1);c.dom.window.close();
 for(const audience of ['adults','children']){
  const m=setup(exp,audience,judgment,side),main=m.pilot.timeline.find(t=>t.data.scenario_key&&t.data.phase==='cookies');
  m.render(m.pilot.warmup[0]);const expected=side==='left'?['v','p','jar']:['jar','p','v'];
  assert.deepEqual([...m.doc.querySelectorAll('.allocation-person')].map(n=>n.dataset.role),expected);
  m.render(main);assert.deepEqual([...m.doc.querySelectorAll('.allocation-person')].map(n=>n.dataset.role),expected);
  const before=m.finished.length;assert.equal(m.doc.querySelectorAll('.cookie').length,8);
  m.doc.querySelector('#gate-yes').click();m.tick();m.tick();m.drag(0,'jar');m.tick();m.tick();
  assert.equal(m.finished.length,before,'Main allocation still requires Confirm');
  m.doc.querySelector('#confirm-btn').click();assert.equal(m.finished.length,before+1);
  const rating=m.pilot.timeline.find(t=>t.data.scenario_key&&t.data.phase==='fault');m.render(rating);
  const b=m.finished.length;m.bars(80,0);m.tick();m.tick();assert.equal(m.finished.length,b,'Main rating still requires Continue');
  m.doc.querySelector('#rating-continue').click();assert.equal(m.finished.length,b+1);m.dom.window.close();
 }
}
// Sampling checks: assignments have both levels and approximately equal probabilities.
let faultFirst=0,left=0,orders=new Set();
for(let seed=10000;seed<10500;seed++){const h=setup(1,'children',null,null,null,seed);faultFirst+=h.pilot.assignments.judgment_order==='fault_first';left+=h.pilot.assignments.victim_side==='left';orders.add(h.pilot.assignments.scenario_presentation_order);h.dom.window.close();}
assert(faultFirst>=200&&faultFirst<=300);assert(left>=200&&left<=300);assert(orders.size>450);
// Centered markup and standard progress must not regress into the rejected split layout.
assert(!engine.includes('allocation-layout')&&!engine.includes('welcome-layout'));
assert(!engine.includes('pilot-progress-character')&&!engine.includes('function updateProgress'));
for(const exp of [1,2])for(const audience of ['adults','children']){
 const name=audience==='adults'?'experiment.js':'chs-task.js',source=fs.readFileSync(root+`/code/experiments/experiment${exp}/${audience}/js/${name}`,'utf8');
 assert(source.includes('show_progress_bar:true'));assert(!source.includes('pilot.updateProgress'));
}
// Manifest, runtime asset integrity, exact captions and generated code exclusions.
for(const exp of [1,2]){const adultJar=fs.readFileSync(root+`/code/experiments/experiment${exp}/adults/images/pilot_cookie_jar_empty.png`),childJar=fs.readFileSync(root+`/code/experiments/experiment${exp}/children/images/pilot_cookie_jar_empty.png`);assert(adultJar.equals(childJar));}
const narration=JSON.parse(fs.readFileSync(root+'/docs/narration/manifest.json')).clips;assert.equal(new Set(narration.map(c=>c.text)).size,narration.length);
for(const s of scenarios)for(const slide of s.slides){
 assert(fs.existsSync(root+`/code/experiments/experiment${s.experiment}/adults/`+slide.image));assert(fs.existsSync(root+`/code/experiments/experiment${s.experiment}/children/`+slide.image));
 const narrated=slide.narration_repeat_of?s.slides.find(part=>part.slide_number===slide.narration_repeat_of):slide;
 assert(narrated);assert.equal(narrated.text,slide.text);
 if(slide.narration_repeat_of)assert(narrated.slide_number<slide.slide_number);
 assert(narration.some(c=>c.text===narrated.text.replace(/\s+/g,' ').trim()&&c.destinations.includes(`code/experiments/experiment${s.experiment}/children/`+narrated.audio)));
}
for(const exp of [1,2]){const code=fs.readFileSync(__dirname+`/generated/experiment${exp}-chs-pilot.js`,'utf8');assert(!['Panel On/Off','pilot-review-panel','TORT_LOCAL_OPTIONS','jumpTo'].some(x=>code.includes(x)));new vm.Script(code);}
const forms=fs.readFileSync(root+'/code/shared/js/pilot-adult-forms.js','utf8');let context={jsPsychHtmlButtonResponse:'html',document:(new JSDOM()).window.document};vm.createContext(context);vm.runInContext(forms,context);const f=context.buildPilotAdultForms({},()=>{});const formDom=new JSDOM(f.demographicsScreen.stimulus);assert.equal(formDom.window.document.querySelectorAll('#demo-state option').length,51);assert(formDom.window.document.querySelector('#demo-state').required);assert(!f.feedbackScreen.on_load.toString().includes('if (!val)'));
const audioDestinations=narration.flatMap(c=>c.destinations);
const missingAudio=audioDestinations.filter(rel=>!fs.existsSync(path.join(root,rel)));
const report={first_construct_demo:{conditions:['Exp 1 fault first','Exp 1 carelessness first','Exp 2 fault first','Exp 2 carelessness first'],both_spatial_orders:true,media_clock_fixtures:8,throttled_and_error_fixtures:8,opening_idle:true,no_child_autoplay:true,second_construct_no_demo:true},narration_files:{expected:audioDestinations.length,installed:audioDestinations.length-missingAudio.length,missing:missingAudio},matrix:results,randomization:{samples:500,fault_first:faultFirst,victim_left:left,unique_orders:orders.size},warmup_screens:{adults:8,children:10},task_screens:{adults_with_forms:44,children_without_CHS:45,children_with_CHS:51},pointer_tests:'Synthetic Pointer Events for mouse/touch/pen; physical touchscreen and live CHS verification remain separate.',audio:(missingAudio.length?`${missingAudio.length} final recording destinations absent; `:`All ${audioDestinations.length} final recording destinations present; `)+'QA mute flow and build gates tested; 24 cookie-explanation fixtures verify child-only identifiers, full-duration audio highlights without active-playback timers, slow silent/error/timeout placeholders and neutral completion; two buffering/resume/stall fixtures pass.',ui_refinements:'Undo absent in participant and review study displays; direct return works; aligned top portraits/current jar above three identical receiving areas; literal starting states, deterministic accumulation and identical snap/pulse feedback; blue scales use .08 + .92 × value/100 nonzero opacity and zero without fill; adult explanations have no demo; standard jsPsych horizontal progress restored; centered welcome and allocation markup restored from the preceding layout; receiving areas are identical fixed 180 × 180 neutral circles across welcome, warmup, gate and allocation, with no audience or screen size overrides, a compact centered 672 px container / 230 px center spacing, and up to 25 px radial drop tolerance capped to prevent overlap; first-explanation three centered full text blocks without headings and child pointer drags preserve a lot/little/none, record no responses; child gestures are gated by individual clip playback and completion, with an idle intro, segment-local silent/error fallback and no child autoplay sequence; 2.8/4 second appreciation minimum with narration completion verified.'};
function checkChildParticipantEntries(){
 const outcomes=[];
 for(const exp of [1,2]){
  const h=setup(exp,'children','fault_first','left',null,1,false,false),doc=h.doc;
  const html=fs.readFileSync(root+`/code/experiments/experiment${exp}/children/index.html`,'utf8');
  assert(!/pilot-review|pilot-entry|pilot-mute|pilot-child-entry|Start local review|local review mode|enable-study-sound/i.test(html));
  assert(!/onAudioBlocked|dismissPermission|enable-study-sound/.test(engine));
  let runTimeline=null;
  h.context.initJsPsych=()=>({...h.psych,run:t=>{runTimeline=t;t[0].screen(doc.querySelector('#target'),h.psych);},data:{get:()=>({values:()=>[]})}});
  h.context.console={log(){}};
  vm.runInContext(fs.readFileSync(root+`/code/experiments/experiment${exp}/children/js/chs-task.js`,'utf8'),h.context);
  const startup=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInContext(startup,h.context);
  assert.equal(runTimeline.length,45);assert.equal(runTimeline[0]._debugLabel,'Welcome');
  assert.equal(vm.runInContext('pilot.review',h.context),false);assert.equal(vm.runInContext('pilot.mute',h.context),false);
  assert.equal(doc.querySelector('h1').textContent,'Welcome!');assert.equal(h.audios.length,1);
  assert.equal(h.finished.length,0);assert(!doc.querySelector('#pilot-review-panel'));assert(!doc.querySelector('#enable-study-sound'));
  assert(h.audios[0].src.endsWith('audio/warmup_welcome.m4a'));
  h.audios[0].dispatchEvent(new h.dom.window.Event('playing'));
  h.audios[0].dispatchEvent(new h.dom.window.Event('ended'));h.tick();h.tick();
  assert.equal(h.finished.length,1);assert.equal(h.finished[0].audio_failures.length,0);
  outcomes.push({experiment:exp,host_audio_already_enabled:true,automatic_start:true,normal_welcome:true,review:false,mute:false,no_sound_button:true,passed:true});
  h.dom.window.close();
 }
 return outcomes;
}
report.child_participant_entries=checkChildParticipantEntries();
fs.writeFileSync(__dirname+'/generated/workspace-behavior.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
