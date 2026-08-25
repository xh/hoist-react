# Hoist React v87 Upgrade Notes

> **From:** v86.x → v87.0.0 | **Released:** TBD | **Difficulty:** 🟠 MEDIUM

## Overview

Hoist React v87 is a big release on three fronts. It moves the framework to **React 19**, it
delivers a **major round of performance work across the `data` package** (leaner records and Cube
View rows, streaming loads, string interning, digest-based record reuse), and it ships a
**re-implemented grid column chooser** with drag-and-drop reordering, an optional Column Library,
and a new docked side-panel presentation.

Most of the performance work is automatic and requires no app changes - but a handful of `data`
APIs changed shape to make it possible, and the new chooser changes both UX and a few configs.

The most significant app-level impacts are:

- **React 19** - bump `react`, `react-dom`, and `@types/react*` in your app. Most apps need only
  minor (often zero) source changes, but test carefully - see Step 3.
- **`@xh/hoist-dev-utils` 14.x required** - provides the matching `@types/react` 19.x, and adds
  optional support for pnpm as the app package manager.
- **Popovers now render on Floating UI** (Popper.js does not support React 19). All popover-based
  UI - menus, selects, date inputs, filter choosers - should be tested, and custom styles that
  targeted Blueprint/Popper popover internals reviewed.
- **ag-Grid `RowDragModule` now required** for apps registering an explicit module list - or take
  this opportunity to switch to `AllCommunityModule` (see Step 4).
- **New column chooser** - substantially improved UX that your key stakeholders should preview
  before release, plus small config/CSS adjustments for apps that customized the old chooser.
- **Cube / Store API adjustments** - `View.result.leafMap` access, leaf row ids, `cubeLeaves`,
  `StoreRecord.data` access patterns, and custom `Aggregator` contracts. Only apps using these
  specific APIs are affected - see Steps 6-7.
- **Managed autosize now paces itself on data updates** - loads and filter changes still autosize
  immediately. Affects only grids opted in to `autosizeOptions.mode: 'managed'` - see Step 8.
- **hoist-core >= 40.5.0 now required** and enforced at startup - apps on an older core will fail
  fast rather than start.

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v86.x
- [ ] **hoist-core upgraded to >= 40.5.0** - this is a hard floor, checked at app startup.
  hoist-core 41.x is recommended to light up all new Admin Console features (typed config editor,
  directory group search) - v87 degrades gracefully without it. See
  [Version Compatibility](../version-compatibility.md).
- [ ] **Node.js >= 22.15** - required by `@xh/hoist-dev-utils` 14.x.
- [ ] Your package manager (**pnpm**, **yarn**, or **npm**) is available and working.

## Upgrade Steps

### 1. Update `package.json`

Bump hoist-react to v87, `@xh/hoist-dev-utils` to `^14.0.0`, and React to 19. Your ag-Grid
dependencies remain on `35.x` - no ag-Grid version change in this release.

**File:** `package.json`

Before:

```json
"dependencies": {
    "@xh/hoist": "^86.0.0",
    "react": "~18.2.0",
    "react-dom": "~18.2.0"
},
"devDependencies": {
    "@types/react": "18.x",
    "@types/react-dom": "18.x",
    "@xh/hoist-dev-utils": "13.x"
}
```

After:

```json
"dependencies": {
    "@xh/hoist": "^87.0.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
},
"devDependencies": {
    "@types/react": "19.x",
    "@types/react-dom": "19.x",
    "@xh/hoist-dev-utils": "^14.0.0"
}
```

### 2. Update `resolutions` / `overrides` pins for `@types/react`

Many Hoist apps pin `@types/react` and `@types/react-dom` in a `resolutions` (yarn) or
`overrides` (npm - pnpm apps use the `pnpm.overrides` key) block to keep transitive copies
aligned. **If yours does, update the pins to `19.x`** - otherwise the old pin silently forces
the v18 typings back over your devDependency and type errors will persist after the upgrade.

**File:** `package.json`

Before:

```json
"resolutions": {
    "@types/react": "18.x",
    "@types/react-dom": "18.x"
}
```

