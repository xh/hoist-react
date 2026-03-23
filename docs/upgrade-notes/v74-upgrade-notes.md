# Hoist React v74 Upgrade Notes

> **From:** v73.x → v74.1.2 | **Released:** 2025-07-03 | **Difficulty:** 🟢 LOW

## Overview

Hoist React v74 focuses on ViewManager and Chart improvements. The two breaking changes are
straightforward property removals with clear replacements.

The most significant app-level impacts are:

- **`ViewManagerModel.settleTime` removed** — replaced by `PersistOptions.settleTime` on individual
  persistence providers.
- **`ChartModel.showContextMenu` removed** — replaced by a more flexible `ChartModel.contextMenu`
  property that supports custom menus with app-specific actions.

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v73.x
- [ ] **hoist-core** remains at `>= 31.0` (no new core requirement for v74)

## Upgrade Steps

### 1. Update `package.json`

Bump hoist-react.

**File:** `package.json`

Before:
```json
"@xh/hoist": "~73.0.1",
```

After:
```json
"@xh/hoist": "~74.1.2",
```

Run `yarn install` / `npm install` after updating.

### 2. Remove `ViewManagerModel.settleTime`

The `settleTime` config has been removed from `ViewManagerModel`. If your app set this property,
move it to the `PersistOptions` on the individual persistence providers that need settle time
behavior instead.

**Find affected files:**
```bash
grep -r "settleTime" client-app/src/
```

Before:
```typescript
const viewManagerModel = await ViewManagerModel.createAsync({
    persistWith: {localStorageKey: 'myApp'},
    settleTime: 1000,
    // ...
});
```

After:
```typescript
// settleTime is now configured on individual PersistOptions, not on ViewManagerModel.
// If your grids or other persisted components need settle time, configure it on their
// persistWith options:
new GridModel({
    persistWith: {localStorageKey: 'myApp', settleTime: 1000},
    // ...
});
```

Most apps that relied on `settleTime` were doing so to prevent false dirty indicators on
ViewManager-linked components. The new `PersistOptions.settleTime` applies the same delay at the
persistence provider level.

If you were using the default `settleTime: 1000` and not setting it explicitly, you can safely
remove it — the behavior has been delegated to the persistence layer automatically.

### 3. Replace `ChartModel.showContextMenu`

The boolean `showContextMenu` property has been replaced by `contextMenu`, which accepts `true`
(default), `false`, or a custom menu specification.

**Find affected files:**
```bash
grep -r "showContextMenu" client-app/src/
```

Before:
```typescript
new ChartModel({
    highchartsConfig: myConfig,
    showContextMenu: false
});
```

After:
```typescript
new ChartModel({
    highchartsConfig: myConfig,
    contextMenu: false
});
```

For apps that want to customize the chart context menu, `contextMenu` also accepts an array of
`ChartMenuToken` strings (e.g. `'viewFullscreen'`, `'downloadPNG'`, `'copyToClipboard'`) and/or
custom `MenuItem` objects. See the Toolbox
[LineChartModel](https://github.com/xh/toolbox/blob/d984b5dc/client-app/src/desktop/tabs/charts/LineChartModel.ts)
for a working example of a custom chart context menu.

## Verification Checklist

After completing all steps:

- [ ] `yarn install` / `npm install` completes without errors
- [ ] `npx tsc --noEmit` passes
- [ ] Application loads without console errors
- [ ] Charts render correctly with expected context menu behavior
- [ ] ViewManager loads, saves, and reverts views correctly
- [ ] No false dirty indicators on ViewManager-linked components
- [ ] No deprecated patterns remain: `grep -r "showContextMenu\|settleTime" client-app/src/`

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) — canonical example of a Hoist app
