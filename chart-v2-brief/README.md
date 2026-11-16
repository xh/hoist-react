# Hoist Chart V2 - decision brief

Research and design for a GridModel-grade chart model in hoist-react. Updated 2026-11-16.
Nothing in hoist-react or any other repo was changed. All code is spike code in `spikes/`.

## Start here

**What we are building.** A `TimeSeriesChartModel` on Highcharts Stock that works equally well
from code and from JSON. A developer configures it like a `GridModel`. A dashboard widget saves
it. An agent builds and edits it through tool calls. All three use the same definition, the same
methods and the same validation. It is also the first Hoist component built on a pattern that
Grid and forms can follow when they need agent-built instances.

**The library answer (unchanged).** Keep Highcharts and build on it. Same library for the other
chart families later. Evidence: 03, 05, 07.

**The design, in seven points** (full API in `findings/09`):

1. **Config extends Spec.** `new TimeSeriesChartModel({store, persistWith, timeField, series,
   panes, rebase, range, ...})` - one flat config, like `GridConfig`. The spec keys are a declared
   subset: the chart's definition. Infra keys (store, handlers, persistence) stay in code.
2. **Definition plus state overlay**, as Grid has column specs plus column state. User tweaks
   (hide a series, change range) live in the overlay and survive a release that changes the
   chart. Restore defaults clears the overlay.
3. **Every method writes one layer.** `addSeries` / `updateSeries` / `setSpec` / `updateSpec`
   change the definition. `hideSeries` / `updateSeriesState` / `setRange` change state. UI, code
   and agent tools share this one list.
4. **Portable, not just serializable.** Any slot that takes a function also takes a named ref
   (`'percent'`, `{id: 'percent', args: {precision: 1}}`). Code may use either. JSON uses refs.
   A ref rebuilds the same function wherever the name is registered.
5. **Registries per domain.** A small generic `NamedRegistry` in core. Formats and series
   transforms first. Hoist built-ins use bare names. App names must contain a dot.
6. **Type and data source live on the widget**, not in the spec. One chart definition can rebind
   to dashboard context.
7. **Flat lists linked by id.** Panes, axes and series. `splitBy` makes one series per value
   (one line per fund) and never aggregates.

**Settled.** The design went through two rounds with an independent API reviewer and a survey of
the pattern across Hoist. The decisions and their reasons are in 09 section 9.

**Needs a partner call** (`findings/13`, each with a recommended answer):

- D1: Stay on Highcharts with this design.
- D2: Highcharts 13 in the next Hoist major.
- D7: Agree the data source contract with the first app that builds reports.
- D9: Build the portable groundwork in core with Chart V2, so Grid can follow (14).

**Next step.** Phase 0 and 1 in `findings/12`: decisions, the Highcharts 13 upgrade, the portable
groundwork, then the `TimeSeriesChartModel` core. Exit test: the spike's NAV and drawdown charts
built on the real model in Toolbox, persisted and restored.

## Reading order

| # | File | Read it for |
|---|---|---|
| - | `index.html` | The presentation. Open from the file system. Arrow keys or click; T toggles theme. Live charts need `cd spikes && pnpm install && pnpm vendor` once. |
| 1 | `findings/09-proposed-api.md` | The API: spec, state, model, persistence, the portable rules |
| 2 | `findings/14-portable-pattern.md` | How the same pattern extends to Grid, forms and data |
| 3 | `findings/10-control-surface-and-widget.md` | Settings UI, dash widget, saved JSON |
| 4 | `findings/11-genui-and-agent-integration.md` | Agent tools, schema, validation |
| 5 | `findings/13-assumptions-and-open-questions.md` | Decisions needed |
| - | `findings/05`, `07`, `08` | Why Highcharts, what the spike measured, why this architecture |

## All files

| Path | Contents |
|---|---|
| `findings/01-current-state.md` | Today's Chart / ChartModel, its 16 gaps, how GridModel differs, Toolbox evidence |
| `findings/02-library-landscape.md` | Survey of 16 libraries, one section each, with cut reasons |
| `findings/03-time-series-depth.md` | Feature-by-feature time-series matrix, 7 libraries |
| `findings/04-breadth-coverage.md` | Coverage map of 19 chart families and the plan for non-time-series charts |
| `findings/05-shortlist-and-scoring.md` | Weighted criteria, scores, sensitivity |
| `findings/07-spike-results.md` | Spike results, stress numbers, adapter size, bundle size, traps |
| `findings/08-architecture-options.md` | Options (a)-(e) with trade-offs; recommends (e) |
| `findings/09-proposed-api.md` | TypeScript API and the settled design decisions |
| `findings/10-control-surface-and-widget.md` | Method table, settings UI, dash widget, persisted JSON |
| `findings/11-genui-and-agent-integration.md` | Agent tools, schema profile, validation, chat-kit integration |
| `findings/12-migration-and-roadmap.md` | Phases, breaking changes, coexistence |
| `findings/13-assumptions-and-open-questions.md` | Assumptions made and decisions for the partners |
| `findings/14-portable-pattern.md` | The code / JSON pattern beyond charts: Grid, forms, data, sequencing |
| `notes/` | Raw research with source URLs and evidence. `portable-spec-pattern.md` holds the counts and type-check results behind 14. |
| `spikes/` | Runnable spike: `cd spikes && pnpm start`. See `spikes/README.md`. The spike predates the final API names; its specs show the shape, not the exact keys. |

## Verified vs inferred

Every finding marks what it measured, what it read at a cited source, and what it inferred.
Library versions and features were checked against live sources on 2026-11-15 and carry URLs in
`findings/02` and `notes/research-*.md`. Spike timings are from one
machine (Apple M3 Max, headless Chrome 157) and are relative, not absolute.
