# Hoist React v80 Upgrade Notes

> **From:** v79.x → v80.0.0 | **Released:** 2026-01-27 | **Difficulty:** 🟢 LOW

## Overview

Hoist React v80 is primarily a CSS-focused release, refactoring `FormField` CSS classes to follow
BEM conventions and completing the `loadModel` → `loadObserver` rename started in v79.

The most significant app-level impacts are:

- **FormField CSS class BEM refactoring** — element classes use `__` separator, modifier classes
  use `--` separator
- **`XH.appLoadModel` → `XH.appLoadObserver`** — completing the v79 rename
- **Removed instance getters** — `Store.isStore`, `View.isView`, `Filter.isFilter` replaced by
  static typeguards
- **jQuery resolution required** — apps must add a `"jquery": "3.x"` resolution to prevent a
  transitive dependency break
- **`--xh-font-family` applies to inputs** — may require wider date inputs in some cases

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v79.x

## Upgrade Steps

### 1. Update `package.json`

Bump hoist-react and add a `jquery` resolution to prevent the `golden-layout` transitive
dependency from pulling in jQuery 4.x (which breaks the library).

**File:** `package.json`

Before:
```json
"@xh/hoist": "~79.0.0"
```

After:
```json
"@xh/hoist": "~80.0.0"
```

Add to `resolutions` (create the section if it doesn't exist):

```json
"resolutions": {
  "jquery": "3.x"
}
```

Run `yarn install` after making these changes.

### 2. Update FormField CSS Classes

FormField CSS classes have been refactored to follow BEM conventions. Element sub-components use
`__` (double underscore) and modifier/state classes use `--` (double hyphen).

**Find affected files:**
```bash
grep -r "xh-form-field-" client-app/src/
```

#### Element Classes (child components)

| Before | After |
|--------|-------|
| `xh-form-field-label` | `xh-form-field__label` |
| `xh-form-field-inner` | `xh-form-field__inner` |
| `xh-form-field-info` | `xh-form-field__inner__info-msg` |
| `xh-form-field-error-msg` | `xh-form-field__inner__validation-msg` |
| `xh-form-field-error-tooltip` | `xh-form-field__validation-tooltip` |
| `xh-form-field-required-indicator` | `xh-form-field__required-indicator` |
| `xh-form-field-readonly-display` | `xh-form-field__readonly-display` |
| `xh-form-field-inner--flex` | `xh-form-field__inner--flex` |
| `xh-form-field-inner--block` | `xh-form-field__inner--block` |

#### Modifier Classes (state/variant)

| Before | After |
|--------|-------|
| `xh-form-field-required` | `xh-form-field--required` |
| `xh-form-field-inline` | `xh-form-field--inline` |
| `xh-form-field-minimal` | `xh-form-field--minimal` |
| `xh-form-field-readonly` | `xh-form-field--readonly` |
| `xh-form-field-disabled` | `xh-form-field--disabled` |
| `xh-form-field-invalid` | `xh-form-field--invalid` |
| `xh-form-field-{inputType}` | `xh-form-field--{inputType}` |

Example — the commonly targeted label class:

Before:
```scss
.xh-form-field .xh-form-field-label {
  font-size: var(--xh-font-size-large-px);
}
```

After:
```scss
.xh-form-field .xh-form-field__label {
  font-size: var(--xh-font-size-large-px);
}
```

**Consider using CSS variables instead:** v80 introduces new CSS variables for common FormField
label customizations. These provide a cleaner alternative to class-based overrides:

```scss
.my-form-container {
  --xh-form-field-label-text-transform: uppercase;
  --xh-form-field-label-font-size: 0.8em;
  --xh-form-field-label-color: var(--xh-text-color-muted);
  --xh-form-field-label-font-weight: bold;
}
```

See `styles/vars.scss` for the full list of `--xh-form-field-*` CSS variables.

### 3. Rename `XH.appLoadModel` to `XH.appLoadObserver`

Completing the `loadModel` → `loadObserver` rename started in v79. The prior getter
`XH.appLoadModel` remains as a deprecated alias scheduled for removal in v82.

**Find affected files:**
```bash
grep -r "appLoadModel" client-app/src/
```

Before:
```typescript
mask({bind: XH.appLoadModel})
```

After:
```typescript
mask({bind: XH.appLoadObserver})
```

Note: If you didn't update `model.loadModel` references in v79, do so now — see the
[v79 upgrade notes](./v79-upgrade-notes.md#4-rename-loadmodel-to-loadobserver).

### 4. Replace Removed Instance Getters with Static Typeguards

The following instance getters have been removed:

| Removed | Replacement |
|---------|-------------|
| `store.isStore` | `Store.isStore(store)` |
| `view.isView` | `View.isView(view)` |
| `filter.isFilter` | `Filter.isFilter(filter)` |

**Find affected files:**
```bash
grep -r "\.isStore\|\.isView\|\.isFilter" client-app/src/
```

Before:
```typescript
if (source.isStore) { ... }
```

After:
```typescript
import {Store} from '@xh/hoist/data';
if (Store.isStore(source)) { ... }
```

### 5. Review Input Sizing for Font Change

The `--xh-font-family` CSS variable now applies to `input` elements (previously they used the
browser default font). This brings inputs in line with the rest of the app but may cause some
tightly-sized inputs (e.g. `DateInput` with narrow explicit width) to clip content.

If needed, customize the input font separately:
```scss
:root {
  --xh-input-font-family: 'Your Preferred Font', sans-serif;
}
```

Or widen affected inputs to accommodate the (slightly wider) Inter font with tabular numbers.

## Verification Checklist

After completing all steps:

- [ ] `yarn install` completes without errors
- [ ] `yarn lint` passes (or only pre-existing warnings remain)
- [ ] `npx tsc --noEmit` passes
- [ ] Application loads without console errors
- [ ] Form fields render correctly — labels, validation messages, and readonly displays
- [ ] No old FormField CSS classes remain: `grep -r "xh-form-field-[a-z]" client-app/src/ | grep -v "xh-form-field--\|xh-form-field__"`
- [ ] Date inputs and other tightly-sized inputs are not clipping
- [ ] No deprecated patterns remain: `grep -r "appLoadModel\|\.isStore\b\|\.isView\b\|\.isFilter\b" client-app/src/`

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) — canonical example of a Hoist app
