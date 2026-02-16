---
name: xh-upgrade-notes
description: Create or update detailed upgrade notes and CHANGELOG entry for a major Hoist React release. Use when writing documentation for a new major version upgrade.
argument-hint: [version, e.g. v79 or 79.0.0]
disable-model-invocation: true
---

# Upgrade Notes Skill

Create comprehensive, action-oriented upgrade documentation for a major Hoist React release. This
skill produces two artifacts and validates them via dry-run simulation.

**Version:** $ARGUMENTS

## Phase 0: Setup

1. Parse the version from `$ARGUMENTS`. Normalize to `vNN` short form and `NN.x.x` full form.
2. Identify the **prior major version** by reading `CHANGELOG.md` to find the entry immediately
   before the target version (e.g. if target is v79, prior is v78.x).
3. Determine the **git tag range** for diffing: `v{prior}..v{target}` (e.g. `v78.1.4..v79.0.0`).
   List available tags with `git tag -l 'v*'` to find exact tag names.
4. Read [template.md](template.md) for the upgrade notes document template.
5. Read [`docs/changelog-format.md`](../../docs/changelog-format.md) for CHANGELOG entry conventions.

## Phase 1: Research

Gather all information needed to write accurate documentation. Launch parallel research agents
where possible.

### 1a. Git History Analysis

- Run `git diff --stat {prior_tag}..{target_tag}` to understand scope of changes.
- Run `git log --oneline {prior_tag}..{target_tag}` to see all commits in the release.
- Read the existing CHANGELOG entry for the target version to understand what's already documented.

### 1b. Source File Analysis

Read key source files that commonly change between major versions:

- `package.json` — dependency versions, resolutions
- `core/XH.ts` — singleton API, app-level getters
- `core/HoistBase.ts` — base class lifecycle, decorators
- `cmp/grid/` — GridModel, Column, grid infrastructure
- `cmp/form/` — FormModel, FieldModel, FormField
- `cmp/tab/` — TabContainerModel, TabSwitcher
- `cmp/layout/` — layout components, LayoutProps
- `data/` — Store, Field, Filter, Cube, View
- `styles/` — CSS variables, SCSS mixins
- `kit/blueprint/` — Blueprint wrappers and re-exports
- `security/` — HoistAuthModel, auth clients
- `desktop/cmp/dash/` — DashContainerModel, DashCanvasModel
- `desktop/cmp/panel/` — Panel, PanelModel

### 1c. Sample App Upgrade Analysis

Review upgrade commits in sample applications to understand real-world app-level changes required.
These apps are available locally (see CLAUDE.local.md for paths):

- **Toolbox** (`../toolbox`) — canonical reference app, always upgraded first
- Additional sample/customer applications listed in `CLAUDE.local.md`

For each app, search git log for commits referencing the target version:
```bash
git -C ../toolbox log --oneline --all --grep="v{NN}" --grep="hoist" --grep="{NN}.0"
```

Read the key files from upgrade commits: `package.json`, `tsconfig.json`, `Bootstrap.ts`,
and any files touching changed APIs.

