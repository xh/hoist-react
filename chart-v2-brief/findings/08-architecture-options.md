# 08 - Architecture options

How much should Hoist own between "thin pass-through" and "closed, opinionated spec"? This file
compares the four options in the brief, adds a fifth, and recommends one. It is driven by the
library answer in 03-05: **one library (Highcharts) serves both time series and breadth**, so
backend pluggability is not a requirement.

## Inputs that decide it

1. **Time series is the main use and must not be compromised.** Highcharts Stock leads on depth
   (03). Any option that drops below Highstock's features, or hides them, fails.
2. **A chart must round-trip as JSON, written by a human, a saved report or an agent.** Raw
   Highcharts options are JSON-ish, but they have about 119 series types, function-valued
   formatters, no published JSON Schema, and options that change between majors (02).
   An agent writing raw options cannot be validated well.
3. **Hoist cannot ship Highcharts types** (issue #3726, licensing). Any typed API is Hoist-owned.
4. **One library is enough** (04, 07). Highcharts covers every breadth family our users need
   often or occasionally. The far end (3D surface, process flow) is rare, and no single
   library covers it well anyway.
5. **A small team maintains this.** Generality we do not need is cost we pay forever.

## The options

| | (a) Enrich today's ChartModel | (b) Hoist spec, one backend | (c) Hoist spec, pluggable backends | (d) Curated family + escape hatch | **(e) Spec-first family (recommended)** |
|---|---|---|---|---|---|
| What it is | Keep `highchartsConfig` as the API. Add persistence, series helpers, formatter bridge, theme tokens. | One Hoist-owned declarative `ChartSpec` for all charts. Hoist maps it to Highcharts. | (b) plus a renderer interface with two or more backends (e.g. Highcharts + ECharts). | Purpose-built models per family (`TimeSeriesChartModel` deep, others thin), each with a raw-config escape hatch. | (d) with one shared contract: each model's Config extends a portable Spec, used by code, persistence, the control surface and agents alike. One backend behind an internal seam. |
| Time series depth | Full - raw Highstock | Limited to what the spec models | Limited to the common denominator of backends | Full in the flagship model | Full: flagship spec models Highstock's features; escape hatch per series for the rest |
| JSON round trip | Raw options only. Functions leak in. | Yes | Yes | Per model; no common contract unless designed in | Yes, one contract, versioned |
| Agent fit | Poor: agent writes raw Highcharts, cannot be validated, huge surface | Good | Good, but the spec is the lowest common denominator | Good per family, but N tool shapes | Good: one schema family, Hoist validation with field-aware errors |
| Control surface | Hard: must parse arbitrary options | Easy | Easy | Easy per family | Easy: actions over the spec |
| Persistence | Hard to diff raw options | Easy | Easy | Easy | Easy: spec + id-keyed state, GridModel style |
| Typed API | No (no Highcharts types) | Yes | Yes | Yes | Yes |
| Build cost | Low | Medium | High: every feature built twice, tested twice | Medium | Medium |
| Maintenance | Low code, high app cost | Medium | High: two theming layers, two sets of quirks, two upgrade cycles | Medium | Medium |
| Leak risk | n/a (it is the leak) | Medium - spec grows to mirror Highcharts | Low leak, high blandness | Low | Low - the spec models financial concepts, not Highcharts options |
| Verdict | Not enough | Close | Needless generality | Close | **Recommended** |

### (a) Enrich the current model

Cheapest, and it keeps every Highcharts feature. It fails the target use case. A saved report
or an agent would carry raw Highcharts options, with functions that do not serialize, option
names that drift across majors (12 to 13 renamed several), and nothing for Hoist to validate
against. It also keeps Highcharts' vocabulary (`yAxis: 1`, `compare: 'percent'`) as the
persisted format, so the persisted state is coupled to one vendor forever.

Keep it anyway, unchanged, as the escape hatch (`ChartModel`).

### (b) Hoist-owned spec, one backend

The right core idea: a JSON contract Hoist owns. On its own it tends to become one big spec that
tries to describe every chart type, which drifts toward re-implementing the Highcharts options
tree. That is where "leaky abstraction we would regret" comes from.

### (c) Pluggable backends

Only worth it if we needed two libraries. We do not (04). It doubles adapter code: the spike
needed 400-600 lines per library just for seven charts (07). It forces the spec down to what
every backend does well, which costs time-series depth first: Highstock's compare-on-zoom,
OHLC data grouping and indicators have no clean equivalent in AG Charts or ECharts. Two theming
layers, two bundles, two sets of quirks.

**What would flip this:** a hard performance wall Boost cannot clear. Even then, the answer is a one-time backend swap behind
the internal seam, not runtime pluggability. The seam in (e) keeps that swap affordable.

### (d) Curated family with escape hatch

Matches how Hoist already works (GridModel, TreeMapModel, StatCard). Users and agents get
purpose-built vocabulary per job. Missing piece: a shared JSON contract, so persistence,
widgets, agents and the control surface do not each invent their own shape.

### (e) Spec-first family - recommended

(d) plus (b)'s contract, minus (c)'s pluggability:

```
TimeSeriesChartConfig extends TimeSeriesChartSpec     (flat, like GridConfig)
  -> TimeSeriesChartModel        definition + state overlay, persistence, settings, validate
  -> later: CategoryChartModel, HeatmapChartModel ... on the same rules; a shared base class
     is extracted when the second family is built, not before
  -> (existing) TreeMapModel, ChartModel stay as they are

internal renderer  ->  Highcharts   (the only implementation)
```

The full API is in 09. The pattern that lets one Spec serve code and JSON is in 09 section 8 and,
for the rest of Hoist, in 14.

Rules that keep it from leaking:

1. **Model the domain, not the library.** Spec keys are financial and analytic concepts:
   `rebase`, `collapseGaps`, `transform: 'drawdown'`, `splitBy`, `timeBands`,
   `colorBy: 'direction'`. The spike proved the same spec renders on three libraries (07), which
   is the test that the vocabulary is not Highcharts-shaped.
2. **Each family spec is small.** Families get their own spec, not one mega-spec. A heatmap
   spec has no idea what a navigator is.
3. **Escape hatch at two levels, never in the agent schema:** `highchartsConfig` on the chart
   and on each series, deep-merged last, as today's `ChartModel` does.
4. **Transforms live in Hoist,** not in the library (rebasing excepted, which Highstock does
   natively on zoom). Numbers are then identical on any renderer and unit-testable.
5. **The renderer seam is internal,** one folder, no public plug-in API. It exists to keep
   Highcharts calls in one place and to keep a future swap affordable.

## Is a library-neutral spec realistic or a leaky abstraction?

Realistic, with limits. Evidence from the spike: one JSON spec drove seven charts on three
libraries. The spec never named a library option. Where a library lacked a feature, the gap
showed up as adapter code, not as a spec change (07).

The leak risk is real at the long tail: user-drawn annotations, stock tools, exotic
indicators. Those stay out of the spec and go through `highchartsConfig` or the raw `ChartModel`.
That is the same bargain `GridModel` makes with `agOptions`, and it has held for years.

Confidence: **high** that (e) is right given a one-library answer. **Medium** on the exact
family split; Category and Scatter could merge into one "XY" model if they share enough.

## Strongest argument against (e)

"You are building a second Highcharts API. Every Highstock feature you want must be modelled,
documented and mapped. In two years the spec mirrors the options tree and you have paid twice."

Answer: the spec covers what our apps and agents need (the time series list in 03 and the
families in 04), not what Highcharts can do. Everything else uses the escape hatch. The cost
is bounded by the spike's evidence: about 450 lines of adapter for seven charts across all
families on Highcharts (07). If the spec starts to mirror options one-for-one, stop and push
the feature to `highchartsConfig` instead.
