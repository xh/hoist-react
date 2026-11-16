# 05 - Shortlist and scoring

How we went from 16 libraries to one recommendation. The weights are shown so the partners can
argue with them. Scores are 1 (poor) to 5 (best). The totals are on a 0-100 scale.

## 1. From survey to shortlist

| Stage | Libraries | Cut reasons (detail in 02) |
|---|---|---|
| Surveyed (16 + other entrants) | Highcharts, AG Charts, ECharts, amCharts, SciChart, LightningChart, Plotly, Lightweight Charts, Vega-Lite, Observable Plot, Recharts, visx, Nivo, uPlot, Perspective, D3 | - |
| Cut at survey | Vega-Lite, Observable Plot, Recharts, visx, Nivo, uPlot, Perspective, D3 | No finance interaction (zoom, navigator, candlestick) or not a chart component. D3 / visx mean writing Highstock ourselves. |
| Cut at survey, close calls | Plotly | Breadth and schema are excellent, but WebGL turns off on any axis with trading-calendar rangebreaks, WebGL is capped at 4-8 figures per page (bad for dashboards), the bundle is about 438 KB gzip even for a finance build, and v4 shows a send-to-cloud button by default. |
| | Lightweight Charts | Excellent price charts, native rebasing, panes. But no navigator, no non-time charts, a required TradingView attribution link in every app, and no time zones. Fails the "one library" test outright (04). |
| | LightningChart | Imperative API with no serialization. OHLC needs a separate Trading licence. |
| **Scored (5)** | Highcharts, AG Charts, ECharts, amCharts, SciChart | - |
| **Spiked (3)** | Highcharts (mandated baseline), AG Charts, ECharts | amCharts: verbose JSON with silent failures, no WebGL, no published performance. SciChart: hostname-capped licences, a poor fit for a toolkit shipped to many apps. Both scored below the spiked pair (section 3). |

## 2. Criteria and weights

| # | Criterion | Weight | Why this weight |
|---|---|---|---|
| 1 | **Time-series depth** | **30** | The brief's governing priority. Heaviest single criterion by design. |
| 2 | Visualization breadth | 12 | Non-time-series charts are real and varied. Scored separately from depth, never blended. |
| 3 | Large-data performance | 10 | 100k+ point intraday series happen, but are not the norm. |
| 4 | Agent / JSON fit (native config) | 10 | Matters for GenUI. Discounted because Hoist's own spec (08) is what agents write. |
| 5 | Hoist integration fit | 10 | Typing, React use, theming hooks, events for persistence, existing app code. |
| 6 | Licence fit | 10 | Whether Hoist apps can use it without new licences. |
| 7 | Vendor health and API stability | 8 | Release cadence, semver discipline, upgrade pain. |
| 8 | Theming and polish | 5 | How close to Hoist light and dark with reasonable effort. |
| 9 | Bundle size | 5 | Measured, tree-shaken (07). |

## 3. Scores

| Criterion (weight) | Highcharts | AG Charts | ECharts | amCharts | SciChart |
|---|---|---|---|---|---|
| Time-series depth (30) | **5** | 3 | 3 | 4 | 4 |
| Breadth (12) | **5** | 4 | 4 | 3 | 3 |
| Performance (10) | 4 | 3 | 4 | 2 | **5** |
| Agent / JSON fit (10) | 4 | 4 | 3 | 2 | 4 |
| Hoist fit (10) | **5** | 4 | 3 | 2 | 2 |
| Licence fit (10) | **5** | 2 | **5** | 3 | 1 |
| Vendor health (8) | 4 | 4 | 4 | 3 | 3 |
| Theming (5) | 4 | 4 | 4 | 3 | 3 |
| Bundle (5) | **5** | 2 | 4 | 3 | 2 |
| **Total (0-100)** | **93** | **66** | **72** | **60** | **65** |

Score reasons, briefly:

- **Time-series depth.** Highcharts: every spec feature native in the spike, 15 of 17 rows B (03).
  amCharts: equal on paper, docs only, not spiked. SciChart: fast and capable, indicators by hand.
  AG Charts: no rebasing, no indicators, no documented panes. ECharts: range buttons, rebasing
  and trading calendar all custom.
- **Breadth.** Highcharts F on 17 of 19 families and all 7 "often" ones (04). AG Charts similar
  but 10 of its F families are Enterprise only. ECharts F on 14, histogram and waterfall
  assembled.
- **Performance.** Measured for the spiked three (07): Highcharts fastest on its default path
  but averages; ECharts fast with LTTB; AG Charts slowest on zoom. SciChart from vendor claims
  (WebGL / WebGPU), amCharts has no WebGL and no published numbers.
- **Agent / JSON fit.** All need functions for formats. Highcharts: huge training corpus, three
  official MCP servers, no published schema. AG Charts: TS-first, dev-time validation, `llms.txt`,
  but option names changed recently. ECharts: no schema, index-based cross-references. SciChart:
  a real JSON builder API. amCharts: verbose JSON with silent failures.
- **Hoist fit.** Highcharts is the incumbent: the wrapper, themes, context menu and app code
  exist. AG Charts shares a vendor and design language with AG Grid. ECharts needs a new wrapper.
- **Licence fit.** Highcharts: clients already license it. ECharts: Apache-2.0. AG Charts:
  needs a separate Enterprise licence. SciChart: hostname-capped.

## 4. Sensitivity

The ranking does not depend on the weights. Computed totals:

| Weight set | Highcharts | ECharts | AG Charts | SciChart | amCharts |
|---|---|---|---|---|---|
| Proposed (above) | 93 | 72 | 66 | 65 | 60 |
| All criteria equal | 91 | 76 | 67 | 60 | 56 |
| Time series 0 | 91 | 77 | 69 | 59 | 51 |

Highcharts scores at or near the top on every criterion except raw performance, so no
reasonable weighting moves it off first place. ECharts is a clear second on every weight set.

## 5. Decision

- **Primary: Highcharts (Core + Stock).** Confidence: high.
- **Second choice:** ECharts, at the cost of about 150 more lines of Hoist time-series code
  (range buttons, rebasing, calendar labels) and a named-formatter layer.
- **Not recommended:** AG Charts as a Hoist chart engine. It is a good library and aligns with AG
  Grid, but it needs a separate Enterprise licence, lacks rebasing and indicators,
  needed undocumented options for panes, and is about three times the bundle. Revisit if AG adds
  documented multi-pane layouts and compare.
