# 04 - Breadth coverage and the plan for non-time-series charts

Charts other than time series. This file tests the expectation that deep time-series libraries and broad
general-purpose toolkits pull in opposite directions, then gives the plan.

Legend: **F** first-class (native series type, configurable, documented), **A** adequate
(works, with some assembly), **W** awkward (possible with hacks or plugins), **-** absent.
A demo alone does not earn F. Sources: `../notes/research-*.md`; spike evidence for the three
spiked libraries (07).

## 1. Classification

| Library | Class | Evidence |
|---|---|---|
| Highcharts (+ Stock) | **Credibly both** | Stock is the deepest time-series feature set we found (03). Core has 119 series types and F on 17 of the 19 families below. |
| AG Charts | Generalist growing a financial layer | Broad Enterprise catalogue. Finance gaps: no indicators, no rebasing, no multi-pane layout (03). |
| ECharts | Generalist, credible for time series with work | F on 14 families. Time series needs custom rebasing, range buttons, trading calendar labels (03, 07). |
| amCharts 5 | Credibly both | Stock Chart is deep. Breadth is broad, but heatmap and histogram are assembled, not native. |
| SciChart | Performance specialist, broad in science, thin in business charts | F for heatmap and 3D surface; no sankey, funnel or native treemap. |
| Lightweight Charts | Time-series specialist | Only time-based charts. Everything else is a plugin or absent. |
| Plotly | Generalist | Broad, with the best schema. Finance features exist but WebGL and gap-free axes do not mix. |

**The expected tension is real, but Highcharts escapes it.** Lightweight Charts shows the
specialist end (deep on price, nothing else). ECharts and Plotly show the generalist end (broad,
finance by hand). Highcharts and amCharts are both deep and broad, because each is really two
products from one vendor sharing one engine (Core + Stock).

## 2. Coverage map

Need column: how often our target users (analysts, PMs, quants on risk and analytics reports)
need the family. This is XH's judgment from the brief's list, marked **[inferred]**, not
measured usage.

| Family | Need | Highcharts | AG Charts | ECharts | amCharts | SciChart | Lightweight | Plotly | Spike |
|---|---|---|---|---|---|---|---|---|---|
| Bar / column, stacked | often | F | F | F | F | F | W | F | - |
| Heatmap (correlation, matrix, P&L calendar) | often | F | F (E) | F | A | F | W | F | all three F |
| Histogram / distribution | often | F | F (E) | A (custom series) | W | A | W | F | HC F, AG see 07, EC A |
| Scatter | often | F | F | F | F | F | W | F | - |
| Bubble | often | F | F | F | A | F | - | F | - |
| Treemap (exposures) | often | F | F (E) | F | F | W | - | F | - |
| Waterfall (P&L attribution) | often | F | F (E) | A | A | W | - | F | - |
| Box plot | occasionally | F | F (E) | F | W | A | W | F | - |
| Pie / donut | occasionally | F | F | F | F | A | - | F | - |
| Sunburst | occasionally | F | F (E) | F | F | A | - | F | - |
| Gauge | occasionally | F | F (E) | F | F | A | - | F | - |
| Radar / polar | rarely | F | F (E) | F | F | F | - | F | - |
| Sankey (flows, allocation) | rarely | F | F (E) | F | F | - | - | F | all three F |
| Network / force graph | rarely | F | - | F | F | W | - | - | - |
| Process flow / org chart | rarely | F (organization, treegraph) | A | W | A | W | - | - | - |
| 3D surface (vol surface) | rarely | W (no surface) | - | A (echarts-gl) | - | F | - | F | - |
| Violin | rarely | W | - | A | - | - | - | F | - |
| Geo maps | rarely | F (Maps licence) | F (E) | F | F | W | - | F | - |
| Funnel | rarely | F | F | F | F | - | - | F | - |

First-class counts across the 19 families: Highcharts 17, Plotly 17, AG Charts 15 (10 of them
Enterprise only), ECharts 14, amCharts 11, SciChart 6, Lightweight 0.

On the **often** rows (7 families): Highcharts F on all 7, AG Charts F on all 7 (4 need
Enterprise), Plotly 7, ECharts 5, SciChart 4, amCharts 3.

## 3. Breadth is not the same as quality per type

Checked in the spike for three families, rendered from one shared spec (07):

- **Heatmap:** all three native and good. Highcharts' `dataLabels.color: 'contrast'` handled
  label legibility with no code. ECharts needed per-cell label colors.
- **Histogram with normal fit and VaR line:** Highcharts has native `histogram` and
  `bellcurve`, but the bell curve plots density on its own axis and needed a second axis plus a
  post-render rescale to overlay counts. ECharts has no histogram series since `echarts-stat`
  went stale (last published 2020), so it took a custom series. Binning in Hoist was simpler
  than either library's native binning.
- **Sankey:** native and clean on all three.

Lesson: for distribution charts, Hoist should bin and fit in its own transforms (as it does for
returns and drawdown) and use the library only to draw columns and lines. That makes quality
independent of each library's statistics support.

## 4. Decision: one library or two?

**One library: Highcharts.** It is F on every family our users need often or occasionally, and
clients already license it. A second library would buy F coverage
only for 3D surfaces and violins, both rare, at the cost the brief lists: two theming layers,
two bundles, two sets of quirks, two upgrade cycles, and a Hoist spec that must span both.

What would flip it: a recurring, multi-client need for 3D volatility surfaces or very large
scientific heatmaps (millions of cells), where SciChart or Plotly is F and Highcharts is not.
Even then, add it as an app-level widget, not a second Hoist backend (section 5).

**Strongest argument against:** "Highcharts' breadth is a catalogue, not quality. One vendor for
everything is a concentration risk, and ECharts is F on most families for free." Answer: the
spike shows Highcharts' quality on the families we tested is at least equal to ECharts'. The
concentration risk is real but already exists today, and the Hoist spec (08) is what keeps a
future move affordable.

## 5. The plan for everything else

| Tier | Families | How | When |
|---|---|---|---|
| **First-class Hoist family models** | Category (bar, column, stacked, waterfall, pie / donut), Heatmap, Distribution (histogram, box plot), Scatter / bubble, Flow (sankey) | Own spec, own model on `BaseChartModel`, control surface support, agent schema profile, dash widget | Phase 4, in that order (12) |
| **Existing Hoist component** | Treemap | `TreeMapModel` stays; align theme and persistence with V2 | Phase 4 |
| **Thin path (escape hatch)** | Network graph, org chart, gauge, radar, sunburst, funnel, dependency wheel, geo | Today's `ChartModel` with raw `highchartsConfig`. Same theme tokens. No agent schema. | Available now |
| **Defined extension point, not a Hoist family** | 3D surface, violin, process flow / workflow diagrams | App registers its own dash view spec (`DashViewSpec`) and, if agents need it, its own chat-kit component spec. Surface: Plotly or ECharts GL. Process flow: a diagram library such as React Flow. | On demand, per app |

Order inside the first-class tier follows need and spike evidence: Category first (most
reports have one), Heatmap second (correlation and P&L calendars), Distribution third (risk
reports), then Scatter and Flow.

Confidence: **high** on one library. **Medium** on the order inside Phase 4, which depends on
the real mix of report widgets in client apps.
