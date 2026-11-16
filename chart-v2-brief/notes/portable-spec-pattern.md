# Portable spec pattern - one Hoist-wide boundary between code specs and JSON

Researched 2026-11-15. Read only. hoist-react at `chart-spike` (b9463e8c4), Toolbox `develop`
(c3a7e87b), hoist-chat-kit `genui-building-blocks` (d800d74), hoist-core (8c8e93f7).

Tags: **[V]** verified, with file:line or a command. **[I]** inferred, with confidence. Paths
are relative to the hoist-react worktree unless named. Toolbox paths are under
`toolbox/client-app/src`. Counts come from `rg` patterns, so treat them as close, not exact.

## Answer

The three layers hold, but each needs a change. (1) A registry entry is a name plus JSON args,
not a bare name. Most function values in real code come from configured factories, such as
`numberRenderer({precision: 0})` and `numberIs({min: 0})`. A bare name would lose their options.
(2) Named presets, meaning partial code specs that may contain functions, do more for Grid than
naming single functions. Toolbox already keeps a column library of this kind. (3) The `Portable<T>`
mapped type works on real Hoist types, and it type-checks in both strict and non-strict mode. But it
is a check, not the published contract: shapes survive without their meaning, it cannot pick the
registry domain for a function slot, and `Portable<GridConfig>` is expensive to compile. Hand-write
the portable types that agents and storage see, and use the mapped type in tests. For the whole-
model shape, I recommend a **flat Config that extends a named Spec**
(`TimeSeriesChartConfig extends TimeSeriesChartSpec`). This is a third option beside "nested spec"
and "flat config". Grid can adopt it with no break (`GridConfig extends GridSpec`). It keeps the
nested option's named boundary and its single patch, validate and persist path. Keep the name
**Portable**. It clashes with nothing in hoist-react or hoist-core.

---

## 1. Per-component survey

### 1.1 Grid (deepest)

**Function-valued and non-serializable options** [V]

| Where | Options (line) |
|---|---|
| `ColumnSpec` (`cmp/grid/columns/Column.ts`) | `headerName` fn or ReactNode (129), `headerClass` fn (144), `cellClass` fn (151), `cellClassRules` fn map (157), `cellFlag` (165), `sortValue` fn (227), `sortToBottom` fn (234), `comparator` (237), `textRenderer` (284), `renderer` (301), `tooltip` fn (319), `exportName` fn (351), `exportValue` fn (357), `excelFormat` fn (363), `editable` fn (403), `editor` component or fn (409), `setValueFn` (419), `getValueFn` (422), `omit` Thunkable (433), `actions` with `actionFn` (438), `onCellClicked` (451), `agOptions` ag-Grid ColDef (459) |
| `ColumnGroupSpec` (`cmp/grid/columns/ColumnGroup.ts:37`) | `headerName` fn or ReactNode, `omit` Thunkable, `agOptions` |
| `GridConfig` (`cmp/grid/GridModel.ts`) | `store` instance (167), `selModel` instance (176), `restoreDefaultsFn` (193), `restoreDefaultsWarning` ReactNode (199), `persistWith` with `dashViewModel` / `viewManagerModel` / `getData` / `setData` (202, `core/persist/PersistOptions.ts:68-83`), `emptyText` ReactNode (208), `rowClassFn` (276), `rowClassRules` (282), `groupRowRenderer` (288), `groupSortFn` (295), six event handlers (302-332), `levelLabels` Thunkable (345), `contextMenu` / `headerContextMenu` fn or items with `actionFn` (359, 366; `cmp/grid/GridContextMenu.ts:70`) |
| `RecordActionSpec` (`data/RecordAction.ts`) | `icon` element (23), `actionFn` (35), `displayFn` (41) |

**What already has a declarative form** [V]

- Formats. `createRenderer()` (`format/FormatUtils.ts:19`) and `createNumberTextRenderer()`
  (`format/RenderNumber.ts:98`) build every Hoist renderer from a formatter name plus a
  `NumberFormatOptions` object. The options object is already JSON-safe except `tooltip` fn and
  `zeroDisplay` ReactNode. The factory output is a closure that drops the options.
- Context menu tokens (`GridContextMenuToken`, `GridContextMenu.ts:49`), sort strings
  (`"colId|desc|abs"`, `GridSorter.ts`), `excelFormat` strings, `cellClass` strings, `tooltip:
  true`, `exportValue` as a field name, `field` as a `FieldSpec` object.
- Prebuilt column presets: `number`, `boolCheck`, `fileExt`, `tags` (`columns/Core.ts:13-35`) and
  date presets (`columns/DatesTimes.ts:19-55`). They are referenced by JS import, not by name.

