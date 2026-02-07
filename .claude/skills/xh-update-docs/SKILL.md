---
name: xh-update-docs
description: Update hoist-react documentation after adding new components or features. Use when a developer has made changes to hoist-react and wants to update README files, AGENTS.md, and the documentation roadmap to reflect those changes. Invoke with a commit hash or PR number. Also use when you detect that recent commits or PRs have added new components, models, or services that are not yet reflected in the documentation.
tools: Read, Glob, Grep, Bash, Edit, Write
---

# xh-update-docs — Documentation Update Skill

Update hoist-react documentation to reflect recent code changes. This skill analyzes
commits or PRs, identifies documentation-worthy changes, and proposes targeted updates
to package READMEs, AGENTS.md, and the documentation roadmap.

## Step 1: Resolve Input

Accept `$ARGUMENTS` as a commit hash or PR number.

**If arguments are provided:**
- If it looks like a PR number (digits only, typically 1-5 digits), use `gh pr diff <number>`
  and `gh pr view <number>` to analyze
- Otherwise treat it as a commit hash and use `git diff <hash>~1..<hash>`

**If no arguments are provided:**
- Run `git log --oneline -6` to fetch the last 6 commits
- Present them to the user via `AskUserQuestion` as selectable options, where each option
  label is the short hash + commit message
- The user picks the commit(s) that contain the changes to document

## Step 2: Analyze Changes

Analyze the diff to identify documentation-worthy changes:

1. **Identify new and modified files:**
   - New files added (new components, models, services)
   - Modified files (changed behavior, new props/config, new methods)

2. **Determine affected packages:**
   - Map changed files to packages: `/cmp/`, `/core/`, `/data/`, `/svc/`, `/desktop/`,
     `/mobile/`, `/admin/`, `/format/`, `/utils/`, etc.

3. **Read source files:**
   - Don't just rely on the diff — read the actual source files to understand what was
     added or changed, including class hierarchies and exported APIs

4. **Cross-reference CHANGELOG.md:**
   - Check `CHANGELOG.md` for entries related to the commit/PR
   - The changelog uses categorized sections under version headers:
     `💥 Breaking Changes`, `🎁 New Features`, `⚙️ Technical`, `🐞 Bug Fixes`
   - Look for entries in the current SNAPSHOT version that describe the change
   - These provide curated descriptions and are a strong signal of documentation-worthy changes

## Step 3: Inventory Existing Documentation

Check current documentation state for each affected package:

1. **Package READMEs** — Read the relevant README(s) to see what's already documented.
   Use `Glob` to check for `<package>/README.md` files.

2. **AGENTS.md** — Check for existing entries in the Package Documentation tables.
   Read `/AGENTS.md` and look for the affected package paths.

3. **Documentation Roadmap** — Check `docs/README-ROADMAP.md` for status of affected packages.

## Step 4: Propose Updates

Generate a categorized list of proposed documentation changes. For each change, explain
**what** would be updated and **why**.

Categories:

### README Updates
Edits to existing package READMEs. Examples:
- New section for a newly added component or model
- Updated configuration table with new properties
- New usage pattern or code example
- Updated architecture diagram
- New entry in Common Pitfalls

### New READMEs
If a new sub-package was added that lacks a README, propose creating one following the
7-section structure defined in `references/doc-conventions.md`.

### AGENTS.md Updates
New or updated entries in the Package Documentation table. Each entry needs:
- Linked package path
- One-sentence description
- Comma-separated list of key topics

### Roadmap Updates
Status changes in `docs/README-ROADMAP.md`:
- New package entries added to the appropriate priority tier
- Status changes (e.g., `Planned` → `Done` with link)
- New progress notes with date

## Step 5: Confirm with User

Present the full list of proposed changes in a clear summary. Ask the user to confirm
before applying any changes. Group by category and include enough context for the user
to evaluate each proposed change.

## Step 6: Apply Changes

After user confirmation, apply the approved documentation updates using Edit and Write tools.

Follow conventions from `references/doc-conventions.md`:
- Use the 7-section README structure for new READMEs
- Use element factory style in code examples (not JSX)
- Use `config` (not `props`) for model constructor args
- Fold defaults into description column (no separate Default column)
- Use ✅/❌ markers for correct/incorrect code patterns
- Use `**Avoid:**` prefix for inline warnings

After applying changes, present a summary of what was updated.
