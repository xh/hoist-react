# Research: ECharts, Plotly, Vega-Lite and other OSS options

Scope: Apache ECharts (deep), Plotly.js, Vega-Lite / Vega, Observable Plot, Recharts, visx, Nivo, D3,
Perspective. Researched 2026-11-15 against live sources. Rubric: `_research-rubric.md`.

Conventions: **B** built in, **C** custom code, **X** not practical. Breadth: **F** first-class,
**A** adequate, **W** awkward, **-** absent. **[inferred]** = not verified against a live source.

npm versions and dates come from the npm registry (`https://registry.npmjs.org/<pkg>`). Weekly
downloads come from `https://api.npmjs.org/downloads/point/last-week/<pkg>` (week 2026-11-08 to
2026-11-14). Star counts come from the GitHub API (`api.github.com/repos/<owner>/<repo>`), read
2026-11-15. Gzip sizes marked "measured" are `gzip -9` of the published min bundle from jsDelivr.

All libraries in this note are OSS (Apache-2.0, MIT, BSD-3, ISC).

---

## 1. Apache ECharts

### Identity

| Item | Value |
|---|---|
| Package | `echarts` 6.1.0, published 2026-05-19 ([npm](https://www.npmjs.com/package/echarts), [release](https://github.com/apache/echarts/releases/tag/6.1.0)) |
| Prior majors | 6.0.0 on 2025-07-30, 5.6.0 on 2024-12-28 ([releases](https://github.com/apache/echarts/releases)) |
| Rendering | Canvas or SVG renderer, chosen at init ([canvas vs SVG](https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg/)). WebGL only via the separate `echarts-gl` 2.1.0 (2026-05-28, peer `echarts ^5.1.2 \|\| ^6.0.0`) ([npm](https://www.npmjs.com/package/echarts-gl)) |
| Maintainer | Apache Software Foundation top-level project |
| Activity | 67.7k stars ([GitHub](https://github.com/apache/echarts)). 10.59M weekly downloads ([npm API](https://api.npmjs.org/downloads/point/last-week/echarts)). About one minor release every 10 months. 32 commits on the default branch since 6.1.0 ([commits](https://github.com/apache/echarts/commits)) |

**What ECharts 6 changed** ([v6 features](https://echarts.apache.org/handbook/en/basics/release-note/v6-feature/), [upgrade guide](https://echarts.apache.org/handbook/en/basics/release-note/v6-upgrade-guide/)):
- New default theme built on design tokens. Runtime theme switching without re-init. Dark mode support.
- **Broken axis (`xAxis.breaks`)**. Works on value, time and log axes, but not on category axes ([option doc source](https://github.com/apache/echarts-doc/blob/master/en/option/component/axis-common.md)).
- Matrix coordinate system. Chord series. Beeswarm and scatter jitter.
- Custom series can be registered and shared as npm packages. Examples: `@echarts-x/custom-violin` and contour, bar range and line range ([npm](https://www.npmjs.com/package/@echarts-x/custom-violin)).
- "Enhanced stock trading charts": better label placement plus more examples. No new finance engine.
- Breaking: new default colors and layout (legend moves to the bottom). `theme/v5.js` restores the old look. Axis-label overflow and overlap prevention now on by default.
- 6.1.0 breaking: `tooltip.valueFormatter` now receives `rawDataIndex`. Bar and candlestick no longer overflow the grid (`containShape`) ([6.1.0 notes](https://github.com/apache/echarts/releases/tag/6.1.0)).

### Licence
- Apache-2.0 ([LICENSE](https://github.com/apache/echarts/blob/master/LICENSE)).

### Time series checklist

| Capability | Rating | Note |
|---|---|---|
| Multi-series, multiple y-axes | B | `yAxis` array, `alignTicks` ([option](https://echarts.apache.org/en/option.html#yAxis)) |
| Stacked panes, one time axis | B | Several `grid`s plus a `dataZoom` with `xAxisIndex: [0,1]`. See the [candlestick-large example](https://echarts.apache.org/examples/en/editor.html?c=candlestick-large) |
| Navigator | B | `dataZoom` type `slider` draws a data-shadow mini series with drag handles ([option](https://echarts.apache.org/en/option.html#dataZoom-slider)) |
| Range selector buttons | C | None built in. About 30 lines: Hoist toolbar buttons call `dispatchAction({type:'dataZoom', startValue, endValue})`. YTD/1Y date math is ours |
| Zoom + pan (wheel, drag, touch) | B | `dataZoom` type `inside`. 6.1 added grab cursors ([option](https://echarts.apache.org/en/option.html#dataZoom-inside), [6.1 notes](https://github.com/apache/echarts/releases/tag/6.1.0)) |
| Crosshair/tooltip sync across charts | B | Across instances: `echarts.connect(group)` ([API](https://echarts.apache.org/en/api.html#echarts.connect)). Within one instance across grids: `axisPointer.link` ([option](https://echarts.apache.org/en/option.html#axisPointer.link)) |
| OHLC + candlestick + volume | B / C | `candlestick` series is built in with `large` on by default ([option](https://echarts.apache.org/en/option.html#series-candlestick)). OHLC bars need a custom series, and an [official example](https://echarts.apache.org/examples/en/editor.html?c=custom-ohlc) exists. Volume is a bar series in a second grid |
| Rebasing to % from start (on zoom) | C | No compare mode. Listen to `datazoom`, recompute, then `setOption`. About 50-100 lines [inferred] |
| Returns, drawdown, rolling | C | Transforms are only `filter`, `sort` and `boxplot`. Others must be registered with `echarts.registerTransform` ([data transform](https://echarts.apache.org/handbook/en/concepts/data-transform/)). Transforms do not see the zoom window |
| Technical indicators | C | None built in. Official examples compute moving averages in JS |
| Annotations | B / C | `markPoint`, `markLine`, `markArea` and the `graphic` component are built in ([option](https://echarts.apache.org/en/option.html#series-line.markLine)). User-drawn persistent annotations: C (heavy). `brush` only selects, it does not draw |
| Event flags, plot bands/lines | B | `markPoint` (pin symbol), `markArea`, `markLine` |
| Trading calendar / gaps | B / C | Two options. (1) Category axis, the common way for daily candles. The 200k-bar example uses it. (2) v6 `breaks` on a time axis, where each gap is an explicit `{start,end,gap}` entry. No recurring "weekends" rule, so the list must be generated, but the result is plain JSON ([intraday breaks example](https://echarts.apache.org/examples/en/editor.html?c=intraday-breaks-1)) |
| Time zones | C | Only a global `useUTC` flag (local or UTC). No IANA zone support ([option](https://echarts.apache.org/en/option.html#useUTC)) |
| Downsampling | B / C | Line `sampling`: `lttb`, `average`, `min`, `max`, `minmax`, `sum` ([option](https://echarts.apache.org/en/option.html#series-line.sampling)). OHLC re-aggregation on zoom (Highstock `dataGrouping` style): C |
| Large-series performance | B | `large` mode (candlestick default threshold 600), `progressive` rendering (default 3000 per frame, threshold 10000), TypedArray input ([option](https://echarts.apache.org/en/option.html#series-candlestick.large), [features](https://echarts.apache.org/en/feature.html)). Official demos: 200k OHLC bars ([candlestick-large](https://echarts.apache.org/examples/en/editor.html?c=candlestick-large)) and 20k-point area with `lttb` ([area-simple](https://echarts.apache.org/examples/en/editor.html?c=area-simple)). No published FPS benchmark found. 2D WebGL only via echarts-gl (`scatterGL`, `linesGL`) |
| Live/ticking updates | B | Merging `setOption`. `appendData` exists, but only scatter and lines support incremental rendering, and not with `dataset` ([API](https://echarts.apache.org/en/api.html#echartsInstance.appendData)) |

### Breadth coverage

| Family | Rating | Note |
|---|---|---|
| line/area, bar/column, stacked | F | |
| pie/donut | F | |
| scatter, bubble | F | `symbolSize` mapping. v6 jitter and beeswarm |
| heatmap / correlation matrix | F | `heatmap`, plus v6 `matrix` coordinate system |
| histogram | A | Bar plus ecStat histogram transform. `echarts-stat` last published 2020-11-03 ([npm](https://www.npmjs.com/package/echarts-stat)) |
| box plot / violin | F / A | `boxplot` series built in. Violin is an official custom series package |
| treemap, sunburst | F | |
| waterfall | A | No waterfall series. Stacked bars with a transparent base ([example](https://echarts.apache.org/examples/en/editor.html?c=bar-waterfall)) |
| sankey | F | |
| network / force graph | F | `graph` series with force layout. v6 adds `chord` |
| 3D surface | A | Needs `echarts-gl` |
| process flow / org chart | W | `tree` series covers hierarchy. General diagrams need `graph` with manual layout |
| radar/polar, gauge, funnel | F | |
| geo maps | F | `registerMap` with GeoJSON |

### Agent / LLM fit
- **Declarative:** one plain `option` object. Data can live inline or in `dataset` with `encode` mappings ([dataset](https://echarts.apache.org/handbook/en/concepts/dataset/)). Most common cases need no functions.
- **Function gaps that matter for finance:**
  - String templates only substitute values (`'{value} kg'`). They cannot set precision, thousands separators or units ([formatter doc](https://github.com/apache/echarts-doc/blob/master/en/option/component/axis-common.md)).
  - `tooltip.valueFormatter` is function-only in the types (`shared.d.ts`).
  - Time axes do support string and "cascading" templates per granularity (`{yyyy}-{MM}-{dd}`).
  - Hoist would need a named-formatter registry, e.g. `formatter: 'xh:pct2'`, resolved at render time.
- **TS types:** written in TS. Ships `EChartsOption` and `ComposeOption<...>` for tree-shaken builds ([import guide](https://echarts.apache.org/handbook/en/basics/import/)).
- **JSON schema:** none official.
  - [Issue #16427](https://github.com/apache/echarts/issues/16427) has been open since 2022. A maintainer pointed to the doc site's `option.json` but said it may not be accurate. Users report it is not valid JSON Schema.
  - hustcc (author of `echarts-for-react` and `mcp-echarts`) said there that accuracy "drops significantly" without schema descriptions.
  - [Issue #21592](https://github.com/apache/echarts/issues/21592) (2026-04, open) asks for an "LLM-optimized declarative protocol".
- **MCP / AI tooling:**
  - [apache/echarts-mcp](https://github.com/apache/echarts-mcp) is official, but 87 stars. It renders to an image URL on Baidu cloud storage and supports only 8 series types. Its README argues for minimal LLM parameters over full options.
  - Community [hustcc/mcp-echarts](https://github.com/hustcc/mcp-echarts): 269 stars.
  - Neither helps an in-app renderer.
- **Easy to get subtly wrong:** yes [inferred]. The option tree is huge, and mistakes fail silently (a wrong key is just ignored). Index-based cross-references (`xAxisIndex`, `gridIndex`, `seriesIndex`) are brittle for agents.
- **Training data:** large corpus (67.7k stars, 10.6M weekly downloads). A big share of examples and Q&A is Chinese-language [inferred].

### React / TS integration
- No official React wrapper. Community `echarts-for-react` 3.0.6 (2026-01-21, 2.1M weekly, peer `echarts ^3-^6`) ([npm](https://www.npmjs.com/package/echarts-for-react)). Hoist would own a thin wrapper.
- Tree-shaking via `echarts/core` plus `use([...])`.
- Bundle (measured from the 6.1.0 tarball):
  - full `echarts.min.js`: 1.12 MB min, 368 KB gzip
  - `echarts.common.min.js`: 240 KB gzip
  - `echarts.simple.min.js`: 169 KB gzip

### Theming
- `echarts.registerTheme(name, obj)`. v6 adds `chart.setTheme()` at runtime and dark mode support ([v6 features](https://echarts.apache.org/handbook/en/basics/release-note/v6-feature/)).
- `darkMode` option ([option](https://echarts.apache.org/en/option.html#darkMode)).
- 30+ bundled themes in `echarts/theme/`. [Theme builder](https://echarts.apache.org/en/theme-builder.html).
- No CSS-variable theming. Colors are JS values, so Hoist must map its CSS vars into a theme object [inferred].

### Verdict
**Credibly both.** It covers every breadth family at F or A. It has built-in navigator, zoom, cross-chart sync, candlestick, LTTB and large mode. The time-series gaps versus Highstock are all C, not X: range buttons, compare/rebase, indicators, OHLC data grouping, IANA time zones and drawn annotations.
**Shortlist: yes.** It is the strongest OSS all-rounder here. Main costs: a formatter registry for JSON-safety, our own finance layer (rebase, indicators, range buttons), and no official schema.

---

## 2. Plotly.js (and react-plotly.js)

### Identity

| Item | Value |
|---|---|
| Packages | `plotly.js` 4.3.0, 2026-11-10 ([npm](https://www.npmjs.com/package/plotly.js)). `react-plotly.js` 4.1.0, 2026-07-29 ([releases](https://github.com/plotly/react-plotly.js/releases)) |
| Rendering | SVG plus WebGL traces (`scattergl`, `splom`, `parcoords`, 3D) |
| Maintainer | Plotly Inc. |
| Activity | 18.4k stars ([GitHub](https://github.com/plotly/plotly.js)). 947k weekly. v4.0.0 shipped 2026-08-24, then 4.1, 4.2 and 4.3 by 2026-11-10 ([releases](https://github.com/plotly/plotly.js/releases)) |

v4.0.0 highlights ([notes](https://github.com/plotly/plotly.js/releases/tag/v4.0.0)):
- Started exporting TS types.
- Removed mapbox traces. Switched color parsing to culori.
- **Shows an "Upload to Cloud" modebar button by default** that, after confirmation, sends chart data to `cloud.plotly.com` (`showSendToCloud` defaults to true in the [v4.3.0 schema](https://raw.githubusercontent.com/plotly/plotly.js/v4.3.0/dist/plot-schema.json)). A wrapper must force it off.

react-plotly.js 4.0 (2026-06-18) added ESM, TS declarations and a hooks rewrite ([notes](https://github.com/plotly/react-plotly.js/releases/tag/v4.0.0)).

### Licence
- MIT ([LICENSE](https://github.com/plotly/plotly.js/blob/master/LICENSE)).

### Time series checklist

| Capability | Rating | Note |
|---|---|---|
| Multi-series, multiple y-axes | B | `yaxis2` with `overlaying` ([multiple axes](https://plotly.com/javascript/multiple-axes/)) |
| Stacked panes, shared time axis | B | Subplots with `domain` and `matches`/shared x ([subplots](https://plotly.com/javascript/subplots/)) |
| Navigator + range buttons | B | `xaxis.rangeslider` and `xaxis.rangeselector.buttons` with `step` month/year/day/hour/all and `stepmode` `backward`/`todate`, so YTD works ([range slider](https://plotly.com/javascript/range-slider/), [time series](https://plotly.com/javascript/time-series/)). The range slider renders the whole trace again, which is a known cost on big series [inferred] |
| Zoom + pan | B | `dragmode` zoom/pan, `scrollZoom` config |
| Crosshair sync across charts | B within one figure, C across figures | `hovermode: 'x unified'` plus spikes across subplots. Across separate divs: `plotly_hover` plus `Plotly.Fx.hover` ([hover events](https://plotly.com/javascript/hover-events/)) |
| OHLC + candlestick + volume | B | `candlestick` and `ohlc` traces plus a bar subplot ([candlestick](https://plotly.com/javascript/candlestick-charts/)) |
| Rebasing (on zoom) | C | Listen to `plotly_relayout`, recompute, `Plotly.react`. Client-side `transforms` were removed in v3 (v4 notes mention removing dead code for them) |
| Returns, drawdown, rolling | C | Compute yourself |
| Technical indicators | C | None |
| Annotations incl. user-drawn | B | `annotations`, `shapes`. Users can draw with `dragmode: 'drawline'/'drawrect'/'drawopenpath'`, and shapes are editable ([shapes](https://plotly.com/javascript/shapes/)) |
| Event markers, bands, lines | B | `shapes` (rect/line, `xref: 'x'`, `yref: 'paper'`) and annotations |
| Trading calendar | B, with a catch | `xaxis.rangebreaks` with `pattern: 'day of week'`/`'hour'`, `bounds`, and `values` for holidays. It works for date axes only ([schema](https://raw.githubusercontent.com/plotly/plotly.js/v4.3.0/dist/plot-schema.json)). **`scattergl` and `splom` traces are forced to `visible: false` on any axis with rangebreaks** ([axis_defaults.js L211-220](https://github.com/plotly/plotly.js/blob/v4.3.0/src/plots/cartesian/axis_defaults.js#L211-L220)). Gap-free axes and WebGL speed are mutually exclusive. Time zones: no tz support found [inferred] |
| Downsampling | X/C | No client-side LTTB. The Python-only `plotly-resampler` does not apply |
| Large-series performance | B (WebGL) | `scattergl` demos at 100k and 1M points. Docs warn browsers allow 8-16 WebGL contexts per page, "generally 4 to 8 figures" ([WebGL vs SVG](https://plotly.com/javascript/webgl-vs-svg/)). That is a real limit for dashboards with many small charts |
| Live updates | B | `Plotly.extendTraces`, `Plotly.react` ([streaming](https://plotly.com/javascript/streaming/)) |

### Breadth coverage
- **F:** line/area, bar, pie, scatter, bubble, heatmap, histogram (incl. 2D), box, violin, treemap, sunburst (plus icicle), waterfall, sankey, 3D surface, radar (`scatterpolar`), gauge (`indicator`), geo, funnel ([traces in schema](https://raw.githubusercontent.com/plotly/plotly.js/v4.3.0/dist/plot-schema.json)).
- **-:** network/force graph (no trace type), process flow/org chart.

### Agent / LLM fit
- **Best-in-class JSON shape.** A figure is `{data, layout, config, frames}` and is pure JSON.
  - Formatting uses d3-format strings (`tickformat: '.2%'`, `hovertemplate: '%{y:$,.2f}'`), so no functions are needed for number formatting.
  - The same figure JSON is produced by plotly.py and plotly.R, so training data is very large [inferred].
- **Schema:** `dist/plot-schema.json` (3.9 MB) lists every attribute with type, default and description. `Plotly.validate(data, layout)` checks against it ([src/plot_api/validate.js](https://github.com/plotly/plotly.js/tree/master/src/plot_api)). This is a strong agent asset, but too large for a prompt as-is.
- **MCP:** Plotly's official MCP work targets Dash, not plotly.js ([Dash MCP](https://dash.plotly.com/dash-mcp), [Plotly Cloud MCP](https://dash.plotly.com/mcp)).
- **Easy to get wrong:** moderate. Silent attribute drops are flagged by `validate`.

### React / TS integration
- Official `react-plotly.js` 4.x with ESM and TS ([notes](https://github.com/plotly/react-plotly.js/releases/tag/v4.0.0)).
- Weak tree-shaking. Partial bundles are the main lever ([dist README](https://github.com/plotly/plotly.js/blob/master/dist/README.md)):

| Bundle | min | gzip |
|---|---|---|
| full | 4.84 MB | 1.49 MB |
| basic | - | 403 KB |
| finance | 1.31 MB | 438 KB |
| gl2d | - | 504 KB |

Even the smallest partial bundle is larger than full ECharts gzip (368 KB).

### Theming
- `layout.template` objects ([templates](https://plotly.com/javascript/layout-template/)). Named templates like `plotly_dark` are not shipped in plotly.js (no match in the repo). Hoist would author its own. No CSS variables.

### Verdict
**Time-series capable, broad generalist.** It is the only OSS option with built-in range buttons, rangebreaks and drawn shapes. It has the best schema story.
**Shortlist: maybe (second tier).** Reasons against:
- bundle weight
- the rangebreaks/WebGL conflict
- the WebGL context cap
- no network graphs
- no LTTB
- the "send to cloud" default needs a guardrail in financial apps

---

## 3. Vega-Lite (and Vega)

### Identity

| Item | Value |
|---|---|
| Packages | `vega-lite` 6.5.0, 2026-10-08. `vega` 6.4.0, 2026-08-14. `vega-embed` 7.3.0, 2026-09-23. `react-vega` 8.0.0, 2025-08-27 (vega org) ([npm](https://www.npmjs.com/package/vega-lite)) |
| Rendering | SVG or Canvas (renderer option). No WebGL |
| Maintainer | UW Interactive Data Lab / Vega org |
| Activity | vega-lite 5.6k stars, vega 12.0k stars ([GitHub](https://github.com/vega/vega-lite)). About 2.26M weekly each. 6.0 (2025-03-28) went ESM-only ([release](https://github.com/vega/vega-lite/releases)) |

### Licence
- BSD-3-Clause ([LICENSE](https://github.com/vega/vega-lite/blob/main/LICENSE)).

### Time series checklist

| Capability | Rating | Note |
|---|---|---|
| Multi-series, dual y-axis | B | `layer` with `resolve: {scale: {y: 'independent'}}` |
| Stacked panes, shared x | B | `vconcat` with a shared param/scale |
| Navigator | B | Brush on an overview chart drives the detail chart's x domain ([overview+detail](https://vega.github.io/vega-lite/examples/interactive_overview_detail.html)) |
| Range buttons | C | Params can bind to HTML radio inputs, but mapping them to a date domain needs expressions or a host API [inferred] |
| Zoom + pan | B | Interval selection `bind: 'scales'` ([bind](https://vega.github.io/vega-lite/docs/bind.html)) |
| Crosshair sync | B within a spec, C across embeds | Shared params within one spec ([pivot tooltip example](https://vega.github.io/vega-lite/examples/interactive_multi_line_pivot_tooltip.html)). Across separate embeds: View API signals |
| Candlestick + volume | C | No candlestick mark. Compose `rule` plus `bar` ([candlestick example](https://vega.github.io/vega-lite/examples/layer_candlestick.html)) |
| Rebasing | B-ish | The official [interactive index chart](https://vega.github.io/vega-lite/examples/interactive_index_chart.html) rebases to a hovered date with transforms |
| Returns, drawdown, rolling | B | `window` transform (frame, cumulative ops) ([window](https://vega.github.io/vega-lite/docs/window.html)). Also `regression` and `loess` |
| Indicators | C | SMA via `window`. EMA/RSI/MACD are awkward in the grammar [inferred] |
| Annotations | B static / X user-drawn | `rule`, `rect`, `text` layers |
| Trading calendar | C | No breaks. Use an ordinal/band scale on date strings. Time zones: local or UTC timeUnits |
| Downsampling | C | No LTTB. Aggregate by `timeUnit`. Server-side scaling is VegaFusion, a Python/Rust stack ([vegafusion.io](https://vegafusion.io/)) |
| Large-series perf | X for 100k+ interactive [inferred] | No WebGL and no sampling. No official point-count benchmark found. The need for VegaFusion suggests browser limits |
| Live updates | C | View API `view.change()` changesets |

### Breadth coverage
- **Vega-Lite F:** line/area, bar, pie (`arc`), scatter, bubble, heatmap (`rect`), histogram (`bin`), boxplot, geo.
- **Vega-Lite W:** violin, waterfall, radar, funnel.
- **Vega-Lite -:** treemap, sunburst, sankey, network, 3D, gauge, org chart.
- **Vega (lower level) adds:** treemap, partition/sunburst and force layouts ([force example](https://vega.github.io/vega/examples/force-directed-layout/)). Still no sankey transform or 3D.

### Agent / LLM fit
- **Strongest grammar for agents.** Specs are pure JSON. Formats use d3-format and d3-time-format strings. Expressions are strings, never functions.
- **Official JSON schema** at [vega.github.io/schema/vega-lite/v6.json](https://vega.github.io/schema/vega-lite/v6.json) (1.9 MB, HTTP 200). TS types (`TopLevelSpec`) are generated from the same source.
- **NL-to-vis research benchmarks** (nvBench) target Vega-Lite. Even so, a 2024 evaluation found LLMs "still struggled with Vega-Lite grammar" and needed few-shot examples ([arXiv 2401.11255](https://www.arxiv.org/pdf/2401.11255)).
- **No official MCP.** Several community servers exist, e.g. [isaacwasserman/mcp-vegalite-server](https://github.com/isaacwasserman/mcp-vegalite-server).
- **Easy to get wrong:** composition and selections (`params`, `resolve`) are easy to get subtly wrong [inferred].

### React / TS integration
- `react-vega` 8 (peer `vega-embed ^7`).
- Measured gzip: vega 180 KB + vega-lite 82 KB + vega-embed 21 KB, about 283 KB total.

### Theming
- `config` object plus [vega-themes](https://github.com/vega/vega-themes), which includes `dark` ([config](https://vega.github.io/vega-lite/docs/config.html)).

### Verdict
**Generalist / analysis grammar, not a time-series specialist.** It has no candlestick mark, no range buttons, no breaks, no WebGL and no downsampling.
**Shortlist: no as the main engine.** Keep it in view as a reference design for an XH JSON spec: string formats, string expressions, schema-first.

---

## 4. Observable Plot
- **Identity:** `@observablehq/plot` 0.6.19, 2026-11-05 ([npm](https://www.npmjs.com/package/@observablehq/plot)). SVG only. 5.4k stars, 1.51M weekly.
  - 0.6.18/0.6.19 (Nov 2026) came 21 months after 0.6.17 (Feb 2025) ([releases](https://github.com/observablehq/plot/releases)). Still pre-1.0.
- **Licence:** ISC.
- **Time series:**
  - B: `window` transform, `normalize` transform (rebase to first value), `bollinger` mark, pointer and crosshair marks ([docs source](https://github.com/observablehq/plot/tree/main/docs)).
  - X: no zoom or pan ([#1590](https://github.com/observablehq/plot/issues/1590) open since 2023). No brush ([#5](https://github.com/observablehq/plot/issues/5) open since 2020). No decimation ([#1707](https://github.com/observablehq/plot/issues/1707) open).
  - X: no navigator and no candlestick mark (compose `ruleX` plus `barY`).
- **Breadth:**
  - F/A: static stats charts (line, bar, dot, cell heatmap, box, density, hexbin, waffle, tree, geo).
  - -: sankey, network ([#1708](https://github.com/observablehq/plot/issues/1708) open), 3D, gauge.
- **Agent fit:** a JS API, not JSON. Options often take functions or accessors.
- **Size:** 69 KB gzip UMD (measured). No official React wrapper.
- **Theming:** CSS and `currentColor`. 0.6.18 added `light-dark()` color support.
- **Verdict:** a static exploratory generalist. **Cut:** it has no interaction model for finance.

## 5. Recharts
- **Identity:** `recharts` 3.10.1, 2026-07-25. 3.11 canaries ran through 2026-11-03 ([releases](https://github.com/recharts/recharts/releases)). SVG only. 27.7k stars, 66.2M weekly (the most downloaded here).
- **Licence:** MIT.
- **Time series:**
  - B: multiple y-axes (`yAxisId`), `syncId` cross-chart tooltip sync ([LineChart API](https://recharts.github.io/en-US/api/LineChart)), `Brush` range slider ([Brush](https://recharts.github.io/en-US/api/Brush)), `ReferenceLine` and `ReferenceArea`.
  - X: zoom and pan ([#710](https://github.com/recharts/recharts/issues/710) open since 2017). No candlestick (requests [#871](https://github.com/recharts/recharts/issues/871) and [#1400](https://github.com/recharts/recharts/issues/1400) closed without a feature). No breaks.
  - Performance: the official guide offers memoization and "reduce your data" advice. It has no built-in sampling, no canvas and no point limit ([performance guide](https://recharts.github.io/guide/performance)).
- **Breadth:**
  - F: line, bar, area, pie, scatter, radar, treemap, funnel.
  - A: sankey.
  - -: heatmap, box, 3D, network, geo.
- **Agent fit:** JSX composition, not JSON. Hoist would need its own spec-to-JSX layer.
- **Size:** 155 KB gzip UMD (measured).
- **Theming:** props plus CSS.
- **Verdict:** a dashboard generalist with no finance features. **Cut:** no zoom, no candlestick, SVG-only performance.

## 6. visx
- **Identity:** `@visx/*` 4.0.0, 2026-06-11. It came 19 months after 3.12.0 and added React 19 ([release](https://github.com/airbnb/visx/releases/tag/v4.0.0)). SVG primitives on D3. 21.1k stars. Airbnb.
- **Licence:** MIT.
- **Time series:**
  - B: `@visx/brush` and XYChart with shared tooltip ([xychart](https://airbnb.io/visx/xychart), [brush](https://airbnb.io/visx/brush)).
  - C: everything else. Candlestick, navigator, sync and indicators are hand-built. No canvas or WebGL, so 100k+ points are not practical [inferred].
- **Breadth:** low-level primitives (hierarchy, network, geo, heatmap). All are C-level effort.
- **Agent fit:** poor. It is component code, not a config.
- **Verdict:** a toolkit, not a chart library. **Cut:** we would be writing Highstock ourselves.

## 7. Nivo
- **Identity:** `@nivo/*` 0.99.0, 2025-05-23. **No release in about 18 months.** 24 commits since 2025-06, the last on 2026-07-21 ([releases](https://github.com/plouc/nivo/releases), [commits](https://github.com/plouc/nivo/commits)). SVG plus Canvas variants for several charts ([line canvas](https://nivo.rocks/line/canvas/)). 14.1k stars.
- **Licence:** MIT.
- **Time series:** basic time-scale line only. X: no zoom/brush (feature requests [#31](https://github.com/plouc/nivo/issues/31) and [#32](https://github.com/plouc/nivo/issues/32) closed, quadrant zoom draft [#2846](https://github.com/plouc/nivo/issues/2846) open). No candlestick ([#155](https://github.com/plouc/nivo/issues/155) closed).
- **Breadth:**
  - F: bar, pie, heatmap, treemap, sunburst, sankey, chord, network, calendar, radar, funnel, boxplot, swarm, geo ([packages](https://github.com/plouc/nivo/tree/master/packages)).
  - -: 3D.
- **Agent fit:** props are JSON-like and value formats accept d3-format strings. `@nivo/static` renders server-side.
- **Verdict:** a breadth generalist with stalled releases. **Cut:** no time-series interaction.

## 8. D3 (low-level)
- **Identity:** `d3` 7.9.2, 2026-11-03. Maintenance only: 7.9.1 adopted ESM bundle and pnpm, 7.9.0 shipped 2024-03 ([releases](https://github.com/d3/d3/releases)). 114k stars, 33.4M weekly. ISC.
- **Role:** scales, shapes, zoom, brush and layouts. Every chart feature is C.
- **d3fc** adds finance and WebGL series, but its last release was 15.2.13 on 2024-07-30 ([npm](https://www.npmjs.com/package/d3fc)).
- **Agent fit:** none as a spec. It is imperative code.
- **Size:** 93 KB gzip full bundle (measured), modular.
- **Verdict:** a building block, already used inside visx and Plot. **Cut** as a chart layer. Note it as a utility for custom marks.

## 9. Perspective (formerly FINOS Perspective)
- **Identity:**
  - **Moved from FINOS to the OpenJS Foundation in v4.0.0 (2025-10-28)** ([v4.0.0 notes](https://github.com/perspective-dev/perspective/releases/tag/v4.0.0)).
  - Repo is now `perspective-dev/perspective` and npm packages are `@perspective-dev/*`. Latest 5.9.1, 2026-11-12. Weekly releases in Oct-Nov 2026 ([releases](https://github.com/perspective-dev/perspective/releases)).
  - The old `@finos/perspective` stopped at 3.8.0 (2025-09-03, [npm](https://www.npmjs.com/package/@finos/perspective)).
  - 11.4k stars, but only 33k weekly downloads for `@perspective-dev/client`.
- **Licence:** Apache-2.0.
- **What it is:**
  - A C++/WASM streaming query engine (pivot, group, split, filter, expressions, Arrow) with a `<perspective-viewer>` custom element (grid plus charts) and a React binding ([README](https://github.com/perspective-dev/perspective)).
  - New WebGL `@perspective-dev/viewer-charts` (since 4.5.0, 2026-05) covers bar, line, scatter, heatmap, treemap, sunburst, candlestick and map ([package.json](https://github.com/perspective-dev/perspective/blob/master/packages/viewer-charts/package.json), [v4.5.0 notes](https://github.com/perspective-dev/perspective/releases/tag/v4.5.0)). It replaces the d3fc plugin.
  - Recent bugs include WebGL charts never rendering in Firefox ([#3248](https://github.com/perspective-dev/perspective/issues/3248)) and wrong line tooltip values ([#3241](https://github.com/perspective-dev/perspective/issues/3241)).
- **Time series:**
  - B: streaming/ticking at scale and aggregation.
  - X: Highstock-style features (navigator, range buttons, rebasing, annotations, indicators, breaks) [inferred from feature list].
- **Agent fit:** viewer config (plugin, group_by, split_by, columns, aggregates) is small and JSON. It is good for "pivot this" agents but gives little control over chart styling.
- **Verdict:** a streaming pivot and analytics widget, not a chart component. **Cut as the chart engine.** It could be a separate "ad-hoc analytics" Hoist component for very large or ticking data.

---

## Summary matrix

| Library | Ver (date) | Licence | TS fit | Breadth | JSON/agent | Large data | Shortlist |
|---|---|---|---|---|---|---|---|
| ECharts | 6.1.0 (2026-05-19) | Apache-2.0 | B navigator, zoom, sync, candlestick, LTTB, breaks. C rebase, indicators, range buttons | Very broad | Good, but number formatters need functions. No schema | Large + progressive + LTTB, 200k OHLC demo | **Yes** |
| Plotly.js | 4.3.0 (2026-11-10) | MIT | B range buttons, rangebreaks, drawn shapes | Broad, no network | Best (schema + validate + d3-format) | WebGL, but not with rangebreaks. 4-8 WebGL figures/page | Maybe |
| Vega-Lite | 6.5.0 (2026-10-08) | BSD-3 | Weak for finance | Medium | Best grammar + schema | Weak | No (reference only) |
| Obs. Plot | 0.6.19 (2026-11-05) | ISC | No interaction | Medium static | JS API | Weak | No |
| Recharts | 3.10.1 (2026-07-25) | MIT | Sync + brush, no zoom/candles | Medium | JSX | Weak | No |
| visx | 4.0.0 (2026-06-11) | MIT | Build it yourself | Primitives | None | Weak | No |
| Nivo | 0.99.0 (2025-05-23) | MIT | None | Broad | Fair | Canvas variants | No |
| D3 | 7.9.2 (2026-11-03) | ISC | Build it yourself | Anything | None | DIY | No |
| Perspective | 5.9.1 (2026-11-12) | Apache-2.0 | Streaming only | Pivot charts | Small JSON config | Excellent (WASM + WebGL) | No (separate niche) |

## Surprises / things that contradict common assumptions
1. **ECharts 6 has axis breaks, including on time axes**, with an official intraday example. But each gap is an explicit `{start,end}` entry with no "skip weekends" rule. Breaks are not allowed on category axes. ([option doc](https://github.com/apache/echarts-doc/blob/master/en/option/component/axis-common.md), [example](https://echarts.apache.org/examples/en/editor.html?c=intraday-breaks-1))
2. **ECharts has no official option JSON schema** despite its "it's all JSON" reputation. The 2022 request is still open. The official `apache/echarts-mcp` is a toy image renderer. ([#16427](https://github.com/apache/echarts/issues/16427), [echarts-mcp](https://github.com/apache/echarts-mcp))
3. **ECharts string templates cannot format numbers**, so `$1.2M` or `12.34%` axis labels need a JS function. Plotly and Vega-Lite use d3-format strings and stay pure JSON. ([formatter doc](https://github.com/apache/echarts-doc/blob/master/en/option/component/axis-common.md))
4. **Plotly hides WebGL traces on any axis with rangebreaks**, so "fast" and "gap-free trading calendar" cannot be had together. ([axis_defaults.js](https://github.com/plotly/plotly.js/blob/v4.3.0/src/plots/cartesian/axis_defaults.js#L211-L220))
5. **Plotly.js 4 shows a "send to cloud" button by default** that posts chart data to `cloud.plotly.com` after a confirmation. This is a data-leak footgun for financial apps. ([v4.0.0 notes](https://github.com/plotly/plotly.js/releases/tag/v4.0.0), [schema](https://raw.githubusercontent.com/plotly/plotly.js/v4.3.0/dist/plot-schema.json))
6. **Plotly WebGL is capped at roughly 4-8 figures per page** by browser context limits, which bites multi-chart dashboards. ([WebGL vs SVG](https://plotly.com/javascript/webgl-vs-svg/))
7. **Perspective left FINOS for the OpenJS Foundation** and renamed to `@perspective-dev/*`. It now ships its own WebGL charts, including candlestick, but adoption is small (33k weekly). ([v4.0.0](https://github.com/perspective-dev/perspective/releases/tag/v4.0.0))
8. **Recharts is by far the most downloaded (66M/week) yet still has no zoom/pan**, an issue open since 2017. Popularity is not finance fitness. ([#710](https://github.com/recharts/recharts/issues/710))
9. **Vega-Lite, the "canonical LLM chart spec", still trips LLMs**: a 2024 study found models struggled with its grammar without few-shot help. It also has no candlestick mark. ([arXiv 2401.11255](https://www.arxiv.org/pdf/2401.11255))
10. **Several "evergreen" libraries had long release gaps**: Nivo has had none since May 2025. visx and Observable Plot each went 19-21 months between releases before late 2026. `echarts-stat` (ECharts' stats transforms) has not been published since 2020.
