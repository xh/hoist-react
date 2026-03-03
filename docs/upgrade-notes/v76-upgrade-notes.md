# Hoist React v76 Upgrade Notes

> **From:** v75.x → v76.2.0 | **Released:** 2025-09-26 | **Difficulty:** 🟠 MEDIUM

## Overview

Hoist React v76 upgrades AG Grid from v31 to v34, which is the primary upgrade effort. This spans
three major AG Grid releases and requires changes to `package.json` dependencies, AG Grid module
imports, and the `installAgGrid()` call in `Bootstrap.ts`.

The most significant app-level impacts are:

- **AG Grid v31 → v34** — new package names (`ag-grid-community`/`ag-grid-enterprise`/`ag-grid-react`
  replace the old `@ag-grid-community/*` and `@ag-grid-enterprise/*` scoped packages), new module
  registration pattern, and a required `provideGlobalGridOptions({theme: 'legacy'})` call.
- **`groupRowRenderer` value change** — the `value` parameter passed to custom group row renderers
  is now the raw field value, no longer a stringified version.
- **Two minor breaking changes** — `TabModel` constructor signature and `Exception` import path
  (both unlikely to affect most apps).

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v75.x

## Upgrade Steps

### 1. Update `package.json`

Replace the old scoped AG Grid packages with the new unified packages and bump hoist-react.

**File:** `package.json`

Before:
```json
"@xh/hoist": "~75.0.0",
"@ag-grid-community/client-side-row-model": "~31.2.0",
"@ag-grid-community/core": "~31.2.0",
"@ag-grid-community/react": "~31.2.0",
"@ag-grid-community/styles": "~31.2.0",
"@ag-grid-enterprise/clipboard": "~31.2.0",
"@ag-grid-enterprise/core": "~31.2.0",
"@ag-grid-enterprise/menu": "~31.2.0",
"@ag-grid-enterprise/row-grouping": "~31.2.0"
```

After:
```json
"@xh/hoist": "~76.2.0",
"ag-grid-community": "~34.2.0",
"ag-grid-enterprise": "~34.2.0",
"ag-grid-react": "~34.2.0"
```

Key changes:
- All `@ag-grid-community/*` and `@ag-grid-enterprise/*` scoped packages are replaced by three
  unified packages.
- Your app's specific set of scoped enterprise packages (e.g. `@ag-grid-enterprise/clipboard`,
  `@ag-grid-enterprise/menu`, etc.) should all be removed — individual features are now registered
  as modules in `Bootstrap.ts` rather than as separate npm packages.

### 2. Update AG Grid Setup in `Bootstrap.ts`

The AG Grid initialization in `Bootstrap.ts` requires several changes: new import paths, a new
module registration pattern, a required theme option, and an updated `installAgGrid()` call.

**Recommended approach — register all modules:**

The simplest and recommended path is to register `AllCommunityModule` and `AllEnterpriseModule`
rather than maintaining an explicit list of individual modules. This avoids the need to track
which specific modules your app uses and prevents hard-to-debug issues from missing modules.

Before (v31 pattern):
```typescript
import {installAgGrid} from '@xh/hoist/kit/ag-grid';
import {ModuleRegistry} from '@ag-grid-community/core';
import '@ag-grid-community/styles/ag-grid.css';
import '@ag-grid-community/styles/ag-theme-balham.css';
import {AgGridReact} from '@ag-grid-community/react';
import {ClientSideRowModelModule} from '@ag-grid-community/client-side-row-model';
import {LicenseManager, EnterpriseCoreModule} from '@ag-grid-enterprise/core';
import {ClipboardModule} from '@ag-grid-enterprise/clipboard';
import {MenuModule} from '@ag-grid-enterprise/menu';
import {RowGroupingModule} from '@ag-grid-enterprise/row-grouping';

ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    ClipboardModule,
    MenuModule,
    RowGroupingModule
]);

installAgGrid(AgGridReact, EnterpriseCoreModule.version);

// ... license key setup (unchanged) ...
```

After (v34 pattern — recommended):
```typescript
import {installAgGrid} from '@xh/hoist/kit/ag-grid';
import {ModuleRegistry, provideGlobalGridOptions} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-balham.css';
import {AgGridReact} from 'ag-grid-react';
import {
    AllCommunityModule,
    AllEnterpriseModule,
    ClientSideRowModelModule
} from 'ag-grid-enterprise';

ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);

provideGlobalGridOptions({theme: 'legacy'});
installAgGrid(AgGridReact as any, ClientSideRowModelModule.version);

// ... license key setup (unchanged — keep your existing pattern) ...
```

