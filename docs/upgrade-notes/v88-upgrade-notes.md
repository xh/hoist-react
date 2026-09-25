# Hoist React v88 Upgrade Notes

> **From:** v87.x → v88.0.0 | **Released:** TBD | **Difficulty:** 🔴 HIGH (full release - see
> CHANGELOG)

> **⚠️ Partial draft - CSS variables section only.** This file currently covers just one of
> v88's breaking changes: the overhaul of Hoist's CSS custom properties. It is the first section of
> the full v88 upgrade notes, which are still to be written. The other v88 breaking
> changes - TC39 decorators and the `@xh/hoist-dev-utils` 16 requirement, MobX 7, AG Grid 36, the
> React 19.3 floor, and the scheduled removals - are not yet covered here. Until they are, see the
> v88 entry in [`CHANGELOG.md`](../../CHANGELOG.md) for the complete list, and treat the
> Prerequisites and Step 1 below as incomplete.

## Overview - CSS Variables

Hoist React v88 resets Hoist's CSS custom properties onto a simpler baseline, designed to read the
way developers - and AI coding agents - expect CSS variables to work:

- **One tier of variables.** The unprefixed override hooks are gone. Previously Hoist defined each
  variable as `--xh-grid-bg: var(--grid-bg, var(--xh-bg))`, with the unprefixed `--grid-bg` as the
  app-level hook. Apps now set the `--xh-*` variables directly.
- **Sizes carry units.** Size variables hold real lengths (`--xh-spacing: 10px`) instead of
  unitless numbers, and every `-px` companion variable (`--xh-pad-px`, `--xh-font-size-px`, ...)
  is gone - read the base variable directly.
