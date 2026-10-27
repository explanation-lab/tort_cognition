# Separate adult consent-check pilot

Local version: `adult-consent-check-1.0.0`. Entry directory:
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
current adult story configuration and reuses its approved image assets. The
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

Regeneration updates only this pilot's configuration, frozen runtime/client and
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
frozen client 1.5.1 and between-participant assignment. This is a local source
and package candidate. Hosting, a new Console registration, Sandbox submission
checks and Prolific setup remain release steps; no existing registration or
participant study was changed.
