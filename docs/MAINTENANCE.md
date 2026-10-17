# Maintain the current studies

The scenario source is `docs/scenarios.json`. Instructions are in `docs/narration/source.json`; runtime clip paths and segment timing are in the neighboring JSON files. Configurations in each study's `js/` folder are generated from these sources. Update the canonical editable PowerPoints when changing story wording; preserve experimental decisions supplied by the researcher.

From the repository root:

```sh
python3 code/tools/generate-pilot.py
python3 code/tools/build-chs.py --experiment 1 --asset-base http://127.0.0.1:8766/code/experiments/experiment1/children/ --qa
python3 code/tools/build-chs.py --experiment 2 --asset-base http://127.0.0.1:8766/code/experiments/experiment2/children/ --qa
node code/tools/check-study.cjs
node code/tools/check-adult-between.cjs
node code/tools/check-narration.cjs
python3 code/tools/generate-narration.py
python3 code/tools/check-assets.py
python3 code/tools/package-browser-review.py
```

Node verification needs jsdom 26.1.0 (`npm install --prefix code/tools`), or `TORT_JSDOM_MODULE` can point to an existing installation. Audio verification needs Python with PyAV and NumPy; use `/private/tmp/tort-cleanup-audio-env/bin/python` on this computer. PowerPoint export requires the Artifact Tool library supplied by the Codex workspace runtime; `TORT_ARTIFACT_MODULE` can specify its module URL.

`export-slides.mjs` re-exports approved decks at 960×540 and checks their manifest hashes. Use `--experiment N --scenario KEY` to scope an export. The deck and manifest must be synchronized before exporting changed captions.

Generated builds, reports and collaborator ZIPs stay in ignored `code/tools/generated/`; they are not source files. Packaging includes four browser-openable review entries, child audio on, researcher panels expanded, and all current editable story decks. Review copies cannot submit participant responses.

For the adult between-subjects entry, `generate-adult-between.py` regenerates the two configurations and named single-condition entries. After changing that entry, freeze the current Console client and regenerate its official setup manifest with `node --experimental-strip-types code/tools/build-adult-console.mjs /path/to/explanation-lab-study-console`. The Pages workflow stages the adult pilot alongside byte-identical Experiment 1 child media. The main branch and Lookit study are separate release decisions.

Until `codex/adult-between-subjects-pilot` is merged, run Pages updates from that branch. The older workflow on `main` stages only child media and would remove the adult studies from Pages. The earlier adult pilot, `TORT-COGNITION-ADULT-BETWEEN-77X8`, now contains real production records; preserve that study, its frozen hosted files and its data.

The approved adult consent pilot is registered separately as `TORT-COGNITION-ADULT-CONSENT-3RHX` (adult consent pilot v3): 50 adults, balanced 25 consent / 25 no_consent, $1.50 and approximately five minutes. Its question flow must match Pilot 1 exactly, with no added consent questions or checks in either condition. Both conditions have 44 trials; only the approved story slides vary consent. It includes the corrected spill slide 9 wording (“water you left on the floor”), materials revision `db1630cd45a4`. Both hosted conditions have fresh complete saved Sandbox tests, matched condition verification and inspected official exports without check-response fields; the CSV format is confirmed. It remains in Sandbox testing pending the owner's new Prolific completion URL and final Prolific configuration. Earlier unlaunched consent registrations `TORT-COGNITION-ADULT-CONSENT-XCA7` and `TORT-COGNITION-ADULT-CONSENT-GNDL` are closed and archived with their Sandbox history preserved. See `code/experiments/experiment2/consent/README.md` for the setup link and verification record. Build its official manifest with `node --experimental-strip-types code/tools/build-consent-console.mjs /path/to/current/study-console`. The Pages workflow has independent `consent_review` and `consent_pilot` switches, so removing collaborator review does not remove the participant study.
