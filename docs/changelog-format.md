# CHANGELOG Entry Format

Reference for writing and reviewing CHANGELOG entries in the **hoist-react library** `CHANGELOG.md`.

## Where Entries Go

Write new entries in a **changelog fragment**, not in `CHANGELOG.md`. Each pull request adds a
markdown file in [`changelog.d/`](../changelog.d/README.md), named for its branch. The fragment holds
the release body without its `##` heading: the same `###` section headers and bullets described
below. A release assembles every fragment into `CHANGELOG.md` under the real version number, so pull
requests never conflict over `CHANGELOG.md` and a late merge cannot land under a shipped version.

```markdown
### 🎁 New Features

* Added `Callout.dismissible`, which shows a close button. The dismissed state persists with
  `persistWith`.
```

- `pnpm changelog add fix "<text>"` adds a one-line entry to `changelog.d/<branch>.md`. It finds
  the section from a short name, such as `fix`, `feature`, `tech` or `breaking`, and wraps the line.
- `pnpm changelog new` creates an empty `changelog.d/<branch>.md` for a longer entry. Or create the
  file yourself.
- `pnpm changelog check` validates the fragments. CI runs the same check on each pull request, and
  shows the entries that the pull request adds in the job summary.
- A fragment uses only the section headers listed in `changelog.d/config.json`. You can leave the
  emoji off a header. The release adds it.
- Leave release-level content out of fragments: the `(upgrade difficulty: ...)` suffix, the
  upgrade-notes sentence, and `####` topic groups. The release curator adds them.
- To change an unreleased entry, edit its fragment, even one that another pull request added. To
  correct a released entry, edit `CHANGELOG.md`.
- `pnpm changelog preview` prints the next release as it will be assembled.

The `xh-changelog` command behind these scripts ships with `@xh/hoist-dev-utils`. See its README
section "Changelog fragments".