After:

```json
"resolutions": {
    "@types/react": "19.x",
    "@types/react-dom": "19.x"
}
```

Then run `pnpm install` / `yarn install` / `npm install` and confirm a single v19 copy:

```bash
pnpm why @types/react   # or: yarn why @types/react, npm ls @types/react
```

### 3. React 19 source adjustments

React 19 is a major upgrade, but the typical Hoist app needs few or no source changes - Toolbox
required none. Run a type check to find what, if anything, needs attention:

```bash
npx tsc --noEmit
```

Common adjustments, all covered in the official
[React 19 upgrade guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide):

- **Stricter typings** - `ReactNode`, `useRef` (now requires an argument), and ref callback
  types all tightened. Most fixes are mechanical.
- **Ref callbacks must not return a value** - React 19 treats a ref callback's return value as a
  cleanup function. An arrow-bodied callback that implicitly returns something (e.g.
  `ref={el => (this.node = el)}`) should add braces: `ref={el => { this.node = el; }}`.
- **Removed legacy APIs** - `ReactDOM.render`, `propTypes`, string refs, etc. were removed
  upstream. Hoist apps are unlikely to use these directly.

**Test all popover-based UI.** Both the desktop and mobile `Popover` components now render on
Floating UI instead of Popper.js. Menus, selects, date inputs, and filter choosers all work
out of the box, but the DOM structure has changed - custom styles that targeted Blueprint or
Popper popover internals may need updating.

**Find affected styles:**

```bash
grep -rn "bp6-popover\|bp6-minimal\|popper" client-app/src/
```

The `popperOptions` escape-hatch prop was removed from the mobile `Popover`:

```bash
grep -rn "popperOptions" client-app/src/
```

### 4. Register ag-Grid `RowDragModule` - or better, switch to `AllCommunityModule`

The new column chooser uses ag-Grid row dragging internally. Apps that register an explicit list
of ag-Grid modules in `Bootstrap.ts` must add `RowDragModule` - without it, the chooser's
drag-and-drop fails silently. Apps already registering `AllCommunityModule` need no change.

**Recommended: switch to `AllCommunityModule`.** In a typical Hoist app, curating a
module-by-module list buys essentially nothing in shipped code - an A/B production build of
Toolbox measured no meaningful bundle-size difference between its curated community module list
and `AllCommunityModule`. Registering everything eliminates this whole class of
silently-missing-feature bug. Enterprise module registrations (`ag-grid-enterprise`) are
unaffected - keep them as-is, or consolidate them the same way with `AllEnterpriseModule` if
preferred. (Toolbox itself retains a curated list, in part to exercise the module system.)

**File:** `src/Bootstrap.ts`

Before:

```typescript
import {
    CellStyleModule,
    ClientSideRowModelModule,
    // ...many more modules...
    TooltipModule
} from 'ag-grid-community';

ModuleRegistry.registerModules([
    CellStyleModule,
    ClientSideRowModelModule,
    // ...many more modules...
    TooltipModule
]);
```

After:

```typescript
import {AllCommunityModule} from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);
```

Note that `AllCommunityModule` includes ag-Grid's `ValidationModule`, so its developer-friendly
error messages are also enabled in production - a negligible runtime cost, and the validation
code ships in the bundle either way.

If you prefer to keep a curated list, simply add `RowDragModule` to your existing imports and
`registerModules()` call.

### 5. Review the new column chooser

The desktop grid column chooser has been re-implemented. Its UX is substantially improved yet
also different - columns now appear in true grid order across pinned/unpinned zones, with
drag-and-drop reordering, checkbox/double-click visibility toggles, and an optional Column
Library of hidden columns. **Preview it with key stakeholders before release** so no one is
surprised by the change.

App-level adjustments to check:

**a. `colChooserModel` is now `popupColChooserModel`.** The config and the `GridModel` property
have both been renamed to distinguish the popup chooser from the new docked presentation (see (e)
below). `GridModel.showColChooser()` is now `showPopupColChooser()`, and the `colChooser`
context-menu token is now `popupColChooser`.

