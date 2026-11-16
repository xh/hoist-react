# Research: Highcharts, AG Charts, amCharts 5

Researched 2026-11-15. Follows `_research-rubric.md`. Every version and licence claim cites a live source. **[inferred]** marks claims I did not verify directly. **[measured]** marks numbers I produced myself.

Local context: Toolbox pins `highcharts ~12.6.2`, `ag-charts-community ~14.2.0`, `ag-grid-enterprise ~36.2.0` (`../toolbox/client-app/package.json`). hoist-react pins `ag-grid-community ~36.3.0`.

---

## 1. Highcharts (Core + Stock; Dashboards / Grid as context)

### 1.1 Identity

| Item | Value | Source |
|---|---|---|
| Packages | `highcharts` (Core, Stock, Maps, Gantt in one package), `@highcharts/react`, `@highcharts/dashboards`, `@highcharts/grid-pro`, `@highcharts/grid-lite` | npm |
| Current version | **13.1.1**, published 2026-09-20 (security fixes only). 13.0.0 shipped 2026-06-11, 13.1.0 2026-09-18 | `npm view highcharts time`; https://changelog.highcharts.com/ |
| Maintained older lines | 12.6.2 (2026-09-21) and 11.4.9 (2026-09-25) got security backports | `npm view highcharts time` |
| Cadence 2025-26 | 12.2 (Apr 25), 12.3 (Jun 25), 12.4 (Sep 25), 12.5 (Jan 26), 12.6 (Apr 26), 13.0 (Jun 26), 13.1 (Sep 26) | npm |
| Rendering | SVG. Optional Boost module draws with WebGL on a canvas inside the SVG | https://www.highcharts.com/docs/advanced-chart-features/boost-module |
| Maintainer | Highsoft AS (Norway) | https://shop.highcharts.com/license |
| GitHub stars | 12,502 (pushed 2026-11-13) | `gh api repos/highcharts/highcharts` |
| npm weekly downloads | 3,448,380 (`highcharts`), 193,680 (`@highcharts/react`), 9,964 (`@highcharts/dashboards`), week to 2026-11-14 | https://api.npmjs.org/downloads/point/last-week/highcharts |
| Dashboards / Grid | `@highcharts/dashboards` 4.2.3, `@highcharts/grid-pro` 3.2.0, `@highcharts/grid-lite` 3.2.0 | npm |

13.0 notable changes: new `palette` option replaces the Adaptive theme for light/dark; data can be passed as a `DataTable`; gauge redesign "easier for implementers and AI agents"; `dataSorting` moved to its own module; `useHTML` wraps in `div`. 13.1 breaking: standalone navigator `chart` option became `chartOptions`. Source: https://changelog.highcharts.com/

**Hoist impact:** Hoist/Toolbox sit on 12.6.x. Moving to 13 is a major upgrade with breaking changes. `@highcharts/react` 5.x requires `highcharts >= 13.0.0` (`npm view @highcharts/react peerDependencies`).

### 1.2 Licence

Proprietary. XH's clients already license Highcharts.

### 1.3 Time series checklist

Option paths verified in the live options tree `https://api.highcharts.com/highcharts/tree.json` (version 13.1.0, generated 2026-09-18).

