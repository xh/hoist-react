# 01 - Current state: Hoist charts vs. GridModel

Research date 2026-11-15. Repo: `hoist-react` @ `91.0.0-SNAPSHOT` (branch `chart-spike`).
Reference app: `toolbox/client-app/src`. All refs are `file:line` against those trees.
Signatures for everything cited here are in `../notes/hoist-patterns-reference.md`.

## Summary

- `ChartModel` is a thin observable holder for two untyped blobs: `highchartsConfig` (PlainObject)
  and `series` (`any[]`). It owns no series objects, axes, data binding, or persistence. The `Chart`
  component merges defaults + a static theme object + the blobs and hands the result to
  `Highcharts.chart()`.
- Nothing about a chart persists. `ChartModel` has no `persistWith`, no `Persistable`
  implementation and no observable user state. Zoom, legend toggles and series visibility are lost
  on every re-render.
- Apps hand-build Highcharts series arrays from data in model or service code. Toolbox has 12
  `new ChartModel` calls. Each repeats defaults Hoist already sets, hardcodes palette hex colors
  that ignore dark mode, and writes `this`-bound Highcharts formatter functions around
  `@xh/hoist/format` calls.
- GridModel shows the target shape. It has typed `ColumnSpec` configs, immutable `Column` objects,
  a separate serializable state (`ColumnState[]`, `sortBy`, `groupBy`...) persisted per key through
  `PersistenceProvider`, `static defaults` + `colDefaults`, field-derived defaults from `Store`
  fields, and an `agOptions` escape hatch.
- Dashboard integration is already generic. Any model that persists via
  `persistWith: {dashViewModel}` lands its state in `DashViewModel.viewState`, which
  `DashCanvasModel` / `DashContainerModel` roll into their own persisted JSON. A Chart V2 model gets
  widget persistence for free if it implements persistence the GridModel way.

## Today's Chart / ChartModel

### What it is

- `cmp/chart/ChartModel.ts:52` - `class ChartModel extends HoistModel`. 160 lines.
- `cmp/chart/Chart.ts:48` - `[Chart, chart] = hoistCmp.withFactory<ChartProps>`. Renders a `box`
  with an inner `div` as the Highcharts mount point (`Chart.ts:77-86`). Lifecycle lives in a private
  `ChartLocalModel` (`Chart.ts:93`).
- `kit/highcharts/index.ts:10-40` - `let Highcharts = null`, set by the app via
  `installHighcharts(HighchartsImpl)`. Checks version `12.4.0`-`12.*.*` (`:12-13`) and calls
  `setOptions` for `time.timezone` and `lang.numericSymbols` (`:29-38`).
- Highcharts is not a dependency or devDependency of hoist-react (`package.json:141-160`, only
  ag-grid is). This is deliberate for licensing - see issue #3726 below. So no Highcharts TS types
  are available inside the library.
- `cmp/chart` has no README and no `*.spec.ts`. `cmp/README.md:241-259` has a short section only.

### API surface

