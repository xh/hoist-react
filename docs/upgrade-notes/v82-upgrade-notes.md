# Hoist React v82 Upgrade Notes

> **From:** v81.x → v82.0.0 | **Released:** 2026-02-25 | **Difficulty:** 🟢 LOW

## Overview

Hoist React v82 adds a new `Picker` desktop input component, a `DashCanvasWidgetChooser` for
drag-and-drop dashboard customization, a `GroupingChooserModel.bind` config for two-way syncing,
and an embedded MCP server for AI tooling. It also includes a significant rework of dashboard
persistence and global popover border theming.

The most significant app-level impacts are:

- **`FetchService` correlation ID properties are now static** — update `XH.fetchService.<prop>`
  references to `FetchService.<prop>`
- **`xh-popup--framed` CSS class removed** — popover borders are now themed globally
- **New `div` wrapper in `DashContainerView`** — apps with custom `xh-dash-tab` CSS may need
  selector adjustments

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v81.x
- [ ] **hoist-core** upgraded to >= v36.3 (**recommended** — required only for the new Admin Metrics
  tab, not for the hoist-react upgrade itself)

## Upgrade Steps

### 1. Update `package.json`

Bump hoist-react to v82.

**File:** `package.json`

Before:
```json
"@xh/hoist": "~81.0.2"
```

After:
```json
"@xh/hoist": "~82.0.0"
```

Then run `yarn install` or `npm install` to update dependencies. v82 adds `react-window` as a new dependency
(used by the `Picker` component for virtualized option lists).

### 2. Update `FetchService` Correlation ID Configuration

The `autoGenCorrelationIds`, `genCorrelationId`, and `correlationIdHeaderKey` properties on
`FetchService` have been converted from instance properties to **static** properties. This allows
configuration in the app's `Bootstrap` module to ensure correlation IDs are active from the very
first request, including early hoist core init calls.

**Find affected files:**
```bash
grep -r "fetchService\.autoGenCorrelationIds\|fetchService\.genCorrelationId\|fetchService\.correlationIdHeaderKey" client-app/src/
```

If your app configures these in an `AppModel.initAsync()` method, move the configuration to
`Bootstrap.ts` and reference the static class instead of the instance:

Before (`AppModel.ts` or similar):
```typescript
import {XH} from '@xh/hoist/core';

override async initAsync() {
    await super.initAsync();
    XH.fetchService.autoGenCorrelationIds = true;
}
```

After (`Bootstrap.ts`):
```typescript
import {FetchService} from '@xh/hoist/svc';
FetchService.autoGenCorrelationIds = true;
```

Remove the old instance-based configuration from your AppModel after adding it to Bootstrap. If your
app has multiple AppModel classes (e.g. a shared base model or a separate admin AppModel), search
all of them — the Bootstrap.ts configuration covers all entry points.

Place the static configuration near the top of `Bootstrap.ts`, before library registration
(ag-Grid, Highcharts, etc.).

### 3. Remove `xh-popup--framed` CSS Class Usage

The `xh-popup--framed` CSS class has been removed. Blueprint popover borders are now themed
globally using the `--xh-popup-border-color` CSS variable, so the framed class is no longer
needed.

**Find affected files:**
```bash
grep -r "xh-popup--framed" client-app/src/
```

Remove any application of this class. If you need to customize popover border colors, override the
`--xh-popup-border-color` CSS variable instead.

### 4. Update `DashContainerView` CSS Selectors (if applicable)

An additional `div` with the `xh-dash-tab__content` class has been added around
`DashContainerView` content. Apps with custom CSS targeting `xh-dash-tab` child elements may need
to adjust their selectors to account for this new wrapper.

**Find affected files:**
```bash
grep -r "xh-dash-tab" client-app/src/
```

### 5. Migrate Deprecated Filter Utilities