**Needs a registry entry**: custom renderers that return components, `comparator`, `getValueFn`,
`groupSortFn`, `rowClassFn`, editors, record actions, event handlers.

**Toolbox usage** (pattern counts over 423 files; `new GridModel(` x37) [V]

| Option | Key hits | Inline lambdas | Notes |
|---|---|---|---|
| `renderer` | 82 | 35 | About 30 are Hoist factories (`numberRenderer` x8, its aliases `ms0`/`ms1` x17, `millionsRenderer`, `dateRenderer`, `checkboxRenderer`). 5 are named app functions. 15 of the lambdas are `(v, {record}) =>`, mostly rendering components. |
| `textRenderer` | 52 | 0 | 42 are Hoist factories (`numberTextRenderer` x29, `dateTextRenderer` x6, `millionsTextRenderer` x5, others). |
| `tooltip` | 74 | 22 | Key also used off-grid. |
| `headerName` | 138 | 5 | |
| `comparator`, `getValueFn`, `sortValue`, `sortToBottom` | 0 | 0 | |
| `groupSortFn` / `rowClassFn` / `groupRowRenderer` | 5 / 4 / 2 | all | |
| `levelLabels` | 9 | 8 | Thunks that read the grouping chooser model. |
| `editor` / `editable` / `setValueFn` | 7 / 11 / 1 | 3 / 1 / 1 | |
| `agOptions` | 9 | 0 | |
| `valueRenderer` (filter fields) | 22 | 0 | All Hoist factories. |

hoist-react `admin/` (19 GridModels): `renderer` 51 hits, 19 inline; `getValueFn` 0 [V].

Read: most function values in real grids are Hoist format factories plus options [V, from the
table]. A tagged factory makes them portable with no app change [I, high].

**What it persists today** [V]: `initPersist()` (`cmp/grid/impl/InitPersist.ts:24-128`) writes
one provider per key: `grid.columns` (colId, width, hidden, pinned, manuallySized), `columnGroups`,
`sortBy` (strings), `groupBy`, `expandLevel`. It never persists the grid filter or the column
definitions (no filter key in `InitPersist.ts`). `cleanColumnState()` drops unknown colIds.

**Runtime reconfiguration** [V]: 14 GridConfig keys can change after construction - `columns`
(`setColumns`, 1362), `sortBy`, `groupBy`, `expandLevel`, `showSummary`, `emptyText`, `treeStyle`
(observables at 622-646), and `sizingMode`, `showHover`, `rowBorders`, `stripeRows`,
`cellBorders`, `showCellFocus`, `hideHeaders` (setters at 1149-1221). Two gaps matter for agents:

- `setColumns()` resets all column state, and persists that reset (doc at `GridModel.ts:1355-1359`).
  An agent that adds one column wipes the user's widths and order. Agents need
  `addColumn` / `removeColumn` / `updateColumn` that keep state.
- `_defaultState` is set once in the constructor (`GridModel.ts:759`) and `restoreDefaults` reads
  it (887). After an agent edits the columns, "Restore defaults" goes back to the constructor
  columns, not the agent's latest spec.

**Portable config and factory** [I, high]

```ts
interface PortableColumn {
    field: string;
    preset?: string;              // registry 'columnPreset', e.g. 'app.profitLoss'
    headerName?: string;
    width?: number; hidden?: boolean; pinned?: HSide; align?: HAlign;
    format?: PortableRef<'format'>;        // -> textRenderer + excelFormat, via the format registry
    renderer?: PortableRef<'cellRenderer'>; // components only
    // ...the rest of the plain ColumnSpec keys
}
interface PortableGridSpec {
    columns: (PortableColumn | PortableColumnGroup)[];
    sortBy?: string[]; groupBy?: string[]; treeMode?: boolean; showSummary?: boolean | VSide;
    // presentation flags as in GridConfig
}
// Widget factory: resolve presets (defaultsDeep, like colDefaults), resolve refs, build the model.
gridModelFromPortable(spec: PortableGridSpec, ctx: {store | binding, persistWith}): GridModel;
```

Hard parts:

- **Components in cells.** About 15 Toolbox renderers return components. Each needs a registered
  `cellRenderer`. There is no way around this.
- **`getValueFn`, `comparator`.** Unused in Toolbox, so registry-only is fine.
- **Store binding.** A portable grid names a data source. `processRawData` (10 inline in Toolbox)
  belongs to the source, not to the grid.
- **Record actions.** Shape survives, meaning does not. An action without `actionFn` type-checks
  (see 3.3). Actions must be registry names.
- **`levelLabels`.** Toolbox thunks read live chooser state. The portable form should derive
  labels from `groupBy` field display names.

### 1.2 Forms

**Function-valued options** [V]