| Member | Ref | Notes |
|---|---|---|
| `ChartConfig` (ctor arg) | `ChartModel.ts:16-33` | Not exported. Keys: `highchartsConfig: PlainObject` (required), `series?: Some<any>`, `contextMenu?`, `xhImpl?`, `xhName?`. No `persistWith`, no `appData`. |
| `ChartModelDefaults` | `ChartModel.ts:35-37` | Only `contextMenu?: ChartMenuToken[]`. |
| `static defaults` | `ChartModel.ts:54-65` | Default context menu tokens. |
| `@observableRef accessor highchartsConfig: PlainObject` | `ChartModel.ts:67` | Ref-observable. Any change triggers a full chart rebuild. |
| `@observableRef accessor series: any[]` | `ChartModel.ts:69` | Raw Highcharts series options. |
| `contextMenu: ChartContextMenuSpec` | `ChartModel.ts:71` | Parsed once in ctor (`:140-159`). Not observable. |
| `@observableRef accessor highchart: any` | `ChartModel.ts:78` | Live Highcharts instance. Set by `ChartLocalModel` (`Chart.ts:119-121`). |
| `get empty()` | `ChartModel.ts:81-84` | `isEmpty(series)`. |
| `setHighchartsConfig(config: any)` | `ChartModel.ts:113-116` | Replace. |
| `updateHighchartsConfig(update: any)` | `ChartModel.ts:124-127` | `mergeDeep(cloneDeep(cur), update)`. |
| `setSeries(series: any \| any[])` | `ChartModel.ts:130-133` | `castArray`. |
| `clear()` | `ChartModel.ts:136-138` | `setSeries([])`. |
| `ChartProps.aspectRatio` | `Chart.ts:33-41` | Only chart-specific prop. Plus `LayoutProps`, `TestSupportProps`. |
| `ChartMenuToken`, `ChartMenuContext`, `ChartContextMenuSpec` | `Types.ts:14-39` | Context has `chartModel`, `point`, `points` (all `any`). |

### Model owns vs. passes through

| Concern | Owned by Hoist | Passed through raw |
|---|---|---|
| Chart type, axes, legend, tooltip, plotOptions | - | `highchartsConfig` |
| Series definitions + data | - | `series` (`any[]`) |
| Context menu | Yes - Hoist menu built from tokens (`impl/ChartContextMenuItems.ts:52-129`), desktop only (`Chart.ts:89`, `ChartModel.ts:141`) | Token actions call `highchart.exportChartLocal()`, `print()`, `downloadCSV()` etc. |
| Exporting | Defaults: `exporting.enabled: false`, local only, print/export `chartOptions` (`Chart.ts:246-279`) | Overridable via config |
| Print | `beforePrint`/`afterPrint` handlers swap in `exporting.chartOptions` (`Chart.ts:282-311`) | - |
| Copy to clipboard | Patched onto `Chart.prototype` (`impl/copyToClipboard.ts`) | WebKit only |
| Zoom-out gesture | Right-to-left drag patch on `Chart.prototype.init` (`impl/zoomout.ts:12-41`) | - |
| Defaults | `credits: false`, `title: {text: null}`, `accessibility.enabled: false` (`Chart.ts:313-316`); x-axis padding 0, date label formats (`Chart.ts:332-354`) | - |
| Sizing | Fills parent, optional `aspectRatio`, `setSize` on resize (`Chart.ts:176-220`) | - |
| Theme | Static `LightTheme` / `DarkTheme` objects (`theme/*.ts`) | - |

### Theming

- `Chart.ts:356-358`: `XH.darkTheme ? cloneDeep(DarkTheme) : cloneDeep(LightTheme)`.
- Merge order: `mergeDeep(defaultConf, themeConf, propsConf)` (`Chart.ts:237-244`). Axis themes are
  applied per axis array element first (`Chart.ts:320-330`).
- Theme colors are hex literals copied from `vars.scss` with a "see and sync" comment
  (`theme/Light.ts:8-15`, `theme/Dark.ts:8-15`). Not driven by CSS variables.
- Only the font uses a CSS var: `--xh-chart-font-family` (`Chart.scss:20-22`, `styles/vars.scss:414`).
  `--xh-chart-bg` is defined (`vars.scss:413`) but never read.
- `DarkTheme.colors` sets a series palette (`Dark.ts:27-39`). `LightTheme` sets none, so light mode
  uses the Highcharts default palette. No Hoist palette API, no per-series theme tokens.
- `TreeMap` has its own, separate theme logic (`cmp/treemap/TreeMap.ts:282-296`) and a `theme`
  config (`TreeMapModel.ts:72`). Chart has neither.

### Lifecycle and re-render behaviour

- Reaction 1 (`Chart.ts:103-112`): tracks `aspectRatio`, mount ref, `highchartsConfig`,
  `XH.darkTheme`. Runs `renderHighChart()`: destroys and recreates the whole Highcharts instance
  (`Chart.ts:147-174`). Any config tweak, including `updateHighchartsConfig`, is a full rebuild.
