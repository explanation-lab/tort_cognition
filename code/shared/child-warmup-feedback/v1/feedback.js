
    // Practice-only presentation. It cannot supply a response, change a threshold,
    // finish a trial, or write to the scientific rows.
    function createWarmupFeedback(ctx,s,construct,practice,state){
      const delay=Math.max(0,options.practiceFeedbackDelayMs??5000);
      const explicitDelay=Math.max(0,options.practiceFeedbackExplicitDelayMs??5000);
      const repeatDelay=Math.max(1000,options.practiceFeedbackRepeatMs??20000);
      const expected=who=>practice==='large'?(who==='p'?'lot':'zero'):(who==='p'?'zero':'little');
      const accepts=(who,value)=>expected(who)==='lot'?value>=70:expected(who)==='little'?value>=15&&value<=45:value<=5;
      // Point inside the existing accepted 'not' area, rather than at its black left border.
      const target=who=>expected(who)==='lot'?85:expected(who)==='little'?30:3;
      const widgets={};
      const message=document.createElement('p');message.className='warmup-feedback';message.hidden=true;message.setAttribute('role','status');message.setAttribute('aria-live','polite');
      ctx.display.querySelector('.two-scale-row').after(message);
      for(const who of ['p','v']){
        const track=ctx.display.querySelector('#rating-'+who+'-track');
        const pointer=document.createElement('span');pointer.className='warmup-target';pointer.hidden=true;pointer.setAttribute('aria-hidden','true');
        const label=document.createElement('span');label.className='warmup-answer-label';label.textContent='Choose an answer';
        track.append(pointer);track.parentElement.append(label);widgets[who]={track,pointer,label};
      }
      let readyAt=null,lastInput=performance.now(),level=0,timer=null,disposed=false,audio=null,audioKey=null,lastClipAt=-Infinity,lastAudioEnd=-Infinity,lastSignature='';
      function stopAudio(){if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio=null;}audioKey=null;}
      function emit(detail){options.onPracticeFeedback?.({...detail,construct,practice});}
      function phrase(who){const name=s[who+'_name'],kind=expected(who);
        const ending=construct==='fault'?kind==='zero'?'is not at fault':kind==='little'?'is a little at fault':'is a lot at fault':kind==='zero'?'was not careless':kind==='little'?'was a little careless':'was very careless';
        return {key:'warmup_feedback_'+construct+'_'+name.toLowerCase()+'_'+kind,text:kind==='zero'?`Click the beginning of ${name}’s bar to show that ${name} ${ending}.`:`Click here to show that ${name} ${ending}.`};
      }
      const feedbackAudioEnabled=()=>!options.mute&&options.practiceFeedbackAudioEnabled!==false;
      function play(key){
        const urls=options.practiceFeedbackClips||{
        "warmup_feedback_both": "https://explanation-lab.github.io/tort_cognition/code/shared/audio/child-warmup-feedback-v1/warmup_feedback_both.m4a",
        "warmup_feedback_choose_michael": "https://explanation-lab.github.io/tort_cognition/code/shared/audio/child-warmup-feedback-v1/warmup_feedback_choose_michael.m4a",
        "warmup_feedback_choose_claire": "https://explanation-lab.github.io/tort_cognition/code/shared/audio/child-warmup-feedback-v1/warmup_feedback_choose_claire.m4a",
        "warmup_feedback_try_michael": "https://explanation-lab.github.io/tort_cognition/code/shared/audio/child-warmup-feedback-v1/warmup_feedback_try_michael.m4a",
        "warmup_feedback_try_claire": "https://explanation-lab.github.io/tort_cognition/code/shared/audio/child-warmup-feedback-v1/warmup_feedback_try_claire.m4a",
        "warmup_feedback_fault_michael_lot": "https://explanation-lab.github.io/tort_cognition/code/shared/audio/child-warmup-feedback-v1/warmup_feedback_fault_michael_lot.m4a",
        "warmup_feedback_fault_claire_zero": "https://explanation-lab.github.io/tort_cognition/code/shared/audio/child-warmup-feedback-v1/warmup_feedback_fault_claire_zero.m4a",
        "warmup_feedback_fault_claire_little": "https://explanation-lab.github.io/tort_cognition/code/shared/audio/child-warmup-feedback-v1/warmup_feedback_fault_claire_little.m4a",
        "warmup_feedback_fault_michael_zero": "https://explanation-lab.github.io/tort_cognition/code/shared/audio/child-warmup-feedback-v1/warmup_feedback_fault_michael_zero.m4a",
        "warmup_feedback_carelessness_michael_lot": "https://explanation-lab.github.io/tort_cognition/code/shared/audio/child-warmup-feedback-v1/warmup_feedback_carelessness_michael_lot.m4a",
        "warmup_feedback_carelessness_claire_zero": "https://explanation-lab.github.io/tort_cognition/code/shared/audio/child-warmup-feedback-v1/warmup_feedback_carelessness_claire_zero.m4a",
        "warmup_feedback_carelessness_claire_little": "https://explanation-lab.github.io/tort_cognition/code/shared/audio/child-warmup-feedback-v1/warmup_feedback_carelessness_claire_little.m4a",
        "warmup_feedback_carelessness_michael_zero": "https://explanation-lab.github.io/tort_cognition/code/shared/audio/child-warmup-feedback-v1/warmup_feedback_carelessness_michael_zero.m4a"
},url=urls[key];
        if(!feedbackAudioEnabled()||!url){emit({event:'audio_not_played',key,reason:!url?'recording_not_supplied':'audio_disabled'});return;}
        stopAudio();audioKey=key;audio=new Audio(url);const current=audio;lastClipAt=performance.now();
        current.addEventListener('playing',()=>emit({event:'audio_started',key}));
        current.addEventListener('ended',()=>{if(audio===current){audio=null;audioKey=null;lastAudioEnd=performance.now();emit({event:'audio_finished',key});}});
        current.addEventListener('error',()=>{if(audio===current)stopAudio();emit({event:'audio_error',key});});
        Promise.resolve(current.play()).catch(()=>{if(audio===current)stopAudio();emit({event:'audio_error',key});});
      }
      function render(){
        if(disposed)return;
        if(audio&&!feedbackAudioEnabled())stopAudio();
        const st=state(),now=performance.now();if(st.ready&&readyAt===null){readyAt=now;lastInput=now;}
        const needs=ratingOrder.filter(who=>!st.touched[who]||!accepts(who,st.values[who]));
        if(st.ready&&!st.dragging&&needs.length){const idle=now-lastInput;if(idle>=delay)level=Math.max(level,1);if(idle>=delay+explicitDelay&&!audio&&now-lastAudioEnd>=400)level=2;}
        const active=st.ready&&!st.dragging&&!st.valid&&needs.length&&level>0,focus=active?needs[0]:null;
        for(const who of ['p','v']){
          const w=widgets[who];
          w.label.textContent=st.touched[who]?'Answer chosen':'Choose an answer';
          w.track.classList.toggle('warmup-needs-answer',!!active&&needs.includes(who));
          w.pointer.hidden=!(active&&level===2&&focus===who);
          w.pointer.style.left=target(who)+'%';w.pointer.style.top=(102-78*target(who)/100)+'px';
        }
        let key='',text='';
        if(active){
          if(level===2)({key,text}=phrase(focus));
          else if(needs.length===2&&!st.touched.p&&!st.touched.v){key='warmup_feedback_both';text='Give an answer for Michael and an answer for Claire.';}
          else {const name=s[focus+'_name'],retry=st.touched[focus];key='warmup_feedback_'+(retry?'try_':'choose_')+name.toLowerCase();text=retry?`Have another try on ${name}’s bar.`:`Now give an answer for ${name}.`;}
        }
        message.hidden=!active;message.textContent=text;
        const signature=JSON.stringify({level:active?level:0,focus,needs:active?needs:[],key});
        if(signature!==lastSignature){lastSignature=signature;stopAudio();if(active){lastClipAt=now;emit({event:'guidance_shown',level,focus,needs,key,text});play(key);}else emit({event:'guidance_hidden'});}
        else if(active&&!audio&&feedbackAudioEnabled()&&now-lastClipAt>=repeatDelay){lastClipAt=now;play(key);}
        options.onWarmupFeedbackState?.({level:active?level:0,focus,needs:active?needs:[],key,text,expected:{p:expected('p'),v:expected('v')},audioPlaying:!!audioKey});
      }
      function tick(){render();if(!disposed)timer=setTimeout(tick,100);}
      timer=setTimeout(tick,100);
      ctx.cleanup(()=>{disposed=true;clearTimeout(timer);stopAudio();});
      return {render,interact(){lastInput=performance.now();stopAudio();}};
    }
