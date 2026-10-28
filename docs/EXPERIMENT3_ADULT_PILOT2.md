# Experiment 3 adult necessity Pilot 2 — October 28, 2026

[Open Setup & launch in the Study Console](https://explanation-lab-studies.web.app/?view=projects&project=COOKIE-ALLOCATION-PAY5&study=TORT-COGNITION-ADULT-NECESSI-PN4E&section=setup).

- Study: **Tort cognition — adult necessity pilot 2** (`TORT-COGNITION-ADULT-NECESSI-PN4E`). Project: cookie allocation (`COOKIE-ALLOCATION-PAY5`).
- Recruitment targets: **25 Necessary** (`necessity`) and **25 Unnecessary** (`no_necessity`), **50 total**. Each participant sees hallway and stairs in the same condition.
- [Hosted researcher preview](https://explanation-lab.github.io/tort_cognition/code/experiments/experiment3/adults-pilot2/preview.html) · [Participant entry](https://explanation-lab.github.io/tort_cognition/code/experiments/experiment3/adults-pilot2/) · [Materials gallery](https://explanation-lab.github.io/tort_cognition/code/experiments/experiment3/adults-pilot2/materials-preview.html).
- Stage: **Sandbox testing**. Production submissions: **0**. Both Sandbox conditions Passed; CSV format confirmed.

## Materials and release

Version `adult-necessity-2.0.0`; materials revision `8d6e005727c6`; jsPsych 7.3.4; frozen Explanation Lab client 1.5.1; schema 2.0.0. Each of the four approved decks has eleven slides, including knowledge of one escape direction versus five safe escape routes before the threat. Both conditions retain the intentional collision and two-cookie loss. Cookie allocation, fault and carelessness questions, practice, counterbalancing, consent, demographics, and feedback follow the first adult necessity pilot.

Official Console converter fingerprint: `7f9bc7a60ecb6ff35a901e8b6966ba16a9ce8c3e378562282a1b8388e439c2aa`. The Console verified and imported the published manifest, conditions, design, version, and demographic fields. `build-necessity-pilot2-console.mjs` reproduces the integration from native source with the frozen client.

Published code commit: `a30d3d5c1c4f6fc178cf1a77fc1e47ac6b16c44d`, branch `codex/necessity-pilot2-release`, fast-forwarded to the established hosting branch `codex/child-full-study-media`. [Successful Pages release](https://github.com/explanation-lab/tort_cognition/actions/runs/40685865493).

The release uses a separate `adults-pilot2/` URL. All 67 new hosted files matched the staged release byte for byte. Additive staging preserves 1,618 existing hosted files; all eight published baseline manifests and their file records were checked. The first pilot's registration, participant records, source decks, study files, and hosted address remain unchanged. No Console application deployment, Firestore Rule change, or production recruitment was performed.

## Completed checks

Two full hosted Sandbox walkthroughs saved successfully in the in-app browser. The necessary session used hallway → stairs with victim right; the unnecessary session used stairs → hallway with victim left. Both used carelessness first; the synthetic suite additionally covered both judgment orders, both case orders, and both character arrangements across sixteen sessions, plus two full preview sessions. All forty-four hosted story images loaded at their expected size, including the new pre-threat route information. Cookie practices, transfer to the victim and jar, the no-move branch, both judgments, demographics, feedback, and awaited saving were exercised.

The downloaded complete Sandbox bundle passed validation: two submissions, forty raw trial rows, thirty-eight Responses CSV rows, two Demographics CSV rows, and four complete case summaries. All four summaries contain the exact approved deck hashes, eleven slide IDs/timings, materials revision, version, condition, cookie allocations, and rating values. CSV allocations and judgments match the observed UI; all five demographic values match the raw responses. Exact assigned and observed condition codes matched in both sessions. The full detected CSV format was confirmed in the Console, retaining all response fields and separate participant-level demographics.

The one-click preflight was run and reported exactly two remaining actions: **add the Prolific completion URL**, and **confirm the Prolific link, places, and completion code**. The automated production redirect handshake depends on those fields and is not claimed as passed.

## Prolific handoff

1. Add the completion URL supplied by Prolific in **Setup & launch**.
2. Copy the Console's balanced external-study link into Prolific, set **50 places**, and use the matching completion code. Consent states **$1.50** and approximately **five minutes**, as in the prior pilot.
3. Confirm those Prolific settings in the Console, rerun **Check everything before launch**, then enable collection and publish recruitment when ready.

Sandbox exports and verification artifacts remain private/ignored under `code/tools/generated/adult-necessity-pilot2/build/`. The downloaded bundle also remains in Downloads. Do not commit response exports or use the completed first pilot's launch link for this release.