- `FieldSpec.rules` / `BaseFieldConfig.rules: RuleLike[]` (`data/Field.ts:53`,
  `cmp/form/field/BaseFieldModel.ts:51`). `RuleSpec.check` is a required `Constraint` fn and
  `when` is a fn (`data/validation/Types.ts:51-60`).
- `FormFieldProps.readonlyRenderer` (`cmp/form/BaseFormFieldProps.ts:44`), `info` / `label`
  ReactNode. `SubformsFieldConfig.initialValue` Thunkable.
- The form layout (`form`, `formField`, inputs) is component code. `FormModel` holds no layout.

**Declarative equivalents** [V]: Hoist constraints are named factories with options -
`required`, `validEmail`, `lengthIs(opts)`, `numberIs(opts)`, `dateIs(opts)`, `constrainAll`,
`stringExcludes`, `isValidJson` (`data/validation/constraints.ts:22-228`). In Toolbox, about 73 of
80 `rules: [` lines start with one of these. App-specific: `requireTrue` and a few lambdas. `when`
appears 5 times, all inline.

**Persistence** [V]: values only, under `formValues`, with its own date codec
`{_xhType: 'date' | 'localDate', value}` (`cmp/form/FormModel.ts:326-366`).

**Runtime** [V]: `FormModel` takes its fields at construction. chat-kit works around this with one
`FormModel` per field and rebuilds it when rules change
(`hoist-chat-kit [bb] desktop/cmp/genui/impl/ChatUiField.ts:82-84`). chat-kit also hand-maps
portable rules to Hoist rules: `{required, min, max}` to `[required, numberIs({min, max})]`
(`impl/ChatUiInputSupport.ts:70-81`).

**Portable form** [I, high]: `{fields: [{name, displayName, type, initialValue, rules:
PortableRef<'constraint'>[]}], layout: <widget tree>}`. Rules become
`{name: 'xh.numberIs', args: {min: 0}}`. The layout is the hard part. It is a widget tree, and
chat-kit's form and input specs already define one. Hoist should own the rule refs. The layout can
stay in chat-kit until a dashboard needs a form.

### 1.3 Store, filters, Cube

| Type | Function / live options [V] | Declarative today [V] | Persists [V] |
|---|---|---|---|
| `StoreConfig` (`data/Store.ts:84`) | `processRawData` (116), `idSpec` fn (102, type 322), `digestSpec` fn (189), `filter` FilterLike incl. fn (122) | `idSpec` as field name, `fields` as names or `FieldSpec`, inline `data` | nothing itself |
| `FieldSpec` (`data/Field.ts:20`) | `rules` only | everything else | n/a |
| `FilterSpec` (`data/filter/Types.ts:14`) | `FunctionFilterSpec.testFn` (67-73), `FieldFilterSpec.field` may be a `Field` | `FieldFilter` / `CompoundFilter` round-trip via `toJSON()` (`FieldFilter.ts:315`, `CompoundFilter.ts:71`) | via FilterChooser `value.toJSON()` (`cmp/filter/FilterChooserModel.ts:545`) |
| `FunctionFilter` | `testFn` | already carries a `key`, but `toJSON()` throws (`FunctionFilter.ts:56-58`) and equality is by fn identity (51-54) | not persistable |
| `CubeFieldSpec` (`data/cube/CubeField.ts:28`) | `aggregator` instance (38), `canAggregateFn` (50) | `AggregatorToken` strings, a closed `switch` (`CubeField.ts:64-163`) | n/a |
| `QueryConfig` (`data/cube/Query.ts`) | `lockFn` (114), `bucketSpecFn` (126), `omitFn` (132), `filter`, `cube` instance | `dimensions`, `fields`, `pivot: PivotSpec` (148) as names | n/a |

Toolbox [V]: `aggregator` 39 hits, 35 tokens, 2 custom class instances. `canAggregateFn` 10 hits,
all the same named fn `isInstrument`. `testFn` 24, all inline. `processRawData` 11, 10 inline.

Notes:

- `FieldFilter` already solves class values in JSON with a `valueType` tag (`FieldFilter.ts:315-
  317`). `FormModel` uses `_xhType`. That is two codecs for one problem. The portable layer should
  define one [V for the two, I for the fix].
- `FunctionFilter.key` is the right idea. A registered filter fn can make its key the registry
  name, and `toJSON()` can return `{fn: {name, args}}` [I, high].
- `AggregatorToken` shows the cost of a closed token set. Apps cannot add a token, so custom
  aggregators stay code-only. Make it an open registry domain with the tokens as built-ins [I, high].
- Store supports runtime change: `setFields` (`Store.ts:1003`), `setFilter` (1113).

