/* Local preview only; never concatenated into participant builds. */
(() => {
  const entry=document.getElementById('pilot-entry');
  const muteBox=document.getElementById('pilot-mute');
  const panel=document.createElement('aside');panel.id='pilot-review-panel';panel.style.cssText='position:sticky;top:0;z-index:2000;background:#eef3f6;padding:8px;font:14px system-ui;text-align:left';
  const params=new URLSearchParams(location.search);
  const requested=Number(params.get('jumpTo')||0);
  panel.innerHTML='<button id="panel-toggle">Panel On/Off</button><div id="panel-content" hidden><p>Local review only. These responses cannot be submitted as participant data.</p><select id="panel-jump"></select><button id="panel-go">Jump</button><button id="panel-reset">New review assignments</button><p id="panel-assignment"></p></div>';
  document.body.prepend(panel);
  const select=panel.querySelector('#panel-jump');
  timeline.forEach((t,i)=>{const option=document.createElement('option');option.value=i;option.textContent=`${i+1}: ${t._debugLabel||'Screen'}`;select.append(option);});
  panel.querySelector('#panel-assignment').textContent=`${pilot.assignments.judgment_order}; victim ${pilot.assignments.victim_side}; scenario order ${pilot.assignments.scenario_presentation_order}. These positions apply from Welcome through the whole study. Pilot v3: all child narration is installed; real audio plays unless Mute / visual QA is selected.`;
  panel.querySelector('#panel-toggle').onclick=()=>{const c=panel.querySelector('#panel-content');c.hidden=!c.hidden;};
  function go(index){const u=new URL(location.href);u.searchParams.set('jumpTo',index);u.searchParams.set('autostart','1');u.searchParams.set('mute',muteBox?.checked?'1':'0');location.assign(u);}
  panel.querySelector('#panel-go').onclick=()=>go(Number(select.value));
  panel.querySelector('#panel-reset').onclick=()=>{pilot.resetSession();go(0);};
  if(muteBox)muteBox.checked=pilot.mute;
  const start=()=>{const index=Number.isInteger(requested)&&requested>=0&&requested<timeline.length?requested:0;
    if(muteBox&&muteBox.checked!==pilot.mute){go(index);return;}
    entry.remove();jsPsych.run(timeline.slice(index));};
  document.getElementById('pilot-start').onclick=start;
  select.value=String(Number.isInteger(requested)&&requested>=0&&requested<timeline.length?requested:0);
  if(params.get('autostart')==='1')start();
})();