Before:

```typescript
new GridModel({
    colChooserModel: true,
    contextMenu: ['colChooser', 'autosizeColumns']
});
```

After:

```typescript
new GridModel({
    popupColChooserModel: true,
    contextMenu: ['popupColChooser', 'autosizeColumns']
});
```

**Find affected models:**

```bash
grep -rn "colChooserModel\|showColChooser\|'colChooser'" client-app/src/
```

**b. `Column.chooserGroup` now requires the Column Library.** Grouping applies only within the
new, opt-in Column Library. If your app sets `chooserGroup` on columns and you want to keep a
grouped presentation of hidden columns, enable the library:

Before:

```typescript
new GridModel({
    popupColChooserModel: true,
    columns: [...] // columns with chooserGroup
});
```

After:

```typescript
new GridModel({
    popupColChooserModel: {columnLibrary: true},
    columns: [...] // chooserGroup now groups the Column Library
});
```

**Find affected models:**

```bash
grep -rn "chooserGroup" client-app/src/
```

**c. Custom chooser styles.** The chooser no longer renders on `LeftRightChooser` - it renders
its own grids and CSS classes in a different layout. Update or remove styles that targeted the
old DOM:

```bash
grep -rn "xh-col-chooser\|xh-lr-chooser" client-app/src/
```

**d. New columns are now hidden by default in user-curated views.** When column state persists
to a `ViewManagerModel` or `DashViewModel`, columns newly added in an app release start hidden,
so a release does not push new columns into views users have curated and named. The columns
remain available in the chooser. To restore the previous behavior:

```typescript
new GridModel({
    persistWith: {viewManagerModel, hideNewColumns: false}
});
```

**e. New capabilities to adopt (optional).** The chooser also gains a docked side-panel
presentation (`GridConfig.dockedColChooserModel` + `GridModel.showDockedColChooser()`, the
`dockedColChooser` context-menu token, or `colChooserButton({target: 'docked'})`), per-column
`chooserDescription` tooltips, and `ColChooserConfig` options like `filterMatchMode` and
`autosizeOnCommit`. See the configs for details - no action required.

### 6. Update Cube `View` usages

Skip this step if your app does not use `Cube` / `View` from `@xh/hoist/data/cube`. These
changes support the major memory and speed improvements in this release.

**a. `View.result.leafMap` is now null unless requested.** Aggregate-only views no longer
publish a map of leaf rows. If your app reads `leafMap`, set `includeLeaves` (leaves as tree
children) or `provideLeaves` (leaves available on request) on the `Query` - or read source
records from `Cube.store` instead.

Before:

```typescript
const view = cube.createView({query: {fields, dimensions}});
const leaves = view.result.leafMap; // was always populated
```

After:

```typescript
const view = cube.createView({query: {fields, dimensions, provideLeaves: true}});
const leaves = view.result.leafMap;
```

**Find affected code:**

```bash
grep -rn "leafMap" client-app/src/
```

**b. `ViewRowData.cubeLeaves` getter replaced by `getCubeLeaves()`.** Update any code reading
`row.cubeLeaves`:

Before:

```typescript
const leaves = row.cubeLeaves;
```

After:

```typescript
import {getCubeLeaves} from '@xh/hoist/data';

const leaves = getCubeLeaves(row);
```

```bash
grep -rn "cubeLeaves" client-app/src/
```

**c. Leaf row ids now use the source record's id.** Leaf rows published by Views no longer use a
generated id encoding the row's full dimension path. Aggregate and bucket row ids are unchanged.
Review any code that parses leaf row ids. Relatedly, `Store.idEncodesTreePath` can no longer be
set on a View-connected store:

```bash
grep -rn "idEncodesTreePath" client-app/src/
```

Hits on stores *not* connected to a Cube `View` need no change - the flag remains fully
supported there. A View-connected store configured with it now throws at connect time with a
descriptive error, so violations fail loud rather than misbehave.

**d. Custom `Aggregator`s reading `filteredRecords` must declare themselves.**
`AggregationContext.filteredRecords` now throws when read by an aggregator that does not
override `dependsOnChildrenOnly` to return `false`. Views with only children-based aggregators
update incrementally without maintaining that collection.