The standalone filter composition utilities `withFilterByField`, `withFilterByKey`,
`replaceFilterByKey`, and `withFilterByTypes` have been deprecated in favor of new instance methods
on the `Filter` class hierarchy. Internal callers have been migrated. These utilities will be
removed in v85, so we recommend migrating now as part of this upgrade.

The new approach uses two instance methods available on all `Filter` subclasses —
`removeFieldFilters(field?)` and `removeFunctionFilters(key?)` — paired with the `appendFilter()`
utility to compose the result.

**Find affected files:**
```bash
grep -r "withFilterByField\|withFilterByKey\|replaceFilterByKey\|withFilterByTypes" client-app/src/
```

#### `withFilterByField` — removes `FieldFilter`s matching a field, then appends a new filter

Before:
```typescript
import {withFilterByField} from '@xh/hoist/data';

const filter = withFilterByField(store.filter, newFilter, 'source');
```

After:
```typescript
import {appendFilter} from '@xh/hoist/data';

const filter = appendFilter(
    store.filter?.removeFieldFilters('source'),
    newFilter
);
```

#### `withFilterByKey` / `replaceFilterByKey` — removes `FunctionFilter`s matching a key, then appends

These two utilities are functionally identical. Both remove function filters with a matching key and
append a replacement.

Before:
```typescript
import {withFilterByKey} from '@xh/hoist/data';

const filter = withFilterByKey(store.filter, newFilter, 'tags');
```

After:
```typescript
import {appendFilter} from '@xh/hoist/data';

const filter = appendFilter(
    store.filter?.removeFunctionFilters('tags'),
    newFilter
);
```

#### `withFilterByTypes` — removes all filters of given type(s), then appends

This utility strips filters by class type (`'FieldFilter'` and/or `'FunctionFilter'`). Replace by
calling the corresponding `remove*` method(s) for each type.

Before:
```typescript
import {withFilterByTypes} from '@xh/hoist/data';

// Remove all FieldFilters, then append
const filter = withFilterByTypes(store.filter, newFilter, 'FieldFilter');

// Remove both types, then append
const filter = withFilterByTypes(store.filter, newFilter, ['FieldFilter', 'FunctionFilter']);
```

After:
```typescript
import {appendFilter} from '@xh/hoist/data';

// Remove all FieldFilters, then append
const filter = appendFilter(
    store.filter?.removeFieldFilters(),
    newFilter
);

// Remove both types, then append
const filter = appendFilter(
    store.filter?.removeFieldFilters()?.removeFunctionFilters(),
    newFilter
);
```

Note that calling `removeFieldFilters()` or `removeFunctionFilters()` with no argument removes *all*
filters of that type. Passing a specific field name or key removes only matching filters.

### 6. Review `Field.description` Impact on Column Tooltips (optional)

`Column.headerTooltip` and `Column.chooserDescription` now default from `Field.description` when
not explicitly set. If your app sets `description` on `Field` specs, those descriptions will now
automatically appear as column header tooltips and in the column chooser.

This is generally desirable, but review if any field descriptions are not appropriate for display
in column headers. Suppress with `headerTooltip: null` on the column spec if needed.

Apps can also migrate from setting `chooserDescription` on columns to setting `description` on
fields, centralizing descriptive text at the data layer.

## Verification Checklist

After completing all steps:

- [ ] `yarn install` / `npm install` completes without errors
- [ ] `yarn lint` / `npm run lint` passes (or only pre-existing warnings remain)
- [ ] `npx tsc --noEmit` passes
- [ ] Application loads without console errors
- [ ] Correlation IDs appear on network requests (check `X-Correlation-ID` header in browser
  DevTools)
- [ ] Popovers render with correct themed borders in light and dark mode
- [ ] Dashboard views render correctly (DashContainer and DashCanvas)
- [ ] No deprecated patterns remain: `grep -r "xh-popup--framed" client-app/src/`
- [ ] No deprecated filter utilities remain:
  `grep -r "withFilterByField\|withFilterByKey\|replaceFilterByKey\|withFilterByTypes" client-app/src/`

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) — canonical example of a Hoist app