Key changes:
- **Import paths** — all imports come from `ag-grid-community`, `ag-grid-enterprise`, or
  `ag-grid-react` (no more `@ag-grid-community/*` or `@ag-grid-enterprise/*` scoped packages).
- **Module registration** — use `AllCommunityModule` and `AllEnterpriseModule` for the simplest
  setup. This includes all available grid features without needing to track individual modules.
- **Theme option** — `provideGlobalGridOptions({theme: 'legacy'})` is required to maintain the
  existing Balham-based theme. Without this, grids will render with AG Grid's new default theme.
- **`installAgGrid()` call** — the version is now sourced from `ClientSideRowModelModule.version`
  (not `EnterpriseCoreModule.version`), and `AgGridReact` needs an `as any` cast.
- **License key** — if your app imports `LicenseManager`, it now comes from `ag-grid-enterprise`
  directly (not `@ag-grid-enterprise/core`). Your existing license setup pattern is otherwise
  unchanged.

### 3. Update `groupRowRenderer` Implementations

If your app provides a custom `groupRowRenderer` to `GridModel`, note that the `value` parameter
is now the raw field value for the group — it is no longer automatically stringified by AG Grid.

**Find affected files:**
```bash
grep -r "groupRowRenderer" client-app/src/
```

Before:
```typescript
groupRowRenderer: ({value}) => {
    // value was a string like "2025" or "Active"
    return `Group: ${value}`;
}
```

After:
```typescript
groupRowRenderer: ({value}) => {
    // value is now the raw field value (could be number, date, etc.)
    return `Group: ${value}`;
}
```

In many cases, the existing code will still work since template literals call `.toString()`
implicitly. However, if your renderer relies on the value being a string (e.g. calling
`.startsWith()` or `.includes()`), you may need to convert explicitly.

### 4. Remove `@ag-grid-community/styles` Import (If Present)

If your app imports AG Grid styles from the old scoped package path, update the imports.

**Find affected files:**
```bash
grep -r "@ag-grid-community/styles" client-app/src/
```

Before:
```typescript
import '@ag-grid-community/styles/ag-grid.css';
import '@ag-grid-community/styles/ag-theme-balham.css';
```

After:
```typescript
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-balham.css';
```

### 5. Other Minor Breaking Changes

These are unlikely to require changes in most applications:

**`TabModel` constructor** — now takes its owning container as a second argument. Apps very rarely
create `TabModel` instances directly (they are typically created internally by `TabContainerModel`),
so this is unlikely to require changes.

**`Exception` / `HoistException` import path** — moved from `@xh/hoist/core` to
`@xh/hoist/exception` to reduce circular dependency risks. Apps rarely import these directly. If
your app does, update the import path:

Before:
```typescript
import {Exception} from '@xh/hoist/core';
```

After:
```typescript
import {Exception} from '@xh/hoist/exception';
```

## Verification Checklist

After completing all steps:

- [ ] `yarn install` / `npm install` completes without errors
- [ ] No `@ag-grid-community` or `@ag-grid-enterprise` scoped imports remain:
      `grep -r "@ag-grid-community\|@ag-grid-enterprise" client-app/src/`
- [ ] `npx tsc --noEmit` passes
- [ ] Application loads without console errors
- [ ] Grids render correctly with expected styling (Balham theme)
- [ ] Grid features work: sorting, filtering, grouping, row selection, copy/paste
- [ ] Column resizing, reordering, and visibility toggles work
- [ ] Context menus display and function correctly
- [ ] Tree grids expand/collapse as expected
- [ ] Custom group row renderers display correct values (if applicable)

## Reference

- [AG Grid: Upgrade to v32](https://www.ag-grid.com/react-data-grid/upgrading-to-ag-grid-32/)
- [AG Grid: Upgrade to v33](https://www.ag-grid.com/react-data-grid/upgrading-to-ag-grid-33/)
- [AG Grid: Upgrade to v34](https://www.ag-grid.com/react-data-grid/upgrading-to-ag-grid-34/)
- [Toolbox on GitHub](https://github.com/xh/toolbox) — canonical example of a Hoist app
