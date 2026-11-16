# Spike: AG Charts Enterprise 14.3.0

Adapter: `spikes/adapters/agcharts.js` (424 lines). Vendored UMD build, global `agCharts`. All charts use `AgCharts.create()`.

Licence: no key. Every page load logs a 7-line `AG Charts Enterprise License / License Key Not Found` banner as console errors ("All AG Charts Enterprise features are unlocked for trial"). Every chart shows an "AG Charts - For Trial Use Only" watermark in the bottom-right corner. Left as is.

The UMD global exposes `AgCharts` (`create`, `createFinancialChart`, `createGauge`, `createQuadrantChart`, `createVolumeProfileChart`), `LicenseManager`, `ModuleRegistry`, every `*Module`, `VERSION` and `time`. The UMD bundle registers all modules itself. ESM users must call `ModuleRegistry.registerModules([AllEnterpriseModule])`.

## 1. Per chart

| Chart | Status | Native features used | Custom code (rough lines) | Problems |
|---|---|---|---|---|
| navRebase | full | `ordinal-time` axis, navigator + mini chart, `ranges` (range buttons), wheel zoom, drag-select zoom, crosshair with labels, shared tooltip, legend, `initialState.zoom.rangeX` for the `3Y` default | Rebasing: `zoom` listener recomputes rows and calls `updateDelta({data})` (~20). Range-button value fn via `CS.rangeWindow` (1). UTC axis-date formatter (~10, shared) | No native compare/percent mode. Range buttons have no selected/active state. The mini chart shows rebased values, so it shifts slightly as the base moves |
| candles | full, but relies on undocumented options | `candlestick` with `item.up/down` styles and `openName..closeName`, `bar` for volume, `itemStyler`, `ordinal-time`, navigator, `ranges`, crosshair spanning both panes, shared tooltip | Direction flag per row + `itemStyler` (~4). Panes via undocumented axis `layoutConstraints` (~10). `ignoreZoom`, `nice: false` and denser `interval` on pane axes (~4) | `createFinancialChart()` cannot be used: it warns `Unknown option series` / `legend` and ignores them, so no SMA overlays and no legend. Its volume also overlays the price area rather than sitting in its own pane |
| perfDrawdown | full, same undocumented pane options | Two stacked panes in one chart, `area` + `line` series, x-axis `crossLines` (`line` for events, `range` for the band) that span both panes, crosshair across panes | Same pane code as candles. Event/band dates snapped to a data x value, because ordinal-time cross lines need an existing category (~3) | With `nice` on, pane axes pad far past the data (cum axis -100%..200% for data -10%..123%) and `max: 0` is ignored. Fixed with `nice: false` plus `interval.minSpacing/maxSpacing`. `crosshair.syncGroup` is moot in one chart |
| stress | full | Automatic M4 aggregation (no option), `time` axis, navigator + mini chart, crosshair, shared tooltip, `setState({zoom})` + `waitForUpdate()` for `zoomTo` | Columnar to row objects (~10, about 20 ms for 250k rows) | `setState` needs a `version` string. Without it AG warns `Could not restore data, missing [version]` and ignores the call. Zoom costs about 200 ms per step (see section 2) |
| corrHeatmap | full | `heatmap` series, `colorScale.domain/fills` with stops, gradient legend, cell labels, category axes | 21 pre-mixed sRGB colour stops (~10). Label contrast via `label.itemStyler` (1). Rows sorted to `source.categories` (1) | With the 5 theme stops alone, values between the warm-grey midpoint and blue render visibly green/teal. AG seems to blend through hue. Category order is data order. The y axis puts the first category at the top by default |
| returnsHist | full | `histogram` series with explicit `bins`, `line` series for the normal fit, x-axis `crossLines` for VaR | Bins, normal curve and quantile come from `CS.transforms` (~5) | Docs call `binCount` approximate ("try to split"), so explicit bins were passed to get exactly 60 |
| flowsSankey | full | `sankey` series (`fromKey/toKey/sizeKey`), palette fills | none | Each column renders nodes in reverse data order |

## 2. Stress results (dark theme, `--hover`, 3 runs)