### 1.4 FilterChooser, GroupingChooser, ViewManager, Dash, TabContainer, Panel

| Component | Non-portable config [V] | Persists [V] | Fit |
|---|---|---|---|
| FilterChooser | `bind` target, `valueSource`, `initialValue` Thunkable, field `valueRenderer` / `valueParser` (`cmp/filter/FilterChooserModel.ts:70-140`, `FilterChooserFieldSpec.ts:23-29`) | `filterChooser.value`, `.favorites` as filter JSON (`:530-570`) | Good. Already round-trips filters. |
| GroupingChooser | `bind`, `initialValue` / `initialFavorites` fns (`cmp/grouping/GroupingChooserModel.ts:53-62`) | value, favorites (`:98-101`) | Good. Dimensions are names. |
| ViewManager | `initialViewSpec`, `viewMenuItemFn`, `manageGlobal` Thunkable (`cmp/viewmanager/ViewManagerModel.ts:131-165`) | `View.value` JSON in a server JsonBlob. It stringifies and parses to force valid JSON (`:844`). | The long-term store for portable state. Names saved here live for years. |
| Dash | `DashViewSpec.content` component, `icon` element, `omit` Thunkable (`desktop/cmp/dash/DashViewSpec.ts:18-55`) | `{layout, title, viewSpecId, state}` (`canvas/DashCanvasModel.ts:105-110`). Unknown `viewSpecId` is skipped with a warning (`:532-537`). | Already code spec + registry by id + portable state. v86 dropped icon persistence so icons always come from the spec (`docs/upgrade-notes/v86-upgrade-notes.md:546-553`). |
| TabContainer | `TabConfig.content`, `icon`, `title` ReactNode, `omit` (`cmp/tab/TabModel.ts:29-86`) | active tab id, favorite tab ids (`cmp/tab/Types.ts:72-74`) | Tab content needs widget envelopes. |
| Panel | ReactNode headers and items | size and collapsed state, path `panel` (`desktop/cmp/panel/PanelModel.ts:339-343`) | Chrome only. Trivially portable. |
| CubeGrid | `view` / `cube` instances, `PivotSort` fn (`cmp/cubegrid/Types.ts:19`), column fns | grid state, deferred until pivot columns exist (`cmp/cubegrid/CubeGridModel.ts:65`, `:328-330`) | Precedent for nesting and for data-driven parts (sections 2.5, 2.6). |

Icons already have a by-name path: `Icon.icon({faName})` and the icon catalog behind
`IconPicker` (`icon/Icon.ts:147`, `:1060-1078`) [V].

### 1.5 hoist-chat-kit today [V]

- chat-kit invents its own portable column type, `ChatUiGridColumn {field, headerName, type,
  format, decimals, max}` (`[bb] desktop/cmp/genui/ChatUiGrid.ts:39-61`), and hand-maps it to
  `ColumnSpec` with inline lambdas (`impl/ChatUiTableData.ts:201-221`).
- Its catalog is a name-to-spec registry with a content-hash `version` and `migrations` keyed by
  old version (`genui/ChatUiCatalog.ts:174-178`, `:345`, `:432-440`).

This is the per-component split the pattern should end. A Hoist `PortableColumn` plus the format
registry would let chat-kit drop its own mapping [I, high].

---

## 2. The six answers

### 2.1 Does the three-layer model hold? Where does it break?

It holds as a frame. It breaks in six places. Each has a fix.

| # | Break | Evidence | Change |
|---|---|---|---|
| 1 | A name alone loses factory options | `numberRenderer({precision: 0})` returns a closure (`FormatUtils.ts:19-25`). Toolbox shares option objects such as `PNL_FORMAT` (`core/columns/Trades.ts:19-20`). | A reference is `name` or `{name, args}`. `args` must itself be portable. |
| 2 | Per-function naming is too fine for Grid | Toolbox keeps a library of named `ColumnSpec`s with functions inside, e.g. `profitLossCol` (`core/columns/Trades.ts:22-34`) | Add a `preset` domain. Portable JSON says `{preset: 'app.profitLoss', width: 120}`. The preset may hold functions. |
| 3 | "Whole spec must be portable" is too strict | Follows from 2 | Restate: **the stored JSON must be portable. The resolved code spec need not be.** |
| 4 | The mapped type checks shape, not meaning | 3.3, limits 1, 2, 4 | Hand-write published portable types. Test them against `Portable<T>` and the code type. |
| 5 | Validation needs the registry and the data | Field names, preset names and source names are only known at runtime (`findings/11` section 5) | Replace `isPortable(spec)` with `validatePortable(json, ctx): string[]`, in chat-kit's path-prefixed format. |
| 6 | Class values have two codecs | `_xhType` (`FormModel.ts:351`) vs `valueType` (`FieldFilter.ts:315`) | One codec for Date and LocalDate. Where a schema or Store field gives the type, store plain ISO strings and no tag. |

