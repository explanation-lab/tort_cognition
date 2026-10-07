# Research project title

Replace this title and describe the research question, motivation and scientific contribution. This is a flexible starting point for new Explanation Lab projects; change the structure when the science requires it. Existing projects do not need to adopt these folder names.

## Studies and experiments

No experiments, data or results are supplied by this template. Describe each actual study, its design and the corresponding source/materials once they exist. Separate current studies from planned work and older versions. Use experiment-by-experiment subdirectories where useful.

## Repository structure

```text
README.md              Durable scientific description and reproducibility entry points
PROJECT_STATUS.md      Current operational state and continuity
code/
  R/                   R analysis and figure generation
  experiments/         Experiment implementations and materials
data/                 De-identified analysis data
docs/                 Browser-renderable experiments or generated web output
figures/              Plots, diagrams, experimental screenshots and paper figures
```

`data/`, `docs/` and `figures/` are repository-root folders. Add Python or manuscript folders only when the project actually uses them. Keep `docs/` for browser-renderable output, not general notes. Explain any project-specific organization here.

## Running experiments and reproducing analyses

Add commands, software/package versions, inputs and expected outputs for the implementations that actually exist. Distinguish processing raw data from reproducing analyses on an already processed dataset. Record known reproduction limits rather than inventing missing steps.

## Scientific resources

Add verified preregistration, OSF, rendered experiment and rendered R-analysis links when available. There are no configured scientific resources in this template. A draft is not a preregistration; planned work is not a completed result.

## Contributors

Record confirmed contributions and authorship as appropriate. Add a CRediT statement when useful for a mature or publication repository; no roles or authorship are assigned by this template.

## Data and access

Commit only appropriately de-identified analysis data. Never commit participant-identifiable data, identifiable raw CHS exports, login/session information, payment or gift-card codes, credentials, tokens or private keys. Keep approved restricted source data outside GitHub. Review files and history before copying a repository or making it public.

Use [PROJECT_STATUS.md](PROJECT_STATUS.md) for active tasks, ownership, blockers and handoffs. Keep this README focused on durable scientific documentation.
