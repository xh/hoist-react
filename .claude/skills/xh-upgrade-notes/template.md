# Upgrade Notes Template

Use this template when creating `docs/upgrade-notes/v{NN}-upgrade-notes.md`. Replace all
`{placeholders}` with actual values. Remove sections that don't apply, and add version-specific
sections as needed.

---

```markdown
# Hoist React v{NN} Upgrade Notes

> **From:** v{PRIOR}.x → v{VERSION} | **Released:** {DATE} | **Difficulty:** {DIFFICULTY}

## Overview

{1-2 paragraphs describing what changed and why. Name the major framework/library changes and
their most significant app-level impacts as a bulleted list.}

The most significant app-level impacts are:

- **{Impact 1}** — {brief description}
- **{Impact 2}** — {brief description}
- ...

## Prerequisites

Before starting, ensure:

- [ ] **Node.js** version meets project requirements
- [ ] **yarn** is available and working
- [ ] **hoist-core** is upgraded to the minimum required version (if applicable)
- [ ] {Version-specific prerequisites}

## Upgrade Steps

### 1. Update `package.json`

Bump hoist-react and update any changed dependencies.

**File:** `package.json`

Before:
```json
"@xh/hoist": "{PRIOR_VERSION}",
```

After:
```json
"@xh/hoist": "{TARGET_VERSION}",
```

{Additional dependency changes, resolutions, removals.}

### 2. Update `tsconfig.json` (if applicable)

{Compiler option changes.}

### 3. Update `Bootstrap.ts` / App Entry Point (if applicable)

{Library registration changes — AG Grid modules, Highcharts imports, etc.}

### 4. Update Import Paths

{Import path changes — moved exports, renamed modules.}

**Find affected files:**
```bash
grep -r "{old_import}" client-app/src/
```

### 5. Update API Usage

{Component props, model configs, method renames.}

Before:
```typescript
{existing code}
```

After:
```typescript
{updated code}
```

### 6. Update CSS/SCSS (if applicable)

{Class renames, CSS variable changes.}

**Find affected files:**
```bash
grep -r "{old_class}" client-app/src/
```

### 7. Clean Up Deprecated Patterns (if applicable)

{Remove deprecated aliases, configs, or patterns scheduled for removal.}

## Verification Checklist

After completing all steps:

- [ ] `yarn install` completes without errors
- [ ] `yarn lint` passes (or only pre-existing warnings remain)
- [ ] `npx tsc --noEmit` passes
- [ ] Application loads without console errors
- [ ] Grids render and function correctly (sorting, filtering, grouping)
- [ ] Forms validate and submit correctly
- [ ] {Version-specific verification items}
- [ ] No deprecated patterns remain: `grep -r "{pattern}" client-app/src/`

## Reference

- {Link to relevant framework upgrade guide, if applicable}
- [Toolbox on GitHub](https://github.com/xh/toolbox) — canonical example of a Hoist app
```

---

## Difficulty Ratings

Use one of these ratings in both the CHANGELOG Breaking Changes header and the upgrade notes
header:

| Rating | Emoji | Meaning |
|--------|-------|---------|
| TRIVIAL | 🎉 | Rename or simple find-replace, no functional changes |
| LOW | 🟢 | Minor adjustments, typically < 30 min |
| MEDIUM | 🟠 | Significant changes to build or source, typically 1-4 hours |
| HIGH | 🔴 | Major restructuring, large-scale refactoring, multi-day effort |

## Step Ordering Convention

Order steps from build configuration outward to application code:

1. `package.json` — version bump, dependency additions/removals, resolutions
2. `tsconfig.json` — compiler option changes
3. `Bootstrap.ts` / app entry point — library registration (AG Grid modules, Highcharts)
4. Import path changes
5. API changes — component props, model configs, method renames
6. CSS/SCSS changes — class renames, CSS variable changes
7. Cleanup of deprecated patterns

This order lets developers build and test incrementally — the app should install and compile
after the build system steps, then progressively fix source-level issues.