| Capability | Rating | Note |
|---|---|---|
| Multi-series; multiple y-axes | **B** | `yAxis` array, `series.yAxis` index. https://api.highcharts.com/highstock/yAxis |
| Stacked panes sharing one time axis | **B** | Multiple `yAxis` with `top`/`height` share one `xAxis`. The standard Stock OHLC+volume pattern. https://www.highcharts.com/docs/stock/technical-indicator-series |
| Navigator + range selector buttons | **B** (Stock) | `navigator`, `rangeSelector.buttons` (1M/3M/YTD/1Y/All built in). Standalone navigator also exists. https://www.highcharts.com/docs/stock/navigator, https://www.highcharts.com/docs/stock/range-selector |
| Zoom + pan | **B** | `chart.zooming` (x/y/xy, mouse wheel), `chart.panning` with `panKey`, pinch on touch. https://api.highcharts.com/highstock/chart.zooming |
| Crosshair + tooltip sync across charts | **C** | `xAxis.crosshair` is built in. Cross-chart sync is a documented demo pattern, about 40 lines of event code. https://www.highcharts.com/demo/highcharts/synchronized-charts. Dashboards has built-in sync. |
| OHLC + candlestick + volume pane | **B** (Stock) | `ohlc`, `candlestick`, `hollowcandlestick`, `hlc`, `heikinashi`, `renko`, `pointandfigure`, `column` volume. tree.json |
| Comparison / rebasing to % change | **B** (Stock) | `series.compare: 'percent' \| 'value'`, `compareStart`, `compareBase`. Recomputes against the first visible point, so it updates on zoom. https://api.highcharts.com/highstock/plotOptions.series.compare |
| Returns, drawdown, rolling windows | **B / C** | `series.cumulative` (cumulative sum on visible range, since 9.3). Rolling means via SMA/EMA indicators. Drawdown is custom code. https://api.highcharts.com/highstock/plotOptions.series.cumulative |
| Technical indicators | **B** (Stock) | 50+ indicator series. From tree.json: abands, ad, ao, apo, aroon, aroonoscillator, atr, bb, cci, chaikin, cmf, cmo, dema, disparityindex, dmi, dpo, ema, ikh, keltnerchannels, klinger, linearregression (+angle/intercept/slope), macd, mfi, momentum, natr, obv, pc, pivotpoints, ppo, priceenvelopes, psar, roc, rsi, slowstochastic, sma, stochastic, supertrend, tema, trendline, trix, vbp, vwap, williamsr, wma, zigzag. https://www.highcharts.com/docs/stock/technical-indicator-series |
| Annotations | **B** | `annotations` module (labels, shapes, `draggable`). Stock Tools adds a user-drawing GUI: indicators, simple shapes, lines, crooked lines, measure, Fibonacci-style "advanced", flags, vertical labels, zoom change, full screen, type change, current price indicator, save chart (tree.json `stockTools.gui.buttons`). https://www.highcharts.com/docs/stock/stock-tools, https://www.highcharts.com/docs/advanced-chart-features/annotations-module |
| Event markers; plot bands / lines | **B** | `flags` series (Stock); `xAxis.plotBands`, `plotLines`. |
| Trading calendar, intraday, time zones | **B** | `xAxis.ordinal` (default on in Stock) removes weekend/overnight gaps. `xAxis.breaks` for explicit gaps. `time.timezone` (IANA). https://api.highcharts.com/highstock/xAxis.ordinal |
| Data grouping / downsampling | **B / C** | `dataGrouping` on by default in Stock. Approximations: average, averages, open, high, low, close, sum, ohlc, range, or a custom function. No built-in LTTB or M4: that needs a custom approximation or pre-processing. https://www.highcharts.com/docs/stock/data-grouping |
| Large-series performance | **B with caveats** | Boost (WebGL): line, column, bar, treemap, heatmap, scatter, bubble, area, areaspline, arearange, columnrange. Default `boostThreshold` 5,000 points. Demos: 500k-point line/area, 1M scatter, 600 series / 600k points. Caveats: no dash styles, no stacking, no negative colours, circle markers only, areas drawn as 1 px columns, tooltips delayed, and **boost does not engage while dataGrouping is on** (Stock default). https://www.highcharts.com/docs/advanced-chart-features/boost-module. Third-party benchmark (ApexCharts, a competitor, 2026-07-20, Highcharts 13.0.0): SVG line 100k points 107 ms, Boost about 160-190 ms floor; 50k-line update 77 ms. https://apexcharts.com/blog/javascript-chart-library-benchmark/ |
| Live / ticking updates | **B** | `series.addPoint(point, redraw, shift)`, `setData`, `xAxis.overscroll`. |

### 1.4 Breadth coverage

From the 119 `plotOptions` types in tree.json.

| Family | Rating | Family | Rating |
|---|---|---|---|
| line/area (non-time) | F | sunburst | F |
| bar/column (stacked) | F | waterfall | F |
| pie/donut | F | sankey | F (`sankey`, `dependencywheel`, `arcdiagram`) |
| scatter | F | network/force | F (`networkgraph`) |
| bubble | F (`bubble`, `packedbubble`) | 3D surface | W (highcharts-3d has `scatter3d`, column/pie 3D; no surface) |
| heatmap | F (`heatmap`, `tilemap`, `contour`) | process flow / org | F (`organization`, `treegraph`, `timeline`) |
| histogram | F (`histogram`, `bellcurve`) | radar/polar | F |
| box plot / violin | F / W (`boxplot`; no violin) | gauge | F (`gauge`, `solidgauge`, redesigned in 13) |
| treemap | F | geo maps | F (Maps add-on) |
| funnel | F (`funnel`, `pyramid`) | | |

