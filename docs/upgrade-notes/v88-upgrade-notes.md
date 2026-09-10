# Hoist React v88 Upgrade Notes

> **From:** v87.x → v88.0.0 | **Released:** TBD | **Difficulty:** 🟢 LOW

## Overview

Hoist React v88 removes the two-tier CSS custom property override system. Previously, Hoist
defined each framework variable as `--xh-grid-bg: var(--grid-bg, var(--xh-bg))`, where the
unprefixed `--grid-bg` served as an app-level override hook. Applications now override the `--xh-`
prefixed variables directly - simpler, IDE-friendly, and consistent with modern CSS variable
conventions.

This is a **mechanical migration** for most apps. The majority of overrides simply need an `xh-`
prefix added. Nine unprefixed names differed from their `--xh-` counterparts - see the mapping table
in Step 3.

The most significant app-level impacts are:

- **Unprefixed override hooks no longer do anything** - an app that still sets `--pad: 8` or
  `--grid-bg: #fafafa` silently loses that customization. Migrate every override to its `--xh-*`
  name.
- **Nine hook names did not match their `--xh-` variable** - these need the table in Step 3, not
  a plain prefix.
- **`css-data.json` ships in the package** - a VS Code Custom Data file giving autocomplete and
  hover docs for every `--xh-*` variable (optional, Step 6).

There is no hoist-core change in this release.

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v87.x
- [ ] Your package manager (**pnpm**, **yarn**, or **npm**) is available and working
- [ ] **hoist-core** - no new minimum. v88 keeps v87's floor of hoist-core >= 40.5.0.

## Upgrade Steps

### 1. Update `package.json`

Bump hoist-react to v88.

**File:** `package.json`

Before:
```json
"@xh/hoist": "~87.3.0"
```

After:
```json
"@xh/hoist": "~88.0.0"
```

Then run `pnpm install` (or `yarn install` / `npm install`) to update dependencies.

### 2. Migrate Unprefixed CSS Variable Overrides

Find every place your app sets an unprefixed CSS custom property that served as a Hoist override
hook. These are typically in the app's root stylesheet (e.g. `App.scss`), occasionally in
component-specific SCSS, and rarely as inline `style` custom properties in TypeScript.

**Find candidates - any custom property declaration that is not already `--xh-*`:**
```bash
# SCSS/CSS declarations. Add your own app prefix (e.g. --myapp-) to the exclusion list.
grep -rnE '^\s*--[a-z][a-z0-9-]*\s*:' --include='*.scss' --include='*.css' client-app/src \
  | grep -vE -- '--(xh|ag|bp[0-9]?|fa|myapp)-'

# Custom properties set from TypeScript inline styles.
grep -rnE "['\"]--[a-z][a-z0-9-]*['\"]\s*:" --include='*.ts' --include='*.tsx' client-app/src \
  | grep -vE -- '--(xh|ag|myapp)-'
```

Any hit that names a Hoist variable is an override to migrate. Your app's own variables (with your
own prefix) and third-party variables (`--ag-*`, `--bp*-*`) are unaffected. When in doubt whether
a name is a Hoist variable, search for `--xh-<name>` in `node_modules/@xh/hoist/css-data.json`.

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

Nine unprefixed override hooks had names that differed from the `--xh-` variable they configured.
If your app set any of these, use the `--xh-` name from the right column:

| Old unprefixed hook | New `--xh-` variable |
|---|---|
| `--form-field-info-border-color` | `--xh-form-field-info-border-color` (see note) |
| `--form-field-invalid-border-color` | `--xh-form-field-invalid-border-color` (see note) |
| `--form-field-warning-border-color` | `--xh-form-field-warning-border-color` (see note) |
| `--grid-cell-bg-highlight` | `--xh-grid-cell-change-bg-highlight` |
| `--grid-header-cell-lr-pad` | `--xh-grid-header-lr-pad` |
| `--input-placeholder-color` | `--xh-input-placeholder-text-color` |
| `--popover-backdrop` | `--xh-popover-backdrop-bg` |
| `--popover-shadow` | `--xh-popover-box-shadow` |
| `--zone-grid-cell-pad-px` | `--xh-zone-grid-cell-lr-pad-px` |

