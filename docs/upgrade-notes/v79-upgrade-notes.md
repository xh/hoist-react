# Hoist React v79 Upgrade Notes

> **From:** v78.x → v79.0.0 | **Released:** 2026-01-05 | **Difficulty:** 🟠 MEDIUM

## Overview

Hoist React v79 upgrades Blueprint from v5 to v6 and includes several API renames. A server-side
upgrade to hoist-core >= v35 is recommended but not strictly required.

The most significant app-level impacts are:

- **Blueprint 5 → 6 CSS prefix migration** — all custom CSS targeting `bp5-*` classes must change
  to `bp6-*`
- **`tsconfig.json` update** — `moduleResolution` must be set to `"bundler"`
- **`loadModel` → `loadObserver` rename** — deprecated aliases remain, but apps should update
- **`GridModel.applyColumnStateChanges` → `updateColumnState`** — renamed for clarity
- **`TabSwitcher` / `TabContainerConfig.switcher` changes** — minor API adjustment
- **Deprecated config removals** — `websocketsEnabled`, `popoverTitle`, `RelativeTimestamp.options`

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v78.x
- [ ] hoist-core >= v35 recommended (not strictly required)

## Upgrade Steps

### 1. Update `package.json`

Bump hoist-react. Blueprint dependencies will be updated transitively — no direct app-level
Blueprint dependency changes are typically required.

**File:** `package.json`

Before:
```json
"@xh/hoist": "~78.1.0"
```

After:
```json
"@xh/hoist": "~79.0.0"
```

Run `yarn install` to pull updated transitive dependencies including Blueprint 6.

### 2. Update `tsconfig.json`

Set `moduleResolution` to `"bundler"`. This is required for compatibility with Blueprint 6's
package exports.

**File:** `tsconfig.json`

Before:
```json
"moduleResolution": "node"
```

After:
```json
"moduleResolution": "bundler"
```

### 3. Update Blueprint CSS Prefixes

Blueprint 6 changes the CSS class prefix from `bp5-` to `bp6-`. Update all custom CSS and any
inline class references in TypeScript/TSX files.

**Find affected files:**
```bash
grep -r "bp5-" client-app/src/
```

In SCSS files — update class selectors:

Before:
```scss
.bp5-popover-content {
  background-color: var(--xh-bg-alt) !important;
}
```

After:
```scss
.bp6-popover-content {
  background-color: var(--xh-bg-alt) !important;
}
```

In TypeScript files — update inline class name strings:

Before:
```typescript
className: `bp5-control bp5-switch bp5-inline`
```

After:
```typescript
className: `bp6-control bp6-switch bp6-inline`
```

Also update dark theme references:

Before:
```scss
.xh-app.xh-dark.bp5-dark .my-widget { ... }
```

After:
```scss
.xh-app.xh-dark.bp6-dark .my-widget { ... }
```

See the [Blueprint 6.0 migration guide](https://github.com/palantir/blueprint/wiki/Blueprint-6.0)
for additional details.

### 4. Rename `loadModel` to `loadObserver`

`LoadSupport.loadModel` has been renamed to `loadObserver` for clarity — it is a `TaskObserver`
instance, not a `HoistModel`. The old getter remains as a deprecated alias scheduled for removal
in v82.

**Find affected files:**
```bash
grep -r "loadModel" client-app/src/
```

Before:
```typescript
const {loadModel, message, seconds} = this;
loadModel.setMessage(message);

// In component code
mask({bind: model.loadModel})
```

After:
```typescript
const {loadObserver, message, seconds} = this;
loadObserver.setMessage(message);

// In component code
mask({bind: model.loadObserver})
```

### 5. Rename `GridModel.applyColumnStateChanges` to `updateColumnState`

Renamed for better symmetry with `setColumnState()`. The prior method remains as a deprecated
alias scheduled for removal in v82.

**Find affected files:**
```bash
grep -r "applyColumnStateChanges" client-app/src/
```

Before:
```typescript
gridModel.applyColumnStateChanges({visible: ['name', 'status']});
```

After:
```typescript
gridModel.updateColumnState({visible: ['name', 'status']});
```

### 6. Update `TabSwitcher` / `TabContainerConfig.switcher` Usage

`TabContainerConfig.switcher` has been repurposed to accept a `TabSwitcherConfig` (for the model)
rather than `TabSwitcherProps`. To pass `TabSwitcherProps` to the rendered switcher component via
a parent `TabContainer`, use `TabContainerProps.switcher` instead.

If your app imports `TabSwitcherProps` directly from its internal module path, update the import —
it has moved to `cmp/tab/Types.ts` but remains exported from `cmp/tab/index.ts`.

### 7. Tighten `LocalDate` Unit Types

`LocalDate` adjustment methods now use a stricter `LocalDateUnit` type. Some less common or
ambiguous units (e.g. `'date'` or `'d'`) are no longer accepted. Use standard units like `'day'`,
`'month'`, `'year'`, etc.

**Find affected files:**
```bash
grep -r "LocalDate" client-app/src/ | grep -E "\.(add|subtract|startOf|endOf)\("
```

### 8. Update `DashCanvas.rglOptions` (If Used)

If your app passes `rglOptions` to `DashCanvas`, review the options for compatibility with
`react-grid-layout` v2+. Additionally, `DashCanvasModel.containerPadding` now applies to the
react-grid-layout div rather than the Hoist-created containing div — this may affect printing
layouts.

### 9. Remove Deprecated Configs

The following previously deprecated configs have been removed:

| Removed Config | Replacement |
|---|---|
| `AppSpec.websocketsEnabled` | Enabled by default; use `AppSpec.disableWebSockets` to opt out |
| `GroupingChooserProps.popoverTitle` | Use `editorTitle` |
| `RelativeTimestampProps.options` | Provide directly as top-level props |

**Find affected files:**
```bash
grep -r "websocketsEnabled\|popoverTitle\|\.options" client-app/src/ | grep -i "timestamp\|grouping\|websocket"
```

## Verification Checklist

After completing all steps:

- [ ] `yarn install` completes without errors
- [ ] `yarn lint` passes (or only pre-existing warnings remain)
- [ ] `npx tsc --noEmit` passes
- [ ] Application loads without console errors
- [ ] No `bp5-` CSS classes remain: `grep -r "bp5-" client-app/src/`
- [ ] Grids render and function correctly
- [ ] Components using masks/loading indicators display correctly
- [ ] Tab containers function correctly, including any dynamic tab switchers
- [ ] DashCanvas widgets (if used) render and resize correctly
- [ ] No deprecated patterns remain: `grep -r "loadModel\|applyColumnStateChanges\|websocketsEnabled" client-app/src/`

## Reference

- [Blueprint 6.0 migration guide](https://github.com/palantir/blueprint/wiki/Blueprint-6.0)
- [Toolbox on GitHub](https://github.com/xh/toolbox) — canonical example of a Hoist app