Before:

```typescript
class MyWeightedAvgAggregator extends Aggregator {
    override aggregate(rows, fieldName, context) {
        const all = context.filteredRecords; // now throws without declaration below
        // ...
    }
}
```

After:

```typescript
class MyWeightedAvgAggregator extends Aggregator {
    // Declare that this aggregator depends on records beyond its own children.
    override get dependsOnChildrenOnly(): boolean {
        return false;
    }

    override aggregate(rows, fieldName, context) {
        const all = context.filteredRecords;
        // ...
    }
}
```

```bash
grep -rn "filteredRecords" client-app/src/
```

**e. `BaseRow.data` retyped to `PlainObject`.** Custom `Aggregator` implementations may rely
only on queried field values when reading row data - use row-level getters such as
`BaseRow.isLeaf` in place of `data.cubeRowType`. A TypeScript-level change - the compiler will
flag affected code.

### 7. Update `Store` / `StoreRecord` usages

These changes apply to all apps, but the affected patterns are uncommon - a quick grep pass
should settle each one.

**a. Read `StoreRecord.data` by field name only.** Enumerating, spreading, or serializing a
record's `data` object does not reliably see default field values (and with this release's new
compact record representations, is much more likely to misbehave). Use the provided APIs:

Before:

```typescript
const copy = {...record.data};
const json = JSON.stringify(record.data);
```

After:

```typescript
const copy = record.getValues();
const json = JSON.stringify(record.getValues());
```

**Find affected code:**

```bash
grep -rn "\.\.\..*\.data\b\|JSON.stringify(.*\.data)\|Object\.keys(.*\.data)" client-app/src/
```

This grep is intentionally broad - triage the hits rather than rewriting mechanically. Reading
individual properties (`record.data.quantity`) is always safe and needs no change. The
unreliable patterns are those that depend on the object's own enumerable keys - spread,
`Object.keys()`, `JSON.stringify()` - which can omit fields whose values match their configured
`defaultValue`. Switch a hit to `getValues()` when its consumer needs every field present.

**b. `StoreChangeLog.remove` now holds records, not ids.** The change log returned by
`Store.updateData()` reports the removed `StoreRecord`s themselves - read `record.id` where you
need ids:

Before:

```typescript
const changeLog = store.updateData(update);
const removedIds = changeLog?.remove ?? [];
```

After:

```typescript
const changeLog = store.updateData(update);
const removedIds = changeLog?.remove.map(it => it.id) ?? [];
```

```bash
grep -rn "updateData(" client-app/src/
```

Only callers that read the returned change log's `remove` collection are affected - the many
calls that ignore the return value need no change.

**c. `Store.reuseRecords` is now `Store.digestSpec`.** The new config names the *digest* it
derives from each raw object - symmetrical with `idSpec`, and clearer about the fact that Store
always attempts record reuse. Name a raw property holding a per-row stamp, or supply a function
returning one:

Before:

```typescript
const store = new Store({fields: [...], reuseRecords: true});
```

After:

```typescript
const store = new Store({fields: [...], digestSpec: 'rev'});
```

```bash
grep -rn "reuseRecords" client-app/src/
```

Drop any `reuseRecords: false` outright - it never differed from the unset default.

Note this is not a pure rename. The former `reuseRecords: true` reused a record only when handed
the very same raw object, by reference, and digests must now be primitives - so that form is gone.
It could never hit for data straight off the wire (a re-fetch yields new objects every time), and
it silently reported "unchanged" for a cached row mutated in place. If your provider caches and
re-supplies its own rows, stamp each row with a revision it bumps on every mutation - e.g.
`XH.genId()` at creation - and digest that. Otherwise drop the config: Store still reuses records
whose field values compare equal, which is the default behavior.

### 8. Review grids using managed autosize

Applies only to grids configured with `autosizeOptions: {mode: 'managed'}`, or to apps that set
`GridModel.defaults.autosizeMode = 'managed'` globally. Grids using the default
`'onSizingModeChange'` mode are unaffected.