**Note on the form-field validation colors.** In prior versions the
`--form-field-{info,invalid,warning}-border-color` hooks fed *two* variables each: the
`-border-color` variable (as intended) and, by mistake, the matching `-box-shadow` variable - so an
app that set the hook to a color replaced the whole `box-shadow` value with a bare color, an
invalid value that browsers silently dropped. That app therefore saw its color on the validation
border but no inset shadow. In v88 the shadow variables reference the `-border-color` variables
properly, so setting `--xh-form-field-invalid-border-color` colors both the border and the inset
shadow. To keep the prior no-shadow appearance, add e.g.
`--xh-form-field-invalid-box-shadow: none;` alongside the color.

**Find affected files:**
```bash
grep -rnE -- '--(form-field-(info|invalid|warning)-border-color|grid-cell-bg-highlight|grid-header-cell-lr-pad|input-placeholder-color|popover-backdrop|popover-shadow|zone-grid-cell-pad-px)\b' \
  --include='*.scss' client-app/src
```

### 4. Check Override Selectors

Set overrides on `body.xh-app` (or a more specific selector), not on bare `body`. Hoist declares
its defaults on `body`, so an app declaration on `body` has equal specificity and wins only by
source order. Under the old system this did not matter, because the unprefixed hook had no
competing framework declaration.

Before:
```scss
body {
  --grid-large-font-size: 16;
}
```

After:
```scss
body.xh-app {
  --xh-grid-large-font-size: 16;
}
```

Hoist also redefines a subset of variables for the dark theme and for mobile, under `body.xh-dark`
and `body.xh-mobile`. These have the same specificity as `body.xh-app`, and application
stylesheets load after Hoist's, so a `body.xh-app` override applies in both themes exactly as the
old hooks did. Where you want per-theme values, keep using an `&.xh-dark` block as in the example
in Step 2.

Scoped overrides are now a first-class option as well - set a `--xh-*` variable on any container
to restyle only that subtree:

```scss
.my-special-panel {
  --xh-grid-bg: #fafafa;
}
```

### 5. Check for Unitless Number Overrides

If your app overrides any size-related variables that use Hoist's unitless number convention
(e.g. `--xh-pad`, `--xh-font-size`, `--xh-tbar-min-size`), continue to set them as **unitless
numbers**. This has not changed:

```scss
// Still correct - unitless numbers for size variables
body.xh-app {
  --xh-pad: 8;
  --xh-font-size: 14;
  --xh-appbar-height: 48;
}
```

### 6. Enable IDE Autocomplete (optional)

Hoist now ships `css-data.json`, a [VS Code Custom Data](https://code.visualstudio.com/blogs/2020/02/24/custom-data-format)
file describing every `--xh-*` variable. Point VS Code at it to get autocomplete and hover
documentation in your SCSS:

**File:** `.vscode/settings.json`
```json
{
  "css.customData": ["./client-app/node_modules/@xh/hoist/css-data.json"]
}
```

Adjust the path to wherever your app's `node_modules` lives. The same file is a convenient
machine-readable index of Hoist's variables for coding agents.

## Verification Checklist

After completing all steps:

- [ ] `pnpm install` / `yarn install` / `npm install` completes without errors
- [ ] Application loads without console errors
- [ ] Custom colors, spacing, and typography render correctly in both light and dark themes (and on
  mobile, if applicable)
- [ ] Form validation styling looks as intended if you override any `-border-color` (Step 3 note)
- [ ] No unprefixed Hoist override hooks remain:
  ```bash
  # Should return only your app's own custom vars (--myapp-*, etc.)
  grep -rnE '^\s*--[a-z][a-z0-9-]*\s*:' --include='*.scss' client-app/src \
    | grep -vE -- '--(xh|ag|bp[0-9]?|fa)-'
  ```

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) - canonical example of a Hoist app
- [`styles/README.md`](../../styles/README.md) - CSS variable system documentation
- [Version Compatibility](../version-compatibility.md) - hoist-react / hoist-core matrix
