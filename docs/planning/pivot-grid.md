# PivotGrid

**Branches:** `pivot-grid` in hoist-react (based on `develop`), plus a matching `pivot-grid` branch
in Toolbox (also off `develop`) for the harness and example pages.

**Status:** planning. Nothing implemented yet beyond the imported prototype.

**Goal:** promote a client-app `PivotGrid` component into hoist-react as a first-class framework
component, with a pivot data layer that is efficient enough for ticking data.

This is a multi-session effort. Keep this document current: check off TODOs as they land, record
decisions in the sections below as they are made, and append to the session log.

## Terminology

Settled. Use these terms in prose, in code, and in the public API. They replace the prototype's
"summary" vocabulary, which collided with `Store.summaryRecord` and `GridModel.showSummary` —
distinct framework concepts that the value-totals row happens to be *rendered* with, but is not
otherwise related to.

| Term                          | Meaning                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **grouping** / group dimension | Row dimensions — today's tree-grid `groupBy`. 1-3 typical, 6 the practical ceiling.                                |
| **pivot dimension**           | Extra dimensions sliced into columns, hierarchically. 1 typical, 3 the ceiling.                                     |
| **pivot path**                | One ordered tuple of pivot dimension values, e.g. `US >> Equity`. Maps to one column or column group.               |
| **value field**               | The measure to aggregate. 1 typical, occasionally 2-3 related fields.                                               |
| **value column**              | The rendered column for one (pivot path, value field) pair.                                                         |
| **cell**                      | One (group row, pivot path, value field) intersection.                                                              |
| **row totals**                | Per group row, per value field: the aggregate across *all* pivot paths. The docked "Total" column(s).               |
| **pivot totals**              | Per group row, per value field: the aggregate within *one* pivot grouping — i.e. a subtotal at a parent pivot node. |
| **value totals**              | Per pivot path, per value field: the aggregate down *all* group rows. The docked totals row.                        |

Note the structure: **row totals are pivot totals at the root pivot level.** They are the same
operation evaluated at different depths of the pivot tree, which is worth preserving in whatever
shape the pivot data layer takes — it should not need two mechanisms.

**Pivot totals do not exist in the prototype** and are net-new work; scope them in phase 3. They only
appear with 2+ pivot dimensions, so the typical single-pivot-dimension config never shows them.

Mapping from the prototype's names, all of which are to be renamed:

| Prototype                    | New                                |
| ---------------------------- | ---------------------------------- |
| `showSummaryColumn`          | row totals — show/hide             |
| `summaryColumnSide`          | row totals — side                  |
| `extraSummaryColumnFields`   | row totals — extra fields          |
| `showSummaryRow`             | value totals — show/hide           |
| `summaryRowSide`             | value totals — side                |
| `extraSummaryRowFields`      | value totals — extra fields        |
| `SUMMARY_COL_ID_PREFIX`      | row-totals column id prefix        |

Sections below that predate this decision may still use the old words; the checklists are the
authority on what changes, and phase 3 carries the rename.

## Context

`cmp/pivotgrid/` currently holds a working prototype written in a client app and imported wholesale.
It was built to be self-contained (no references outside hoist-react), but it carries app-code
patterns, a handful of latent bugs, and a pivot data layer that cannot support ticking data.

The prototype has three parts:

- **`PivotDataModel`** — the pivoting engine. Widens each leaf record with a synthetic field per
  `(pivotPath, valueField)` pair, then builds a `Cube` over the widened rows so the existing
  aggregators produce the pivot cells. Clever, and it reuses real aggregation for free, but the cost
  model is wrong: `Cube` aggregation is dense over fields while the widened data is sparse over
  fields, so every aggregate row computes every synthetic field. **To be replaced.**
- **`PivotGridModel`** — builds the grid's column hierarchy from the pivot value tree, manages
  summary rows/columns and sorting. Fundamentally sound; needs cleanup and an API refresh.
- **`PivotGrid`** — thin component wrapper. Needs framework conventions.