Managed autosize previously re-measured every column after **every** applied transaction. On a
grid receiving streaming updates that meant a full re-measure of every record in every column on
every tick - work the next tick immediately invalidated, and a visible source of column jitter.

Managed autosize now distinguishes what changed:

| Change | Behavior |
| --- | --- |
| `Store` load (`loadData` / `loadDataAsync`) | Autosizes immediately, as before |
| Filter change | Autosizes immediately, as before |
| Incremental update (`updateData`) | Paced - see below |

Update-driven autosizes now pace off their own measured cost, exactly as `deferredSortFactor`
already does for deferred re-sorts: an autosize costing E ms defers the next by `E * factor`
(default 10), so a grid where autosize is cheap re-fits almost immediately, while an expensive one
backs off - bounding autosize to roughly 10% of main-thread time regardless of grid size or
hardware. Columns still settle to fit their content, just not on every single tick.

No configuration change is required, and no API changed. Tune with the
`deferredAutosizeFactor` experimental flag, or set it to 0 to restore the previous
autosize-on-every-change behavior:

```typescript
new GridModel({
    autosizeOptions: {mode: 'managed'},
    experimental: {deferredAutosizeFactor: 0}
});
```

Review if either applies:

- **A grid whose values grow substantially wider mid-stream** may show the wider content clipped
  for longer than before. Call `gridModel.autosizeAsync()` at an appropriate point, widen
  `autosizeOptions.bufferPx`, or lower `deferredAutosizeFactor`.
- **Tests or scripts that assert column widths right after an update** may now observe the
  pre-update widths. Await the pacing interval, or call `gridModel.autosizeAsync()` explicitly.

```bash
grep -rn "autosizeMode\|mode: 'managed'" client-app/src/
```

### 9. A note on pnpm (no action required)

`@xh/hoist-dev-utils` 14.x adds optional support for **pnpm** as the app package manager -
**yarn classic and npm remain fully supported and require no change**. Moving an app to pnpm
touches its build and deployment pipeline and will be planned as its own coordinated effort -
it is not part of this upgrade. Do not migrate as part of a v87 upgrade.

Developers who build against a local hoist-react checkout (`inlineHoist`) now need pnpm to
install hoist-react's own dependencies (`corepack enable pnpm`, then `pnpm install` in the
hoist-react checkout) - regardless of which package manager the app itself uses.

## Verification Checklist

After completing all steps:

- [ ] `pnpm install` / `yarn install` / `npm install` completes without errors
- [ ] `pnpm why @types/react` / `yarn why @types/react` / `npm ls @types/react` shows a single
  19.x copy
- [ ] `pnpm lint` / `yarn lint` / `npm run lint` passes (or only pre-existing warnings remain)
- [ ] `npx tsc --noEmit` passes
- [ ] Application loads without console errors
- [ ] **Popovers**: menus, selects, date inputs, and filter choosers open, position, and style
  correctly on desktop and mobile
- [ ] **Column chooser**: opens on your grids; drag-and-drop reorder, pin/unpin, and visibility
  toggles work; any `chooserGroup` presentation reviewed
- [ ] **Grids with persisted column state** (ViewManager/dashboards): verify saved views load
  correctly and confirm the new hidden-by-default behavior for newly added columns is acceptable
- [ ] **Stores configured with `reuseRecords`**: migrated to `digestSpec`, and record reuse still
  observed (unchanged rows keep their grid state across a reload)
- [ ] **Cube-driven screens**: aggregations, drill-downs, and bucket rows render as before
- [ ] **Grids using managed autosize**: columns fit on load and on filter change; streaming grids
  settle to fit once updates pause
- [ ] Grids render and function correctly (sorting, filtering, grouping, inline editing)
- [ ] Forms validate and submit correctly

## Reference

- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide) - official
  upgrade guide, including TypeScript changes
- [Version Compatibility](../version-compatibility.md) - hoist-core and dev-utils pairings
- [Toolbox on GitHub](https://github.com/xh/toolbox) - canonical example of a Hoist app, upgraded
  to v87
