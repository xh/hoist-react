# Adapter author brief (shared by the three spike adapter agents)

Context: XH is choosing a charting library for "Hoist Chart V2" in hoist-react (financial apps; time series is the main use). We are spiking three libraries by rendering ONE shared, library-neutral JSON spec with each. You own exactly one adapter file. The spike is evidence for a decision brief, so honesty matters more than polish: report what fought you.

## Where things are
Spike root: `chart-v2-brief/spikes`
- `gallery.html` - loads vendored UMD builds (vendor/), shared files, all three adapters, harness. Opens from file://.
- `shared/specs.js` - THE SPECS. Read every spec and honour every field. 7 charts: navRebase, candles, perfDrawdown, stress, corrHeatmap, returnsHist, flowsSankey.
- `shared/data.js` - named sources (`CS.data.get(name, opts)`) with typed `fields` metadata. `stress` is columnar (Float64Array `t` + `series[]`, plus pointStart/pointInterval).
- `shared/transforms.js` - library-neutral transforms (`seriesXY`, `rebase`, `drawdown`, `sma`, `histogram`, `normalCurve`, `quantile`...). Prefer a NATIVE library feature where one exists (and say so in notes); fall back to these.
- `shared/theme.js` - Hoist theme tokens `CS.themes.light|dark` (bg, grid, text, series palette, up/down, diverging, fontFamily) and `CS.fmt` formatters. Match Hoist look: background, grid, text colors, font, palette from tokens - not library defaults.
- `shared/harness.js` - adapter contract at the top. Read it.
- `scripts/shoot.mjs` - headless Chrome runner. Use: `node scripts/shoot.mjs --libs <yourKey> --theme dark,light --out shots/<yourKey>` (add `--chart navRebase` to do one, `--hover` for hover latency). It prints per-chart timings + console errors and writes PNGs. LOOK AT THE PNGs with the Read tool and iterate until each chart is right in both themes.

## Rules
- Edit ONLY your adapter file `adapters/<key>.js` (plus your notes file). Other agents are editing the other adapters concurrently. Do not edit shared/*, gallery.html or vendor/. If you need a shared change, make a local helper in your adapter and mention it in your notes.
- Map specs generically, driven by spec fields (kind, panes, axes, series[].type, compare, rangeSelector, navigator, events, bands, colorScale, bins, overlay, markers...). No `if (chartId === 'candles')` switches. The adapter's size is a measured output of this spike, so keep it honest and readable. Plain classic JS (no modules/imports); register `CS.adapters.<key> = {key, label, version, render, zoomTo}`.
- Every spec feature must be honoured or explicitly reported. Specifically:
  - `compare: {mode:'percent', base:'visibleStart'}` - series show % change from the first visible point, and RE-BASE when the user zooms/pans or clicks a range button.
  - `rangeSelector` - clickable buttons (1M/3M/.../All) with `selected` initial range. If the library has none, build a minimal one in the chart host (HTML buttons are fine) and count that as custom code.
  - `navigator` - an overview strip with a draggable window.
  - `panes` - stacked panes sharing one time axis, sizes per `size`; a crosshair that spans panes. If the library cannot stack panes in one chart, render one chart per pane with synced crosshair/zoom and report it.
  - `calendar: 'trading'` - no weekend/holiday gaps (ordinal / category-like axis) while keeping a time axis. Report how you achieved it or that you could not.
  - `events` (flags/markers on the time axis with labels) and `bands` (shaded time ranges).
  - candlestick with `colorBy: 'direction'` volume bars (up/down colors from theme).
  - formats: axis + tooltip use spec format objects via `CS.fmt.apply`.
  - heatmap: diverging color scale from theme.diverging, cell labels, category axes in `source.categories` order.
  - histogram: bins, normal-fit overlay line, VaR 95% marker line at the 5% quantile.
  - sankey: nodes + links from fields.
  - stress: use the library's recommended large-data path (e.g. boost/WebGL, sampling, LTTB, progressive). Implement `zoomTo(handle, min, max)` returning a Promise that resolves once the new range is drawn. Report data-prep cost if conversion is heavy. Do not cap or pre-downsample the data in the adapter - the library must handle 1M points (downsampling done BY the library is fine and should be reported).
- If the library genuinely cannot do a chart, return `{gap: 'clear reason'}` - do NOT swap in an easier chart. A partial result is fine if you list what is missing in `handle.notes`.
- Put 2-5 short notes in `handle.notes` per chart (shown under the chart): what was native, what was custom, what is missing.
- Verify against current official docs (Context7 MCP `mcp__context7__resolve-library-id` / `query-docs`, or WebFetch). The vendored versions are the latest: Highcharts 13.1.1, AG Charts Enterprise 14.3.0, ECharts 6.1.0. APIs may differ from your memory - check.
- Plain hyphens in all prose, never em dashes.

## Your notes file
Write `chart-v2-brief/notes/spike-<key>.md`:
1. Per chart table: status (full / partial / gap), native features used, custom code needed (rough lines), problems.
2. Stress results: paste the shoot.mjs numbers (render, zoom, reset, hover median/p90) for dark theme, and which large-data mode you used. Run the stress chart 3 times and report the median.
3. What was easy, what fought you (be specific, with docs links), API surprises vs older versions.
4. Adapter size: `wc -l` and a rough split (time series vs breadth vs plumbing).
5. Agent-fit observations: where the native config needed functions (formatters, callbacks) vs pure JSON; anything an LLM would likely get subtly wrong.
6. Theming: how close you got to Hoist light/dark and what you could not control.

Final message: a 15-line summary - per-chart status, stress numbers, adapter LOC, top 3 pain points.
