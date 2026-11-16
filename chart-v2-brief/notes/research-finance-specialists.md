# Research: finance / performance specialists

Scope: TradingView Lightweight Charts (+ Advanced Charts licence note), SciChart.js, LightningChart JS, uPlot, plus an "other entrants" scan. Researched 2026-11-15. Every version and licence claim cites a URL. **[inferred]** marks anything not verified at a live source.

Size note: where no bundlephobia figure exists, sizes below come from `gzip -9` of the published dist file fetched from jsDelivr on 2026-11-15. This is a rough proxy, not a tree-shaken app bundle.

Rating keys. Time series: **B** built in, **C** custom code, **X** not practical. Breadth: **F** first-class, **A** adequate, **W** awkward, **-** absent.

---

## 1. TradingView Lightweight Charts (LWC)

### Identity

| Item | Value |
|---|---|
| Package | `lightweight-charts` |
| Version | 5.3.0, 2026-11-10 ([npm](https://registry.npmjs.org/lightweight-charts), [GH release](https://github.com/tradingview/lightweight-charts/releases)) |
| Rendering | HTML5 Canvas 2D |
| Maintainer | TradingView, Inc. |
| Cadence | 5.0.x line Jan-Oct 2025, then 5.1.0 (2025-12-16), 5.2.0 (2026-04-24), 5.2.1 (2026-08-12), 5.3.0 (2026-11-10) ([npm time data](https://registry.npmjs.org/lightweight-charts)) |
| Stars | ~17.9k ([GitHub API](https://api.github.com/repos/tradingview/lightweight-charts)) |
| Weekly downloads | ~1.79M (week ending 2026-11-14) ([npm API](https://api.npmjs.org/downloads/point/last-week/lightweight-charts)) |

v5 changes ([release notes](https://tradingview.github.io/lightweight-charts/docs/release-notes)):
- 5.0: **multi-pane support**, unified `addSeries` API, plugin architecture (watermarks and markers moved to plugins, pane primitives added), Yield Curve and Options chart types, ESM only.
- 5.0.8: pane API grows (`addPane`, stretch factors).
- 5.1: opt-in **data conflation** for large datasets.
- 5.2: series hit testing, `hoveredSeriesOnTop`.
- 5.2.1: **AI agent skill** added to the repo.
- 5.3: monotone curved lines, stricter `YYYY-MM-DD` business-day strings.

### Licence

- Apache-2.0, with an attribution link requirement that the `attributionLogo` option satisfies ([LICENSE](https://github.com/tradingview/lightweight-charts/blob/master/LICENSE), [README, License](https://github.com/tradingview/lightweight-charts#license)).

**TradingView Advanced Charts (licence note):**
- Official FAQ: "according to the license agreement you can use the library on public websites only" ([FAQ](https://www.tradingview.com/charting-library-docs/latest/getting_started/Frequently-Asked-Questions/)).
- Source sits in private repos, access is by request, and the library is not redistributable ([quick start, via search](https://br.tradingview.com/charting-library-docs/latest/getting_started/quick-start)).
- **Net: internal apps at financial firms look ineligible, and Hoist cannot redistribute it. Cut.**

### Time series checklist

| Feature | Rating | Note |
|---|---|---|
| Multi-series; multiple y-axes | B | Left/right plus overlay price scales ([two price scales](https://tradingview.github.io/lightweight-charts/examples/price-scales/two-price-scales)). Only 2 visible side scales per pane **[inferred from API]** |
| Stacked panes sharing time axis | B | v5 panes ([panes example](https://tradingview.github.io/lightweight-charts/examples/panes/multiple-panes)) |
| Navigator + range buttons | C / C | No navigator component; build one from a second chart plus range sync (~150-300 LOC **[inferred]**). Range buttons are a simple `setVisibleRange` ([visible range example](https://tradingview.github.io/lightweight-charts/examples/time-scale/visible-range)) |
| Zoom + pan (wheel, drag, touch) | B | Default `handleScroll` / `handleScale` options |
| Crosshair sync across charts | C (small) | Official example, ~30 LOC ([sync crosshairs](https://tradingview.github.io/lightweight-charts/examples/crosshair/sync-crosshairs)) |
| OHLC + candlestick + volume | B | Candlestick, Bar, Histogram series; volume via overlay scale or pane ([price and volume](https://tradingview.github.io/lightweight-charts/examples/price-scales/price-and-volume)) |
| Rebasing to % change (updates on zoom) | **B** | `PriceScaleMode.Percentage` and `IndexedTo100`: "percentage values according the first visible value" (typings in [5.3.0 package](https://unpkg.com/lightweight-charts@5.3.0/dist/typings.d.ts); [modes example](https://tradingview.github.io/lightweight-charts/examples/price-scales/price-scale-modes)) |
| Returns / drawdown / rolling | C | Compute yourself. Indicator examples (Percent Change, Momentum, SMA, Correlation) are copy-paste source, not a package ([analysis indicators](https://tradingview.github.io/lightweight-charts/tutorials/analysis-indicators)) |
| Technical indicators | C | Same examples only. No EMA/Bollinger/MACD/RSI in core |
| Annotations | B / C | Series markers and price lines are B ([markers](https://tradingview.github.io/lightweight-charts/examples/markers-and-lines/series-markers)). Shapes need primitives (C). No user drawing tools (C, large) |
| Event markers; plot bands/lines | B / C | Markers and price lines B. Vertical lines and session bands ship as plugin packages (`lwc-plugin-vertical-line`, `lwc-plugin-session-highlighting`) ([packages](https://github.com/tradingview/lightweight-charts/tree/master/packages)) |
| Trading calendar / gaps / TZ | B / B / C | Time scale is index (logical) based ([time scale docs](https://tradingview.github.io/lightweight-charts/docs/time-scale)), so gaps collapse **[inferred: docs never say "weekends"]**. Intraday is fine. "Lightweight Charts™ does not natively support time zones" - shift timestamps yourself ([time zones](https://tradingview.github.io/lightweight-charts/docs/time-zones)) |
| Grouping / downsampling | B (basic) | 5.1 data conflation merges points when zoomed out, with a custom reducer hook ([release notes](https://tradingview.github.io/lightweight-charts/docs/release-notes)). No OHLC re-aggregation on zoom |
| Large-series perf | not found | No published benchmark or documented point limit found |
| Live updates | B | `series.update()` ([realtime example](https://tradingview.github.io/lightweight-charts/examples/data/realtime-updates)) |

### Breadth

| Family | Rating | Family | Rating |
|---|---|---|---|
| line/area (non-time) | W (Yield Curve / custom horizontal scale charts) | waterfall | - |
| bar/column (stacked) | W (stacked-bars plugin package) | sankey | - |
| pie/donut | - | network | - |
| scatter | W (scatter plugin package) | 3D surface | - |
| bubble | - | diagram/org | - |
| heatmap | W (`@tradingview/lwc-plugin-heatmap-series`, time-based only) | radar/polar | - |
| histogram | W (histogram plugin packages) | gauge | - |
| box/violin | W (box-whisker plugin) | geo | - |
| treemap / sunburst | - / - | funnel | - |

Plugin package list: [packages/](https://github.com/tradingview/lightweight-charts/tree/master/packages).

### Agent / LLM fit

- Chart and series options are plain objects (JSON-friendly). The chart itself is built imperatively (`createChart`, `addSeries`, `setData`), so there is no single serializable spec. Formatters are functions.
- Written in TypeScript with good typings. No JSON schema.
- Ships two official **Agent Skills** (`lightweight-charts`, `lightweight-charts-plugin-authoring`) for Claude Code and Codex, installable via `npx skills add tradingview/lightweight-charts` ([README, AI coding assistants](https://github.com/tradingview/lightweight-charts#ai-coding-assistants)). Repo also has `context7.json`.
- v4 to v5 API change (`addLineSeries` to `addSeries(LineSeries)`) is a common LLM foot-gun. The skill exists for exactly this reason (same README section).

### React / TS

- No official React component. There is a React tutorial ([react/simple](https://tradingview.github.io/lightweight-charts/tutorials/react/simple)).
- TS-first and tree-shakeable. Repo size-limit targets: 53 KB brotli for the full ESM, 45 KB for `createChart` alone ([.size-limit.js](https://github.com/tradingview/lightweight-charts/blob/master/.size-limit.js)). Measured ~61 KB gzip for `lightweight-charts.production.mjs` 5.3.0.

### Theming

- Options-based (`layout.background`, `textColor`, `grid`, per-series colors). No CSS variables. Dark mode means swapping option sets **[inferred from API]**.

### Verdict

- **Time-series specialist** (narrow: price charts only, with no non-time chart types in core).
- Shortlist **yes, as a narrow candidate for the price/candlestick view**: it is free, tiny, very widely used, and agent-ready. It has no navigator or breadth, so it cannot be Hoist's only chart library.

---

## 2. SciChart.js

### Identity

| Item | Value |
|---|---|
| Packages | `scichart` 6.0.16 (2026-11-06), `scichart-react` 2.3.0 (MIT, 2026-11-12), `scichart-financial-tools` 6.0.14 (2026-10-22) ([npm](https://registry.npmjs.org/scichart), [npm](https://registry.npmjs.org/scichart-react), [npm](https://registry.npmjs.org/scichart-financial-tools)) |
| Rendering | WebGL + **WebGPU** (new in v6) + WebAssembly engine ([README](https://cdn.jsdelivr.net/npm/scichart@6.0.16/README.md)) |
| Maintainer | SciChart Ltd (ABT Software) |
| Cadence | v6.0 announced 2026-07-30 ([v6 release](https://www.scichart.com/scichart-js-v6-released/)). 6.0.1 on npm 2026-09-24. Patch releases roughly weekly to fortnightly Sep-Nov 2026 ([npm](https://registry.npmjs.org/scichart)) |
| Stars | Library source is closed. Examples repo has ~117 ([GitHub API](https://api.github.com/repos/ABTSoftware/SciChart.JS.Examples)) |
| Weekly downloads | ~102.5k `scichart`, ~8.9k `scichart-react` ([npm API](https://api.npmjs.org/downloads/point/last-week/scichart)) |

v6 headline items ([README](https://cdn.jsdelivr.net/npm/scichart@6.0.16/README.md), [v6 release](https://www.scichart.com/scichart-js-v6-released/)):
- WebGPU renderer, "selected automatically on Apple Silicon Macs, with WebGL used everywhere else".
- Tree-shakeable ESM build.
- One modular wasm, with 3D lazy-loaded.
- Optional wasm64 (about 1B XY points).
- Parallel Coordinate Plot.

### Licence

- Commercial, per developer, domain-locked ([EULA](https://www.scichart.com/scichart-eula/)).
- Each standard licence covers "up to 5 projects, including 5 production hostnames and 10 test hostnames". "Additional Hostnames/Domains are not available for purchase" ([domain licensing FAQ](https://support.scichart.com/support/solutions/articles/101000515345-scichart-js-domain-licensing-faq)).
- The free Community edition bars "Deployment of commercial applications to websites, app stores, **intranets**" ([community licensing](https://www.scichart.com/community-licensing/)).

### Time series checklist

| Feature | Rating | Note |
|---|---|---|
| Multi-series; multiple y-axes | B | Secondary/multiple axes demos ([examples repo](https://github.com/ABTSoftware/SciChart.JS.Examples/tree/dev_v6.x/Examples/src/components/Examples/Charts2D/ModifyAxisBehavior)) |
| Stacked panes | B | SubCharts API and multi-pane stock chart demo ([CreateStockCharts](https://github.com/ABTSoftware/SciChart.JS.Examples/tree/dev_v6.x/Examples/src/components/Examples/Charts2D/CreateStockCharts)) |
| Navigator + range buttons | B / C | `SciChartOverview` class in typings ([SciChartOverview.d.ts](https://cdn.jsdelivr.net/npm/scichart@6.0.16/types/Charting/Visuals/SciChartOverview.d.ts)). Range buttons are custom (small) |
| Zoom + pan | B | Wheel, zoom-pan, pinch and drag-axis modifiers ([ZoomingAndPanning demos](https://github.com/ABTSoftware/SciChart.JS.Examples/tree/dev_v6.x/Examples/src/components/Examples/Charts2D/ZoomingAndPanning)) |
| Crosshair sync across charts | B | `modifierGroup` on modifiers; SyncMultiChart demo ([ChartModifierBase.d.ts](https://cdn.jsdelivr.net/npm/scichart@6.0.16/types/Charting/ChartModifiers/ChartModifierBase.d.ts)) |
| OHLC + candle + volume | B | `FastCandlestickRenderableSeries`, `FastOhlcRenderableSeries`. Heikin-Ashi, Renko and P&F via filters (5.2) ([v5.2 release](https://www.scichart.com/scichart-js-v5-2-released/)) |
| Rebasing to % (on zoom) | C (small) | "PercentageChange" filter demo ([Filters demos](https://github.com/ABTSoftware/SciChart.JS.Examples/tree/dev_v6.x/Examples/src/components/Examples/Charts2D/Filters)). No one-flag mode |
| Returns / drawdown / rolling | C | Filter API (`XyCustomFilter`, `XyMovingAverageFilter`, ratio, scale-offset) recomputes on data change |
| Technical indicators | C | Only an MA filter is built in. The MACD/RSI demo computes them by hand (`calcAverageForArray`) ([MultiPaneStockCharts](https://github.com/ABTSoftware/SciChart.JS.Examples/blob/dev_v6.x/Examples/src/components/Examples/Charts2D/CreateStockCharts/MultiPaneStockCharts/drawExample.ts)) |
| Annotations | B | Editable and HTML annotations, plus `scichart-financial-tools`: Fibonacci, pitchfork, channels, measure, SL/TP, freehand ([v5.2 release](https://www.scichart.com/scichart-js-v5-2-released/)) |
| Event markers; bands/lines | B | Line/box annotations; EventMarkers and TradeMarkers demos ([examples](https://github.com/ABTSoftware/SciChart.JS.Examples/tree/dev_v6.x/Examples/src/components/Examples)) |
| Trading calendar / gaps / TZ | B / B / not found | `DiscontinuousDateAxis` is "designed for ... weekday only financial data" ([typings](https://cdn.jsdelivr.net/npm/scichart@6.0.16/types/Charting/Visuals/Axis/DiscontinuousDateAxis.d.ts)). Time zone support not verified |
| Grouping / downsampling | B | `EResamplingMode` MinMax/Auto/etc. ([typings](https://cdn.jsdelivr.net/npm/scichart@6.0.16/types/Charting/Numerics/Resamplers/ResamplingMode.d.ts)). OHLC AutoSimplify in v6 ([v6 release](https://www.scichart.com/scichart-js-v6-released/)) |
| Large-series perf | B | Vendor claims: ~40M points/s ingest ([Chart Bench 2026](https://www.scichart.com/blog/chart-bench-compare-javascript-chart-libraries/)). WebGPU vs WebGL in a 12-widget dashboard: 58.1 vs 28.1 fps on M4, 20.3 vs 6.1 fps on Intel UHD ([v6 release](https://www.scichart.com/scichart-js-v6-released/)). Vendor-published |
| Live updates | B | FIFO/append data series; realtime ticking stock chart demo |

### Breadth

| Family | Rating | Family | Rating |
|---|---|---|---|
| line/area | F | waterfall | W (rectangle-series demo) |
| bar/column (stacked) | F | sankey | - |
| pie/donut | A (`SciChartPieSurface`) | network | W (force-directed demo) |
| scatter | F | 3D surface | F (`SurfaceMeshRenderableSeries3D`) |
| bubble | F | diagram/org | W (Gantt demo only) |
| heatmap | F (uniform, non-uniform, contours) | radar/polar | F (full polar surface family) |
| histogram | A (demo) | gauge | A (polar/linear gauge demos) |
| box/violin | A / - (`FastBoxPlotRenderableSeries`) | geo | W (map demos) |
| treemap / sunburst | W (d3-hierarchy + rectangles) / A (polar sunburst demo) | funnel | - |

Sources: [examples tree](https://github.com/ABTSoftware/SciChart.JS.Examples/tree/dev_v6.x/Examples/src/components/Examples), [TreemapChart demo](https://github.com/ABTSoftware/SciChart.JS.Examples/blob/dev_v6.x/Examples/src/components/Examples/Charts2D/v4Charts/TreemapChart/drawExample.ts) (imports `d3-hierarchy`).

### Agent / LLM fit

- **Builder API = real JSON round trip.**
  - `sciChartSurface.toJSON(excludeData)` serializes a chart.
  - `JSON.parse(json, chartBuilder.chartReviver)` plus `build2DChart` rehydrates it.
  - Definitions are `{type, options}` trees ([serialization docs](https://www.scichart.com/documentation/js/v4/2d-charts/builder-api/charts-serialization-deserialization/)).
- Functions are referenced by name. `registerFunction(baseType, name, fn)` lives in the class factory ([classFactory.d.ts](https://cdn.jsdelivr.net/npm/scichart@6.0.16/types/Core/classFactory.d.ts)).
- v6 caveat: type strings do not pull code into the bundle. You must call per-type `register*` or `registerAllTypes()`, "roughly doubling" bundle size ([register/all.d.ts](https://cdn.jsdelivr.net/npm/scichart@6.0.16/types/Builder/register/all.d.ts)).
- Strong TS types (`ISciChart2DDefinition` etc.). No JSON schema found.
- Low public-code footprint (closed source, ~100k downloads/week), so expect weaker LLM recall **[inferred]**.
- AI tooling: SciChart-GPT chat assistant. An MCP server was tested internally on 2026-03-31, "restricted for now" ([SciChart-GPT changelog](https://www.scichart.com/changelog/scichart-gpt/)). No public MCP.

### React / TS

- Official `scichart-react` (MIT). TS-first. Tree-shakeable since v6.
- Payload, measured: `_wasm/scichart.wasm` is 1.65 MB raw, ~0.85 MB gzip. `index.min.js` is 2.35 MB raw, ~0.51 MB gzip ([jsDelivr file list](https://data.jsdelivr.com/v1/packages/npm/scichart@6.0.16)).
- Vendor figures: React+Vite JS bundle 428 KB gzip; builder-based bundle ~155 KB ([v6 release](https://www.scichart.com/scichart-js-v6-released/)).
- Wasm files must be served or copied, or loaded from their CDN ([README](https://cdn.jsdelivr.net/npm/scichart@6.0.16/README.md)).

### Theming

- `IThemeProvider` objects, with built-in Dark, Dark v2, Light and Navy themes plus a custom-theme demo and ThemeManager ([theme typings](https://data.jsdelivr.com/v1/packages/npm/scichart@6.0.16)). Not CSS variables. Dark mode is first-class (dark is the default look).

### Verdict

- **Credibly both.** Strong finance features (discontinuous axis, overview, drawing tools, resampling) plus wide scientific breadth (heatmap, 3D surface, polar).
- Shortlist **yes, but conditional on licensing**. The JSON builder is the best agent fit of this group. Hostname-capped, domain-locked licences are a poor fit for a toolkit shipped to many clients.

---

## 3. LightningChart JS (LCJS)

### Identity

| Item | Value |
|---|---|
| Packages | `@lightningchart/lcjs` 9.1.0 (2026-11-03) ([npm](https://registry.npmjs.org/@lightningchart/lcjs)). Legacy `@arction/lcjs` last 5.2.1 (2024). `@lightningchart/lcjs-trader` 4.1.3 (2026-09-30) ([npm](https://registry.npmjs.org/@lightningchart/lcjs-trader)) |
| Rendering | WebGL (no WebGPU references in 9.1.0 typings) ([lcjs.d.ts](https://cdn.jsdelivr.net/npm/@lightningchart/lcjs@9.1.0/dist/lcjs.d.ts)) |
| Maintainer | LightningChart Ltd (Finland) |
| Cadence | Majors 7.0 (2025-02), 8.0 (2025-08), 9.0 (2026-08-04), minors in between ([npm](https://registry.npmjs.org/@lightningchart/lcjs)) |
| Weekly downloads | ~15.7k (`@lightningchart/lcjs`) + ~38.7k legacy `@arction/lcjs`; Trader ~58 ([npm API](https://api.npmjs.org/downloads/point/last-week/@lightningchart%2Flcjs)) |

v9.0 (2026-08): DataSet overhaul, multi-threaded streaming (vendor: 10M points/s), negative log / symlog axes, BigInt storage. MCP server supports STDIO and HTTPS ([v9 announcement](https://lightningchart.com/news/lightningchart-js-v9-0-0/), via search, since lightningchart.com returns 403 to fetchers).

### Licence

- Commercial, per developer, domain-locked. A licence key is required even to run ([LICENSE](https://cdn.jsdelivr.net/npm/@lightningchart/lcjs@9.1.0/LICENSE), [README](https://cdn.jsdelivr.net/npm/@lightningchart/lcjs@9.1.0/README.md)).
- **OHLC is gated:** "OHLC Series is only usable with a Trading license for LightningChart JS" ([lcjs.d.ts](https://cdn.jsdelivr.net/npm/@lightningchart/lcjs@9.1.0/dist/lcjs.d.ts)).
- **Enterprise excludes "Big Data Visualization or Data Analytics"** (defined by reference to Tableau, Qlik, Power BI), which needs a separate "Technology License" (EULA Art. VII.10).
- Trader is a separate product with 100+ indicators, 30+ drawing tools, Heikin-Ashi/Renko/Kagi/P&F ([ComponentSource summary](https://www.componentsource.com/product/lightningchart-js-trader), [v4.1 notes](https://dev.to/lightningchart_dashtera/announcing-lightningchart-js-trader-v41-hk9)).

### Time series checklist

| Feature | Rating | Note |
|---|---|---|
| Multi-series; multiple y-axes | B | `ChartXY` multi-axis ([typings](https://cdn.jsdelivr.net/npm/@lightningchart/lcjs@9.1.0/dist/lcjs.d.ts)) |
| Stacked panes | B | Dashboard plus stacked axes **[inferred from API]** |
| Navigator + range buttons | B / C | `ZoomBandChart` in typings |
| Zoom + pan | B | Built-in interactions, touch supported ([README](https://cdn.jsdelivr.net/npm/@lightningchart/lcjs@9.1.0/README.md)) |
| Crosshair sync | B (range) / C (cursor) | `synchronizeAxisIntervals(...axes)` is B. Cursor sync not found as a helper |
| OHLC + candle + volume | B (Trading licence) | `OHLCSeries` (gated, see above) |
| Rebasing | C | Not found |
| Returns / drawdown / rolling | C | Not found in core. Trader has indicators |
| Technical indicators | C in core / B in Trader | Trader: 100+ |
| Annotations | C in core / B in Trader | Core has UI elements; Trader has 30+ drawing tools |
| Event markers; bands | B | Bands and constant lines are standard ChartXY features **[inferred, not verified in docs]** |
| Trading calendar / gaps / TZ | not found / C | No axis-break or discontinuous API in 9.1.0 typings. `DateTimeTickStrategy` has a `utc` flag |
| Grouping / downsampling | not found | Vendor position is "render everything on GPU". No LTTB API found |
| Large-series perf | B | Vendor: 100M points static in 1.07 s; 240M points visible at 60 FPS scrolling ([README](https://cdn.jsdelivr.net/npm/@lightningchart/lcjs@9.1.0/README.md)). Vendor-published |
| Live updates | B | Core focus; multi-threaded streaming in v9 |

### Breadth

| Family | Rating | Family | Rating |
|---|---|---|---|
| line/area | F | waterfall | - (not in typings) |
| bar/column | F (`BarChart`) | sankey | - |
| pie/donut | F (`PieChart`) | network | - |
| scatter / bubble | F / A | 3D surface | F (`SurfaceGridSeries`) |
| heatmap | F (`HeatmapGridSeries`) | diagram/org | - |
| histogram | W (not in typings) | radar/polar | F (`SpiderChart`, `PolarChart`) |
| box/violin | A / - (`BoxSeries`) | gauge | F (`GaugeChart`) |
| treemap / sunburst | F / F (`TreeMapChart`, `SunburstChart`) | geo | F (`MapChart`, bundled map JSON) |
| funnel | F (`FunnelChart`, `PyramidChart`) | extra | `DataGrid`, `ParallelCoordinateChart` |

Source: class and occurrence counts in [lcjs.d.ts 9.1.0](https://cdn.jsdelivr.net/npm/@lightningchart/lcjs@9.1.0/dist/lcjs.d.ts) and the README chart-type list.

### Agent / LLM fit

- Fully imperative, method-chained API (`chart.addLineSeries().setStrokeStyle(...)`). No `toJSON` or serialization API in the typings (0 hits). **Poor JSON fit.** Hoist would have to write and maintain its own spec-to-API translator.
- The typings file is huge (2.3 MB `lcjs.d.ts`). Types are thorough but heavy.
- Official MCP server: `@lightningchart/mcp-server` 1.0.7, MIT ([npm](https://registry.npmjs.org/@lightningchart/mcp-server)), ~15 downloads/week ([npm API](https://api.npmjs.org/downloads/point/last-week/@lightningchart%2Fmcp-server)).

### React / TS

- No official React component package found. The vendor has framework guides ([docs/frameworks](https://lightningchart.com/js-charts/docs/frameworks/), not fetched: 403).
- TS typings included. ESM build, but no `sideEffects` field in package.json, so tree-shaking is doubtful **[inferred]**.
- Measured `dist/lcjs.mjs`: 1.47 MB raw, ~392 KB gzip ([jsDelivr](https://cdn.jsdelivr.net/npm/@lightningchart/lcjs@9.1.0/dist/lcjs.mjs)).

### Theming

- Theme objects plus the open-source `@lightningchart/lcjs-themes` 7.0.0 (MIT) ([npm](https://registry.npmjs.org/@lightningchart/lcjs-themes)). No CSS variables. Several built-in dark and light themes.

### Verdict

- **Generalist with a performance specialty.** Time-series finance features sit behind a separate Trading licence and product.
- Shortlist **no**. It is the weakest JSON/agent fit, and the licensing is gated and restrictive (OHLC needs a Trading licence, and Enterprise excludes data-analytics use).

---

## 4. uPlot

### Identity

| Item | Value |
|---|---|
| Package | `uplot` 1.6.32, 2025-03-14 ([npm](https://registry.npmjs.org/uplot)) |
| Rendering | Canvas 2D |
| Maintainer | Leon Sorokin (single maintainer) |
| Cadence | **No npm release since 2025-03-14.** Master is very active: 100+ commits since 2026-09-26, including a candlestick renderer rewrite and "native tooltip" work on 2026-11-15 ([commits](https://github.com/leeoniya/uPlot/commits/master)). package.json still says 1.6.32 |
| Stars | ~10.6k ([GitHub API](https://api.github.com/repos/leeoniya/uPlot)) |
| Weekly downloads | ~1.01M ([npm API](https://api.npmjs.org/downloads/point/last-week/uplot)) |

### Licence

- MIT ([README](https://github.com/leeoniya/uPlot#readme)).

### Time series checklist

| Feature | Rating | Note |
|---|---|---|
| Multi-series; multiple y-axes | B | "Multiple y-axes, scales & grids" ([README features](https://github.com/leeoniya/uPlot#features)) |
| Stacked panes | C | Separate synced charts |
| Navigator + range buttons | C / C | `zoom-ranger` demos ([demos](https://leeoniya.github.io/uPlot/demos/zoom-ranger.html)) |
| Zoom + pan | B / C | Drag-zoom is built in. "No built-in drag scrolling/panning"; wheel and touch are demo plugins ([README non-features](https://github.com/leeoniya/uPlot#non-features)) |
| Crosshair sync | B | `cursor.sync` ([sync-cursor demo](https://leeoniya.github.io/uPlot/demos/sync-cursor.html)) |
| OHLC + candle + volume | C | Candlestick demo / plugin only ([candlestick demo](https://leeoniya.github.io/uPlot/demos/candlestick.html)) |
| Rebasing | C | Compute yourself |
| Returns / drawdown / rolling | C | "No general-purpose data parsing, aggregation, or statistical processing" ([README](https://github.com/leeoniya/uPlot#non-features)) |
| Technical indicators | C | None |
| Annotations | C | Draw hooks ([annotations demo](https://leeoniya.github.io/uPlot/demos/annotations.html)) |
| Event markers; bands | C / B | High/low bands built in ([README](https://github.com/leeoniya/uPlot#features)) |
| Trading calendar / gaps / TZ | C / B | Ordinal via `timeseries-discrete` demo. IANA time zones and DST support built in ([README](https://github.com/leeoniya/uPlot#features)) |
| Grouping / downsampling | C | Decimation demo only |
| Large-series perf | B | 166,650 points in 25 ms cold start, ~100k pts/ms after. "May begin to struggle beyond 100k in-view points" when streaming ([README](https://github.com/leeoniya/uPlot#introduction)) |
| Live updates | B | `setData`; streaming demo |

**Published benchmark** ([README Performance](https://github.com/leeoniya/uPlot#performance)): 2023-03-11, Ryzen 7 5850U, Chrome 113, 166k points cold start.
- uPlot 1.6.24: 34 ms, 21 MB peak heap
- Chart.js 4.2.1: 38 ms
- ECharts 5.4.1: 55 ms
- Highcharts 10.3.3: 416 ms JS time, 97 MB peak
- LightningChart 4.0.2: 250 ms JS time
- amCharts 5.3.7: 1601 ms

Caveats: written by the uPlot author, versions are 3+ years old, and Highcharts ran without Boost **[inferred from bench page name]**.

### Breadth

| Family | Rating | Family | Rating |
|---|---|---|---|
| line/area | F | waterfall | - |
| bar/column (stacked) | A (`bars-grouped-stacked` demo, stack groups) | sankey | - |
| pie/donut | - | network | - |
| scatter | A (scatter demo) | 3D surface | - |
| bubble | W | diagram | - |
| heatmap | W (heatmap-cells demos) | radar/polar | - |
| histogram | W | gauge | - |
| box/violin | W (box-whisker demo) | geo | - |
| treemap / sunburst | - / - | funnel | - |

Demo list: [demos/](https://github.com/leeoniya/uPlot/tree/master/demos).

### Agent / LLM fit

- Options are a plain object, and data is columnar arrays (JSON-friendly). Real use leans on functions: hooks, `paths`, value formatters, plugins.
- The docs are "a perpetual work in progress". The API is documented mainly in `uPlot.d.ts` ([README](https://github.com/leeoniya/uPlot#documentation-wip)).
- Easy to get subtly wrong (scales, series index alignment). No AI tooling.

### React / TS

- React wrapper is third-party (`uplot-wrappers`) ([README](https://github.com/leeoniya/uPlot#third-party-integrations)). TS typings ship in the package.
- ~50 KB min. Measured ~22 KB gzip for `uPlot.iife.min.js` ([jsDelivr](https://cdn.jsdelivr.net/npm/uplot@1.6.32/dist/uPlot.iife.min.js)).

### Theming

- Colors set per option, plus a small CSS file for the legend. No theme API. Dark mode is manual.

### Verdict

- **Time-series specialist (a low-level engine).**
- Shortlist **no as Hoist's main library**: it has no finance features, no navigator and no breadth. **Possibly yes as a sparkline or dense-line engine.** Watch for a post-1.6.32 release, since master is moving fast.

---

## 5. Head-to-head benchmarks (2024-2026)

| Source | Publisher (bias) | What | Notes |
|---|---|---|---|
| [Chart Bench 2026](https://www.scichart.com/blog/chart-bench-compare-javascript-chart-libraries/) (2026-02-16, upd. 2026-04-02) | SciChart CEO (vendor) | 13 tests, 4 machines. Plotly, Highcharts+Boost, Chart.js, ECharts, uPlot, ChartGPU, SciChart, LCJS | Claims SciChart wins "~70%" of cases. Per-library numbers are not in the article. Used **LCJS v4.2.2 because v8 needs a key**. Suite is open: [abtsoftware/javascript-chart-performance-test-suite](https://github.com/abtsoftware/javascript-chart-performance-test-suite) |
| [LCJS 2026 comparison](https://lightningchart.com/blog/the-ultimate-javascript-charting-library-comparison-2026/), [ECG repo](https://github.com/Lightning-Chart/javascript-charts-performance-comparison) | LightningChart (vendor) | Cold start and streaming | "10M points in 0.29 s". Lists Highcharts, D3, Plotly etc. as failing at 10M+ (via search; site returns 403 to fetchers) |
| [uPlot README](https://github.com/leeoniya/uPlot#performance) | uPlot author | 166k-point cold start, 2023 | Old versions |
| [Gigasoft](https://gigasoft.com/fastest-javascript-chart) | Gigasoft (vendor) | 25M points at 25 FPS | Self-reported |

No independent, third-party head-to-head benchmark found for 2024-2026.

---

## 6. Other entrants (scan)

| Library | Status (cited) | Keep / cut |
|---|---|---|
| **AG Charts Enterprise** Financial Charts | `ag-charts-enterprise` 14.3.0 (2026-11-04), ~2.0M downloads/week ([npm](https://registry.npmjs.org/ag-charts-enterprise)). Candlestick/OHLC/line toolbar, range buttons, trend line and text annotations, zoom. Enterprise-only ([docs](https://www.ag-grid.com/charts/react/financial-charts/)) | **Keep (investigate).** Same vendor as AG Grid, which Hoist already wraps |
| **KLineChart** | 10.1.0 (2026-10-14), Apache-2.0, ~120k downloads/week, ~4.3k stars. Canvas, ~50 KB gzip, built-in indicators and drawing overlays ([npm](https://registry.npmjs.org/klinecharts), [README](https://github.com/klinecharts/KLineChart)) | Cut for core. Crypto-style K-line only, no breadth. Could fill an "indicators + drawing" niche |
| **ChartGPU** | `chartgpu` / `@chartgpu/chartgpu` 0.4.0 (2026-08-03), MIT, repo created 2026-01-17, ~3.3k stars. WebGPU only, "no WebGL/Canvas fallback". Candlestick, 3D surface, React bindings ([README](https://github.com/ChartGPU/ChartGPU)) | Cut (watch). Pre-1.0 and WebGPU-only. Most notable new WebGPU entrant |
| **Perspective** (FINOS origin, now `perspective-dev`) | `@perspective-dev/viewer` 5.9.1 (2026-11-12), Apache-2.0, ~11.4k stars ([npm](https://registry.npmjs.org/@perspective-dev/viewer), [GitHub](https://github.com/perspective-dev/perspective)) | Cut as a chart library. It is a streaming pivot/viz engine. Note: `@finos/perspective` has been stale since 2025-09 ([npm](https://registry.npmjs.org/@finos/perspective)) |
| **Chart.js + chartjs-chart-financial** | Plugin 0.2.1 last published 2024-03-23 ([npm](https://registry.npmjs.org/chartjs-chart-financial)) | Cut. Financial plugin is stale |
| **Syncfusion Charts** | `@syncfusion/ej2-react-charts` 35.1.46 (2026-11-12) ([npm](https://registry.npmjs.org/@syncfusion/ej2-react-charts)). Commercial; the free community licence is limited to small companies ([community licence](https://www.syncfusion.com/products/communitylicense)) | Cut. Financial firms will not qualify for the community licence. Suite lock-in |
| **DevExtreme** | `devextreme` 26.1.6 (2026-10-23), commercial ("SEE LICENSE IN README") ([npm](https://registry.npmjs.org/devextreme)) | Cut. Suite product, not finance-focused |
| **Kendo React Charts** | `@progress/kendo-react-charts` 17.0.0 (2026-11-11), commercial ([npm](https://registry.npmjs.org/@progress/kendo-react-charts)) | Cut. Suite product |
| **amCharts 5** (Stock Chart) | 5.21.5 (2026-10-26), commercial, ~452k downloads/week ([npm](https://registry.npmjs.org/@amcharts/amcharts5)) | Keep for the generalist comparison (stock chart plus broad catalogue). Slowest in uPlot's 2023 bench |
| **react-financial-charts / react-stockcharts** | Last published 2023-05 / 2018-09 ([npm](https://registry.npmjs.org/react-financial-charts), [npm](https://registry.npmjs.org/react-stockcharts)) | Cut. Abandoned |
| **webgl-plot** | 1.1.2 (2026-02-16), MIT ([npm](https://registry.npmjs.org/webgl-plot)) | Cut. Low-level primitive |

Context only (covered by other notes): `highcharts` 13.1.1 (2026-09-20), `echarts` 6.1.0 (2026-05-19), `plotly.js` 4.3.0 (2026-11-10) ([npm](https://registry.npmjs.org/highcharts), [npm](https://registry.npmjs.org/echarts), [npm](https://registry.npmjs.org/plotly.js)).

---

## Surprises / things that contradict common assumptions

1. **LWC has built-in rebasing.** `PriceScaleMode.Percentage` and `IndexedTo100` rebase to "the first visible value", so the comparison chart updates on scroll and zoom ([typings](https://unpkg.com/lightweight-charts@5.3.0/dist/typings.d.ts)). LWC also now has panes (v5) and data conflation (5.1), so it is less "lightweight" than its reputation.
2. **TradingView ships official agent skills** for LWC ([README](https://github.com/tradingview/lightweight-charts#ai-coding-assistants)). That is the best AI tooling story of the four. LightningChart's MCP server exists but sees ~15 downloads/week.
3. **The free TradingView Advanced Charts is effectively off-limits.** The licence covers "public websites only" ([FAQ](https://www.tradingview.com/charting-library-docs/latest/getting_started/Frequently-Asked-Questions/)), and it is not redistributable.
4. **SciChart standard licences are hostname-capped.** Each covers 5 production hostnames, and "Additional Hostnames/Domains are not available for purchase" ([FAQ](https://support.scichart.com/support/solutions/articles/101000515345-scichart-js-domain-licensing-faq)). A toolkit shipped to many clients would hit that cap. The community edition bans intranet deployment of commercial apps.
5. **SciChart's JSON builder is a genuine round trip** (`toJSON` → reviver → `build2DChart`, with named functions via `registerFunction`). That is closer to Hoist's "chart as JSON" goal than most commercial libraries. Cost: in v6, type strings require explicit registration ([register/all.d.ts](https://cdn.jsdelivr.net/npm/scichart@6.0.16/types/Builder/register/all.d.ts)).
6. **SciChart's WebGPU is narrow.** It is auto-selected only on Apple Silicon and WebGL is used elsewhere ([README](https://cdn.jsdelivr.net/npm/scichart@6.0.16/README.md)). The wasm payload is still ~0.85 MB gzip on top of the JS.
7. **LightningChart gates candlesticks.** `OHLCSeries` "is only usable with a Trading license" ([typings](https://cdn.jsdelivr.net/npm/@lightningchart/lcjs@9.1.0/dist/lcjs.d.ts)). Its Enterprise EULA also excludes "Data Analytics" use (Tableau/Power BI-like) without a separate Technology License ([LICENSE](https://cdn.jsdelivr.net/npm/@lightningchart/lcjs@9.1.0/LICENSE)).
8. **uPlot has not shipped to npm in 20 months**, but master is in a burst of activity: candlestick rewrite and native tooltips, 2026-09 to 2026-11 ([commits](https://github.com/leeoniya/uPlot/commits/master)). A 1.7 or 2.0 may be close **[inferred]**.
9. **All the JS chart benchmarks are vendor-run.** SciChart's 2026 bench compared against LightningChart v4.2.2 (two majors old) because newer versions need a key. No independent benchmark was found.
10. **AG Charts Enterprise now has Financial Charts** (candles, range buttons, drawing annotations) ([docs](https://www.ag-grid.com/charts/react/financial-charts/)). Its vendor is one Hoist already depends on, which makes it a dark-horse candidate worth a separate look.
