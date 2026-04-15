---
name: xh-upgrade-notes
description: Verify, finalize, and write upgrade documentation for a major Hoist React release. Use when preparing a release, verifying or finalizing the changelog, writing upgrade notes, or any task involving release readiness for a major version (e.g. "prepare for release", "verify the changelog", "write upgrade notes for v84", "we're releasing today"). Produces a finalized CHANGELOG entry, a detailed upgrade-notes document with before/after code examples, and updates all doc indexes.
argument-hint: "[version, e.g. v84 or 84.0.0] (optional — auto-detected from CHANGELOG SNAPSHOT)"
---

# Upgrade Notes Skill

Verify, finalize, and write upgrade documentation for a major Hoist React release. This skill
produces two artifacts: a CHANGELOG entry and a detailed upgrade-notes document.

**Version:** $ARGUMENTS

## Phase 0: Setup

1. **Determine the target version.** If `$ARGUMENTS` provides a version, normalize to `vNN` short
   form and `NN.x.x` full form. If no argument is provided, read the topmost entry in
   `CHANGELOG.md` — if it's a `-SNAPSHOT` entry, use that version as the target.
2. Identify the **prior major version** by reading `CHANGELOG.md` to find the entry immediately
   before the target version (e.g. if target is v84, prior is v83.x).
3. Determine the **git range** for diffing. If the prior version has been tagged, use the tag
   range `v{prior}..HEAD` (or `v{prior}..v{target}` if the target is also tagged). List available
   tags with `git tag -l 'v*'` to find exact tag names. If no prior tag exists, use
   `git log --oneline` to identify the boundary commit.
4. Read [template.md](template.md) for the upgrade notes document template.
5. Read [`docs/changelog-format.md`](../../../docs/changelog-format.md) for CHANGELOG entry
   conventions.

## Phase 1: Research

Gather all information needed to write accurate documentation.

### 1a. Git History Analysis

- Run `git log --oneline {range}` to see all commits in the release.
- Run `git diff --stat {range}` to understand scope of changes.
- Read the existing CHANGELOG SNAPSHOT entry to understand what's already documented.

### 1b. Targeted Source Analysis

Let the git diff guide what to read — do not blindly read a fixed list of source files. Focus on:

- `package.json` — always check for dependency version changes
- Files touched by commits that aren't already reflected in the CHANGELOG
- Source files for any breaking changes (to verify accuracy of class/method/prop names)

The goal is to verify CHANGELOG accuracy and find gaps, not to read the entire codebase.

### 1c. Sample App Upgrade Analysis

Review upgrade commits in sample applications to understand real-world app-level changes required.
These apps are available locally (see CLAUDE.local.md for paths):

- **Toolbox** (`../toolbox`) — canonical reference app, always upgraded first
- Additional sample/customer applications listed in `CLAUDE.local.md`

For each app, search git log for commits referencing the target version:
```bash
git -C ../toolbox log --oneline --all --grep="v{NN}\|{NN}.0\|hoist.*{NN}"
```
This is a fuzzy search — filter results to find the actual upgrade commit(s).

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

## Phase 2: Verify and Finalize the CHANGELOG Entry

The CHANGELOG entry for the target version typically already exists as a `-SNAPSHOT` entry that
has been built up incrementally during development. The primary task is to **audit and finalize**
it, not write it from scratch.

### Audit the Existing Entry

Cross-reference every commit in the release range against the CHANGELOG entry. For each commit,
determine whether it's already covered, should be added, or is appropriately omitted (trivial
internal changes, formatting, tooling).

Evaluate the entry against these criteria:

- [ ] **Completeness**: All commits that affect behavior, APIs, or configuration are accounted for
- [ ] **Structure**: Uses standard emoji-prefixed section headers (💥 Breaking Changes,
  🎁 New Features, 🐞 Bug Fixes, ⚙️ Technical, ✨ Styles, 📚 Libraries) — see
  [`docs/changelog-format.md`](../../../docs/changelog-format.md)
- [ ] **Breaking Changes**: All required app changes are listed as individual bullets (not buried
  in prose under Technical or other sections)
- [ ] **Section placement**: Each entry is in the most appropriate section
- [ ] **Accuracy**: Class names, method names, file paths are correct
- [ ] **Tense**: Past-tense, action-driven voice ("Enhanced", "Fixed", "Added") — exception:
  developer instructions use imperative ("Update", "Adjust")
- [ ] **Conciseness**: Each bullet is 1-3 lines; detailed instructions belong in upgrade notes
- [ ] **Libraries section**: Present for major version bumps with `old → new` format

### Present Findings Before Making Changes

Present the audit findings to the user before editing the CHANGELOG. This is important because
the user has context about what's significant, where entries belong, and how much detail is
appropriate. Typical findings include:

- **Missing entries** — commits not reflected in the changelog
- **Section placement issues** — entries that belong in a different section
- **Wording or length concerns** — entries that are too verbose or too terse
- **Difficulty rating** — proposed rating for the Breaking Changes section

