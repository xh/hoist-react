# 03 - Time series depth

Feature-by-feature comparison of the serious candidates for financial time series, the main use
case. Sources: the research notes in `../notes/research-*.md` (every rating there carries a docs
URL) and, for the three spiked libraries, what we built and saw in `../spikes` (07).

Legend: **B** built in, **C** needs custom code (size noted), **X** not practical,
**?** not found. **(E)** = AG Charts Enterprise only. **Spike** column: what building the
spike's four time-series charts showed for Highcharts (HC), AG Charts (AG) and ECharts (EC).

## Matrix

| Capability | Highcharts Stock 13 | AG Charts 14 | ECharts 6 | amCharts 5 | SciChart 6 | Lightweight 5 | Plotly 4 | Spike (HC / AG / EC) |
|---|---|---|---|---|---|---|---|---|
| Multi-series, multiple y-axes | B | B | B | B | B | B | B | all three B |
| Stacked panes, one time axis | B | C (no multi-pane layout) | B (multiple grids) | B | B | B | B | HC B, drag-resizable / AG see 07 / EC B |
| Navigator | B | B (E) | B (dataZoom slider) | B | B | C (150-300 lines) | B (rangeslider) | all three B |
| Range selector buttons (1M..YTD..All) | B | B (E) | C (~34 lines) | B | C | C | B | HC native / EC hand-built |
| Zoom and pan | B | B (E) | B | B | B | B | B | all three B |
| Crosshair + tooltip sync across charts | C (~40 lines) | B (E, `sync`) | B (`echarts.connect`) | B | B | C (~30 lines) | C | HC not wired (no API) / EC B |
| OHLC + candlestick + volume pane | B | B (E) | B (candlestick; OHLC bars custom) | B | B | B | B | all three rendered |
| Rebase to % change, re-based on zoom | **B** (`compare`) | C | C (~12 lines + zoom read hack) | **B** | C (small) | **B** (Percentage mode) | C | HC native and verified / EC custom |
| Returns, drawdown, rolling windows | C (cumulative B) | C | C | C (returns B) | C (filters) | C | C | Hoist transforms used by all |
| Technical indicators | **B** (50+) | X / C (backlog AG-13319) | C | **B** (35+) | C (MA only) | C | C | HC native SMA / AG, EC via Hoist transforms |
| Annotations, user-drawn | B (stock tools) | B (E) | C (heavy for drawn) | B | B | C | B | not exercised |
| Event markers (flags), bands, lines | B | B | B (markPoint / markArea) | B | B | B / C | B | all three B |
| Trading calendar (no weekend / holiday gaps) | **B** (ordinal) | B (`ordinal-time`) | C (category axis; v6 breaks too slow, see 07) | B (gapless axis) | B (discontinuous axis) | B (index time scale) | B, but disables WebGL | HC native / EC category axis with custom labels |
| IANA time zones | B | C (UTC flag only) | C (UTC flag only) | B | ? | C (shift yourself) | ? | not exercised |
| Data grouping on zoom (OHLC-aware) | **B** (default on) | B render (M4) / C OHLC | B line (LTTB) / C OHLC | B | B | B (basic) | X | HC grouping / EC LTTB |
| Large series (1M points) | B with caveats (Boost) | B (M4, all tiers) | B (LTTB, large mode) | C (no WebGL) | B (WebGL / WebGPU) | ? | B (WebGL), with limits | see 07 numbers |
| Live / ticking updates | B | B | B | B | B | B | B | not exercised |

Counts (B only, out of 17 rows): Highcharts 15, amCharts 15, SciChart 12, AG Charts 12 (six of
them Enterprise only), Plotly 11, ECharts 10, Lightweight 9. Counts weigh rows equally; the
scoring in 05 does not.

## What the numbers hide

- **Rebasing is the feature that separates the field.** Comparing instruments as percent change
  from the start of the visible window is the most common financial chart we build. Only
  Highcharts, amCharts and Lightweight Charts do it natively and keep it right on zoom. On
  ECharts we built it (about 12 lines), but reading the current zoom window needed an internal
  API (`getModel().getComponent('dataZoom', 0).getValueRange()`), because the `datazoom` event
  payload changes shape by trigger (`../notes/spike-echarts.md`).
- **Trading calendar.** Highcharts' ordinal axis is on by default in Stock and keeps a real
  time axis. ECharts' usual answer is a category axis, which drops time-aware tick labels (we
  re-built them, about 33 lines), and makes every marker and zoom value an index, not a
  timestamp. ECharts 6 axis breaks remove gaps on a time axis, but in the spike they gave
  unusable labels on daily data and took render time from about 75 ms to 300 ms.
- **Indicators.** Highcharts Stock and amCharts ship dozens. AG Charts has none (an open backlog
  item). For Hoist this matters less than it looks: the design computes common transforms in
  Hoist (09), so indicator breadth is a convenience, not a blocker.
- **Cross-chart sync** is Highcharts' clearest gap. Panes inside one chart share a crosshair
  natively, but two separate charts need about 40 lines of event code (the official demo).
  AG Charts and ECharts have it built in. Hoist writes it once in the renderer (10).
- **Silent defaults that bite.** Highcharts Stock turns on `dataGrouping` by default, so a
  tooltip can show a weekly average when the user expects a daily close. `compare` values arrive
  in percent units (5 = 5%), not fractions. ECharts' candlestick data order is
  `[open, close, low, high]`, and on a category axis it needs an explicit `encode` or the index
  is drawn as a price. Each is a reason the agent should write a Hoist spec, not raw options.

## Large series

All three spiked libraries handle 4 x 250,000 points. They do it differently:

| Library | Default path | Faithful to every point? |
|---|---|---|
| Highcharts Stock | `dataGrouping` averages into buckets (6-hour buckets at full range) | No - averages hide extremes unless `approximation: 'ohlc'` or similar is chosen |
| Highcharts + Boost | WebGL, every raw point | Yes, but about 3x slower to render and zoom than grouping, no dash styles or stacking, and does not engage while grouping is on |
| AG Charts | M4 aggregation for rendering | Yes for visible shape (M4 keeps min / max per pixel column) |
| ECharts | `sampling: 'lttb'` | Shape-preserving, not exact |

Measured timings are in 07.

## Verdict

**Highcharts Stock is the deepest time-series library we can use, and the only one of the
spiked three where every feature in our spec mapped to a native option.** amCharts matches
it on built-ins but trails on performance (no WebGL, no published numbers) and on API fit
(05). AG Charts and ECharts are credible, with gaps that are custom code rather than blockers,
but each gap is code Hoist would own and maintain.

Confidence: **high** for the B / C / X ratings of the three spiked libraries (built and
verified). **Medium** for amCharts, SciChart, Lightweight and Plotly (docs research only).