Also keep three kinds of portable content apart: **definition** (spec), **state** (user
adjustments, as today), and **binding** (a source ref with params). They persist under different
keys and change for different reasons [I, high].

### 2.2 Registry design

**One mechanism, typed domains** [I, medium-high]. One registry class with a domain per slot kind:
`format`, `cellRenderer`, `columnPreset`, `seriesPreset`, `constraint`, `filterFn`, `aggregator`,
`comparator`, `action`, `source`, `widget`. One class gives one naming rule, one alias and
deprecation path, and one "Available: ..." list for agent errors. Domains keep a renderer name out
of a comparator slot. Per-component registries would repeat all of that. A per-model resolver,
such as 09's `sourceResolver`, would become the `source` domain.

**How a function gets its name.**

| Option | Verdict |
|---|---|
| `fn.name` | No. Minifiers rename functions [I, high - standard behavior, not tested here]. |
| Decorator | Weak. TC39 decorators apply to classes and members, not to plain functions or arrow consts [I, high]. |
| Explicit registration | Yes. `registry.add('cellRenderer', 'app.pnlBar', fn)` returns the same fn, tagged. |
| Tagging factories | Yes, and it gives the most coverage. `createRenderer`, `createNumberTextRenderer` and the constraint factories attach `{name: 'xh.number', args}` to their output. This covers about 70 of Toolbox's `renderer` / `textRenderer` uses and all 22 `valueRenderer` uses with no app change (1.1). |

Store the tag in a `WeakMap<Function, {domain, name, args}>`, not on the function, so that frozen
or shared functions work [I, medium]. `toPortable()` walks a spec. A tagged function emits its
ref. An untagged function adds its path to `lost`.

**Stable names** [I, high, from precedents]:

- Namespaced ids: `xh.*` for Hoist built-ins, `app.*` or the appCode for apps. Never derive a name
  from code.
- Aliases on rename (`registry.alias('app.pnl', 'app.profitLoss')`).
- An unknown name on load keeps the JSON. It renders a placeholder, or skips with a warning as
  `DashCanvasModel` does (`:532-537`). **On save, write the unknown ref back unchanged.** A
  round trip must not destroy what an older or newer app version wrote.
- A version on each widget envelope (`v`), plus migrations, as chat-kit's catalog does. ViewManager
  blobs keep saved JSON for years.

### 2.3 TypeScript feasibility of `Portable<T>`

