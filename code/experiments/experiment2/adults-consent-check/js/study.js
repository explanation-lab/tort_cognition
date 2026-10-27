/* Adult consent-check pilot. Participant assignments come from the Study Console. */
const EXPERIMENT_VERSION = 'adult-consent-check-1.0.0';
const CONDITION_ASSIGNMENT = 'between_participant';
const AVAILABLE_CONDITIONS = ['consent', 'no_consent'];
const INTERNAL_FACTORS = ['harm_type', 'judgment_order', 'scenario_id', 'victim_side'];
const CLIENT_PATH = './explanation-lab-client.js';


// A separate response immediately after the story. ScreenPlugin supplies the
// same task styling; no story, allocation, rating, or practice trial is changed.
function buildConsentCheck(caseData, scenario, assetRoot) {
  const question = scenario.consent_check_question;
  const data = {...caseData,phase:'consent_check',measure:'consent_check',
    trial_role:'consent_check',consent_check_question:question};
  return {
    type:TortPilot.ScreenPlugin, data, _debugLabel:scenario.scenario_key+': consent check',
    screen(display, psych) {
      const started = performance.now();
      let finished = false;
      display.innerHTML='<section class="pilot rating-response consent-check-response"></section>';
      const section = display.querySelector('section');
      const image = document.createElement('img');
      image.className='reminder';image.src=assetRoot+scenario.reminder_image;image.alt='Final story slide';
      const prompt = document.createElement('p');
      prompt.className='prompt';prompt.id='consent-check-question';prompt.textContent=question;
      const answers = document.createElement('div');
      answers.setAttribute('role','group');answers.setAttribute('aria-labelledby',prompt.id);
      section.append(image,prompt,answers);
      const buttons = ['yes','no'].map(value=>{
        const button=document.createElement('button');button.type='button';
        button.id='consent-check-'+value;button.textContent=value==='yes'?'Yes':'No';
        answers.append(button);return button;
      });
      function finish(event) {
        if (finished) return;
        finished=true;
        buttons.forEach(button=>{button.disabled=true;button.removeEventListener('click',finish);});
        const response=event.currentTarget.id==='consent-check-yes'?'yes':'no';
        const elapsed=Math.round(performance.now()-started);
        const answer={consent_check_question:question,consent_check_response:response,
          consent_check_value:response==='yes',consent_check_rt:elapsed};
        psych.finishTrial({...data,...answer,rt:elapsed});
      }
      buttons.forEach(button=>button.addEventListener('click',finish));
    },
  };
}

