# 12 - Migration and roadmap

Phases, breaking changes and coexistence with today's `ChartModel`. Durations are **guesses**
for one or two XH developers working with agents, not estimates from data. Use them to compare
phases, not to plan a calendar.

## Principles

- **Nothing breaks.** `ChartModel` / `Chart` stay as the raw Highcharts escape hatch. V2 is
  additive.
- **Time series ships first and ships deep.** No breadth family starts before the time-series
  model is in a real app.
- **One library.** Highcharts (Core + Stock) for everything in scope.
- **Prove each layer in Toolbox and one client app before promoting it.**

## Phase 0 - Decisions and groundwork (about 2 weeks)

| Item | Why |
|---|---|
| Partners decide the open questions in 13 | Scope, naming |
| Upgrade Hoist's Highcharts support from 12.x to 13.x | `kit/highcharts` pins `12.*.*`. 13.x renamed options and is required by the new official React wrapper. Do it once, before V2 code depends on it |
| Agree the data source contract with the first app that builds reports | Source ids, params and field metadata, read by widgets and agent tools (09 section 7, 11) |

Breaking change: Highcharts 13 in a Hoist major. Apps upgrade Highcharts and fix any raw
options that 13 renamed. Changelog and upgrade notes list them.

## Phase 1 - Foundation and time-series core (about 4-6 weeks)

- Portable groundwork (09 section 8, 14): `NamedRef`, `NamedRegistry<T>` in core,
  `toPortable()`, the format registry with tagged format factories, runtime ref validation.
- `TimeSeriesChartModel` core: Config extends Spec with the declared key list, discrete
  observables, `getSpec()`, definition and state methods, persistence (`initPersist` clone) with
  seed semantics for `persistSpec`, restore defaults, strict config with `appData`.
- Internal Highcharts renderer. Theme tokens read from CSS vars (`--xh-chart-*`), with the
  validated palette (13, A6). Text escaping.
- Series transform registry (`cumReturn`, `returns`, `drawdown`, `rollingVol`, `sma`, `ema`) with
  unit tests.
- MVP features: line, area, step, column; panes and axes; `rebase`; navigator and range presets
  on `DateRangeSelection`; crosshair; time markers and bands; `splitBy`; Store binding with field
  defaults; zoom write-back to state.
- Docs: `cmp/chart/README.md` (none exists today), Toolbox example.

Exit test: the spike's charts 1 and 3 built with the real model in Toolbox, persisted to
localStorage, restored after reload.

## Phase 2 - Time-series depth, control surface, widget (about 4-6 weeks)

- Candlestick, OHLC, volume pane with `colorBy: 'direction'`, indicators as series transforms
  (`of` + `transform`).
- Cross-chart `syncGroup` (crosshair and zoom).
- Large-data policy: Config keys `dataGrouping` and `largeDataThreshold` pick Boost or data
  grouping by point count (07 has the measured trade-offs).
- Live updates through Store transactions, Cube `View` binding.
- `ChartSettingsModel` and `chartSettingsPanel`, gated by `authorable` (10), context menu
  tokens.
- `timeSeriesChartWidget()` for DashCanvas and DashContainer, in `desktop/cmp/dash`.

Exit test: a Toolbox dashboard with chart and grid widgets, persisted through ViewManager,
charts edited from the settings panel.

## Phase 3 - Agents and reports (about 3-4 weeks)

- Hand-written agent schema profile, tested as a subset of `PortableTimeSeriesChartSpec`.
- `validateSpec` with store- and registry-aware checks and chat-kit-format errors.
- `show_time_series_chart` in hoist-chat-kit.
- App-level dashboard tools (`add_chart_widget`, `update_chart`, `describe_chart`) and the
  chart context provider (11).
- Integration with a report-building app through its data source registry.

Exit test: an agent builds a two-chart, one-grid report from a prompt, the user edits it, saves
it, shares it, and the agent can describe the edited state.

## Phase 4 - Breadth families (about 2 weeks each)

In order of how often our users need them (04):

1. `CategoryChartModel` - bar, column, stacked, waterfall, pie / donut.
2. `HeatmapChartModel` - correlation and matrix heatmaps, diverging scales.
3. `DistributionChartModel` - histogram with fitted overlay and quantile markers, box plot.
4. `ScatterChartModel` - scatter and bubble, regression line.
5. `FlowChartModel` - sankey, dependency wheel.

Each gets a schema profile and a chat-kit spec as it lands. `TreeMapModel` is aligned to the
shared theme and persistence in the same phase.

## Phase 5 - Migrate and settle

- Port Toolbox chart examples to V2; keep one raw `ChartModel` example for the escape hatch.
- Port hoist-react admin charts (`AggChartModel`, monitors) where it removes code.
- Decide whether today's `Chart` / `ChartModel` should be renamed to mark them as the raw
  escape hatch. Not needed: the new models have their own names.

## Coexistence rules

| Concern | Rule |
|---|---|
| Imports | New models export from `@xh/hoist/cmp/chart` under their own names (`TimeSeriesChart`, `TimeSeriesChartModel`). No `v2` folder and no `ChartV2` name. |
| Theme | Both components read the same theme tokens after Phase 1, so V1 and V2 charts match on one page. |
| Context menu | Same token mechanism; V2 adds tokens. |
| Highcharts version | One version for both. |
| Persistence | V1 has none, so no migration. V2 keys live under `chart` (configurable `path`). |
| Agent catalog | Existing `chatUiChartSpec` stays for simple inline answers until V2 category charts land. |

## Out of scope, with the path if demand appears

| Need | Path |
|---|---|
| 3D surfaces (vol surfaces, term structures) | Rare. Not in Highcharts. If a client needs one, an app-level widget on Plotly or ECharts GL, registered as its own dash view spec. Not a Hoist chart family. |
| Process flows, workflow diagrams | Not a chart. If demand appears, a separate Hoist diagram component on a diagram library (e.g. React Flow). |
| Network graphs | Highcharts `networkgraph` through raw `ChartModel` today. Promote to a family only on repeated demand. |
| User-drawn annotations, stock tools | Highcharts Stock Tools through `highchartsConfig`. Persisting drawings is a later feature. |
