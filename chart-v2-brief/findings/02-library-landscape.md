# 02 - Library landscape

Research date 2026-11-15. This file surveys 16 charting libraries plus other entrants, and sets the
shortlist for Chart V2. Most charts in Hoist apps are time series, so time-series depth carries
the most weight. Breadth still matters, because Hoist needs one library that covers the rest.

Sources: `../notes/research-highcharts-agcharts-amcharts.md`,
`../notes/research-echarts-plotly-vega-others.md`, `../notes/research-finance-specialists.md`.
Each claim below carries its URL.

Conventions:

- Time-series ratings: **B** built in, **C** custom code, **X** not practical.
- **[measured]** = a number we produced. **[inferred]** = not verified at a live source.
  **[unverified]** = a source exists but we could not read it directly.
- Bundle sizes for the three spiked libraries are esbuild tree-shaken, min + gzip, from
  `../spikes/bundle-sizes.json` (method in `../spikes/scripts/bundle-size.mjs`). Other sizes are
  gzip of the published CDN bundle. They are rough and not comparable with the spiked numbers.

## Summary

| Library | Version + date | Licence | Rendering | Classification | Shortlist? | One-line reason |
|---|---|---|---|---|---|---|
| Highcharts (+ Stock) | 13.1.1, 2026-09-20 | Proprietary | SVG (+ WebGL Boost) | Credibly both | **Yes - spiked** | Incumbent, deepest finance features, clients already license it |
| AG Charts | 14.3.0, 2026-11-04 | MIT Community + commercial Enterprise | Canvas | Generalist with a growing finance layer | **Yes - spiked** | Same vendor and versions as AG Grid. TS-first. Every time-series essential is Enterprise |
| Apache ECharts | 6.1.0, 2026-05-19 | Apache-2.0 | Canvas or SVG | Credibly both | **Yes - spiked** | Strongest OSS all-rounder. Finance gaps are all C, not X |
| amCharts 5 | 5.21.5, 2026-10-26 | Commercial, or free with logo link | Canvas (SVG since 5.21.0) | Credibly both | **Scored, not spiked** | Richest pre-built stock UI. Verbose JSON and no WebGL |
| SciChart.js | 6.0.16, 2026-11-06 | Commercial, domain-locked | WebGL / WebGPU + WASM | Credibly both | **Scored, not spiked** | Fastest, best JSON round trip. Hostname-capped licences |
| Plotly.js | 4.3.0, 2026-11-10 | MIT | SVG + WebGL | Generalist, time-series capable | No | Heavy bundle, WebGL conflicts with rangebreaks, send-to-cloud default |
| TradingView Lightweight Charts | 5.3.0, 2026-11-10 | Apache-2.0 + attribution | Canvas | Time-series specialist (price charts) | No | Price charts only. No navigator, no breadth |
| LightningChart JS | 9.1.0, 2026-11-03 | Commercial | WebGL | Generalist with a performance specialty | No | Imperative API, OHLC behind a separate Trading licence |
| Vega-Lite | 6.5.0, 2026-10-08 | BSD-3-Clause | SVG or Canvas | Generalist (analysis grammar) | No | No candlestick, breaks or WebGL. Keep as a spec design reference |
| Observable Plot | 0.6.19, 2026-11-05 | ISC | SVG | Generalist (static) | No | No zoom, pan or brush |
| Recharts | 3.10.1, 2026-07-25 | MIT | SVG | Generalist (dashboards) | No | No zoom or candlestick. JSX, not JSON |
| visx | 4.0.0, 2026-06-11 | MIT | SVG primitives | Toolkit | No | We would write Highstock ourselves |
| Nivo | 0.99.0, 2025-05-23 | MIT | SVG + Canvas | Generalist (breadth) | No | No time-series interaction. No release in 18 months |
| uPlot | 1.6.32, 2025-03-14 | MIT | Canvas | Time-series specialist (low-level engine) | No | No finance features or breadth. Possible sparkline engine |
| Perspective | 5.9.1, 2026-11-12 | Apache-2.0 | WASM + WebGL | Streaming pivot / analytics widget | No | Not a chart component. Separate niche |
| D3 | 7.9.2, 2026-11-03 | ISC | DIY | Low-level toolkit | No | Every chart feature is custom code. See "D3 and low-level" |

---

## Highcharts (Core + Stock)