Large-data mode: none to configure. AG states that it applies M4 aggregation automatically to the visible range ([Large Dataset Interactivity](https://www.ag-grid.com/charts/react/large-dataset-interactivity/)). Rendering is canvas only, with no WebGL path. Published claim: "optimised to handle large datasets with over 1 million points, while maintaining full, smooth interactivity ... No additional configuration or modules required". The product page also says zooming, panning and scrolling run "at 60fps". The only related knob is `maxRenderedItems`, and it applies to scatter markers only.

| Run | render ms | zoom-in ms (mean of 3) | reset ms | hover median ms | hover p90 ms |
|---|---|---|---|---|---|
| 1 | 244 | 194 | 270 | 84 | 87 |
| 2 | 243 | 194 | 266 | 84 | 85 |
| 3 | 245 | 204 | 271 | 83 | 86 |
| **median** | **244** | **194** | **270** | **84** | **86** |

- Render includes building the 250k row objects. That conversion alone measured 18-32 ms.
- `zoomTo` = `chart.setState({version, zoom: {rangeX}})` then `chart.waitForUpdate()`. `ratioX` costs the same.
- Probe breakdown of one 5% zoom step (scratch test, not the harness): about 165 ms as configured, about 135 ms with the navigator off, and about 65 ms with the legend also off. The legend costs roughly half of each zoom. I did not find out why.
- Hover: every AG chart, even the 19-link sankey, measured a 50 ms median. That looks like a floor (AG pointer cadence or harness), so compare it against the other libraries before reading anything into it. The stress chart adds about 34 ms on top.
- Programmatic zoom at ~200 ms per step is well short of the 60fps claim. Wheel and drag zoom were not timed separately.

## 3. Easy, hard, surprises

Easy:
- Range buttons, navigator with mini chart, wheel and drag-select zoom, crosshair with axis labels, shared tooltip, and the `ordinal-time` axis are each one option. The ordinal axis gives the trading calendar directly.
- Cross lines (`line` and `range`) on the x axis work for events and bands and span all panes.
- Heatmap, histogram (explicit bins) and sankey were all native with little code.
- The chart-level `formatter` callback gets `source` (`axis-label`, `tooltip`...), `type`, `property`, `seriesId` and `unit`. One function covers every tooltip value ([Formatters](https://www.ag-grid.com/charts/react/formatters/)).

What fought me:
- **Stacked panes are not a documented feature.** The Financial Chart preset (`createFinancialChart`) builds its volume pane with axis options `layoutConstraints: {stacked, align, unit, width}` and `ignoreZoom`. The 14.3.0 validator marks both as `Symbol("undocumented")`. I used them. Alignment is only `start`, `center` or `end`, so at most 3 panes can be placed, and a middle pane only works when the sizes are symmetric.
- **Zoom auto-scaling uses one `ratioY` for every y axis.** With price and volume axes, the price axis was pinned to include 0 (state showed `rangeY 0..128`). Setting `ignoreZoom` on the lower-pane axes fixed it, but those axes then show their full-data range.
- **The documented alternative, separate charts with `sync`, works but misaligns.** In a scratch test, zoom synced (identical `ratioX`) and crosshair/tooltip synced. But the plot areas differed (1081 px vs 1127 px wide, because y-label widths differ), so the synced crosshair sat at different x positions in each chart. Each chart also shows its own tooltip and its own watermark. Fixing this needs manual axis `thickness`. ([Sync](https://www.ag-grid.com/charts/react/sync/))
- **`createFinancialChart()` is closed.** It accepts only its flag options (`navigator`, `volume`, `rangeButtons`, `toolbar`, `statusBar`, `zoom`, `sync`, keys, `chartType`, `theme`...) and drops `series`, `legend` and `axes` with warnings. No overlays or indicators ([Financial Charts configuration](https://www.ag-grid.com/charts/react/financial-charts-configuration/)).
- **No compare/percent mode.** Rebasing uses the documented `zoom` event, which fires for wheel, drag, navigator and range buttons and carries `rangeX` and `source` ([Events](https://www.ag-grid.com/charts/javascript/events/)). The data is then replaced with `updateDelta({data})`. Zoom is kept by `zoom.onDataChange.strategy: 'preserveDomain'` (the default).
- **No initially selected range button.** The docs have no `selected` option, and buttons show no active state after a click ([Range Buttons](https://www.ag-grid.com/charts/javascript/range-buttons/)). The initial range comes from `initialState.zoom.rangeX` ([State API](https://www.ag-grid.com/charts/javascript/api-state/)).
- **Dates are local time only.** The only UTC switch is per interval (`{unit, step, utc}`), which needs a fixed step. A scratch tooltip showed "16:00 Nov 26 2024" for a UTC-midnight date. The adapter formats every axis and tooltip date itself.
- **Ordinal-time ticks are not period-aligned.** By default, the "year" ticks fell on data points such as 2017-11-14 and 2019-11-18 and were labelled "2017" and "2019", so COVID (Mar 2020) appeared just after "2019". A fixed `interval.step: 'year'` aligns them but no longer adapts to zoom. The adapter labels each tick with its real month and year instead.
- **`nice` on stacked axes** pads the domain far past the data and overrides `max` (see perfDrawdown).
- **Heatmap colour blending** goes green between the warm-grey midpoint and blue (see table).
- **Animation default:** `waitForUpdate()` resolves before entry animations finish. The first histogram screenshot showed a half-drawn normal curve. Animation is off in the adapter.
- **Default hover dims other series.** The adapter turns this off per series with `highlight.unhighlightedSeries.opacity: 1`.

API surprises vs older AG Charts (pre-v11 is likely what most examples online and most LLM training data show):
- `axes` is an object keyed by id (`{x: {...}, y1: {...}}`), and series bind with `xKeyAxis` / `yKeyAxis`. It is no longer an array with `position` + `keys`.
- Heatmap uses `colorScale: {domain, fills: [{color, stop}]}`, not `colorRange` / `colorDomain`.
- The cross-line label `position` is deprecated in favour of `placement` (logs a warning).
- v14 removed theme params `axisColor` (now `axisLineColor`) and `separationLinesColor` ([Upgrade to 14](https://www.ag-grid.com/charts/react/upgrade-to-ag-charts-14/)).
- `setState()` silently does nothing unless `version` is included (it only warns).
- `ordinal-time` rejects `nice` ("Unknown option"), while `time` accepts it.
- `navigator.miniChart.series` exists but is undocumented, and it merges by index with the main series (a line mini-series picked up the candlestick's `openKey`...). The documented control is `showInMiniChart` per series, which the adapter uses.
- The documented `zoom` chart event, the chart-level `formatter`, `ranges` and `initialState` are all recent and absent from older examples.

## 4. Adapter size

`wc -l adapters/agcharts.js` = 424.

- Plumbing (theme, base options, handle, entry points, `zoomTo`): ~75
- Time series (rows, series mapping, panes, cross lines, axes, rebasing, notes): ~220
- Breadth: ~130 (heatmap with colour scale ~50, histogram ~48, sankey ~24)

## 5. Agent fit

Pure JSON was enough for: series types and keys, axes, `ordinal-time`, `crossLines`, `navigator`, `zoom`, `sync`, `initialState`, theme (`baseTheme`, `palette`, `params`), `ranges` with interval values (`{unit: 'month', step: 3}`), heatmap `colorScale`, histogram `bins`, and sankey.

Functions were needed for:
- The chart-level `formatter` and axis/crosshair `label.formatter`: every Hoist number and date format.
- `itemStyler` for volume up/down colours and heatmap label contrast.
- Range-button values. `YTD` needs a function, and I used one function for all buttons so the windows match `CS.rangeWindow`.
- The `zoom` listener for rebasing.

What an LLM would likely get subtly wrong:
- Writing `axes` as an array, `colorRange` for heatmaps, and cross-line `position`, all from older training data. The validator warns and ignores, so the chart still renders, just wrongly.
- Calling `setState({zoom})` without `version`. It is a no-op with only a console warning.
- Expecting `createFinancialChart()` to take extra series.
- Trusting ordinal-time year labels, which mark arbitrary data points.
- Giving several y axes plain zoom: the shared auto-scale ratio pulls every axis toward each other's domain.
- Assuming UTC dates.

## 6. Theming

Close to the Hoist tokens:
- `params`: `backgroundColor`, `foregroundColor`, `textColor`, `subtleTextColor`, `accentColor`, `fontFamily`, `fontSize`, `gridLineColor`, `axisLineColor`, `borderColor`, `tooltipBackgroundColor`, `tooltipTextColor`, `crosshairLabelBackgroundColor`, `crosshairLabelTextColor`.
- `palette.fills/strokes` from `theme.series`, plus `palette.up/down` from `theme.up/down`.
- `baseTheme` is `ag-default` or `ag-default-dark`.
- Backgrounds, grid, text, fonts and series colours match the tokens in both themes. The 14.3.0 validator lists about 70 params, including `button*`, `menu*`, `input*`, `panel*` and `chrome*`.

What I could not, or did not, control:
- The trial watermark.
- The range-button and zoom-toolbar styling beyond what the params derive. They looked acceptable, so I left them unset.
- The heatmap blend, which needed pre-mixed stops.
- Category label rotation and spacing on the heatmap x axis. The last label collides with the watermark.
- The light-theme `diverging` palette reads well. The dark palette puts its brightest colours at plus and minus 1, so a mid-range dark cell can look lower contrast than the extremes. That comes from the theme tokens, not from AG.
