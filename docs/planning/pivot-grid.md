# PivotGrid

**Branches:** `pivot-grid` in hoist-react (based on `develop`), plus a matching `pivot-grid` branch
in Toolbox (also off `develop`) for the harness and example pages.

**Status:** planning. Nothing implemented yet beyond the imported prototype.

**Goal:** promote a client-app `PivotGrid` component into hoist-react as a first-class framework
component, with a pivot data layer that is efficient enough for ticking data.

This is a multi-session effort. Keep this document current: check off TODOs as they land, record
decisions in the sections below as they are made, and append to the session log.

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

- [ ] Define acceptance criteria up front: dataset shape (leaf count × pivot cardinality ×
      measures), target full-build time, target per-tick time, target heap ceiling.
- [ ] Build a pivot benchmark harness in Toolbox Admin — full build, repeated ticks, heap sampling.
      For a precedent on shape, the `StoreProxyBench*` harness on Toolbox's `proxy-store` branch is
      worth a look, but it is not on `develop` and should not be treated as a dependency.
- [ ] Capture baseline numbers against the current `PivotDataModel`.

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
      `extraSummaryRowFields` with its `colSpan` / `cellStyle` machinery. Settle this before working
      the bug checklist, since some findings live in code that may be cut.
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