- **Version:** 13.1.1, published 2026-09-20 (security fixes). 13.0.0 shipped 2026-06-11.
  12.6.2 and 11.4.9 still get security backports.
  ([changelog](https://changelog.highcharts.com/), [npm](https://www.npmjs.com/package/highcharts))
- **Licence:** proprietary. Clients already license it.
- **Hoist today:** apps install it. Hoist accepts 12.4.0 to 12.x only (`kit/highcharts/index.ts`).
  Hoist and Toolbox are one major behind.

**Strengths**

- Deepest time-series feature set in this survey. Stock adds an ordinal axis that removes
  weekend and overnight gaps, `compare: 'percent'` rebasing that updates on zoom, `cumulative`,
  `dataGrouping` with OHLC approximations, 50+ indicators, flags, and a Stock Tools drawing GUI.
  ([Stock docs](https://www.highcharts.com/docs/stock/technical-indicator-series),
  [compare](https://api.highcharts.com/highstock/plotOptions.series.compare),
  [ordinal](https://api.highcharts.com/highstock/xAxis.ordinal))
- Navigator and range selector with 1M/3M/YTD/1Y/All buttons built in.
  ([navigator](https://www.highcharts.com/docs/stock/navigator),
  [range selector](https://www.highcharts.com/docs/stock/range-selector))
- IANA time zones via `time.timezone`.
- Near-complete breadth: 119 series types, including sankey, network graph, org chart,
  treemap, sunburst, heatmap, gauge and maps. Only 3D surface and violin are missing.
  ([options tree](https://api.highcharts.com/highcharts/tree.json))
- Smallest tree-shaken bundle of the three spiked libraries: 180 KB gzip for the time-series
  profile, 194 KB for the full spike profile **[measured]**.
- Three hosted MCP servers: Dev Assist (validates config), Chart Chooser and Render.
  ([MCP](https://www.highcharts.com/mcp/))

**Weaknesses for our use**

- SVG slows above roughly 50k points. Boost (WebGL) helps, but it drops dash styles, stacking and
  negative colours, and it does not engage while Stock `dataGrouping` is on, which is the default.
  ([Boost](https://www.highcharts.com/docs/advanced-chart-features/boost-module))
- A competitor benchmark (ApexCharts, 2026-07-20) shows a Boost floor of about 160-190 ms, slower
  than plain SVG below about 20k points. Vendor-run, so treat with care.
  ([benchmark](https://apexcharts.com/blog/javascript-chart-library-benchmark/))
- Cross-chart crosshair sync is a demo pattern (about 40 lines), not an option, outside Dashboards.
  ([demo](https://www.highcharts.com/demo/highcharts/synchronized-charts))
- 12 to 13 is a major upgrade with breaking changes. The new `@highcharts/react` 5.x needs
  Highcharts 13. ([changelog](https://changelog.highcharts.com/))

**Classification: credibly both.** Stock covers every time-series checklist item at B or B/C.
Core covers nearly every breadth family at first-class level.

**Agent / JSON fit: good.** One declarative options object. Format strings
(`{point.y:.2f}`) cover most formatting without functions. No public JSON Schema, but
`tree.json` (2.6 MB) lists every option. 15+ years of public examples. Risks: a huge option
surface invites invented option names, and 13.x renamed several options. No `llms.txt` (404)
**[measured]**.

**Verdict: keep.** It is the baseline every other option must beat.

---

## AG Charts (Community / Enterprise)

- **Version:** 14.3.0, published 2026-11-04. v14.0.0 shipped 2026-06-24.
  ([npm](https://www.npmjs.com/package/ag-charts-community),
  [what's new](https://www.ag-grid.com/charts/whats-new/))
- **Licence:** Community is MIT. Enterprise is commercial and separate from AG Grid Enterprise.
- **Grid link:** `ag-grid-enterprise@36.3.0` pins `ag-charts-*` 14.3.0 exactly, so chart and grid
  versions move in lockstep (`npm view ag-grid-enterprise@36.3.0 optionalDependencies`).
  Toolbox uses `ag-charts-community` only for grid sparklines
  (`toolbox/client-app/src/Bootstrap.ts`, `SparklinesModule.with(AgChartsCommunityModule)`).

**Strengths**

- Navigator, zoom and pan, cross-chart `sync` of zoom, tooltips and crosshairs, range buttons,
  candlestick, OHLC and HLC. All built in, all Enterprise.
  ([sync](https://www.ag-grid.com/charts/javascript/sync/),
  [financial](https://www.ag-grid.com/charts/javascript/financial-charts/))
- Rich user-drawn annotations with undo, saved through a JSON Chart State API.
  ([annotations](https://www.ag-grid.com/charts/javascript/annotations/),
  [state](https://www.ag-grid.com/charts/javascript/api-state/))
- Automatic M4 downsampling for over 1M points, and `applyTransaction()` for ticking data.
  ([large data](https://www.ag-grid.com/charts/javascript/large-dataset-interactivity/))
- TS-first. Same design language and theming approach as AG Grid. CSS variables since v14.
- Best docs-for-agents story of the three spiked: `llms.txt`, a `.md` copy of every page, AG Skills,
  and dev-time option validation. ([llms.txt](https://www.ag-grid.com/charts/llms.txt),
  [validation](https://www.ag-grid.com/charts/javascript/dev-validation/))

**Weaknesses for our use**

- No technical indicators (backlog AG-13319), no compare/rebase, no axis breaks (AG-9083), no
  multi-pane layout, and UTC-only time zones. ([pipeline](https://www.ag-grid.com/charts/pipeline/),
  [time axes](https://www.ag-grid.com/charts/javascript/axes-time/))
- Community is basic cartesian, pie and funnel only. Heatmap, treemap, sankey, histogram, box
  plot and even zoom need Enterprise.
- Largest tree-shaken bundle: 565 KB gzip for the time-series profile, 490 KB without financial
  and annotation modules, 724 KB for everything **[measured]**. About 3x Highcharts.
- Thinner training data (490 GitHub stars on `ag-grid/ag-charts`). Options changed shape in v13
  and v14, so older examples mislead models **[inferred]**.

**Classification: generalist with a growing finance layer.** The interaction layer (navigator,
zoom, sync, annotations) is strong. The analysis layer (indicators, rebasing, breaks) is absent.

**Agent / JSON fit: good.** One declarative `AgChartOptions` object. Formatters are functions but
needed less often **[inferred]**. No JSON Schema.

**Verdict: keep.** Vendor alignment with AG Grid is real, but clients would need new spend, and the
finance layer is ours to build.

---

## Apache ECharts

- **Version:** 6.1.0, published 2026-05-19. 6.0.0 shipped 2025-07-30.
  ([npm](https://www.npmjs.com/package/echarts), [release](https://github.com/apache/echarts/releases/tag/6.1.0))
- **Licence:** Apache-2.0. Free. The NOTICE file must travel with redistributed copies.
  ([LICENSE](https://github.com/apache/echarts/blob/master/LICENSE))

**Strengths**

- Built in: `dataZoom` slider navigator, wheel and drag zoom, `echarts.connect` cross-chart sync,
  `axisPointer.link` across grids, candlestick with `large` mode, LTTB sampling, multi-grid panes.
  ([option ref](https://echarts.apache.org/en/option.html#dataZoom-slider),
  [connect](https://echarts.apache.org/en/api.html#echarts.connect))
- v6 added axis breaks on time axes, with an official intraday example.
  ([example](https://echarts.apache.org/examples/en/editor.html?c=intraday-breaks-1))
- Official demo renders 200k OHLC bars. ([candlestick-large](https://echarts.apache.org/examples/en/editor.html?c=candlestick-large))
- Widest free breadth: every family at first-class or adequate, including network graph, sankey,
  chord, matrix, geo, and 3D via `echarts-gl`.
- Huge adoption: 67.7k stars, 10.6M weekly downloads.
  ([GitHub](https://github.com/apache/echarts), [npm API](https://api.npmjs.org/downloads/point/last-week/echarts))
- Tree-shaken bundle 220 KB gzip for the time-series profile, 375 KB for everything **[measured]**.

**Weaknesses for our use**

- Finance gaps, all C: range buttons (about 30 lines), compare/rebase on zoom (about 50-100 lines
  **[inferred]**), indicators, OHLC re-aggregation on zoom, drawn annotations.
- Time zones: only a global `useUTC` flag, no IANA zones. ([useUTC](https://echarts.apache.org/en/option.html#useUTC))
- Breaks need an explicit list of gaps. No "skip weekends" rule.
- String templates cannot format numbers, so `$1.2M` or `12.34%` labels need a function. Hoist
  would need a named-formatter registry to keep specs pure JSON.
  ([formatter doc](https://github.com/apache/echarts-doc/blob/master/en/option/component/axis-common.md))
- No official React wrapper. Community `echarts-for-react` 3.0.6.

**Classification: credibly both.** Every breadth family is F or A. Time series has B for navigator,
zoom, sync, candlestick and downsampling, and C (never X) for the rest.

**Agent / JSON fit: good, with gaps.** One plain `option` object. No official JSON Schema (request
open since 2022, [#16427](https://github.com/apache/echarts/issues/16427)). Wrong keys fail
silently. Index-based cross-references (`xAxisIndex`, `gridIndex`) are brittle for agents
**[inferred]**.

**Verdict: keep.** The strongest OSS option and the natural "no licence" alternative.

---

## Plotly.js

- **Version:** 4.3.0, published 2026-11-10. `react-plotly.js` 4.1.0, 2026-07-29.
  ([npm](https://www.npmjs.com/package/plotly.js), [releases](https://github.com/plotly/plotly.js/releases))
- **Licence:** MIT. ([LICENSE](https://github.com/plotly/plotly.js/blob/master/LICENSE))

**Strengths**

- Only OSS option with built-in range selector buttons (incl. YTD) and `rangebreaks` for
  weekends and holidays. ([time series](https://plotly.com/javascript/time-series/))
- Users can draw and edit shapes. ([shapes](https://plotly.com/javascript/shapes/))
- Best JSON story: a figure is pure JSON, formats are d3-format strings, and
  `plot-schema.json` plus `Plotly.validate()` check specs. Same JSON as plotly.py and plotly.R.

**Weaknesses for our use**

- WebGL traces are forced hidden on any axis with rangebreaks, so speed and a gap-free calendar
  are mutually exclusive. ([axis_defaults.js](https://github.com/plotly/plotly.js/blob/v4.3.0/src/plots/cartesian/axis_defaults.js#L211-L220))
- Browsers allow only "generally 4 to 8" WebGL figures per page.
  ([WebGL vs SVG](https://plotly.com/javascript/webgl-vs-svg/))
- Heavy: the finance partial bundle is 438 KB gzip, full is 1.49 MB.
  ([dist README](https://github.com/plotly/plotly.js/blob/master/dist/README.md))
- v4 shows a "send to cloud" button by default that posts chart data to `cloud.plotly.com`
  after a confirmation. A data-governance problem for financial firms.
  ([v4.0.0 notes](https://github.com/plotly/plotly.js/releases/tag/v4.0.0))
- No network graph, no client-side downsampling, no indicators.

**Classification: generalist, time-series capable.**

**Agent / JSON fit: best of the survey.** Pure JSON with an official schema and validator.

**Verdict: cut.** Bundle weight, the WebGL/rangebreaks conflict and the context cap hurt a
multi-chart finance dashboard. Keep its schema and d3-format approach as a design reference.

---

## amCharts 5 (incl. Stock Chart)

- **Version:** 5.21.5, published 2026-10-26. 40+ releases in 2026. Does not follow semver.
  ([npm](https://www.npmjs.com/package/@amcharts/amcharts5); package `CHANGELOG.md`)
- **Licence:** commercial, or free with a branding link on every chart.

**Strengths**

- Most complete pre-built stock UI: `StockChart` panels, period selector with YTD, comparison
  control with percent scale, 35+ indicators, a full drawing toolkit, `GaplessDateAxis` and IANA
  time zones. ([stock docs](https://docs.amcharts.com/v5/charts/stock/),
  [gapless axis](https://docs.amcharts.com/v5/charts/xy-chart/axes/gapless-date-axis/))
- `XYCursor.syncWith` gives cross-chart crosshair sync.
- Wide breadth, including force-directed and Voronoi treemap.
- Official JSON round trip: `JsonParser` builds a chart, `ChartSerializer` saves one.
  ([serializing](https://docs.amcharts.com/v5/concepts/serializing/))
- Most AI tooling: `AGENTS.md` and docs in the npm package, `llms.txt`, an MCP server and a
  Claude plugin. ([llms.txt](https://www.amcharts.com/llms.txt), [MCP](https://docs.amcharts.com/v5/ai/mcp/))

**Weaknesses for our use**

- No WebGL and no published performance numbers. Slowest library in uPlot's 2023 benchmark
  (1,601 ms for 166k points, old version). ([uPlot README](https://github.com/leeoniya/uPlot#performance))
- The JSON format is verbose and has documented silent failures (settings beside `type` are
  ignored, a bare hex colour throws).
- Imperative code API. Themes cannot live in JSON. No CSS variables **[inferred]**.
- Official React package is a month old (122 downloads/week).
- Stock is a separately licensed product.

**Classification: credibly both.**

**Agent / JSON fit: mixed.** A real JSON format and the best AI tooling, but the format is hard
to author correctly.

**Verdict: keep as scored, not spiked.** Represents "maximum stock features out of the box".
Not spiked because performance is unproven and the JSON dialect is awkward for a Hoist spec.

---

## TradingView Lightweight Charts

- **Version:** 5.3.0, published 2026-11-10.
  ([npm](https://registry.npmjs.org/lightweight-charts), [releases](https://github.com/tradingview/lightweight-charts/releases))
- **Licence:** Apache-2.0, with a NOTICE plus a link to tradingview.com required on a page users
  can see. ([README](https://github.com/tradingview/lightweight-charts#license))

**Strengths**

- Panes (v5), candlestick and bar series, built-in percentage and indexed-to-100 price scales
  that rebase to the first visible value, data conflation (5.1), and `series.update()` for ticks.
  ([price scale modes](https://tradingview.github.io/lightweight-charts/examples/price-scales/price-scale-modes),
  [release notes](https://tradingview.github.io/lightweight-charts/docs/release-notes))
- Tiny: about 61 KB gzip **[measured]**. 1.79M weekly downloads.
- Official agent skills for Claude Code and Codex.
  ([README](https://github.com/tradingview/lightweight-charts#ai-coding-assistants))

**Weaknesses for our use**

- No navigator, no native time zones, no indicators in core, no drawing tools.
  ([time zones](https://tradingview.github.io/lightweight-charts/docs/time-zones))
- Almost no breadth: no pie, sankey, treemap, heatmap (except a time-based plugin) or gauge.
- Imperative build (`createChart`, `addSeries`), so there is no single JSON spec.
- Attribution must appear in each client app.

**Classification: time-series specialist** (price charts only).

**Agent / JSON fit: fair.** Options are plain objects, but the chart is assembled in code.

**Verdict: cut.** It cannot be Hoist's only library, and adding a second engine just for price
charts doubles the adapter and theming work. Revisit only if a client needs a TradingView-style
price chart that the main library cannot match.

**TradingView Advanced Charts** (separate product): licensed for "public websites only" and not
redistributable. ([FAQ](https://www.tradingview.com/charting-library-docs/latest/getting_started/Frequently-Asked-Questions/))
Internal apps look ineligible. **Cut.**

---

## SciChart.js

- **Version:** 6.0.16, published 2026-11-06. `scichart-react` 2.3.0 (MIT).
  ([npm](https://registry.npmjs.org/scichart), [v6 release](https://www.scichart.com/scichart-js-v6-released/))
- **Licence:** commercial, domain-locked.

**Strengths**

- Fastest engine surveyed: WebGL, plus WebGPU on Apple Silicon, on a WASM core. Vendor claims
  about 40M points/s ingest. ([Chart Bench 2026](https://www.scichart.com/blog/chart-bench-compare-javascript-chart-libraries/), vendor-run)
- Finance basics built in: `DiscontinuousDateAxis` for weekday data, `SciChartOverview`
  navigator, cross-chart modifier groups, candlestick and OHLC, resampling, and
  `scichart-financial-tools` drawing tools.
  ([typings](https://cdn.jsdelivr.net/npm/scichart@6.0.16/types/Charting/Visuals/Axis/DiscontinuousDateAxis.d.ts))
- Scientific breadth: heatmaps, contours, 3D surface, full polar family.
- Real JSON round trip: `toJSON()`, a reviver and `build2DChart`, with named functions via
  `registerFunction`. ([serialization](https://www.scichart.com/documentation/js/v4/2d-charts/builder-api/charts-serialization-deserialization/))

**Weaknesses for our use**

- Each licence covers 5 production hostnames, a poor fit for a toolkit. ([domain FAQ](https://support.scichart.com/support/solutions/articles/101000515345-scichart-js-domain-licensing-faq))
- Indicators and rebasing are C. Time zone support not found.
- Weak business breadth: no sankey or funnel, awkward treemap and waterfall.
- About 0.85 MB gzip of WASM on top of the JS **[measured]**. WASM files must be served.
- Closed source, about 100k weekly downloads, so weaker LLM recall **[inferred]**. No public MCP.

**Classification: credibly both.**

**Agent / JSON fit: good.** The builder API is the closest commercial match to "chart as JSON".

**Verdict: keep as scored, not spiked.** Represents the "performance ceiling" option. Not spiked,
because it scored below the spiked three.

---

## LightningChart JS

- **Version:** `@lightningchart/lcjs` 9.1.0, published 2026-11-03.
  ([npm](https://registry.npmjs.org/@lightningchart/lcjs))
- **Licence:** commercial. A key is needed even to run.

**Strengths**

- Vendor claims: 100M static points in 1.07 s, 240M visible points at 60 FPS.
  ([README](https://cdn.jsdelivr.net/npm/@lightningchart/lcjs@9.1.0/README.md), vendor-run)
- Broad: heatmap, 3D surface, gauge, treemap, sunburst, maps, funnel, parallel coordinates.
- Separate Trader product with 100+ indicators and 30+ drawing tools.

**Weaknesses for our use**

- `OHLCSeries` "is only usable with a Trading license".
  ([lcjs.d.ts](https://cdn.jsdelivr.net/npm/@lightningchart/lcjs@9.1.0/dist/lcjs.d.ts))
- No axis breaks or downsampling API found. Rebasing is C.
- Fully imperative, method-chained API with no serialization (0 `toJSON` hits in the typings).
- No official React component. About 392 KB gzip, tree-shaking doubtful **[inferred]**.

**Classification: generalist with a performance specialty.**

**Agent / JSON fit: poor.** Hoist would own a full spec-to-API translator.

**Verdict: cut.** Worst JSON fit and gated finance features.

---

## Vega-Lite (and Vega)

- **Version:** `vega-lite` 6.5.0, 2026-10-08. `vega` 6.4.0, 2026-08-14.
  ([npm](https://www.npmjs.com/package/vega-lite))
- **Licence:** BSD-3-Clause. ([LICENSE](https://github.com/vega/vega-lite/blob/main/LICENSE))

**Strengths:** the cleanest grammar for agents. Specs are pure JSON, formats and expressions are
strings, and there is an official JSON Schema.
([v6 schema](https://vega.github.io/schema/vega-lite/v6.json)) The `window` transform gives
rolling and cumulative ops, and an official index chart shows rebasing.
([index chart](https://vega.github.io/vega-lite/examples/interactive_index_chart.html))

**Weaknesses for our use:** no candlestick mark, no range buttons, no axis breaks, no WebGL, no
downsampling. Treemap, sankey and gauge are absent. A 2024 study found LLMs "still struggled with
Vega-Lite grammar". ([arXiv 2401.11255](https://www.arxiv.org/pdf/2401.11255))

**Classification: generalist** (statistical analysis grammar).

**Agent / JSON fit: best grammar, schema-first.**

**Verdict: cut as an engine.** Keep as the reference design for a Hoist chart spec: string formats,
string expressions, schema first.

---

## Observable Plot

- **Version:** 0.6.19, 2026-11-05. Still pre-1.0. ([npm](https://www.npmjs.com/package/@observablehq/plot))
- **Licence:** ISC.
- **Strengths:** `normalize` (rebase), `window`, `bollinger` mark, crosshair. 69 KB gzip **[measured]**.
- **Weaknesses:** no zoom or pan ([#1590](https://github.com/observablehq/plot/issues/1590)), no
  brush ([#5](https://github.com/observablehq/plot/issues/5)), no candlestick, no navigator. SVG only.
- **Classification:** generalist (static exploration).
- **Agent / JSON fit:** poor. A JS API that often takes functions.
- **Verdict: cut.** No interaction model for finance.

## Recharts

- **Version:** 3.10.1, 2026-07-25. ([releases](https://github.com/recharts/recharts/releases))
- **Licence:** MIT.
- **Strengths:** `syncId` tooltip sync, `Brush` range slider, multiple y-axes. Most downloaded
  library here (66.2M weekly).
- **Weaknesses:** no zoom or pan ([#710](https://github.com/recharts/recharts/issues/710), open
  since 2017), no candlestick, SVG only with no sampling.
  ([performance guide](https://recharts.github.io/guide/performance))
- **Classification:** generalist (dashboards).
- **Agent / JSON fit:** poor. JSX composition, not JSON.
- **Verdict: cut.** Popularity is not finance fitness.

## visx

- **Version:** 4.0.0, 2026-06-11, 19 months after 3.12.0. ([release](https://github.com/airbnb/visx/releases/tag/v4.0.0))
- **Licence:** MIT.
- **Strengths:** clean React primitives on D3, brush and XYChart.
- **Weaknesses:** candlestick, navigator, sync and indicators are all hand-built. SVG only.
- **Classification:** toolkit.
- **Agent / JSON fit:** none. It is component code.
- **Verdict: cut.** We would be writing Highstock ourselves.

## Nivo

- **Version:** 0.99.0, 2025-05-23. No release in about 18 months.
  ([releases](https://github.com/plouc/nivo/releases))
- **Licence:** MIT.
- **Strengths:** broad business breadth (sankey, chord, network, calendar). Props are JSON-like and
  take d3-format strings.
- **Weaknesses:** basic time-scale line only. No zoom or brush, no candlestick
  ([#155](https://github.com/plouc/nivo/issues/155)).
- **Classification:** generalist (breadth).
- **Agent / JSON fit:** fair.
- **Verdict: cut.** No time-series interaction, stalled releases.

## uPlot

- **Version:** 1.6.32, 2025-03-14. No npm release in 20 months, but master is very active
  (candlestick rewrite, native tooltips, Sep-Nov 2026).
  ([npm](https://registry.npmjs.org/uplot), [commits](https://github.com/leeoniya/uPlot/commits/master))
- **Licence:** MIT. No attribution UI requirement.
- **Strengths:** very fast Canvas engine (166k points in 25 ms cold start), `cursor.sync`, IANA time
  zones and DST, about 22 KB gzip. ([README](https://github.com/leeoniya/uPlot#performance))
- **Weaknesses:** no panning, navigator, candlestick (demo only), indicators or aggregation.
  Docs are "a perpetual work in progress". Single maintainer.
- **Classification:** time-series specialist (low-level engine).
- **Agent / JSON fit:** fair options object, but real use leans on functions and hooks.
- **Verdict: cut as the main library.** A possible sparkline or dense-line engine later.

## Perspective

- **Version:** `@perspective-dev/*` 5.9.1, 2026-11-12. Moved from FINOS to the OpenJS Foundation in
  v4.0.0. ([releases](https://github.com/perspective-dev/perspective/releases),
  [v4.0.0](https://github.com/perspective-dev/perspective/releases/tag/v4.0.0))
- **Licence:** Apache-2.0.
- **Strengths:** C++/WASM streaming query engine with WebGL charts, including candlestick. Small
  JSON viewer config.
- **Weaknesses:** a pivot widget, not a chart component. No navigator, rebasing, annotations or
  indicators **[inferred from feature list]**. Recent Firefox render bug
  ([#3248](https://github.com/perspective-dev/perspective/issues/3248)). 33k weekly downloads.
- **Classification:** streaming pivot and analytics widget.
- **Verdict: cut as the chart engine.** Could be a separate Hoist "ad-hoc analytics" component.

## D3

- **Version:** 7.9.2, 2026-11-03 (maintenance). ([releases](https://github.com/d3/d3/releases))
- **Licence:** ISC.
- **Strengths:** scales, shapes, zoom, brush and layouts. 93 KB gzip full **[measured]**.
- **Weaknesses:** every chart feature is custom code. `d3fc` (finance series) last released
  2024-07-30. ([npm](https://www.npmjs.com/package/d3fc))
- **Classification:** low-level toolkit.
- **Agent / JSON fit:** none. Imperative code.
- **Verdict: cut as a chart layer.** See next section.

---

## Other entrants

| Library | Status (cited) | Verdict |
|---|---|---|
| KLineChart | 10.1.0, 2026-10-14, Apache-2.0. Built-in indicators and drawing ([npm](https://registry.npmjs.org/klinecharts)) | Cut. Crypto-style K-line only, no breadth |
| ChartGPU | 0.4.0, 2026-08-03, MIT. WebGPU only, no fallback ([README](https://github.com/ChartGPU/ChartGPU)) | Cut, watch. Pre-1.0, no WebGL fallback |
| Chart.js + chartjs-chart-financial | Plugin 0.2.1, last published 2024-03-23 ([npm](https://registry.npmjs.org/chartjs-chart-financial)) | Cut. Finance plugin stale |
| Syncfusion Charts | 35.1.46, 2026-11-12, commercial ([npm](https://registry.npmjs.org/@syncfusion/ej2-react-charts)) | Cut. Suite product |
| DevExtreme | 26.1.6, 2026-10-23, commercial ([npm](https://registry.npmjs.org/devextreme)) | Cut. Suite product, not finance-focused |
| Kendo React Charts | 17.0.0, 2026-11-11, commercial ([npm](https://registry.npmjs.org/@progress/kendo-react-charts)) | Cut. Suite product |
| react-financial-charts / react-stockcharts | Last published 2023-05 / 2018-09 ([npm](https://registry.npmjs.org/react-financial-charts)) | Cut. Abandoned |
| webgl-plot | 1.1.2, 2026-02-16, MIT ([npm](https://registry.npmjs.org/webgl-plot)) | Cut. Low-level primitive |
| TradingView Advanced Charts | Public websites only, not redistributable ([FAQ](https://www.tradingview.com/charting-library-docs/latest/getting_started/Frequently-Asked-Questions/)) | Cut. Licence excludes internal apps |

No independent, third-party performance benchmark from 2024-2026 was found. Every published
head-to-head is vendor-run (SciChart, LightningChart, uPlot's author, Gigasoft).

---

## Shortlist and cuts

### Shortlist

| Library | Status | Why it is on the list |
|---|---|---|
| Highcharts (+ Stock) | Spiked | Incumbent baseline. Deepest finance features. Clients already license it |
| AG Charts Enterprise | Spiked | Same vendor and versions as AG Grid. Strong interaction layer. TS-first |
| Apache ECharts | Spiked | Strongest free option. Broad. Finance gaps are buildable |
| amCharts 5 | Scored, not spiked | Most pre-built stock UI. Tests whether "out of the box" beats "build it" |
| SciChart.js | Scored, not spiked | Performance ceiling and best commercial JSON round trip |

### Cuts and reasons

| Library | Reason for the cut |
|---|---|
| Plotly.js | Bundle weight (438 KB gzip for finance alone). WebGL hidden on rangebreak axes. 4-8 WebGL figures per page. Send-to-cloud default |
| TradingView Lightweight Charts | Price charts only, no navigator, no breadth. Would be a second engine, not a replacement |
| TradingView Advanced Charts | Licence covers public websites only |
| LightningChart JS | Imperative API with no serialization. OHLC needs a separate Trading licence |
| Vega-Lite | No candlestick, breaks, WebGL or downsampling. Kept as a spec design reference |
| Observable Plot | No zoom, pan or brush |
| Recharts | No zoom (open since 2017), no candlestick. JSX, not JSON |
| visx | Primitives only. We would rebuild Highstock |
| Nivo | No time-series interaction. No release in 18 months |
| uPlot | No finance features or breadth. Possible later as a sparkline engine |
| Perspective | Pivot widget, not a chart component |
| D3 | Low-level toolkit. See below |
| Other entrants | See table above |

### D3 and low-level: a real charting library wins

Building on D3 (or visx, or uPlot) means XH writes and maintains a charting library. That is the
wrong trade for a consultancy:

- **Feature cost.** Navigator, range buttons, wheel and touch zoom, cross-chart sync, candlestick,
  trading-calendar axes, time zones, downsampling, annotations, export and accessibility are all
  custom code. Highcharts Stock and ECharts ship most of these today.
- **Maintenance cost.** Every browser, React or performance issue becomes XH's to fix. The
  libraries above spread that cost across millions of users.
- **Agent cost.** Agents write better configs against a well-known, documented option object than
  against a private XH rendering layer with no training data.
- **No upside.** D3's flexibility only pays off for bespoke visuals. Hoist apps need standard
  finance charts done well and consistently.

D3 stays useful as a utility for one-off custom marks. It should not be the chart layer.
