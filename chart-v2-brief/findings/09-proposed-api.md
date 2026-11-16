# 09 - Proposed API

TypeScript API for Chart V2, to Hoist conventions. This is the design an implementation push
starts from, not final code. It assumes 08: one Highcharts backend behind an internal seam, and
a deep time-series model first. Section 8 covers the portable pattern that makes the same model
work from code and from JSON. `14-portable-pattern.md` covers how that pattern extends to Grid
and the rest of Hoist.

Conventions: exported `*Config` and `*Spec` interfaces, `declare config`, `@bindable accessor`
state, `static defaults`, `@managed` children, `null` over undefined, named exports, element
factories, no Highcharts types in the library (issue #3726), strict constructors with `appData`.

Confidence: **high** on the shape (it copies GridModel). **Medium** on exact key names. The design
was reviewed in two rounds by an independent API reviewer. Every point in section 9 is settled
unless the partners overrule it.

---

## 1. The shape in one page

```
TimeSeriesChartConfig  extends  TimeSeriesChartSpec        (flat, like GridConfig)
  infra keys: store | view, persistWith,                     spec keys: timeField, series, panes,
  settingsModel, onPointClick, dataGrouping...               axes, rebase, range, crosshair...
            \                                                 /
             v                                               v
      TimeSeriesChartModel extends HoistModel
        definition: one observable per spec key        (like gridModel.columns / sortBy)
        state:      seriesState, range, rebase...      (like gridModel.columnState)
        getSpec()  - the definition as authored, computed over TIME_SERIES_CHART_SPEC_KEYS
        definition methods  - addSeries, updateSeries, setSpec, updateSpec ...
        state methods       - showSeries, updateSeriesState, setRange ...
            |
            v
      internal renderer -> Highcharts Stock. Spec + state + data + theme -> options.
```

Three ideas carry the design:

1. **Config extends Spec.** Developers pass one flat config, as they do to `GridModel`. The spec
   keys are a named subset: a declared key list and a type. That subset is the chart's
   definition. It is what an agent edits, what a dashboard widget saves, and what `getSpec()`
   returns. The infra keys (`store`, `persistWith`, handlers) never leave the code.
2. **Definition and state, routed by method.** As in Grid, user tweaks live in a state overlay
   keyed by id, so they survive a change to the definition. Each model method writes exactly one
   layer. Section 4 has the rules.
3. **Code and JSON share one vocabulary.** Every slot that takes a function also takes a named
   reference (`'percent'`, `{id: 'percent', args: {precision: 1}}`). Code may use either. JSON
   uses only refs. The spec is then **portable**: JSON-safe, and it rebuilds the same chart
   wherever the same names are registered (section 8).

What changes from today: nothing. `Chart` and `ChartModel` stay as the raw Highcharts escape
hatch. `TimeSeriesChart` / `TimeSeriesChartModel` are new exports from `@xh/hoist/cmp/chart`.

---

## 2. Shared types

```ts
/**
 * A named reference to a registered function, with optional JSON args.
 * Bare names are Hoist built-ins ('percent'). App names must contain a dot ('acme.bps').
 * The object form uses `id`, not `name`: every function has a `name` property, so a `{name}`
 * shape would accept any function at the type level.
 */
export type NamedRef<ID extends string = string, ARGS = PlainObject> = ID | {id: ID; args?: ARGS};

/** Number format: a ref into the format registry. Args are the JSON-safe subset of NumberFormatOptions (no tooltip fn, no zeroDisplay element). */
export type FormatRef = NamedRef<FormatId, Omit<NumberFormatOptions, 'tooltip' | 'zeroDisplay'>>;
export type FormatId = 'number' | 'percent' | 'thousands' | 'millions' | 'billions' | 'price' | (string & {});
/** Token-or-function, as Hoist does for menu tokens and aggregators. */
export type ChartFormatLike = FormatRef | ((v: number, ctx: ChartFormatContext) => string);

/** Semantic colors resolve from the chart theme, so saved specs stay theme-aware. */
export type ChartColor =
    | 'auto'
    | 'positive'
    | 'negative'
    | 'neutral'
    | 'accent'
    | `series${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`
    | (string & {}); // literal CSS color - allowed, discouraged in saved specs

export interface ChartLegendSpec {
    enabled?: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface ChartTooltipSpec {
    enabled?: boolean;
    /** 'shared' shows all series at the hovered x. 'single' shows the hovered point. */
    mode?: 'shared' | 'single';
    /** Custom content. A registered renderer by ref, or a function in code. */
    renderer?: NamedRef | ((ctx: ChartTooltipContext) => string);
}
```

`FormatRef` replaces the earlier bespoke `ChartFormatSpec`. It reuses Hoist's own formatter names
and `NumberFormatOptions` (`precision`, `ledger`, `withPlusSign`, `label`, `prefix` ...), so a
grid column can later take the same `format` key (see 14).

---

## 3. The time-series spec

```ts
/** Keys of TimeSeriesChartSpec, declared once. Drives getSpec(), validation and persistence. */
export const TIME_SERIES_CHART_SPEC_KEYS = [
    'title', 'subtitle', 'legend', 'tooltip', 'timeField', 'collapseGaps', 'panes', 'axes',
    'series', 'rebase', 'rebaseFrom', 'range', 'rangePresets', 'showNavigator', 'crosshair',
    'timeMarkers', 'timeBands', 'valueLines', 'highchartsConfig'
] as const satisfies readonly (keyof TimeSeriesChartSpec)[];
// Plus a type-level exhaustiveness check that every key of the interface is in the list.

export interface TimeSeriesChartSpec {
    title?: string;
    subtitle?: string;
    legend?: ChartLegendSpec;
    tooltip?: ChartTooltipSpec;

    /** Field holding the timestamp (ms, Date, LocalDate). */
    timeField: string;

    /**
     * True (default) to close the gaps where no data exists - weekends, holidays, overnight - so
     * points sit evenly. False for a true time scale, where gaps show as gaps (24/7 data).
     */
    collapseGaps?: boolean;

    /** Stacked panes sharing one time axis. Default: one pane 'main'. */
    panes?: PaneSpec[];

    /** Value axes. Default: one per pane, on the right. */
    axes?: ValueAxisSpec[];

    /** Series in draw and legend order. */
    series: TimeSeriesSpec[];

    /**
     * Rebase every series that allows it: 'percent' shows % change, 'value' shows absolute
     * change, null plots raw values. Default null.
     */
    rebase?: 'percent' | 'value';
    /** 'visibleStart' (default) rebases on every zoom and range change. An ISO date fixes it. */
    rebaseFrom?: 'visibleStart' | (string & {});

    /** The visible window. A preset token, a DateRangeSelection, or an exact TimeWindow. Default: all data. */
    range?: string | DateRangeSelection | TimeWindow;
    /** Range buttons. Preset tokens or selections, e.g. ['ytd', {kind: 'relative', count: 3, unit: 'years'}]. */
    rangePresets?: (string | DateRangeSelection)[];
    showNavigator?: boolean;

    crosshair?: CrosshairSpec;

    /** Point-in-time markers on the time axis or on a series. */
    timeMarkers?: TimeMarkerSpec[];
    /** Shaded time ranges, e.g. recessions, drawdown periods. */
    timeBands?: TimeBandSpec[];
    /** Horizontal reference lines, e.g. a limit or a target. */
    valueLines?: ValueLineSpec[];

    /** Escape hatch, deep-merged last into the Highcharts options. JSON, so portable. */
    highchartsConfig?: PlainObject;
}

/** An exact window, for zooms finer than a day. ISO date-times. */
export interface TimeWindow {
    kind: 'window';
    start: string;
    end: string;
}

export interface PaneSpec {
    id: string;
    /** Relative height. Panes are normalized to fill the chart. */
    size?: number;
    title?: string;
}

export interface ValueAxisSpec {
    id: string;
    /** Default: the first pane. */
    pane?: string;
    side?: 'left' | 'right';
    title?: string;
    format?: ChartFormatLike;
    min?: number;
    max?: number;
    type?: 'linear' | 'logarithmic';
}

export type TimeSeriesType = 'line' | 'step' | 'area' | 'column' | 'candlestick' | 'ohlc' | 'range' | 'scatter';

/** One time series - or, with splitBy, a template for one series per value. */
export interface TimeSeriesSpec {
    id: string;
    /** Default: Field.displayName of `field`, or the split value. */
    name?: string;
    type?: TimeSeriesType;

    /** Value field, read from the chart's store. */
    field?: string;
    /** For candlestick, ohlc and range. Keys default to the same-named fields. */
    fields?: {open?: string; high?: string; low?: string; close?: string};
    /** Read another series' values instead of a field, e.g. a moving average of 'px'. */
    of?: string;

    /** Applied after reading: 'cumReturn', 'drawdown', {id: 'sma', args: {period: 50}} ... */
    transform?: SeriesTransformLike;

    /**
     * Make one series per distinct value of this field (e.g. 'symbol'). This spec becomes the
     * template. The chart partitions rows only - it never aggregates; aggregation belongs in Cube.
     */
    splitBy?: string;
    /** Cap on generated series. Default 20. Extra values fold into a warning, not into 'Other'. */
    splitLimit?: number;

    pane?: string;
    axis?: string;
    color?: ChartColor;
    /** 'direction' colors by close vs. open (volume bars), 'sign' by value >= 0. */
    colorBy?: 'direction' | 'sign';
    lineWidth?: number;
    dashStyle?: 'solid' | 'dash' | 'dot';
    /** Opt out of `rebase`, e.g. volume or a spread. */
    excludeFromRebase?: boolean;
    format?: ChartFormatLike;
    hidden?: boolean;
    highchartsConfig?: PlainObject;
}

/** Transforms and indicators are one registry domain: Hoist built-ins, open to app additions. */
export type SeriesTransformLike = NamedRef | ((values: TimeSeriesValues) => TimeSeriesValues);

export interface CrosshairSpec {
    enabled?: boolean;
    /** Charts with the same group share crosshair x and tooltip. */
    syncGroup?: string;
    /** Also share zoom. */
    syncZoom?: boolean;
}

export interface TimeMarkerSpec {
    date: string;
    label: string;
    /** A series id (flag on the line) or 'axis' (vertical line). Default 'axis'. */
    on?: string;
    color?: ChartColor;
}

export interface TimeBandSpec {
    from: string;
    to: string;
    label?: string;
    color?: ChartColor;
}

export interface ValueLineSpec {
    axis: string;
    value: number;
    label?: string;
    color?: ChartColor;
    dashStyle?: 'solid' | 'dash' | 'dot';
}
```

Notes on the choices:

- **Panes, axes and series are flat lists linked by id.** Moving a series to a pane is one field
  change. A derived series names its source by id (`of`). One spec draws one Highcharts chart
  with a shared time axis, however many panes it has. Several charts are several models, linked
  by `crosshair.syncGroup`.
- **`splitBy` on the series.** Fixed and split series mix in one list:
  `[{id: 'fund', field: 'nav'}, {id: 'peers', field: 'nav', splitBy: 'symbol', dashStyle: 'dot'}]`.
  Generated ids are deterministic (`peers|SPX`). Colors: each value takes the next free palette
  slot on first appearance and keeps it, recorded in series state, so a value keeps its color
  across reloads and filters. Fixed series with `color: 'auto'` draw from the same pool.
  (Hashing values into 8 slots would collide: about 34% for 3 series, 59% for 4.) Order follows
  first appearance in the data unless the store is sorted. Generated series are edited only
  through their template. A series whose `of` names a split series is split the same way, one
  derived series per value. `splitBy` is the one word for "partition rows into series" across all
  chart families.
- **Range reuses `cmp/daterange`.** `DateRangeSelection` is already plain JSON, persists through
  saved views, and re-resolves as time moves ("3 years" still means the last three years next
  month). It is day-granular, so a dragged zoom on daily data becomes a `{kind: 'custom', start,
  end}` selection, and a zoom finer than a day becomes a `TimeWindow`. Presets resolve against the
  last date in the data as `anchorDate`, so 'ytd' on stale data means the data's year, not
  today's. Hoist may add a few tokens for chart buttons (`prev3Years`, `prev5Years`); relative
  selections cover them now.
- **Gone from the earlier draft:** `kind` (the type lives on the widget, section 7), `binding` /
  `sourceResolver` (data source moves to the widget), `calendar` (renamed `collapseGaps`, which is
  what Highcharts actually does), `compare` (now `rebase` / `rebaseFrom`), `derive` (folded into
  `of` + `transform`), per-chart `timeZone` (Hoist sets the zone once at Highcharts install),
  `events` (renamed, as it read like handlers).

---

## 4. Definition and state

The rules, which hold for every chart family and match Grid:

1. **Two layers.** The definition says what the chart is. The state overlay records a user's
   adjustments to it. "Restore defaults" clears the overlay back to the current definition.
2. **Route by method, not by actor.** Each model method writes one layer, whoever calls it - code,
   settings UI or agent. On-chart controls (legend click, range buttons, zoom, pane drag) always
   write state.
3. **State keys are same-name subsets of spec keys**, as `ColumnState` mirrors `ColumnSpec`.
4. **State never refers to another element by id.** Pane and axis moves are definition edits. So
   cleaning state never leaves a dangling reference.
5. **A definition write clears overlapping state only where the definition value changed**, for
   that key and id. Reordering series, or a `setSpec` that repeats a series' `type`, keeps the
   user's `hidden`, `type` and `color`. No stale shadow, and no lost tweaks.

```ts
/** Per-series overlay. Same names as TimeSeriesSpec. */
export interface TimeSeriesState {
    id: string;
    hidden?: boolean;
    type?: TimeSeriesType;
    color?: ChartColor;
}

/** The whole overlay. Persisted one key at a time (section 6). */
export interface TimeSeriesChartState {
    series?: TimeSeriesState[];
    rebase?: 'percent' | 'value';
    range?: string | DateRangeSelection | TimeWindow;
    showNavigator?: boolean;
    legend?: ChartLegendSpec;
    panes?: {id: string; size?: number}[];
    axes?: {id: string; type?: 'linear' | 'logarithmic'}[];
}
```

Series state is kept for generated ids not yet in the data. Split series arrive after the spec,
and "SPX hidden" must survive a reload. (Grid's `cleanColumnState()` drops unknown ids. Charts must
not, for generated ids.) To stop that list growing forever, prune unseen generated ids beyond
twice `splitLimit`, oldest first. `getSpec({includeState: true})` bakes state into fixed series
only; state for generated ids stays in the series state list.

---

## 5. Config and model

```ts
export interface TimeSeriesChartConfig extends TimeSeriesChartSpec {
    /** Data: a Store (or StoreConfig) or a Cube View. The model never resolves a named source. */
    store?: Store | StoreConfig;
    view?: View;

    /** Defaults merged into every series spec, like GridModel colDefaults. */
    seriesDefaults?: Partial<TimeSeriesSpec>;

    persistWith?: TimeSeriesChartPersistOptions;

    /** Settings panel. True for defaults, or a config. Default true on desktop. */
    settingsModel?: ChartSettingsConfig | boolean;

    /**
     * True if users and agents may edit the definition (add, remove, reorder and move series,
     * panes, axes, transforms). Default: true when `persistWith.persistSpec` is on, else false.
     * The settings panel and agent definition tools both read `model.authorable`.
     */
    authorable?: boolean;

    /** Desktop context menu. Today's tokens plus 'resetZoom', 'restoreDefaults', 'chartSettings'. */
    contextMenu?: ChartContextMenuSpec;

    onPointClick?: (e: ChartPointEvent) => void;

    /** Large-data tuning. Not part of the definition, as Grid keeps its perf factors on Config. */
    dataGrouping?: boolean; // default true
    largeDataThreshold?: number;

    appData?: PlainObject;
    xhName?: string;
}

export interface ChartSettingsConfig {
    /** Settings to hide from the panel. */
    locked?: ChartSettingKey[];
}

export interface TimeSeriesChartPersistOptions extends PersistOptions {
    /** Default 'chart'. */
    path?: string;
    persistSeries?: boolean | PersistOptions; // default true
    persistRange?: boolean | PersistOptions; // default true
    persistRebase?: boolean | PersistOptions; // default true
    persistLayout?: boolean | PersistOptions; // panes, axes, navigator, legend. Default true
    /**
     * Persist the definition. Default false. When on, the config's spec keys are a seed: they
     * apply only when nothing is saved. After that the saved definition wins whole - no merge,
     * no hash. Grid takes the same side for user-composed views (hideNewColumns).
     *
     * Requires a portable seed: the constructor throws if `toPortable(getSpec()).lost` is not
     * empty, since an unregistered function would vanish after the first saved edit.
     *
     * A widget whose definition still equals its seed saves no `chart.spec` (the provider clears
     * a key equal to its default). So an unedited widget follows seed changes in new releases,
     * and an edited one keeps its own. This is intended.
     */
    persistSpec?: boolean | PersistOptions;
    /** Hide series added to the definition after state was saved. As Grid's hideNewColumns. */
    hideNewSeries?: boolean;
}

export class TimeSeriesChartModel extends HoistModel {
    static defaults: TimeSeriesChartModelDefaults;

    declare config: TimeSeriesChartConfig;

    @managed store: Store;
    @managed settingsModel: ChartSettingsModel;

    // -- Definition: one observable per spec key, as GridModel holds columns and sortBy.
    @observableRef accessor series: TimeSeriesSpec[];
    @observableRef accessor panes: PaneSpec[];
    @observableRef accessor axes: ValueAxisSpec[];
    @bindable accessor title: string;
    // ... one per TIME_SERIES_CHART_SPEC_KEYS entry

    // -- State overlay
    @observableRef accessor seriesState: TimeSeriesState[];
    // Keys in both layers (rebase, range, showNavigator, legend) hold the live value, as
    // gridModel.sortBy does. The definition keeps its value as the default that
    // restoreDefaults returns to - the role of GridModel._defaultState, but updated by
    // definition writes instead of fixed at construction.
    @bindable accessor rebase: 'percent' | 'value';
    @observableRef accessor range: string | DateRangeSelection | TimeWindow;
    @bindable accessor showNavigator: boolean;

    /** Resolved series - definition + state + split values + defaults. Immutable, like Column. */
    @computed get resolvedSeries(): TimeSeries[];
    @computed get visibleSeries(): TimeSeries[];
    /** The window on screen, kept in sync with zoom. */
    @computed get visibleRange(): {min: number; max: number};

    /** True if the definition may be edited. See `authorable` config. */
    readonly authorable: boolean;

    // -- Definition methods. Each clears state only where a definition value changed.
    @action addSeries(spec: TimeSeriesSpec, index?: number): void;
    @action updateSeries(id: string, changes: Partial<TimeSeriesSpec>): void;
    @action removeSeries(id: string): void;
    @action setSeries(specs: TimeSeriesSpec[]): void; // replace, e.g. reorder; keeps state by id
    @action addPane(spec: PaneSpec, index?: number): void;
    @action removePane(id: string): void;
    /** Replace the whole definition. */
    @action setSpec(spec: TimeSeriesChartSpec): void;
    /** Merge into the definition. JSON Merge Patch (RFC 7396): arrays replace whole, null deletes. */
    @action updateSpec(patch: PlainObject): void;
    /** The definition as authored - no defaults filled in. Optionally with state baked in. */
    getSpec(opts?: {includeState?: boolean}): TimeSeriesChartSpec;
    /** Path-prefixed problems, checked against store fields and registries. Empty if valid. */
    validateSpec(spec: TimeSeriesChartSpec): string[];

    // -- State methods
    @action showSeries(id: string): void;
    @action hideSeries(id: string): void;
    @action setSeriesState(state: TimeSeriesState[]): void;
    @action updateSeriesState(changes: TimeSeriesState[]): void; // merge by id
    @action setRange(range: string | DateRangeSelection | TimeWindow): void;
    @action resetZoom(): void;
    @action restoreDefaultsAsync(): Promise<boolean>;

    // -- Live data: append or update without a rebuild.
    updateData(rawData: PlainObject[] | StoreTransaction): void;

    /** The Highcharts chart, read-only, as ChartModel.highchart today. */
    get highchart(): any;
}

export const [TimeSeriesChart, timeSeriesChart] = hoistCmp.withFactory<TimeSeriesChartProps>({...});
```

Two details that matter:

- **Initial state is the spec keys themselves.** A config of `{rebase: 'percent', range: 'ytd'}`
  sets the definition, and the user's later changes go to state. There is no separate `state`
  config key.
- **The settings panel picks the layer, the model never guesses.** When `model.authorable` is
  true, the panel writes definition methods for series, panes and axes. When it is false, the
  panel writes state only and hides the structural controls. On-chart controls always write
  state. This keeps "restore defaults" predictable: it reverts exactly what a user tweaked, and
  leaves an author's work alone. Agent definition tools check `authorable` too.

---

## 6. Persistence

Copies `initPersist()` from `cmp/grid/impl/InitPersist.ts`: one provider per key under `path`,
diffs only.

| Key | Holds | Default |
|---|---|---|
| `chart.series` | `TimeSeriesState[]`, including split-series color slots | on |
| `chart.range` | preset token, `DateRangeSelection` or `TimeWindow` | on |
| `chart.rebase` | rebase mode | on |
| `chart.layout` | `{panes, axes, showNavigator, legend}` sizes and toggles | on |
| `chart.spec` | the definition (`getSpec()`) | off - on for authored charts |

A code-defined chart persists state only, like Grid. Its definition comes from code on every
load, so a release that changes the chart reaches every user. Turn on `persistSpec` only for
charts users author, and accept the seed rule (section 5).

---

## 7. Widgets, sources and the type id

The chart model knows nothing of named data sources or widget types. The widget layer does:

- **Type** is the widget's id: Dash's `viewSpecId` or a chat-kit catalog name. No `kind` key.
- **Source** is a named data source the widget resolves to a Store before it builds the model:
  `{source: 'portfolioNav', params: {portfolioId: 12}}`. Keeping it out of the definition lets one
  chart definition rebind to dashboard context, such as the selected portfolio.

A Dash chart widget's saved JSON, using the existing Dash persistence:

```json
{"layout": {"x": 0, "y": 0, "w": 6, "h": 6}, "viewSpecId": "timeSeriesChart", "title": "NAV vs. benchmarks",
 "state": {
   "v": 1,
   "source": {"id": "navs", "params": {"portfolioId": 12}},
   "chart": {
     "spec": {"timeField": "date", "rebase": "percent",
              "series": [{"id": "fund", "field": "FUND"}, {"id": "spx", "field": "SPX"}]},
     "series": [{"id": "spx", "hidden": true}],
     "range": {"kind": "relative", "count": 3, "unit": "years"}}}}
```

The widget's own spec (Hoist `DashViewSpec` with id `timeSeriesChart`) lives in
`desktop/cmp/dash`, not in `cmp/chart`. Its `defaultSpec` is the seed for a new widget.

---

## 8. Portable: code and JSON in one model

**Portable** means JSON-safe and able to rebuild an equivalent object wherever the same names are
registered. It is stronger than serializable: hoist-core's `formatForJSON()` writes JSON but
need not come back. Every portable value is serializable, but a serializable value is not always
portable.

The chart's rules:

- **Every function slot in a spec also takes a `NamedRef`.** Function-only keys (`onPointClick`)
  live on Config, outside the spec. So the code spec is a superset of the JSON spec, and
  `Portable<TimeSeriesChartSpec>` - a mapped type that drops function branches - is exactly the
  JSON form. Measured: about 16k extra type instantiations, 0.01 s of check time (tsc 7.0.2, one
  run). Publish it as `PortableTimeSeriesChartSpec`.
- **Registries.** A small generic `NamedRegistry<T>` lives in `@xh/hoist/core`. Each domain is a
  typed instance owned by its package: `formatRegistry` in `@xh/hoist/format`,
  `seriesTransformRegistry` in `@xh/hoist/cmp/chart`. Hoist registers built-ins under bare names.
  Apps register in `Bootstrap.ts` under dotted names; `register()` rejects an undotted app name.
  Re-registering replaces (for hot reload). Tests can reset.
- **Registry entries.** An entry is either a function (no args) or a factory
  `(args) => function`. `registry.resolve(ref)` returns the function and records the ref it came
  from in a `WeakMap`. `register()` records arg-less functions the same way. So any function that
  came through a registry writes back as its ref. `toPortable(spec)` returns `{value, lost}`, where
  `lost` lists the paths of functions that did not. Hoist registers its built-ins through an
  internal path that allows bare names.
- **Validation at runtime too.** Stored JSON skips the type checker. `validateSpec()` checks ref
  ids against registries and field names against the store. Problems are path-prefixed, in
  chat-kit's existing error format.
- **Unknown refs survive.** A spec loaded with an unregistered id renders a placeholder for that
  part and writes the ref back unchanged on save. A round trip never destroys what another app
  version wrote.

What this buys: a developer writes `format: 'percent'` or `format: (v) => fmtBps(v)` in code. An
agent writes `{"format": {"id": "percent", "args": {"precision": 1}}}`. Both are the same chart.

---

## 9. Settled decisions and their reasons

| Decision | Why |
|---|---|
| Flat Config that extends a named Spec | Matches GridConfig. Grid can follow with a type-only change. Keeps one patch, validate and persist path. |
| Discrete observables, `getSpec()` computed | Grid's truth is discrete properties. The renderer reacts per key with no diffing. |
| `set*` replaces, `update*` merges | Hoist pairs, e.g. `setHighchartsConfig` / `updateHighchartsConfig`. |
| Route by method; settings panel picks by `authorable` | Restore defaults stays predictable. Agents and UI share one method list and one gate. |
| Clear state only where a definition value changed | Reorders and full-spec writes keep users' tweaks. |
| `persistSpec` requires a portable seed | An unregistered function in a saved definition would vanish silently. |
| Source and type on the widget, not the spec | One definition can rebind. The model stays data-agnostic, like GridModel. |
| `splitBy` partitions, never aggregates | Aggregation already has a home (Cube). One word across families. |
| `{id, args}` refs, bare built-ins, dotted app names | `{name}` matches every function. Hoist tokens are bare today. Dots stop future clashes. |
| Reuse `DateRangeSelection` for range | Already JSON, persisted and re-resolving. No second preset vocabulary. |
| `highchartsConfig` escape hatch on spec and series | Same name as today. JSON, so portable. The agent profile hides it. |
| One model now; base class later | Extract `BaseChartModel` when a second family exists, from real duplication. |

---

## 10. Other families (later)

Category, Heatmap, Distribution, Scatter and Flow models follow the same rules: Config extends a
family Spec, discrete observables, the definition / state split, `splitBy` for series from data,
refs for formats. Today's `TreeMapModel` aligns later. Raw `ChartModel` stays for anything else.
Key sketches are in 04. No base class is designed until the second family is built.

## 11. Component, theme and renderer

```ts
export interface TimeSeriesChartProps extends HoistProps<TimeSeriesChartModel>, LayoutProps, TestSupportProps {
    aspectRatio?: number;
}

export interface ChartThemeTokens {
    series: string[]; // 8 slots, CVD-validated per mode
    positive: string;
    negative: string;
    neutral: string;
    diverging: string[]; // 5 stops, neutral midpoint
    sequential: string[];
}
```

Theme tokens come from CSS variables (`--xh-chart-series-1` ... `--xh-chart-positive`) read at
render time, so app SCSS themes charts as it themes everything else.

The renderer is internal: one folder (`cmp/chart/impl/timeseries/`) that turns spec + state +
data + theme into Highcharts options and turns chart events back into state methods. It keeps
Highcharts calls in one place. It is not a plug-in API. 08 says when a second backend would make
sense.

Transforms (`cumReturn`, `drawdown`, `sma`, ...) run in Hoist as pure, unit-tested functions, so
results do not depend on the backend. `rebase` and data grouping use Highcharts natively, which
rebases on zoom for free.

## 12. Usage

```ts
// Prepackaged, in code. Functions allowed.
@managed chartModel = new TimeSeriesChartModel({
    store: this.navStore,
    persistWith: {localStorageKey: 'fundPerfChart'},
    timeField: 'date',
    rebase: 'percent',
    range: 'ytd',
    rangePresets: ['mtd', 'ytd', {kind: 'relative', count: 3, unit: 'years'}, 'all'],
    showNavigator: true,
    axes: [{id: 'perf', format: {id: 'percent', args: {precision: 1, withPlusSign: true}}}],
    series: [
        {id: 'fund', field: 'FUND', lineWidth: 2.5},
        {id: 'peers', field: 'nav', splitBy: 'symbol', dashStyle: 'dot'},
        {id: 'dd', of: 'fund', transform: 'drawdown', pane: 'dd', excludeFromRebase: true}
    ],
    panes: [{id: 'main', size: 3}, {id: 'dd', size: 1}],
    onPointClick: e => this.showTrades(e.time)
});

panel({title: 'Performance', item: timeSeriesChart({model: chartModel})});

// Agent tool handlers (see 11). One method per tool.
model.addSeries({id: 'ma50', of: 'fund', transform: {id: 'sma', args: {period: 50}}});
model.updateSeriesState([{id: 'spx', hidden: true}]);
```
