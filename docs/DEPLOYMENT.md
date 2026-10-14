# Deployment status

No push or deployment is authorized by the cleanup request. Experiment 1 children is intended for CHS study 6208, with recruitment off and pilot ages 4–5. The platform integration is still pending. Keep the current live consent wording and wrapper steps; the existing local wrapper sources are preserved unchanged by this cleanup. Consult the archived `docs/lookit-exp1-pilot/` records and `code/pilot/generated/chs6208-prepilot-20261014/` live-wrapper backup when resuming integration. Do not silently replace the live wrapper with a different local version.

`build-chs.py` composes the shared runtime, current child task and retained wrapper; it does not upload or edit Lookit. Production builds require an explicit HTTPS asset directory and all expected narration files. `--qa` only permits loopback assets, disables review tools, mutes playback and marks the generated result nondeployable. Production defaults to real narration, without review tools.

Local previews/checks do not certify platform consent, recording, storage or recruitment. These require separate authorized Lookit preview testing before publication. Adult participant entries retain their existing Proliferate integration; local review pages do not submit.
