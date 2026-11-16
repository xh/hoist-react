# 10 - Control surface and dashboard widget

One model, two drivers. A user changes a chart through UI controls. An agent changes it through
tool calls. Both call the same `TimeSeriesChartModel` methods (09 section 5), both are validated
the same way, and both persist the same JSON.

Proof: `../spikes/control.html` (open from the file system). It edits a live chart with form
controls and with JSON tool calls, shows the resulting JSON and an action log tagged `user` /
`agent`, and can switch renderer between Highcharts, AG Charts and ECharts. The spike predates
the method list below; the principle it proves is unchanged.

## 1. The method list is the contract

The control surface never builds Highcharts options and never edits a spec in place. Each method
writes one layer (09 section 4).

| Control | Model method | Layer | Agent tool (11) | Persisted as |
|---|---|---|---|---|
| Legend click, series checkbox | `showSeries` / `hideSeries` | state | `update_series_state` | `chart.series` |
| Series type, color | `updateSeriesState`, or `updateSeries` when `authorable` | state, or definition | `update_series_state` / `update_series` | `chart.series` or `chart.spec` |
| Rebase toggle | `rebase = ...` | state | `update_chart_state` | `chart.rebase` |
| Range buttons, zoom, navigator drag | `setRange`, `resetZoom` | state | `update_chart_state` | `chart.range` |
| Navigator, legend toggles, pane sizes | setters | state | `update_chart_state` | `chart.layout` |
| Restore defaults | `restoreDefaultsAsync` | clears state | `reset_chart` | clears state keys |
| Add series | `addSeries` | definition | `add_series` | `chart.spec` |
| Edit series field, transform, pane, axis | `updateSeries` | definition | `update_series` | `chart.spec` |
| Remove series | `removeSeries` | definition | `remove_series` | `chart.spec` |
| Reorder series (drag) | `setSeries` | definition | `update_chart` | `chart.spec` |
| Add / remove pane | `addPane` / `removePane` | definition | `update_chart` | `chart.spec` |
| Other top-level definition keys | `updateSpec` (merge patch) | definition | `update_chart` | `chart.spec` |

Definition rows appear in the UI, and definition tools work for agents, only when
`model.authorable` is true. That defaults to `persistSpec`, so edits are never made that cannot
be saved. A code-defined chart shows only the state rows and persists only state, so a release
that changes the chart reaches every user.

Validation runs on every change from either driver. A rejected change leaves the chart as it was
and returns path-prefixed errors (spike: `validate()` in `shared/control.js`):

```
Invalid change - nothing was applied. Fix and retry:
- series[4].field: 'NASDAQ' is not a numeric field of source 'navs'. Available: FUND, SPX, MSCIW, B6040
```

## 2. The settings UI

`ChartSettingsModel` (cross-platform, created from the `settingsModel` config like
`colChooserModel`) and `chartSettingsPanel` (desktop). Opened from:

- a settings button in the chart's panel header or dash widget header (`headerItems`)
- the context menu token `'chartSettings'`
- `chartModel.settingsModel.open()`

Layout for an authorable chart. Otherwise the add, remove, drag, pane and transform controls
are absent, and type and color edits write state.

```
+-----------------------------------------------+
| Chart                                         |
|  Rebase  [percent v]   Range [3 years v]      |
|  [x] Close gaps  [x] Navigator  [x] Legend    |
+-----------------------------------------------+
| Series                                        |
|  [x] Flagship Fund   line v   main v   none v |
|  [x] S&P 500 TR      line v   main v   none v |
|  [ ] 60/40 Blend     line v   main v   none v |
|  [Add series... v]                 [Add pane] |
+-----------------------------------------------+
| Panes and axes                                |
|  main  size 70%   axis: right, percent        |
|  risk  size 30%   axis: right, percent  [x]   |
+-----------------------------------------------+
| [Restore defaults]           [View JSON]      |
+-----------------------------------------------+
```

- "Add series" lists the store's numeric fields by `displayName`, so users pick from what the
  data has and never type field names.