(async () => {
  const params = new URLSearchParams(location.search);
  const review = globalThis.TORT_LOCAL_OPTIONS?.review === true;
  if (review && params.has('PROLIFIC_PID')) throw new Error('Use the participant entry for Prolific collection.');
  let explanationLab;
  if (!review) {
    if (!params.get('study')) throw new Error('Open this study using its Study Console link. For local review, open preview.html.');
    const {default:createExplanationLabClient} = await import(CLIENT_PATH);
    explanationLab = await createExplanationLabClient({experimentVersion:EXPERIMENT_VERSION});
    if (!Array.isArray(explanationLab.study.conditions) ||
        explanationLab.study.conditions.length !== AVAILABLE_CONDITIONS.length ||
        AVAILABLE_CONDITIONS.some(condition => !explanationLab.study.conditions.includes(condition)) ||
        explanationLab.study.experimentVersion !== EXPERIMENT_VERSION) {
      throw new Error('This launch link belongs to a different study or study version.');
    }
  }
  const condition = review ? (window.EXPLANATION_LAB_CONDITION || params.get('condition')) || 'consent' : explanationLab.launch.condition;
  if (!AVAILABLE_CONDITIONS.includes(condition)) throw new Error('Unknown consent condition: '+condition);
  const config = globalThis.TORT_CONSENT_CHECK_CONDITIONS[condition];
  const sessionNamespace = config.sessionNamespace+(review?'review_':'participant_');
  if (!review) {
    const attempt = JSON.stringify([explanationLab.launch.studyKey, explanationLab.launch.mode,
      explanationLab.launch.participant, condition,EXPERIMENT_VERSION]);
    const key = 'tort_adult_consent_check_attempt';
    if (sessionStorage.getItem(key) !== attempt) {
      for (const item of ['judgment_order','victim_side','scenario_order'])
        sessionStorage.removeItem(sessionNamespace+item);
      sessionStorage.setItem(key,attempt);
    }
  }
  const pilot = TortPilot.create({...config,sessionNamespace,review,mute:true});
  const properties = {...pilot.assignments,
    condition,consent_condition:condition,condition_assignment:CONDITION_ASSIGNMENT,
    material_experiment:1,base_material_experiment:1,base_material_condition:'victim_not_careless',
    experiment_version:EXPERIMENT_VERSION,study_version:EXPERIMENT_VERSION,
    materials_revision:config.materialsRevision||null,
    consent_check_pilot:true,review_mode:review,valid_participant_data:!review};
  let participantConsented = false;
  const started = performance.now();
  const jsPsych = initJsPsych({display_element:'jspsych-target',show_progress_bar:true,
    on_finish: async () => {
      const target = document.getElementById('jspsych-target');
      if (review) { target.innerHTML='<p style="text-align:center">Local review finished. No responses were submitted.</p>'; return; }
      if (!participantConsented) throw new Error('Consent is required before saving a completed response.');
      const checks = jsPsych.data.get().values().filter(row=>row.phase==='consent_check');
      if (checks.length!==8 || !config.scenarios.every(s=>checks.some(row=>
          row.scenario_key===s.scenario_key && row.condition===condition &&
          ['yes','no'].includes(row.consent_check_response)))) {
        throw new Error('All eight consent questions must be answered before saving.');
      }
      target.innerHTML='<p style="text-align:center">Saving your responses. Please keep this page open…</p>';
      try {
        await explanationLab.submitAndRedirect(jsPsych.data.get(), {
          durationMs:performance.now()-started,
          metadata:{experimentVersion:EXPERIMENT_VERSION,schemaVersion:'2.1.0',
            demographicFields:['age','gender','race','ethnicity','state'],
            pilotType:'consent_check',materialExperiment:1,experiment:2,condition,baseMaterialCondition:'victim_not_careless'},
        });
        if (explanationLab.launch.mode==='sandbox') target.innerHTML='<p style="text-align:center">Sandbox complete. Responses saved to the Explanation Lab.</p>';
      } catch (error) {
        // The shared frozen client owns retry handling and preserves the data.
        console.error('Consent study save needs retry',error);
      }
    },
  });
  jsPsych.data.addProperties(properties);
  const forms = buildPilotAdultForms(jsPsych,()=>{participantConsented=true;});
  // Preserve the adult study participation terms and original task screens.
  forms.consentScreen.stimulus=forms.consentScreen.stimulus
    .replace('You will be paid $2.00 for your time and efforts (based on a rate of $8 per hour for this approximately 15-minute study).',
      'You will be paid $1.50 for your time and efforts in this approximately 5-minute study.')
    .replace('Your involvement should take about 15 minutes.','Your involvement should take about 5 minutes.')
    .replace('In order to keep your identifying information and data from this study separate, we will host the survey on an unaffiliated platform, Qualtrics. Thus, Prolific will not have access to the data you provide us.',
      'This study will run in your browser.');
  forms.consentScreen.data={...properties,trial_role:'consent'};
  forms.demographicsScreen.data={...forms.demographicsScreen.data,...properties,trial_role:'demographic'};
  forms.feedbackScreen.data={...forms.feedbackScreen.data,...properties,is_demographic:false,trial_role:'feedback'};
  for (const trial of pilot.timeline) {
    const scenario = config.scenarios.find(s=>s.scenario_key===trial.data.scenario_key);
    const caseProperties = scenario ? {
      consent_knowledge_text:scenario.consent_knowledge_text,
      consent_response_text:scenario.consent_response_text,victim_statement:scenario.victim_statement,
      story_slide_ids:scenario.slides.map(s=>s.slide_id),
    } : {};
    Object.assign(trial.data,properties,caseProperties,{trial_role:trial.data.is_practice?'practice':
      trial.data.phase==='story'?'story':'response',item_id:trial.data.scenario_key||null,
      measure:trial.data.phase});
  }
  const endScreen={type:jsPsychHtmlButtonResponse,stimulus:'<h2>Thank you!</h2>',choices:['Finish'],
    data:{...properties,trial_role:'debrief'},_debugLabel:'Finish'};
  const taskTimeline = [];
  const finalScale = pilot.assignments.judgment_order==='fault_first'?'carelessness':'fault';
  for (const trial of pilot.timeline) {
    taskTimeline.push(trial);
    if (!trial.data.is_practice && trial.data.phase==='story') {
      const scenario = config.scenarios.find(s=>s.scenario_key===trial.data.scenario_key);
      taskTimeline.push(buildConsentCheck(trial.data,scenario,config.assetRoot));
    }
    if (!trial.data.is_practice && trial.data.phase===finalScale) {
      // The summary is created after the scales. Attach the consent answer
      // already recorded immediately after this case's story.
      trial.on_finish = row => {
        const answer = jsPsych.data.get().values().find(item=>
          item.phase==='consent_check' && item.scenario_key===row.scenario_key &&
          item.presentation_position===row.presentation_position);
        if (answer) for (const field of ['consent_check_question','consent_check_response',
            'consent_check_value','consent_check_rt']) row[field]=answer[field];
      };
    }
  }
  const timeline=[forms.consentScreen,...taskTimeline,forms.demographicsScreen,forms.feedbackScreen,endScreen];
  Object.assign(globalThis,{pilot,jsPsych,timeline,TORT_ADULT_CONDITION:condition});
  if (review) globalThis.dispatchEvent(new Event('tort-consent-check-ready'));
  else jsPsych.run(timeline);
})().catch(error=>{
  console.error('Consent study startup failed',error);
  const message=document.createElement('p');message.textContent=error.message;
  const target=document.getElementById('jspsych-target');
  target.replaceChildren(message);target.style.cssText='max-width:720px;margin:12vh auto;font:18px/1.5 system-ui';
});