A full review of the prototype was completed. Its findings are carried forward as checklists under
[Carried-forward review findings](#carried-forward-review-findings) so they survive across sessions.

## Goals

- Pivot data layer that supports **connected, incremental updates** — viable for ticking data.
- Cost proportional to the number of **populated** cells, not to `rowGroups × allPivotPaths`.
- Reuse the existing `data/cube` aggregation machinery rather than reimplementing aggregators.
- Framework-grade component: conventions, docs, validation, persistence, no internals pokes.

## Non-goals

- Server-side or virtualized pivoting.
- Mobile support (this is desktop-only in practice).
- Preserving every feature of the prototype. Some were client-specific asks — see phase 3.

## Potential approach

Nothing here is decided. The pivoting *strategy* below is the working direction that motivated
replacing `PivotDataModel`; the class structure and query shape underneath it are open, and settling
them is phase 1.

### Strategy: innermost pivot dimensions plus projection

**Pivot dimensions become innermost cube dimensions, and the pivot cells are projected out of the
resulting row tree.** No synthetic fields. One Cube over the base fields, grouping on the row-group
dimensions followed by the pivot dimensions, one long-lived connected View. The aggregate row at
tree path `rowGroup >> pivotPath` *is* the cell, already computed.

Why this looks right:

- Aggregation cost drops to `O(rows × baseFields)` over the populated combinations only.
- Ticking works via the existing `View.dataOnlyUpdate` path, which already maintains the aggregate
  network incrementally and pushes changed rows into connected stores.
- A row group's own base-field aggregates *are* its row totals, so the "Total" columns come for free
  and the totals-vs-cells invariant holds by construction.

### Candidate: `PivotView extends View`, with `PivotQuery extends Query`

The leading candidate, but **not settled**. Arguments in favor:

- The result shape genuinely diverges, and folding it into `View` would make `View.result.rows` and
  `loadStores` mean different things depending on config — two modes in one hot class that every
  Hoist app depends on.
- A subclass inherits the whole connect/update machinery unchanged: `Cube._connectedViews` is a
  `Set<View>`, so `noteCubeLoaded` / `noteCubeUpdated` route to the subclass for free.
- Putting `pivotBy` on the Query would make `hasDimOrBucketUpdates` automatically force a full
  rebuild when a leaf's pivot dimension value changes, and gives `updateQuery` / `equals` / `clone`
  for free.

It would need a seam in `View` — roughly a hook after row generation plus overridable publish steps
for the full and incremental paths, and some `private` members widened to `protected`.

### Not yet resolved

These are what keep the approach open. Work them in phase 1.

- **Query shape vs. internal grouping.** A `PivotQuery` would naturally expose `dimensions` (the row
  groups) and `pivotBy` separately, but row generation needs both concatenated as its grouping
  dimensions. Whether that folding happens inside `PivotQuery`, inside `PivotView`, or requires
  changing how `Query` / `View` treat `dimensions` is unclear, and it may force API or
  implementation changes in `View` beyond a simple seam. Knock-on effects to check:
  `hasDimOrBucketUpdates`, `getDimensionValues`, `Query.equals` / `clone`, and anything else reading
  `query.dimensions`.
- Whether a subclass, a fold-in, or a composition over `View` is actually the right factoring once
  the above is understood.
- Whether the incremental changed-rows information `View` needs to expose can be exposed cleanly
  without leaking internals, whichever factoring wins.

Types worth keeping from the prototype, all needing refinement: `PivotField` / `PivotFieldSpec`,
`PivotValue`, `PivotQuery`.

## Phase 0 — Baseline and harness

Do this first. Without a baseline the later numbers have nothing to prove.

- [x] Define acceptance criteria up front — see below.
- [x] Build a pivot benchmark harness in Toolbox Admin — full build, repeated ticks, heap sampling.
      Landed on Toolbox's `pivot-grid` branch at `client-app/src/admin/tests/pivot/`, reachable at
      Admin › Tests › Pivot Bench. Modelled on the `StoreProxyBench*` harness from Toolbox's
      `store-proxy-mode` branch.
- [x] Capture baseline numbers against the current `PivotDataModel` — see below.

### Acceptance criteria

**The shape of real usage.** Pivot grids are summary grids: they slice data into a compact table
that reads without horizontal scrolling. Pivot dimensions are therefore *low* cardinality by nature —
`region` with 4-8 values is the canonical case — and pivoting is chosen precisely because a low
cardinality dimension makes an inefficient tree grouping. The cardinality lives in the **groupings**,
not the pivots. So the profiles below hold pivot paths and value fields near their realistic values
and vary the group-row count, which is what actually scales.

**Profiles.** Leaf counts are fixed per profile; the harness exposes them so they can be dialled.
Every profile has a `+ Drill` variant whose final grouping is unique-per-leaf, adding leaf-level
drill-down and pushing total row count to leaves + group rows.

Row counts below are as measured, not estimated.

| Profile      | Leaves | Groupings | Group rows | Pivot dims → paths | Value fields | Dense cells |
| ------------ | -----: | --------: | ---------: | ------------------ | -----------: | ----------: |
| **Typical**  |    35k |         3 |      2,210 | 1 → 8              |            1 |        17.7k |
| Typical+Drill|    35k |         4 |     37,210 | 1 → 8              |            1 |         298k |
| **Heavy**    |   100k |         3 |      4,212 | 2 → 24 (4×6)       |            3 |         303k |
| Heavy+Drill  |   100k |         4 |    104,212 | 2 → 24             |            3 |         7.5M |
| **Wide**     |    35k |         6 |     31,636 | 3 → 48 (4×4×3)     |            2 |         3.0M |
| Wide+Drill   |    35k |         7 |     66,636 | 3 → 48             |            2 |         6.4M |

"Dense cells" is `group rows × pivot paths × value fields` — the work the prototype does, since its
`Cube` aggregation is dense over the synthetic fields. The rewrite's target is the *populated* subset,
which is far smaller in every profile and smallest where the prototype is worst.

**Gate — Typical.** These are the numbers the rewrite must hit; the other profiles are measured and
tracked every run but are not pass/fail.

| Metric                                       | Target  |
| -------------------------------------------- | ------- |
| Full build (cold, from raw data)             | ≤ 250ms |
| Tick — 1% of leaves (350 recs), values-only  | ≤ 30ms  |
| Pivot layer heap, over the loaded `Cube`     | ≤ 2×    |

**Secondary gate — Typical+Drill**, since leaf drill-down is a normal ask rather than a stress case:
full build ≤ 750ms, tick ≤ 50ms.

If the phase 0 baseline shows the prototype already meets a target, tighten that target rather than
declaring it satisfied — the point is to prove the new cost model, not to clear a low bar.

**Pathological guard.** A separate opt-in run pivots on a near-unique dimension (~5,000 distinct
values, so ~5,000 pivot paths). Phase 0 only *measures* where each implementation falls over. What
the framework should actually do about it — hard cap and throw, soft cap and bucket the tail, or
just document the cliff — is a phase 1 API decision, to be made with those numbers in hand.

### Baseline — `PivotDataModel` as imported

Captured 2026-08-01, headless Chromium on a Linux workstation, with `--expose-gc` and
`--enable-precise-memory-info`. Treat these as a *relative* baseline for the rewrite to beat, not as
an absolute spec — they will move on different hardware. Two consecutive full runs agreed to within
a few percent, so the numbers are stable.

- **Data ms** — `PivotDataModel.update()` alone.
- **Grid ms** — end-to-end `PivotGridModel.loadData()`. Excludes the async `autosizeAsync()` the
  prototype also fires.
- **Tick ms** — median of 5 values-only ticks touching 1% of leaves. No dimension is perturbed, so
  no new pivot path appears and the column structure is unchanged.
- **Synth fields** — synthetic `(pivotPath, valueField)` fields the prototype widens each leaf with.
- **Heap** — retained by the pivot layer over the generated leaves, after a forced GC.

Measured with the harness's `Keep grid` toggle **off**, so the live grid is not mounted. Leaving it
on adds ag-Grid render work to every measurement — roughly doubling Typical's tick, from 128ms to
225ms. Comparable numbers need it off.

| Profile       | Group rows | Dense cells | Synth fields | Data ms | Grid ms | Tick ms | Heap MB |
| ------------- | ---------: | ----------: | -----------: | ------: | ------: | ------: | ------: |
| Typical       |      2,210 |       17.7k |            8 |     138 |     124 |     128 |    21.8 |
| Typical+Drill |     37,210 |        298k |            8 |     279 |     296 |     335 |    44.3 |
| Heavy         |      4,212 |        303k |           84 |     743 |     771 |     836 |   120.2 |
| Heavy+Drill   |    104,212 |        7.5M |           84 |   2,485 |   2,904 |   3,601 |   773.3 |
| Wide          |     31,636 |        3.0M |          136 |   1,370 |   1,637 |   1,734 |   292.0 |
| Wide+Drill    |     66,636 |        6.4M |          136 |   2,150 |   2,659 |   3,146 |   528.0 |
| Pathological  |      2,210 |       11.1M |        4,996 |  27,011 |  28,465 |  27,327 |   469.1 |

**Gate result: FAIL on Typical, on the tick metric alone.** Full build is 138ms against a 250ms
target — comfortably inside. The tick is 128ms against a 30ms target, missing by 4.3×.
Typical+Drill is the same story: build 279ms against 750ms (pass), tick 335ms against 50ms (miss by
6.7×). The build target is *not* where the prototype is broken.

What the numbers establish:

1. **A tick costs a full rebuild — confirmed empirically, not just by reading the code.** Tick time
   tracks end-to-end grid build within 0-25% on every profile. There is no cheap path, and no
   dependence on how much data actually changed: perturbing 1% of leaves costs the same as building
   from nothing. This single fact is the case for the phase 2 rewrite.
2. **Synthetic fields are created at every pivot level, not just the leaf level.** Heavy's 84 =
   (4 paths × 3 values) + (24 paths × 3 values); Wide's 136 = 8 + 32 + 96. The Cube then aggregates
   all of them densely across every row. Wide is 31,636 rows × 136 fields ≈ 4.3M field-aggregations
   for 3.0M dense cells.
3. **Cost is not a clean function of dense cells.** Small profiles are floored by leaf parsing
   (~35k leaves into a Cube costs >100ms before any pivoting), and Pathological manages only ~400
   cells/ms against Wide's ~2,200 — so per-*field* overhead dominates once the field count is large,
   independently of cell count. Both floors matter for the phase 2 design: the rewrite has to beat
   the fixed parse cost as well as the aggregation cost.
4. **Heap is the most alarming column.** 773MB retained for Heavy+Drill and 528MB for Wide+Drill —
   and that is the *clean* figure, measured with teardown and a forced GC between runs. It does not
   include the per-update Cube leak listed under the ticking blockers, which an app would accumulate
   on every tick.
5. **Pathological degrades rather than crashes.** 5,000 pivot paths gives a 27s build and 469MB, but
   it completes. There is no hard cliff to defend against — which argues that the phase 1 guard can
   be a soft cap or a warning rather than a thrown error, since no value of the dimension makes the
   framework fail outright, only unusable.

## Phase 1 — Pivot data API contract

The gate for both phase 2 and phase 3. Design only, no implementation.

- [ ] **Decide the factoring**: subclass `View`, fold into `View`, or compose over it. Resolve the
      [open questions](#not-yet-resolved) first — in particular how the row-group vs. pivot
      dimension split reconciles with the single concatenated dimension list row generation needs,
      and what that implies for `Query` / `View` themselves.
- [ ] Query interface: how row-group dimensions, `pivotBy`, and `valueFields` are expressed, and
      where the concatenation for grouping happens.
- [ ] Result shape: row-group rows, the pivot value tree, leaf access.
- [ ] Whatever seam or API change in `View` the chosen factoring requires.
- [ ] **Incremental contract.** What a tick emits, and specifically how a *structural* change (a
      tick introduces a new pivot path, i.e. a new column) is signalled distinctly from a
      values-only change. This determines whether `PivotGridModel` can skip rebuilding columns on
      the common path, which was one of the larger perf findings.
- [ ] **Empty-cell and null-dimension semantics.** Whether a null pivot dim value becomes an
      `(empty)` bucket or is excluded, and whether excluded records still count toward row totals.
      Current prototype behavior is inconsistent.
- [ ] **Field naming and the path delimiter.** The prototype hardcodes `>>`, which collides with
      `Cube.RECORD_ID_DELIMITER` and breaks when a dimension value contains it. One exported
      constant, plus a decided answer for values containing the delimiter.
- [ ] Interaction rules for `omitRedundantNodes`, `omitFn`, `lockFn`, and `bucketSpecFn` at pivot
      levels. Leaning toward disallowing bucketing on pivot dims in v1.
- [ ] **Pivot cardinality guard.** Decide what happens when a user pivots on a near-unique dimension:
      hard cap and throw, soft cap with an `(other)` bucket, or document the cliff and do nothing.
      Make this call against the phase 0 pathological-run numbers, not in the abstract.
- [ ] Where the new classes live and what is exported from `data/index.ts`.

## Phase 2 — Pivot data layer implementation

Parallel with phase 3 once phase 1 is settled. Class names below are placeholders pending the phase
1 factoring decision.

- [ ] Brute-force reference pivot implementation, for test assertions only.
- [ ] Failing unit tests covering: multi-level pivots, multi-measure, sparse/absent cells, null
      dimension values, every aggregator (especially `AverageStrict`, `SumStrict`, `Unique`),
      totals invariants, and full-build vs. tick-then-compare equivalence.
- [ ] `View` / `Query` changes per the phase 1 decision, with non-pivot behavior provably unchanged.
- [ ] The pivot query, view, and result types.
- [ ] Row-tree truncation so pivot-level nodes never reach a connected store. Note: truncating by
      depth is fragile because `omitRedundantNodes`, `omitFn`, and bucketing all shift levels during
      `getVisibleDatas` — prefer marking rows during generation.
- [ ] Incremental projection driven off the changed-rows set.
- [ ] Benchmark against phase 0 baseline; confirm acceptance criteria.
- [ ] Retire `PivotDataModel`.

## Phase 3 — PivotGridModel

Parallel with phase 2, except the final Toolbox items which need working pivot data.

- [ ] **Decide the feature set.** The main client-specific surface still in place is
      `extraSummaryRowFields` (extra value-total fields) with its `colSpan` / `cellStyle` machinery.
      Settle this before working the bug checklist, since some findings live in code that may be cut.
- [ ] **Adopt the settled [terminology](#terminology) across the public API** — rename the
      `showSummaryColumn` / `showSummaryRow` / `extraSummary*Fields` / `summary*Side` config family
      per the mapping table. Do this alongside the feature decision, before the bug checklist, so
      findings are worked against final names.
- [ ] **Pivot totals** (subtotal columns at parent pivot nodes) — net-new, absent from the prototype.
      Decide whether v1 ships them. Cheap if the data layer computes row totals as pivot totals at
      the root, since the aggregates already exist at every pivot depth; the work is column building
      and config surface.
- [ ] Add `Store.setFields()` to the framework, replacing the prototype's private-field pokes. Must
      enforce the no-`id`-field rule that direct assignment currently bypasses. Independent of
      everything else, so good parallel work.
- [ ] Rewire `PivotGridModel` onto the new pivot data API.
- [ ] Work the [correctness](#correctness-bugs) and [cleanup](#framework-conventions-and-cleanup)
      checklists for whatever survives the feature decision.
- [ ] Refine public config and API: sorting, totals/summary rows and columns, column overrides, and
      persistence via `persistWith`.
- [ ] Decide package location: `cmp/pivotgrid` vs `desktop/cmp/pivotgrid`. Desktop-only in practice;
      decide deliberately rather than by inheritance from where the prototype was dropped.
- [ ] Toolbox Admin test page (evolve the phase 0 harness).
- [ ] Toolbox example page.

## Phase 4 — Docs and packaging

- [ ] `cmp/pivotgrid/README.md`.
- [ ] `data/cube/README.md` section on the pivot view (belongs with phase 2, not deferred to the
      end).
- [ ] Doc registry + roadmap index entries (`xh-update-doc-links`).
- [ ] CHANGELOG entry; upgrade notes if the `Query` / `View` changes are breaking.
- [ ] Export from the appropriate package index.

## Carried-forward review findings

From the full review of the imported prototype. Items marked *(moot)* if the rewrite removes them.

### Blockers for ticking — all resolved by the phase 2 rewrite

- `PivotDataModel.createCube()` builds a new `Cube` per update and never destroys it. `Store`
  registers itself in the strong `InstanceManager.stores` set, so every update permanently leaks a
  full copy of the pivoted record set.
- `idSpec: () => XH.genId()` gives records no identity across updates, precluding anything
  incremental.
- Every update does a full rebuild end to end: pivot metadata, synthetic fields, new Cube, full
  `Store.loadData`, transient `executeQuery` View, grid store field replacement, `setColumns`, full
  grid reload.

### Correctness bugs

- [ ] `PivotGridModel:466,469` — `field.columnTemplate.renderer` is unguarded; any value field
      without a `columnTemplate` throws in the renderer.
- [ ] `PivotGridModel:512` — `sortPivotValues` copies the top-level array but then assigns
      `it.children` in place, so building columns mutates the data model's observable state.
- [ ] `PivotDataModel:154` — `this.data = rootData.children` can be null and flows into
      `gridModel.loadData`.
- [ ] `PivotDataModel:160,181` — `summaryRowData` is `@observable.ref` but mutated via `push()`.
      Works only because it happens inside one `@action`.
- [ ] `PivotDataModel:158` — dead re-assignment of line 130.
- [ ] `PivotDataModel:236` — a null pivot dim value leaves the record with no pivoted fields while
      it still contributes to base-field aggregates, so the Total column does not equal the sum of
      the pivot columns. Resolve via the phase 1 null-semantics decision.
- [ ] Five `// TODO: Validate` sites in the `PivotGridModel` constructor. Bad field names currently
      surface as `undefined.name` TypeErrors deep in column building.

### Performance — prototype hot spots

Most are *(moot)* after the rewrite, but the renderer-path and column-rebuild items live in
`PivotGridModel` and must be fixed regardless.

- [ ] `PivotGridModel:498,455` — `summaryColumnCount` calls `agApi.getColumns()` and filters all
      columns **from inside a cell renderer**. `O(cols)` per cell, and throws if `agApi` is null.
- [ ] `PivotGridModel:463` — the summary renderer calls `getField()` per cell, which in the
      prototype allocates a spread array and linear-scans thousands of fields.
- [ ] `PivotGridModel:276` — `setColumns` runs on every data load, rebuilding every `Column` and
      resetting `columnState`, even when the pivot structure is unchanged. Depends on the phase 1
      structural-change signal.
- [ ] `PivotGridModel:292` — thousands of `new Field()` per update; cache when structure is
      unchanged.
- [ ] `PivotGridModel:208,258` — unconditional `autosizeAsync()` plus hardcoded `autosizeOptions`
      with `includeHiddenColumns: true`. Expensive over many columns; make both configurable.
- [ ] *(moot)* `PivotDataModel` inner-loop costs: `getField()` array spread + linear scan,
      `pivotedValueFields.find()`, `valueCubeFields` / `extraSummaryRowCubeFields` recomputed as
      getters per record per pivot level, per-record path string building, sibling
      `pivotValues.find()`.
- [ ] *(moot)* `pivotedData` retains a full second copy of the dataset solely for a debug menu item;
      with `rawData` and the Cube's own records that is roughly 3x dataset memory.

### Framework gaps worth fixing on their own

- [ ] `Store.setFields()` — see phase 3.
- [ ] `Store.getField` (`Store.ts:849`) is a linear `find` over `fields` while `_fieldMap` sits
      right there.
- [ ] `GridModel.enhanceColConfigsFromStore` (`GridModel.ts:1833`) rebuilds `fieldsByName` from all
      store fields at every recursion level for column groups — `O(groups × fields)` inside every
      `setColumns`.
- [ ] Consider exposing `useRawAsData` on `CubeConfig` (currently only `retainRaw`).

### Framework conventions and cleanup

- [ ] No XH copyright header on any of the files.
- [ ] `PivotGrid` exports factory only; library components export a `[Component, factory]` pair via
      `hoistCmp.withFactory`.
- [ ] `GridOptions` in `PivotGrid.ts` should come from `@xh/hoist/kit/ag-grid`, not
      `ag-grid-community`.
- [ ] `//` comments on public interface members; framework config props need `/** */` JSDoc so IDEs
      and the `hoist-ts` / MCP symbol tools surface them.
- [ ] Add persistence: `persistWith` / `PersistOptions`, per `ZoneGridModel`.
- [ ] `PivotField` is nearly vestigial: constructed only to feed the Cube, and nothing reads
      `columnTemplate` / `enableValue` back off the cube's fields. Make one
      `Map<string, PivotFieldSpec>` the authority.
- [ ] `headerName: () => label` (`PivotGridModel:402`) — a thunk returning a constant.
- [ ] `PivotSort = 'asc' | 'desc' | any[] | null` needs a real type.

## Session log

Append a line per working session: date, what landed, where to pick up.

Starting point: the reviewed prototype as committed, with phase 0 and phase 1 as the next work.

**2026-08-01 — Phase 0 complete.** Settled the [terminology](#terminology) (groupings / pivot
dimensions / value fields, with row totals, pivot totals, value totals replacing the prototype's
"summary" vocabulary) and recalibrated the profiles to real usage: pivots are low cardinality,
groupings carry the cardinality. Wrote the acceptance criteria and gate. Built the benchmark harness
in Toolbox Admin (`pivot-grid` branch, `client-app/src/admin/tests/pivot/`, Admin › Tests › Pivot
Bench) and captured the [baseline](#baseline--pivotdatamodel-as-imported) across all seven profiles.
Added `cmp/pivotgrid/index.ts` so the package is importable as `@xh/hoist/cmp/pivotgrid`.

Headline: the prototype **passes the build target and fails the tick target by 4-7×**, because a
tick is a full rebuild regardless of how little changed. Heap is worse than expected (773MB on
Heavy+Drill, before the known per-update Cube leak). Pathological pivots degrade to 27s builds but
do not crash, which should inform the phase 1 guard decision.

Pick up at **phase 1** — the factoring decision and the open questions under
[Not yet resolved](#not-yet-resolved). Note that phase 3's `Store.setFields()` item is independent
of all of it and is good parallel work.
