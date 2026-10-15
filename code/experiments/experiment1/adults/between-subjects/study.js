/* Adult between-participant pilot. Conditions reuse the approved story sources. */
const EXPERIMENT_VERSION = 'adult-between-1.0.0';
const CONDITION_ASSIGNMENT = 'between_participant';
const AVAILABLE_CONDITIONS = ['victim_not_careless', 'victim_careless'];
const INTERNAL_FACTORS = ['harm_type', 'scenario_id', 'judgment_order', 'victim_side'];

(async () => {
  const params = new URLSearchParams(location.search);
  const review = globalThis.TORT_LOCAL_OPTIONS?.review === true;
  if (review && params.has('PROLIFIC_PID')) throw new Error('Use the participant entry for Prolific collection.');
  let explanationLab;
  if (!review) {
    if (!params.get('study')) throw new Error('Open this study using its Study Console link. For local review, open pilot-preview.html.');
    const {default:createExplanationLabClient} = await import('./explanation-lab-client.js');
    explanationLab = await createExplanationLabClient({experimentVersion:EXPERIMENT_VERSION});
  }
  const assignedCondition = review ? (window.EXPLANATION_LAB_CONDITION || params.get('condition')) || AVAILABLE_CONDITIONS[0] : explanationLab.launch.condition;
  if (!AVAILABLE_CONDITIONS.includes(assignedCondition)) throw new Error('Unknown material condition: '+assignedCondition);
  const config = globalThis.TORT_ADULT_CONDITIONS[assignedCondition];
  // Keep refresh assignments stable within one attempt, but do not carry an
  // earlier participant's internal counterbalancing into a new Console launch.
  if (!review) {
    const attempt = JSON.stringify([explanationLab.launch.studyKey, explanationLab.launch.mode,
      explanationLab.launch.participant, assignedCondition]);
    const key = 'tort_adult_between_attempt';
    if (sessionStorage.getItem(key) !== attempt) {
      for (const item of ['judgment_order','victim_side','scenario_order'])
        sessionStorage.removeItem(`tort_pilot_v3_exp${config.experiment}_adults_`+item);
      sessionStorage.setItem(key,attempt);
    }
  }
  const pilot = TortPilot.create({...config,review,mute:true});
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
            materialExperiment:config.experiment,condition:assignedCondition},
        });
        if (explanationLab.launch.mode==='sandbox') target.innerHTML='<p style="text-align:center">Sandbox complete. Responses saved to the Explanation Lab.</p>';
      } catch (error) {
        // The frozen client owns the retry screen and preserves the same data.
        // Never redirect or report successful completion after a failed save.
        console.error('Study save needs retry',error);
      }
    },
  });
  const properties = {...pilot.assignments,condition:assignedCondition,
    material_experiment:config.experiment,victim_carelessness_condition:assignedCondition,
    experiment_version:EXPERIMENT_VERSION,study_version:EXPERIMENT_VERSION,
    review_mode:review,valid_participant_data:!review};
  jsPsych.data.addProperties(properties);
  const forms = buildPilotAdultForms(jsPsych,()=>{participantConsented=true;});
  // Approved wording for this adult pilot; historical single-condition consent
  // remains untouched in the shared forms source.
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
    Object.assign(trial.data,properties,{trial_role:trial.data.is_practice?'practice':
      trial.data.phase==='story'?'story':'response',item_id:trial.data.scenario_key||null,
      measure:trial.data.phase});
  }
  const endScreen={type:jsPsychHtmlButtonResponse,stimulus:'<h2>Thank you!</h2>',choices:['Finish'],
    data:{...properties,trial_role:'debrief'},_debugLabel:'Finish'};
  const timeline=[forms.consentScreen,...pilot.timeline,forms.demographicsScreen,forms.feedbackScreen,endScreen];
  Object.assign(globalThis,{pilot,jsPsych,timeline,TORT_ADULT_CONDITION:assignedCondition});
  if (!review) jsPsych.run(timeline);
})().catch(error=>{
  console.error('Adult pilot startup failed',error);
  const target=document.getElementById('jspsych-target');
  const message=document.createElement('p');message.textContent=error.message;
  target.replaceChildren(message);target.style.cssText='max-width:720px;margin:12vh auto;font:18px/1.5 system-ui';
});
