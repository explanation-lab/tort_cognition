/* Adult necessity pilot: one between-participant condition, two cases. */
const EXPERIMENT_VERSION = 'adult-necessity-1.0.0';
const CONDITION_ASSIGNMENT = 'between_participant';
const AVAILABLE_CONDITIONS = ['necessity', 'no_necessity'];
const INTERNAL_FACTORS = ['judgment_order', 'scenario_id', 'victim_side'];
const CLIENT_PATH = './explanation-lab-client.js';

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
        AVAILABLE_CONDITIONS.some(c => !explanationLab.study.conditions.includes(c)) ||
        explanationLab.study.experimentVersion !== EXPERIMENT_VERSION) {
      throw new Error('This launch link belongs to a different study or study version.');
    }
  }
  const condition = review ? (window.EXPLANATION_LAB_CONDITION || params.get('condition')) || 'necessity' : explanationLab.launch.condition;
  if (!AVAILABLE_CONDITIONS.includes(condition)) throw new Error('Unknown necessity condition: '+condition);
  const config = globalThis.TORT_NECESSITY_CONDITIONS[condition];
  const sessionNamespace = config.sessionNamespace+(review?'review_':'participant_');
  if (!review) {
    const attempt = JSON.stringify([explanationLab.launch.studyKey,explanationLab.launch.mode,
      explanationLab.launch.participant,condition,EXPERIMENT_VERSION]);
    const key = 'tort_adult_necessity_attempt';
    if (sessionStorage.getItem(key) !== attempt) {
      for (const item of ['judgment_order','victim_side','scenario_order']) sessionStorage.removeItem(sessionNamespace+item);
      sessionStorage.setItem(key,attempt);
    }
  }
  const pilot = TortPilot.create({...config,sessionNamespace,review,mute:true});
  const properties = {...pilot.assignments,condition,necessity_condition:condition,
    condition_assignment:CONDITION_ASSIGNMENT,experiment:3,material_experiment:3,
    experiment_version:EXPERIMENT_VERSION,study_version:EXPERIMENT_VERSION,
    materials_revision:config.materialsRevision,review_mode:review,valid_participant_data:!review};
  let participantConsented = false;
  const started = performance.now();
  const jsPsych = initJsPsych({display_element:'jspsych-target',show_progress_bar:true,
    on_finish: async () => {
      const target = document.getElementById('jspsych-target');
      if (review) {target.innerHTML='<p style="text-align:center">Local review finished. No responses were submitted.</p>';return;}
      if (!participantConsented) throw new Error('Consent is required before saving a completed response.');
      const summaries = jsPsych.data.get().values().filter(row=>row.is_case_summary);
      if (summaries.length!==2 || new Set(summaries.map(row=>row.scenario_key)).size!==2 ||
          !config.scenarios.every(s=>summaries.some(row=>row.scenario_key===s.scenario_key&&row.condition===condition))) {
        throw new Error('Both assigned cases must be completed before responses can be saved.');
      }
      target.innerHTML='<p style="text-align:center">Saving your responses. Please keep this page open…</p>';
      try {
        await explanationLab.submitAndRedirect(jsPsych.data.get(), {
          durationMs:performance.now()-started,
          metadata:{experimentVersion:EXPERIMENT_VERSION,schemaVersion:'2.0.0',
            demographicFields:['age','gender','race','ethnicity','state'],
            materialExperiment:3,experiment:3,condition,materialsRevision:config.materialsRevision},
        });
        if (explanationLab.launch.mode==='sandbox') target.innerHTML='<p style="text-align:center">Sandbox complete. Responses saved to the Explanation Lab.</p>';
      } catch (error) {
        // The frozen client owns retry handling and preserves the responses.
        console.error('Necessity study save needs retry',error);
      }
    },
  });
  jsPsych.data.addProperties(properties);
  const forms = buildPilotAdultForms(jsPsych,()=>{participantConsented=true;});
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
    const s=config.scenarios.find(s=>s.scenario_key===trial.data.scenario_key);
    const caseProperties=s?{source_deck:s.source_deck,source_deck_sha256:s.source_deck_sha256,
      story_slide_ids:s.slides.map(slide=>slide.slide_id)}:{};
    Object.assign(trial.data,properties,caseProperties,{trial_role:trial.data.is_practice?'practice':
      trial.data.phase==='story'?'story':'response',item_id:trial.data.scenario_key||null,measure:trial.data.phase});
  }
  const endScreen={type:jsPsychHtmlButtonResponse,stimulus:'<h2>Thank you!</h2>',choices:['Finish'],
    data:{...properties,trial_role:'debrief'},_debugLabel:'Finish'};
  const timeline=[forms.consentScreen,...pilot.timeline,forms.demographicsScreen,forms.feedbackScreen,endScreen];
  Object.assign(globalThis,{pilot,jsPsych,timeline,TORT_ADULT_CONDITION:condition});
  if (review) globalThis.dispatchEvent(new Event('tort-necessity-ready'));
  else jsPsych.run(timeline);
})().catch(error=>{
  console.error('Necessity study startup failed',error);
  const message=document.createElement('p');message.textContent=error.message;
  const target=document.getElementById('jspsych-target');target.replaceChildren(message);
  target.style.cssText='max-width:720px;margin:12vh auto;font:18px/1.5 system-ui';
});
