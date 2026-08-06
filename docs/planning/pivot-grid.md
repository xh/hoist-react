# PivotGrid

**Branches:** `pivot-grid` in hoist-react (based on `develop`), plus a matching `pivot-grid` branch
in Toolbox (also off `develop`) for the harness and example pages. `pivot-grid-store-simple` in both
repos is the same work rebased onto current `develop`, which now carries the Store rework — verified,
and the base to build phase 3 on. See
[Rebase onto the Store rework](#rebase-onto-the-store-rework-store-simple).

**Status:** phases 0 and 1 complete. Phase 2 is functionally complete, correct against its reference
suite, and clears every performance gate it still carries. What remains is one gate number to set, a
browser verification pass over newly-written coverage, and the `PivotDataModel` retirement that phase
3 gates — see the [phase 2 checklist](#phase-2--pivot-data-layer-implementation). Phase 3 has not been
started.

**Goal:** promote a client-app `PivotGrid` component into hoist-react as a first-class framework
component, with a pivot data layer that is efficient enough for ticking data.

Multi-session effort — keep this document current: check off TODOs as they land, record decisions in
the sections below, and append to the session log.

## Terminology

Settled. Use these terms in prose, in code, and in the public API. They replace the prototype's
"summary" vocabulary, which collided with `Store.summaryRecord` and `GridModel.showSummary` —
distinct framework concepts that the value-totals row happens to be _rendered_ with, but is not
otherwise related to.

| Term                           | Meaning                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **grouping** / group dimension | Row dimensions — today's tree-grid `groupBy`. 1-3 typical, 6 the practical ceiling.                                 |
| **pivot dimension**            | Extra dimensions sliced into columns, hierarchically. 1 typical, 3 the ceiling.                                     |
| **pivot path**                 | One ordered tuple of pivot dimension values, e.g. `US >> Equity`. Maps to one column or column group.               |
| **value field**                | The measure to aggregate. 1 typical, occasionally 2-3 related fields.                                               |
| **value column**               | The rendered column for one (pivot path, value field) pair.                                                         |
| **cell**                       | One (group row, pivot path, value field) intersection.                                                              |
| **row totals**                 | Per group row, per value field: the aggregate across _all_ pivot paths. The docked "Total" column(s).               |
| **pivot totals**               | Per group row, per value field: the aggregate within _one_ pivot grouping — i.e. a subtotal at a parent pivot node. |
| **value totals**               | Per pivot path, per value field: the aggregate down _all_ group rows. The docked totals row.                        |

**Row totals are pivot totals at the root pivot level** — the same operation at different depths of
the pivot tree, so one mechanism serves both.

**Pivot totals do not exist in the prototype** and are net-new work. They only appear with 2+ pivot
dimensions, so the typical single-pivot-dimension config never shows them.

Mapping from the prototype's names, all of which are to be renamed:

| Prototype                  | New                         |
| -------------------------- | --------------------------- |
| `showSummaryColumn`        | row totals — show/hide      |
| `summaryColumnSide`        | row totals — side           |
| `extraSummaryColumnFields` | row totals — extra fields   |
| `showSummaryRow`           | value totals — show/hide    |
| `summaryRowSide`           | value totals — side         |
| `extraSummaryRowFields`    | value totals — extra fields |
| `SUMMARY_COL_ID_PREFIX`    | row-totals column id prefix |

Type-level renames settled in phase 1: `PivotValue` → `PivotPath`, `cmp/pivotgrid`'s `PivotQuery` →
the `data/cube` `PivotQuery`, and `PivotField` / `PivotFieldSpec` retired (see
[Package location and exports](#package-location-and-exports)).

## Context

`cmp/pivotgrid/` currently holds a working prototype written in a client app and imported wholesale.
It was built to be self-contained (no references outside hoist-react), but it carries app-code
patterns, a handful of latent bugs, and a pivot data layer that cannot support ticking data.

The prototype has three parts:

- **`PivotDataModel`** — the pivoting engine. Widens each leaf record with a synthetic field per
  `(pivotPath, valueField)` pair, then builds a `Cube` over the widened rows so the existing
  aggregators produce the pivot cells. The cost model is wrong: `Cube` aggregation is dense over
  fields while the widened data is sparse over fields, so every aggregate row computes every
  synthetic field. **To be replaced.**
- **`PivotGridModel`** — builds the grid's column hierarchy from the pivot value tree, manages
  summary rows/columns and sorting. Fundamentally sound; needs cleanup and an API refresh.
- **`PivotGrid`** — thin component wrapper. Needs framework conventions.

## Goals

- Pivot data layer that supports **connected, incremental updates** — viable for ticking data.
- Cost proportional to the number of **populated** cells — precisely, `Σ_G populated(G)` over every
  node of the row hierarchy — not to `rowGroups × allPivotPaths`.
- Reuse the existing `data/cube` aggregation machinery rather than reimplementing aggregators.
- Framework-grade component: conventions, docs, validation, persistence, no internals pokes.

## Non-goals

- Server-side or virtualized pivoting.
- Mobile support (this is desktop-only in practice).
- Preserving every feature of the prototype. Some were client-specific asks — see phase 3.

## Pivot data design

**Settled in phase 1.** This section is the contract phases 2 and 3 build to.

### Correction: pivot cells are not extra innermost dimensions

Phase 0's working direction was to make the pivot dimensions the innermost Cube dimensions and
project the cells out of the resulting row tree. **That does not work.**

Grouping is hierarchical. With `dimensions: [fund, strategy, sector, region]`, a `region` node exists
only _beneath a sector node_. There is no node for "fund F1, all strategies, region US", so every
group row above the innermost level has nothing to project a cell from. Making the pivot dimensions
outermost fails symmetrically: it materializes the value totals and loses the row totals.

The row hierarchy and the pivot hierarchy are orthogonal, and their cross product has to be
materialized. The corrected strategy:

**Every node of the row hierarchy carries its own pivot subtree.** Those subtrees are real rows in
the aggregation network — so every aggregator works unmodified, and `View`'s existing incremental
machinery maintains the cells on a tick. They are _not_ part of the visible row tree and never reach
a connected store.

Because the pivot subtrees are separate from `dimensions`, nothing is concatenated anywhere:
`PivotQuery.dimensions` keeps `Query.dimensions`' exact existing meaning — the ordered levels of the
visible row hierarchy.

### The cell lattice

Write `C(G, P)` for the cell at row-hierarchy node `G` and pivot path `P`. `G` ranges over every node
of the row hierarchy, including the synthetic root when `includeRoot` is set, and any `BucketRow`.
`P` ranges over every pivot path _and every prefix of one_. By definition `C(G, rootPath)` **is** `G`
itself — which is what makes row totals and pivot totals one mechanism.

Children, and therefore the decomposition:

| node                                  | children                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `C(G, P)`, `G` not innermost          | `C(G′, P)` for each child node `G′` of `G` — **group** axis               |
| `C(G, P)`, `G` innermost, `P` partial | `C(G, P·v)` for each next pivot value `v` present in `G` — **pivot** axis |
| `C(G, P)`, `G` innermost, `P` full    | the leaf rows in `G` on that path                                         |

**Invariant phase 2 must preserve: each parent's children are a strict partition of its leaf set.**
That is what makes every aggregator correct by construction, down either axis. Two consequences worth
knowing: `CHILD_COUNT` on a cell counts _child groups carrying that path_, which is meaningful rather
than broken; and group rows keep their existing children untouched, so non-pivot semantics are
unchanged.

Confining the pivot-axis decomposition to the innermost level is deliberate: it minimizes both the
link count and the number of rows needing more than one parent. Two links per row suffice:

- `parent` — the **group-axis** parent (and, for group rows and leaves, the existing row-tree parent).
- `pivotParent` — the **pivot-axis** parent: the cell one pivot level shallower within the same `G`.
  Null unless `G` is innermost _and_ the path is at depth 2 or more, because `C(G, rootPath)` is `G`
  itself, which already receives those updates directly from its own children.

A leaf's two parents are its innermost group row and `C(G, fullPath)`; with a single pivot dimension,
leaves are the only rows with two. **The update routes must stay disjoint** — that is what rules out
double counting.

### Cost model

Aggregation and memory are proportional to `Σ_G populated(G)` — the number of `(group node, pivot
path)` pairs that actually contain data, summed over _all_ levels of the row hierarchy. Estimates
against the phase 0 profiles, alongside the dense figure the prototype pays:

| Profile       | Dense cells | Est. cell rows | Ratio |
| ------------- | ----------: | -------------: | ----: |
| Typical       |       17.7k |          ~16k  | ~1.1× |
| Typical+Drill |        298k |           ~51k |  ~6×  |
| Wide          |        3.0M |          ~100k |  ~30× |
| Pathological  |       11.1M |          ~104k | ~107× |

A synthetic run of the lattice module confirms Typical (15.0k cells against the ~16k estimate) but
puts **Wide at ~205k, roughly 2× the estimate**. That run used uniformly random dimension values,
which is the pessimistic bound — skew reduces the populated set — so the estimate may still hold for
realistic data. Re-measure against the harness's own generator before treating either figure as
settled; Wide is the profile where the cost argument is actually made.

For Typical the populated set is essentially the dense set, because ~17 leaves per innermost group
spread over 8 regions populate nearly every path. Typical's build win comes instead from not widening
35k leaves with synthetic fields and not building a fresh `Cube` per update; its **tick** win — the
metric that actually fails the gate — comes from the update being incremental: ~350 changed leaves
propagate through ~8 `replace` calls each, versus a full rebuild.

Two further multipliers apply everywhere: cell rows aggregate **only the value fields** (plus their
declared dependencies), not the full query field set; and unpopulated cells are simply absent from
row data, resolving to `null` through `Store`'s prototype-chained `_dataDefaults` rather than
occupying a slot per row.

### Factoring: `PivotView extends View`, `PivotQuery extends Query`

Settled. The subclass inherits record filtering, group-tree generation, row caching, bucketing,
visible-tree assembly, store loading, connect/disconnect, simple-update detection, and the
incremental propagation core. `Cube._connectedViews` is a `Set<View>`, so `noteCubeLoaded` /
`noteCubeUpdated` route to the subclass for free. What the subclass adds is cell generation, cell
projection, and the extended result shape.

Rejected: composition over `View`, which would still need a changed-rows signal and visible-tree
control out of `View` and would rebuild its own copy of every group row on each full build; and
folding pivot support into `View` itself, which makes `result.rows` and `loadStores` mean different
things by config in a class every Hoist app depends on.

### Changes required in `data/cube`

Additions:

- `PivotQuery extends Query`, `PivotView extends View`, `PivotPath`, `PivotCellRow extends BaseRow`.
- `Cube.createPivotView({query, stores, connect})`, mirroring `createView`.
- `CubeFieldSpec.dependsOn?: string[]` — other fields this field's aggregator reads. A no-op for
  plain Views; `PivotView` uses it to expand the cell-row field set. Replaces the prototype's
  `PivotFieldSpec.dependsOn`.

Changes to existing classes, all mechanical, with no behavior change for non-pivot Views:

- `View`: widen `private` members to `protected` — `generateRows`, `filterRecords`,
  `createAggregationContext`, `loadStores`, `updateResults`, `dataOnlyUpdate`, `getSimpleUpdates`,
  `hasDimOrBucketUpdates`, `cachedRow`, `bucketRows`, `groupAndInsertRecords`, `aggregatorsAreSimple`,
  plus `_leafMap`, `_recordMap`, `_rowDatas`, `_bucketDependentFields`.
- `View`: retain the generated root `BaseRow[]` (today only the projected `_rowDatas` survives
  `generateRows`) so the subclass can walk the network. Build the result via a `protected
createResult()` so the subclass can extend it.
- `BaseRow` / `LeafRow`: add the `pivotParent` link and propagate to it from `applyDataUpdate` /
  `applyLeafDataUpdate`.
- `BaseRow`: `initAggregate` / `computeAggregates` take an optional field list, defaulting to
  `view.fields`. This is what lets cell rows aggregate only the value fields.
- The incremental update collector becomes `Set<BaseRow>` rather than `Set<PlainObject>` (rename
  `updatedRowDatas` → `updatedRows`), with `View.dataOnlyUpdate` mapping rows to datas for stores.
  `PivotView` needs the rows themselves to tell cells from group rows. `HiddenLeafRow` continues to
  register nothing.
- `Query.clone` constructs via `new (this.constructor)(conf)` so subclasses inherit it.

`PivotView` overrides `hasDimOrBucketUpdates` to include the pivot dimensions — a leaf changing its
pivot dimension value is structural and must force a full rebuild.

### Query interface

```typescript
interface PivotQueryConfig extends QueryConfig {
    /** Pivot dimensions, outermost first. Empty to degenerate to a plain View. */
    pivotDimensions?: string[] | CubeField[];

    /** Measures to aggregate per cell. Must be aggregatable members of `fields`. */
    valueFields: string[] | CubeField[];

    /** Label for a null / blank pivot dimension value. Default '(empty)'. */
    emptyPathLabel?: string;

    /** Exclude records with a null / blank pivot dimension value entirely. Default false. */
    excludeEmptyPivotValues?: boolean;

    /** Throw if the discovered pivot path count exceeds this. Default 1000; null to disable. */
    maxPivotPaths?: number;
}
```

`dimensions` is unchanged and unconcatenated — the row hierarchy. `pivotDimensions` is deliberately
named for symmetry with it, and parses the same way: config takes names or `CubeField`s, the instance
exposes `pivotDimensions: CubeField[]` alongside `dimensions: CubeField[]` and `valueFields:
CubeField[]`. `equalsExcludingFilter` and `clone` are extended to cover the new members, so
`updateQuery` detects pivot changes and rebuilds (clearing the row cache) correctly.

Validation at construction: every `valueFields` entry must be present in `fields`, carry an
aggregator, and not be a dimension; `pivotDimensions` entries must be dimensions; `pivotDimensions`
and `dimensions` must not overlap.

### Result shape

```typescript
interface PivotViewResult extends ViewResult {
    /** Pivot path tree, roots first. Identity-stable while the structure is unchanged. */
    paths: PivotPath[];

    /** One entry per (path, value field), including the root-path row totals. Identity-stable with `paths`. */
    cellFields: PivotCellField[];
}

class PivotPath {
    dimension: CubeField; // the pivot dimension at this depth
    value: any; // raw dimension value
    label: string; // display string; `emptyPathLabel` when null / blank
    key: string; // escaped, delimiter-joined path key - '' for the root path
    depth: number;
    children: PivotPath[];
}

interface PivotCellField {
    name: string; // the synthetic field name written onto row data
    path: PivotPath;
    valueField: CubeField; // source measure - supplies type / defaultValue for Store fields
}
```

`rows` and `leafMap` keep their existing meaning: `rows` is the visible row hierarchy — group rows
only, with leaves if `includeLeaves` — carrying the cell values as fields on its data. Cell rows are
never published.

Path order is a deterministic ascending sort by value at each level, with the empty segment last, so
`paths` is stable across rebuilds and the default column order is sensible before any display-level
sorting. Consumers must treat the tree as immutable (see the phase 3 finding on `sortPivotValues`).

All three kinds of total fall out of the same mechanism:

| total        | where it is                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| row totals   | a group row's own aggregate of the value field — i.e. `C(G, rootPath)`, field name is the value field's own name   |
| pivot totals | `C(G, P)` for a partial `P`; materialized automatically with 2+ pivot dimensions                                  |
| value totals | the `includeRoot` root row's cells                                                                                |

### Cells on row data, and field naming

Cell values are **copied onto the published row data as flat synthetic fields**. `PivotGridModel`
declares a matching `Store` field per `cellFields` entry and value columns bind to them normally.

Rejected: leaving cells on the cell rows and reading them through `Column.getValueFn`. It is
appreciably leaner (no copies, no synthetic `Store` fields at all) but puts value columns outside the
`Store` field model and so outside grid column filters, Excel export, and inline editing. **Revisit
if heap becomes the binding constraint** — the copy is cheap, at ~16k properties per build and ~350
per tick on Typical.

Field naming:

- `cellFieldName(path, valueField)` = `` `${path.key}${DELIM}${valueField.name}` ``, or just
  `valueField.name` when `path.key` is empty. So the row-totals column binds to the plain value field
  — no synthetic name, and the totals-vs-cells invariant is structural.
- One exported constant, `PivotView.PATH_DELIMITER`, default `'>>'`. It is _not_ `Cube.RECORD_ID_DELIMITER`
  despite sharing a value; the namespaces are unrelated and coupling them would be an accident.
- Path segments escape `\` as `\\` and `>` as `\>` when building `key`. This guarantees the encoding is
  injective, which is all that is required — **nothing ever parses a cell field name**; `PivotPath`
  carries the raw values. This closes the prototype's break on values containing the delimiter.
- Throw if a generated cell field name collides with a Cube field name.

Cell row ids are `` `${groupRowId}#${path.key}` `` — internal only, used for `_rowCache` reuse, and
distinct from the group id namespace.

### Incremental contract

**A values-only tick can never change the pivot structure**, and this is guaranteed rather than
hoped for: `getSimpleUpdates` already fails to `fullUpdate` on any add or remove, and the overridden
`hasDimOrBucketUpdates` fails on any change to a grouping _or pivot_ dimension value. So
`dataOnlyUpdate` implies `paths` and `cellFields` are unchanged, and `PivotView` republishes the same
objects by identity. On a full update the path tree is recomputed and compared; if equal, the previous
`paths` / `cellFields` objects are retained.

That identity stability _is_ the structural signal. `PivotGridModel` tracks `result.cellFields` to
decide whether to re-declare `Store` fields and `result.paths` to decide whether to rebuild columns —
which is what makes the common path skip both.

The tick itself: propagation updates the affected cell rows and group rows through the existing
`replace` machinery; `PivotView` then rewrites just the changed cells onto their owning group rows'
data (each cell row holds a back-reference to its owning group row and its path), and pushes only
group rows to connected stores.

### Nulls, empties, and dense columns

A null or blank pivot dimension value forms **its own path segment**, labelled `emptyPathLabel`
(default `'(empty)'`). It is not dropped. This is the fix for the prototype's broken invariant, where
such records vanished from the pivot axis while still counting toward the group row's aggregates, so
the Total column did not equal the sum of the pivot columns.

Apps that genuinely want those records gone set `excludeEmptyPivotValues: true`, which applies an
implicit filter so the records leave the group aggregates too. Exclusion is a filter, not a
pivot-axis quirk — that is the only formulation under which the invariant survives.

The path tree is the **global union** across all group nodes, so columns are uniform; cells are
materialized only where populated and read `null` elsewhere.

### Interaction rules

- `omitRedundantNodes`, `omitFn`, `lockFn` — group axis only, unchanged. Cell rows never enter the
  visible tree, so `getVisibleDatas` never sees one and `PivotCellRow` deliberately does not extend
  `AggregateRow`, keeping the `omitFn` / `lockFn` signatures untouched. Cells computed for a row that
  is later omitted are harmless: its parent's cells already aggregate them.
- `bucketSpecFn` — group axis only. A `BucketRow` is a legitimate visible row and therefore a group
  node that carries its own pivot subtree. Bucketing _within_ the pivot axis is not supported in v1.
  **But a group node must decompose on exactly one axis**, and `bucketRows` can currently violate
  that: with `includeLeaves` set it buckets leaves (`View.ts:458`), leaving the innermost aggregate
  with a mix of `LeafRow` and `BucketRow` children. A mixed node gives a cell two update routes into
  the same parent and double counts — worked through in the lattice module's rejection message, and
  it is a genuine miscount, not a conservative refusal. `PivotQuery` must reject
  `bucketSpecFn` + `includeLeaves` + non-empty `pivotDimensions` at construction.
- `includeLeaves` / `provideLeaves` — supported and unchanged, which is a direct benefit of keeping
  pivots out of `dimensions`. Exposed leaves receive cell values for their own path only (their own
  value, `null` elsewhere); hidden leaves never do, as their data is a shared reference to Cube record
  data.
- Empty `pivotDimensions` — allowed, degenerating to plain View behavior with empty `paths` /
  `cellFields`, so apps can toggle pivoting without swapping view objects.
- No group dimensions — allowed; with `includeRoot` the result is a single value-totals row.

### Pivot cardinality guard

`maxPivotPaths`, default **1000**, checked during path discovery so it bails before building cells.
Exceeding it throws, naming the dimension and the count. `null` disables the check.

5,000 paths is never a legitimate result — it is a misconfiguration, and 5,000 columns is a grid
problem no data layer can fix. Failing fast with an actionable message beats a multi-second freeze
that reads as a hang.

A soft cap bucketing the tail into `(other)` was rejected for v1: to keep the totals invariant the
bucket has to genuinely _contain_ the tail, which makes it a real feature (top-N plus other) worth
designing deliberately rather than a guard. Recorded as possible future work.

### Package location and exports

New files sit alongside their base classes in `data/cube/`: `PivotQuery.ts`, `PivotView.ts`,
`PivotPath.ts`, `row/PivotCellRow.ts`. Exported from `data/index.ts` next to the existing
`cube/Query` / `cube/View` exports. `PivotCellRow` stays internal, like the other row classes.

The split with `cmp/` is on data vs. presentation: `columnTemplate`, `enablePivot`, and `enableValue`
are presentation concerns and stay in the grid layer, which retires the prototype's near-vestigial
`PivotField` / `PivotFieldSpec` (see the phase 3 cleanup item). `PivotValue` is replaced by
`PivotPath`; the prototype's `cmp/pivotgrid` `PivotQuery` is replaced by the `data/cube` one.

### Factoring: a pure lattice module under `PivotView`

The pivot combinatorics live in `data/cube/impl/PivotLattice.ts`, a module with **no runtime
framework dependency** — plain data and integer indices only. `PivotView` is the adapter that
instantiates rows from its output and wires them into `View`'s lifecycle.

The split is on stable-vs-churning, not just testability: the lattice math is finished once correct,
while the `View` integration will churn through the perf work. Two rules keep the boundary real
rather than nominal:

- **Integer arrays in, integer arrays out.** Nothing crosses that isn't a number, a string, or a
  typed array. If a `BaseRow` ever needs to cross it, the split has failed and folding the module
  back into `PivotView` is the right call.
- **No plan object per cell.** At 100k+ cells that allocation is exactly what the `canAggregate`
  sharing item below is trying to claw back. Children are CSR-encoded (`childStart` / `childIdx`),
  not arrays per cell.

Module owns path discovery, key naming, the `(groupIdx, pathIdx)` lattice, and the update routing.
`PivotView` owns `PivotCellRow` instantiation, `_rowCache` reuse, aggregation, projection onto row
data, and store loading.

Reuse outside `PivotView` is explicitly **not** a motivation — there is no second consumer, and
designing an interface for a speculative one would widen it for nothing.

### Verification vehicle

Two tiers, because hoist-react has no unit test framework and cannot get one cheaply — `data/cube`
does not load outside a bundler. Two independent reasons, both verified: the `@xh/hoist/core` barrel
reaches `XH` → `AppContainerModel` → the whole service layer, and Hoist's `@persist` reads
`descriptor.initializer`, a **babel** legacy-decorator shape that esbuild/tsc do not emit. Anything
importing `View` is therefore browser-only, and no amount of module stubbing fixes the decorator
mismatch.

- **Unit tier** — `npx tsx data/cube/impl/PivotLattice.spec.ts`, a self-contained exit-coded driver
  in the style of `mcp/data/*.spec.ts`. Asserts the lattice against `PivotReference`, a brute-force
  oracle computing each cell's leaf set from first principles. Covers the populated set, the
  partition invariant down both axes, exactly-once propagation, path ordering, key injectivity, and
  both guards. Aggregation is covered here too: the `Aggregator` classes import standalone under
  `tsx` (no decorators, type-only framework imports) and run against duck-typed rows.
- **Toolbox tier** — only what genuinely needs the framework: `PivotView`'s override wiring,
  connected-store behavior, `paths` / `cellFields` identity stability as `PivotGridModel` observes
  it, query transitions through `updateQuery` / `setFilter`, and the perf gates.

**Assert that a tick took the incremental path, not just that its values are right.** A full rebuild
produces correct values and republishes identical `paths` / `cellFields` by identity, so every
value-level and identity assertion stays green if `dataOnlyUpdate` silently stops being reached. That
makes the entire aggregator-`replace` surface fake-passable. The check is
`result !== resultBefore && result.rows === rowsBefore`: any update mints a new `result`, but
`result.rows` survives only the incremental path.

**A check that compares a row against itself proves nothing.** The original exposed-leaf check read
the projected cell field and the source field off the *same* row, so a stale leaf `data` agreed with a
stale cell and passed. Compare against the raw source record instead. Same class as the
`PivotCellRow` id/pointer duplication from the phase 2 review.

**Zero comparisons is a failure, not a pass.** Every check reports what it compared; several passed
vacuously with `checked: 0` on scenarios that could not populate them.

The reference oracle's key encoding must be injective on *emptiness* as well as on boundaries — a
dimension value equal to the empty label must not be able to impersonate an empty. Encode empties
with a length no real segment can produce rather than with a sentinel string. A NUL-byte sentinel
does achieve this, but it makes the file binary to git and every diff of it unreviewable; do not.

**Mutation-test any addition to either tier.** A green suite proves nothing on its own. The lattice
suite was validated by breaking the implementation six ways; the one mutant it missed was
semantically equivalent, and chasing it surfaced a load-bearing invariant that had no assertion. Each
Toolbox assertion added since is validated by reverting the fix it was written for and confirming it
goes red.

That equivalence class recurs and is not a coverage gap: **the strict aggregators' null short-circuits
in `replace` are unkillable**, because falling through re-aggregates to the same answer. What makes
them safe is now asserted directly — a strict aggregate is null exactly when a leaf beneath it is
null — which is the right response to an unkillable mutant.

**Cover query transitions, not just steady states.** A filter-only change with simple aggregators is
the one path where `View.updateQuery` retains `_rowCache` (`View.ts:234`), so cached rows survive
into a rebuild that mints new owner rows and a new path tree. Every bug the phase 2 review found
lived there, and none of it was reachable from a suite that only builds a view and ticks it.

## Phase 0 — Baseline and harness

Complete. Its durable outputs are the acceptance criteria and the baseline below.

### Acceptance criteria

**The shape of real usage.** Pivot grids are summary grids: they slice data into a compact table
that reads without horizontal scrolling. Pivot dimensions are therefore _low_ cardinality by nature —
`region` with 4-8 values is the canonical case — and pivoting is chosen precisely because a low
cardinality dimension makes an inefficient tree grouping. The cardinality lives in the **groupings**,
not the pivots. So the profiles below hold pivot paths and value fields near their realistic values
and vary the group-row count, which is what actually scales.

**Profiles.** Leaf counts are fixed per profile; the harness exposes them so they can be dialled.
Every profile has a `+ Drill` variant whose final grouping is unique-per-leaf, adding leaf-level
drill-down and pushing total row count to leaves + group rows.

Row counts below are as measured, not estimated.

| Profile        | Leaves | Groupings | Group rows | Pivot dims → paths | Value fields | Dense cells |
| -------------- | -----: | --------: | ---------: | ------------------ | -----------: | ----------: |
| **Typical**    |    35k |         3 |      2,210 | 1 → 8              |            1 |       17.7k |
| Typical+Drill  |    35k |         4 |     37,210 | 1 → 8              |            1 |        298k |
| **Heavy**      |   100k |         3 |      4,212 | 2 → 24 (4×6)       |            3 |        303k |
| Heavy+Drill    |   100k |         4 |    104,212 | 2 → 24             |            3 |        7.5M |
| **Wide**       |    35k |         6 |     31,636 | 3 → 48 (4×4×3)     |            2 |        3.0M |
| Wide+Drill     |    35k |         7 |     66,636 | 3 → 48             |            2 |        6.4M |

"Dense cells" is `group rows × pivot paths × value fields` — the work the prototype does, since its
`Cube` aggregation is dense over the synthetic fields. The rewrite's target is the _populated_ subset,
quantified under [Cost model](#cost-model).

**Gate — Typical.** These are the numbers the rewrite must hit; the other profiles are measured and
tracked every run but are not pass/fail.

| Metric                                            | Target  | Revised |
| ------------------------------------------------- | ------- | ------- |
| Full build (cold, from raw data)                  | ≤ 250ms | ≤ 140ms |
| Delta tick — 1% of leaves (350 recs), values-only | ≤ 30ms  | ≤ 15ms  |
| Pivot layer heap, over the loaded `Cube`          | ≤ 2×    | dropped |

The tick gate is on the **delta** tick — an explicit `{update: changed}` transaction. The full-array
tick is still reported for baseline comparison but is not gated; see the
[Result](#result--pivotview-measured-against-the-baseline) section for why. `PivotViewBenchModel`'s
`GATES` map is the single place both thresholds live.

**The heap gate is dropped deliberately**, not unverified: `≤ 2×` over the loaded `Cube` was never
measurable from `PivotViewBenchModel`, and porting `PivotBenchModel`'s `sampleHeapAsync` tooling was
judged not worth it against a rewrite that already beats the prototype's heap on every profile by
construction — it holds no per-update `Cube`. Revisit only if heap becomes the binding constraint, at
which point [Cells on row data](#cells-on-row-data-and-field-naming) is the design lever.

**Secondary gate — Typical+Drill**, since leaf drill-down is a normal ask rather than a stress case:
full build ≤ 750ms → **≤ 290ms**, delta tick ≤ 50ms → **≤ 15ms**.

If the phase 0 baseline shows the prototype already meets a target, tighten that target rather than
declaring it satisfied — the point is to prove the new cost model, not to clear a low bar. The
baseline passed both build targets, so the **Revised** column applies that rule: the rewrite must not
regress against the measured prototype builds (138ms / 279ms), rounded to 140ms and 290ms. Note both
figures include a ~100ms floor for parsing 35k leaves into the `Cube`, which is common to either
implementation and not pivot work — so the honest build headroom is smaller than it looks, and the
build case is made on the larger profiles rather than on Typical.

**Pathological guard.** A separate opt-in run pivots on a near-unique dimension (~5,000 distinct
values, so ~5,000 pivot paths). Phase 0 only _measures_ where each implementation falls over; what
the framework does about it is settled under
[Pivot cardinality guard](#pivot-cardinality-guard).

### How to measure

Both harnesses live on Toolbox's `pivot-grid` branch under `client-app/src/admin/tests/pivot/`,
modelled on the `StoreProxyBench*` harness from Toolbox's `store-proxy-mode` branch.

**Start with `yarn startWithHoist` from `client-app`, not `yarn start`.** Plain `yarn start` resolves
`@xh/hoist` to the published copy in `node_modules` and will happily benchmark code that is not on
this branch. Confirm before trusting a number: Admin › General reports Hoist React as a bare
`-SNAPSHOT` when inline, and `-SNAPSHOT.<timestamp>` when it is the published package.

| Harness                | Panel                             | Measures                       | Heap |
| ---------------------- | --------------------------------- | ------------------------------ | ---- |
| `PivotBenchModel`      | Admin › Tests › **Pivot Bench**   | the prototype `PivotDataModel` | yes  |
| `PivotViewBenchModel`  | Admin › Tests › **Pivot View** ▾  | `PivotView`                    | no   |

`PivotViewBenchModel` hardcodes the phase 0 baseline as its `BASELINE` map and reports against it, so
a `PivotView` re-measure needs only that panel. Re-running Pivot Bench is only for re-establishing
the prototype baseline itself — on the same hardware, in the same session, or the comparison is
meaningless.

On Pivot Bench, set `Keep grid` **off** so the live grid is not mounted. Leaving it on adds ag-Grid
render work to every measurement — roughly doubling Typical's tick, from 128ms to 225ms. The
`PivotView` panel never mounts a grid, so it has no such toggle.

Heap needs headless Chromium with `--expose-gc` and `--enable-precise-memory-info`; without them
Pivot Bench reports `heapAvailable: false`. Timing runs do not need headless, but a headless number
and a windowed number are not comparable — the phase 0 baseline is headless.

**The tab must stay foreground and unoccluded for the whole run, and every number from a run where
it did not is garbage.** Both harnesses `await wait(50)` between reps; Chrome throttles that chained
timer to 1/sec in a hidden tab and 1/min after five minutes hidden, and `whileAsync` additionally
swaps to its synchronous fallback once `XH.pageIsVisible` goes false. A hidden run does not fail
loudly — it inflates every figure and eventually looks like an indefinite hang with the main thread
measurably idle. Assert `document.visibilityState === 'visible'` before trusting a run, and register
a `visibilitychange` tripwire to void one that went hidden partway.

### Baseline — `PivotDataModel` as imported

Captured 2026-08-01 on a Linux workstation, per the procedure above. Treat these as a _relative_
baseline for the rewrite to beat, not as an absolute spec — they will move on different hardware.

- **Data ms** — `PivotDataModel.update()` alone.
- **Grid ms** — end-to-end `PivotGridModel.loadData()`. Excludes the async `autosizeAsync()` the
  prototype also fires.
- **Tick ms** — median of 5 values-only ticks touching 1% of leaves. No dimension is perturbed, so
  no new pivot path appears and the column structure is unchanged.
- **Synth fields** — synthetic `(pivotPath, valueField)` fields the prototype widens each leaf with.
- **Heap** — retained by the pivot layer over the generated leaves, after a forced GC.

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
6.7×). The build target is _not_ where the prototype is broken.

What the numbers establish:

1. **A tick costs a full rebuild.** Tick time tracks end-to-end grid build within 0-25% on every
   profile. There is no cheap path, and no dependence on how much data actually changed: perturbing
   1% of leaves costs the same as building from nothing. This single fact is the case for the phase 2
   rewrite.
2. **Synthetic fields are created at every pivot level, not just the leaf level.** Heavy's 84 =
   (4 paths × 3 values) + (24 paths × 3 values); Wide's 136 = 8 + 32 + 96. The Cube then aggregates
   all of them densely across every row. Wide is 31,636 rows × 136 fields ≈ 4.3M field-aggregations
   for 3.0M dense cells.
3. **Cost is not a clean function of dense cells.** Small profiles are floored by leaf parsing
   (~35k leaves into a Cube costs >100ms before any pivoting), and Pathological manages only ~400
   cells/ms against Wide's ~2,200 — so per-_field_ overhead dominates once the field count is large,
   independently of cell count. Both floors matter for the phase 2 design: the rewrite has to beat
   the fixed parse cost as well as the aggregation cost.
4. **Heap is the most alarming column.** 773MB retained for Heavy+Drill and 528MB for Wide+Drill —
   and that is the _clean_ figure, measured with teardown and a forced GC between runs. It does not
   include the prototype's per-update Cube leak, which an app would accumulate on every tick.
5. **Pathological degrades rather than crashes** — 5,000 pivot paths gives a 27s build and 469MB,
   but it completes. There is no hard cliff. Phase 1 nonetheless chose to throw rather than warn or
   soft-cap; see [Pivot cardinality guard](#pivot-cardinality-guard) for why.

## Phase 1 — Pivot data API contract

Complete. The contract is [Pivot data design](#pivot-data-design).

## Phase 2 — Pivot data layer implementation

Work to the [pivot data design](#pivot-data-design); it names the classes and members.

- [x] Brute-force reference pivot (`data/cube/impl/PivotReference.ts`), for test assertions only.
- [x] Path discovery: sorted global path tree, `maxPivotPaths`, injective key escaping, and a path
      index stamped per record so cell generation partitions by index rather than by rebuilt strings.
- [x] Lattice planning: the populated `(group, path)` set, CSR children, and the `parent` /
      `pivotParent` routes — group-axis decomposition above the innermost level, pivot-axis below it.
- [x] Unit suite over both, mutation-tested. See [Verification vehicle](#verification-vehicle).
- [x] `View` / `BaseRow` / `Query` changes per
      [Changes required in `data/cube`](#changes-required-in-datacube).
- [x] `PivotQuery`, `PivotView`, `PivotPath`, `PivotCellRow`, and the result types, including the
      `bucketSpecFn` + `includeLeaves` + pivots rejection per [Interaction rules](#interaction-rules).
- [x] Cell projection onto group-row data, full-build and incremental. Exposed leaves also receive
      their own path's value, so a drilled-down row is not blank across the pivot columns.
- [x] Share `canAggregate` maps across cell rows of identical shape — one per pivot path.
- [x] Toolbox tier: reference comparison, tick equivalence, full-rebuild comparison, filter
      transitions, and query identity. 99 checks, now **211** with the aggregator, plain-`View`, and
      pivot-dimension-change scenarios below.
- [x] Benchmark against phase 0 baseline — see [Result](#result--pivotview-measured-against-the-baseline).
- [x] Review of the phase 2 changeset, with fixes — see the 2026-08-05 session log entry.
- [x] Re-measured post-`da632efb9`, and the drill-down build regression turned out not to exist — see
      [Result](#result--pivotview-measured-against-the-baseline). Cancels the cell-row elision work
      this item was gating.
- [x] Repointed `PivotViewBenchModel`'s pass/fail column at `deltaTickMs` and collapsed both
      thresholds into one `GATES` map. The full-array tick stays a reported column.
- [x] Delta-tick gate set to **15ms for both** Typical and Typical+Drill, builds unchanged at
      140/290. Measured 7.6 / 8.3 with sub-5% run-to-run agreement, so 15 is ~2× headroom while
      sitting well below the 27ms the large profiles pay — any drift of the small profiles toward
      large-profile cost trips it. One number for both because the delta metric barely moves across a
      17× row-count difference (8.3 vs 7.6), which is why the inherited 30/50 split was retired.
- [x] Aggregator coverage beyond `SUM` — `AverageStrict`, `SumStrict`, `Unique`, `ChildCount`, plus
      lenient controls. Unit tier green and mutation-tested (28 → 49 checks, 19/23 aggregator mutants
      and 4/4 lattice mutants killed; the 4 survivors are documented equivalences). Toolbox tier green
      in the 211-check run.
- [x] Heap gate dropped deliberately — see [acceptance criteria](#acceptance-criteria).
- [x] The drill-profile tick stall was background-tab timer throttling, not GC thrash and not a pivot
      defect. `Run All` now completes all six profiles in ~20s foreground. See
      [How to measure](#how-to-measure).
- [x] Non-pivot `View` behavior provably unchanged — five plain-`View` scenarios plus a plain-`Query`
      scenario in the Toolbox suite, against the same reference accumulator. Covers connected stores,
      `includeLeaves` / `provideLeaves`, `includeRoot`, bucketing with `dependentFields`, dimension-value
      changes, and `Query.clone` with every member set away from its default. Green.
- [x] `View.parseStores` now treats `null` as "no stores". `castArray(null)` yields `[null]`, and the
      `stores = []` default at construction only covers `undefined`, so `createView({stores: null})`
      threw on `s.reuseRecords`. `null` is Hoist's no-value sentinel, so this was a latent framework
      bug rather than a caller error — the new plain-`View` scenarios are what surfaced it.
- [x] Toolbox suite run and green: **211/211**, worst drift 8.6e-14, no vacuous checks (a zero
      comparison count is a hard failure). Verified in a foreground unoccluded tab with a
      `visibilitychange` tripwire armed.
- [x] Pivot-dimension change coverage, mutation-tested. Gutting `PivotView.hasDimOrBucketUpdates`'s
      pivot branch kills 21 of 211 checks. **The failure mode it catches is the dangerous one:** row
      totals stay correct *and* still equal the sum of their pivot cells, because the leaf values never
      moved — only which path owns them. Only the per-path breakdown is wrong, so a grid looks right
      and is wrong. Perturb non-empty pivot values on already-non-empty records only; the reference's
      `excludeEmptyPivotValues` filter is a snapshot, and moving a record across that boundary stales
      it rather than testing anything.
- [ ] Retire `PivotDataModel` — blocked on phase 3 rewiring `PivotGridModel` onto the new API.

### Result — `PivotView` measured against the baseline

Captured 2026-08-05, same workstation and harness data as the phase 0 baseline, via Admin › Tests ›
Pivot View › Benchmark. `Build` is Cube load plus view creation, matching what
`PivotDataModel.update()` did.

| Profile       | Group rows | Cells | Build (base) | Delta tick | Full tick (base) |
| ------------- | ---------: | ----: | -----------: | ---------: | ---------------: |
| Typical       |      2,211 | 15.9k |    115 (138) |    **7.6** |       67.8 (128) |
| Typical+Drill |     37,211 | 50.9k |    269 (279) |    **8.3** |       64.1 (335) |
| Heavy         |      4,213 | 85.8k |    429 (743) |       27.0 |      196.6 (836) |
| Heavy+Drill   |    104,213 |  286k | 1,139 (2485) |       27.1 |     211.1 (3601) |
| Wide          |     31,637 |  269k |    608 (1370) |      13.7 |      81.2 (1734) |
| Wide+Drill    |     66,637 |  374k |    897 (2150) |      11.7 |      78.4 (3146) |

**Both build gates pass and the delta-tick gate passes with 3-4× of headroom. The rewrite beats the
prototype on every profile and every metric.** Second consecutive run agreed within 5% on all
profiles except Wide+Drill (897 → 1,065, ~19%), so treat Wide+Drill's build as the one noisy figure.

**Restate the tick gate as a delta update.** The baseline's "tick" resubmitted all 35k leaves, so
much of it is `Store`-wide record diffing that no pivot implementation can influence. An explicit
`{update: changed}` transaction isolates the pivot work: 7.6ms against the 30ms gate, 8.3ms against
Typical+Drill's 50ms. The full-array metric also beats the baseline everywhere (1.9× on Typical,
17-40× on the large profiles), but it is measuring the wrong thing, so it is now reported rather than
gated.

**Re-verified 2026-08-05 across three consecutive runs**, and both gated profiles pass. Builds:
Typical 138 / 118 / 123, Typical+Drill 295 / 278 / 273, Heavy 454 / 435 / 417, Heavy+Drill 1190 /
1231 / 1155, Wide 616 / 666 / 617, Wide+Drill 974 / 996 / 975. Delta ticks: 7.7-8.3, 8.6-9.6,
25.2-27.2, 26.8-30.5, 11.1-12.0, 12.2-13.3.

Two things to know from that spread. **The first run of a session is the slowest** — Typical's build
ran 138 cold against 118-123 warm, so a single cold number is not a regression signal. And
**Typical+Drill's build gate has almost no headroom**: 273-295 against 290, so the cold run exceeds
it. Either widen that gate or always discard the first run; do not read one red cold build as a
regression.

**The red gate was never about the metric.** The earlier note blamed the harness gating on the
full-array tick, but `passed` was not a declared `Store` field — `GridModel` infers store fields from
columns and no column binds `passed`, so `record.data.passed` was always `undefined` and the Gate
renderer took its failure branch unconditionally. The repoint at `deltaTickMs` was still right and
still needed; it just was not what made the column red. The renderer also emitted `Icon(asHtml)`
markup that rendered as escaped text, so the cell was illegible either way — now plain glyphs, as
`PivotBenchModel` already did it.

**The 2026-08-04 table was a measurement artifact; there is no drill-down build regression.** It
recorded 529ms for Typical+Drill and a ~1.9× regression, and none of that reproduces. Checking
`data/cube` out at `7116572c6~1` — the exact code that table was measured against — and re-running
gives 97 / 266 / 413 / 1,140 / 615 / 907, statistically indistinguishable from HEAD. So the five
commits since are perf-neutral (including `da632efb9`, which prompted this re-measure), and the
earlier figures came from the environment, not the code. Near-certainly a hidden tab: the
reproduction attempt for this re-measure hit exactly that and inflated Typical+Drill from 269 to
465-493ms before degrading into an apparent hang. See [How to measure](#how-to-measure).

The lesson generalizes past this table: a wrong benchmark cost a plausible, fully-reasoned
optimization plan — cell-row elision for single-leaf-path innermost groups, with an allocation
argument behind it — that would have bought nothing. Re-measure before optimizing, and A/B against
the old code rather than against a recorded number whenever a figure moves more than the change
plausibly explains.

## Rebase onto the Store rework (`store-simple`)

The Store rework reworked Cube View row and record reuse — the exact machinery phase 2 builds on — and
**merged into `develop` as `d61321545` (#4534), squashed**, so its own commits are not in develop's
history. Our 25 commits are rebased onto `develop` and verified there: 211/211 Toolbox checks, 49/49
unit checks, `tsc` clean. Replay was conflict-free, because our patches touch different regions of
`View.ts` than the rework does.

**Review changed the integration surface between `store-simple` and the merge** — re-read
`RowCache.ts` before trusting any note written against the pre-merge branch. `noteGeneration()` became
`beginGeneration()`, a new `endGeneration()` was added, and the cache sweep moved into it.

What the integration required, all of it load-bearing:

- **`cachedRow` is gone**, replaced by `RowCache.getOrCreate(id, children, fn, record?)`. Its reuse
  invariant validates a leaf against `cubeRecord` identity and everything else against an identical
  children array — still identity of *names*, not of the objects named, so
  [the cell-row rebinding](#session-log) fix remains necessary and is retained.
- **`BaseRow.aggFields`** now holds the row's own field set. `RowCache` recomputes reused rows in
  place by calling `computeAggregates()` with no arguments, which would otherwise aggregate every
  view field on a cell row rather than just its measures.
- **`View` closes the row-cache generation in `fullUpdate`, not at the end of `generateRows`.** The
  sweep trigger compares cache `size` against a `live` count accumulated during the generation, and
  `PivotView` generates its cells in its `generateRows` override — after the base method used to close
  the generation. Cells therefore counted toward `size` while absent from `live`. On Typical+Drill that
  is 72,211 live against a 123,128-row cache, i.e. 1.7× past the 1.5× trigger, so a steady-state pivot
  view swept on **every** build. Relocated, `size == live == 123,128` and it does not sweep.
- **`PivotView.loadUpdatedRows` restamps digests** on every owner group row it projected onto.
  Connected stores now skip record rebuilds by comparing `cubeRowDigest`, the base class stamps
  digests *before* `loadUpdatedRows` runs, and an owner whose own aggregates happened to hold is
  never in `updatedRows` at all — so without the restamp a changed cell renders stale.
- `View.parseStores` composes cleanly with their rewrite; `reuseRecords` is now View-managed via
  `setDigestFn`, and our null-tolerance fix survives.
- Toolbox: `ViewRowData` is a plain fixed-shape interface, so the `cubeLeaves` getter became the
  exported `getCubeLeaves(row)`.

### Open decision: fixed-shape rows vs sparse cells

**This is the one real design conflict and it wants a deliberate answer.** `store-simple` keeps every
row's data in V8 fast-properties mode by cloning a per-View template that carries a slot for every
field — rows are only ever written by *overwriting* slots, never by adding properties. Cell projection
writes synthetic cell fields onto group-row data, which are property **adds**, so pivoted group rows
drop into dictionary mode.

**No build cost has been attributed to this — do not treat one as measured.** An earlier note here
claimed ~5-8%, then blamed the row-cache sweep on the strength of an A/B that appeared to separate
cleanly. Instrumenting the guard disproved it: `willSweep=false` on every generation, so the sweep body
never ran and could not have cost anything. The apparent separation came from a page reload sitting
between the two groups.

What that leaves is a benchmark too noisy to resolve a difference this size. Typical+Drill measured
275, 281, 307, 310, 318 and 341 across six runs on one machine against a 290ms gate — the gate result
is **inconclusive**, not failing. Resolve it on a quiet machine (close the browser's other windows,
nothing else building) before ascribing a cost to row shape or anything else. Delta ticks are
unaffected and unambiguous throughout: 7.8-9.6 against a 15ms gate.

The obvious fix is to put cell field names in the row template, and it contradicts
[Cells on row data](#cells-on-row-data-and-field-naming) head on: that section deliberately leaves
unpopulated cells *absent* from row data, resolving to null through `Store`'s prototype-chained
`_dataDefaults` rather than occupying a slot per row. Templating them makes every group row carry
every cell slot — on Wide that is 31,637 × 138 ≈ 4.4M slots, which is the dense memory the whole cost
model exists to avoid. Cell names are also only discovered during `generateCells`, after the
constructor builds templates, so the first build cannot template them anyway.

Three ways out, in rough order of appeal: accept dictionary mode for pivoted group rows and drop the
fixed-shape guarantee there deliberately; template only the cell fields and pay the dense memory,
which is defensible if `maxPivotPaths` keeps path counts genuinely low; or revisit
`Column.getValueFn` and keep cells on cell rows, already recorded as rejected but explicitly
revisitable "if heap becomes the binding constraint". Pick between them on a trustworthy build
measurement, not on the design argument alone — the sparse-cell model is the incumbent and templating
cell fields is the change that has to earn its cost.

## Phase 3 — PivotGridModel

Parallel with phase 2, except the final Toolbox items which need working pivot data.

- [ ] **Decide the feature set.** The main client-specific surface still in place is
      `extraSummaryRowFields` (extra value-total fields) with its `colSpan` / `cellStyle` machinery.
      Settle this before working the bug checklist, since some findings live in code that may be cut.
- [ ] **Adopt the settled [terminology](#terminology) across the public API** — rename the
      `showSummaryColumn` / `showSummaryRow` / `extraSummary*Fields` / `summary*Side` config family
      per the mapping table. Do this alongside the feature decision, before the bug checklist, so
      findings are worked against final names. Also decide whether `PivotGridConfig` keeps the
      grid-idiomatic `groupBy` / `pivotBy` pair or follows the data layer's `dimensions` /
      `pivotDimensions`. `GridModel.groupBy` argues for the former; either is defensible, but the
      grid config should be internally consistent.
- [ ] **Pivot totals** (subtotal columns at parent pivot nodes) — net-new, absent from the prototype.
      Decide whether v1 ships them. Cheap, since the design materializes `C(G, P)` for every partial
      path: with 2+ pivot dimensions the cell fields already exist, and the remaining work is column
      building and config surface.
- [ ] Add `Store.setFields()` to the framework, replacing the prototype's private-field pokes. Must
      enforce the no-`id`-field rule that direct assignment currently bypasses.
- [ ] Rewire `PivotGridModel` onto the new pivot data API. What phase 1 hands it:
      - Row-totals columns bind to the value field's own name — no synthetic field, no
        `SUMMARY_COL_ID_PREFIX` games for the value fields themselves.
      - `extraSummaryColumnFields` (extra row-total columns) reduces to including those fields in
        `PivotQuery.fields`; their group-row aggregate _is_ the row total.
      - The value-totals row is `includeRoot: true` plus `Store.loadRootAsSummary` and
        `GridModel.showSummary` — no separate summary data path, and no `'Total>>' + field`
        `cubeDimension` hack.
      - Column and `Store` field rebuilds key off `result.paths` / `result.cellFields` identity, which
        is what fixes findings `PivotGridModel:276` and `:292`.
      - `PivotPath` exposes raw `value` plus a plain `label`, so the grid layer renders labels itself
        and the prototype's try/catch-a-cell-renderer hack goes away.
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

From the full review of the imported prototype. Scoped to code that survives the phase 2 rewrite —
`PivotDataModel`'s own defects are resolved by replacing it.

### Correctness bugs

- [ ] `PivotGridModel:466,469` — `field.columnTemplate.renderer` is unguarded; any value field
      without a `columnTemplate` throws in the renderer.
- [ ] `PivotGridModel:512` — `sortPivotValues` copies the top-level array but then assigns
      `it.children` in place, so building columns mutates the data model's observable state.
- [ ] Five `// TODO: Validate` sites in the `PivotGridModel` constructor. Bad field names currently
      surface as `undefined.name` TypeErrors deep in column building.

### Performance — prototype hot spots

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

### Framework gaps worth fixing on their own

- [ ] **`SumAggregator.replace` returns `0` where `aggregate` returns `null`.** Once the last non-null
      constituent goes null, `if (oldValue != null) currAgg -= oldValue` runs and the `newValue == null`
      case has no branch, so the accumulator lands on `0` while a rebuild reports `null`. `SUM_STRICT`
      and `AVG` both handle it; only the lenient default diverges. Predates the pivot work — a plain
      tree `View` shows the same tick-vs-rebuild disagreement, and pivot cells inherit it. The unit
      suite characterizes the divergence and excludes exactly that transition via a
      `lenientSumZeroesOut` predicate; delete both when this is fixed.
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

One entry per working session: date, what landed, where to pick up.

**2026-08-01 — Phase 0 complete.** Settled the [terminology](#terminology), recalibrated the profiles
to real usage, wrote the [acceptance criteria](#acceptance-criteria), built the Toolbox benchmark
harness, and captured the [baseline](#baseline--pivotdatamodel-as-imported) across all seven
profiles. Added `cmp/pivotgrid/index.ts` so the package is importable as `@xh/hoist/cmp/pivotgrid`.
Headline: the prototype passes the build target and **fails the tick target by 4-7×**, because a tick
is a full rebuild regardless of how little changed. Heap is worse than expected (773MB on
Heavy+Drill). Pick up at phase 1.

**2026-08-01 — Phase 1 complete.** Settled the whole pivot data contract; see
[Pivot data design](#pivot-data-design). Headline is a correction to phase 0's working direction:
[pivot cells cannot be extra innermost Cube dimensions](#correction-pivot-cells-are-not-extra-innermost-dimensions),
so the corrected model hangs a pivot subtree off every node of the row hierarchy. Phase 2's
row-truncation item went away with it — cell rows are never in `children`. Build targets tightened
per phase 0's own rule (Typical 250 → 140ms, Typical+Drill 750 → 290ms). Pick up at phase 2 and/or
phase 3, which are parallelizable.

**2026-08-04 — Phase 2 data layer working end to end.** `PivotView`, `PivotQuery`, `PivotPath`,
`PivotCellRow` and the `data/cube` changes all landed and are verified against a reference in the
Toolbox harness (74 checks, ~567k values). Benchmarked: see
[Result](#result--pivotview-measured-against-the-baseline). Two headlines — the tick target is met but
only once the metric excludes `Store`-wide record diffing, which the phase 0 wording did not; and
drill-down builds regress ~1.9×, traced to per-cell-row allocation rather than to aggregation.
Phase 3 not started. Pick up at the two bolded phase 2 items, then phase 3.

**2026-08-04 — Phase 2 lattice engine.** Landed `data/cube/impl/` — the pure lattice module, the
brute-force oracle, and a mutation-tested unit suite. Two corrections to the plan: the correctness
suite is now a [two-tier arrangement](#verification-vehicle) rather than Toolbox-only, since the
pivot combinatorics factor out cleanly and `data/cube`'s unloadability outside a bundler turns out to
be a decorator-semantics problem that stubbing cannot fix; and a group node with both leaf and group
children genuinely double counts, which `bucketSpecFn` + `includeLeaves` can produce today, so
`PivotQuery` has to reject that combination. Also flagged the Wide cost estimate as possibly 2× low.
Pick up at the `data/cube` mechanical changes.

**2026-08-03 — Plan doc review.** No implementation. Rewrote this document against updated prose
guidelines: collapsed facts repeated 3-5× to one home each, deleted the completed phase 0/1
checklists and the prototype-only findings that the rewrite resolves, and cut prose that only
confirmed the design was correct. Fixed a real defect: baseline finding 5 argued for a soft cap or
warning on pivot cardinality, contradicting phase 1's settled decision to throw. Pick up unchanged
at phase 2 and/or phase 3.

**2026-08-05 — Phase 2 review, and the harness gap it exposed.** Reviewed the phase 2 changeset and
fixed seven things (`7116572c6`..`0d333722d`). The headline is a class of bug rather than any one of
them: `PivotCellRow` encoded its owner and path in its cache-key id while also holding pointers to
what those strings name. Plain `View` never had that duplication, which is why it never hit this. The
resulting constraint lives on `PivotCellRow`'s class comment, where anyone adding state to it will
read it. Two filed findings were walked back — a stale `pivotParent` is not reachable, and the
`mergeSorted` precondition claim did not survive mutation testing (committed anyway as a modest
cleanup). Started closing the harness gap: the Toolbox suite now covers filter transitions and query
identity, 74 → 99 checks, mutation-tested by reverting each fix and confirming the new checks go red
— seven failures and five, with every pre-existing check staying green, which is the measure of how
wide the gap was. That reaches the three bugs on the `_rowCache` path; `7873d3ff2` and `da632efb9`
still have no coverage written for them. Pick up at re-measuring the benchmark, then the two bolded
phase 2 items.

**2026-08-05 — Phase 2 coverage closed and verified.** Every actionable phase 2 item is done; only
retiring `PivotDataModel` remains, and it is blocked on phase 3. Unit tier 28 → 49 checks, Toolbox tier
99 → **211**, both green, both mutation-tested for real (19/23 aggregator mutants, 4/4 lattice mutants,
and the pivot-dim mutant kills 21 checks). Benchmark re-verified over three runs; both gated profiles
pass and the delta-tick gate is set at 15ms.

Findings that outlast this session. **`SumAggregator.replace` diverges from `aggregate`** when the last
non-null constituent goes null — incremental 0 against a rebuilt null, in the framework's default
aggregator, independent of pivoting; filed under
[framework gaps](#framework-gaps-worth-fixing-on-their-own) and still unfixed. **The suite could have
faked its own aggregator coverage**, because a silent fall back to full rebuild produces correct values
and identical result identity; asserting the incremental path was taken is now a standing rule under
[Verification vehicle](#verification-vehicle), with two sibling anti-vacuity rules. **Coverage the plan
claimed but did not have**: no scenario had ever connected a `Store`, exercised `provideLeaves`, or
bucketed. Two harness bugs made green and red both meaningless — an undeclared `passed` store field
pinned the Gate column to red, and `View.parseStores` threw on `stores: null` (fixed in the framework;
`null` is Hoist's no-value sentinel).

Pick up at phase 3, and at the `store-simple` rebase — see the note under
[Rebase onto the Store rework](#rebase-onto-the-store-rework-store-simple).

**2026-08-05 — Re-measure, and the benchmark was lying.** Phase 2 clears both build gates and the
delta-tick gate on every profile, beating the prototype everywhere; the new
[Result](#result--pivotview-measured-against-the-baseline) supersedes 2026-08-04 outright. The
drill-down build regression does not exist — A/B'd by checking `data/cube` out at `7116572c6~1` and
re-running, which reproduces HEAD's numbers, not the recorded ones. That kills the cell-row elision
item and, separately, explains the drill-profile tick stall: background-tab timer throttling. Both
failures trace to one cause, now documented under [How to measure](#how-to-measure) — a hidden tab
silently inflates every figure instead of erroring. Pick up at restating the tick gate, then the
remaining coverage items (aggregators beyond `SUM`, heap, plain-`View` regression).
