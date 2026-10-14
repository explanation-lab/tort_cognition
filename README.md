# Tort cognition

Current approved Experiment 1 and Experiment 2 studies, each with adult and child versions. The studies use eight scenarios, 8/2 starting story counts, continuous fault and carelessness ratings, high/little practice, and study-wide destination counterbalancing. Child narration and the synchronized first-construct demo are included.

- `code/experiments/`: current study entries, images, child audio and editable PowerPoints.
- `code/shared/`: common task runtime, adult forms, local review panel and required libraries.
- `code/tools/`: current configuration, Lookit build, PowerPoint export, narration, verification and review-package tools.
- `docs/`: current scenario/narration sources and concise testing/deployment instructions.
- `data/` and `figures/`: reserved for the research outputs; no participant data is included.

## Preview

Open `code/experiments/index.html` while serving this repository locally. On this computer: http://127.0.0.1:8766/code/experiments/index.html. Each audience has an `index.html` participant entry and a separate `pilot-preview.html` with researcher controls. Child `index.html` opens directly into the normal Welcome screen with narration on and no researcher panel, mute option or review launch screen. A browser that blocks autoplay requires an Enable sound click on that same Welcome screen; the narration waits rather than skipping. Adult `index.html` entries retain their participant behavior.

Standalone child entries run the same behavioral task as the CHS build; platform consent, camera recording, storage and debrief are supplied by Lookit, not these HTML files. Researcher previews do not submit responses.

For a click-to-open collaborator ZIP with no server or installation, run the packaging tool described in `docs/MAINTENANCE.md`.

The current editable decks are under `code/experiments/experimentN/adults/slides/pilot-v3/`. Both audiences use the corresponding story images; retained asset bytes and wording are unchanged.

## Preservation

Historical studies, September exports, audits, development screenshots, recording masters and previous delivery packages are preserved outside this repository at `/Users/davidrose/Documents/tort_cognition_archive/2026-10-14-pre-cleanup/`. That archive includes a checksum-verified full snapshot and a verified Git history bundle. Existing local baseline tags and historical branches remain unchanged.

This cleanup has not pushed, deployed or changed any live study.
