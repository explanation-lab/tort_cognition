/* Researcher controls only. This file is absent from the participant entry. */
(() => {
  function ready() {
    const {pilot,jsPsych,timeline,TORT_ADULT_CONDITION:condition}=globalThis;
    if (!pilot || !timeline) return;
    const panel=document.getElementById('consent-review-panel');panel.hidden=false;
    const params=new URLSearchParams(location.search),jump=document.getElementById('panel-jump');
    const selected=document.getElementById('material-condition');selected.value=condition;
    for (const [i,trial] of timeline.entries()) {
      const option=document.createElement('option');option.value=i;option.textContent=`${i+1}: ${trial._debugLabel||'Screen'}`;jump.append(option);
    }
    const caseIndex=timeline.findIndex(trial=>trial.data?.scenario_key===params.get('case')&&trial.data.phase==='story');
    const requested=params.has('case')&&caseIndex>=0?caseIndex:Number(params.get('jumpTo')||0);
    const startIndex=Number.isInteger(requested)&&requested>=0&&requested<timeline.length?requested:0;
    jump.value=String(startIndex);
    document.getElementById('panel-assignment').textContent=`${condition==='consent'?'Consent':'No consent'}; ${pilot.assignments.judgment_order}; victim ${pilot.assignments.victim_side}; case order ${pilot.assignments.scenario_presentation_order}. Adult study, victim-not-careless baseline.`;
    function go(index) {const url=new URL(location.href);url.searchParams.delete('case');url.searchParams.set('condition',selected.value);url.searchParams.set('jumpTo',index);url.searchParams.set('autostart','1');location.assign(url);}
    selected.onchange=()=>{const url=new URL(location.href);url.searchParams.set('condition',selected.value);url.searchParams.delete('jumpTo');url.searchParams.delete('autostart');location.assign(url);};
    document.getElementById('panel-go').onclick=()=>go(Number(jump.value));
    document.getElementById('panel-reset').onclick=()=>{pilot.resetSession();go(0);};
    document.getElementById('panel-toggle').onclick=()=>{const content=document.getElementById('panel-content');content.hidden=!content.hidden;document.getElementById('panel-toggle').textContent=content.hidden?'Show review controls':'Hide review controls';};
    document.getElementById('panel-download').onclick=()=>{
      const payload={review_mode:true,valid_participant_data:false,condition,assignments:pilot.assignments,trials:jsPsych.data.get().values()};
      const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download=`adult-consent-${condition}-review.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    const start=()=>{document.getElementById('pilot-entry')?.remove();jsPsych.run(timeline.slice(startIndex));};
    document.getElementById('pilot-start').onclick=start;
    if (params.get('autostart')==='1') start();
  }
  if (globalThis.timeline) ready();
  else globalThis.addEventListener('tort-consent-ready',ready,{once:true});
})();