Files: `../spikes/portable/Portable.ts`
(the type) and `../spikes/portable/Portable.test.ts`
(assertions over real Hoist types). Checked with the worktree's `tsc` 7.0.2:
`tsc -p tsconfig.json` (Hoist's own options, `strict: false`) and `tsc -p tsconfig.strict.json`.
Both are clean for the scratch files [V]. Under strict, Hoist's own sources report errors, which
are unrelated.

**Rules.** A function branch drops (`Thunkable<string>` becomes `string`). React elements drop.
Date and LocalDate become strings. `any` stays `any`. An optional key that maps to never is
removed. **An object with a required key that maps to never becomes never.** That last rule
removes class instances (they have required methods), `FunctionFilterSpec` (`testFn`) and
`RuleSpec` (`check`) with no list of names. Depth is capped at 10. Past the cap, the type is
`unknown`.

**What works** [V]

| Probe | Result |
|---|---|
| `Thunkable<string>`, `string \| fn` | `string` |
| `Portable<ColumnSpec>` lost keys | `cellFlag`, `comparator`, `editor`, `getValueFn`, `onCellClicked`, `renderer`, `setValueFn`, `sortToBottom`, `textRenderer` |
| `headerName` | `string \| number \| boolean` (fn and element dropped) |
| `field: string \| FieldSpec \| CubeFieldSpec` | string or a portable FieldSpec object |
| `FilterSpec` (discriminated union) | Field and Compound kept, Function dropped. Recursive `FilterLike` resolves. |
| `RuleLike` | `never`, so `FieldSpec` loses only `rules` |
| `StoreConfig` | loses only `processRawData`. `idSpec` keeps its string branch. |
| `GridConfig` lost keys | `groupRowRenderer`, `groupSortFn`, six event handlers, `restoreDefaultsFn`, `rowClassFn`. `store` keeps the StoreConfig branch. `selModel` keeps strings and config. `persistWith` loses the live model refs. |
| `GridSorterSpec`, `DashCanvasItemState` | map to themselves |
| Recursive `ColumnGroupSpec.children`, ag-Grid `ColDef` | resolve |
| `PortableWith<ColumnSpec, {renderer?: Ref; textRenderer?: NumberFmtRef}>` | turns slots into typed refs. An unknown format name fails. |

**Limits** [V, each one compiles in the test file]

1. `Record<string, Fn>` (`cellClassRules`, `rowClassRules`) maps to `{}`, which accepts any object.
2. Shape without meaning. `contextMenu: [{text: 'Delete', intent: 'danger'}]` type-checks after
   `actionFn` is dropped.
3. `unknown` maps to never, so `sortToBottom` is lost. Fixable.
4. A function slot cannot become a reference by itself. Function types are structural, and
   `ColumnExportValueFn` equals `ColumnSortValueFn`. The registry domain must be named per key,
   with `PortableWith`.
5. Strict mode adds `undefined` to optional keys. The key filter must exclude it. The spike does.
6. Cost. With `--extendedDiagnostics` against a baseline that only imports the types:
   `Portable<ColumnSpec>` and `Portable<ColDef>` each add about 0.16M instantiations.
   `Portable<GridConfig>` adds about 2.75M instantiations and about 0.8 s of check time on this
   machine (one run each). Do not compute it in public signatures.
7. A class without required methods would survive as a plain object. No Hoist case was found. A
   React element is excluded by name for this reason.

**Verdict** [I, high]: use the mapped type as a test ceiling, e.g.
`Expect<PortableColumn extends Portable<ColumnSpec> ...>`. Do not use it as the public type.

### 2.4 Naming

| Candidate | Problem |
|---|---|
| JSON form | Rejected. hoist-core `JSONFormat.formatForJSON()` is a one-way projection (`hoist-core src/main/groovy/io/xh/hoist/json/JSONFormat.java:17-19`). |
| Serializable | Hoist already says "JSON-serializable" for persisted state (`core/persist/Persistable.ts:11`, `PersistenceProvider.ts:132`). It would blur spec and state. It also implies one way. |
| Plain | `PlainObject` already means `Record<string, any>`, functions included (`core/types/Types.ts:47`). |
| Persistable / Storable | `Persistable` is the state interface (`core/persist/Persistable.ts`). Agents are not storage. |
| Declarative | Long. Already describes element factories (`core/elem.ts:15-24`). |
| **Portable** | Free. `rg -i portable` finds only "exportable" and "reportable" in hoist-react and hoist-core [V]. It says what we need: the value moves between code, storage, agents and other apps, and comes back. One minor clash: TypeScript's own "portable type declarations" (`kit/react-select/index.ts:17`). |

**Recommend** [I, medium-high]:

- Types: `Portable<T>` (test ceiling), hand-written `Portable*` types (`PortableColumn`,
  `PortableGridSpec`, `PortableTimeSeriesChartSpec`).
- References: `PortableRef<D>` = `string | {name, args?}`. `Ref` alone clashes with React refs,
  which Hoist uses widely (`utils/react/ComposeRefs.ts`, `createObservableRef`).
- Helpers: `toPortable(spec): {value, lost: string[]}`, `fromPortable(json, ctx)` (resolve refs
  and presets), `validatePortable(json, ctx): string[]`.
- Registry: `PortableRegistry`, one module-level instance exported from `@xh/hoist/core`.
  Registration then works in tests and before services install [I, medium]. Avoid "Catalog": it
  means component specs in chat-kit and the icon list in Hoist (`icon/Icon.ts:147`).
- Widget envelope: `{type, v, spec, state}`. `type` matches the Dash `viewSpecId` role. "Widget"
  is already used informally in 18 hoist-react files, with no exported type [V].

### 2.5 Framing: nested spec vs flat config

Three options, tested on Grid and the chart draft.

- **N, nested**: `new TimeSeriesChartModel({spec: {...}, store, persistWith})` (09 today).
- **F, flat**: `new TimeSeriesChartModel({series, panes, compare, store, persistWith})`, like
  `GridConfig`.
- **H, flat Config that extends a named Spec**:
  `interface TimeSeriesChartConfig extends TimeSeriesChartSpec {store, persistWith, ...}`. The
  model keeps `spec` as one observable and exposes `getSpec()` / `applySpecPatch()`.

**Evidence**

| Question | Finding |
|---|---|
| Does `*Spec` mean "part"? | Not strictly [V]. Parts: `ColumnSpec`, `FieldSpec`, `CubeFieldSpec`, `DashViewSpec`, `RecordActionSpec`, `PivotMeasureSpec`, `GridSorterSpec`. Wholes: `AppSpec`, `PivotSpec`, `FilterSpec`, `MessageSpec`, `ToastSpec`, `BannerSpec`, `LoadSpec`, `ReactionSpec`, `TimerSpec`, `ViewCreateSpec`. A part can be a Config: `TabConfig`. The steady meaning is "Spec = plain description, Config = constructor input of a model". Naming rules out neither N nor H. |
| How do Hoist models nest? | Most are flat: `GridConfig`, `FormConfig`, `StoreConfig`, `DashConfig`, `TabContainerConfig` [V]. Nested ones nest config **for something else**: `CubeGridConfig.gridConfig` / `pivotConfig` / `query` beside `view` / `cube` (`CubeGridModel.ts:40-81`), and `ChartConfig.highchartsConfig` for Highcharts (`cmp/chart/ChartModel.ts:16-21`). No model nests **its own** definition [V for the list, I for the reading]. |
| GridConfig keys | 60 keys (`GridModel.ts:153-456`) [V]. 10 are function-only (dropped by `Portable<GridConfig>`). 8 more are wiring or tuning: `persistWith`, `experimental`, `appData`, `xhName`, `xhImpl`, three perf factors. The other 42 describe the grid: 9 definition (`columns`, `colDefaults`, `treeMode`, `sortBy`, `groupBy`, `expandLevel`, `showSummary`, `levelLabels`, `store` as config), 17 presentation, 16 behavior [classification I, medium]. 14 of the 42 can change at runtime [V]. |
| Chart draft keys | `BaseChartConfig` has 14 keys: 8 infra (`store`, `view`, `sourceResolver`, `persistWith`, `onPointClick`, `gridModel`, `appData`, `xhName`) and 6 descriptive (`spec`, `state`, `seriesDefaults`, `contextMenu`, `showSettings`, `lockedSettings`). The spec has 22 descriptive keys (8 base, 14 time series) (`findings/09` sections 2-3) [V]. |
| Agent runtime edits, F | No general path. A `reconfigure(patch)` needs a fixed key subset, and that subset is a spec without a name. Grid also needs state-keeping column edits and a movable defaults baseline (1.1). |
| Agent runtime edits, N and H | Same. One named type gives one `applySpecPatch`, one validator, one `chart.spec` persist key, and one baseline for `restoreDefaults`. |
| Grid adoption, N | `new GridModel({spec: {...}})` breaks 37 Toolbox and 19 admin call sites, or creates two ways to say one thing. |
| Grid adoption, H | `GridConfig extends GridSpec` is a type-only refactor. Add `getSpec()` / `applySpecPatch()` and a `grid.spec` persist key. No call site changes. |

**Recommendation: H** [I, medium-high]. It matches the constructor shape of Grid and most Hoist
models. It keeps N's real strengths: a named boundary, and one patch, validate and persist path.
Its cost is a runtime key list (`GRID_SPEC_KEYS`, declared once `as const` and used to type
`GridSpec`). The call site also does not show which keys are spec keys.

N stays better if Grid will never adopt the pattern. Then a nested `spec` is simpler for charts
alone, and `{...spec}` needs no key list. The coordinator's point stands under H: the type
discriminator moves to the widget envelope (`{type: 'timeSeriesChart', v, spec, state}`), so the
model class does not need `kind`.

**Is Config construction-only a problem for agents?** Yes for F, and partly for Grid today. Under
H the spec keys must be runtime-editable by contract. Infra keys stay construction-only. For Grid,
28 of the 42 descriptive keys are construction-only today [V count, from 14 runtime-settable]. Some
create child models (`selModel`, `filterModel`, `colChooserModel`). Changing those means a rebuild
of the child, or putting them outside `GridSpec` at first.

**A realistic agent-built grid under H** [I, high]: columns (field, header, format ref, width,
hidden, pinned, preset), `sortBy`, `groupBy`, `treeMode`, `showSummary`, a filter (FieldFilter
JSON), and a source binding. All of these are covered by `PortableGridSpec` plus the format,
preset and source domains. Not covered without registration: component cells, editors, record
actions, event handlers.

### 2.6 Data-driven parts: `seriesFrom` vs pivot columns

Hoist already builds grid columns from data values [V]:

- `QueryConfig.pivot: PivotSpec {dimensions, measures}` (`data/cube/Query.ts:138`, `:148`) is the split.
- `PivotMeasureSpec {field, column?: Partial<ColumnSpec>}` (`cmp/cubegrid/Types.ts:84-104`) is a
  template applied to every column built under every path.
- Pivot columns stay out of the chooser and cannot be hidden (`CubeGridPivotModel.ts:71-72`).
- Persistence waits until pivot columns exist, so saved state can name them
  (`CubeGridModel.ts:65`, `:328-330`).

A chart `seriesFrom: {splitBy, template}` is the same shape. One design can serve both [I, medium]:

```ts
// Shared vocabulary, aligned with PivotSpec / PivotMeasureSpec.
interface PartsFromData<PART> {
    dimensions: string[];                              // split fields
    measures: {field: string; template?: Partial<PART>}[];
}
// Grid: CubeGridPivotConfig today.   Chart: seriesFrom?: PartsFromData<TimeSeriesSpec>
```

Rules both need:

- Generated ids are deterministic from measure and path values, e.g. `FUND|ticker=SPX`.
- State is keyed by generated id. **Chart state cleaning must keep entries for ids not yet seen.**
  Data arrives after the spec, and the user's "SPX hidden" must survive. This differs from
  `cleanColumnState()`, which drops unknown ids. CubeGrid avoids the problem by deferring persist.
- Parts made from data are edited only through the template, not one by one.

Where they differ: grid pivots come from a Cube View's aggregated paths. Chart splits often run
over a flat Store. Use the View's paths when the chart is bound to a View. Add a small Store-side
split for the plain case.

### 2.7 Implications for Chart V2 (`findings/09`)

1. **Adopt H.** Drop `kind` from `BaseChartSpec` and put the type on the widget envelope
   `{type, v, spec, state}`. Define `TimeSeriesChartConfig extends TimeSeriesChartSpec` and put
   the infra keys flat (`store`, `view`, `persistWith`, `onPointClick`, `gridModel`). Keep
   `getSpec`, `applySpecPatch`, `validateSpec`. Make `restoreDefaults` use the current spec as its
   baseline, which fixes the Grid gap for charts from the start. Declare `CHART_SPEC_KEYS` once.
2. **Replace the bespoke `ChartFormatSpec` with a Hoist-wide format ref.**
   `PortableRef<'format'>` = `{name: 'xh.number' | 'xh.percent' | 'xh.millions' | ..., args}`,
   where `args` uses `NumberFormatOptions` names (`precision`, `ledger`, `withPlusSign`, `label`,
   `prefix`). 09 uses `signed` and `units`, which do not match Hoist's options. Tag
   `createRenderer` and `createNumberTextRenderer` with the same refs, so a Grid column `format`
   key reuses the chart's work.
3. **Route every name through `PortableRegistry` domains.** `binding.source` plus
   `sourceResolver` becomes the `source` domain, shared with Grid and Store. `transform` and
   `derive` become domains with Hoist built-ins, open to app additions, not closed unions (the
   `AggregatorToken` lesson). Add a `seriesPreset` domain.
4. Replace `toJSON(): {spec, state}` with `toPortable(): {value, lost}`. Report `backendOptions`
   and any untagged function in `lost`. The control surface's "View JSON" then shows what will not
   save.
5. Adopt `PartsFromData` for `seriesFrom` (2.6). Keep state for unseen generated series ids.
6. Use one codec for dates in `events`, `bands` and `range`: plain ISO strings typed by the schema.
   Do not add a third tag convention.
7. Persist under `chart.spec` (rename `persistSpec` only if Grid gets the same key, `grid.spec`).

### 2.8 Strongest argument against, and what would flip it

**Against** [I, medium]: the generic layer may add little over what exists. Dash already stores
id plus state and works. chat-kit already hand-writes portable types, and it must keep curating
them for models: field order for streaming, descriptions, caps, a small prompt (the lab catalog
is about 28,000 chars, `notes/hoist-chat-kit-genui.md` section 5). `Portable<GridConfig>` keeps 50
keys and costs real compile time, and agent schemas will be curated profiles anyway
(`findings/11` principle 4). So the reusable core shrinks to refs, a registry, one codec, presets
and a validation format. The mapped type and per-model `toPortable` add API surface and a
permanent name-stability duty for every saved blob.

**What survives that argument**: tagged format factories, presets, refs with args, and the
registry. Each removes a duplicate that exists today (chat-kit's column and rule mapping, Toolbox's
column library, the closed aggregator set).

**What would flip it**:

- If no Hoist component other than charts gets agent- or user-assembled instances within the
  next releases, keep the pattern chart-local and skip the Hoist-wide registry.
- If chat-kit cannot use Hoist-provided portable types as its tool schemas (for example because
  OpenUI positional props need a different shape), the shared types lose their main second
  consumer.
- If Grid will never take `GridSpec`, choose N for charts, because it is simpler alone.

---

## Sources checked

- Commands: `npx hoist-ts members ColumnSpec --filter Fn`, `npx hoist-docs search "serialize state
  json persistence"`, the `rg` counts above, and `tsc -p` runs in the scratch folder.
- Prior notes: `notes/hoist-patterns-reference.md`, `notes/hoist-chat-kit-genui.md`,
  `findings/09`, `findings/10`, `findings/11`.
