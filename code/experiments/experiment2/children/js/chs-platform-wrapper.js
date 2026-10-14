const video_config = {
    type: chsRecord.VideoConfigPlugin
    // locale: 'zh'  // uncomment to change language
};

const video_consent = {
    "type": chsRecord.VideoConsentPlugin,
    "PIName": "Shaun Nichols",
    "institution": "Cornell University",
    "PIContact": "Shaun Nichols at sbn44@cornell.edu",
    "voluntary_participation": "Your child is invited to participate in a research study conducted by the Explanation Lab at Cornell University. The purpose of the study is to understand how children think about causes, explanations, purposes, and kinds. Your child's participation is voluntary. You may decide not to allow your child to participate, may stop your child's participation at any time, and your child may skip any question or activity without penalty. If your child indicates at any time that they do not want to continue, the study will be paused or ended.",
    "purpose": "This study is about how children think about causation, fault, and responsibility — specifically, how they decide what should happen when one person causes another person to lose something they value.",
    "procedures": "Your child will watch short videos about two fictional characters. After each video, your child will decide whether to move cookies between the characters, or put them in a cookie jar.",
    "risk_statement": "There is no guaranteed direct benefit to your child. Many families enjoy contributing to research on child development. The research may help scientists better understand how children reason about causes, explanations, purposes, and categories. The study presents no greater than minimal risk. The main possible discomfort is boredom, mild frustration, or fatigue. Your child may stop at any time. There is also a small risk that data transmitted over the internet or stored electronically could be accessed without permission. We reduce this risk by using Lookit and Cornell-approved secure storage, limiting access to approved research personnel, and coding data with participant ID numbers.",
    "payment": "Your family will receive a $5 electronic gift card as a token of appreciation for your child's participation. The gift card will be sent to the parent/guardian on behalf of the child. Please use or give the gift card to your child when feasible.",
    "research_rights_statement": "If you have questions about the study, contact Shaun Nichols at sbn44@cornell.edu. If you have concerns or complaints about the research or your child's rights as a participant, contact the Cornell Institutional Review Board for Human Participants at irbhp@cornell.edu or 607-255-6182. You may also report concerns anonymously through EthicsPoint at www.hotline.cornell.edu or by calling 1-866-293-3077.",
    "additional_video_privacy_statement": "During the session, your child and anyone visible or audible nearby will be recorded through your computer's webcam and microphone using Lookit. The video/audio recording will be used to verify parent/guardian permission, verify child assent when applicable, check data quality, code responses, transcribe unclear answers, and analyze the study. If we cannot verify that you gave permission for the session, no other video from the session will be viewed or analyzed. Because this study is conducted through Lookit, researchers at MIT who work on the Lookit platform may also have access to data collected during the session, as well as Lookit account data, child profiles, and demographic survey responses. These MIT researchers are not members of the Cornell research team for this study. Their access is related to administration and support of the Lookit platform, including providing technical support, identifying and fixing technical problems, assessing data quality, evaluating the platform's success in reaching families, and improving the platform. Please note that Children Helping Science (also known as Lookit) is an online research platform operated by the Massachusetts Institute of Technology (MIT) and is not affiliated with Cornell University. Children Helping Science/Lookit has its own privacy and security policies, available in its Privacy Statement (https://childrenhelpingscience.com/privacy/) and Terms of Use (https://childrenhelpingscience.com/termsofuse/). We anticipate that participation in this study presents no greater risk than everyday use of the Internet.",
    "additional_segments": [
        {
            "title": "Parent/guardian role",
            "text": "Parents/guardians are not research participants. You should remain nearby during the study to help your child begin, assist with technical issues if needed, and stop the session if your child wants to stop. We may ask you to sit behind your child or avoid influencing your child's responses while remaining available to help if needed."
        },
        {
            "title": "Assent",
            "text": "Your child will be asked whether they want to participate in age-appropriate language before the study begins. Please stop the session if your child says no, asks to stop, becomes distressed, or no longer wants to participate."
        },
        {
            "title": "Privacy and confidentiality",
            "text": "The Cornell research team will have access to Lookit study data made available to researchers for this study. This may include your Lookit account/contact information, your child's profile information, demographic information if provided, the webcam/audio recording, the consent recording, and your child's responses. Direct identifiers may include your name, your email address, your child's name or nickname, your child's age or date of birth, and audio/video recordings. Your child/session will be assigned a study ID. Research data used for analysis will be labeled with study IDs rather than names whenever possible. Contact information and links between names/Lookit identifiers and study IDs will be stored separately from response data. Cornell research copies of identifiable data will be stored in a restricted Cornell Box folder and/or on password-protected Cornell-managed computers, and will be accessed only by approved research personnel. We will not publish your child's name, birthdate, contact information, or demographic information together with your child's video."
        },
        {
            "title": "Future use and data sharing",
            "text": "Identifiers may be removed from private information. After identifiers are removed, de-identified information may be used for future research or shared with other researchers without additional consent. De-identified behavioral data may be shared in scientific papers, repositories, or with collaborators. Identifiable video/audio recordings will not be shared outside the approved research team unless you provide the optional permission described below."
        },
        {
            "title": "Confidentiality limits",
            "text": "While we strive to keep all participant information confidential, there are important exceptions. If we become concerned that you or your child may be at risk of harm, or that someone may be harming your child, we may be required to disclose relevant information to appropriate authorities to help ensure safety."
        },
        {
            "title": "Optional video/audio use beyond research analysis",
            "text": "You may separately choose whether to allow Cornell researchers to use short video/audio clips or still images from this session for teaching, scientific presentations, outreach, publications, or similar academic/research purposes. Your child's participation in the study does not depend on whether you give this optional permission. You will not receive financial compensation for these optional uses. At the end of the study, you will be given a checkbox to indicate whether you give permission for these optional uses."
        }
    ],
    "include_databrary": true
};