**Important:** Only reference Toolbox by name in the upgrade notes (it's the public demo app).
Do not mention other sample or customer applications by name — use them only for research and
abstracted patterns.

### 1d. Framework Documentation

If the upgrade involves a major library version change, fetch the official upgrade guide for
reference:

- **Blueprint:** `https://github.com/palantir/blueprint/wiki/Blueprint-{N}.0`
- **AG Grid:** `https://www.ag-grid.com/react-data-grid/upgrading-to-ag-grid-{N}/`
- **Highcharts:** `https://www.highcharts.com/blog/changelog/`

## Phase 2: Write the CHANGELOG Entry

### Audit the Existing Entry

Read the current CHANGELOG entry for the target version. Evaluate against these criteria:

- [ ] **Structure**: Uses standard emoji-prefixed section headers (💥 Breaking Changes,
  🎁 New Features, 🐞 Bug Fixes, ⚙️ Technical, ✨ Styles, 📚 Libraries) — see
  [`docs/changelog-format.md`](../../docs/changelog-format.md)
- [ ] **Breaking Changes**: All required app changes are listed as individual bullets (not buried
  in prose under Technical or other sections)
- [ ] **Completeness**: Changes that affect behavior, APIs, or configuration are accounted for
  (trivial formatting, internal refactors, or tooling changes can be omitted)
- [ ] **Accuracy**: Class names, method names, file paths are correct
- [ ] **Tense**: Past-tense, action-driven voice ("Enhanced", "Fixed", "Added") — exception:
  developer instructions use imperative ("Update", "Adjust")
- [ ] **Conciseness**: Each bullet is 1-2 lines; detailed instructions belong in upgrade notes
- [ ] **Libraries section**: Present for major version bumps with `old → new` format

### Write or Rewrite the Entry

If the entry needs significant changes, rewrite it following the format in
[`docs/changelog-format.md`](../../docs/changelog-format.md). Key principles:

- Breaking Changes section should have a difficulty rating and list every required app change
- Each bullet names the specific action concisely — the upgrade notes handle the detail
- Include a link to the upgrade notes file: `docs/upgrade-notes/v{NN}-upgrade-notes.md`
- Include a link to the relevant framework upgrade guide (if applicable)
- Libraries section lists major dependency version bumps in `old → new` format

## Phase 3: Write the Upgrade Notes

Create `docs/upgrade-notes/v{NN}-upgrade-notes.md` following the template in
[template.md](template.md).

### Content Requirements

Each upgrade step must include:

1. **What** to change — explicit file paths from project root
2. **Before/after** code blocks — with appropriate language tags (`typescript`, `json`, `scss`,
   `bash`, etc.)
3. **Search commands** — `grep -r "pattern" client-app/src/` to help developers find affected files
4. **Why** — brief explanation of what changed and why (one sentence is usually enough)
5. **Verification** — how to confirm the step was done correctly (where applicable)

### Writing Guidelines

- Be specific and concrete. Name exact files, classes, methods, and property names.
- Use code blocks generously. Developers copy-paste from upgrade guides.
- Before/after examples should show realistic code, not pseudocode.
- Use element factory style in code examples (not JSX), consistent with Hoist conventions.
- Reference Toolbox as the canonical example where helpful (it's the public demo app).
- Do not mention sample or customer applications by name, with the exception of Toolbox.
- Keep prose minimal between code blocks — this is a recipe, not an essay.
- Steps should be ordered logically (build system first, then source code, then cleanup).
- The verification checklist at the end should cover all critical functionality.

### Update the docs/README.md Index

Add a row to the table in `docs/README.md` for the new version.

## Phase 4: Dry-Run Validation

After writing both artifacts, launch an independent validation agent. This agent stress-tests
the upgrade notes by simulating a real upgrade.

### Agent Setup

Launch a Task agent (subagent_type: "general-purpose") with these instructions:

> You are an "App Upgrade Advisor" agent. Your job is to evaluate upgrade documentation by
> simulating its use against a real application.
>
> 1. **Setup:** Check out Toolbox (at `../toolbox`) at a commit BEFORE the target hoist-react
>    version was applied. Use `git log --oneline` to find the last commit before the upgrade.
>    Create a temporary branch for the dry run.
>
> 2. **Dry run:** Working solely from the upgrade notes file at
>    `docs/upgrade-notes/v{NN}-upgrade-notes.md` and the app's current source, walk through each
>    step as if advising on a real upgrade. For each step, evaluate:
>    - Is the instruction clear and unambiguous?
>    - Does the "Before" code match what's actually in the app?
>    - Are there files or patterns in the app not covered by the guide?
>    - Would a developer know exactly what to do?
>
> 3. **Report:** Produce a structured report with:
>    - **Gaps**: Steps or changes not covered by the guide
>    - **Ambiguities**: Instructions that could be misinterpreted
>    - **Inaccuracies**: Before/after examples that don't match reality
>    - **Suggestions**: Ways to improve clarity
>    Rate each finding as HIGH / MEDIUM / LOW priority.
>
> 4. **Cleanup:** Restore Toolbox to its original state (checkout original branch, delete temp
>    branch). Do NOT leave any changes behind.
>
> IMPORTANT: Do NOT modify any files in the upgrade notes or CHANGELOG — only report findings.

### Handling the Report

Review the agent's findings. Address all HIGH and MEDIUM priority items by updating the upgrade
notes and/or CHANGELOG entry. LOW priority items are at your discretion.

## Phase 5: Finalize

1. Re-read both artifacts one final time to check for consistency between the CHANGELOG entry
   and the upgrade notes (same version numbers, same list of changes, matching links).
2. Verify the `docs/README.md` index is updated.
3. Present a summary to the user of what was created/changed and offer to commit.

## Important Notes

- This skill produces documentation — it does NOT modify application source code.
- The CHANGELOG is a consolidated file appended to on each release. Balance completeness with
  conciseness. The upgrade notes file is where expanded detail lives.
- Always verify code examples against actual source files. Never guess at class names, method
  signatures, or file paths.
- The dry-run validation phase is critical — it catches gaps that are invisible when writing
  documentation from the "inside out". Do not skip it.