- Reaction 2 (`Chart.ts:113-116`): tracks `series`. `updateSeries()` (`Chart.ts:127-145`):
  - series options minus `data` unchanged -> `setData()` per series + one `redraw()`.
  - same series count -> `series[i].update(s)` per series.
  - else -> full `renderHighChart()`.
- Fullscreen is closed before any rebuild (`Chart.ts:150-152`).
- Hidden charts (0 width or height) skip creation and render on visibility (`Chart.ts:166`,
  `:185-189`).
- `onSetExtremes = () => {}` (`Chart.ts:370`) is wired to every x-axis (`:345-347`) but does
  nothing. Zoom range is never captured.
- `installZoomoutGesture` / `installCopyToClipboard` run at module load of `Chart.ts:30-31` and
  no-op if `Highcharts` is still null. **[inferred]** They are skipped if `cmp/chart` is imported
  before the app calls `installHighcharts`.

### Persistence

None. Confirmed: no `persistWith`, `PersistenceProvider`, `Persistable`, `markPersist` or `@persist`
anywhere in `cmp/chart` or `kit/highcharts` (grep). Apps that want chart state persisted (e.g.
admin `AggChartModel`) persist their own wrapper props with `markPersist`
(`admin/tabs/activity/tracking/chart/AggChartModel.ts:78-80`).

## Gaps

1. **No persistence.** No `persistWith`, no `Persistable`. User zoom, series visibility, chart type
   and other choices are not saved, not in prefs, not in a ViewManager view, not in a dash widget.
2. **No observable user state.** Zoom extremes, legend toggles and selected points live only inside
   the Highcharts instance and die on each rebuild (`Chart.ts:370` is a no-op).
3. **No series objects.** `series: any[]` (`ChartModel.ts:69`). No `SeriesSpec`, no ids, no
   `getSeries(id)`, no show/hide API. Compare `Column` + `getColumn(colId)`.
4. **No axis objects.** Axes are raw config. No `AxisSpec`, no typed units, no link from a series to
   an axis by id (Toolbox uses `yAxis: 0/1` index, `HumidityPressureWidget.ts:90,100`).
5. **No data binding.** No `store`, no `Field` lookup, no Cube `View` support. Apps map records to
   `[x, y]` tuples by hand (see "How apps use charts today"). TreeMap already binds to a Store
   (`TreeMapModel.ts:20-48`), so the pattern exists but Chart never adopted it.
6. **No field-derived defaults.** Series names, axis titles and number formats are not taken from
   `FieldSpec.displayName` or type. GridModel does this (`GridModel.ts:2089-2175`).