- "View JSON" shows `getSpec({includeState: true})`, read-only, with copy.
- Range uses the `cmp/daterange` presets, so the chart and a date range picker offer the same
  choices.
- Hoist inputs throughout (`select`, `checkbox`, `switchInput`), no raw HTML.
- Mobile: a full-screen sheet with the same sections and no drag reorder.

### Quick controls on the chart

The most used changes need no panel: legend click, range buttons and navigator, a compact rebase
toggle in the header, and the context menu (`resetZoom`, `chartSettings`, `restoreDefaults`, plus
today's export tokens). All write state.

## 3. The dashboard widget

Hoist provides the view spec, in `desktop/cmp/dash`, so apps do not each write a chart widget:

```ts
export interface TimeSeriesChartWidgetConfig extends Partial<DashCanvasViewSpec> {
    id: string;
    title: string;
    /** Seed for a new widget. Users then author it, and it persists in dash state. */
    defaultSpec: TimeSeriesChartSpec;
    /** Data source for a new widget. Users or agents may rebind it. */
    defaultSource?: {id: string; params?: PlainObject};
    settings?: ChartSettingsConfig;
}

export function timeSeriesChartWidget(config: TimeSeriesChartWidgetConfig): DashCanvasViewSpec;
```

What it does:

1. Content is a small widget model that finds its `DashViewModel` in `onLinked()`.
2. It resolves `state.source` through the app's data source registry to a Store.
3. It builds `new TimeSeriesChartModel({...defaultSpec, store, persistWith: {dashViewModel,
   persistSpec: true}})`. With `persistSpec`, `defaultSpec` is only the seed; a saved spec wins,
   and the chart is authorable. An unedited widget follows seed changes in new releases.
4. It adds a settings button to `headerItems` and chart tokens to `extraMenuItems`.

Persisted state rides the existing Dash mechanism, with no Dash changes:

```json
{"dashCanvas": {"state": [
  {"layout": {"x": 0, "y": 0, "w": 8, "h": 6}, "viewSpecId": "timeSeriesChart", "title": "NAV vs. benchmarks",
   "state": {
     "v": 1,
     "source": {"id": "navs", "params": {"portfolioId": 12}},
     "chart": {
       "spec": {"timeField": "date", "rebase": "percent",
                "series": [{"id": "fund", "field": "FUND"}, {"id": "spx", "field": "SPX"}]},
       "series": [{"id": "spx", "hidden": true}],
       "range": {"kind": "relative", "count": 3, "unit": "years"}}}},
  {"layout": {"x": 8, "y": 0, "w": 4, "h": 6}, "viewSpecId": "grid", "state": {"grid": {"sortBy": ["pnl|desc"]}}}
]}}
```

- Works the same in `DashContainerModel`.
- `DashCanvasModel.addView('timeSeriesChart', {state: {...}})` seeds a widget from JSON. An
  agent's `add_chart_widget` tool makes this call (11).
- ViewManager saves the whole dashboard, charts included, as one view. Sharing a report is
  sharing a view.
- Embedding a report in another app needs the dashboard JSON plus the same registered source and
  format names in the host app. That is the contract to agree on (13).

### Crosshair sync across widgets

`crosshair.syncGroup` in the spec. Charts in the same group on one page share crosshair x and,
with `syncZoom`, the visible range. Implemented once in the renderer. Highcharts needs custom code
for this (about 40 lines in the official demo, 03).

### Not in v1

Linking chart points to grid selection (`gridModel`), cross-widget selection groups, editable
"View JSON" and undo. Each can come later without changing the shape.

## 4. What the spike proved and did not

Proved:

- One JSON definition can drive the chart through form controls and tool calls with one action
  API and one validator.
- The resulting JSON is small and readable.
- The same definition renders on all three libraries.

Not proved (implementation work):

- In-place updates. The spike re-creates the chart on each change. With one observable per spec
  key, the real renderer can react per key and call `series.update()` / `setVisible()`.
- Zoom write-back. The real model listens to `afterSetExtremes` and stores a custom
  `DateRangeSelection` for daily data or a `TimeWindow` for finer zooms.
- Authorable gating, seed semantics, and state kept for split series not yet seen.
