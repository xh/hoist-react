# Spike: Highcharts Stock 13.1.1

Adapter: `spikes/adapters/highcharts.js` (key `highcharts`, label "Highcharts Stock").
Modules used: highstock, highcharts-more, heatmap/coloraxis, histogram-bellcurve, sankey, boost, drag-panes, indicators-all.
Time series use `Highcharts.stockChart`. Breadth charts use `Highcharts.chart`.
All 7 charts render in both themes with no console errors or warnings.

## 1. Per-chart results

| Chart | Status | Native features used | Custom code (rough lines) | Problems |
|---|---|---|---|---|
| navRebase | full | `compare: 'percent'` + `compareStart: true`, rangeSelector (8 buttons, `selected`), navigator, ordinal x axis, shared tooltip, x crosshair | ~3 (compare values arrive in percent units, so axis and tooltip formatters divide by 100) | Verified re-base: after `setExtremes` and after a range-button click, the first visible point of every series is exactly 0%. After a manual zoom, range buttons anchor to the current visible max, not the data max. |
| candles | full | candlestick (up/down colors), native `sma` indicators (`linkedTo` + `params.index` = close), 2 yAxis panes with drag-to-resize, navigator, rangeSelector | ~8 (volume `colorBy: 'direction'` as a precomputed color column, OHLC tooltip row) | No native "color this column series by another series' direction". Indicators default to `showInLegend: false`. |
| perfDrawdown | partial | 2 panes on one x axis (one crosshair spans both), area series with `threshold: 0`, flags series for events, xAxis `plotBands`, rangeSelector | ~20 (flags, bands, pane layout math) | `crosshair.syncGroup` not wired. Panes in one chart share the crosshair, but cross-chart sync has no native API (Highcharts' "synchronized charts" demo is ~40 lines of custom event code). Band label "Crash" rendered as empty text until I set `align: 'left'` and `style.width: 'none'` - Highcharts hides a label wider than its band. |
| stress | full | Stock `dataGrouping` (default path) or `boost` (WebGL), navigator, typed arrays straight into a DataTable | ~15 (mode switch, `zoomTo`) | See section 2. Two boost bugs found. |
| corrHeatmap | full | heatmap, `colorAxis.stops` (diverging, placed from min/mid/max), `dataLabels.color: 'contrast'`, category axes | ~8 (stop positions, index lookup) | None. |
| returnsHist | full | `histogram` (`binsNumber: 60`) and `bellcurve` series from a hidden base series, xAxis `plotLines` for VaR | ~10 (a `load` hook that rescales the bellcurve axis to count units, quantile via `CS.transforms`) | `bellcurve` plots a density on its own axis and is an areaspline (filled) by default. To overlay counts it needs a second axis rescaled after render. No native quantile. |
| flowsSankey | full | sankey, nodes inferred from links, series-level `dataTable` with `from`/`to`/`weight` columns | ~3 (formatters) | Labels sit over node bars (default). |

## 2. Stress results (dark theme, 4 x 250k points, 3 runs, median)

| Mode | render | zoom (5% window) | reset | hover median / p90 |
|---|---|---|---|---|
| `dataGrouping` (shipped for `performance.mode: 'auto'`) | 78 ms | 35 ms | 50 ms | 50 / 53 ms |
| `boost` (WebGL, all raw points, `performance.mode: 'gpu'`) | 253 ms | 116 ms | 163 ms | 50 / 53 ms |

Raw runs: grouping render 77/79/78, zoom 35/35/37, reset 71/50/47. Boost render 265/253/244, zoom 116/117/111, reset 167/150/163.
Hover at ~50 ms looks like the floor of the harness (two rAFs plus a puppeteer round trip), not a library number.

- `dataGrouping` is Highcharts Stock's default large-data path. At full range it groups to 6-hour buckets (695 points per series) and averages each bucket. That is library downsampling: it hides intraday extremes unless you pick `approximation: 'ohlc'` or similar. No LTTB option.
- `boost` renders every raw point via WebGL. It is ~3x slower to render and zoom than grouping here, but it is faithful to the data.
- Grouping and boost do not combine. With grouping on, the grouped point count falls below `boostThreshold` and boost never engages (`chart.boosted === false`).
- Data prep: none for grouping (the `Float64Array` columns go straight into a DataTable without a copy). Boost needs plain y arrays (`Array.from`, see bug 2), a 4 x 250k copy that was not timed separately.
- Bug 1: `boost.usePreallocated: true` draws all four series from the first series' buffer (four lines in one shape). The option is documented as experimental ([boost.usePreallocated](https://api.highcharts.com/highcharts/boost.usePreallocated)). Left off.
- Bug 2: with boost, series fed from a v13 `dataTable` (chart-level with `dataMapping`, or series-level) return hover points with `y: null`, so the tooltip shows "-". Plain `data` arrays with `pointStart`/`pointInterval` work. Not checked against v12, because `dataTable` is new in v13.

## 3. Easy, hard, and v13 changes

Easy (all native, little code):
- The whole time-series feature list in the spec maps to first-class Stock options: ordinal axis for the trading calendar, `compare` + `compareStart` for re-basing, navigator, rangeSelector, flags, plotBands, stacked panes, technical indicators.
- v13 `dataTable` + `dataMapping` ([docs](https://api.highcharts.com/highcharts/plotOptions.series.dataMapping)) maps almost 1:1 onto the spec: one chart-level column table from the source, and each series names its `x`/`y`/`open`/`close`/`color` columns. Typed arrays are accepted as columns.
- Theming: the new v13 `palette` option ([docs](https://api.highcharts.com/highcharts/palette)) takes `backgroundColor`, `neutralColor`, `highlightColor`, `positiveColor`, `negativeColor` and `colors`. It derives the text, line and border shades from those, so the theme block is much smaller than Hoist's current Dark.ts/Light.ts.

What fought me:
- Initial series animation. Screenshots taken ~400 ms after render showed half-drawn lines. I set `plotOptions.series.animation: false`.
- Stock enables `dataGrouping` by default, which silently averages a 760-point NAV series into weekly points at a 3Y range. Every non-stress chart turns it off. An LLM or a developer would likely miss this. Tooltip values would then be averages.
- Compare units: `point.change` and the compared axis values are in percent units (5 = 5%). Hoist formats expect fractions, so every formatter needs a `/ 100`.
- `bellcurve` needs a second axis and a post-render rescale to overlay a count histogram.
- Plot band labels vanish (empty text) when the band is narrower than the label.
- The two boost bugs above.

v13 changes vs v12 (from [changelog.highcharts.com](https://changelog.highcharts.com/) and the 13.1.1 source):
- New `palette` option replaces the v12 "Adaptive" theme. Default series colors are now `var(--highcharts-color-n)` CSS variables. The default `palette.colorScheme` is `'light dark'`, so an app that does not set it gets chart chrome that follows the OS dark-mode setting, not the app theme. Hoist must set `colorScheme` explicitly.
- New `dataTable` / `series.dataTable` / `series.dataMapping` (see above).
- `dataSorting` now needs `modules/data-sorting.js`.
- Data label placement now uses `dataLabels.distance` instead of `padding` with `x`/`y`. This may move existing Hoist app labels.
- `useHTML` content is wrapped in a `div`, not a `span`. CSS that targets `span` breaks.
- Gauge, solid-gauge and polar defaults changed. Solid-gauge numeric `radius`/`innerRadius` are now pixels.
- 13.1: `StackItemObject.isNegative` removed. The standalone navigator's `chart` option moved to `chartOptions`.
- Formatter signatures (already true in v12): tooltip and dataLabel formatters are called with `this` = the Point and args `(tooltipOrOptions, point)`. Axis label formatters get `(ctx)`. I used arrow functions with the second arg where possible.

## 4. Adapter size

`wc -l adapters/highcharts.js`: 458 lines.
- Plumbing and theme (theme tokens to options, legend, handle, registration, `zoomTo`): ~105
- Time series (columns, panes, range buttons, series mapping, flags, bands, tooltip, large-data mode, notes): ~185
- Breadth (heatmap ~45, histogram ~78, sankey ~47): ~170

## 5. Agent fit

- Pure JSON works for: structure, series types, navigator, rangeSelector buttons, compare, ordinal, indicators (`type: 'sma'`, `linkedTo`, `params`), flags, plotBands, panes, heatmap colorAxis stops, histogram bins, sankey, dataTable/dataMapping.
- Functions were needed for: every Hoist number format (axis labels, tooltip, data labels, sankey node labels), the shared tooltip layout, and the bellcurve axis rescale (`chart.events.load`). Highcharts format strings (`{value:.1f}`) cannot express Hoist's signed / compact / fraction-as-percent rules without callbacks. I did not test whether the v11+ template helpers could cover some of it.
- Likely LLM mistakes, subtle and silent:
  - Leaving Stock's default `dataGrouping` on, so tooltips show averages.
  - Forgetting that `compare` values are in percent units. The axis would read "+500%" for 5%.
  - Using `compareStart` the wrong way round. `true` makes the first visible point 0%.
  - Writing tooltip formatters against the pre-v12 context, or using `this.point.change` vs `this.change` inconsistently. Both work today because `point.point === point`.
  - Turning on `boost.usePreallocated` for speed (bug 1), or feeding boost from a `dataTable` (bug 2).
  - Not setting `palette.colorScheme`, so the chart follows the OS theme instead of the app.
  - Expecting `bellcurve` to share the histogram's y axis.

## 6. Theming

- Close to Hoist in both themes: background, grid, axis lines, label and text colors, font family, tooltip background and border, legend states, navigator mask and handles, and range selector buttons. All come from `CS.themes` via `palette` plus a small explicit block.
- `palette` is the main lever. Most chrome colors come from `neutralColor` blended with `backgroundColor` at fixed steps (3/5/10/20/40/60/80/100%). Hoist's exact `textMuted` and `border` shades are therefore approximations unless set per element, which I did for axes, grid, legend and tooltip.
- Not fully controlled: range selector input boxes (only border, background and text are themeable via options), the drag-panes resize line (thin border-colored line, the default is a 4px bar), and navigator series colors (explicitly accent-colored).
- Scrollbar disabled. Hoist's current themes style it, but the navigator covers the use case.
