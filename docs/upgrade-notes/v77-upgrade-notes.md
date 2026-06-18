# Hoist React v77 Upgrade Notes

> **From:** v76.x → v77.1.1 | **Released:** 2025-10-29 (v77.0.1), 2025-11-12 (v77.1.1) | **Difficulty:** 🟠 MEDIUM

## Overview

Hoist React v77 includes two breaking changes and a significant library upgrade:

- **`disableXssProtection` → `enableXssProtection`** — the flag on `AppSpec` and `FieldSpec` has
  been renamed and inverted. XSS protection via DOMPurify is now *opt-in* rather than opt-out,
  reflecting the fact that most Hoist apps are secured internal tools where the performance cost of
  sanitization outweighs the benefit.
- **Highcharts upgraded to v12** (from v11) — requires updating `package.json` and changing
  Highcharts module imports in `Bootstrap.ts` from function-call registration to side-effect-only
  imports.
- **AG Grid context menu markup** — HTML markup in context menus is no longer supported following
  the v76 upgrade to AG Grid v34. Apps using HTML strings in `RecordAction.text` or
  `secondaryText` must switch to React nodes.

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v76.x

## Upgrade Steps

### 1. Update `package.json`

Bump hoist-react and Highcharts.

**File:** `package.json`

Before:
```json
"@xh/hoist": "~76.2.0",
"highcharts": "11.x"
```

After:
```json
"@xh/hoist": "~77.1.0",
"highcharts": "12.x"
```

### 2. Update Highcharts Imports in `Bootstrap.ts`

Highcharts v12 changed its module loading pattern. Modules are now registered as side effects on
import — the old pattern of importing a function and calling it with the `Highcharts` object is no
longer needed.

**File:** `Bootstrap.ts` (or wherever your app initializes Highcharts)

Before (v11 pattern):
```typescript
import {installHighcharts} from '@xh/hoist/kit/highcharts';
import Highcharts from 'highcharts/highstock';
import highchartsExporting from 'highcharts/modules/exporting';
import highchartsHeatmap from 'highcharts/modules/heatmap';
import highchartsTreemap from 'highcharts/modules/treemap';

highchartsExporting(Highcharts);
highchartsHeatmap(Highcharts);
highchartsTreemap(Highcharts);

installHighcharts(Highcharts);
```

After (v12 pattern with most common set of module imports):
```typescript
import {installHighcharts} from '@xh/hoist/kit/highcharts';
import Highcharts from 'highcharts/highstock';

// Modules now self-register on import — no function call needed.
// Check https://api.highcharts.com/highcharts/ for modules that require other base modules and import in order.
import 'highcharts/modules/exporting';
import 'highcharts/modules/export-data'; // export-data module must be imported after exporting module.
import 'highcharts/modules/offline-exporting'; // offline-exporting module must be imported after exporting module.
import 'highcharts/modules/map';
import 'highcharts/modules/heatmap';
import 'highcharts/modules/treemap';
import 'highcharts/modules/treegraph'; // `treegraph` must be imported after `treemap`

installHighcharts(Highcharts);
```

Key changes:
- Module imports are now **side-effect only** (`import 'highcharts/modules/...'`) — no default
  export to call.
- The `installHighcharts(Highcharts)` call at the end remains unchanged.
- Import ordering still matters for modules with dependencies (e.g. `export-data` and
  `offline-exporting` must be imported after `exporting`; `treegraph` must be imported after
  `treemap`).

See the [Highcharts changelog](https://www.highcharts.com/blog/changelog/) for additional details.

### 3. Update XSS Protection Flags

The `disableXssProtection` flag on `AppSpec` and `FieldSpec` has been removed and replaced with
`enableXssProtection` — an opt-in flag that defaults to `false`.

**Find affected files:**
```bash
grep -r "disableXssProtection" client-app/src/
```

**If your app was opting *out* of XSS protection** (the most common case for internal apps):

Before:
```typescript
XH.renderApp({
    componentClass: App,
    containerClass: AppContainer,
    disableXssProtection: true,
    // ...
});
```

After:
```typescript
// Simply remove the flag — protection is now disabled by default
XH.renderApp({
    componentClass: App,
    containerClass: AppContainer,
    // ...
});
```

**If your app needs to *keep* XSS protection enabled** (uncommon — apps displaying untrusted or
external user input):

Before:
```typescript
// Protection was on by default — no flag needed
XH.renderApp({
    componentClass: App,
    containerClass: AppContainer,
    // ...
});
```

After:
```typescript
XH.renderApp({
    componentClass: App,
    containerClass: AppContainer,
    enableXssProtection: true,
    // ...
});
```

The same rename applies at the `FieldSpec` / `Store.fieldDefaults` level:

Before:
```typescript
new Store({
    fieldDefaults: {disableXssProtection: true},
    // ...
});
```

After:
```typescript
new Store({
    fieldDefaults: {enableXssProtection: true},
    // ...
});
```

### 4. Update AG Grid Context Menu Markup

As of AG Grid v34 (introduced in Hoist v76), AG Grid no longer supports HTML markup in context
menus. If your app sets the `text` or `secondaryText` properties of `RecordAction` to HTML strings,
switch to React nodes instead.

**Find affected files:**
```bash
grep -r "RecordAction\|recordAction" client-app/src/ | grep -i "text\|secondaryText"
```

Before:
```typescript
const myAction = {
    text: '<b>Bold Action</b>',
    // ...
};
```

After:
```typescript
const myAction = {
    text: strong('Bold Action'),
    // or any React node
    // ...
};
```

## Verification Checklist

After completing all steps:

- [ ] `yarn install` / `npm install` completes without errors
- [ ] `npx tsc --noEmit` passes
- [ ] Application loads without console errors
- [ ] No references to `disableXssProtection` remain: `grep -r "disableXssProtection" client-app/src/`
- [ ] Highcharts modules load without errors (check console for version warnings)
- [ ] Charts render correctly (line, bar, treemap, etc.)
- [ ] Grid context menus display correctly (right-click on grid rows)
- [ ] Grid copy/paste and column header menus function as expected

## Reference

- [Highcharts changelog](https://www.highcharts.com/blog/changelog/)
- [Toolbox on GitHub](https://github.com/xh/toolbox) — canonical example of a Hoist app
