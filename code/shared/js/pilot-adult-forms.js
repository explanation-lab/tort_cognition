/* Adult consent wording is preserved from the verified baseline. */
function buildPilotAdultForms(jsPsych,setConsented) {
const consentScreen = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div id="consent-scroll" style="max-width:720px; margin:0 auto; padding:36px 48px 28px 48px; font-family:'Helvetica Neue', Arial, sans-serif; color:#333; font-size:14px; line-height:1.5; text-align:left; max-height:calc(100vh - 220px); overflow-y:auto; background-color:#b8d4e8; border-radius:4px;">
      <h2 style="text-align:center; font-size:16px; font-weight:bold; letter-spacing:0.04em; margin:0 0 24px 0; text-transform:uppercase;">Consent Form</h2>
      <p style="margin:0 0 14px 0;">Thank you for agreeing to take part in this study. We appreciate your time and effort. In this study, we will present you with a fictional scenario, and then we will ask you to answer a brief series of questions about that scenario. The questions have no right or wrong answers-- we're just exploring features of human psychology in this research. You will be paid $2.00 for your time and efforts (based on a rate of $8 per hour for this approximately 15-minute study). We do not anticipate any risks from participating in this research. While you will not directly benefit from taking part in this research study, we hope society and the scientific community will benefit from the knowledge gained about human psychology and judgment.</p>
      <p style="margin:0 0 14px 0;">Your involvement should take about 15 minutes. Your participation is voluntary and you can stop at any time. If you consent to take part in this survey, please indicate so below, and then click the arrow to advance. If not, simply close your browser window.</p>
      <p style="margin:0 0 14px 0;">The research data will be collected anonymously. We will not ask you to provide any personally identifiable information (such as an email-address, name, etc.) and will not be able to link your response to you. We anticipate that your participation in this survey presents no greater risk than everyday use of the Internet. Of course, please note that there is always the possible risk of intrusion by outside agents (i.e. hacking) whenever information shared over the Internet. In order to keep your identifying information and data from this study separate, we will host the survey on an unaffiliated platform, Qualtrics. Thus, Prolific will not have access to the data you provide us. Additionally, we will not ask for directly or indirectly identifiable information in the survey.</p>
      <p style="margin:0 0 14px 0;">If you have any questions about the research study, please contact Shaun Nichols (sbn44@cornell.edu) at Cornell University. If you have any questions or concerns regarding your rights as a subject in this study, you may contact the Institutional Review Board (IRB) for Human Participants at 607-255-5138 or access their website at <a href="http://www.irb.cornell.edu" target="_blank">http://www.irb.cornell.edu</a>. You may also report your concerns or complaints anonymously through Ethicspoint online at <a href="http://www.hotline.cornell.edu" target="_blank">www.hotline.cornell.edu</a> or by calling toll free at 1-866-293-3077. Ethicspoint is an independent organization that serves as a liaison between the University and the person bringing the complaint so that anonymity can be ensured.</p>
      <p style="margin:0 0 14px 0;">Taking part in this study is voluntary. You can stop at any time. Withdrawal or refusal to participate will not result in any penalty. You do not waive any legal rights or release any agent from liability for negligence by consenting to participate.</p>
      <p style="margin:20px 0 0 0;">If you consent to take part in this survey, please indicate so below:</p>
    </div>`,
  choices: ['I Agree'],
  on_load: function() {
    const btn = document.querySelector('#jspsych-html-button-response-btngroup .jspsych-btn');
    if (btn) {
      btn.style.cssText = 'background:#fff; border:1px solid #999; padding:4px 20px; font-size:14px; color:#333; cursor:pointer; border-radius:2px; font-family:sans-serif; box-shadow:none;';
    }
  },
  on_finish: function(data) {
    setConsented();
  },
  _debugLabel: 'Consent Form',
};

const demographicsScreen = {
  type: jsPsychHtmlButtonResponse,
  // choices: [] means jsPsych renders NO button and registers NO click handler.
  // Our own Submit button is embedded in the stimulus and calls jsPsych.finishTrial()
  // directly, bypassing jsPsych's event system entirely.
  choices: [],
  stimulus: `
    <div style="max-width:680px; margin:0 auto; padding:40px 30px; font-family:sans-serif; color:#333; font-size:15px; text-align:left;">
      <p style="text-align:center; font-weight:bold; font-size:17px; margin-bottom:28px;">Demographic information:</p>

      <table style="width:100%; border-collapse:collapse; line-height:2;">

        <!-- Age -->
        <tr>
          <td style="padding:10px 24px 10px 0; vertical-align:middle; white-space:nowrap;">1. Age:</td>
          <td style="padding:10px 0; vertical-align:middle;">
            <input type="number" id="demo-age" min="18" max="120"
              style="width:70px; padding:3px 7px; font-size:15px; border:1px solid #999; border-radius:3px;">
          </td>
        </tr>

        <!-- Gender -->
        <tr>
          <td style="padding:10px 24px 10px 0; vertical-align:top; white-space:nowrap;">2. Gender:</td>
          <td style="padding:10px 0;">
            <div style="margin-bottom:6px;">
              <label style="margin-right:18px; cursor:pointer;"><input type="radio" name="gender" value="Female" style="margin-right:5px;">Female</label>
              <label style="margin-right:18px; cursor:pointer;"><input type="radio" name="gender" value="Male" style="margin-right:5px;">Male</label>
              <label style="cursor:pointer;"><input type="radio" name="gender" value="Non-binary" style="margin-right:5px;">Non-binary</label>
            </div>
            <div>
              <label style="cursor:pointer;">
                <input type="radio" name="gender" value="__other__" style="margin-right:5px;">Other:
                <input type="text" id="gender-other" style="margin-left:6px; padding:2px 7px; font-size:14px; border:1px solid #999; border-radius:3px; width:180px;">
              </label>
            </div>
          </td>
        </tr>

        <!-- Race -->
        <tr>
          <td style="padding:10px 24px 10px 0; vertical-align:top; white-space:nowrap;">3. Race:</td>
          <td style="padding:10px 0;">
            ${['White','Black/African American','American Indian/Alaska Native','Asian',
               'Native Hawaiian/Pacific Islander','Multiracial/Mixed']
              .map(r => `<div><label style="cursor:pointer;"><input type="radio" name="race" value="${r}" style="margin-right:5px;">${r}</label></div>`).join('')}
            <div>
              <label style="cursor:pointer;">
                <input type="radio" name="race" value="__other__" style="margin-right:5px;">Other:
                <input type="text" id="race-other" style="margin-left:6px; padding:2px 7px; font-size:14px; border:1px solid #999; border-radius:3px; width:180px;">
              </label>
            </div>
          </td>
        </tr>

        <!-- Ethnicity -->
        <tr>
          <td style="padding:10px 24px 10px 0; vertical-align:middle; white-space:nowrap;">4. Ethnicity:</td>
          <td style="padding:10px 0;">
            <label style="margin-right:18px; cursor:pointer;"><input type="radio" name="ethnicity" value="Hispanic" style="margin-right:5px;">Hispanic</label>
            <label style="cursor:pointer;"><input type="radio" name="ethnicity" value="Non-Hispanic" style="margin-right:5px;">Non-Hispanic</label>
          </td>
        </tr>

        <!-- State -->
        <tr>
          <td style="padding:10px 24px 10px 0; vertical-align:middle; white-space:nowrap;">5. State of residence:</td>
          <td style="padding:10px 0;">
            <select id="demo-state" required style="width:220px; padding:4px 7px; font-size:15px; border:1px solid #999; border-radius:3px;">
              <option value="" selected disabled>Select a state...</option>
              ${['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
                 'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois',
                 'Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts',
                 'Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
                 'New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota',
                 'Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina',
                 'South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington',
                 'West Virginia','Wisconsin','Wyoming']
                .map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </td>
        </tr>

      </table>

      <p style="margin-top:28px; font-size:15px;">Please press <strong>Submit</strong> to complete the experiment.</p>
      <p id="demo-error" style="color:#cc0000; font-size:14px; margin-top:8px; display:none; font-weight:500;">Please answer all questions before submitting.</p>
      <div style="text-align:center; margin-top:16px;">
        <button id="demo-submit-btn" class="jspsych-btn" style="padding:8px 28px; font-size:15px; cursor:pointer;">Submit</button>
      </div>
    </div>`,
  on_load: function() {
    const startTime = performance.now();
    document.getElementById('demo-submit-btn').addEventListener('click', function() {
      const age       = document.getElementById('demo-age')?.value?.trim();
      const genderEl  = document.querySelector('input[name="gender"]:checked');
      const raceEl    = document.querySelector('input[name="race"]:checked');
      const ethnicEl  = document.querySelector('input[name="ethnicity"]:checked');
      const stateEl   = document.getElementById('demo-state');
      const state     = stateEl?.value;
      const errEl     = document.getElementById('demo-error');
      if (!age || Number(age)<18 || Number(age)>120 || !genderEl || !raceEl || !ethnicEl || !state) {
        if (errEl) errEl.style.display = 'block';
        return;
      }
      if (errEl) errEl.style.display = 'none';
      const gender    = genderEl.value === '__other__'
        ? 'Other: ' + (document.getElementById('gender-other')?.value || '')
        : genderEl.value;
      const race      = raceEl.value === '__other__'
        ? 'Other: ' + (document.getElementById('race-other')?.value || '')
        : raceEl.value;
      jsPsych.finishTrial({
        rt:        Math.round(performance.now() - startTime),
        age:       age,
        gender:    gender,
        race:      race,
        ethnicity: ethnicEl.value,
        state:     state,
      });
    });
  },
  data: { is_demographic: true, is_practice: false },
  _debugLabel: 'Demographics',
};

const feedbackScreen = {
  type: jsPsychHtmlButtonResponse,
  choices: [],
  stimulus: `
    <div style="text-align:center; padding:40px; max-width:700px; margin:0 auto; font-family:sans-serif;">
      <p style="font-size:20px; margin-bottom:20px;">Do you have any feedback about any part of this study?</p>
      <textarea id="feedback-input" rows="6"
        style="width:100%; font-size:16px; padding:12px; border:2px solid #ccc;
               border-radius:8px; resize:vertical; font-family:inherit;"
        placeholder="Optional feedback"></textarea>
      <p id="feedback-error" style="color:#cc0000; font-size:14px; margin-top:8px; display:none; font-weight:500;">Feedback is optional.</p>
      <div style="margin-top:16px;">
        <button id="feedback-submit-btn" class="jspsych-btn" style="padding:8px 28px; font-size:15px; cursor:pointer;">Submit</button>
      </div>
    </div>`,
  on_load: function() {
    const startTime = performance.now();
    document.getElementById('feedback-submit-btn').addEventListener('click', function() {
      const val = document.getElementById('feedback-input')?.value?.trim();
      const errEl = document.getElementById('feedback-error');
      jsPsych.finishTrial({
        rt:       Math.round(performance.now() - startTime),
        feedback: val,
      });
    });
  },
  data: { is_demographic: true, demographic_type: 'feedback', is_practice: false },
  _debugLabel: 'Feedback',
};


return {consentScreen, demographicsScreen, feedbackScreen};
}
