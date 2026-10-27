# Separate adult consent-check pilot

Published version: `adult-consent-check-1.0.0`. Entry directory:
`code/experiments/experiment2/adults-consent-check/`.

- [Consent preview](http://127.0.0.1:8766/code/experiments/experiment2/adults-consent-check/preview.html?condition=consent)
- [No-consent preview](http://127.0.0.1:8766/code/experiments/experiment2/adults-consent-check/preview.html?condition=no_consent)

Each adult receives the existing eight stories in one consent/no-consent
condition. Immediately after each story, before the cookie-movement question,
each case adds the approved
case-specific consent question with **Yes** and **No** buttons. The final story
picture stays above the question, using the same reminder image, prompt and
button styling as the scales. Either answer advances directly to the cookie question;
there is no correctness feedback. Practice has no added questions. “Intentionally”
is omitted from both hitting and throwing questions.

The original adult and child entries, stories, practice, allocations, scale
wording, counterbalancing, demographics, participation terms and feedback are
unchanged. The task has 52 trials: the existing 44 plus eight consent questions.
Source questions are in `questions.json` in the new entry directory. Both
conditions use identical question wording. The new configuration snapshots the
current adult story configuration and copies the required approved images byte for byte into its own assets directory. The
runtime and submission client are copied byte for byte. Session assignments are
isolated from the original studies, and preview and participant assignments also
have distinct namespaces.

Each question saves `phase`, `measure` and `trial_role` as `consent_check`, plus
`consent_check_question`, `consent_check_response` (`yes`/`no`),
`consent_check_value` (boolean) and `consent_check_rt` (milliseconds).
After the scales, those four answer fields are also added to the case-summary row,
alongside its allocation and ratings. There is still exactly one case-summary
row per case. Its existing `case_rt` retains the original story/allocation/scales
timing; consent timing is separate. All rows carry the distinct version and
`consent_check_pilot: true`. Submission requires all eight answers. Review
responses stay in the browser and can be downloaded from the review controls.

From the repository root:

```sh
python3 code/tools/generate-adult-consent-check.py
node code/tools/check-adult-consent-check.cjs
node code/tools/check-adult-consent.cjs
node --experimental-strip-types code/tools/build-consent-check-console.mjs /path/to/current/study-console
```

Regeneration updates only this pilot's configuration, copied images, frozen runtime/client and
HTML script versions. It does not change the original studies or question source.
If source stories are intentionally updated, regenerate and review this pilot
before rebuilding its Console manifest.

Verification covers both conditions, both scale orders and both character
layouts, exact parity with all original task screens, every story image,
placement immediately after each story and before cookies, answer storage in trials and case summaries,
repeated clicks, condition verification, launch/version isolation and awaited
submission. Browser review verified the final picture, matching buttons and
advancement for both answers, including a narrow viewport.

The official converter generated a separate `explanation-lab.config.json`
with conditions `consent` and `no_consent`, five existing demographic fields,
frozen client 1.5.1 and between-participant assignment. The pilot is now hosted and separately registered. Both actual Sandbox
sessions and their downloaded exports passed. Existing registrations and
participant studies were preserved.


## Verified Console handoff — October 27, 2026

[Open Setup & launch](https://explanation-lab-studies.web.app/?view=projects&project=COOKIE-ALLOCATION-PAY5&study=TORT-COGNITION-ADULT-CONSENT-XEGR&section=setup).

- Study: **Tort cognition — adult consent-check pilot**, `TORT-COGNITION-ADULT-CONSENT-XEGR`.
- Project: cookie allocation, `COOKIE-ALLOCATION-PAY5`.
- Balanced targets: `consent` = 25; `no_consent` = 25; 50 adults total.
- Hosted participant entry: <https://explanation-lab.github.io/tort_cognition/code/experiments/experiment2/adults-consent-check/>.
- Hosted researcher preview: <https://explanation-lab.github.io/tort_cognition/code/experiments/experiment2/adults-consent-check/preview.html>.
- Published version: `adult-consent-check-1.0.0`; frozen client 1.5.1; jsPsych 7.3.4; submission schema 2.1.0.
- Package fingerprint: `9ea7301be5054059f05dbb738654f3c40fb325d6487c995c23d5dfd4c8f61ebb`.
- Release commit: `8e5db2691aa6861038899f43c002fdb81e3ba541` on `codex/adult-consent-check-pilot`, published from the established `codex/child-full-study-media` hosting branch.
- Successful Pages release: <https://github.com/explanation-lab/tort_cognition/actions/runs/40536563380>.

Both real hosted Sandbox links completed the entire participant flow and saved
successfully. The Console marked both conditions Passed. Every story frame was
traversed, followed immediately by its consent question, cookie question and two
scales. Yes and No consent responses, practice, transfers to the victim and jar,
leaving cookies unchanged, demographics, feedback and final saving were tested.

The official downloaded bundle passed validation: 104 raw trials (52 per session),
102 Responses CSV rows, two Demographics CSV rows and 16 complete case summaries.
Each session contains all eight consent answers in the right order, with the same
answer, question text, boolean and response time in its case summary. All four
ratings and eight-cookie totals were verified. Condition verification is matched
in both sessions; the five demographic values and case values match the CSVs.
The full default CSV format was confirmed without dropping fields. Synthetic
checks additionally covered both conditions, both scale orders, both character
layouts and two full preview sessions.

All 201 new hosted pilot files matched the release byte for byte. Staging
preserved all 1,410 existing hosted files, and all seven previous hosting
manifests remained unchanged. The new pilot carries its own byte-identical
copies of the 191 required images, including the approved intentional-case risk
wording, so it does not depend on changing the existing adult study URLs.
No Console application code, access rules, existing registrations, participant
records or Prolific recruitment settings were changed.

The final one-click preflight was run and reported exactly two remaining owner
actions: add the pilot's new Prolific completion URL, then confirm the generated
external-study link, 50 places and matching completion code. The redirect
handshake remains gated on those fields. The study remains at **Sandbox testing**
with production collection off and zero real submissions. The inherited
participation terms specify $1.50 and approximately five minutes. After finishing
Prolific setup, rerun preflight and use the Console's normal final launch steps.

Sandbox exports and detailed QA evidence remain private and ignored under
`code/tools/generated/adult-consent-check-pilot/`. The official ZIP is also in
Downloads. No Sandbox exports or credentials were committed.