- **Consistent names.** About 40 variables were renamed to follow one naming grammar - e.g.
  `--xh-pad` → `--xh-spacing`, `--xh-tbar-*` → `--xh-toolbar-*`, `--xh-appbar-color` →
  `--xh-appbar-text-color`. See [Renamed Variables](#renamed-variables) and the naming conventions
  in [`styles/README.md`](../../styles/README.md#naming-conventions).
- **Overrides on `body.xh-app` always win**, in every theme and platform combination.
- **Three variables that never had any effect were removed.**

A codemod automates nearly all of the migration. The most significant app-level impacts are:

- **Old names and unitless values fail silently.** An app still setting `--grid-bg`, `--xh-pad`, or
  `--xh-font-size: 14` loses that customization without an error. Run the codemod, and watch for
  Hoist's development-mode console warning about unitless size variables.
- **Overrides set on `:root` or `html` no longer apply** - move them to `body.xh-app`.

The CSS variable change requires no hoist-core change.

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

### 2. Run the CSS Variable Codemod

From your `client-app` directory, after installing v88:

```bash
# Preview first - reports every change without writing.
node node_modules/@xh/hoist/docs/codemod/v88/codemod-css-vars.mjs --dry src

# Then apply.
node node_modules/@xh/hoist/docs/codemod/v88/codemod-css-vars.mjs src
```

It scans `.scss`, `.css`, `.ts`, `.tsx`, `.js`, `.jsx`, and `.md` files and:

1. **Migrates unprefixed hooks** to their `--xh-*` variable, including the handful whose names
   never matched (see [Old Hook Name Mismatches](#old-hook-name-mismatches)). Only declarations
   inside a root-level selector (`body`, `html`, `:root`, `.xh-app`, `.xh-dark`, `.xh-mobile`, and
   combinations) are migrated - the only places the hooks ever worked. Pass `--no-hooks` to skip.
2. **Renames** every renamed or retired `--xh-*` variable, anywhere it appears.
3. **Adds `px`** to size variables set to a bare number: `--xh-spacing: 8;` → `--xh-spacing: 8px;`.
4. **Simplifies arithmetic** that re-applied the unit: `calc(var(--xh-spacing) * 1px)` →
   `var(--xh-spacing)`, and `calc(var(--xh-toolbar-item-spacing) * 2px)` →
   `calc(var(--xh-toolbar-item-spacing) * 2)`.

Before:
```scss
body.xh-app {
  --pad: 8;
  --border-color: #cccccc;
  --tbar-min-size: 50;
  --grid-header-cell-lr-pad: 14;

  &.xh-dark {
    --tbar-bg: #1d272c;
  }
}

.my-panel__header {
  padding: var(--xh-pad-half-px) var(--xh-pad-px);
  font-size: var(--xh-font-size-small-px);
}
```

After:
```scss
body.xh-app {
  --xh-spacing: 8px;
  --xh-border-color: #cccccc;
  --xh-toolbar-min-size: 50px;
  --xh-grid-header-padding-inline: 14px;

  &.xh-dark {
    --xh-toolbar-bg: #1d272c;
  }
}

.my-panel__header {
  padding: var(--xh-spacing-half) var(--xh-spacing);
  font-size: var(--xh-font-size-small);
}
```

The codemod ends with a report. Work through each section of it:

- **Hook migrations** - every unprefixed name it converted, with file and line. Confirm each was a
  Hoist hook rather than an app variable that happened to share a hook's name (e.g. `--gray`).
- **Removed variables still referenced** - delete these usages; the variables never had any effect.
- **Warnings** - `calc()` expressions that add a bare number to a size variable (add a unit to the
  number) or divide by one, TypeScript assigning a size variable a bare number, and code that
  references a size variable by name. For the last, check whether the code reads the variable's
  value - e.g. via `getComputedStyle(...).getPropertyValue()` - and appends a unit, which now
  doubles up (`41pxpx`).

### 3. Review What the Codemod Cannot Migrate

**Hooks set outside a root-level selector.** An unprefixed hook set on a container never had any
effect - Hoist read the hooks only on `body` - so the codemod leaves these alone. Search for any that
remain:

```bash
# Unprefixed custom properties. Add your own app prefix (e.g. --myapp-) to the exclusion list.
grep -rnE '^\s*--[a-z][a-z0-9-]*\s*:' --include='*.scss' --include='*.css' src \
  | grep -vE -- '--(xh|ag|bp[0-9]?|fa|myapp)-'
```

For any hit that names a Hoist hook, decide whether you want it at all: renamed to its `--xh-*`
variable, it will *start* applying within that subtree for the first time.

**Names built at runtime.** Variable names assembled dynamically - SCSS interpolation such as
`--xh-grid-tree-group-color-level-#{$i}`, or strings concatenated in TypeScript - are not detected.
Search for `--xh-` near `#{` or string concatenation and update them by hand using the
[Renamed Variables](#renamed-variables) table.

**Form-field validation colors.** In prior versions the
`--form-field-{info,invalid,warning}-border-color` hooks fed *two* variables each: the
`-border-color` variable (as intended) and, by mistake, the matching `-box-shadow` variable - so an
app that set the hook to a color replaced the whole `box-shadow` value with a bare color, an
invalid value that browsers silently dropped. That app therefore saw its color on the validation
border but no inset shadow. In v88 the shadow variables reference the `-border-color` variables
properly, so setting `--xh-form-field-invalid-border-color` colors both the border and the inset
shadow. To keep the prior no-shadow appearance, add e.g.
`--xh-form-field-invalid-box-shadow: none;` alongside the color.

### 4. Check Override Selectors

Set overrides on `body.xh-app`. Hoist declares its defaults on `body`, wrapping its dark-theme and
mobile variants in `:where()` so every framework declaration has the specificity of a bare `body`
selector. A `body.xh-app` override therefore wins in every theme and platform combination - the
same reach the old unprefixed hooks had.

Two selectors that worked with the old hooks no longer do:

- **Bare `body`** ties with Hoist's declarations and wins only by source order.
- **`:root` or `html`** has no effect at all. Values set there reach `body` only by inheritance,
  and Hoist's own declarations on `body` take precedence. The old hooks were read wherever Hoist
  declared its variables, so an inherited hook value worked; an inherited `--xh-*` value does not.

Before:
```scss
:root {
  --grid-large-font-size: 16;
}
```

After:
```scss
body.xh-app {
  --xh-grid-large-font-size: 16px;
}
```

The codemod migrates the name and unit here but leaves the selector - change `:root` / `html` to
`body.xh-app` by hand. Where you want per-theme values, nest an `&.xh-dark` block as in Step 2.

**Scoped overrides** - setting a variable on a container rather than `body.xh-app` - only reach CSS
that reads that exact variable. Variables derived from it were resolved once on `body`, so
`.my-panel { --xh-spacing: 4px; }` does not change `--xh-spacing-half` within the panel. See "Base
vs. Derived Variables" in [`styles/README.md`](../../styles/README.md#base-vs-derived-variables).

### 5. Check the Console and the UI

Start the app in development mode. Hoist logs a warning at startup if any size variable resolves to
a bare number - almost always an override the codemod could not see, such as one set from
TypeScript or built with interpolation:

```
[ThemeModel] | CSS size variables must include a unit as of Hoist v88 (e.g. '8px', not '8').
Unitless values found for: --xh-spacing, ...
```

The check covers the active theme at startup; switch themes and reload to check the other. Then
review the app in both light and dark themes, and on mobile if applicable.

## Verification Checklist

After completing all steps:

- [ ] `pnpm install` / `yarn install` / `npm install` completes without errors
- [ ] The codemod report has been reviewed - hook migrations, removed variables, and warnings
- [ ] No overrides remain on `:root`, `html`, or bare `body`
- [ ] Application loads in development mode without the unitless size variable warning
- [ ] Custom colors, spacing, and typography render correctly in both light and dark themes (and on
  mobile, if applicable)
- [ ] Form validation styling looks as intended if you override any `-border-color` (Step 3 note)
- [ ] No references to retired names remain:
  ```bash
  # Should return nothing
  grep -rnE -- '--xh-[a-z0-9-]+-px\b|--xh-(pad|tbar)(-|\b)' src
  ```

## Renamed Variables

Beyond the renames below, two rules cover every other retired name:

- **Every `-px` variable** is replaced by its base name, which now holds a length:
  `--xh-font-size-px` → `--xh-font-size`, `--xh-scrollbar-size-px` → `--xh-scrollbar-size`.
- **`--xh-tbar-*`** is now **`--xh-toolbar-*`**, and **`-lr-pad`** is now **`-padding-inline`**:
  `--xh-grid-cell-lr-pad` → `--xh-grid-cell-padding-inline`.

| v87 | v88 |
|---|---|
| `--xh-appbar-color` | `--xh-appbar-text-color` |
| `--xh-appbar-title-color` | `--xh-appbar-title-text-color` |
| `--xh-date-range-picker-accent` | `--xh-date-range-picker-accent-color` |
| `--xh-font-size-large-em` | `--xh-font-size-large-relative` |
| `--xh-font-size-small-em` | `--xh-font-size-small-relative` |
| `--xh-form-field-info-color` | `--xh-form-field-info-text-color` |
| `--xh-form-field-invalid-color` | `--xh-form-field-invalid-text-color` |
| `--xh-form-field-label-color` | `--xh-form-field-label-text-color` |
| `--xh-form-field-msg-font-size` | `--xh-form-field-message-font-size` |
| `--xh-form-field-msg-line-height` | `--xh-form-field-message-line-height` |
| `--xh-form-field-msg-margin` | `--xh-form-field-message-margin` |
| `--xh-form-field-msg-text-transform` | `--xh-form-field-message-text-transform` |
| `--xh-form-field-warning-color` | `--xh-form-field-warning-text-color` |
| `--xh-grid-bg-hover` | `--xh-grid-row-hover-bg` |
| `--xh-grid-bg-odd` | `--xh-grid-odd-row-bg` |
| `--xh-grid-cell-change-bg-highlight` | `--xh-grid-cell-changed-bg` |
| `--xh-grid-cell-focus-border-color` | `--xh-grid-cell-focused-border-color` |
| `--xh-grid-selected-row-bg` | `--xh-grid-row-selected-bg` |
| `--xh-grid-selected-row-text-color` | `--xh-grid-row-selected-text-color` |
| `--xh-grid-tree-group-color-level-0` | `--xh-grid-tree-group-level-0-bg` |
| `--xh-grid-tree-icon-px` | `--xh-grid-tree-icon-size` |
| `--xh-loading-indicator-color` | `--xh-loading-indicator-text-color` |
| `--xh-mobile-input-font-size` | `--xh-input-font-size` |
| `--xh-mobile-input-height-px` | `--xh-input-height` |
| `--xh-mobile-input-label-font-size` | `--xh-input-label-font-size` |
| `--xh-pad` | `--xh-spacing` |
| `--xh-pad-double` | `--xh-spacing-double` |
| `--xh-pad-half` | `--xh-spacing-half` |
| `--xh-pad-safe-all` | `--xh-safe-area-inset` |
| `--xh-pad-safe-bottom` | `--xh-safe-area-inset-bottom` |
| `--xh-pad-safe-left` | `--xh-safe-area-inset-left` |
| `--xh-pad-safe-right` | `--xh-safe-area-inset-right` |
| `--xh-pad-safe-top` | `--xh-safe-area-inset-top` |
| `--xh-scrollbar-thumb` | `--xh-scrollbar-thumb-color` |
| `--xh-segmented-control-pad` | `--xh-segmented-control-padding` |
| `--xh-tbar-item-pad` | `--xh-toolbar-item-spacing` |
| `--xh-title-pad` | `--xh-title-padding` |
| `--xh-zone-grid-cell-lr-pad-px` | `--xh-zone-grid-cell-padding-inline` |
| `--xh-zone-grid-delimiter-color` | `--xh-zone-grid-delimiter-text-color` |
| `--xh-zone-grid-label-color` | `--xh-zone-grid-label-text-color` |

`--xh-grid-tree-group-color-level-1` through `-9` follow the same pattern as level 0.

**Removed** - none of these had any effect:

| Variable | Note |
|---|---|
| `--xh-chart-bg` | Charts take their background from the Highcharts theme. |
| `--xh-tab-border-width` | Never applied. |
| `--xh-toolbar-button-bg` | Never applied. |

## Old Hook Name Mismatches

Nine v87 unprefixed hooks were named differently from the variable they configured. The codemod
handles these; for reference, their v88 variables are:

| v87 unprefixed hook | v88 variable |
|---|---|
| `--form-field-info-border-color` | `--xh-form-field-info-border-color` (see Step 3 note) |
| `--form-field-invalid-border-color` | `--xh-form-field-invalid-border-color` (see Step 3 note) |
| `--form-field-warning-border-color` | `--xh-form-field-warning-border-color` (see Step 3 note) |
| `--grid-cell-bg-highlight` | `--xh-grid-cell-changed-bg` |
| `--grid-header-cell-lr-pad` | `--xh-grid-header-padding-inline` |
| `--input-placeholder-color` | `--xh-input-placeholder-text-color` |
| `--popover-backdrop` | `--xh-popover-backdrop-bg` |
| `--popover-shadow` | `--xh-popover-box-shadow` |
| `--zone-grid-cell-pad-px` | `--xh-zone-grid-cell-padding-inline` |

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) - canonical example of a Hoist app
- [`styles/README.md`](../../styles/README.md) - CSS variable system documentation, including
  naming conventions
- [`codemod-css-vars.mjs`](../codemod/v88/codemod-css-vars.mjs) - the migration codemod
- [Version Compatibility](../version-compatibility.md) - hoist-react / hoist-core matrix
