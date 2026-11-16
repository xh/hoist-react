# Spike: Apache ECharts 6.1.0

Adapter: `spikes/adapters/echarts.js` (594 lines). Full build `dist/echarts.min.js`, global `echarts`.
Screenshots: `spikes/shots/echarts/` (single column, both themes) and `spikes/shots/echarts-3col/` (gallery width).

## 1. Per-chart results

| Chart | Status | Native features used | Custom code (rough lines) | Problems |
|---|---|---|---|---|
| navRebase | full | category x axis, `dataZoom` slider (navigator) + inside (wheel/drag), axis-trigger tooltip, `cross` axisPointer, scroll legend | compare rebase ~12, range-selector buttons ~34, trading-calendar labels ~33, tooltip formatter ~25 | No native percent compare. No native range selector. No public getter for the settled zoom window in axis units. |
| candles | full | `candlestick`, 2 grids, one `dataZoom` over both x axes, `axisPointer.link` across grids, piecewise `visualMap` on a direction dimension for up/down volume | same shared time-series code; SMA from `CS.transforms.sma` | No technical indicators in ECharts (official candlestick examples compute MA in user code). Candlestick tuples on a category axis need explicit `encode`, or the x index is read as a price. Volume legend chip shows the palette color, not up/down. |
| perfDrawdown | full | 2 grids sized by `pane.size`, `markLine` (events), `markArea` (band), `echarts.connect('perf')` | events/bands on an empty carrier series per pane ~30 | Marker labels need room above the grid (manual top offset). Markers belong to a series, so a carrier series keeps them alive when the user hides a real series. |
| stress | full | `dataset` with `keyedColumns` typed arrays (zero copy), `sampling: 'lttb'`, `dispatchAction({type:'dataZoom'})` + `finished` event | none beyond the shared path | Line series has no `large` or `progressive` mode (`LineSeries.js` sets `progressive: 0`). LTTB is the only large-data lever for lines. |
| corrHeatmap | full | `heatmap` series, continuous `visualMap` with `theme.diverging` stops, category axes in `source.categories` order, `inverse` y axis | per-cell label contrast ~5 (uses `echarts.color.lerp/parse`) | No auto-contrast label option. `colorScale.mid` only works when centered: visualMap stops are evenly spaced (adapter notes it if off-center). |
| returnsHist | full | value x axis, `custom` series for bars, `markLine` for VaR, line for normal fit | custom series `renderItem` ~10 | No native histogram since ecStat moved out ([echarts-stat](https://github.com/ecomfe/echarts-stat)). Bins, normal curve and quantile come from `CS.transforms`. |
| flowsSankey | full | `sankey` series, gradient links, adjacency focus | node list ~2 | None. Node colors set per node to follow the Hoist palette order. |

## 2. Stress results (dark theme, 3 runs, median)

Mode: one `dataset` holding the four `Float64Array` columns as-is (no conversion), each line series with `encode` + `sampling: 'lttb'`, animation off. Downsampling is done by ECharts per render.

| Run | render ms | zoom ms | reset ms | hover median ms | hover p90 ms |
|---|---|---|---|---|---|
| 1 | 123 | 47 | 52 | 50 | 52 |
| 2 | 118 | 50 | 51 | 50 | 52 |
| 3 | 115 | 51 | 51 | 50 | 54 |
| **median** | **118** | **50** | **51** | **50** | **52** |

The zoom and hover numbers are frame-bound. Two `requestAnimationFrame`s cost about 57 ms in this headless Chrome. A direct probe in the page measured the real work:
- `render()` synchronous part: 49 ms (data prep: zero, the typed arrays go in untouched).
- `dispatchAction` dataZoom, synchronous: 6 ms for a 5% window, 15 ms for the full range. Paint lands on the next frame (about 16 ms total).
- `showTip` (crosshair + tooltip) synchronous: about 1 ms after warm-up.

Navigator hover (`navRebase`, `candles`) also measured 50 / 51-52 ms, so the stress chart adds nothing visible to hover.

## 3. What was easy, what fought me

Easy:
- Multi-pane layout. Panes are just `grid[]` entries with matching x/y axes. One `dataZoom` with `xAxisIndex: [0, 1]` plus `axisPointer.link: [{xAxisIndex: 'all'}]` gives shared zoom and a crosshair spanning panes. The axis tooltip includes series from all linked panes.
- Large data. Zero-copy typed-array `dataset` + LTTB rendered 1M points in about 118 ms with no tuning.
- Up/down volume via a hidden piecewise `visualMap` on a third data dimension. Pure JSON.
- Heatmap, sankey and markers are all native and JSON-shaped.
- `finished` event gives a clean "drawn" signal for `zoomTo`.

Fought me:
- **Trading calendar.** I compared both routes:
  - `category` axis (default here): no gaps, everything works, but ECharts' time tick logic is lost. Ticks fall at even index steps unless you supply an `axisLabel.interval` callback. I wrote one that labels month/quarter/year rollovers and re-picks the unit on zoom (~33 lines). Marker values and `dataZoom` values become indices, so every date goes through a lookup.
  - `time` axis + ECharts 6 [axis breaks](https://echarts.apache.org/en/option.html#xAxis.breaks) (switch with `?ecTrading=breaks`, ~8 lines). One break per weekend/holiday with `gap: 0` collapses the gaps correctly (548 breaks over 10 years, 111 over 2 years). It is not usable for a trading calendar today. Break edges become ticks labelled "12:00", and the default `'auto'` pruning removes every normal tick near a break, which is all of them on daily data. Suppressing break labels in the formatter leaves an axis with no labels. There is no option to turn pruning off. Render also slows from about 75 ms to about 300 ms on `perfDrawdown`. The docs frame breaks as a way to collapse a few outliers, not hundreds of calendar gaps.
- **Compare percent.** Not native. Re-based on every `datazoom` event with `setOption({series:[{id, data}]})`. The event payload differs by source (percent `start/end`, `startValue/endValue`, or a `batch` for inside zoom). There is no public getter for the settled window, so I used `chart.getModel().getComponent('dataZoom', 0).getValueRange()`, the path the ECharts source comments suggest (`lib/component/dataZoom/DataZoomModel.js`). `getOption()` would work but deep-clones every series on each zoom event.
- **Range selector.** Not native. HTML buttons over the chart that call `dispatchAction({type: 'dataZoom', startValue, endValue})`, with the active state cleared on manual zoom (~34 lines).
- **Histogram.** Bars on a value axis do not size to bin width, so I drew them with a `custom` series.

API surprises vs ECharts 5:
- `grid.containLabel` is deprecated in v6 in favor of `outerBoundsMode` / `outerBoundsContain` ([docs](https://echarts.apache.org/en/option.html#grid.outerBoundsMode)). For stacked panes I set `outerBoundsMode: 'none'` with fixed margins, so each pane cannot shrink on its own and break x alignment.
- v6 ships a new default look. The package now includes `theme/v5.js` to restore the old one. This does not matter here because the adapter registers its own theme.
- Axis breaks are new in v6 (see above).
- Still true from v5: `useUTC` defaults to false (local time), and candlestick data order is `[open, close, low, high]`, not OHLC.

## 4. Adapter size

`wc -l adapters/echarts.js`: **594** (classic JS, Prettier-style wrapping at ~150 columns).

| Part | Lines |
|---|---|
| Theme registration | ~40 |
| Plumbing (mount, finished, helpers, export) | ~55 |
| Time series total | ~340 |
| - of which range selector | ~34 |
| - of which compare rebase | ~12 |
| - of which category-axis calendar labels | ~33 |
| - of which axis-breaks experiment | ~8 |
| - of which events/bands carrier | ~30 |
| - of which tooltip formatter | ~25 |
| - of which notes text | ~18 |
| Breadth (heatmap ~50, histogram ~52, sankey ~35) | ~137 |

## 5. Agent fit

Pure JSON works for: theme, grids, axes, `dataZoom`, `visualMap`, `markLine` / `markArea`, heatmap, sankey, time axis label templates (`{yyyy}`, `{MMM}`), axisPointer linking, `echarts.connect`.

Functions were needed for: every Hoist number format (axis labels, axisPointer labels, tooltips, visualMap labels, cell labels), the category-axis `interval` callback, the `dataZoom` `labelFormatter`, the custom histogram `renderItem`, and all runtime behaviour (rebase, range buttons).

Things an LLM would likely get subtly wrong:
- Candlestick order `[open, close, low, high]`. With `[x, ...]` tuples on a category axis, it also needs `encode: {x: 0, y: [1, 2, 3, 4]}` or the chart draws index values as prices. I hit this.
- On a category axis, a number in `markLine.xAxis` or `dataZoom.startValue` is an index, not a timestamp.
- `large` and `progressive` look like the large-data answer, but line series ignore them. Only `sampling` applies.
- `visualMap` grabs every series unless `seriesIndex` is set.
- `useUTC: true` is needed for UTC-midnight daily data.
- `dataZoom.filterMode` drives y-axis autoscale. `'none'` keeps the y range fixed when zooming.
- Event payload shapes differ by trigger. Code that reads `params.startValue` breaks on wheel zoom.

## 6. Theming

I registered one ECharts theme per Hoist token set (`hoist-light`, `hoist-dark`) with `echarts.registerTheme`, then passed the theme name to `echarts.init`. The theme covers background, palette, font family and size, text, axis line/tick/label/split-line colors, legend, tooltip, axisPointer, `dataZoom` (mask uses `navigatorMask`, handles use `accent`) and candlestick up/down. Per-chart options only add semantic colors: `negative`, `up` / `down` for volume, and `diverging` for the heatmap.

Close to Hoist in both themes: background, grid lines, muted axis text, palette and font. Gaps:
- Range-selector buttons are HTML styled inline from tokens, not ECharts.
- The legend icon for line series is a line + hollow circle (`legend.icon` could change it).
- The slider handle and data-shadow look are ECharts' own and only partly themeable.
- The tooltip keeps ECharts' default shadow and padding.
- Runtime light/dark switching: v6 has `chart.setTheme(name)` (in `types/src/core/echarts.d.ts`). I did not exercise it, because the gallery reloads on a theme change. The per-chart semantic colors and the HTML buttons would still need a re-render.
