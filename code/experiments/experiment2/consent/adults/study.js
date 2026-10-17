/* Adult consent study. Participant assignments come from the Study Console. */
const EXPERIMENT_VERSION = 'adult-consent-1.0.0';
const AVAILABLE_CONDITIONS = ['consent', 'no_consent'];
const CLIENT_PATH = '../../../experiment1/adults/between-subjects/explanation-lab-client.js';

(async () => {
  const params = new URLSearchParams(location.search);
  const review = globalThis.TORT_LOCAL_OPTIONS?.review === true;
  if (review && params.has('PROLIFIC_PID')) throw new Error('Use the participant entry for Prolific collection.');
  let explanationLab;
  if (!review) {
    if (!params.get('study')) throw new Error('Open this study using its Study Console link. For local review, open pilot-preview.html.');
    const {default:createExplanationLabClient} = await import(CLIENT_PATH);
    explanationLab = await createExplanationLabClient({experimentVersion:EXPERIMENT_VERSION});
    if (!Array.isArray(explanationLab.study.conditions) ||
        explanationLab.study.conditions.length !== AVAILABLE_CONDITIONS.length ||
        AVAILABLE_CONDITIONS.some(condition => !explanationLab.study.conditions.includes(condition)) ||
        explanationLab.study.experimentVersion !== EXPERIMENT_VERSION) {
      throw new Error('This launch link belongs to a different study or study version.');
    }
  }
  const condition = review ? params.get('condition') || 'consent' : explanationLab.launch.condition;
  if (!AVAILABLE_CONDITIONS.includes(condition)) throw new Error('Unknown consent condition: '+condition);
  const config = globalThis.TORT_CONSENT_CONDITIONS[condition];
  if (!review) {
    const attempt = JSON.stringify([explanationLab.launch.studyKey, explanationLab.launch.mode,
      explanationLab.launch.participant, condition]);
    const key = 'tort_adult_consent_attempt';
    if (sessionStorage.getItem(key) !== attempt) {
      for (const item of ['judgment_order','victim_side','scenario_order'])
        sessionStorage.removeItem(config.sessionNamespace+item);
      sessionStorage.setItem(key,attempt);
    }
  }
  const pilot = TortPilot.create({...config,review,mute:true});
  const properties = {...pilot.assignments,
    condition,consent_condition:condition,condition_assignment:'between_participant',
    material_experiment:1,base_material_experiment:1,base_material_condition:'victim_not_careless',
    experiment_version:EXPERIMENT_VERSION,study_version:EXPERIMENT_VERSION,
    materials_revision:config.materialsRevision||null,
    review_mode:review,valid_participant_data:!review};
  let participantConsented = false;
  const started = performance.now();
  const jsPsych = initJsPsych({display_element:'jspsych-target',show_progress_bar:true,
    on_finish: async () => {
      const target = document.getElementById('jspsych-target');
      if (review) { target.innerHTML='<p style="text-align:center">Local review finished. No responses were submitted.</p>'; return; }
      if (!participantConsented) throw new Error('Consent is required before saving a completed response.');
      target.innerHTML='<p style="text-align:center">Saving your responses. Please keep this page open…</p>';
      try {
        await explanationLab.submitAndRedirect(jsPsych.data.get(), {
          durationMs:performance.now()-started,
          metadata:{experimentVersion:EXPERIMENT_VERSION,schemaVersion:'2.0.0',
            demographicFields:['age','gender','race','ethnicity','state'],
            materialExperiment:1,experiment:2,condition,baseMaterialCondition:'victim_not_careless'},
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
  // Keep the current pilot's participation terms. A future launch must confirm
  // its advertised duration and payment against this longer version.
  forms.consentScreen.stimulus=forms.consentScreen.stimulus
    .replace('You will be paid $2.00 for your time and efforts (based on a rate of $8 per hour for this approximately 15-minute study).',
      'You will be paid $1.50 for your time and efforts in this approximately 5-minute study.')
    .replace('Your involvement should take about 15 minutes.','Your involvement should take about 5 minutes.')
    .replace('In order to keep your identifying information and data from this study separate, we will host the survey on an unaffiliated platform, Qualtrics. Thus, Prolific will not have access to the data you provide us.',
      'This study will run in your browser.');
  forms.consentScreen.data={...properties,trial_role:'consent'};
  forms.demographicsScreen.data={...forms.demographicsScreen.data,...properties,trial_role:'demographic'};
  forms.feedbackScreen.data={...forms.feedbackScreen.data,...properties,is_demographic:false,trial_role:'feedback'};
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const taskTimeline = [];
  const lastJudgment = pilot.assignments.judgment_order==='fault_first'?'carelessness':'fault';
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
    taskTimeline.push(trial);
    if (scenario && !trial.data.is_practice && trial.data.phase===lastJudgment) {
      taskTimeline.push({
        type:jsPsychHtmlButtonResponse,
        stimulus:`<div class="pilot"><p class="prompt">Before the cookies were lost, did ${escape(scenario.v_name)} say that was okay?</p></div>`,
        choices:['Yes','No','Don’t remember'],
        data:{...trial.data,trial_role:'manipulation_check',phase:'consent_recall',measure:'consent_recall',
          expected_consent_recall_response:condition==='consent'?'yes':'no'},
        on_finish(data) {
          data.consent_recall_response=['yes','no','dont_remember'][data.response]??null;
          data.consent_recall_correct=data.consent_recall_response===data.expected_consent_recall_response;
        },
        _debugLabel:`${scenario.scenario_key}: consent recall`,
      });
    }
  }
  const endScreen={type:jsPsychHtmlButtonResponse,stimulus:'<h2>Thank you!</h2>',choices:['Finish'],
    data:{...properties,trial_role:'debrief'},_debugLabel:'Finish'};
  const timeline=[forms.consentScreen,...taskTimeline,forms.demographicsScreen,forms.feedbackScreen,endScreen];
  Object.assign(globalThis,{pilot,jsPsych,timeline,TORT_ADULT_CONDITION:condition});
  if (review) globalThis.dispatchEvent(new Event('tort-consent-ready'));
  else jsPsych.run(timeline);
})().catch(error=>{
  console.error('Consent study startup failed',error);
  const message=document.createElement('p');message.textContent=error.message;
  const target=document.getElementById('jspsych-target');
  target.replaceChildren(message);target.style.cssText='max-width:720px;margin:12vh auto;font:18px/1.5 system-ui';
});