### 1.5 Agent / LLM fit

- Config is one declarative options object. Most common cases need no functions. Formatters (`tooltip.formatter`, `dataLabels.formatter`) are functions, but format strings (`pointFormat`, `format` with `{point.y:.2f}`) cover most needs as plain JSON. Persisted JSON options have been a Hoist pattern for years **[inferred]**.
- Types: `highcharts` ships `.d.ts` typings. 13.0.1 fixed missing or mistyped options in the `.d.ts`. https://changelog.highcharts.com/
- JSON schema: no published JSON Schema found. The closest is the machine-readable options tree `https://api.highcharts.com/highcharts/tree.json` (2.6 MB, every option with description, default, products, since) **[measured]**. The official MCP validates config "against the official schema", which is not public as a file. https://www.highcharts.com/mcp/
- Official AI tooling (https://www.highcharts.com/mcp/):
  - **Highcharts Dev Assist MCP** (`https://mcp.highcharts.ai/developers/mcp`): chart recommendation, docs search, examples, chart-type specs, config validation.
  - **Chart Chooser MCP** (`https://chartchooser-mcp.highcharts.ai/mcp`): dataset in, recommended chart and HTML out.
  - **Render MCP** (`https://mcp.highcharts.ai/export/mcp`): config in, PNG out.
  - **Highcharts Assist**, a chat assistant for tech and sales questions.
  - No `llms.txt` (`https://www.highcharts.com/llms.txt` returns 404) **[measured]**.
- Pitfalls for LLMs: Highcharts has a huge option surface (119 series types), so models invent plausible option names. It also has version drift: 13.x renamed several options (navigator `chartOptions`, gauge radius in px, `palette` vs Adaptive theme). Training data is heavy, with 15+ years of public examples **[inferred]**.

### 1.6 React / TS integration

- Official wrapper: `@highcharts/react` 5.4.0 (needs Highcharts >= 13, React >= 18). Legacy `highcharts-react-official` 3.2.3. npm.
- TS: typings shipped. Source is TypeScript **[inferred]**. ESM entry exposed in `package.json` (fixed in 13.0.1). https://changelog.highcharts.com/
- Modularity: Core plus per-feature modules (`modules/boost`, `indicators/*`, `modules/stock-tools`). 13.0 added experimental module autoloading. https://changelog.highcharts.com/
- Size (min / gzip, jsDelivr, 13.1.1) **[measured]**: `highcharts.js` 280 KB / 102 KB; `highstock.js` 382 KB / 136 KB; `boost.js` 47 / 16 KB; `indicators-all.js` 72 / 21 KB; `stock-tools.js` 107 / 30 KB.

### 1.7 Theming

- Two modes: options-based styling, or `chart.styledMode` with CSS classes. https://www.highcharts.com/docs/chart-design-and-style/style-by-css
- 13.0 `palette` option: `light` and `dark` schemes, `colorScheme: 'light dark'` follows the OS or `.highcharts-light` / `.highcharts-dark` classes. It generates CSS variables such as `--highcharts-neutral-color-80`. tree.json `palette`; https://changelog.highcharts.com/

### 1.8 Verdict

**Credibly both.** Stock is the deepest feature set of the three for time series: ordinal axis, compare, cumulative, 50+ indicators, stock tools, flags, dataGrouping. Core covers nearly every breadth family. Weak spots: SVG performance above about 50k points without Boost, Boost's feature losses, and no built-in multi-chart sync outside Dashboards.

**Shortlist: yes.** It is the incumbent and clients already license it. Main cost: the 12 to 13 upgrade.

---

## 2. AG Charts (Community / Enterprise, incl. Financial Charts)

### 2.1 Identity

| Item | Value | Source |
|---|---|---|
| Packages | `ag-charts-community` (MIT), `ag-charts-enterprise` (Commercial), `ag-charts-react` (MIT), plus `ag-charts-types`, `ag-charts-core`, `ag-charts-locale` | `npm view` |
| Current version | **14.3.0**, published 2026-11-04 | `npm view ag-charts-community time`; https://www.ag-grid.com/charts/whats-new/ |
| Major line | v13.0.0 2025-12-10; **v14.0.0 2026-06-24**; 14.1 Aug 5, 14.2 Sep 16, 14.3 Nov 4 2026 | npm; https://www.ag-grid.com/charts/whats-new/ |
| Cadence | Roughly a minor every 6-8 weeks and a major every 6 months | npm |
| Rendering | Canvas 2D (with OffscreenCanvas). No WebGL code in the bundle **[measured: grep of the 14.3.0 UMD]** | jsDelivr |
| Maintainer | AG Grid Ltd (UK) | package LICENSE |
| GitHub stars | 490 (`ag-grid/ag-charts`); 15,687 for `ag-grid/ag-grid` | `gh api` |
| npm weekly downloads | 2,529,897 community; 2,039,108 enterprise; 452,280 `ag-charts-react`. Inflated: `ag-grid-enterprise` 36.3.0 lists both chart packages as `optionalDependencies` | https://api.npmjs.org/downloads/point/last-week/ag-charts-community; `npm view ag-grid-enterprise@36.3.0 optionalDependencies` |

**AG Grid relationship:** `ag-grid-enterprise@36.3.0` has `optionalDependencies` pinned to exactly `ag-charts-community 14.3.0` and `ag-charts-enterprise 14.3.0`. So **AG Grid 36.x pairs with AG Charts 14.x, in lockstep minors (36.3 to 14.3)** (`npm view ag-grid-enterprise@36.3.0`). AG Grid uses AG Charts for two features:

- **Sparklines** (`SparklinesModule.with(AgChartsCommunityModule)`), a Grid Enterprise feature. https://www.ag-grid.com/react-data-grid/sparklines-overview/
- **Integrated Charts** (`IntegratedChartsModule.with(AgChartsEnterpriseModule)`). https://www.ag-grid.com/react-data-grid/integrated-charts-installation/

Toolbox already depends on `ag-charts-community ~14.2.0`, presumably for sparklines **[inferred]**.

### 2.2 Licence

`ag-charts-community` is MIT. `ag-charts-enterprise` is commercial, per developer. https://www.ag-grid.com/charts/license-pricing/

### 2.3 Time series checklist

| Capability | Rating | Note |
|---|---|---|
| Multi-series; multiple y-axes | **B** (Community) | Secondary axes. https://www.ag-grid.com/charts/javascript/axes-secondary/ |
| Stacked panes sharing one time axis | **C** | No multi-pane layout in the docs index (https://www.ag-grid.com/charts/llms.txt). Workaround: separate charts with `sync` (Enterprise), a moderate amount of layout code. The financial chart's `volume: true` overlays volume in the price chart. https://www.ag-grid.com/charts/javascript/financial-charts-configuration/ |
| Navigator + range buttons | **B** (Enterprise) | Navigator with mini chart; Range Buttons / Range Controls (13.2). https://www.ag-grid.com/charts/javascript/navigator/, https://www.ag-grid.com/charts/javascript/range-buttons/ |
| Zoom + pan | **B** (Enterprise) | Wheel, drag-select, pan key, two-finger touch, axis zoom controls, auto-scaling, "stick to end", preserve domain on data change. https://www.ag-grid.com/charts/javascript/zoom/ |
| Crosshair + tooltip sync across charts | **B** (Enterprise) | `sync` shares axis domain, zoom and node interaction (tooltips, crosshairs) across charts. https://www.ag-grid.com/charts/javascript/sync/ |
| OHLC + candlestick + volume | **B** (Enterprise) | Candlestick, OHLC, HLC (14.3), volume, volume profile (14.3). https://www.ag-grid.com/charts/javascript/financial-charts/ |
| Comparison / rebasing to % | **C** | No compare or rebase option in the docs index. Compute it yourself and recompute on zoom events. https://www.ag-grid.com/charts/llms.txt |
| Returns, drawdown, rolling | **C** | No built-in transforms. Compute yourself. |
| Technical indicators | **X / C** | Not built in. "Allow adding technical indicators to financial charts" is backlog item AG-13319. https://www.ag-grid.com/charts/pipeline/. Compute yourself and add as line series. |
| Annotations | **B** (Enterprise) | Text, comment, callout, note, lines, channels, arrows, Fibonacci, date/price ranges, with toolbar, undo/redo, copy/paste. Saved and restored through the Chart State API. https://www.ag-grid.com/charts/javascript/annotations/ |
| Event markers; plot bands / lines | **B** (Community) | Cross Lines (lines and ranges); Background Regions (14.2). https://www.ag-grid.com/charts/javascript/axes-cross-lines/ |
| Trading calendar, intraday, time zones | **B / C** | `ordinal-time` axis removes gaps; `unit-time` and continuous `time` axes; parent-level labels. Time zone: only `utc` true/false is documented, no IANA zones found **[inferred from the API reference]**. Axis breaks are a backlog item (AG-9083). https://www.ag-grid.com/charts/javascript/axes-time/ |
| Data grouping / downsampling | **B (render) / C (OHLC)** | Automatic M4 aggregation for rendering, no config needed. https://www.ag-grid.com/charts/javascript/large-dataset-interactivity/. OHLC re-aggregation on zoom (daily to weekly candles) is not documented **[inferred]**. |
| Large-series performance | **B** | "Optimised to handle large datasets with over 1 million points" (Community feature). Vendor blog: 1M points at over 60 fps, AG Charts 11, 2025-01-14, with no third-party comparison. https://www.ag-grid.com/blog/optimizing-large-data-set-visualisations-with-the-m4-algorithm/. No independent benchmark found. |
| Live / ticking updates | **B** (Community) | `applyTransaction()` at requestAnimationFrame rate; ticking-candle example. https://www.ag-grid.com/charts/javascript/high-frequency-data/. Flash On Update is Enterprise. |

### 2.4 Breadth coverage

Series list from https://www.ag-grid.com/charts/llms.txt. Community / Enterprise split from https://www.ag-grid.com/charts/license-pricing/

| Family | Rating | Family | Rating |
|---|---|---|---|
| line/area | F (Comm) | sunburst | F (Ent) |
| bar/column (stacked) | F (Comm) | waterfall | F (Ent) |
| pie/donut | F (Comm) | sankey | F (Ent), chord F (Ent) |
| scatter | F (Comm) | network/force | - |
| bubble | F (Comm) | 3D surface | - |
| heatmap | F (Ent) | process flow / org | A (Org Chart, Ent, 13.3) |
| histogram | F (Ent) | radar/polar | F (Ent: radar, nightingale, radial bar/column) |
| box plot / violin | F / - (Ent) | gauge | F (Ent: radial, linear) |
| treemap | F (Ent) | geo maps | F (Ent; supply your own topology) |
| funnel | F (Comm, incl. cone funnel, pyramid) | | |

Note: Community alone is only basic cartesian, pie, and funnel. Every breadth family that matters to XH needs Enterprise.

### 2.5 Agent / LLM fit

- A single declarative options object (`AgChartOptions`), close to JSON. Formatters, stylers and tooltip renderers are functions, but they are needed less often **[inferred]**. Chart State API (`getState` / `setState`) saves zoom, annotations and legend state as JSON, a good fit for persistence. https://www.ag-grid.com/charts/javascript/api-state/
- Types: TS-first; `ag-charts-types` package; TS generics docs. https://www.ag-grid.com/charts/javascript/ts-generics/
- JSON schema: none found. Development-time Validation (14.2) reports bad options as console errors, an overlay, throws or events. Useful for an agent loop. https://www.ag-grid.com/charts/javascript/dev-validation/
- Official AI tooling:
  - `llms.txt` plus a `.md` copy of every docs page. https://www.ag-grid.com/charts/llms.txt
  - AG Skills (`ag-dev`, `ag-update`) via `npx skills add ag-grid/skills`. https://www.ag-grid.com/charts/javascript/skills/, https://github.com/ag-grid/skills
  - `ag-mcp` MCP server. Its npm description covers AG Grid only (`npm view ag-mcp`, 1.0.0). https://www.ag-grid.com/react-data-grid/mcp-server/
- Pitfalls: options changed shape across v13 (simplified axis config, axes as object keyed `x`/`y`) and v14. Older training data shows the array form **[inferred: the 14.3 example uses `axes: { x: {...} }`]**. Enterprise modules must be registered, or features silently do nothing or warn. Training data is thinner than Highcharts: 490 GitHub stars, a younger library **[inferred]**.

### 2.6 React / TS integration

- Official `ag-charts-react` 14.3.0 (MIT, React 18/19). `npm view ag-charts-react peerDependencies`
- ModuleRegistry tree-shaking since v13. "Bundle Size Reduction". https://www.ag-grid.com/charts/javascript/module-registry/
- Full UMD bundles (min / gzip, 14.3.0) **[measured]**: community 1.44 MB / 434 KB; enterprise 2.57 MB / 741 KB. Tree-shaken size depends on modules: not measured.

### 2.7 Theming

- Built-in themes, each with a dark variant (`ag-default-dark`, `ag-sheets-dark`, `ag-polychroma-dark`, `ag-vivid-dark`, `ag-material-dark`). Financial charts use only `ag-financial` / `ag-financial-dark`. https://www.ag-grid.com/charts/javascript/themes/
- v14.0 added CSS variables, colour mixing and HSL. 14.3 added Theme Builder and more theme parameters. https://www.ag-grid.com/charts/whats-new/
- Shares a design language with AG Grid, a plus for Hoist visual consistency **[inferred]**.

### 2.8 Verdict

**Generalist with a growing financial layer.** It has a strong navigator, zoom, sync, annotations and live-update story, plus good large-data defaults. It lacks technical indicators, compare/rebase, multi-pane layout, named time zones and axis breaks. All the advanced time-series features are Enterprise.

**Shortlist: yes, conditional.** It aligns with AG Grid (same vendor, lockstep versions, themes; Toolbox already pulls `ag-charts-community`) and it is TS-first with good agent tooling. But finance features would need custom code.

---

## 3. amCharts 5 (incl. Stock Chart)

### 3.1 Identity

| Item | Value | Source |
|---|---|---|
| Packages | `@amcharts/amcharts5` (all chart types incl. stock), `@amcharts/amcharts5-geodata`, `@amcharts/amcharts5-react` (5.0.1, new Oct 2026), `@amcharts/amcharts5-mcp` 1.9.4 | npm |
| Current version | **5.21.5**, published 2026-10-26 | `npm view @amcharts/amcharts5 time`; `CHANGELOG.md` in package |
| Cadence | Very frequent patches: 40+ releases in 2026 (5.15.0 Jan 2 to 5.21.5 Oct 26). The project does **not** follow semver ("while following numbering syntax, it DOES NOT adhere to Semantic Versioning") | npm; package `CHANGELOG.md` |
| Rendering | Canvas by default. SVG renderer added in 5.21.0 (2026-10-08) | package `CHANGELOG.md`; https://www.amcharts.com/llms.txt |
| Maintainer | amCharts (Lithuania), copyright Antanas Marcelionis | package `LICENSE`; https://www.amcharts.com/pricing/ |
| GitHub stars | 451 | `gh api repos/amcharts/amcharts5` |
| npm weekly downloads | 452,285 | https://api.npmjs.org/downloads/point/last-week/@amcharts/amcharts5 |

### 3.2 Licence

Free linkware licence that keeps the amCharts branding link visible, or a commercial licence per developer per product. Package `LICENSE`; https://www.amcharts.com/pricing/

### 3.3 Time series checklist

| Capability | Rating | Note |
|---|---|---|
| Multi-series; multiple y-axes | **B** | Multiple `ValueAxis`, `syncWithAxis`. Package `docs/references/xy.md` |
| Stacked panes sharing one time axis | **B** | `StockChart.panels` (each a `StockPanel` XY chart). Plain XYChart can stack y-axes vertically. https://docs.amcharts.com/v5/charts/stock/ |
| Navigator + range buttons | **B** | `XYChartScrollbar` with a preview series; Stock `PeriodSelector` (incl. YTD) and `DateRangeSelector`. Package `docs/references/stock.md` |
| Zoom + pan | **B** | `wheelX`/`wheelY`, `panX`/`panY`, `XYCursor` `behavior: zoomX`. |
| Crosshair + tooltip sync across charts | **B** | `XYCursor.syncWith: XYCursor[]` (typings `XYCursor.d.ts`). Stock panels share a cursor. |
| OHLC + candlestick + volume | **B** | `CandlestickSeries`, `OHLCSeries`, Heikin Ashi; volume panel pattern in docs. Package `docs/references/stock.md` |
| Comparison / rebasing to % | **B** | Series `valueYShow: "valueYChangeSelectionPercent"` rebases to the start of the visible selection. Stock `ComparisonControl`, `setPercentScale()`. Typings `XYSeries.d.ts`, `StockChart.d.ts` |
| Returns, drawdown, rolling | **B / C** | `valueYChangePrevious(Percent)` gives period returns. Rolling means via indicators. Drawdown is custom. |
| Technical indicators | **B** | 35+: Acceleration Bands, A/D, ASI, Aroon, ATR, Awesome Osc., Bollinger, Bull/Bear Power, Chaikin MF/Osc., CCI, Disparity, Heikin Ashi, MACD, MA Cross, Median Price, Momentum, MA (SMA/EMA/...), MA Deviation/Envelope, OBV, PVT, RSI, Std Dev, Stochastic (+Momentum Index), SuperTrend, TRIX, Typical Price, Volume, Volume Profile, VWAP, Williams %R, ZigZag. Package `.internal/charts/stock/indicators/` |
| Annotations | **B** | Drawing tools: trend line, Fibonacci (+timezone), parallel channel, regression, callout, label, doodle, polyline, ellipse, rectangle, horizontal/vertical lines and rays, measure, icons. Saved via `DataSaveControl`. Package `.internal/charts/stock/drawing/` |
| Event markers; plot bands / lines | **B** | Axis ranges (bands, lines); `IconSeries` / bullets for flags. `docs/references/xy.md` "Axis ranges" |
| Trading calendar, intraday, time zones | **B** | `GaplessDateAxis` removes gaps. `root.timezone` (IANA). 5.21.1: selectors honour time zone, and "Charts with `root.timezone` are also much faster (up to 16 times)". https://docs.amcharts.com/v5/charts/xy-chart/axes/gapless-date-axis/; `docs/references/stock.md` |
| Data grouping / downsampling | **B** | `DateAxis.groupData: true` with `groupIntervals`; OHLC-aware aggregation. No LTTB / M4. https://docs.amcharts.com/v5/charts/xy-chart/axes/date-axis/ |
| Large-series performance | **C** | No published numeric benchmark found. Demos: 50k points with grouping, scatter with "tens of thousands" of points; `turboMode` for column/candlestick (5.14.0). No WebGL. https://www.amcharts.com/demos/data-grouping-50k-points/ |
| Live / ticking updates | **B** | `series.data.push / setIndex`; indicators use `updateData()` for speed. Package `CHANGELOG.md` |

### 3.4 Breadth coverage

From https://www.amcharts.com/llms.txt and the package `docs/references/`.

| Family | Rating | Family | Rating |
|---|---|---|---|
| line/area | F | sunburst | F |
| bar/column (stacked) | F | waterfall | A (`openValueYField` columns) |
| pie/donut | F | sankey | F (+ chord, arc diagram) |
| scatter | F | network/force | F (`ForceDirected`) |
| bubble | A (scatter + heat rules on bullet radius) | 3D surface | - |
| heatmap | A (ColumnSeries on two category axes + heat rules) | process flow / org | A (`Tree`, `Partition`; Gantt product) |
| histogram | W (bin yourself) | radar/polar | F |
| box plot / violin | W / - | gauge | F (radar + clock hand) |
| treemap | F (+ Voronoi treemap) | geo maps | F (separate Maps product) |
| funnel | F (funnel, pyramid, pictorial) | | |

### 3.5 Agent / LLM fit

- Imperative object API in code (`am5xy.LineSeries.new(root, {...})`), which is less natural for JSON. **But** there is an official JSON format: `JsonParser` builds a chart from config, `ChartSerializer` saves a live chart back to JSON, and `<am5-chart>` takes a JSON config (5.21.0). The format is verbose, with `type` / `settings` / `properties` / `refs`, `{ "type": "Color", "value": "#..." }` wrappers, `#`/`@` ref strings, and ordered `refs` groups. Package `docs/references/json.md`; https://docs.amcharts.com/v5/concepts/serializing/
- Easy to get subtly wrong. The package's own JSON doc lists silent failures: settings beside `type` "are silently ignored", a bare hex colour is read as a ref and throws, label text starting `#` throws, and refs in the wrong group fail. Package `docs/references/json.md`
- Types: TS-first; typings "catch most wrong setting names". Package `AGENTS.md`
- JSON schema: none found.
- Official AI tooling (most of the three):
  - `AGENTS.md`, `docs/` and `examples/` shipped inside the npm package (from 5.21.0).
  - `llms.txt` and `llms-full.txt`.
  - MCP server `@amcharts/amcharts5-mcp` (docs, examples, API reference).
  - Claude plugin and connector in Anthropic's directory; skill repo; `.cursorrules`.
  - https://www.amcharts.com/llms.txt, https://docs.amcharts.com/v5/ai/mcp/
- Training data: amCharts 4 vs 5 confusion is a known risk. Their own docs warn "do not use amCharts 4 syntax". https://www.amcharts.com/llms.txt

### 3.6 React / TS integration

- Official `@amcharts/amcharts5-react` (React 18+): `<AmChart config={...}/>` or `useAmChart(setup, deps)`. Released with 5.21.4 (2026-10-23), very new: 122 downloads/week. https://www.amcharts.com/llms.txt; https://api.npmjs.org/downloads/point/last-week/@amcharts/amcharts5-react
- Per-family entry points (`index`, `xy`, `stock`, `hierarchy`, `flow`, `map`, ...). Package unpacked size 27.5 MB (`npm view dist.unpackedSize`).
- Size (CDN min / gzip, 5.x) **[measured]**: `index.js` 535 KB / 148 KB, `xy.js` 187 / 46 KB, `stock.js` 369 / 80 KB. A stock chart is about 274 KB gzip before d3 dependencies are counted. The npm build pulls in d3 modules, pdfmake and markerjs2 as deps (`npm view @amcharts/amcharts5 dependencies`).

### 3.7 Theming

- Theme classes applied in code (`am5themes_Animated`, `Dark`, `Adaptive`, `Monochrome`, `Material`, `Nord`, `Colorblind`, ...). `interfaceColors` for UI colours. Themes cannot live in a JSON config. Package `docs/references/json.md`; `CHANGELOG.md` 5.21.2-5.21.3
- No CSS-variable theming found **[inferred]**. Dark mode via the `Dark` theme or Adaptive.

### 3.8 Verdict

**Credibly both, strongest pre-built stock UI.** Panels, toolbar, 35+ indicators, a drawing toolkit, comparison and percent scale, gapless axis and IANA time zones are all built in. Breadth is wide, including force-directed and Voronoi. Weak spots: no WebGL and no published performance numbers, an imperative API with a verbose JSON format, frequent non-semver releases, and a brand-new React package.

**Shortlist: maybe, as the "max stock features out of the box" option.** Its JSON round-trip (`ChartSerializer` / `JsonParser`) is uniquely relevant to "describable and persisted as JSON", but the format is unpleasant for humans to hand-author.

---

## Surprises / things that contradict common assumptions

1. **Highcharts 13 is out** (13.0.0 on 2026-06-11, now 13.1.1). Hoist and Toolbox are a major behind on 12.6.x, and the new official `@highcharts/react` 5.x requires Highcharts 13. https://changelog.highcharts.com/; `npm view @highcharts/react peerDependencies`
2. **Every AG Charts time-series essential is Enterprise.** That covers navigator, zoom, pan, crosshair, sync, candlestick/OHLC, range buttons, annotations, and even animations and heatmap. Community is basic line/bar/area/scatter/pie only. https://www.ag-grid.com/charts/license-pricing/
3. **AG Charts has no technical indicators.** They are an open backlog request (AG-13319). Axis breaks are also backlog (AG-9083). https://www.ag-grid.com/charts/pipeline/
4. **AG Charts versions are locked to AG Grid.** `ag-grid-enterprise@36.3.0` pins `ag-charts-* 14.3.0` exactly as optional deps, so a Hoist AG Charts upgrade is tied to the AG Grid upgrade. `npm view ag-grid-enterprise@36.3.0`
5. **Highcharts Boost is not free speed.** It does not engage while Stock `dataGrouping` is on (the default). It drops dash styles and stacking, draws areas as 1 px columns, and in a competitor's benchmark has a 160-190 ms floor that is slower than plain SVG below about 20k points. https://www.highcharts.com/docs/advanced-chart-features/boost-module; https://apexcharts.com/blog/javascript-chart-library-benchmark/
6. **amCharts 5 renders to canvas, not SVG.** An SVG renderer only arrived in 5.21.0 (Oct 2026). https://www.amcharts.com/llms.txt
7. **amCharts has the only official chart-to-JSON round trip** (`ChartSerializer` and `JsonParser`) **and the most AI tooling**: AGENTS.md in the npm package, an MCP server, and a Claude plugin. Its JSON dialect is verbose and full of silent-failure traps. Package `docs/references/json.md`; https://www.amcharts.com/llms.txt
8. **amCharts does not follow semver** and ships patch releases weekly. Pinning and upgrade testing would need care. Package `CHANGELOG.md`
9. **AG Charts and AG Grid ship `.md` docs for every page plus `llms.txt`. Highcharts has no `llms.txt` (404)** but runs three hosted MCP servers instead. https://www.ag-grid.com/charts/llms.txt; https://www.highcharts.com/mcp/
10. **No vendor publishes a JSON Schema for options.** Highcharts' `tree.json` (2.6 MB) is the closest machine-readable option catalog. https://api.highcharts.com/highcharts/tree.json
