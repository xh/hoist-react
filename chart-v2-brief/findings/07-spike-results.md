# 07 - Spike results

Three libraries rendered the same seven charts from one shared, library-neutral JSON spec, with
seeded synthetic financial data and Hoist light and dark theme tokens. Highcharts was included as
the baseline. AG Charts and ECharts were the other two (05 explains why).

- Run it: `cd spikes && pnpm start` (installs, vendors the UMD builds, serves on port 4173 and
  opens `index.html`). Or open `spikes/gallery.html` straight from the file system.
- Shared inputs: `spikes/shared/specs.js` (the seven specs), `data.js` (named sources with typed
  fields), `transforms.js` (rebase, drawdown, SMA, histogram...), `theme.js` (Hoist tokens).
- One adapter per library: `spikes/adapters/{highcharts,agcharts,echarts}.js`. Each maps the
  spec generically, driven by spec fields, with no per-chart switches.
- Per-library build notes, with docs links: `../notes/spike-{highcharts,agcharts,echarts}.md`.
- Versions: Highcharts Stock 13.1.1, AG Charts Enterprise 14.3.0 (trial, watermark), ECharts
  6.1.0. All current on npm on 2026-11-15.

## 1. Results by chart

| Chart | Highcharts Stock | AG Charts Enterprise | ECharts |
|---|---|---|---|
| 1 NAV, navigator, range buttons, rebased % | **Full, all native.** `compare` re-bases on zoom; verified 0% at first visible point | Full. Navigator, buttons, ordinal axis native. **Rebasing custom** (zoom listener). Buttons show no selected state | Full. Navigator native. **Range buttons and rebasing custom** (HTML buttons, `datazoom` listener) |
| 2 Candlestick + volume pane + SMA | **Full, all native**, incl. SMA indicators and drag-resizable panes | Full, but **panes rely on two undocumented options** (`layoutConstraints`, `ignoreZoom`). `createFinancialChart()` rejects extra series, so it could not be used | Full. Two grids, linked crosshair, native. SMA from Hoist transforms. Candle data order `[open, close, low, high]` is a trap |
| 3 Cumulative return over drawdown, synced crosshair | Partial. Panes share one crosshair natively. **No native cross-chart sync** (about 40 lines in Highcharts' own demo) | Full (undocumented panes). Events and bands as crossLines spanning panes | Full. `axisPointer.link` across grids; `echarts.connect` for cross-chart sync |
| 4 Stress, 4 x 250k points | Full. Default `dataGrouping` (averages), or Boost (WebGL, all raw points) | Full. Automatic M4 aggregation | Full. `sampling: 'lttb'` |
| 5 Correlation heatmap | **Full, native.** Auto-contrast cell labels | Full. Needed 21 pre-mixed color stops (AG blends through green) and custom label contrast. **Negative labels truncate** to "-0..." in narrow cells | Full, native. Custom per-cell label colors |
| 6 Returns histogram, normal fit, VaR | Full. Native histogram; bell curve needed a second axis and a post-render rescale | Full. Native histogram, fit as a line series, VaR as crossLine | Full, but **no histogram series**: custom series drawing bars |
| 7 Sankey | Full, native | Full, native | Full, native |

No library failed a chart. No chart needed a gap card. All three render with no console errors in
both themes, except AG Charts' trial licence banner.

## 2. Large-series stress test

4 series x 250,000 one-minute points (1M points). Headless Chrome 157 on an Apple M3 Max,
frame-rate limit off so the frame clock does not hide work. Median of 3 runs. Data generation
is excluded; data conversion is included. Raw runs: `spikes/stress-run{1,2,3}.json`,
`stress-gpu{1,2,3}.json`, `stress-4m.json`.

| Library and path | Render | Zoom to 5% window | Reset to full | Hover p90 | Faithful to raw points? |
|---|---|---|---|---|---|
| Highcharts, `dataGrouping` (Stock default) | **74 ms** | **19 ms** | **31 ms** | 28 ms | No - bucket averages |
| Highcharts, Boost (WebGL) | 245 ms | 111 ms | 139 ms | 58 ms | Yes |
| AG Charts, M4 (automatic) | 232 ms | 179 ms | 191 ms | 55 ms | Shape yes (min / max per pixel) |
| ECharts, LTTB sampling | 173 ms | 36 ms | 42 ms | 26 ms | Shape mostly (LTTB) |

Scaling check at 4 x 1,000,000 points (4M, one run): Highcharts grouping 162 / 39 / 96 ms,
AG Charts 569 / 647 / 590 ms, ECharts 380 / 80 / 47 ms (render / zoom / reset).

How to read it:

- All three are usable at 1M points. None froze.
- **Highcharts' default path is fastest, but it averages.** At full range it shows 6-hour
  bucket means, which hides intraday spikes. For price data Hoist should set an OHLC or
  min/max approximation, or switch to Boost by policy (`performance.mode`, 09). Boost renders
  every point at about AG Charts' speed, with feature limits (no dash styles, no stacking) and
  two Boost bugs found in 13.1.1 (`../notes/spike-highcharts.md`).
- **AG Charts is the slowest on zoom** (about 180 ms per step here, 650 ms at 4M points). AG
  claims 60 fps at 1M points for its own interactions; programmatic zoom through `setState` is
  a different path, so treat this as one data point, not a verdict. The legend was about half of
  each zoom step in a probe.
- **ECharts is fast and close to faithful** with LTTB.
- **Hover numbers are noisy.** They include a Puppeteer round trip, and libraries defer hover
  work differently. ECharts' median was about 2 ms because it handles hover on its own frame.
  Use p90 only as a rough tier.
- Numbers are relative. Client desktops and VDI are slower (13, A4).

## 3. Cost: adapter code and bundle size

| | Highcharts | AG Charts | ECharts |
|---|---|---|---|
| Adapter lines (all 7 charts) | **461** | 424 | 594 |
| of which time series | ~185 | ~220 | ~340 |
| of which breadth (heatmap, histogram, sankey) | ~170 | ~130 | ~137 |
| Custom time-series code the library lacked | cross-chart sync (not built) | rebasing, undocumented panes, UTC date formatting | range buttons, rebasing, trading-calendar labels, zoom-window read via internal API |
| Bundle, time-series profile (min + gzip, tree-shaken) | **180 KB** | 565 KB (490 KB without financial and annotation modules) | 220 KB |
| Bundle, full spike profile | **194 KB** | 576 KB | 230 KB |

Bundle method: `spikes/scripts/bundle-size.mjs` (esbuild, tree-shaken ESM entry points,
results in `spikes/bundle-sizes.json`). AG Charts' module registry tree-shakes poorly: the
"everything" build is 724 KB.

The AG Charts adapter is the shortest, but only because two of its pane charts use undocumented
options. A production Hoist renderer could not rely on them.

## 4. What was easy and what fought us

**Highcharts.** Every time-series spec field mapped to a native option: ordinal axis, `compare`
with `compareStart`, navigator, range selector, flags, plot bands, panes, SMA indicators. The v13
`dataTable` / `dataMapping` maps almost one-to-one onto the spec's source-and-field model and
takes typed arrays without a copy. The v13 `palette` option made theming small. What fought us:
Stock's default `dataGrouping` silently averages (turned off except for stress); `compare` values
arrive in percent units (5 = 5%); the bell curve wants its own axis; band labels vanish when the
band is narrower than the label; initial animation spoils screenshots; two Boost bugs.

**AG Charts.** TS-first API, good navigator, zoom, sync and crosshair, and a `getState` /
`setState` API that suits persistence. What fought us: no documented stacked panes; no compare
mode; range buttons cannot show a selected state; dates format in local time only, and
`ordinal-time` year ticks land on arbitrary points; `setState` without `version` silently does
nothing; v14 option names differ from most online examples (`axes` keyed by id, `colorScale`
not `colorRange`, crossLine `placement` not `position`).

**ECharts.** Panes (grids), linked crosshair, `echarts.connect`, navigator, LTTB and sankey are
all native and solid. What fought us: no range buttons or compare; the trading calendar
(category axis loses time ticks; v6 axis breaks gave unusable daily labels and quadrupled render
time); no public API for the current zoom window; the `datazoom` event payload changes shape by
trigger; candlestick data order; every Hoist number format needs a function.

## 5. Agent-fit evidence

All three needed **functions for every Hoist number format** (axis labels, tooltips, data
labels). None of the native configs is pure JSON once formatted to Hoist standards. This is the
practical case for format refs in the Hoist spec (`{id: 'percent', args}`, 09 section 8): the
spec stays JSON, and the renderer owns the functions.

Silent traps found in one day of building, each one an agent would likely hit with raw options:

| Library | Trap | Effect |
|---|---|---|
| Highcharts | Stock `dataGrouping` on by default | Tooltips show averages |
| Highcharts | `compare` values in percent units | Axis reads +500% for 5% |
| Highcharts | `palette.colorScheme` defaults to `'light dark'` | Chart follows the OS theme, not the app |
| AG Charts | `setState` without `version` | No-op, console warning only |
| AG Charts | Old option names (`colorRange`, array `axes`) | Validator warns, chart renders wrongly |
| ECharts | Candle order `[open, close, low, high]` and missing `encode` on category axis | Index plotted as price |
| ECharts | Category-axis markers and zoom values are indices | Events land on the wrong date |

## 6. Control surface

`spikes/control.html` proves one config model with two drivers (10). It runs on any of the three
renderers from the same spec. Checked with `spikes/scripts/control-check.mjs`: initial render,
then four agent tool-call sequences, including a rejected call that returns path-prefixed
errors, with no console errors.

## 7. Verdict

**Highcharts did the most with the least custom code on time series, and was fastest on the
default path, with the smallest bundle.** Its one real gap was cross-chart crosshair sync, which
Hoist would write once. ECharts was a close second and is the best fallback if Highcharts ever has
to go. AG Charts worked, but needed undocumented options for panes, was slowest on zoom and
is three times the bundle.

Confidence: **high** for the relative ranking on these seven charts. **Medium** for absolute
performance on client hardware.
