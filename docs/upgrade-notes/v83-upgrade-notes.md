# Hoist React v83 Upgrade Notes

> **From:** v82.x → v83.0.0 | **Released:** unreleased | **Difficulty:** 🟢 LOW

## Overview

Hoist React v83 removes the two-tier CSS custom property override system. Previously, Hoist
defined framework variables like `--xh-grid-bg: var(--grid-bg, var(--xh-bg))`, where the
unprefixed `--grid-bg` served as an app-level override hook. Applications now override the
`--xh-` prefixed variables directly — simpler, IDE-friendly, and consistent with modern CSS
variable conventions.

This is a **mechanical migration** for most apps. The majority of overrides simply need an `xh-`
prefix added. A small number of unprefixed names differed from their `--xh-` counterparts — see
the mapping table below.

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v82.x

## Upgrade Steps

### 1. Update `package.json`

Bump hoist-react to v83.

**File:** `package.json`

Before:
```json
"@xh/hoist": "~82.0.3"
```

After:
```json
"@xh/hoist": "~83.0.0"
```

Then run `yarn install` or `npm install` to update dependencies.

### 2. Migrate Unprefixed CSS Variable Overrides

Find all SCSS files where your app sets unprefixed CSS variables that previously served as Hoist
override hooks. These are typically in your app's root stylesheet (e.g. `App.scss`) and
occasionally in component-specific SCSS files.

**Find affected files:**
```bash
# Search for unprefixed overrides of known Hoist hooks
grep -rn '\-\-pad:\|--bg:\|--bg-alt:\|--bg-highlight:\|--font-size:\|--font-family:\|--border-color:\|--text-color' \
  --include="*.scss" client-app/src/
```

For a more thorough search, look for any CSS custom property declaration that doesn't use the
`--xh-` prefix and isn't an app-specific variable (e.g. your `--myapp-*` vars):
```bash
grep -rn '\-\-[a-z][a-z-]*:' --include="*.scss" client-app/src/ | grep -v '\-\-xh-\|--ag-\|--myapp-'
```

**For most variables**, the migration is simply adding the `xh-` prefix:

Before:
```scss
body.xh-app {
  --font-feature-settings: 'tnum', 'zero', 'ss01';
  --border-color: #cccccc;
  --grid-group-bg: hsl(206, 20%, 65%);
  --text-color-muted: #5d5d5d;
  --tbar-compact-min-size: 32;

  &.xh-dark {
    --border-color: #37474f;
    --text-color-muted: #acacac;
  }
}
```

After:
```scss
body.xh-app {
  --xh-font-feature-settings: 'tnum', 'zero', 'ss01';
  --xh-border-color: #cccccc;
  --xh-grid-group-bg: hsl(206, 20%, 65%);
  --xh-text-color-muted: #5d5d5d;
  --xh-tbar-compact-min-size: 32;

  &.xh-dark {
    --xh-border-color: #37474f;
    --xh-text-color-muted: #acacac;
  }
}
```

### 3. Handle Naming Mismatches

A small number of unprefixed override hooks had names that differed from their `--xh-` variable.
If your app overrode any of these, use the `--xh-` name from the right column:

| Old unprefixed hook | New `--xh-` variable |
|---|---|
| `--grid-cell-bg-highlight` | `--xh-grid-cell-change-bg-highlight` |
| `--grid-header-cell-lr-pad` | `--xh-grid-header-lr-pad` |
| `--input-placeholder-color` | `--xh-input-placeholder-text-color` |
| `--popover-backdrop` | `--xh-popover-backdrop-bg` |
| `--popover-shadow` | `--xh-popover-box-shadow` |
| `--zone-grid-cell-pad-px` | `--xh-zone-grid-cell-lr-pad-px` |

**Find affected files:**
```bash
grep -rn 'grid-cell-bg-highlight\|grid-header-cell-lr-pad\|input-placeholder-color\|popover-backdrop\|popover-shadow\|zone-grid-cell-pad-px' \
  --include="*.scss" client-app/src/
```

### 4. Check for Unitless Number Overrides

If your app overrides any size-related variables that use Hoist's unitless number convention
(e.g. `--xh-pad`, `--xh-font-size`, `--xh-tbar-min-size`), continue to set them as **unitless
numbers**. This has not changed:

```scss
// Still correct — unitless numbers for size variables
body.xh-app {
  --xh-pad: 8;
  --xh-font-size: 14;
  --xh-appbar-height: 48;
}
```

### 5. Note on Intent Text Color Hooks (Bug Fix)

In previous versions, the override hooks for `--xh-intent-primary-text-color`,
`--xh-intent-success-text-color`, and `--xh-intent-warning-text-color` all incorrectly referenced
`--intent-danger-text-color` due to a copy-paste bug. If your app was setting
`--intent-danger-text-color` expecting it to affect only the danger intent, be aware that in v83
these variables are now directly overridable via their `--xh-` names and no longer share a single
hook.

## Verification Checklist

After completing all steps:

- [ ] `yarn install` / `npm install` completes without errors
- [ ] Application loads without console errors
- [ ] Custom colors, spacing, and typography render correctly in both light and dark themes
- [ ] No unprefixed Hoist override hooks remain:
  ```bash
  # This should return only your app's own custom vars (--myapp-*, --dl-*, etc.)
  grep -rn '\-\-[a-z][a-z-]*:' --include="*.scss" client-app/src/ | grep -v '\-\-xh-\|--ag-'
  ```

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) — canonical example of a Hoist app
- [`styles/README.md`](../../styles/README.md) — CSS variable system documentation
