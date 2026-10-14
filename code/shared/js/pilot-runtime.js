/* Revised pilot mechanics, shared by both experiments and audiences.
   Task-specific configuration supplies captions, assets and narration wording. */
var TortPilot = (() => {
  'use strict';
  const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const scaleFill = value => value > 0 ? `rgba(76, 120, 168, ${.08 + .92*value/100})` : 'transparent';
  const shuffle = (a, random = Math.random) => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  function stored(key, generate, valid) {
    try { const v = JSON.parse(sessionStorage.getItem(key)); if (valid(v)) return v; } catch (_) { /* fresh assignment */ }
    const v = generate();
    sessionStorage.setItem(key, JSON.stringify(v));
    return v;
  }
  class ScreenPlugin {
    constructor(jsPsych) { this.jsPsych = jsPsych; }
    trial(display, trial) { trial.screen(display, this.jsPsych); }
  }
  ScreenPlugin.info = {name:'tort-pilot-screen', parameters:{screen:{type:jsPsychModule.ParameterType.FUNCTION, default:undefined}}};
  const css = `
  .pilot{font:18px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#333;width:min(1180px,calc(100vw - 32px));max-width:100%;margin:auto;padding:18px;box-sizing:border-box;text-align:center}
  .pilot h1{font-size:46px;margin:10px}.pilot .prompt{font-size:22px;margin:12px auto;max-width:1050px}.pilot button{font:inherit;padding:10px 24px;border:1px solid #888;border-radius:7px;background:white;color:#333;cursor:pointer;margin:6px}.pilot button:disabled{opacity:.4;cursor:default}
  .pilot .story-image{max-width:100%;width:960px;max-height:72vh;object-fit:contain}.pilot .reminder{max-width:100%;width:390px;max-height:23vh;object-fit:contain}
  .pilot .allocation-board{--head-height:120px;--zone-size:180px;--cookie-size:38px;--cookie-font:32px;--cookie-gap:4px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;width:min(672px,calc(100vw - 68px));margin:18px auto}
  .pilot .allocation-person{display:grid;grid-template-rows:var(--head-height) 32px var(--zone-size);padding:12px;row-gap:8px;min-width:0;box-sizing:border-box;border:1px solid transparent;border-radius:20px;background:transparent}.pilot .station-portrait{display:flex;align-items:end;justify-content:center}.pilot .station-portrait img{width:112px;height:112px;max-width:100%;object-fit:contain}.pilot .person-name{font-size:20px;font-weight:600;line-height:28px;align-self:center}
  .pilot .cookie-plate{position:relative;justify-self:center;width:var(--zone-size);height:var(--zone-size);box-sizing:border-box;border:1px solid #98A5B0;border-radius:50%;background:#F5F6F7;background-image:radial-gradient(ellipse at 50% 32%,#fdfefe 0%,#f7f8f9 62%,#edf0f2 100%);box-shadow:inset 0 1px 0 #ffffffe6,inset 0 0 0 4px #ffffff80,inset 0 4px 9px #3341550d,0 3px 8px #3341550f;transition:background-color .12s,border-color .12s,box-shadow .12s}.pilot .cookie-plate:before{content:"";position:absolute;inset:9px;border:1px solid #d4dbe1;border-radius:50%;box-shadow:inset 0 2px 5px #3341550c,0 1px 0 #ffffffb3;pointer-events:none;transition:border-color .12s,box-shadow .12s}.pilot .jar-picture{height:112px;width:112px;max-width:100%;pointer-events:none}.pilot .jar-picture img{width:100%;height:100%;object-fit:contain}.pilot .cookie-content{position:absolute;left:0;right:0;margin:auto;top:calc(50% - 1.5*var(--cookie-size) - var(--cookie-gap));display:grid;align-content:center;grid-template-columns:repeat(6,calc((var(--cookie-size) - var(--cookie-gap))/2));grid-auto-rows:var(--cookie-size);gap:var(--cookie-gap);width:calc(3*var(--cookie-size) + 2*var(--cookie-gap));height:calc(3*var(--cookie-size) + 2*var(--cookie-gap));z-index:1;pointer-events:none}.pilot .cookie{display:inline-flex;width:var(--cookie-size);height:var(--cookie-size);align-items:center;justify-content:center;font-size:var(--cookie-font);border:0;background:transparent;padding:0;margin:0;user-select:none;-webkit-user-select:none;pointer-events:auto;filter:drop-shadow(0 1px 1px #33415526)}.pilot .cookie:disabled{opacity:1}.pilot .cookie.movable{touch-action:none;cursor:grab}.pilot .cookie.dragging{position:fixed;z-index:1000;pointer-events:none;cursor:grabbing}.pilot .cookie-plate.drop-hover{border-color:#4C78A8;background:#FBFDFF;background-image:radial-gradient(ellipse at 50% 32%,#ffffff 0%,#fbfdff 62%,#f1f6fb 100%);box-shadow:inset 0 0 0 1px #4C78A8,inset 0 1px 0 #ffffffe6,0 0 0 4px #4c78a81f,0 0 18px #4c78a833,0 4px 10px #33415514}.pilot .cookie-plate.drop-hover:before{border-color:#b6cbde;box-shadow:inset 0 2px 5px #4c78a814,0 1px 0 #ffffffb3}.pilot .cookie-plate.drop-pulse{animation:pilot-drop-pulse .22s ease-out}.pilot .allocation-actions{min-height:60px}
  @keyframes pilot-drop-pulse{from{border-color:#4C78A8;box-shadow:inset 0 0 0 1px #4C78A8,0 0 0 4px #4c78a81f,0 0 18px #4c78a833}to{border-color:#98A5B0;box-shadow:inset 0 1px 0 #ffffffe6,inset 0 0 0 4px #ffffff80,inset 0 4px 9px #3341550d,0 3px 8px #3341550f}}
  .pilot .allocation-person.explanation-highlight{border-color:#4C78A8;background:rgba(76,120,168,.05)}.pilot .explanation-highlight .cookie-plate{border-color:#4C78A8;background:rgba(76,120,168,.08)}
  .pilot .scale-instructions{display:flex;flex-direction:column;gap:16px;max-width:780px;margin:16px auto 24px;text-align:center}.pilot .scale-instructions p{font-size:20px;line-height:1.5;margin:0;padding:0}
  .pilot .two-scale-row{display:flex;justify-content:center;align-items:flex-end;gap:clamp(24px,8vw,130px);margin:18px auto}.pilot .two-scale-col{display:flex;flex-direction:column;align-items:center;gap:10px;min-width:0}.pilot .two-scale-portrait{height:110px;object-fit:contain}.pilot .two-scale-name{font-size:20px;font-weight:600}
  .pilot .two-scale-track{position:relative;width:min(36vw,480px);height:120px;user-select:none;touch-action:none}.pilot .two-scale-track-bg{position:absolute;inset:0;background:#F3F6F8;clip-path:polygon(0% 64%,100% 0%,100% 100%,0% 100%);pointer-events:none}.pilot .two-scale-track.draggable{cursor:pointer}.pilot .two-scale-outline{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}.pilot .two-scale-fill-wrap{position:absolute;left:0;top:0;bottom:0;width:0;overflow:hidden;pointer-events:none}.pilot .two-scale-fill{position:absolute;left:0;top:0;width:min(36vw,480px);height:120px;clip-path:polygon(0% 64%,100% 0%,100% 100%,0% 100%);pointer-events:none}
  .pilot .bar-demo-pointer{position:absolute;width:42px;height:54px;pointer-events:none;z-index:2;transform:translate(-2px,-2px);filter:drop-shadow(0 2px 3px #0005)}.pilot .bar-demo-pointer svg{display:block;width:42px;height:54px}.pilot .bar-demo-pointer:before{content:'';position:absolute;width:17px;height:17px;box-sizing:border-box;border:3px solid #4C78A8;border-radius:50%;background:#fff8;left:-7px;top:-7px;opacity:0}.pilot .bar-demo-pointer[data-gesture="pressed"]:before,.pilot .bar-demo-pointer[data-gesture="dragging"]:before{opacity:1}
  .pilot .two-scale-pct{font-size:14px;color:#555;min-height:18px;margin-top:4px}.pilot .sparkles{font-size:clamp(80px,12vw,120px);margin:28px auto;animation:pilot-sparkle 1.4s ease-in-out infinite}.pilot.encouragement{padding-top:40px;padding-bottom:40px}.pilot.encouragement .prompt{font-size:clamp(32px,4vw,46px);font-weight:600;line-height:1.3;max-width:900px}.pilot .status{font-size:16px;min-height:24px;color:#555}.pilot .welcome-copy{max-width:760px;margin:22px auto}.pilot .welcome-copy .prompt{font-size:20px;line-height:1.5;margin:14px auto}.pilot .welcome-board{margin-top:24px}
  /* Conservative fit adjustments retain the preceding centered composition. */
  .pilot .status:empty{display:none}
  .pilot.allocation-response,.pilot.welcome-screen,.pilot.rating-response{padding:10px 18px}
  .pilot.allocation-response .prompt{margin:8px auto}
  .pilot.allocation-response .allocation-board{--head-height:112px;margin:8px auto}
  .pilot.allocation-response .allocation-actions{min-height:48px}
  .pilot.allocation-response .allocation-actions button{margin:4px;padding:8px 24px}
  .pilot.welcome-screen h1{margin:6px}
  .pilot.welcome-screen .welcome-board{margin-top:8px}
  .pilot.welcome-screen .allocation-board{--head-height:112px;margin:8px auto}
  .pilot.welcome-screen .welcome-copy{margin:8px auto}
  .pilot.welcome-screen .welcome-copy .prompt{margin:8px auto;line-height:1.4}
  .pilot.rating-response .prompt{margin:8px auto}
  .pilot.rating-response .two-scale-row{margin:12px auto}
  .pilot.rating-response .scale-instructions{margin:8px auto 12px;gap:12px}
  #jspsych-progressbar-container{padding:2px 0;margin-bottom:4px}
  /* Final visual finish: retain all established dimensions and spacing. */
  .jspsych-display-element{background:#fff;color:#334155}
  .pilot{color:#334155}
  .pilot h1{color:#1E293B;letter-spacing:-.015em}
  .pilot .prompt,.pilot .scale-instructions p{color:#334155}
  .pilot .person-name,.pilot .two-scale-name{color:#263747}
  .pilot .status,.pilot .two-scale-pct{color:#64748B}
  .pilot button:not(.cookie),.jspsych-display-element .jspsych-btn{color:#334155;background:#fff;border-color:#B6C2CC;border-radius:10px;box-shadow:0 1px 2px #3341550a,0 2px 5px #33415508;transition:background-color .12s,border-color .12s,box-shadow .12s}
  @media(hover:hover){.pilot button:not(.cookie):not(:disabled):hover,.jspsych-display-element .jspsych-btn:not(:disabled):hover{background:#F4F8FC;border-color:#4C78A8;box-shadow:0 2px 6px #33415512}}
  .pilot button:not(.cookie):not(:disabled):active,.jspsych-display-element .jspsych-btn:not(:disabled):active{background:#EDF3F8;border-color:#4C78A8;box-shadow:inset 0 1px 3px #33415512}
  .pilot button:not(.cookie):focus-visible,.jspsych-display-element .jspsych-btn:focus-visible{outline:2px solid #4C78A8;outline-offset:3px}
  .pilot button:not(.cookie):disabled,.jspsych-display-element .jspsych-btn:disabled{box-shadow:none;border-color:#CBD5DE;background:#F8FAFC}
  .pilot .reminder{display:block;width:auto;height:auto;max-width:min(390px,100%);margin:0 auto;background:#fff;border-radius:8px;outline:1px solid #D8E0E7;outline-offset:0;box-shadow:0 3px 10px #3341550d}
  #jspsych-progressbar-container{color:#64748B;background:#fff;border-bottom-color:#E2E8ED}
  #jspsych-progressbar-container span{font-weight:500}
  #jspsych-progressbar-outer{background:#E9EEF2;border-radius:7px;box-shadow:inset 0 0 0 1px #D9E1E8,inset 0 1px 2px #33415508;overflow:hidden}
  #jspsych-progressbar-inner{background:#8DA5BA;border-radius:7px}
  #jspsych-content #consent-scroll{background:#F3F6F8!important;border-radius:10px!important;outline:1px solid #D8E0E7;box-shadow:0 2px 8px #3341550a}
  @keyframes pilot-sparkle{50%{transform:scale(1.12);opacity:.7}}@media(prefers-reduced-motion:reduce){.pilot .sparkles,.pilot .cookie-plate.drop-pulse{animation:none}}@media(max-width:600px){.pilot{padding:10px;font-size:16px}.pilot .prompt{font-size:18px}.pilot .allocation-board{--head-height:78px;--cookie-size:clamp(18px,calc((100vw - 150px)/12),26px);--cookie-font:clamp(18px,calc((100vw - 150px)/12),24px);--cookie-gap:3px;gap:6px;min-width:582px;width:calc(100vw - 52px)}.pilot .allocation-person{padding:4px;border-radius:14px;grid-template-rows:var(--head-height) 28px var(--zone-size)}.pilot .station-portrait img{width:74px;height:74px}.pilot .jar-picture{width:74px;height:74px}.pilot .person-name{font-size:16px;line-height:24px}.pilot .scale-instructions p{font-size:17px;padding:0}.pilot .two-scale-portrait{height:80px}.pilot .reminder{max-height:20vh}.pilot .welcome-copy .prompt{font-size:18px}}
  `;
  function addStyles() { if (!document.getElementById('pilot-styles')) { const s = document.createElement('style'); s.id = 'pilot-styles'; s.textContent = css; document.head.appendChild(s); } }
  function create(options) {
    addStyles();
    const {experiment, audience, scenarios, texts, clips, demoTiming = {}, assetRoot = '', review = false, mute = false} = options;
    const child = audience === 'children';
    const prefix = `tort_pilot_v3_exp${experiment}_${audience}_`;
    const judgmentOrder = stored(prefix+'judgment_order', () => Math.random() < .5 ? 'fault_first' : 'carelessness_first', v => ['fault_first','carelessness_first'].includes(v));
    const victimSide = stored(prefix+'victim_side', () => Math.random() < .5 ? 'left' : 'right', v => ['left','right'].includes(v));
    const ids = scenarios.map(s => s.scenario_id);
    const order = stored(prefix+'scenario_order', () => shuffle(ids), v => Array.isArray(v) && v.length === 8 && new Set(v).size === 8 && v.every(id => ids.includes(id)));
    const ordered = order.map(id => scenarios.find(s => s.scenario_id === id));
    const characterOrder = victimSide === 'left' ? ['V','P','JAR'] : ['JAR','P','V'];
    const ratingOrder = victimSide === 'left' ? ['v','p'] : ['p','v'];
    const assignments = {judgment_order:judgmentOrder, victim_side:victimSide, trash_on_left:victimSide==='right', character_order:characterOrder.join(','), scenario_presentation_order:order.join(','), experiment, audience, study_version:'pilot_v3_carelessness', outcome:'zero'};
    const completed = new Map();
    const path = name => assetRoot+name;
    const warm = {p_name:'Michael',v_name:'Claire',p_img:'michael.png',v_img:'claire.png',p_after:3};
    function metadata(s, position, phase, practice = false) {
      return {...assignments, is_practice:practice, review_mode:review, valid_participant_data:!review,
        ...(s && s.scenario_key ? {scenario_id:s.scenario_id,scenario_key:s.scenario_key,harm_type:s.harm_type,p_name:s.p_name,v_name:s.v_name,event_title:s.event_title,event_text:s.event_text,p_initial:8,p_after:8,harm_amount:2,v_initial:2,v_after_harm:0} : {}),
        presentation_position:position || null, phase};
    }
    function trial(label, data, draw) {
      return {_debugLabel:label, type:ScreenPlugin, data, screen(display, psych) {
        let ended = false; const cleaners = []; const started = performance.now(); const audioFailures = [];
        const ctx = {display,psych,data,audioFailures,
          cleanup:f => cleaners.push(f),
          later(f, ms) { const id = setTimeout(() => { if (!ended) f(); }, ms); cleaners.push(() => clearTimeout(id)); return id; },
          listen(el, name, fn, opts) { el.addEventListener(name,fn,opts); cleaners.push(() => el.removeEventListener(name,fn,opts)); },
          finish(row = {}) {
            if (ended) return; ended = true; cleaners.splice(0).forEach(f => f());
            let result = {...data, rt:Math.round(performance.now()-started), audio_failures:audioFailures.slice(), ...row};
            if (data.scenario_key) { result[data.phase+'_rt']=result.rt; const key=data.presentation_position; const merged=completed.get(key)||{}; Object.assign(merged,result); completed.set(key,merged); if(data.phase === (judgmentOrder==='fault_first'?'carelessness':'fault') && !data.is_practice) result={...merged,case_rt:['story','cookies','fault','carelessness'].reduce((sum,phase)=>sum+(merged[phase+'_rt']||0),0),row_type:'case_summary',is_case_summary:true}; }
            psych.finishTrial(result);
          }
        };
        draw(ctx);
      }};
    }
    function speak(ctx, key, after = () => {}, hold = 0, onStart = () => {}) {
      let done = false, began = false, audio, watchdog;
      const start = (fallback = false) => {if(done||began)return;began=true;onStart(fallback,audio);};
      // Missing/blocked audio still runs the visual phase before advancing.
      const complete = () => { if(done) return; start(true); done=true; clearTimeout(watchdog); if(audio) audio.pause(); ctx.later(after,hold); };
      if (!child || mute) { ctx.later(complete,0); return () => {done=true;}; }
      audio = new Audio(path(clips[key] || `audio/${key}.m4a`)); audio.preload='auto';
      const fail = () => {if(done)return;ctx.audioFailures.push(key);complete();};
      const watch = () => {clearTimeout(watchdog);watchdog=ctx.later(fail,Math.max(15000,(texts[key] || '').length*90+10000));};
      ctx.listen(audio,'playing',()=>{clearTimeout(watchdog);start();});
      ctx.listen(audio,'waiting',watch);ctx.listen(audio,'stalled',watch);
      ctx.listen(audio,'ended',complete); ctx.listen(audio,'error',fail);
      // Bound loading/buffering failures, never a clip that is actively playing.
      watch();
      ctx.cleanup(() => {done=true;audio.pause();audio.removeAttribute('src');audio.load();});
      audio.play().catch(fail);
      return () => {done=true;audio.pause();};
    }
    function frame(ctx, body, classes='') {ctx.display.innerHTML=`<section class="pilot ${classes}">${body}</section>`;}
    function reminder(s) {return s.reminder_image ? `<img class="reminder" src="${path(s.reminder_image)}" alt="Final story slide">` : '';}
    function jarHTML() {return `<div class="jar-picture"><img src="${path('images/pilot_cookie_jar_empty.png')}" alt="Cookie jar"></div>`;}
    function cookieSlot(n,i){const row=Math.floor(i/3),count=Math.min(3,n-row*3);return {row:row+1,column:4-count+2*(i%3)};}
    function boardHTML(s, n, locked) {
      const cookies=Array.from({length:n},(_,i)=>`<button type="button" class="cookie${locked?'':' movable'}" id="p-cookie-${i}" data-cookie="${i}" style="grid-column:${cookieSlot(n,i).column} / span 2;grid-row:${cookieSlot(n,i).row}" aria-label="${escape(s.p_name)}'s cookie ${i+1}" ${locked?'disabled':''}>🍪</button>`).join('');
      const part=role=>{
        const who=role==='JAR'?'jar':role.toLowerCase(),isJar=who==='jar';
        return `<div class="allocation-person" data-role="${who}"><div class="station-portrait">${isJar?jarHTML():`<img src="${path('images/'+s[who+'_img'])}" alt="${escape(s[who+'_name'])}">`}</div><div class="person-name">${isJar?'Cookie jar':escape(s[who+'_name'])}</div><div class="cookie-plate" id="${who}-plate" data-destination="${who}"><div class="cookie-content">${who==='p'?cookies:''}</div></div></div>`;
      };
      return `<div class="allocation-board">${characterOrder.map(part).join('')}</div>`;
    }
    function explainCookies(ctx, after) {
      const board=ctx.display.querySelector('.allocation-board');
      // Adults read the static explanation without identification or rule highlights.
      if(!child){board.dataset.explanationPhase='complete';after();return()=>{};}
      const columns=Array.from(board.querySelectorAll('.allocation-person'));
      const identify={v:'cookie_identify_claire',p:'cookie_identify_michael',jar:'cookie_identify_jar'};
      const phases=[...(child?columns.map(column=>({name:'identify',role:column.dataset.role,key:identify[column.dataset.role],placeholder:column.dataset.role==='p'?3000:1800})):[]),
        {name:'opening',key:'cookie_explanation_opening',placeholder:3500},
        {name:'person',role:'v',key:'cookie_explanation_person',placeholder:5000},
        {name:'jar',role:'jar',key:'cookie_explanation_jar',placeholder:4200}];
      let stopAudio=()=>{},stopped=false;
      const clear=()=>columns.forEach(column=>column.classList.remove('explanation-highlight'));
      const stop=()=>{stopped=true;stopAudio();clear();};
      ctx.cleanup(stop);
      function run(index) {
        if(stopped)return;
        clear();
        if(index===phases.length){board.dataset.explanationPhase='complete';after();return;}
        const phase=phases[index];board.dataset.explanationPhase=phase.name;
        const column=columns.find(column=>column.dataset.role===phase.role);
        let placeholder=false;
        function advance(){if(stopped)return;clear();ctx.later(()=>run(index+1),160);}
        stopAudio=speak(ctx,phase.key,()=>{if(!placeholder)advance();},0,fallback=>{
          placeholder=fallback;
          if(column)column.classList.add('explanation-highlight');
          // Real narration owns the full highlight duration. Only silent/failed
          // playback uses a speech-like placeholder, including both rule sentences.
          if(placeholder)ctx.later(advance,phase.placeholder);
        });
      }
      run(0);
      return stop;
    }
    function allocation(s, position, kind) {
      const isMain = kind==='main'; const locked = kind==='explanation';
      const key = isMain?'main_cookie_question':kind==='jar'?'cookie_practice_jar':kind==='person'?'cookie_practice_person':'cookie_explanation';
      return trial(isMain?`${s.scenario_key}: cookies`:`Cookie ${kind}`,metadata(isMain?s:null,position,'cookies',!isMain),ctx => {
        const n = isMain ? s.p_after : 3;
        const prompt=`<p class="prompt" id="cookie-prompt">${escape(texts[key])}</p>`;
        const destinations=`${boardHTML(s,n,locked)}<div class="allocation-actions">${isMain?'<div id="cookie-gate"><button id="gate-yes">Yes</button><button id="gate-no">No</button></div>':''}<button id="confirm-btn" disabled ${isMain||child?'hidden':''}>${isMain?'Confirm':'Continue'}</button></div><p class="status" id="cookie-status" aria-live="polite"></p>`;
        frame(ctx,`${isMain?reminder(s):''}${prompt}${destinations}`,`allocation-response ${isMain?'allocation-gate':''}`);
        const locations=Array(n).fill('p');
        const confirm=ctx.display.querySelector('#confirm-btn');
        const plates={p:ctx.display.querySelector('#p-plate'),v:ctx.display.querySelector('#v-plate'),jar:ctx.display.querySelector('#jar-plate')};
        const bins=Object.fromEntries(Object.entries(plates).map(([who,plate])=>[who,plate.querySelector('.cookie-content')]));
        const cookies=Array.from(ctx.display.querySelectorAll('[data-cookie]'));
        cookies.forEach((c,i)=>c.setAttribute('aria-label',`${s.p_name}'s cookie ${i+1}`));
        let autoPending=false;
        let unlocked=!locked&&!isMain, narrationDone=!locked&&(!child||mute), active=null;
        const narrated=()=>{narrationDone=true;check();};
        let stopAudio=locked?explainCookies(ctx,narrated):speak(ctx,key,narrated);
        const gateStart=performance.now(); let questionRT=null,allocationStart=null,movementCount=0;
        function counts(){return {cookies_from_p_to_v:locations.filter(x=>x==='v').length,cookies_from_p_to_c:locations.filter(x=>x==='jar').length,cookies_kept_by_p:locations.filter(x=>x==='p').length};}
        function check(){const c=counts(); confirm.disabled=locked?!narrationDone:!(narrationDone&&(kind==='jar'?c.cookies_from_p_to_c>0:kind==='person'?c.cookies_from_p_to_v>0:c.cookies_from_p_to_v+c.cookies_from_p_to_c>0));cookies.forEach(c=>{c.disabled=!unlocked;});
          if(child&&!isMain&&!confirm.disabled&&!active&&!autoPending){autoPending=true;ctx.later(()=>{autoPending=false;if(!confirm.disabled&&!active)confirm.click();},300);}
        }
        function arrange(){for(const who of ['p','v','jar']){const group=cookies.filter((c,i)=>locations[i]===who);group.forEach((c,i)=>{const slot=cookieSlot(group.length,i);c.style.gridColumn=slot.column+' / span 2';c.style.gridRow=slot.row;if(active?.el!==c)bins[who].appendChild(c);});}}
        function place(i,to,fromPoint){if(locations[i]===to)return;locations[i]=to;arrange();movementCount++;check();
          const c=cookies[i],r=c.getBoundingClientRect();
          if(fromPoint&&c.animate&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){const animation=c.animate([{transform:`translate(${fromPoint.left-r.left}px,${fromPoint.top-r.top}px)`},{transform:'translate(0,0)'}],{duration:180,easing:'cubic-bezier(.2,.6,.3,1)'});ctx.cleanup(()=>animation.cancel());}
          const plate=plates[to];plate.classList.remove('drop-pulse');void plate.offsetWidth;plate.classList.add('drop-pulse');ctx.later(()=>plate.classList.remove('drop-pulse'),220);
        }
        // Expand every circle by up to 25 px. Cap each radius below half the
        // nearest center distance so even narrow layouts have disjoint hit areas.
        // Hover and release use this same geometric test, including empty margins.
        function dropTarget(x,y){
          const zones=Object.values(plates).map(plate=>{const r=plate.getBoundingClientRect();return {plate,x:r.left+r.width/2,y:r.top+r.height/2,radius:Math.min(r.width,r.height)/2};});
          return zones.find(zone=>{const nearest=Math.min(...zones.filter(other=>other!==zone).map(other=>Math.hypot(other.x-zone.x,other.y-zone.y)));const tolerance=Math.max(0,Math.min(25,nearest/2-zone.radius-1));return Math.hypot(x-zone.x,y-zone.y)<=zone.radius+tolerance;})?.plate||null;
        }
        function clearDrag(){if(!active)return;const drag=active,c=drag.el;active=null;c.classList.remove('dragging');c.style.cssText='';arrange();try{c.releasePointerCapture(drag.pointerId);}catch(_){}Object.values(plates).forEach(p=>p.classList.remove('drop-hover'));}
        ctx.cleanup(clearDrag);
        cookies.forEach((el,i) => {
          ctx.listen(el,'pointerdown',e => {
            if(!unlocked||active||e.button>0)return;
            e.preventDefault();const r=el.getBoundingClientRect();el.getAnimations?.().forEach(a=>a.cancel());active={i,el,pointerId:e.pointerId,x:e.clientX,y:e.clientY,offsetX:e.clientX-r.left,offsetY:e.clientY-r.top,moved:false};
            try{el.setPointerCapture(e.pointerId);}catch(_){}
          });
          ctx.listen(el,'pointermove',e => {
            if(!active||active.el!==el||active.pointerId!==e.pointerId)return;
            e.preventDefault();if(Math.hypot(e.clientX-active.x,e.clientY-active.y)>4)active.moved=true;
            if(active.moved){el.classList.add('dragging');el.style.left=(e.clientX-active.offsetX)+'px';el.style.top=(e.clientY-active.offsetY)+'px';const hit=dropTarget(e.clientX,e.clientY);Object.values(plates).forEach(p=>p.classList.toggle('drop-hover',p===hit));}
          });
          ctx.listen(el,'pointerup',e => {
            if(!active||active.el!==el||active.pointerId!==e.pointerId)return;
            e.preventDefault();const drag=active;const hit=dropTarget(e.clientX,e.clientY);const to=hit&&ctx.display.contains(hit)?hit.dataset.destination:null;
            const fromPoint=el.getBoundingClientRect();clearDrag();if(drag.moved&&to)place(i,to,fromPoint);else if(!drag.moved&&locations[i]!=='p')place(i,'p');
          });
          ctx.listen(el,'pointercancel',clearDrag);ctx.listen(el,'lostpointercapture',clearDrag);
          // All movement/return handling happens on pointerup; synthesized clicks do nothing.
          ctx.listen(el,'click',e=>e.preventDefault());
        });
        if(isMain){
          ctx.listen(ctx.display.querySelector('#gate-no'),'click',()=>ctx.finish({...counts(),move_cookies_response:'no',do_nothing:true,question_rt:Math.round(performance.now()-gateStart),allocation_rt:null,movement_count:0}));
          ctx.listen(ctx.display.querySelector('#gate-yes'),'click',()=>{
            questionRT=Math.round(performance.now()-gateStart);allocationStart=performance.now();unlocked=true;ctx.display.querySelector('#cookie-gate').hidden=true;confirm.hidden=false;
            ctx.display.querySelector('.pilot').classList.replace('allocation-gate','allocation-drag');
            ctx.display.querySelector('#cookie-prompt').textContent=texts.main_move_instruction;stopAudio();narrationDone=!child||mute;stopAudio=speak(ctx,'main_move_instruction',()=>{narrationDone=true;check();});check();
          });
        }
        ctx.listen(confirm,'click',()=>{if(!confirm.disabled)ctx.finish({...counts(),...(isMain?{move_cookies_response:'yes',do_nothing:false,question_rt:questionRT,allocation_rt:Math.round(performance.now()-allocationStart)}:{}),movement_count:movementCount});});
        check();
      });
    }
    function barsHTML(s, interactive) {
      return `<div class="two-scale-row">${ratingOrder.map(who=>`<div class="two-scale-col" data-role="${who}"><img class="two-scale-portrait" src="${path('images/'+s[who+'_img'])}" alt="${s[who+'_name']}"><div class="two-scale-name">${s[who+'_name']}</div><div class="two-scale-track ${interactive?'draggable unanswered':''}" data-role="${who}" id="rating-${who}-track"><div class="two-scale-track-bg"></div><div class="two-scale-fill-wrap" id="rating-${who}-wrap"><div class="two-scale-fill" id="rating-${who}-fill"></div></div><svg class="two-scale-outline" viewBox="0 0 480 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 76.8 L480 0 L480 120 L0 120 Z" fill="none" stroke="#334155" stroke-width="2.5" vector-effect="non-scaling-stroke"/><path class="two-scale-track-mid" d="M240 38.4 V120" fill="none" stroke="#687c8a" stroke-width="1" vector-effect="non-scaling-stroke" opacity=".55"/></svg></div>${child?'':`<div class="two-scale-pct" id="rating-${who}-pct"></div>`}</div>`).join('')}</div>`;
    }
    // Illustration only: never calls the response updater or marks either role touched.
    function demonstrateBar(ctx) {
      const track=ctx.display.querySelector('#rating-p-track'),wrap=ctx.display.querySelector('#rating-p-wrap'),fill=ctx.display.querySelector('#rating-p-fill');
      const pointer=document.createElement('span');pointer.className='bar-demo-pointer';pointer.setAttribute('aria-hidden','true');pointer.hidden=true;
      pointer.innerHTML='<svg viewBox="0 0 36 46" aria-hidden="true"><path d="M2 2 L2 32 L10 24 L18 42 L25 39 L17 21 L30 21 Z" fill="#182835" stroke="white" stroke-width="2" stroke-linejoin="round"/></svg>';
      track.appendChild(pointer);track.dataset.demonstration='first-explanation';
      const pct=ctx.display.querySelector('#rating-p-pct');
      function show(value,gesture,meaning){pointer.hidden=false;pointer.dataset.gesture=gesture;track.dataset.demoMeaning=meaning;pointer.style.left=value+'%';pointer.style.top=(102-78*value/100)+'px';wrap.style.width=value+'%';fill.style.background=scaleFill(value);if(pct)pct.textContent=Math.round(value)+'%';}
      function reset(){pointer.hidden=true;wrap.style.width='0%';fill.style.background='';if(pct)pct.textContent='';delete track.dataset.demoMeaning;track.dataset.demoState='idle';}
      let generation=0,demoTimer;
      function stop(){generation++;clearTimeout(demoTimer);reset();}
      function follow(audio,key,complete){
        stop();const token=generation,timing=demoTiming[key];
        if(!timing){complete();return;}
        const meaning=key.endsWith('_large')?'a-lot':key.endsWith('_small')?'a-little':'none';
        const target=meaning==='a-lot'?85:meaning==='a-little'?25:0;
        let finished=false;
        function finish(){
          if(token!==generation||finished)return;
          finished=true;clearTimeout(demoTimer);show(target,'released',meaning);track.dataset.demoState='complete';complete();
        }
        function sample(){
          if(token!==generation||finished)return;
          clearTimeout(demoTimer);
          // Read the media clock, so buffering/pausing cannot move the demonstration ahead.
          const t=audio.currentTime;
          if(t<timing.press)reset();
          else if(t<timing.motion_start){show(0,'pressed',meaning);track.dataset.demoState='pressed';}
          else if(t<timing.motion_end){const p=Math.max(0,Math.min(1,(t-timing.motion_start)/(timing.motion_end-timing.motion_start)));show(target*p*p*(3-2*p),meaning==='none'?'pressed':'dragging',meaning);track.dataset.demoState=meaning==='none'?'pressed':'dragging';}
          else {finish();return;}
          demoTimer=ctx.later(sample,40);
        }
        // Events also sample the clock. An ended event renders the terminal state
        // even if a browser throttled all animation callbacks near the clip end.
        ctx.listen(audio,'timeupdate',sample);ctx.listen(audio,'playing',sample);ctx.listen(audio,'ended',finish);
        sample();
        return finish;
      }
      function placeholder(key,complete){
        const timing=demoTiming[key];let elapsed=0;
        // Silent/error QA uses one segment-local virtual clock, never a global sequence.
        const clock={get currentTime(){return elapsed;},addEventListener(){},removeEventListener(){}};
        const finish=follow(clock,key,complete);
        const token=generation;
        function tick(){if(!timing||token!==generation)return;elapsed+=.04;if(elapsed>=timing.motion_end){finish();return;}ctx.later(tick,40);}
        ctx.later(tick,40);
      }
      reset();ctx.cleanup(stop);return {stop,follow,placeholder};
    }
    function rating(s,position,construct,practice,explanation=false,second=false) {
      let key=explanation?`${construct}_explanation_${second?'second':'first'}`:practice?`${construct}_practice_${practice}`:`main_${construct}`;
      // Select the matching whole-sentence recording as well as the displayed text.
      if(practice && texts[key].indexOf(s[ratingOrder[0]+'_name']) > texts[key].indexOf(s[ratingOrder[1]+'_name'])) key += '_reversed';
      return trial(explanation?`${construct}: explanation${second?' (second)':''}`:practice?`${construct}: practice ${practice}`:`${s.scenario_key}: ${construct}`,metadata(practice||explanation?null:s,position,construct,!!(practice||explanation)),ctx=>{
        const explanationKeys=['intro','large','small','zero'].map(part=>`${construct}_explanation_${part}`);
        const sentence=k=>`<span data-narration-key="${k}">${escape(texts[k])}</span>`;
        const explanationBody=explanation&&!second?`<div class="scale-explanation"><div class="scale-instructions"><p>${sentence(explanationKeys[0])}</p><p>${sentence(explanationKeys[1])} ${sentence(explanationKeys[2])}</p><p>${sentence(explanationKeys[3])}</p></div></div>`:`<p class="prompt">${child&&practice?sentence('rating_practice_try')+' ':''}${sentence(key)}</p>`;
        frame(ctx,`${practice||explanation?'':reminder(s)}${explanationBody}${barsHTML(s,!explanation)}<button id="rating-continue" disabled ${child&&(practice||explanation)?'hidden':''}>Continue</button><p class="status" id="rating-status" aria-live="polite"></p>`,'rating-response');
        const demo=child&&explanation&&!second?demonstrateBar(ctx):null;
        const values={p:0,v:0},touched={p:false,v:false};const btn=ctx.display.querySelector('#rating-continue');let ready=!child||(mute&&!(explanation&&!second)),drag=null;
        function valid(){if(explanation)return ready;if(!ready||!touched.p||!touched.v)return false;if(!practice)return true;
          return practice==='large'?values.p>=70&&values.v<=5:practice==='small'?values.v>=15&&values.v<=45&&values.p<=5:values.p<=5&&values.v<=5;
        }
        let autoPending=false;
        function check(){btn.disabled=!valid();
          if(child&&(practice||explanation)&&valid()&&!drag&&!autoPending){autoPending=true;ctx.later(()=>{autoPending=false;if(valid()&&!drag)btn.click();},300);}
        }
        const complete=()=>{ready=true;check();};
        if(child&&explanation&&!second){
          let stopped=false;ctx.cleanup(()=>{stopped=true;});
          function narrate(index){
            if(stopped)return;
            demo.stop();
            if(index===explanationKeys.length){complete();return;}
            const clip=explanationKeys[index];ctx.display.querySelector('.scale-instructions').dataset.audioClip=clip;
            let audioDone=false,demoDone=index===0,advanced=false,introPlaceholder=false,finishDemo=()=>{};
            function next(){if(audioDone&&demoDone&&!advanced){advanced=true;narrate(index+1);}}
            speak(ctx,clip,()=>{if(introPlaceholder)return;audioDone=true;finishDemo();next();},0,(fallback,audio)=>{
              if(index===0){if(fallback){introPlaceholder=true;ctx.later(()=>{audioDone=true;next();},mute?1800:Math.max(2800,texts[clip].length*65));}return;}
              const finished=()=>{demoDone=true;next();};
              if(fallback){demo.placeholder(clip,finished);return;}
              finishDemo=demo.follow(audio,clip,finished);
            });
          }
          narrate(0);
        }else if(child&&!mute&&practice)speak(ctx,'rating_practice_try',()=>speak(ctx,key,()=>{if(ctx.audioFailures.includes(key))ctx.later(complete,Math.max(2800,texts[key].length*65));else complete();}));
        else speak(ctx,explanation&&!second?explanationKeys[0]:key,()=>{if(child&&!mute&&ctx.audioFailures.includes(key))ctx.later(complete,Math.max(2800,texts[key].length*65));else complete();});
        function update(who,x){const track=ctx.display.querySelector(`#rating-${who}-track`),r=track.getBoundingClientRect();const value=Math.round(Math.max(0,Math.min(1,(x-r.left)/r.width))*100);values[who]=value;touched[who]=true;track.classList.add('answered');ctx.display.querySelector(`#rating-${who}-wrap`).style.width=value+'%';ctx.display.querySelector(`#rating-${who}-fill`).style.background=scaleFill(value);
          // Verified baseline adult display: blank until interaction, then `${val}%`.
          if(!child)ctx.display.querySelector(`#rating-${who}-pct`).textContent=`${value}%`;check();
        }
        if(!explanation)for(const who of ['p','v']){const el=ctx.display.querySelector(`#rating-${who}-track`);
          ctx.listen(el,'pointerdown',e=>{if(drag||e.button>0)return;e.preventDefault();drag={el,who,pointerId:e.pointerId};try{el.setPointerCapture(e.pointerId);}catch(_){}update(who,e.clientX);});
          ctx.listen(el,'pointermove',e=>{if(drag?.el===el&&drag.pointerId===e.pointerId){e.preventDefault();update(who,e.clientX);}});
          const release=()=>{if(drag?.el!==el)return;const id=drag.pointerId;drag=null;try{el.releasePointerCapture(id);}catch(_){}check();};
          ctx.listen(el,'pointerup',release);ctx.listen(el,'pointercancel',release);ctx.listen(el,'lostpointercapture',release);ctx.cleanup(release);
        }
        ctx.listen(btn,'click',()=>{if(valid())ctx.finish(explanation?{}:{[construct+'_rating_p']:values.p,[construct+'_rating_v']:values.v,[construct+'_rating_rt']:Math.round(performance.now()-ratingStart),deliberate_p:touched.p,deliberate_v:touched.v});});
        const ratingStart=performance.now();check();
      });
    }
    function textScreen(key, label, auto=false, dataOverride=null) {
      return trial(label,dataOverride || metadata(null,null,key,true),ctx=>{
        const welcome=key==='warmup_welcome';
        const welcomeBody=welcome?`<h1>Welcome!</h1><div class="welcome-board">${boardHTML(warm,3,true)}</div><div class="welcome-copy">${texts[key].split(/(?<=[.!?])\s+/).filter((sentence,i)=>i!==0||sentence!=='Welcome!').map(sentence=>`<p class="prompt">${escape(sentence)}</p>`).join('')}</div>`:`${auto?'<div class="sparkles" aria-hidden="true">✨ 🎆 ✨</div>':''}<p class="prompt">${escape(texts[key])}</p>`;
        frame(ctx,`${welcomeBody}${auto||child&&welcome?'':'<button id="text-continue" disabled>Continue</button>'}`,welcome?'welcome-screen':'');
        if(auto)ctx.display.querySelector('.pilot').classList.add('encouragement');
        const visibleStart=performance.now(),minimumVisible=key==='thank_you_case_8'?4000:2800;
        speak(ctx,key,()=>{if(auto)ctx.later(()=>ctx.finish(),Math.max(500,minimumVisible-(performance.now()-visibleStart)));else if(child&&welcome)ctx.later(()=>ctx.finish(),mute?2800:300);else ctx.display.querySelector('#text-continue').disabled=false;});
        if(!auto&&!(child&&welcome))ctx.listen(ctx.display.querySelector('#text-continue'),'click',()=>ctx.finish());
      });
    }
    function story(s,position) {
      return trial(`${s.scenario_key}: story`,metadata(s,position,'story'),ctx=>{
        let index=0,stop=()=>{},slideStarted=performance.now();const slideRTs=[],narrationDurations=new Map();
        function next(){slideRTs.push(Math.round(performance.now()-slideStarted));if(index===s.slides.length-1)ctx.finish({story_slide_rts:slideRTs});else{index++;show();}}
        function show(){stop();slideStarted=performance.now();const slide=s.slides[index];
          frame(ctx,`<img class="story-image" src="${path(slide.image)}" alt="${escape(slide.text)}">${!child||mute?'<br><button id="story-next">Continue</button>':''}`);
          if(index+1<s.slides.length){const image=new Image();image.src=path(s.slides[index+1].image);}
          if(!child||mute)ctx.listen(ctx.display.querySelector('#story-next'),'click',next);
          else if(slide.narration_repeat_of){
            // This visual movement step retains the preceding caption without
            // repeating its narration. Keep its previous clip-length dwell.
            const previous=s.slides.find(part=>part.slide_number===slide.narration_repeat_of);
            const duration=narrationDurations.get(slide.narration_repeat_of)||Math.max(3000,previous.text.length*65);
            ctx.later(next,duration+300);
          }
          else {let audio=new Audio(path(slide.audio)),done=false;audio.preload='auto';
            const advance=()=>{if(done)return;done=true;const seconds=Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:audio.currentTime;const duration=Number.isFinite(seconds)&&seconds>0?seconds*1000:Math.max(3000,slide.text.length*65);narrationDurations.set(slide.slide_number,duration);audio.pause();ctx.later(next,300);};
            const fallback=()=>{if(done)return;ctx.audioFailures.push(`${s.scenario_key}_${index+1}`);ctx.later(advance,Math.max(3000,slide.text.length*65));};
            ctx.listen(audio,'ended',advance);ctx.listen(audio,'error',fallback);ctx.later(fallback,Math.max(15000,slide.text.length*100+10000));
            stop=()=>{done=true;audio.pause();audio.removeAttribute('src');audio.load();};ctx.cleanup(stop);audio.play().catch(fallback);
          }
        }
        show();
      });
    }
    const first=judgmentOrder==='fault_first'?'fault':'carelessness';const second=first==='fault'?'carelessness':'fault';
    const warmup=[];
    warmup.push(textScreen('warmup_welcome','Welcome'));
    warmup.push(allocation(warm,null,'explanation'),allocation(warm,null,'jar'),allocation(warm,null,'person'));
    if(child)warmup.push(textScreen('thank_you_practice','Thank you after cookies',true));
    warmup.push(rating(warm,null,first,null,true),...['large','small'].map(p=>rating(warm,null,first,p)),rating(warm,null,second,null,true,true));
    if(child)warmup.push(textScreen('ready','Ready',true));
    const timeline=warmup.slice();
    ordered.forEach((s,i)=>{
      timeline.push(story(s,i+1),allocation(s,i+1,'main'),rating(s,i+1,first),rating(s,i+1,second));
      if(child&&[1,5,8].includes(i+1)){timeline.push(textScreen(`thank_you_case_${i+1}`,`Thank you after case ${i+1}`,true,{...metadata(null,i+1,'thank_you',false),completed_case_position:i+1}));}
    });
    return {timeline,warmup,assignments,scenarios:ordered,review,mute,mergedRows(){return Array.from(completed.values()).sort((a,b)=>a.presentation_position-b.presentation_position);},resetSession(){['judgment_order','victim_side','scenario_order'].forEach(k=>sessionStorage.removeItem(prefix+k));}};
  }
  return {create,shuffle,ScreenPlugin};
})();
