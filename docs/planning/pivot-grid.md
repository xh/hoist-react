# PivotGrid

**Branches:** `pivot-grid` in hoist-react, plus a matching `pivot-grid` in Toolbox for the harness and
example pages. Both sit on current `develop`, which now carries the Store rework — build phase 3 here.
`pivot-grid-pre-store-simple` in each repo is the pre-rework history, kept only until this is bedded in.
See [Rebase onto the Store rework](#rebase-onto-the-store-rework-store-simple).

**Toolbox commits on this branch need `--no-verify`.** Its pre-commit hook runs `yarn lint:types`,
which resolves `@xh/hoist` against the published `node_modules` copy, so every file touching the pivot
API fails on missing exports. To typecheck for real, uncomment the `paths` block in
`client-app/tsconfig.json`, run `tsc`, then re-comment it — that block must not be committed enabled.

**Status: phases 0-3 complete, measured and verified.** Correct against its reference suite (293
Toolbox checks, 49 unit checks, both mutation-tested), merged up to current `develop`, rendering as a
real grid, and measured across a full matrix - see
[Result: the phase 3 matrix](#result--the-phase-3-matrix). Phase 2 closed with `PivotDataModel`'s
retirement; phase 3 closed with the re-measure, which also resolved the last open design decision and
retired two guards the numbers did not support. Only phase 4 remains.

**Read [Grid integration design](#grid-integration-design) before touching `PivotGridModel`** — it is
the settled contract phase 3 built to. **Phase 3 is complete.** Pick up at phase 4, whose real work is
deciding day-1 vs follow-up for [Extras and Nice-to-Haves](#extras-and-nice-to-haves); the rest is docs
and a CHANGELOG entry.

**In flight, uncommitted in Toolbox:** `PivotPerfModel` gains a total-heap column measured against a
settled baseline, so grid heap comes out as one config's grid row minus its data row. That is the
[matrix caveat](#result--the-phase-3-matrix)'s own prescription. Unrun — either run and record it, or
drop it.

Everything deliberately deferred is collected under
[Extras and Nice-to-Haves](#extras-and-nice-to-haves); phase 4 decides day-1 vs follow-up for each.

**To see the data layer's output before touching it**, open Admin › Tests › **Pivot Inspect** — eight
records with hand-checkable values, and the query, raw records, `result.rows`, `result.paths`,
`result.cellFields` and the resulting `Store` records all dumped as JSON.

**Goal:** promote a client-app `PivotGrid` component into hoist-react as a first-class framework
component, with a pivot data layer that is efficient enough for ticking data.

Multi-session effort — keep this document current: check off TODOs as they land, record decisions in
the sections below, and append to the session log.

## Terminology

Settled. Use these terms in prose, in code, and in the public API.

**Revised 2026-08-06 back to "summary".** Phase 0 moved to "totals" because "summary" collided with
`Store.summaryRecords` and `GridModel.showSummary`. The collision was really ambiguity about *which*
aggregate was meant, and the row / pivot / value qualifiers below fix that on their own — so the word
"summary" is free to stay, and consistency with the framework's own vocabulary wins. `valueSummary`
in particular maps straight onto `GridModel.showSummary`.

| Term                           | Meaning                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **grouping** / group dimension | Row dimensions — today's tree-grid `groupBy`. 1-3 typical, 6 the practical ceiling.                                  |
| **pivot dimension**            | Extra dimensions sliced into columns, hierarchically. 1 typical, 3 the ceiling.                                      |
| **pivot path**                 | One ordered tuple of pivot dimension values, e.g. `US >> Equity`. Maps to one column or column group.                |
| **value field**                | The measure to aggregate. 1 typical, occasionally 2-3 related fields.                                                |
| **value column**               | The rendered column for one (pivot path, value field) pair.                                                          |
| **cell**                       | One (group row, pivot path, value field) intersection.                                                               |
| **row summary**                | Per group row, per value field: the aggregate across _all_ pivot paths. The docked "Total" column(s).                |
| **pivot summary**              | Per group row, per value field: the aggregate within _one_ pivot grouping — i.e. a subtotal at a parent pivot node.  |
| **value summary**              | Per pivot path, per value field: the aggregate down _all_ group rows. The docked summary row.                        |

**Row summaries are pivot summaries at the root pivot level** — the same operation at different depths
of the pivot tree, so one mechanism serves both.

**Pivot summaries do not exist in the prototype** and are net-new work. They only appear with 2+ pivot
dimensions, so the typical single-pivot-dimension config never shows them.

Each config pairs visibility and placement into one member, as `GridModel.showSummary` does: `true`
takes a default side, an explicit side places it, `false` omits it.

| Prototype                  | New                                                          |
| -------------------------- | ------------------------------------------------------------ |
| `showSummaryColumn`        | `rowSummary: boolean \| HSide` — true means 'right'          |
| `summaryColumnSide`        | folded into `rowSummary`                                     |
| `showSummaryRow`           | `valueSummary: boolean \| VSide` — true means 'top'          |
| `summaryRowSide`           | folded into `valueSummary`                                   |
| `extraSummaryColumnFields` | **cut** — see [Feature set](#feature-set-and-config-surface) |
| `extraSummaryRowFields`    | **cut** — see [Feature set](#feature-set-and-config-surface) |
| `SUMMARY_COL_ID_PREFIX`    | gone — `colId` is the cell field name                        |
| —                          | `pivotSummary: boolean \| HSide`, net-new                    |

Type-level renames settled in phase 1: `PivotValue` → `PivotPath`, `cmp/pivotgrid`'s `PivotQuery` →
the `data/cube` `PivotQuery`, and `PivotField` / `PivotFieldSpec` retired (see
[Package location and exports](#package-location-and-exports)).

## Context

`cmp/pivotgrid/` began as a working prototype written in a client app and imported wholesale. All
three of its parts are now gone: `PivotDataModel` retired in favor of `PivotView`, `PivotGridModel`
rewired onto it, `PivotGrid` brought up to framework conventions.

The one thing worth keeping from it is why the engine had to be replaced rather than tuned.
`PivotDataModel` widened each leaf record with a synthetic field per `(pivotPath, valueField)` pair,
then built a `Cube` over the widened rows so the existing aggregators produced the pivot cells. **That
cost model is wrong by construction**: `Cube` aggregation is dense over fields while the widened data
is sparse over fields, so every aggregate row computed every synthetic field — and a fresh `Cube` per
update meant a tick cost a full rebuild no matter how little changed. See the
[baseline](#baseline--pivotdatamodel-as-imported).

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
outermost fails symmetrically: it materializes the value summaries and loses the row summaries.

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
itself — which is what makes row summaries and pivot summaries one mechanism.

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
- `ParentRow`: reads its aggregation field lists through protected getters, defaulting to the
  View's per-depth lists. `PivotCellRow` overrides them with the cell lists, which is what lets
  cell rows aggregate only the value fields.
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

    /** Measures to aggregate per cell. Must be aggregatable. */
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

`fields` is derived and purely additive, and this is the one place `PivotQueryConfig` deliberately
breaks from `QueryConfig`. `dimensions`, `pivotDimensions`, `valueFields`, and the `dependsOn` of
those value fields are unioned in at construction; an unspecified `fields` therefore yields *that
baseline only*, not all `Cube.fields`. Two reasons the inherited all-fields default is wrong here:

- Deriving is the only way to be correct. `PivotView`'s cell aggregation fields draw solely on
  declared `fields`, so a query narrowing them would otherwise silently lose a value field's
  dependencies and aggregate wrong numbers with no error.
- Deriving-only is the only sane default. Every aggregatable field in `fields` is aggregated on every
  row of the hierarchy (`ParentRow` defaults to the View's per-depth field lists), so
  inheriting all `Cube.fields` silently pays for measures the pivot will never display. Apps wanting
  the plain-Query behavior pass `cube.fields` explicitly.

Two constraints on the derivation, both easy to regress:

- It resolves to `CubeField`s rather than names, so that `clone` re-deriving from its own output
  lands on an identical array. Names would be re-ordered into Cube field order by
  `Query.parseFields` (which passes a `CubeField[]` through untouched), breaking
  `equalsExcludingFilter` and with it `updateQuery`'s no-op check.
- `cloneConfig` passes the *raw* pre-derivation `fields`, as it already does for `filter`. Re-deriving
  from `this.fields` would strand the fields of value fields an override is replacing, so a UI
  measure picker would accumulate dead aggregations with every change.

Validation at construction: every `valueFields` entry must carry an aggregator and not be a
dimension; `pivotDimensions` entries must be dimensions; `pivotDimensions` and `dimensions` must not
overlap.

### Result shape

```typescript
interface PivotViewResult extends ViewResult {
    /** Pivot path tree, roots first. Identity-stable while the structure is unchanged. */
    paths: PivotPath[];

    /** One entry per (path, value field), including the root-path row summaries. Identity-stable with `paths`. */
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
| row summary   | a group row's own aggregate of the value field — i.e. `C(G, rootPath)`, field name is the value field's own name  |
| pivot summary | `C(G, P)` for a partial `P`; materialized automatically with 2+ pivot dimensions                                 |
| value summary | the `includeRoot` root row's cells                                                                               |

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
  `valueField.name` when `path.key` is empty. So the row-summary column binds to the plain value field
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
- No group dimensions — allowed; with `includeRoot` the result is a single value-summary row.

### Pivot cardinality guard

`maxPivotPaths`, default **1000**, checked during path discovery so it bails before building cells.
Exceeding it throws, naming the dimension and the count. `null` disables the check.

5,000 paths is never a legitimate result — it is a misconfiguration, and 5,000 columns is a grid
problem no data layer can fix. Failing fast with an actionable message beats a multi-second freeze
that reads as a hang.

A soft cap bucketing the tail into `(other)` was rejected for v1 (see
[Extras](#extras-and-nice-to-haves)): to keep the totals invariant the
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
measurable from `PivotViewBenchModel`, and the prototype harness that had the `sampleHeapAsync` tooling
is now retired, so reinstating heap measurement means writing it from scratch — judged not worth it
against a rewrite that beats the prototype's heap on every profile by construction — it holds no per-update `Cube`. Revisit only if heap becomes the binding constraint, at
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

`PivotViewBenchModel` is the one benchmark, in the lower half of Admin › Tests › **Pivot View**. It
measures `PivotView` against the [gates](#acceptance-criteria) and reports no heap. The prototype's
own harness is gone with it — see [Baseline](#baseline--pivotdatamodel-as-imported).

Two non-benchmark panels sit alongside it. `PivotViewTestModel` is the correctness suite, in the top
half of **Pivot View**. `PivotInspectModel` is Admin › Tests › **Pivot Inspect** — no assertions, just
eight records with values 10, 20, ... 80 and every stage dumped as readonly JSON: the resolved
`PivotQuery`, the raw records, `result.rows` verbatim, `result.paths`, `result.cellFields`, and the
records read back out of a connected `Store`. Toggles cover a second pivot dimension (which
materializes pivot summaries), sparse data (an unpopulated cell), `includeRoot` / `includeLeaves`, and a
tick that adds 100 to one record. **Reach for it first when reasoning about the data contract** — the
suite proves correctness but this is what makes it legible.

The `PivotView` panel never mounts a grid, so its numbers carry no ag-Grid render cost. A headless
number and a windowed one are not comparable, and the recorded figures below are headless.

**The tab must stay foreground and unoccluded for the whole run, and every number from a run where
it did not is garbage.** The harness `await wait(50)`s between reps; Chrome throttles that chained
timer to 1/sec in a hidden tab and 1/min after five minutes hidden, and `whileAsync` additionally
swaps to its synchronous fallback once `XH.pageIsVisible` goes false. A hidden run does not fail
loudly — it inflates every figure and eventually looks like an indefinite hang with the main thread
measurably idle. Assert `document.visibilityState === 'visible'` before trusting a run, and register
a `visibilitychange` tripwire to void one that went hidden partway.

### Baseline — `PivotDataModel` as imported

Captured 2026-08-01 on a Linux workstation. **This table is now the only record of it** — the
prototype and its harness are retired, so nothing can reproduce these. Kept because the case for the
rewrite rests on them, not because they are re-measurable.

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
      transitions, and query identity. 99 checks, now **262** with the aggregator, plain-`View`,
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
      in the 262-check run.
- [x] Heap gate dropped deliberately — see [acceptance criteria](#acceptance-criteria).
- [x] The drill-profile tick stall was background-tab timer throttling, not GC thrash and not a pivot
      defect. `Run All` now completes all six profiles in ~20s foreground. See
      [How to measure](#how-to-measure).
- [x] Non-pivot `View` behavior provably unchanged — five plain-`View` scenarios plus a plain-`Query`
      scenario in the Toolbox suite, against the same reference accumulator. Covers connected stores,
      `includeLeaves` / `provideLeaves`, `includeRoot`, bucketing with `dependentFields`, dimension-value
      changes, and `Query.clone` with every member set away from its default. Green.
- [x] **Cells load into a `Store`.** The claim behind
      [Cells on row data](#cells-on-row-data-and-field-naming) — value columns are ordinary `Store`
      fields, hence usable with column filters, export and editing — had no coverage: the store
      scenarios declared only `valueFields`, so they proved row totals load and nothing more. Now a
      `Store` field is declared per `result.cellFields` entry, taking `type` from each entry's
      `valueField`, and every cell is read back out of a record: ~2,900 comparisons per pass, plus
      ~900 asserting an **unpopulated cell reads `null`** rather than `undefined`. Covered in both of
      `Store`'s record representations, since they resolve a default by different mechanisms — sparse
      via the shared `_dataDefaults` prototype, dense via a cloned template, selected by
      `denseRecordThreshold`. A structural change is covered too: a brand-new pivot value mints new
      cell fields, which are re-declared and reloaded.
- [x] `View.parseStores` now treats `null` as "no stores". `castArray(null)` yields `[null]`, and the
      `stores = []` default at construction only covers `undefined`, so `createView({stores: null})`
      threw on `s.reuseRecords`. `null` is Hoist's no-value sentinel, so this was a latent framework
      bug rather than a caller error — the new plain-`View` scenarios are what surfaced it.
- [x] Toolbox suite run and green: **262/262**, worst drift 8.6e-14, no vacuous checks (a zero
      comparison count is a hard failure). Verified in a foreground unoccluded tab with a
      `visibilitychange` tripwire armed.
- [x] Pivot-dimension change coverage, mutation-tested. Gutting `PivotView.hasDimOrBucketUpdates`'s
      pivot branch kills 21 of 262 checks. **The failure mode it catches is the dangerous one:** row
      totals stay correct *and* still equal the sum of their pivot cells, because the leaf values never
      moved — only which path owns them. Only the per-path breakdown is wrong, so a grid looks right
      and is wrong. Perturb non-empty pivot values on already-non-empty records only; the reference's
      `excludeEmptyPivotValues` filter is a snapshot, and moving a record across that boundary stales
      it rather than testing anything.
`PivotDataModel` is retired, closing this phase. See the
[phase 3 checklist](#phase-3--pivotgridmodel) item.

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
markup that rendered as escaped text, so the cell was illegible either way — now plain glyphs.

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

### Result — the phase 3 matrix

Captured 2026-08-07 via Admin › Tests › **Pivot Perf**, in a Brave instance launched with
`--enable-precise-memory-info --js-flags=--expose-gc`, tab foreground throughout (every row carries a
`visibleThroughout` tripwire; all passed). One baseline swept along each axis independently; every
config measured twice, data layer alone and with a **mounted** grid. 100k leaves unless noted.

**Read the `grid` mode as data layer *plus* grid, not grid alone.** `Mount` is ag-Grid instantiation
through first paint; the tick and structural columns in grid mode include ag-Grid's transaction,
applied synchronously by `Grid.dataReaction` before the update resolves.

| Config                            | Cube | View | Model | **Mount** | tick 5% (data → grid) | tick 50% (data → grid) | New pivot val (data → grid) | View heap |
| --------------------------------- | ---: | ---: | ----: | --------: | --------------------: | ---------------------: | --------------------------: | --------: |
| **Baseline** 3 grp / 2 piv / 1 val |   92 |  427 |     9 |       117 |          57.9 → 83.5  |          284 → 331     |                  360 → 442  |    42.0MB |
| **Plain View control**, 25 fields  |  262 |  227 |     5 |        60 |          52.4 → 79.7  |          321 → 342     |                       — → — |    13.9MB |
| 1 pivot dim (5 cell fields)        |   91 |  176 |     7 |        69 |          42.5 → 70.8  |          219 → 236     |                  202 → 244  |    15.4MB |
| 3 pivot dims (101 cell fields)     |   98 |  580 |     8 |       212 |          68.4 → 108.5 |          392 → 420     |                  472 → 685  |    74.7MB |
| 3 value fields (87 cell fields)    |   90 |  336 |     7 |       220 |          55.8 → 86.8  |          319 → 330     |                  321 → 481  |    37.8MB |
| 2 group dims (313 rows)            |   92 |  197 |     4 |        88 |          40.5 → 51.0  |          218 → 241     |                  206 → 255  |    13.3MB |
| 4 group dims, drill (104k rows)    |   94 | 1310 |    71 |   **582** |          70.4 → 348.2 |          411 → 909     |                 753 → 1455  |   137.3MB |
| 25k leaves                         |   23 |  137 |     6 |       115 |          11.1 → 31.4  |           52 → 81      |                  107 → 176  |    16.3MB |
| 250k leaves                        |  245 | 1041 |     6 |       123 |         135.5 → 184.4 |          771 → 820     |                  748 → 830  |    66.1MB |

**Mounting is the expensive part of the grid layer, and it is not optional.** Model construction
(Store records + `Column` objects) is 4-9ms; *mounting* is 60-582ms. `setColumns` really is cheap at
0.2-1.2ms even over 74 columns — that one holds.

**A mounted grid multiplies tick cost by 1.4-5x.** Baseline 57.9 → 83.5ms; drill-down 70.4 → 348.2ms.
The multiplier tracks row count, not cell count: the 3-pivot config (101 cell fields, 4,213 rows) only
pays 1.6x, while drill-down (29 cell fields, 104k rows) pays 4.9x. Consistent with phase 0, which saw
mounting roughly double Typical's tick.

**Pivoting still costs about what a wide plain grid costs.** Total build 519ms vs the control's 489ms;
mounted ticks 83.5 vs 79.7ms at 5%. The split differs — pivot parses less (92 vs 262, far fewer query
fields) and aggregates more (427 vs 227).

**Value fields are cheap in the data layer, not in the grid.** 1 → 3 value fields costs nothing to
build (427 → 336ms) and +7MB heap, but mount goes 117 → 220ms and a new pivot value 442 → 481ms,
because each value field multiplies *columns*. Pivot dimensions remain the expensive axis in both
layers.

**Grid heap is unmeasured, and the harness says so.** The `+Grid` deltas come out negative on 7 of 10
configs (down to -202MB), which is not a result — sampling after the mount collects transient garbage
the post-view sample still held, so the two are not differenceable. Only the *view* heap column above
is trustworthy. Isolating grid heap needs separate mounted and unmounted runs compared on total heap,
not a delta within one run.

Two further caveats. The machine was not quiet — dev server and tooling running — so treat these as
relative. And structural transitions are expensive in absolute terms even before the grid: group-dim
change 191ms, pivot-dim change 212ms, filter 261ms, new pivot value 360ms at baseline. A filter-only
change retains the whole row cache but still re-walks every record, so it beats a full build by only
about a third.

## Rebase onto the Store rework (`store-simple`)

The Store rework reworked Cube View row and record reuse — the exact machinery phase 2 builds on — and
**merged into `develop` as `d61321545` (#4534), squashed**, so its own commits are not in develop's
history. Our commits are rebased onto `develop` and verified there: 262/262 Toolbox checks, 49/49
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
- **`PivotView.loadUpdatedRows` restamps digests** on every owner group row it projected onto, since
  connected stores now skip record rebuilds by comparing `cubeRowDigest` and the base class stamps
  before `loadUpdatedRows` runs. **It is dead code, and the justification first recorded here was
  wrong.** The claim was that an owner whose own aggregates held is absent from `updatedRows`; in fact
  `BaseRow.applyDataUpdate` pushes an update per aggregatable field without testing whether the value
  moved, so every group-axis ancestor of a changed leaf — every cell's owner included — is always
  present and already stamped. Deleting the restamp leaves the suite green, including 2,886 post-tick
  cell values read back out of a `Store`. Kept as insurance should that propagation ever become
  conditional; delete it deliberately if a dead line is not worth carrying.
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

**A second consequence surfaced in phase 3, and it is a correctness one.** Under the grid store's
`projectionOnly`, a record's data _is_ the row data object, so an unpopulated cell reads `undefined`
rather than the `null` phase 2 proved through `Store`'s own defaults. Templating cell fields would
restore `null`; the sparse model would not. That does not decide the question — `== null` covers both
and no consumer is known to care — but it is now a second thing on templating's side of the ledger,
and it must be documented if the sparse model stands.

Three ways out, in rough order of appeal: accept dictionary mode for pivoted group rows and drop the
fixed-shape guarantee there deliberately; template only the cell fields and pay the dense memory,
which is defensible if `maxPivotPaths` keeps path counts genuinely low; or revisit
`Column.getValueFn` and keep cells on cell rows, already recorded as rejected but explicitly
revisitable "if heap becomes the binding constraint".

**Resolved 2026-08-07 against templating, on the view-heap argument alone.** *View* heap scales
squarely with cell rows — 15.4 → 42.0 → 74.7MB across 1 → 2 → 3 pivot dimensions
([matrix](#result--the-phase-3-matrix)) — and templating cell fields makes exactly that axis worse,
since every group row would carry every cell slot: on Wide, 31,637 × 138. Nothing in the measured
build times suggests dictionary-mode row data is costing enough to buy that back.

**What this does *not* rest on:** an A/B of templating itself, which was never run. The claim is that
templating is unattractive, not that dictionary mode is free. If it is ever revisited, the honest test
is implementing the template and comparing build and view heap directly — the same trap as the
earlier grid measurement, where a plausible number turned out to be measuring the wrong thing.

## Grid integration design

**Settled.** This section is to phase 3 what [Pivot data design](#pivot-data-design) is to phase 2.

### Ownership

The app owns the `Cube` and the `PivotView`. `PivotGridModel` takes a view in its constructor config,
is bound to it for life, and owns everything downstream.

| artifact            | owner             | lifecycle                                                                                            |
| ------------------- | ----------------- | ---------------------------------------------------------------------------------------------------- |
| `Cube`, `PivotView` | app               | `PivotGridModel` must **not** `@managed` the view — the app's view outlives any grid bound to it      |
| grid `Store`        | `PivotGridModel`  | minted via `PivotView.createStore()`, `@managed`, and disconnected from the view in `destroy()`       |
| `GridModel`         | `PivotGridModel`  | receives the store as an instance, so `GridModel` never `markManaged`s it (`GridModel.ts:1803`)        |

`PivotGridModel` carries **no query config**. `dimensions`, `pivotDimensions`, `valueFields`,
`includeRoot` and the rest live only on `PivotQuery`; apps reconfigure by calling `view.updateQuery()`
and the grid follows. The grid model's own config is purely presentational — the three summaries,
pivot sort, `persistWith`. The view is not swappable after construction:
swapping means re-declaring fields, columns and column state, which is the same work as constructing a
new model.

Two `PivotGridModel`s may bind to one view. Each mints its own store; column state and selection are
already per-`GridModel`.

### Why the view pushes rather than the model reacting

`View.fullUpdate` (`View.ts:361`) runs `generateRows` → `endGeneration` → `loadStores` →
`updateResults`, assigning `result` last. **A MobX reaction on `result` therefore cannot declare the
store's cell fields in time** — the load has already run against the old field set, and under
`projectionOnly` that builds records with the wrong declared-field set rather than merely rendering
late. Pivot needs this and plain `View` does not, because a plain view's field set is static and known
at construction while cell fields are discovered from data.

So `PivotView` syncs cell fields onto its connected stores before `loadStores()`, touching only the
fields named by `result.cellFields` and leaving the app's own alone. It also sets
`Store.loadRootAsSummary` from `query.includeRoot` — `Store.loadData` wants exactly one root node
carrying `children`, which is what `loadStores` already publishes — so the app's remaining value-summary
wiring is just `GridModel.showSummary`.

Columns are the opposite case and stay in the grid layer: `PivotGridModel` reacts on `result.paths`
identity and rebuilds. Rebuilding after the load is harmless, since a store carrying fields no column
references is fine, and there is no intermediate paint — `noteCubeLoaded` / `noteCubeUpdated` are
`@action`, so the load and the reaction's `setColumns` land in one batch.

Rejected: a `pivotGridModels` registry on `PivotView`. It diagnoses the ordering problem correctly but
inverts the layering — `data/cube` would import from `cmp/pivotgrid`, making `data/cube` unloadable
without the grid layer.

### `PivotView.createStore()`

Mirrors `Cube.createView` — a convenience factory with an optional `connect`, not a claim of ownership.

- `connect: true` registers the store into `view.stores`; the view loads it from then on.
- `connect: false` declares fields and loads once from the current result, then never again.
- The view may not have run yet. If it has, the factory declares and loads immediately; if not, the
  store stays empty until the first update. Getting this wrong shows up as a grid that fills one tick
  late.

**The caller disconnects.** `View` self-unregisters on destroy (`View.ts:672`) because the registered
object is the owned object; a store's owner is `PivotGridModel`, so it calls `view.disconnectStore()`
in its own `destroy()`. Say so on `createStore`'s JSDoc, or the asymmetry reads as an oversight and
gets "fixed" by teaching `Store` about views. Do **not** make `loadStores` skip destroyed stores
defensively — that converts a loud failure into a silent leak.

### The grid Store: `projectionOnly`

Settled. It is what `View` recommends for a connected store, and it skips a per-record parse and copy
on every load and tick. Three consequences to build to.

Records hold the view's row data object **by reference** — the same object `projectCell` mutates in
place — so values can never be stale. What `cubeRowDigest` governs is whether the record is rebuilt at
all, which is what makes the grid repaint. Every cell owner is already stamped (see the
[rebase note](#rebase-onto-the-store-rework-store-simple)), but this is the one place a missed stamp
shows up as a grid that silently fails to repaint, and nothing tests that. Relatedly, `loadData()`
skips reference-equal rows as unchanged — updates must arrive via `updateData()`.

`type` / `parseVal` / `defaultValue` are **not** applied, so cell values must already be grid-ready as
the aggregators leave them.

Do **not** set `projectionOnly` on the Toolbox correctness suite's store: with `data` held by
reference, `checkCellStore` would compare a row against itself and pass vacuously.

### What fields do under `projectionOnly`

Nothing, to a record. `createRecord` (`Store.ts:1319`) returns `data: raw` before any parsing;
`buildData` — the only consumer of `_dataDefaults` / `_dataTemplate` — is on the non-projection path;
and `getReusableRecord` (`Store.ts:1358`) compares id, digest and tree path with no field involvement.
Declaring a field per `cellFields` entry is still required, but for columns, filters and export — not,
as an earlier note here claimed, for the record-reuse equality check.

Two consequences:

- **`setFields` drops records unconditionally, and retaining them under `projectionOnly` is pointless.**
  The retention branch was built and then removed: a structural change bumps digests, and
  `RecordSet.areRecordsEqual` treats any digest difference as inequality, so the immediately-following
  `loadStores()` rebuilds every record anyway — retention preserved **0 of 1778**. Do not reinstate it
  without first showing a digest that survives the transition.
- **Unpopulated cells read `undefined`, not `null`.** Phase 2 proved `null` via `_dataDefaults`
  (sparse) and the cloned template (dense), both non-projection paths. The correctness suite cannot
  catch the divergence, since it must not set `projectionOnly`. Benign under `== null` testing, but
  undocumented — and [templating cell fields](#open-decision-fixed-shape-rows-vs-sparse-cells) would
  remove it.

### Feature set and config surface

**`extraSummaryRowFields` is cut.** The prototype's extra value-total rows (`PivotDataModel.ts:158`)
clone the root row data once per extra field, blank the other value fields, and stamp a `summaryField`
marker — N synthetic summary records from one root row, driving the `colSpan` / `cellStyle` machinery
in `buildValueColumn`. The grid layer cannot rebuild it: `View.loadStores` calls `store.loadData()`, a
full replace that also nulls `summaryRecords`, so any record the grid injected is wiped on the next
load. An app that needs it sets pinned row data on the `GridModel` — the aggregates are already on the
root row, so this is a rendering concern, not a data one. Reinstating it as a framework feature means
`PivotView` minting multiple root rows, which is a display concept wearing a data-layer costume; do
that only if a second client asks.

The cut retires findings `PivotGridModel:466,469`, `:463` and `:498,455` outright, along with
`isSummaryColumn` and `SUMMARY_COL_ID_PREFIX`.

**`extraSummaryColumnFields` goes with it.** Row totals are one column per value field, full stop.
Nothing is actually lost: any field in `PivotQuery.fields` is already aggregated onto every group row,
so an app that wants a totals column for a non-value field can bind one. Reinstating the config is
therefore cheap if the need arises — it names which fields to build columns for and nothing else.

**Pivot summaries ship in v1**, config-gated and default off. `rowSummary` and `pivotSummary` stay
separate configs even though row summaries are pivot summaries at the root path and share an
implementation — most users only ever see the `Total` column and will not reason about it as a pivot
subtotal. Unifying them later is a breaking change.

Each summary config carries its own placement rather than taking a paired `*Side` member:
`boolean | HSide` (or `VSide` for the row), mirroring `GridModel.showSummary`. **There is no autosize
config** — `gridConfig.autosizeOptions.mode: 'managed'` already autosizes on every data load, which is
exactly when a pivot grid's columns change.

**`labelColumnOverrides` and `valueColumnOverrides` are dropped for the initial implementation** (see
[Extras](#extras-and-nice-to-haves)). Add
them back if consistency across value columns turns out to need a dedicated hook.

**Column ids are cell field names.** Row totals bind the plain value field name, cells bind
`` `${path.key}${DELIM}${valueField.name}` ``, and no prefix namespace survives. Settle any change to
this before persistence lands: `colId` keys persisted column state, and pivot values are data-derived,
so a scheme that shifts when the data shifts discards state silently.

**Package location stays `cmp/pivotgrid`.** `ZoneGridModel` and `ZoneGrid` live in `cmp/zoneGrid/` with
only desktop-specific chrome under `desktop/cmp/zoneGrid/impl/`, and ZoneGrid is desktop-only in
practice too — so "desktop-only" is not what drives this. Nothing in `PivotGrid` is platform-specific.
The all-lowercase spelling is deliberate and follows the `cmp/` majority (`loadingindicator`,
`relativetimestamp`, `dataview`); `zoneGrid` is the outlier. Settle it now — the import path is public
API, so recasing after release is breaking.

## Phase 3 — PivotGridModel

Build to [Grid integration design](#grid-integration-design), which settles the decisions that used to
head this list.

**Prerequisite.** `GridModel.enhanceColConfigsFromStore` (`GridModel.ts:1833`) rebuilds `fieldsByName`
from every store field at each recursion level, so it is `O(groups × fields)` inside every
`setColumns`. A pivot grid rebuilds nested column groups over hundreds of cell fields on every
structural change, which is exactly that shape. Fix it before rewiring, not opportunistically.

- [x] Fix the `enhanceColConfigsFromStore` prerequisite above. Store fields resolve once and are
      passed down the recursion; col-level `field` config objects stay scoped to their own level, with
      the shared map copied only when a level contributes one.
- [x] `Store.setFields()`, replacing the prototype's `_fieldMap` / `_dataDefaults` pokes. Replace-all;
      rebuild both `_fieldMap` and `_dataDefaults`; drop records, per
      [What fields do](#what-fields-do-under-projectiononly). Public, but marked
      `@internal` in JSDoc for now — the pivot store is not app-configurable and a general `setFields`
      reopens that door. `parseFields` already throws on an `id` field. Retains the configured
      `fieldDefaults`, which the constructor previously discarded.
- [x] `PivotView.createStore({connect})` and `disconnectStore()`, per
      [the factory contract](#pivotviewcreatestore). Takes the full `StoreConfig` surface, defaulting
      `loadTreeData` and `projectionOnly` to true — the correctness suite needs to opt out of the
      latter. Declares `VIEW_ROW_DATA_FIELDS` (new, in `ViewRowData.ts` so it cannot drift from the
      interface) plus the query fields, then defers to the sync below for cells.
- [x] `PivotView` syncs cell fields onto connected stores before `loadStores()`, and sets
      `loadRootAsSummary` from `query.includeRoot`. Keyed on `result.cellFields` *identity* per store
      in a `WeakMap`, so the steady state does no work; that map must be `declare`d and lazily
      initialized, since a field initializer on a `View` subclass runs after `super()`'s
      constructor-time `fullUpdate`. `View.loadStores` gained a per-store `loadStore` so the factory
      can load a non-connected store once, and `parseStores` widened to `protected`.
- [x] Rewire `PivotGridModel`: take a `PivotView`, drop every query-mirroring `@bindable`, mint and own
      the store, rebuild columns on `result.paths` identity, disconnect the store in `destroy()`. What
      the data layer hands it:
      - Row-totals columns bind the value field's own name — no synthetic field, no prefix games. One
        per value field, full stop.
      - The value-summary row is `includeRoot: true` plus `GridModel.showSummary` — no separate summary
        data path, and no `'Total>>' + field` `cubeDimension` hack.
      - `PivotPath` exposes raw `value` plus a plain `label`, so the grid layer renders labels itself
        and the prototype's try/catch-a-cell-renderer hack goes away.

      **`equals: 'shallow'` on the columns reaction is load-bearing.** `addReaction` defaults to
      identity comparison and a track fn returning an array allocates a fresh one per run, so the
      default rebuilds columns — and resets column state — on every tick.

      The prototype's per-value-field `columnTemplate` returns as `valueColumnSpecs`, keyed by value
      field name. It has to live somewhere: formatting a currency measure is impossible without it, and
      it is presentation, so it does not go back on a `CubeField`.
- [x] Adopt the settled [terminology](#terminology) across the public API.
- [x] Pivot summaries: column building and config surface. One method builds row and pivot summaries,
      since row summaries are the pivot summaries at the root path.
- [x] Work the [correctness](#correctness-bugs) and [cleanup](#framework-conventions-and-cleanup)
      checklists. `sortPivotValues`, the `headerName` thunk, the `[Component, factory]` pair, the
      `ag-grid-community` import, copyright headers, `PivotSort`, the hardcoded autosize and the
      `setColumns`-per-load and `new Field()`-per-update hot spots all went with the rewire. All that
      survives is `useRawAsData`, a "consider" item independent of pivoting — see
      [framework gaps](#framework-gaps-worth-fixing-on-their-own).
- [x] **Reevaluate digest handling and row reuse against the current `Store` / `View` / `Cube`, once
      measured.** Done; both guards went. The load-bearing reason is *observational, not
      performance*: `Store.setFields`' retention preserved **0 of 1778** records across a structural
      change, because a bumped digest mints a new record regardless — so the branch never did
      anything. Likewise `loadUpdatedRows`' restamp was already dead, every owner being stamped by
      `applyDataUpdate` before it ran. Cell-row reuse is inherited from `View` and needs nothing.

      **Do not re-derive this from "the grid layer is cheap" — that was measured wrong.** With a
      mounted grid a structural change costs the grid layer +82ms at baseline and +702ms on
      drill-down, so record churn is not obviously negligible. It is simply not what these two guards
      were affecting.

      Original notes, kept for the reasoning: Those three moved underneath this work the whole time it was in flight, and most of
      it arrives free through `PivotView extends View` — but three things want checking rather than
      assuming:
      - **Do cell rows get the reuse the changelog promises for group rows?** They live in the same
        `_rowCache` and are validated by their children arrays, so they should; nothing has measured
        it. Note `pruneCacheForQueryChange` wipes every non-leaf row on a query change, cells
        included, while a filter-only change now retains everything.
      - **`PivotView.loadUpdatedRows`' digest restamp.** Documented as dead-code insurance, it now has
        a real cost if ever live: a bumped digest mints a new `StoreRecord` outright. Delete it or
        justify it on measured numbers.
      - **Whether `Store.setFields` should still retain records under `projectionOnly`.** Its stated
        reason — the provider reloads immediately and reuse hinges on digests matching committed
        records — no longer holds if the digests have moved anyway. If so, drop the branch and the
        rationale together.

      `canAggregateFn` is now evaluated only at row construction, which is the same purity constraint
      `PivotView` already relies on to share one `canAggregate` map per pivot path.
- [x] **Re-measure build, tick and heap — the gate for leaving phase 3.** See
      [Result: the phase 3 matrix](#result--the-phase-3-matrix). Original scope: Nothing
      since the phase 2 numbers has been measured, and two open questions are blocked on it:
      [fixed-shape rows vs sparse cells](#open-decision-fixed-shape-rows-vs-sparse-cells), which wants
      a build figure the benchmark has never been quiet enough to resolve; and heap, which has no
      figure at all. **Heap needs tooling written first** — `sampleHeapAsync` went with
      `PivotBenchModel`, so `PivotViewBenchModel` reports none. Grid-layer cost is also unmeasured:
      every figure to date is `PivotView` alone, and `PivotGridModel` adds a column rebuild plus a
      `Store` load per structural change.
- [x] Retire `PivotDataModel`, closing the last phase 2 item. Took `PivotFieldSpec`, `PivotValue` and the
      `cmp/pivotgrid` `PivotQuery` with it, plus Toolbox's whole Pivot Bench harness and the recorded
      baseline columns on the `PivotView` benchmark — comparing against a deleted implementation is
      unverifiable. The [baseline table](#baseline--pivotdatamodel-as-imported) is now its only record.
- [x] Toolbox Admin test page — Admin › Tests › **Pivot Grid**, a live `PivotGrid` with the query on
      one toolbar and the presentation on the other, plus tick / new-pivot-value / blank-value buttons.
      Verified in the browser: nested column groups, pivot summaries placed within their group, docked
      row summaries on either side, the floating value-summary row, `(empty)` rendering and sorting
      last, `includeLeaves` drill-down, and a new pivot value re-declaring fields and columns
      unaided. Summary invariants check by eye to display precision.
- [x] The deliberately-red `structural change: a projectionOnly store retains its records` check is
      **deleted**, along with the `Store.setFields` retention branch it asserted. `RecordSet.areRecordsEqual`
      treats any digest difference as inequality by design, so a bumped digest mints a new record even
      when every declared value is identical — the branch preserved 0 of 1778 records and the check
      asserted an implementation detail rather than an outcome.

## Phase 4 — Wrap-up and packaging

- [x] Toolbox example page — Grids › **Pivot Grid**, alongside Zone Grid. Real portfolio data via
      `getPricedRawPositionsAsync`, grouped by fund/trader and pivoted on region/sector. Demonstrates
      the ownership split: the page owns the `Cube` and `PivotView` and reconfigures through
      `view.updateQuery()`, never through the grid model.
- [ ] **Decide day-1 vs follow-up for everything under
      [Extras and Nice-to-Haves](#extras-and-nice-to-haves).** This is the phase's real work, not a
      formality — several of those items are cheap now and breaking later.
- [ ] `cmp/pivotgrid/README.md`.
- [ ] `data/cube/README.md` section on the pivot view (belongs with phase 2, not deferred to the
      end).
- [ ] Doc registry + roadmap index entries (`xh-update-doc-links`).
- [ ] CHANGELOG entry; upgrade notes if the `Query` / `View` changes are breaking. The
      `SumAggregator.replace` fix already has its own entry under 🐞 Bug Fixes — do not duplicate it.
      `Store.setFields` is `@internal`, so the candidates are the `View` / `BaseRow` protected-member
      widening and `Query.clone`'s construction via `this.constructor`.
- [x] Exports are in place: `data/index.ts` covers `PivotPath` / `PivotQuery` / `PivotView` and with
      them `PivotCellField`, `PivotViewResult` and `PivotViewStoreConfig`; `cmp/pivotgrid/index.ts` covers
      the `PivotGrid` / `PivotGridModel` pair, and `PivotCellRow` stays internal by design. There is no
      central barrel to add to — `cmp/zoneGrid` is likewise reached only by subpath.

## Extras and Nice-to-Haves

Deliberately deferred, with the condition that would pull each one forward. **Phase 4 decides day-1 vs
follow-up for each.** The bar is not "would this be nice" but "is this cheap now and breaking later" —
anything that shapes a config name, a `colId`, or persisted state belongs on day 1.

**Column state persistence.** Nothing on `PivotGridModel` is user state, so it needs no `persistWith`
of its own — apps reach `GridModel`'s via `gridConfig.persistWith`, and app-level toggles bound to
`rowSummary` and friends are the app's to persist. What is missing is that column state does not
survive a structural rebuild: `setColumns` resets `columnState`, `rebuildColumns` restores only the
label column, and with persistence on, `PersistenceProvider`'s reaction writes the loss through to
storage. Two things go with it:

- **A manually set pivot column order is worth persisting** and users will expect it for a
  low-cardinality, stable dimension like `region`. That is the strongest argument for taking this on.
- **`hideNewColumns` must not reach value columns.** `initPersist` defaults it on for a curated
  ViewManager view and `cleanColumnState` hides any new `hideable` column, so a brand-new pivot value
  would arrive invisible. For an ordinary grid a new column is a new feature; here it is new *data*.

Stale `colId`s are the unavoidable cost of data-derived ids and are not a bug to fix: widths persisted
for `APAC>>pnl` are dropped when APAC leaves the data and return as defaults if it comes back.

**Extra value-summary rows** (`extraSummaryRowFields`). Needs `PivotView` minting multiple root rows,
which is a display concept in data-layer clothing — see
[Feature set](#feature-set-and-config-surface). Apps wanting it today set pinned row data on the
`GridModel`. Pull forward only if a second client asks.

**Extra row-summary columns** (`extraSummaryColumnFields`). Names which non-value fields get a totals
column; every `PivotQuery.fields` entry is already aggregated onto every group row, so an app can bind
one itself. Cheap to reinstate, and purely additive.

**A `PivotQuery` config panel component.** All query config lives on the query and apps drive it
through `view.updateQuery()`, so a reusable control for dimensions / pivot dimensions / value fields is
the obvious next component. Admin › Tests › **Pivot Grid** is a working sketch of one; a real version
needs to own dimension-pool disjointness and the empty-`valueFields` guard, both of which that panel
currently hand-rolls.

**Label-column and global value-column config** (`labelColumnOverrides` / `valueColumnOverrides`).
`valueColumnSpecs` covers per-value-field config; absent are one spec across *all* value columns, and
any hook at all on the tree/label column. **The example page hit the second one immediately** - its
label column truncated fund names with no way to widen it, worked around with
`autosizeOptions.mode: 'managed'`. That workaround is legitimate and arguably the better default, but
an app wanting a fixed width, a custom renderer for leaf rows, or a different empty-value label
currently cannot get one. Weigh that when deciding day-1 vs follow-up.

**A toggle for the single-value-field column collapse** (`hideSingleValuePivotCols` or similar - the
name should say "collapse the group", not "hide the column", since nothing is hidden). With one value
field a leaf pivot path renders as a single column headed by the path label rather than a one-child
group, because a group of one reads as a duplicate header (`PivotGridModel.buildPathColumn`). Summary
columns collapse the same way (`buildSummaryColumn`) - a toggle has to cover both or the two headers
disagree. Purely additive and safe to defer: the collapse only drops the group wrapper, so `colId`s
and persisted column state are identical either way. Pull it forward if an app wants the value field's
name visible under every path, or needs the group header for its own reasons.

**Top-N plus `(other)` on the pivot axis.** Rejected as a soft cap for `maxPivotPaths` because keeping
the summary invariant means the bucket must genuinely *contain* the tail — which makes it a real
feature worth designing rather than a guard. See
[Pivot cardinality guard](#pivot-cardinality-guard).

**Bucketing within the pivot axis.** Not supported; `bucketSpecFn` is group-axis only. See
[Interaction rules](#interaction-rules).

**Unifying `rowSummary` and `pivotSummary`.** They share an implementation and row summaries *are*
pivot summaries at the root path, but they stay separate configs because most users only ever see the
`Total` column. Listed only to record that merging them later is breaking.

**`useRawAsData` on `CubeConfig`** (currently only `retainRaw`) — filed under
[framework gaps](#framework-gaps-worth-fixing-on-their-own), independent of pivoting and the only one
of those still open.

## Carried-forward review findings

From the full review of the imported prototype. Scoped to code that survives the phase 2 rewrite —
`PivotDataModel`'s own defects are resolved by replacing it.

### Correctness bugs

All resolved. `sortPivotValues` (`:512`, which mutated `paths.children` in place) went with the phase 3
rewire — display sorting now builds a parallel structure, which the immutable, identity-stable
`result.paths` requires. Resolved by design rather than by a fix: `:466,469`, `:463` and `:498,455` are
cut with `extraSummaryRowFields`; the five `// TODO: Validate` sites go with the query config they
validate, which `PivotQuery` already validates at construction.

### Performance — prototype hot spots

All three went with the phase 3 rewire: `setColumns`-per-load (`:276`) is now gated on `result.paths`
identity with `equals: 'shallow'`, the `new Field()`-per-update churn (`:292`) is gone with
`PivotView`'s cell-field sync, and the unconditional `autosizeAsync()` plus hardcoded
`autosizeOptions` (`:208,258`) are replaced by `autosizeOptions.mode: 'managed'` on the app's own
`gridConfig`.

### Framework gaps worth fixing on their own

- [x] **`SumAggregator.replace` returned `0` where `aggregate` returns `null`** — fixed on its own
      branch (`9a55e035e`), with its own CHANGELOG entry, since it predates the pivot work and a plain
      tree `View` showed the same tick-vs-rebuild disagreement. A delta cannot distinguish "sums to
      zero" from "nothing left to sum", so a contributor going null now hands back to `aggregate`; a
      genuine zero sum still deltas. The unit suite's `lenientSumZeroesOut` exclusion and its
      characterization check are deleted — the previously-excluded transitions pass on their merits,
      and reverting the aggregator kills three checks.
- [x] `Store.getField` was a linear `find` over `fields` — now goes through `_fieldMap`, which the
      pivot label column's per-row `sortValue` lookup made hot.
- [ ] Consider exposing `useRawAsData` on `CubeConfig` (currently only `retainRaw`).

`GridModel.enhanceColConfigsFromStore` was filed here and is now a
[phase 3 prerequisite](#phase-3--pivotgridmodel).

### Follow-ups filed while building

**Real clicks via Chrome automation steal desktop focus** - they activate the tab, and on Hyprland that
raises the Chrome window mid-session. Screenshots and `javascript_tool` do *not*: driving the panel with
`element.click()` and reading the DOM kept `visibilityState: 'hidden'` throughout a full verification
pass. Prefer that. `react-select` is the one control that ignores synthetic mousedown - change a default
and reload instead of fighting it.

- [ ] **Audit the other `cmp/` wrappers for missing `LayoutProps` / `TestSupportProps`.** `PivotGrid`
      had neither until its first real use; the `ZoneGrid` precedent says it should have. Independent of
      pivoting.

### Framework conventions and cleanup

All done with the phase 3 rewire: copyright headers, the `[Component, factory]` pair via
`hoistCmp.withFactory`, `GridOptions` from `@xh/hoist/kit/ag-grid`, JSDoc on every public config
member, the constant `headerName` thunk, and a documented `PivotSort`.

## Session log

One entry per working session: date, what landed, where to pick up.

**2026-08-10 — Merged up to current `develop`.** Seventeen commits, again landing squarely on the
aggregation machinery. Develop split `ParentRow` out of `BaseRow` and moved aggregation eligibility
off a per-row `canAggregate` map onto per-depth field lists on the `View`, re-deriving any
`canAggregateFn` on row reuse. Cells have no depth, so `ParentRow` now reads its four field lists
through protected getters and `PivotCellRow` — which becomes a `ParentRow` — overrides them with
`PivotView`'s cell lists. That deletes our per-path shared `canAggregate` maps outright: develop
only materializes results for fields that actually declare a `canAggregateFn`. Also a silent
collision to watch for in the next merge-up: develop added `Query._rawFields` for the same reason
we had added ours, and two `private` fields of one name make `PivotQuery` structurally *not* a
`Query` — ours is now `_preAugmentFields`. Both aggregation routes survive: `applyDataUpdate` still
collects `Set<BaseRow>` and still fans out through `propagateUpdate`. Unit tier green at 49/49.
Pick up at the day-1-vs-follow-up call on [Extras](#extras-and-nice-to-haves), and re-run the
Toolbox tier before anything else — develop's row-reuse and aggregator fixes are unexercised here.

**2026-08-07 — Doc bookkeeping.** No implementation. Reconciled the checklists against the code, which
had drifted: `SumAggregator.replace` is fixed and carries its own CHANGELOG entry, the deliberately-red
record-identity check and the `Store.setFields` retention branch are both deleted, and every
carried-forward correctness bug and prototype hot spot went with the phase 3 rewire. Two sections still
*prescribed* the deleted retention branch, so
[What fields do](#what-fields-do-under-projectiononly) now says the opposite and says why. Only
`useRawAsData` survives the carried-forward findings. Phase 4's export item closes as already done —
there is no central barrel, and `cmp/pivotgrid`'s lowercase spelling is now recorded as deliberate,
since an import path is public API. Pick up at the day-1-vs-follow-up call on
[Extras](#extras-and-nice-to-haves).

**2026-08-07 — Measured, corrected, and phase 3 closed.** Full matrix in
[Result](#result--the-phase-3-matrix), captured with the heap instrument actually validated first -
`gc()` present, the same allocation reporting 21.74MB twice running and reclaiming exactly that. Worth
insisting on: before the flags, that identical allocation reported +17.9MB once and -0.21MB the next
time, so any heap number taken then would have been fiction.

**The first run of this matrix measured the grid layer wrong, and reported it as free.** The harness
built `PivotGridModel` / `GridModel` but never rendered them, and ag-Grid does not exist until a
`grid()` component mounts - so "3-9ms and ~1MB" was model construction with zero ag-Grid work in it.
The tell was there and I missed it: phase 0 had already recorded that mounting roughly doubles
Typical's tick, which a "free" grid layer flatly contradicts. Caught on review, harness fixed to mount
the grid under test, matrix re-run. Corrected numbers in [Result](#result--the-phase-3-matrix): mount
is 60-582ms and a mounted grid multiplies tick cost by 1.4-5x.

The lesson generalises past this instance, and it is the same one the 2026-08-05 benchmark taught:
**a number that contradicts a recorded finding is a bug in the measurement until proven otherwise.**

What survives the correction: `Store.setFields`' record retention and `PivotView.loadUpdatedRows`'
digest restamp both still go, but on the observation that neither ever did anything - retention
preserved 0 of 1778 records - not on the grid being cheap. The red record-identity check goes with
them. The [fixed-shape decision](#open-decision-fixed-shape-rows-vs-sparse-cells) still resolves
against templating, but on *view* heap, which the bug did not touch.

The finding worth carrying: **cells per row are nearly free, cell rows are what scale.** Tripling value
fields cost nothing; tripling pivot dimensions cost 2.6x build and 4x heap. That is the
[cost model](#cost-model) measured rather than argued, and it is the axis to attack if heap ever binds.

Three process notes. Editing either repo's source while a run is in flight triggers HMR and silently
aborts it - the first matrix run died that way. The harness records `visibleThroughout` per row,
because a hidden tab inflates figures without failing. And **grid heap is still unmeasured**: the
`+Grid` deltas come out negative on 7 of 10 configs, since sampling after the mount collects transient
garbage the post-view sample still held. Isolating it needs mounted and unmounted runs compared on
total heap, not a delta within one run.

**2026-08-06 — Merged up to current `develop`.** Eight commits, all landing on the machinery this
work sits on. One conflict in `BaseRow` and, more dangerously, one **silent** mis-merge: develop split
`computeAggregates` into an initial compute plus `recomputeComplexAggregates`, and git auto-took
develop's `view.fields` in the half it saw no conflict in. Left alone that puts every view field back
on every pivot cell row — correct values, quietly wrong cost, and nothing would have failed. Both walk
`aggFields` now, with develop's `!dependsOnChildrenOnly` gate composing with `RowCache`'s existing
`simpleAggs` short-circuit.

**One check is now deliberately red.** `RecordSet.areRecordsEqual` treats any digest difference as
inequality by design, so a bumped digest mints a new `StoreRecord` even when every declared value is
identical — and the pivot store therefore rebuilds ~every record on a structural change. Isolated by
reverting that one file, which turns the suite green. Not a correctness issue: selection and expand
state key off ids, and the tick path is untouched. Left red rather than retargeted, because adapting an
assertion to match new behavior is how a real regression gets buried. Its resolution is folded into the
re-measure, along with a wider audit of what to adopt from the parallel `Store` / `View` / `Cube` work.

**2026-08-06 — Scope split for the run-in.** No implementation. Persistence came off phase 3 after
walking the machinery: nothing on `PivotGridModel` is user state, so it needs no `persistWith` — but
column state does not survive a structural rebuild, and with the app's own `gridConfig.persistWith` set,
`PersistenceProvider`'s reaction writes that loss through to storage. Two things ride along: a manually
set pivot column order is worth persisting for a stable low-cardinality dimension, and `hideNewColumns`
would make a brand-new pivot value's columns arrive invisible.

Everything deferred is now collected under [Extras and Nice-to-Haves](#extras-and-nice-to-haves) with
the condition that would pull each one forward, and phase 4 owns the day-1-vs-follow-up call. Phase 4
also takes the Toolbox example page, as packaging rather than construction.

**Phase 3 now ends on a re-measure**, which is the gate rather than a formality: it resolves the open
fixed-shape decision and is the first heap figure the rewrite will have. Note the cost of retiring
`PivotBenchModel` lands here — `sampleHeapAsync` went with it, so heap needs tooling written before it
needs measuring. Grid-layer cost is unmeasured too; every figure so far is `PivotView` alone.

**2026-08-06 — PivotGridModel review.** Config surface revised on review: back to "summary" from
"totals", and visibility folded into placement — `rowSummary` / `pivotSummary` / `valueSummary`, each
`boolean | Side`. See the revision note under [Terminology](#terminology) for why the original
collision argument does not hold. `autosizeColumns` is gone: `autosizeOptions.mode: 'managed'`
already autosizes on every data load. Comment density cut hard across the model, per updated user
guidelines. 293 → 294 checks — the added one covers side placement and the `true` → default-side
resolution, which nothing had exercised.

**2026-08-06 — PivotDataModel retired, phase 2 closed.** The prototype engine, `PivotFieldSpec`,
`PivotValue`, the `cmp/pivotgrid` `PivotQuery`, and Toolbox's whole Pivot Bench harness are gone, along
with the recorded baseline columns on the `PivotView` benchmark — a comparison against a deleted
implementation cannot be verified, and the figures live in this document. Suite still 293/293 green;
the benchmark, Pivot Inspect and the Tests nav all still work.

Consequences to know. The [baseline table](#baseline--pivotdatamodel-as-imported) is now the *only*
record of the prototype's numbers and nothing can reproduce them. And reinstating heap measurement
means writing it from scratch: `sampleHeapAsync` went with `PivotBenchModel`.

**2026-08-06 — Phase 3 PivotGridModel rewire.** The model now takes a `PivotView`, carries no query
config, mints and owns its store, and builds the whole column hierarchy including pivot totals. 279 →
293 Toolbox checks, green, mutants killed. Most of the carried-forward cleanup went with it.

**Two bugs, and neither was found by reading the code.** `addReaction` defaults to *identity*
comparison, so the columns reaction — whose `track` returns an array — fired on every view update and
rebuilt columns per tick, discarding column state each time. Its own new check caught that on the first
run. And reviewing the reaction's tracking exposed a phase 2 defect: `syncPaths` guarded its early-out
on path keys alone, so `updateQuery` could change `valueFields` (which moves no key) or
`emptyPathLabel` (an empty segment's key is a fixed sentinel) and the view would keep publishing cell
fields and labels for a query it no longer had. Query transitions, again.

The strong assertion to keep: **with both totals on, the value columns are exactly the published
`cellFields`** — every path at every depth including the root. One set comparison pins naming,
coverage and placement, and the scenario's data carries pivot values containing the path delimiter and
escape char, so a grid reconstructing names from raw labels rather than reading `cellFields` binds
columns nothing writes to.

`PivotDataModel` and Toolbox's Pivot Bench harness are retired in the same session — the rewire forced
the question by changing the constructor `PivotBenchModel` drove. Phase 2 is closed. Pick up at
persistence.

**2026-08-06 — Phase 3 store plumbing.** The first four checklist items landed: the
`enhanceColConfigsFromStore` fix, `Store.setFields`, `PivotView.createStore` / `disconnectStore`, and
the pre-`loadStores` cell-field sync. 262 → 279 Toolbox checks, green, and every one of five mutants
killed by the check written for it — including the ordering claim this whole design rests on (syncing
*after* `loadStores` kills 16 checks, and not only in the new scenario: it also wipes the app-declared
stores of the pre-existing ones, because `setFields` on a non-projection store drops the records the
base class just loaded).

Two things worth knowing next time. **A `View` subclass cannot use field initializers** for state its
overrides touch — `super()` runs `fullUpdate` first, so the initializer wipes it. `PivotView` already
documented this for its cell state; the new `WeakMap` had to follow. And **the new scenario's own guard
caught the harness, not the framework**: the first run failed `disconnectStore: stops further loads`
with "the tick was a no-op", because the mixed measures are a pure function of a generation counter and
`tickAsync` hardcoded generation 1, so a second tick within one scenario moved nothing. That is the
anti-vacuity rule paying for itself — a control leg that asserts the tick was real.

Left for the next session: the `PivotGridModel` rewire onward. The
[open fixed-shape decision](#open-decision-fixed-shape-rows-vs-sparse-cells) is untouched and still
wants a build measurement on a quiet machine.

**2026-08-06 — Phase 3 decisions settled, no implementation.** The whole grid integration contract is
now in [Grid integration design](#grid-integration-design). The load-bearing find is an ordering fact:
`View.fullUpdate` assigns `result` _after_ `loadStores`, so a reaction on `result` can never declare
the store's cell fields in time, and under `projectionOnly` that builds records against the wrong
declared-field set rather than just rendering late. That is why `PivotView` has to sync fields itself
instead of the grid model reacting — and why a `pivotGridModels` registry on the view, which diagnoses
the same problem, is still the wrong fix: it inverts the `data/cube` → `cmp/` layering.

Ownership settled around it: app owns `Cube` and `PivotView`, `PivotGridModel` takes a view and mints
its own store via `PivotView.createStore()`, and **all query config leaves the grid model**. Two
lifecycle traps turned out to be pre-solved — `GridModel` only `markManaged`s a store it constructs
itself, and `View` already models caller-owned registration.

Four feature decisions: both `extraSummary*Fields` configs cut (pinned rows are the app-side answer for
the rows, and the grid layer could not rebuild them anyway since `loadStores` full-replaces; the
columns are a config over data that is already there, so reinstating is cheap), pivot totals ship
default-off with configs separate from row totals, `Store.setFields` replaces all and retains records
only under `projectionOnly`, and the package stays at `cmp/pivotgrid` on the `cmp/zoneGrid` precedent.

Two corrections to this document. A prior note claimed declared fields take part in the record-reuse
equality check — they do not; `getReusableRecord` compares id, digest and tree path. And
`projectionOnly` silently changes unpopulated cells from `null` to `undefined`, which the correctness
suite structurally cannot catch, so it is now recorded against the
[open fixed-shape decision](#open-decision-fixed-shape-rows-vs-sparse-cells).

Pick up at the phase 3 [checklist](#phase-3--pivotgridmodel), whose first item is the
`enhanceColConfigsFromStore` prerequisite.

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

**2026-08-06 — On `develop`, cells proven Store-loadable, phase 2 closed.** The Store rework merged
(squashed as `d61321545`), so both branches are rebased onto `develop` and renamed `pivot-grid`, with
the pre-rework history kept as `pivot-grid-pre-store-simple`. Review had changed `RowCache` after the
`store-simple` tip, which needed one real fix: `endGeneration()` now closes from `fullUpdate` rather
than inside `generateRows`, because a subclass generating further rows in its override otherwise leaves
them uncounted — on Typical+Drill that put 123,128 cached rows against a live count of 72,211, tripping
the sweep on every build.

**Cells now provably load into a `Store`** — the claim the whole cells-on-row-data decision rests on,
and it had no coverage: the store scenarios declared only `valueFields`, so they proved row totals load
and nothing else. 211 → 262 checks, covering every cell through a declared field, unpopulated cells
reading `null` in both of `Store`'s record representations, and a new pivot value minting fields that
get re-declared and reloaded. Added Admin › Tests › **Pivot Inspect** for reading the whole pipeline by
eye; see [How to measure](#how-to-measure).

Two retractions, both mine. **The digest restamp added during the rebase is dead code** and the
rationale recorded for it was wrong — `applyDataUpdate` pushes an update per aggregatable field without
testing whether the value moved, so every ancestor is always stamped already; kept as insurance with a
corrected comment. And **no build regression has ever been established**: the sweep hypothesis died
under instrumentation (`willSweep=false` every generation), and Typical+Drill has since measured 275 to
341 across six runs against a 290ms gate, which is too noisy to call. Do not ascribe a cost to row
shape until that is measured on a quiet machine. Pick up at phase 3.

**2026-08-05 — Phase 2 coverage closed and verified.** Every actionable phase 2 item is done; only
retiring `PivotDataModel` remains, and it is blocked on phase 3. Unit tier 28 → 49 checks, Toolbox tier
99 → **262**, both green, both mutation-tested for real (19/23 aggregator mutants, 4/4 lattice mutants,
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
