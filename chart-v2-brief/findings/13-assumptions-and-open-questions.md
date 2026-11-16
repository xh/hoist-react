# 13 - Assumptions and open questions

The brief said to work without stopping for questions. This file records each judgment call,
why it was made, and what would change it. Items marked **Decision** need a partner call.

## Assumptions made

| # | Assumption | Why | What would change it |
|---|---|---|---|
| A1 | The spike uses the latest library versions on npm on 2026-11-15: Highcharts 13.1.1, AG Charts Enterprise 14.3.0, ECharts 6.1.0. | The brief asks for current state of the art. Hoist pins Highcharts 12.x today (`kit/highcharts/index.ts` MIN 12.4.0, MAX 12.*.*). | If 13 has breaking changes that matter, a V2 on 12.x is still viable. See 07 and 12. |
| A2 | The top three to spike are Highcharts (mandated baseline), AG Charts and ECharts. | Chosen before scoring finished so the spike could run in parallel with research. The scoring in 05 ranks them first to third of the five scored, but AG Charts (66) only narrowly beats SciChart (65). | SciChart's hostname-capped licences fit a toolkit badly regardless of score, so a SciChart spike would not change the decision. |
| A3 | AG Charts ran without a licence key. It shows a watermark and logs a licence message. | No key available, and none is needed to evaluate. | None. Rendering is identical with a key. |
| A4 | Stress-test timings come from headless Chrome 157 on an Apple M3 Max (36 GB). | Repeatable, scriptable (`spikes/scripts/shoot.mjs`). | Client desktops are slower, often with weaker GPUs. Treat numbers as relative, not absolute. Re-run on a typical client VDI before relying on absolute figures. |
| A5 | Synthetic data is deterministic and seeded (`spikes/shared/data.js`). The trading calendar is approximate (NYSE-style weekday holidays, no Good Friday, no observed-holiday shifts). | Enough to test gap handling. | None for the decision. |
| A6 | "Hoist dark and light themes" means the colors in `cmp/chart/theme/{Dark,Light}.ts` and `styles/vars.scss`. The series palette was replaced with a CVD-validated palette. | The current dark palette fails lightness and chroma checks (run with the dataviz palette validator). The light theme sets no palette and falls back to Highcharts defaults. | If the partners prefer the current colors, swap them in `CS.themes`. The design keeps palette as a theme token either way. |
| A7 | Report data comes from named data sources with typed fields, derived fields and query inputs. | A common shape for app-defined reports. | A real data-source contract would let the spec's `source` binding match it exactly. See 09 section 7. |
| A8 | Bundle sizes are esbuild tree-shaken, minified and gzipped, for two feature profiles per library (`spikes/scripts/bundle-size.mjs`). | Reproducible and comparable. | Webpack via hoist-dev-utils may differ by a few percent. |
| A9 | The spike code is plain browser JS with UMD bundles, not TypeScript or React. | The brief requires `index.html` to open from the file system. ES modules do not load over `file://`. | The real implementation is TypeScript on Hoist. The proposed API in 09 is TypeScript. |
| A10 | The "need frequency" of each chart family in 04 (often / occasionally / rarely) is XH's judgment from the brief's list. | No usage data was available. | Real widget counts from client apps would re-order Phase 4. |
| A11 | Stress zoom timings use each library's programmatic zoom API. | Repeatable across libraries. | Mouse-driven zoom may be faster in AG Charts, which claims 60 fps for its own interactions. |
| A12 | The API in 09 went through two review rounds with an independent API reviewer agent, plus a research survey of the portable pattern across Hoist (14, `notes/portable-spec-pattern.md`). | An independent check of the design was requested. | None. The settled points are listed in 09 section 9. |

## Decisions for the partners

Each has a recommended answer. **Decision** items block Phase 0 (12).

| # | Question | Recommended answer | Why it matters |
|---|---|---|---|
| D1 | **Decision:** Stay on Highcharts and build the spec-first family (08 option e)? | Yes | Sets the whole plan. Strongest argument against is in 08 and 05. |
| D2 | **Decision:** Upgrade Hoist to Highcharts 13 in the next Hoist major, before V2 code lands? | Yes | 13 changed options and theming (`palette`), and the official React wrapper needs it. Doing it later means two migrations. |
| D3 | First-class families and their order (04): Category, Heatmap, Distribution, Scatter, Flow? | As listed, adjusted by real report usage | Partners know the report mix better than this brief. |
| D4 | Is 3D surface or process-flow support a real client need in the next year? | Assume no | If yes, plan an app-level widget on another library (04 section 5), not a second Hoist backend. |
| D5 | Naming: `TimeSeriesChart` / `TimeSeriesChartModel` exported from `cmp/chart`, with no `v2` folder? | Yes | New names need no rename of `ChartModel`, which stays as the escape hatch. |
| D6 | Should authored widgets persist the full spec, and code-defined charts only state? | Yes, with seed semantics: a saved spec wins whole over the code seed | Defines what a saved, shared report contains, and lets releases reach code-defined charts. |
| D7 | Agree the data source contract with the first app that builds reports: source ids, params, field metadata. | Yes, in Phase 0 | It is the seam that makes report embedding across apps work (10). |
| D8 | Replace Hoist's legacy chart palette with the CVD-validated one (A6)? | Yes, in the Highcharts 13 upgrade | Charts change color for users. Ship it with the major. |
| D9 | Build the portable groundwork (`NamedRef`, `NamedRegistry`, format registry) in core with Chart V2, so Grid can follow (14)? | Yes, only the parts charts use | Sets the pattern for agent-built grids and forms without building them now. |

## Open questions not blocking

- Should cross-chart crosshair sync also link to grid row hover (highlight the row for the hovered
  date)? Nice to have, cheap once sync exists.
- `model.series` holds specs, while `gridModel.columns` holds `Column` objects (09 section 5).
  The reviewer accepted this but flagged it. Should the chart mirror Grid and expose resolved
  objects as `series`, with specs reached through `getSpec()`?
- How should live ticking interact with a rebased chart? Rebasing on every tick moves every line.
  Probably rebase only on range change.
- Does a report-building app need chart-level query inputs (e.g. a date range picker bound to the
  source's `params`), or are inputs report-level? Affects whether the widget's `source.params` are editable
  in the settings panel.
