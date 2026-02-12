# CHANGELOG Entry Format

Reference for writing and reviewing CHANGELOG entries in `CHANGELOG.md`.

## Entry Structure

Every major version entry should use this structure. Minor/patch releases use whichever sections
apply.

```markdown
## {VERSION} - {YYYY-MM-DD}

### 💥 Breaking Changes

* {Introductory bullet with overview and link to upgrade notes}
* {Required change 1}
* {Required change 2}
    * {Sub-detail if needed}
* ...

### 🎁 New Features

* {Feature description}

### 🐞 Bug Fixes

* {Fix description}

### ⚙️ Typescript API Adjustments

* {Type-level change description}

### ⚙️ Technical

* {Internal change description}

### ✨ Styles

* {CSS/SCSS change description}

### 📚 Libraries

* {Library} `{old} → {new}`
```

## Section Headers

Use these emoji-prefixed headers consistently:

| Section | Header | When to Include |
|---------|--------|-----------------|
| Breaking Changes | `### 💥 Breaking Changes` | Required app changes exist |
| New Features | `### 🎁 New Features` | New capabilities added |
| Bug Fixes | `### 🐞 Bug Fixes` | Bugs fixed |
| TS API Adjustments | `### ⚙️ Typescript API Adjustments` | Type-level changes (signatures, generics, exports) |
| Technical | `### ⚙️ Technical` | Internal changes worth noting |
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

For major versions, this section should:

1. **List** every required app-level change as a separate bullet
2. **Be specific** — name exact classes, methods, and config keys
3. **Include** difficulty-rated sub-headers when useful (see Difficulty Ratings below)
4. **Link** to upgrade notes when available: `docs/upgrade-notes/v{NN}-upgrade-notes.md`
5. **Link** to relevant framework upgrade guides (e.g. Blueprint, AG Grid) when applicable

Each bullet should be concise (1-2 lines). The upgrade notes file handles expanded detail with
before/after code examples.

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
- **Conciseness**: This is a changelog, not a guide. One bullet = one change, 1-2 lines max.
- **Specificity**: Name classes, methods, and config keys in backticks.
- **Completeness**: Changes that modify behavior, APIs, or configuration in ways developers need
  to know about should be accounted for. Trivial changes (formatting, internal refactors with no
  behavioral impact, tooling updates) do not need to be included.
- **No duplication**: Don't repeat the same change across sections. Pick the most relevant section.
- **Punctuation**: End each bullet with a period.
