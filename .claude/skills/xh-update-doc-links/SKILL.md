---
name: xh-update-doc-links
description: Pre-commit documentation consistency check. Ensures docs/README.md index and docs/README-ROADMAP.md stay in sync with documentation files on disk, validates inter-doc links, and enhances cross-references when new docs are added. Invoke after editing READMEs or concept docs, before committing.
tools: Read, Glob, Grep, Bash, Edit, Write
---

# xh-update-doc-links — Documentation Consistency Check

Pre-commit skill to ensure documentation index files, inter-doc links, and cross-references
stay consistent after editing READMEs or concept docs.

## Step 1: Discover Documentation Files

Build a complete inventory of documentation files on disk.

1. Use `Glob` to find all `**/README.md` files, excluding `node_modules/`, `public/`, and
   `static/` directories.
2. Use `Glob` to find all files under `docs/`.
3. Run `git diff --name-only` and `git status --porcelain` to identify which docs were
   recently changed or added.
4. Build a master list of all documentation files, noting which are new or recently modified.

## Step 2: Read Index Files

Read the two index files and parse their current entries.

1. Read `docs/README.md` — focus on the **Package Documentation** section (the tables under
   "Core Framework", "Components", "Utilities", "Concepts", and "Other Packages").
   - Parse each table row to extract the package path and linked README path.
   - Parse the "Other Packages" paragraph to extract unlisted package names.

2. Read `docs/README-ROADMAP.md` — parse all priority tables and the Concepts table.
   - Extract each package path, description, and status value.
   - Note which entries are `Planned`, `Drafted`, or `[Done](link)`.

## Step 3: Reconcile Indexes

Compare documentation on disk against both index files.

### docs/README.md Reconciliation

For each README on disk:
- Check if it has an entry in the appropriate `docs/README.md` table (Core Framework, Components,
  Utilities, Concepts, or Other Packages).
- **Missing entries:** Add a new table row in the correct section using this format:
  ```markdown
  | [`/package/`](../package/README.md) | One-sentence description | Key, Topics, Here |
  ```
  (Note: paths are relative from `docs/`, so package READMEs use `../` prefix.)
- **Stale entries:** If an entry links to a README that no longer exists, remove it.
- **Promotion:** If a package is listed in the "Other Packages" paragraph and now has a
  README, move it to the appropriate table and remove it from the paragraph.
- **AGENTS.md directive:** Verify that `AGENTS.md` still contains the directive pointing
  to `docs/README.md` (the "Hoist Documentation" section). Do not re-add package tables
  to AGENTS.md.

### README-ROADMAP.md Reconciliation

For each README on disk:
- Check if it has an entry in the roadmap with the correct status.
- **Status updates:** Change `Planned` → `[Done](../path/README.md)` for newly completed docs.
  Change `Drafted` → `[Done](../path/README.md)` if appropriate.
- **Missing entries:** Add entries for docs not yet on the roadmap.
- **Progress notes:** Add a progress note entry for the current date if doc changes are
  detected. Follow the existing format in the "Progress Notes" section.

## Step 4: Validate Inter-Doc Links

Scan every documentation file (READMEs + concept docs) for relative markdown links.

1. For each file, extract all markdown links matching `[text](path)` where `path` is a
   relative path (not a URL).
2. Resolve each relative path from the source file's directory.
3. Verify the target exists on disk.
4. **Broken links:** Report and fix. Common fixes include:
   - Correcting `../` depth for moved files
   - Updating paths for renamed files
   - Removing links to deleted files

## Step 5: Enhance Cross-Links

When new or recently changed docs are detected, look for cross-linking opportunities.

1. **Topic-based linking:** Scan existing READMEs for sections that discuss the same topic
   as a new doc. Where an existing README has a brief treatment of a topic that now has
   dedicated documentation, add a contextual "See [`/package/`](path) for details" link.

2. **Related Packages sections:** Check if a new README was created for a package that is
   referenced without a link in another doc's "Related Packages" section. Add the link using
   the format:
   ```markdown
   - [`/package/`](path) - Brief description
   ```

3. **Be conservative:** Only add links where the existing text already discusses the topic.
   Do not restructure existing content or add new sections just to create links.

## Step 6: Report

Output a summary organized into these sections:

1. **Index Updates** — `docs/README.md` entries added, updated, or removed.
2. **Roadmap Updates** — Status changes, new entries, progress notes added.
3. **Broken Links Fixed** — Source file, broken target, and fix applied.
4. **New Cross-Links Added** — Source file, target doc, and surrounding context.
5. **Items Needing Review** — Ambiguities or items requiring human judgment.

If no changes were needed in a category, note "None" for that section.
