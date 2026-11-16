# Shared research rubric (for all library research notes)

Today is 2026-11-15. Verify every version, feature and licence claim against a live source and cite its URL inline. Mark anything not verified as **[inferred]**. Never invent a number; say "not found" instead.

## Per-library section template

1. **Identity** - package name(s), current version + release date (cite npm / GitHub releases), rendering tech (SVG / Canvas / WebGL / WASM), maintainer, activity signals (release cadence in 2025-2026, GitHub stars, weekly npm downloads - cite).
2. **Licence** - licence model, and whether it fits a toolkit used in many client apps. Cite the licence page.
3. **Time series checklist** - rate each: **B** built in, **C** needs custom code (say roughly how much), **X** not practical. One short note each, with a docs URL for B claims.
   - multi-series; multiple y-axes
   - stacked panes sharing one time axis
   - navigator (mini overview) + range selector buttons (1M/3M/YTD/1Y/All)
   - zoom + pan (mouse wheel, drag, touch)
   - crosshair + tooltip sync across separate charts
   - OHLC + candlestick + volume pane
   - comparison / rebasing to percent change from a start date (updates on zoom)
   - returns, drawdown, rolling-window overlays (built-in transforms vs compute yourself)
   - technical indicators (SMA/EMA/Bollinger/MACD/RSI etc.)
   - annotations (text, shapes, user-drawn)
   - event markers (flags) and plot bands / lines
   - trading-calendar handling: ordinal axis / break gaps (weekends, holidays), irregular and intraday intervals, time zones
   - data grouping / downsampling (LTTB, OHLC aggregation on zoom)
   - large-series performance: documented limits, WebGL/boost options, and any published benchmark (cite)
   - live/ticking updates
4. **Breadth coverage** - rate each family **F** first-class, **A** adequate, **W** awkward (possible with effort/hacks), **-** absent. A demo existing is not enough for F. Families: line/area (non-time), bar/column (incl. stacked), pie/donut, scatter, bubble, heatmap (matrix/correlation), histogram, box plot / violin, treemap, sunburst, waterfall, sankey, network/force graph, 3D surface, process flow / org chart / diagram, radar/polar, gauge, geo maps, funnel.
5. **Agent / LLM fit** - is the config declarative and JSON-serializable (no functions needed for common cases)? TS types quality? JSON schema available? How easy to get subtly wrong? How well represented in public code / likely LLM training data? Any official MCP / AI tooling (cite)?
6. **React / TS integration** - official React wrapper, TS-first?, tree-shaking/modular imports, bundle size (cite bundlephobia or package docs, or say not found).
7. **Theming** - theme API, CSS variables, dark mode support.
8. **Verdict** - classify as time-series specialist / generalist / credibly both, with one-line evidence. Shortlist recommendation (yes/no + reason).