Wait for the user's feedback before making edits. The user may redirect decisions about section
placement, entry length, or what to include/exclude.

### Apply Changes

After the user confirms, update the CHANGELOG following the format in
[`docs/changelog-format.md`](../../../docs/changelog-format.md). Key principles:

- Breaking Changes section should have a difficulty rating and list every required app change
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
- Use package-manager-neutral language. Write `yarn install` / `npm install` (not just one).
  The target application may use either yarn or npm — check for `yarn.lock` vs
  `package-lock.json` to determine which, but write docs that work for both.
- Steps should be ordered logically (build system first, then source code, then cleanup).
- The verification checklist at the end should cover all critical functionality.

### Update the docs/README.md Index

Add a row to the **Upgrade Notes** table in `docs/README.md` for the new version. The table
uses this format — add the new row at the top (most recent first):

```markdown
| [v{NN}](./upgrade-notes/v{NN}-upgrade-notes.md) | YYYY-MM-DD | {difficulty emoji} {DIFFICULTY} | Brief summary of key changes |
```

Difficulty levels: `🎉 TRIVIAL`, `🟢 LOW`, `🟠 MEDIUM`, `🔴 HIGH`.

### Update the Version Compatibility Guide

Add or update the upgrade notes link in the corresponding row of the compatibility matrix in
`docs/version-compatibility.md`. Find the row for the target version and add a link in the
Upgrade column:

```markdown
| {NN}.x | -- | | {CORE}.x | Notes | [Notes](./upgrade-notes/v{NN}-upgrade-notes.md) |
```

If the row already has an empty Upgrade column, add the link. If the row doesn't exist yet,
this is a new release — add it following the existing pattern. Also update the reverse lookup
table (hoist-core → hoist-react) if a new core minimum is introduced.

**Important:** The Notes columns in both tables should describe features that drive the
**core/react pairing** — server-side features that the react version needs to support (e.g.
span sampling, admin panel features backed by new core endpoints, OTEL tag alignment). Do not
include purely client-side changes (e.g. FontAwesome upgrade, component defaults) — those are
noise in a version compatibility context.

### Update the MCP Doc Registry

Add an entry to the `entries` array in `docs/doc-registry.json` so the new upgrade notes are
discoverable via `hoist-search-docs`. Place the entry after the last existing upgrade-notes entry
(at the end of the `entries` array), following this pattern:

```json
{
    "id": "docs/upgrade-notes/v{NN}-upgrade-notes.md",
    "title": "v{NN} Upgrade Notes",
    "mcpCategory": "devops",
    "viewerCategory": "upgrade",
    "description": "Upgrade guide from v{PRIOR}.x to v{NN}.0.0. {Difficulty} difficulty.",
    "keywords": ["upgrade", "migration", "breaking changes", "v{NN}", "v{PRIOR}"]
}
```

**Keyword policy:** Only add keywords beyond the standard set for **dead-end names** — APIs,
props, classes, or packages that were removed or renamed in this version and no longer exist
elsewhere in the codebase (e.g. `downloadjs`, `getClassName`, `disableXssProtection`). These
help agents discover upgrade notes when they encounter stale references. Do not add active
component or feature names (e.g. `GridModel`, `TraceService`, `Spinner`) — those would cause
upgrade notes to surface as noise when agents search for routine API guidance on those components.

## Phase 4: Dry-Run Validation

For **MEDIUM or HIGH difficulty** upgrades, launch an independent validation agent after writing
both artifacts. This agent stress-tests the upgrade notes by simulating a real upgrade.

For **LOW or TRIVIAL difficulty** upgrades, skip this phase — the sample app analysis in Phase 1c
provides sufficient validation. The user can always request a dry-run explicitly.

### Agent Setup

Launch a subagent (subagent_type: "general-purpose") with these instructions:

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

1. **Set the release date** if the user has provided one. Update the date in:
   - `CHANGELOG.md` version header (e.g. `## 84.0.0 - 2026-04-15`)
   - Upgrade notes banner (`**Released:** YYYY-MM-DD`)
   - `docs/README.md` upgrade notes table
   If the CHANGELOG still shows `-SNAPSHOT`, leave the date as-is unless the user confirms
   the release date.
2. Re-read both artifacts one final time to check for consistency between the CHANGELOG entry
   and the upgrade notes (same version numbers, same list of changes, matching links).
3. Verify all doc indexes are updated (docs/README.md, version-compatibility.md, doc-registry.json).
4. Present a summary to the user of what was created/changed and offer to commit.

## Important Notes

- This skill produces documentation — it does NOT modify application source code.
- The CHANGELOG is a consolidated file prepended to on each release. Balance completeness with
  conciseness. The upgrade notes file is where expanded detail lives.
- Always verify code examples against actual source files. Never guess at class names, method
  signatures, or file paths.