const instructions = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
        <div class="instructions-box">
            <h2>Overview</h2>
            <ul>
                <li>The study takes about 25 minutes.</li>
                <li>Your child will watch short videos and decide whether to move cookies between characters, or put them in a cookie jar.</li>
                <li>There are no right or wrong answers.</li>
            </ul>
            <p><strong>For parents:</strong> Please help keep your child's attention,
               but don't tell them which answer to choose.</p>
        </div>`,
    choices: ['Start ▶'],
    data: { trial_type: 'instructions' }
};

const start_recording = { type: chsRecord.StartRecordPlugin };
const stop_recording  = { type: chsRecord.StopRecordPlugin  };

const debrief_page = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <div class="instructions-box" style="max-width: 800px; margin: 40px auto; text-align: left; line-height: 1.7; font-family: Arial, sans-serif;">
            <h1 style="text-align: center; margin-bottom: 30px; font-size: 2.2em; font-weight: normal; color: #333;">Thank you!</h1>
            
            <p style="margin-bottom: 1.5em; font-size: 1.05em; color: #444;">This study is part of our ongoing research examining how children reason about causation, fault, and punishment when one person causes another person to lose something they value.</p>
            
            <p style="margin-bottom: 1.5em; font-size: 1.05em; color: #444;">In our previous work, we examined how children and adults decide whether someone should be punished for causing harm, and how that decision changes depending on whether the harm was caused on purpose or by accident. We wanted to build on this work by adding two new elements: first, a wider range of causes for the harm — from deliberate actions, to carelessness, to accidents that are truly nobody's fault (like a pet running off or a gust of wind); and second, letting your child decide not just whether someone should be punished, but how — by choosing whether to take cookies away from the person responsible and give them to the person who was harmed, or put them in a cookie jar where no one gets them.</p>
            
            <p style="margin-bottom: 1.5em; font-size: 1.05em; color: #444;">We are interested in how children's judgments of causation, fault, and punishment develop, particularly in how they distinguish intentional actions, carelessness, and accidents, and how that shapes the way they choose to respond.</p>
            
            <p style="margin-bottom: 1.5em; font-size: 1.05em; color: #444;"><strong>Compensation:</strong> As a reminder, you will receive a $5 Amazon.com gift card via email within approximately a week of completing the study.</p>
            
            <p style="margin-bottom: 2em; font-size: 1.05em; color: #444;">This experiment specifically tests how children's choice of punishment — giving the person's cookies to the one who was harmed, versus putting them in a cookie jar where no one benefits — changes depending on whether the harm was caused on purpose, through carelessness, or by pure accident. It also examines how children weigh comparative fault between the two people involved — similar to the legal concept of comparative negligence — when both parties may share some responsibility for what happened. This research is conducted by Dr. Shaun Nichols and the Explanation Lab. If you have any questions, please contact us at <a href="mailto:sbn44@cornell.edu" style="color: #337ab7; text-decoration: none;">sbn44@cornell.edu</a>. Thank you again for your participation!</p>
            
            <p style="margin-bottom: 2em; font-size: 1.05em; color: #444;">If you'd like to learn more about this topic, see our published research: <a href="https://davdrose.github.io/assets/pdf/cause_fault_cog_sci.pdf" target="_blank" style="color: #337ab7; text-decoration: none;">this paper</a>.</p>
            
            <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
                <button id="fb-share-btn" class="jspsych-btn" style="background-color: #3b5998; color: white; border: none; padding: 12px 24px; font-size: 1.1em; border-radius: 4px; cursor: pointer; margin-right: 15px; font-weight: bold;">Share this study on Facebook!</button>
                <button id="exit-btn" class="jspsych-btn" style="background-color: #5cb85c; color: white; border: none; padding: 12px 24px; font-size: 1.1em; border-radius: 4px; cursor: pointer; font-weight: bold;">Exit</button>
            </div>
        </div>
    `,
    choices: "NO_KEYS",
    on_load: function() {
        const fbBtn = document.getElementById('fb-share-btn');
        if (fbBtn) {
            fbBtn.addEventListener('click', function() {
                const studyUrl = window.location.href;
                const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(studyUrl)}`;
                window.open(fbShareUrl, '_blank');
            });
        }
        const exitBtn = document.getElementById('exit-btn');
        if (exitBtn) {
            exitBtn.addEventListener('click', function() {
                jsPsych.finishTrial();
                // CHS saves the completed response and awaits recording uploads,
                // then redirects using the study's existing Exit URL.
                // A local navigation timer here could interrupt that save.
            });
        }
    },
    data: { trial_type: 'debrief' }
};

const chsTimeline = [
  video_config,
  video_consent,
  instructions,
  start_recording,
  ...timeline,
  stop_recording,
  debrief_page,
];

