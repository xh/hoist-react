# Hoist React v83 Upgrade Notes

> **From:** v82.x → v83.0.0 | **Released:** 2026-03-xx | **Difficulty:** 🟢 LOW

## Overview

Hoist React v83 is a major release paired with hoist-core v37. The headline addition is
client-side distributed tracing via `TraceService`, providing OTEL-based end-to-end observability
across browser and server. This release also introduces the `static defaults` pattern for
app-level configuration overrides across several core models, new `SegmentedControl` and
`CheckboxButton` input components, and Admin Console support for opt-in metrics publishing.

There are no must-take breaking changes in this release beyond the hoist-core version bump.
Apps should take the opportunity to migrate deprecated static properties to the new
`ModelClassName.defaults` pattern (scheduled for removal in v85).

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v82.x
- [ ] **hoist-core** upgraded to >= v37.0 (**required** — TraceService and metrics publishing
  depend on new server-side infrastructure)

## Upgrade Steps

### 1. Update `hoistCoreVersion` in `gradle.properties`

Hoist React v83 **requires** hoist-core >= v37.0.

**File:** `gradle.properties`

Before:
```properties
hoistCoreVersion=36.3.1
```

After:
```properties
hoistCoreVersion=37.0.0
```

### 2. Update `package.json`

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

### 3. Migrate Deprecated Static Properties to `static defaults` (recommended)

Several models previously exposed ad-hoc static properties for app-level configuration (e.g.
`GridModel.DEFAULT_AUTOSIZE_MODE`). These have been replaced by a unified `static defaults`
pattern. The old properties still function but log deprecation warnings and are scheduled for
removal in v85.

**Find affected files:**
```bash
grep -rE "GridModel\.(DEFAULT_AUTOSIZE_MODE|DEFAULT_RESTORE_DEFAULTS_WARNING|defaultContextMenu)|ChartModel\.defaultContextMenu|ExceptionHandler\.(REDACT_PATHS|ALERT_TYPE|TOAST_PROPS)|FetchService\.(autoGenCorrelationIds|genCorrelationId|correlationIdHeaderKey)" client-app/src/
```

#### GridModel

Before:
```typescript
import {GridModel} from '@xh/hoist/cmp/grid';

GridModel.DEFAULT_AUTOSIZE_MODE = 'managed';
GridModel.DEFAULT_RESTORE_DEFAULTS_WARNING = 'Reset all grid settings?';
```

After:
```typescript
import {GridModel} from '@xh/hoist/cmp/grid';

GridModel.defaults.autosizeMode = 'managed';
GridModel.defaults.restoreDefaultsWarning = 'Reset all grid settings?';
```

See `GridModelDefaults` for the full set of available defaults including `cellBorders`,
`colChooserModel`, `contextMenu`, `enableColumnPinning`, `enableExport`, `rowBorders`,
`showGroupRowCounts`, `sizingMode`, `stripeRows`, and more.

#### ChartModel

Before:
```typescript
import {ChartModel} from '@xh/hoist/cmp/chart';

const menu = ChartModel.defaultContextMenu;
```

After:
```typescript
import {ChartModel} from '@xh/hoist/cmp/chart';

const menu = ChartModel.defaults.contextMenu;
```

#### ExceptionHandler

Before:
```typescript
import {ExceptionHandler} from '@xh/hoist/core';

ExceptionHandler.ALERT_TYPE = 'toast';
ExceptionHandler.TOAST_PROPS = {timeout: 5000};
```

After:
```typescript
import {ExceptionHandler} from '@xh/hoist/core';

ExceptionHandler.defaults.alertType = 'toast';
ExceptionHandler.defaults.toastProps = {timeout: 5000};
```

#### FetchService

Before (in `Bootstrap.ts`):
```typescript
import {FetchService} from '@xh/hoist/svc';

FetchService.autoGenCorrelationIds = true;
```

After:
```typescript
import {FetchService} from '@xh/hoist/svc';

FetchService.defaults.autoGenCorrelationIds = true;
```

### 4. Migrate Deprecated Filter Utilities (recommended)

If you have not yet migrated from the deprecated standalone filter utilities (`withFilterByField`,
`withFilterByKey`, `replaceFilterByKey`, `withFilterByTypes`), do so now. These were deprecated
in v82 and are scheduled for removal in v85. See the
[v82 upgrade notes](./v82-upgrade-notes.md#5-migrate-deprecated-filter-utilities) for detailed
before/after examples.

**Find affected files:**
```bash
grep -rE "withFilterByField|withFilterByKey|replaceFilterByKey|withFilterByTypes" client-app/src/
```

### 5. Consider `SegmentedControl` as a `ButtonGroupInput` Alternative (optional)

v83 introduces `SegmentedControl`, a new desktop input component for mutually exclusive option
sets. It provides stronger visual differentiation of the active selection compared to
`ButtonGroupInput` and is well-suited for small, fixed option groups (e.g. sizing modes, view
toggles, status filters).

This is **not** a required migration — `ButtonGroupInput` remains fully supported. However, if
your app uses `ButtonGroupInput` for small toggle groups, `SegmentedControl` may be a worthwhile
improvement worth exploring.

**Find potential candidates:**
```bash
grep -rE "buttonGroupInput|ButtonGroupInput" client-app/src/
```

Review each usage and consider whether the use case is a small set of mutually exclusive options
that would benefit from the segmented control style. `SegmentedControl` supports the same `bind`
pattern as other Hoist inputs and works with both model binding and `onChange` callbacks.

## Verification Checklist

After completing all steps:

- [ ] `hoistCoreVersion` in `gradle.properties` is >= 37.0.0
- [ ] `yarn install` / `npm install` completes without errors
- [ ] `yarn lint` / `npm run lint` passes (or only pre-existing warnings remain)
- [ ] `npx tsc --noEmit` passes
- [ ] Application loads without console errors
- [ ] No deprecated static property warnings in console:
  `grep -rE "DEFAULT_AUTOSIZE_MODE|DEFAULT_RESTORE_DEFAULTS_WARNING|defaultContextMenu|REDACT_PATHS|ALERT_TYPE|TOAST_PROPS" client-app/src/`
- [ ] No deprecated filter utilities remain:
  `grep -rE "withFilterByField|withFilterByKey|replaceFilterByKey|withFilterByTypes" client-app/src/`
- [ ] Grids, charts, and dashboards render correctly
- [ ] Admin Console Metrics tab loads (if hoist-core v37+ with metrics configured)

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) — canonical example of a Hoist app