7. **No typed config.** `ChartConfig` is not exported (`ChartModel.ts:16`). `highchartsConfig` is
   `PlainObject`, setters take `any`. Highcharts types cannot be imported (licensing, #3726), so any
   typed layer must be Hoist-owned.
8. **Theme is a static object merge.** Hex literals duplicated from SCSS, no light-mode palette, no
   CSS-variable bridge, `--xh-chart-bg` unused. App-supplied colors are not theme aware, so apps
   hardcode Highcharts default palette hexes (`#7cb5ec`, `#90ed7d`, `#f45b5b`).
9. **Any config change rebuilds the chart.** `highchartsConfig` is tracked by ref. No targeted
   `chart.update()` path for small changes (axis title, legend toggle).
10. **Context menu is fixed at construction.** Not observable. Toolbox destroys and recreates the
    whole `ChartModel` to change it (`LineChartModel.ts:33-40`, `OHLCChartModel.ts:32-39`).
11. **App-level defaults are thin.** `ChartModel.defaults` holds only `contextMenu`. No
    `seriesDefaults`/`axisDefaults` equivalent of `colDefaults`, no app-wide chart config hook.
    Apps repeat `title: {text: null}` (15 times in Toolbox) though Hoist already sets it
    (`Chart.ts:314`).
12. **Formatting is manual.** No bridge from `@xh/hoist/format` (`fmtNumber`, `fmtDate`,
    `NumberFormatOptions`) to Highcharts labels and tooltips. Apps write `formatter: function ()`
    with `this.value` and must remember `asHtml: true`.
13. **No grid/selection linkage.** No `selModel`, no click-to-select record. Admin hand-builds a
    cube row id string to sync chart clicks to a grid (`AggChartModel.ts:147-150`). TreeMap has this
    via `gridModel` (`TreeMapModel.ts:23`, `:486-491`).
14. **No restore-defaults, no chooser UI.** GridModel has `restoreDefaultsAsync()` and a column
    chooser. Chart has neither a series chooser nor a "chart options" UI.
15. **Copy-to-clipboard skips export normalization** (open issue #4407).
16. **No docs, no tests.** No `cmp/chart/README.md`, no specs. TreeMap and Chart duplicate render
    lifecycle code (`TreeMap.ts:189-260` vs `Chart.ts:147-232`).

## How GridModel differs

| Concern | GridModel | ChartModel |
|---|---|---|
| Config type | Exported `GridConfig` interface, ~60 documented keys (`GridModel.ts:153-445`) | Unexported `ChartConfig`, 5 keys (`ChartModel.ts:16-33`) |
| Unknown keys | Throws "not supported... use appData" (`GridModel.ts:858-864`) | Ignored |
| Child definitions | `ColumnSpec` -> immutable `Column` objects (`columns/Column.ts:87`, `:485`) | Raw `any[]` series |
| Groups | `ColumnGroupSpec` / `ColumnGroup` (`columns/ColumnGroup.ts:37`) | None |
| Lookup API | `getColumn(colId)`, `getLeafColumns()`, `showColumn()`, `hideColumn()` (`GridModel.ts:1527-1630`) | None |
| User state | Separate observable `columnState`, `columnGroupState`, `sortBy`, `groupBy`, `expandLevel` (`GridModel.ts:622-628`) | None |
| Persistence | `persistWith: GridModelPersistOptions` -> one provider per state key (`impl/InitPersist.ts:24-129`) | None |
| Restore defaults | `_defaultState` captured in ctor (`GridModel.ts:759`), `restoreDefaultsAsync()` (`:874-905`) | None |
| App-wide defaults | `static defaults: GridModelDefaults` incl. `colDefaults` (`GridModel.ts:459-483`, `:518`) | `static defaults` with `contextMenu` only |
| Per-instance child defaults | `colDefaults` deep-merged into each spec (`GridModel.ts:1893-1906`) | None |
| Data | `store: Store \| StoreConfig`, auto-created from columns (`GridModel.ts:1977-2003`) | None |
| Field-derived defaults | `displayName`, `description`, `align`, `sortingOrder`, `headerName` from `Field` (`GridModel.ts:2089-2175`) | None |
| Store from columns | Missing fields added from `col.fieldSpec` (`GridModel.ts:2181-2195`) | N/A |
| Formatting | `renderer` / `textRenderer` + `@xh/hoist/format` factories; pre-built specs `number`, `date` (`columns/Core.ts`) | Manual Highcharts formatters |
| Chooser UI | `colChooserModel` (`GridModel.ts:181-186`, `Types.ts:281-338`) | None |
| Context menu | Tokens + `GridModel.defaults.contextMenu` + header menu | Tokens + `ChartModel.defaults.contextMenu` (similar) |
| Escape hatch | `ColumnSpec.agOptions: ColDef` (`Column.ts:459`), `Grid` prop `agOptions` (`Grid.ts:81`), `gridModel.agApi` | Whole config is the escape hatch; `chartModel.highchart` |
| Vendor types | ag-grid is a devDependency, `ColDef` etc. typed | Highcharts absent, all `any` |
| Selection | `selModel: StoreSelectionModel` | None |
| Docs / tests | `cmp/grid/README.md`, 10+ spec files incl. `GridModelPersist.spec.ts` | None |

## Patterns to reuse for Chart V2

| Pattern | Where | Use in Chart V2 |
|---|---|---|
| Spec -> immutable object, state kept separately | `ColumnSpec`/`Column` (`Column.ts:87,485`) vs `ColumnState` (`Types.ts:37-46`) | `SeriesSpec`/`Series` + `SeriesState {id, hidden, ...}`; `AxisSpec`/`Axis`. Persist state only, never definitions. |
| Clean state against current definitions | `cleanColumnState()` drops unknown ids, adds new ones, trims hidden entries (`GridModel.ts:2040-2084`) | Same for series state, so old saved state survives code changes. |
| `hideNewColumns` for curated views | `GridModelPersistOptions.hideNewColumns` (`Types.ts:179-196`), `persistsToCuratedView()` (`InitPersist.ts:140-148`) | Same rule for new series in dash widgets / ViewManager views. |
| One provider per state key under a root path | `initPersist()` paths `grid.columns`, `grid.sortBy`... (`InitPersist.ts:24-129`) | `chart.series`, `chart.zoom`, `chart.type`... with `persistSeries?: boolean \| PersistOptions` flags. |
| `PersistableState` subclass with custom `equals` | `PersistableColumnState` ignores hidden columns (`InitPersist.ts:154-161`) | Ignore transient fields (e.g. zoom when "reset"). |
| Capture default state, then create providers | `_defaultState` (`GridModel.ts:759`), provider note (`PersistenceProvider.ts:99-103`) | Same order in the Chart V2 ctor; enables `restoreDefaultsAsync()`. |
| `static defaults` + instance precedence | `GridModel.defaults` (`GridModel.ts:518`), `DashCanvasModel.defaults` (`DashCanvasModel.ts:140`) | Extend `ChartModel.defaults` with `seriesDefaults`, `axisDefaults`, palette. |
| `colDefaults` merge rules | `withColDefaults()` - renderer in spec blocks default renderer (`GridModel.ts:1893-1906`) | `seriesDefaults` / `axisDefaults`, same blocking rule for formatters. |
| Field-derived defaults | `enhanceColConfigsFromStore()` (`GridModel.ts:2089-2175`) | Series `name` from `Field.displayName`, axis title, number vs date axis from `Field.type`. |
| Inline `FieldSpec` on a child spec | `ColumnSpec.field?: string \| FieldSpec \| CubeFieldSpec` (`Column.ts:93`), `parseField` (`Column.ts:1290-1296`) | `SeriesSpec.field` / `xField`, same union. |
| Store or StoreConfig | `GridConfig.store?: Store \| StoreConfig` (`GridModel.ts:165`) | `ChartConfig.store`; also accept a Cube `View` (via `view.createStore()` or `View.result`). |
| Model -> Store binding precedent | `TreeMapModel` `store` / `gridModel` + `labelField`/`valueField`/`heatField` (`TreeMapModel.ts:20-48`, `:190`) | Closest existing chart-like data binding. Reuse `gridModel` linkage for selection. |
| Vendor escape hatch per child + per component | `ColumnSpec.agOptions` (`Column.ts:459`), `GridProps.agOptions` (`Grid.ts:67-81`) | `SeriesSpec.hcOptions`, `AxisSpec.hcOptions`, `ChartConfig.highchartsConfig` kept as top-level hatch. |
| Strict ctor with `appData` | `GridModel.ts:858-864`, `appData` (`:423`) | Same. |
| Context menu token pattern | `ChartModel.defaults.contextMenu`, `getContextMenuItems` (`impl/ChartContextMenuItems.ts`) | Keep. Add tokens such as `restoreDefaults`, `seriesChooser`, `resetZoom`. |
| Chooser model | `ColChooserConfig` / `IColChooserModel` (`Types.ts:258-338`) | `SeriesChooserModel`, cross-platform interface + desktop impl. |
| `childXhName` | `GridModel.ts:827` | Name child models (store, chooser). |

## How apps use charts today

Toolbox has 12 `new ChartModel` calls. hoist-react admin has 4
(`AggChartModel`, `MemoryMonitorModel`, `ConnPoolMonitorModel`, `RoleGraphModel`).

### Typical shape

Every example follows the same three steps: build a `ChartModel` with a large raw config, react to
some app data, map it to Highcharts series by hand, call `setSeries`.

```ts
// toolbox examples/weather/widgets/HumidityPressureWidget.ts:69-106 (trimmed)
items.forEach(item => {
    const time = item.dt * 1000;
    humidityData.push([time, item.main?.humidity ?? 0]);
    pressureData.push([time, item.main?.pressure ?? 0]);
});
this.chartModel.setSeries([
    {name: 'Humidity', type: 'spline', data: humidityData, yAxis: 0, color: '#7cb5ec',
     lineWidth: 2, marker: {enabled: false}, tooltip: {valueSuffix: '%'}},
    {name: 'Pressure', type: 'spline', data: pressureData, yAxis: 1, color: '#90ed7d', ...}
]);
```

### Evidence by theme

| Finding | Evidence |
|---|---|
| Raw config is 15-60 lines per chart | `LineChartModel.ts:94-123`, `OHLCChart.ts:30-76`, `HumidityPressureWidget.ts:33-67`, `mobile/charts/ChartPageModel.ts:50-96` |
| Defaults repeated that Hoist already sets | `title: {text: null}` x15 in Toolbox; `exporting: {enabled: false}` (`LineChartModel.ts:100`, `ChartWidget.ts:56`); `credits: {enabled: false}` (`HumidityPressureWidget.ts:64`) |
| Same OHLC tooltip HTML formatter copied 3 times | `desktop/tabs/components/charts/OHLCChartModel.ts`, `examples/portfolio/detail/charts/OHLCChart.ts:56-73`, `mobile/charts/ChartPageModel.ts:74-94` (all use `xh-chart-tooltip` from `Chart.scss:24-52`) |
| Formatters wrap Hoist format fns | `formatter: function () { return fmtDate(this.value, {fmt: 'DD-MMM-YY'}) }` (`LineChart.ts:46-48`), similar in 8 files |
| Series shaped in the service layer | `core/svc/PortfolioService.ts:123-178` returns `{name, type: 'ohlc', color, upColor, dataGrouping, data}` |
| Hardcoded colors, not theme aware | `#7cb5ec`, `#90ed7d`, `#f45b5b`, `#2171b5`, `rgba(...)` in 5 weather widgets; `LineChartModel.ts:95` reads `Highcharts.getOptions().colors[0]` |
| Multi-axis by index | `yAxis: [{...}, {...}]` + `series.yAxis: 0/1` (`HumidityPressureWidget.ts:46-58,90,100`) |
| Recreate model to change context menu | `LineChartModel.ts:33-40`, `OHLCChartModel.ts:32-39` |
| Reach into `chartModel.highchart` for actions | `ChartWidget.ts:111-124` (`print()`, `downloadCSV()`), `LineChartModel.ts:46-54` (`axes[0].getExtremes()`) |
| Live ticking replaces the whole data array | `ChartWidget.ts:89-92`, `:144-152` (`setSeries({name, data})` each tick; takes the `setData` path) |
| Cube -> chart mapped by hand, incl. padding and sort | `AggChartModel.ts:163-213` reads `cubeGridModel.store.allRootRecords`, sorts by `cubeLabel`, builds `[label, value]` |
| Chart click -> grid selection by string id hack | `AggChartModel.ts:147-150`: ``const id = `root>>${this.primaryDim}=[${e.point.name}]` `` |
| Chart state persisted outside the chart | `AggChartModel.ts:78-80` `markPersist('metric')`, `markPersist('incWeekends')` |
| No chart widget persists chart state into the dash | `ChartWidget.ts` has `dashViewModel` but no `persistWith`. Contrast `GridWidget.ts:46-50` |
| App-level Highcharts setup | `Bootstrap.ts:151-170`: import `highcharts/highstock` + 8 modules, `installHighcharts(Highcharts)` |

### What hints at missing framework support

- No place to declare "this series is field X of store Y".
- No Hoist palette or semantic colors, so apps copy Highcharts hexes.
- No formatter bridge, so each app rebuilds tooltip and label HTML.
- No chart-level persistence, so wrappers persist their own props.
- No series/axis lookup, so apps index into `highchart.axes[0]` and `yAxis: 1`.

## Dashboard + persistence integration points

### Mechanism

1. Widget model looks up its `DashViewModel` via `@lookup(DashViewModel)`. Available only from
   `onLinked()` (`desktop/cmp/dash/README.md:535-570`).
2. Widget passes `persistWith: {dashViewModel: this.viewModel}` to child models (GridModel etc.) or
   sets `this.persistWith` and calls `markPersist()`. Example: `toolbox GridWidget.ts:46-50`.
3. `PersistOptions.dashViewModel` selects `DashViewProvider` (`core/persist/index.ts:29`).
   `readRaw()` returns `dashViewModel.viewState ?? {}`. `writeRaw(data)` assigns
   `dashViewModel.viewState = data` (`core/persist/provider/DashViewProvider.ts:30-37`). It
   registers itself with the view model (`:24`).
4. `DashViewModel.viewState` is `@bindableRef` (`DashViewModel.ts:65`). `setViewState()` pushes new
   state back into every registered provider via `pushStateToTarget()` (`DashViewModel.ts:121-125`).
   This lets a dashboard reload (e.g. ViewManager switch) update live widgets in place.
5. `DashCanvasModel` computes `viewState` per view as `{viewSpecId, title, state: viewState}`
   (`DashCanvasModel.ts:660-671`). `buildState()` merges in `layout` (`:646-658`). A reaction
   rebuilds `state` on change (`:305-309`).
6. `DashCanvasModel` implements `Persistable<{state: DashCanvasItemState[]}>` (`:556-563`) and
   creates its provider with defaults `path: 'dashCanvas', settleTime: 1000` (`:294-303`).
7. `DashContainerModel` does the same with `path: 'dashContainer'` (`DashContainerModel.ts:234-243`,
   `:416-423`). Views write `state` only when non-empty (`impl/DashContainerUtils.ts:52-53`).
8. The dash model itself persists to a real store: `localStorageKey`, `prefKey` or
   `viewManagerModel` (`toolbox WeatherDashModel.ts:70-71`, `DetailModel.ts:37`).

Chain: `widget model -> DashViewModel.viewState -> DashModel.state -> pref / localStorage / ViewManager`.

### Resulting JSON (DashCanvas, GridModel widget)

```json
{
  "dashCanvas": {
    "state": [
      {
        "layout": {"x": 0, "y": 0, "w": 6, "h": 5},
        "viewSpecId": "grid",
        "title": "Grid",
        "state": {
          "grid": {
            "columns": [{"colId": "company", "hidden": false, "manuallySized": false}],
            "sortBy": ["profit_loss|desc|abs"]
          }
        }
      }
    ]
  }
}
```

Only keys that differ from the in-code default are written. Each provider clears its path when
state equals the default (`PersistenceProvider.ts:206-207`, `:139-155`). A Chart V2 model with
`persistWith: {dashViewModel}` and default `path: 'chart'` would add a sibling `"chart": {...}` key.

### Widget chooser / add view

- `DashViewSpec.groupName` nests groups with `/`, e.g. `Charts/Line` (`DashViewSpec.ts:29-34`).
- `DashCanvasWidgetChooser` lists addable specs grouped by `groupName` and drags them in
  (`canvas/widgetchooser/DashCanvasWidgetChooser.ts:72-100`, model `:27-47`).
- `DashCanvasModel.addView(specId, {title, position, state, width, height})` seeds a new view with
  initial `state` (`DashCanvasModel.ts:346-363`). A generic "chart widget" could take a serialized
  chart spec here.

### ViewManager

`viewManagerModel` in `PersistOptions` selects `ViewManagerProvider`, which reads/writes
`viewManagerModel.getValue()` / `setValue()` (`core/persist/provider/ViewManagerProvider.ts:34-40`,
`cmp/viewmanager/ViewManagerModel.ts:503-520`). Grid uses this to decide `hideNewColumns`
(`InitPersist.ts:140-148`).

## Open issues / changelog history

### Open GitHub issues (xh/hoist-react, `gh issue list --search chart`)

| # | Title | Relevance |
|---|---|---|
| 4407 | Chart copy-to-clipboard bypasses export normalization | Bug in `impl/copyToClipboard.ts` - uses `getSVG()` not `getSVGForExport()` |
| 4552 | Dash: persist stable per-instance view ids | Affects how widget state is matched on reload |
| 4919 | Grid UX roadmap | Parallel GridModel work, check for shared chooser/persist changes |

### Closed issues that shape the design

| # | Title | Takeaway |
|---|---|---|
| 3726 | Use `Highcharts.Options` type for `highchartsConfig` | Rejected: Hoist must not import Highcharts (licensing). Typed API must be Hoist-owned. |
| 3813, 2753, 2389 | Customizable chart context menu | Done in v74 (`contextMenu`). |
| 3388 | Custom buttons in chart panel | Clarification requested, closed. |
| 3113 | `xAxis.ordinal` data update needs full re-render | Closed stale 2026-06. |
| 1314 | Chart should reuse existing visualization | Origin of the `setData` / `update` fast path. |
| 1560 | Charts should react to theme changes | Origin of tracking `XH.darkTheme`. |
| 1326 | Expose the underlying Highcharts component | Origin of `ChartModel.highchart`. |
| 2803 | Re-render in fullscreen shrinks chart | Origin of fullscreen close on rebuild. |
| 3075 | Desktop ContextMenu imported into cross-platform Chart | Platform split concern. |
| 348 | Investigate Highcharts React wrapper | Not adopted. |

### CHANGELOG history (current + `docs/archive/CHANGELOG-archive.md`)

| Version | Change |
|---|---|
| v4-5 | Chart flex auto-sizing (archive). |
| v18 | Right-to-left zoom-out gesture. |
| v20 | `aspectRatio` prop, proper resize. |
| v26 | ChartModel `config` renamed `highchartsConfig`. |
| v29 | Moved to `cmp/chart` (cross-platform). Fixed needless re-renders. |
| v30 | `ChartModel.highchart` added. Fixed sizing when rendered hidden. |
| v37 | Light/dark themes reworked to match Hoist. |
| v39 | `updateHighchartsConfig()` added. |
| v41 | Requires Highcharts >= 9.1. |
| v42 | Default context menu; print/export hide navigator etc. |
| v45 | Exit fullscreen before re-render. |
| v74 | `contextMenu` replaces `showContextMenu` (`CHANGELOG.md:2791-2801`). |
| 77.x | Highcharts v12 (`CHANGELOG.md:2511`). |
| 78.1.3 | Timezone fix, use `time.timezone` (`CHANGELOG.md:2450`). |
| v79 | Font defaults to `--xh-font-family` (`CHANGELOG.md:2416`). |
| v83 | `static defaults` pattern replaces ad-hoc statics on `ChartModel` (`CHANGELOG.md:2052`). |
| v86 | Zoom-out gesture supports `chart.zooming.type` (`CHANGELOG.md:1739`). |

The record shows incremental wrapper fixes. No change has ever added a data or state model to
`ChartModel`.