> **Library vs. Application changelogs:** This guide applies to hoist-react and other Hoist library
> packages. Hoist *application* changelogs have different formatting requirements — see the
> [Application Changelogs](#application-changelogs) section at the end of this document.

## Entry Structure

Every major version entry in `CHANGELOG.md` should use this structure once the release is curated.
Minor/patch releases use whichever sections apply.

```markdown
## {VERSION} - {YYYY-MM-DD}

### 💥 Breaking Changes (upgrade difficulty: {RATING})

See [`docs/upgrade-notes/v{NN}-upgrade-notes.md`](docs/upgrade-notes/v{NN}-upgrade-notes.md) for
detailed, step-by-step upgrade instructions with before/after code examples.

* {Required change 1}
* {Required change 2}
    * {Sub-detail if needed}
* ...

### 🎁 New Features

* {Feature description}

### 🐞 Bug Fixes

* {Fix description}

### ⚙️ Technical

* {Internal change description}

### ⚙️ Typescript API Adjustments

* {Type-level change description}

### 🤖 AI Docs + Tooling

* {AI docs/tooling change description}

### ✨ Styles

* {CSS/SCSS change description}

### 📚 Libraries

* {Library} `{old} → {new}`
```

On `develop`, the top heading is the next major version as a snapshot:
`## {N}.0.0-SNAPSHOT - unreleased`. It stays empty. Entries wait in `changelog.d/` until a release
assembles them below it. See [Versioning](./build-and-publish.md#versioning) for the release steps.

## Section Headers

Use these emoji-prefixed headers consistently:

| Section | Header | When to Include |
|---------|--------|-----------------|
| Breaking Changes | `### 💥 Breaking Changes` | Required app changes exist |
| New Features | `### 🎁 New Features` | New capabilities added |
| Bug Fixes | `### 🐞 Bug Fixes` | Bugs fixed |
| Technical | `### ⚙️ Technical` | Internal changes worth noting |
| TS API Adjustments | `### ⚙️ Typescript API Adjustments` | Type-level changes (signatures, generics, exports) |
| AI Docs + Tooling | `### 🤖 AI Docs + Tooling` | AI assistant docs, MCP server, CLI tools |
| Styles | `### ✨ Styles` | CSS/SCSS changes, new variables, class renames |
| Libraries | `### 📚 Libraries` | Major dependency version bumps |

**Note:** TS API Adjustments and Technical share the ⚙️ emoji but are distinct sections. TS API
Adjustments covers type signature changes that may affect app compilation but not runtime behavior.
Technical covers internal implementation changes worth noting.

## Voice and Tense

- **Past tense, action-driven** for descriptions: "Enhanced", "Fixed", "Added", "Improved",
  "Removed", "Refactored"
- **Imperative** for developer instructions: "Update", "Adjust", "Remove", "Migrate"
- Avoid starting bullets with "New" (prefer "Added"), "Support for" (prefer "Added support for"),
  or present tense verbs like "Fix", "Allow", "Enable"

### Examples

Good:
```markdown
* Enhanced `GridModel` column state management to support partial updates.
* Added support for `warning` and `info` severity in `Field.rules`.
* Fixed regression with `Store.revert()` on stores with summary records.
```

Bad:
```markdown
* New support for warning severity in rules    (use "Added", not "New support for")
* Fix to regression in Store.revert            (use "Fixed regression", not "Fix to")
* Allow improved editing of columns            (use "Enhanced" or "Added", not "Allow")
```

## Breaking Changes Section

**Every major version with breaking changes MUST include all of the following.** Do not skip or
reorder these requirements:

1. **Difficulty rating in the header** — append `(upgrade difficulty: {RATING})` to the section
   header. See Difficulty Ratings below for the rating scale.
2. **Upgrade notes link as a standalone sentence** — immediately after the header (before any
   bullets), include a sentence linking to the upgrade notes file. This is **not** a bullet point —
   it is a standalone paragraph. Use this exact format:
   ```markdown
   See [`docs/upgrade-notes/v{NN}-upgrade-notes.md`](docs/upgrade-notes/v{NN}-upgrade-notes.md) for
   detailed, step-by-step upgrade instructions with before/after code examples.
   ```
3. **List** every required app-level change as a separate bullet
4. **Be specific** — name exact classes, methods, and config keys
5. **Link** to relevant framework upgrade guides (e.g. Blueprint, AG Grid) when applicable

Each bullet should be concise (1-2 lines). The upgrade notes file handles expanded detail with
before/after code examples.

### Grouping by Topic (large releases only)

When a major version carries an unusually large set of breaking changes - roughly eight or more
bullets, spanning several unrelated areas - group them under `####` topic sub-headers instead of
presenting one flat list. This is a special case for big releases; ordinary versions keep the flat
list.

- Add a short lead-in paragraph after the `### 💥` header (following the upgrade notes link) telling
  readers that the changes are grouped and which groups affect every app.
- Name groups for the area an app developer would search for: `React 19`, `Build Tooling`,
  `Data - Cube`, `Data - Store and Records`, `Grid - Column Chooser and Column State`.
- Order groups by how broadly they apply - framework-wide and tooling changes first, then
  package-specific ones.
- Keep the difficulty rating on the `###` header, summarizing the release as a whole. Do not rate
  individual groups.
- Group only Breaking Changes. Other sections (New Features, Bug Fixes) stay flat, since readers scan
  them rather than work through them.

### Deprecations and Removals

Keep them together so a reader can see every scheduled removal in one place:

- **Removals of previously deprecated APIs** go in a `Scheduled Removals` sub-list under Breaking
  Changes, one sub-bullet per removal, naming the version that deprecated it and the replacement.
- **New deprecations** that keep the API working go under Technical, and say what replaces the
  deprecated API. Put one under Breaking Changes only when it accompanies the change that replaces
  it and apps must act now.

### Difficulty Ratings

When upgrade notes exist for a major version, include a difficulty rating:

```markdown
### 💥 Breaking Changes (upgrade difficulty: 🎉 TRIVIAL)
### 💥 Breaking Changes (upgrade difficulty: 🟢 LOW - {brief description})
### 💥 Breaking Changes (upgrade difficulty: 🟠 MEDIUM - {brief description})
### 💥 Breaking Changes (upgrade difficulty: 🔴 HIGH - {brief description})
```

## Libraries Section

List major dependency version changes with backtick-wrapped versions:

```markdown
### 📚 Libraries

* @blueprintjs/core `5.10 → 6.3`
* react-grid-layout `1.5 → 2.1`
* typescript `5.8 → 5.9`
```

Use abbreviated versions where the minor/patch isn't significant (e.g. `6.3` not `6.3.1`).

## General Guidelines

- **Positive tone**: Favor words like "Enhanced", "Improved", "Streamlined" where accurate.
  Concisely note *why* a change is an improvement when not obvious from context (e.g.
  "Improved shutdown handling — ensures full cleanup if the component unmounts unexpectedly").
  Accuracy always takes precedence — bug fixes should be reported clearly as such.
- **Conciseness**: This is a changelog, not a guide. One bullet = one change, 1-3 lines max.
  Upgrade notes provide granular detail when needed; keep changelog entries brief and scannable.
- **Specificity**: Name classes, methods, and config keys in backticks.
- **Completeness**: Changes that modify behavior, APIs, or configuration in ways developers need
  to know about should be accounted for. Trivial changes (formatting, internal refactors with no
  behavioral impact, tooling updates) do not need to be included.
- **No duplication**: Don't repeat the same change across sections. Pick the most relevant section.
- **Issue/PR links**: Don't add GitHub issue or PR links (e.g. `[#1234]`) to entries by default.
  Include one only when explicitly requested, or when it points to extensive context that genuinely
  doesn't fit the changelog's scope. Issue/PR references normally belong in the commit message and
  PR description, not the changelog.
- **Relevance test**: Include a fact only if a developer or agent upgrading an app needs it to adopt
  the release well. Exact counts, timings, token figures, and enumerations of CSS variables or
  similar fine-grained additions fail that test; acknowledge such additions in general terms.
- **Library names**: In prose, name third-party libraries by their product name (AG Grid, Blueprint,
  MobX). Package names and import paths keep their own spelling inside code spans.
- **Punctuation**: End each bullet with a period.
- **Line wrapping**: Hard-wrap list item text at 100 characters. Use two-space indentation for
  continuation lines. This keeps the raw Markdown readable in editors and diffs.

## Application Changelogs

Hoist *application* changelogs (e.g. in app repos that depend on `@xh/hoist`) follow the
conventions above. hoist-dev-utils parses the app's changelog into JSON at build time, and
`ChangelogDialog` shows it to users as in-app release notes.

Bullets in an application changelog can wrap and can hold sub-bullets, as library entries do. This
needs a hoist-dev-utils release after 16.5. Older releases keep only the first line of each bullet
and silently drop the rest. On those releases, write each bullet as a single unwrapped line.
