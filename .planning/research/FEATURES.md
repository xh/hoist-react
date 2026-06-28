# Feature Research

**Domain:** In-browser analytical / grid data layer for data-dense financial dashboards (hedge-fund / fund-admin SPAs)
**Researched:** 2026-06-27
**Confidence:** HIGH on AG Grid 36 feature surface (verified against blog + Context7-indexed live docs); MEDIUM on Excel competitive framing and dependency-chain edge cases (some AG Grid doc pages 403 to WebFetch; relied on Context7 + blog cross-checks)

> **Scope note.** This file maps the *expected user-facing capability surface* for a 2026 financial data layer, centered on the two things the brief (KICKOFF §4) calls out: the **calculated-columns taxonomy** (§4.1) and **dynamic / soft-defined schema** (§4.2). It frames each against what **AG Grid 36** (shipped 2026-06-24) actually ships, and against the **Excel** competitive bar. It does NOT re-describe the existing Hoist Store/Cube/View/GridModel layer (that is Phase 1 inventory). Per the brief, dynamic schema is treated as a **weighted factor, not a hard gate**.

---

## The Calculated-Columns Taxonomy (the spec's center of gravity)

"Calculated columns" is an umbrella that conflates three genuinely distinct capabilities. The spec must keep them separate because they differ in *where* they compute, *how* they interact with grouping, *whether* they survive incremental updates cheaply, and *what* they cost in memory. The table below is the canonical inventory; the prose after it adds the dimensions the downstream spec needs.

| # | Flavor | Plain definition | Computes at | Memory model | AG Grid 36 equivalent |
|---|--------|------------------|-------------|--------------|-----------------------|
| **CC-1** | **Simple per-row derived column** | `C = A + B` evaluated per leaf row | Row (leaf) level | Lazy-computable (value getter) OR materialized | **Calculated columns** + **Formulas** + classic `valueGetter` |
| **CC-2** | **Runtime aggregation variant of an existing field** | Same source field, user picks the agg rule at runtime (sum / avg / **weighted-avg-by-another-field**) instead of it being a pre-coded field | Aggregate (group) level | New aggregate rows are genuinely new data | **Aggregation editing** (35.2) for the picker UX + **`aggFunc`** + **"show values as"** (36) for ratio-of-total variants |
| **CC-3** | **Dependency chain** | A calc column derived from *another* calc column; references form a graph that must be ordered and cycle-checked | Wherever its inputs live (row or aggregate) | Inherits inputs' model; ordering/recompute cost dominates | **Formulas** chain via cell refs; **calculated columns** referencing calc columns is **unverified** (see below) |

### CC-1 - Simple per-row derived column (`C = A + B`)

The canonical case and the one users actually picture when they say "calculated column." The decision-relevant axes:

- **Where computed:** leaf-row level. One value per source row.
- **Grouping interaction:** the derived column itself needs an aggregator to show a meaningful group/total value. A per-row ratio (e.g. `pnl / notional`) summed up the tree is **wrong** - this is exactly the weighted-average trap (see CC-2). The spec must require that a CC-1 column declares how it rolls up, not assume "sum."
- **Incremental update survival:** cheap if the derivation is a pure function of its row's inputs - recompute only the touched rows. This is the well-behaved flavor under the §3.3 real-time batch (recompute only the ~500 changed rows' derived values).
- **Lazy vs materialized:** can be **lazy** (compute on read, à la a value getter - zero added heap, CPU on every render/scroll) or **materialized** (store the result on the record - added heap, but cached). For the memory-multiplication concern (PROJECT §2.7), lazy is the safer default; materialize only when profiling says recompute is the bottleneck. This lazy/materialized switch is itself a spec parameter.

### CC-2 - Runtime aggregation variant (the *actual* high-value ask)

Today the cube needs a **separately pre-coded field per aggregation rule**: "balance (sum)" and "balance (avg)" are two hand-authored fields, always both present, and *everyone* sees the union of all variants (PROJECT §2.2, KICKOFF §4.1). The real ask is to **move the choice of aggregation to runtime, in the user's hands**, against a single source field - so a user can add "weighted-average balance by notional" without an app change and without polluting the field list for everyone else.

This is distinct from CC-1: nothing new is computed per *row*; something new is computed per *group*. Decision-relevant axes:

- **Where computed:** aggregate (group) level. Produces genuinely new group rows that cannot be references (PROJECT §2.7 already flags aggregate rows as new data).
- **Weighted average is the sharp edge:** weighted-avg-by-another-field is NOT decomposable as a simple per-group reduce of a single column - it needs *two* columns (value and weight) carried to the group level, then `sum(value*weight)/sum(weight)`. This is precisely where **Excel pivot calculated fields fall down** (they can't express `SUMPRODUCT`/`SUM` correctly inside a pivot; users resort to helper columns or Power Pivot DAX measures). A data layer that does weighted aggregation *correctly and natively* beats the Excel pivot experience outright - a genuine differentiator, not just parity. (MEDIUM confidence on the Excel limitation; corroborated across multiple Excel-help sources.)
- **Grouping interaction:** must recompute correctly at every level of a multi-level grouping, and at the grand-total / root. "show values as" (% of parent/group/grand total) is a *second axis* layered on top of this.
- **Incremental update survival:** this is the cube's existing strength (efficient incremental re-aggregation, PROJECT validated requirements). The new work is making the *set of active aggregations* dynamic rather than fixed-at-config-time, without losing incremental re-agg.
- **Memory:** each active aggregation variant is a column of group-level values. Bounded by group count, not leaf count - cheaper than CC-1 materialization at the leaf level, but unbounded if users add many variants.

### CC-3 - Dependency chains (calc-on-calc)

A calc column whose formula references another calc column. Requires a **dependency graph**, **topological ordering** of recompute, and **cycle detection/prevention**. Decision-relevant axes:

- **Where computed:** wherever the inputs live. A CC-3 over two CC-1 columns is leaf-level; a CC-3 referencing a CC-2 aggregate is group-level. Mixed-level references (a leaf calc that reads a group aggregate) are the genuinely hard case and a likely source of subtle bugs - the spec should decide explicitly whether to allow them.
- **Incremental update survival:** the graph determines blast radius. A touched input must invalidate exactly its transitive dependents, no more. Getting this wrong means either stale values or full recompute (defeats the cube's incremental design).
- **Cycle prevention:** mandatory. Adding an edge that closes a cycle must be rejected at definition time, not discovered at compute time.
- **Memory:** same lazy-vs-materialized question as CC-1, multiplied across the chain. Deep chains argue for materializing intermediate nodes to avoid re-deriving them on every dependent read.

**This is the flavor most likely to be a differentiator AND the one most likely to break things.** It is the right place to flag for deeper phase-specific research.

---

## AG Grid 36 Feature Cluster - Parity Map (competitive bar + spec input)

Verified against the [AG Grid 36 announcement](https://blog.ag-grid.com/whats-new-in-ag-grid-36/) and Context7-indexed live AG Grid docs (2026-06-27). AG Grid 36.0 shipped **2026-06-24**.

| AG Grid feature | Version | What it does | Maps to taxonomy | Licensing | Confidence |
|-----------------|---------|--------------|------------------|-----------|------------|
| **Calculated columns** | 36.0 | End users create new columns on demand via built-in UI using formulas with functions, operators, and **references to other columns**, without touching the data source. New columns behave like any column (filter, group, sort). Developers can also pre-configure. | **CC-1** (primary); partial **CC-3** | Enterprise (see note) | HIGH |
| **Formulas** | 35.1 (editor), matured 36 | Spreadsheet-style per-*cell* expressions: `allowFormula: true` + `formulaDataSource`. Syntax `=REF(COLUMN("price"),ROW(1))*REF(COLUMN("qty"),ROW(1))`, functions `SUM`/`AVERAGE`/`CONCAT`, recalculate on referenced-data change. Formula editor with tokenizing, range highlight, autocomplete, `validateFormulas`. | **CC-1** at cell granularity; **CC-3** via cell refs | **Enterprise** (`FormulaModule` imported from `ag-grid-enterprise`) | HIGH |
| **"Show values as"** | 36.0 | Display a value as % of (or difference from) **column total, row total, grand total, or parent-group total** without altering data. **Client-Side Row Model only.** | A *ratio* axis layered on **CC-2** | Enterprise (aggregation/pivot family) | HIGH |
| **Aggregation editing** | 35.2 | Edit an aggregated/group value directly; the change propagates down to leaf rows per the agg function (customizable via `groupRowValueSetter`). Enabled via `groupRowEditable: true`. | UX precedent for **CC-2** picker; also a *write-back* feature | Enterprise (grouping/agg family) | HIGH |
| **Automatic column generation** | 36.0 | Grid infers columns by scanning `rowData` for the **first non-null row** and creating a column per key. For dynamic/unknown data shapes. | **Dynamic schema** (§4.2) - partial | Community-capable (basic) | HIGH |

**Licensing caveat (KICKOFF §12 Q4):** AG Grid's advanced analytics family - pivoting, set filters, the Formula/`FormulaModule`, and by strong inference calculated columns and "show values as" - sits in **Enterprise**. Context7 confirms `FormulaModule` and pivot modules import from `ag-grid-enterprise`. Whether each specific 36 feature is inside XH's *current* Enterprise entitlement across clients (notably the lead client) is an **open licensing question to confirm before depending on any of them** - do not assume the entitlement covers them. (HIGH confidence formulas/pivot are Enterprise; MEDIUM that calculated columns specifically is Enterprise - the announcement does not tag tiers and the docs page 403'd to direct fetch.)

### Key parity gaps and tensions (the strategic crux)

1. **AG Grid computes inside its own model, bypassing the Store.** Calculated columns, formulas, and "show values as" all operate on AG Grid's internal data structure. Naively enabling them routes calculation *around* the shared Store substrate that charts, toolbars, and non-grid consumers depend on (PROJECT §2.5, KICKOFF §3.1). **This is the central architectural tension** - parity on the *feature* would cost parity on the *shared-data contract*. The spec must state which calc flavors must live in the data layer (so all consumers see them) vs. which may safely be grid-only presentation.

2. **AG Grid's calc-on-calc (CC-3) depth is unverified.** The announcement says calculated columns can "reference other columns" but does NOT confirm referencing *other calculated columns*, nor describe cycle handling. Formulas chain via cell refs (so CC-3-at-cell-level exists), but column-level multi-level derivation with a managed dependency graph is **not documented as of this research**. Flag as an open item; do not assume AG Grid solves CC-3 for us. (MEDIUM-LOW confidence on the negative - "not found" is not "not possible.")

3. **"Show values as" is CSRM-only.** It does not work with Server-Side Row Model. For the largest datasets where SSRM/backend aggregation is on the table (KICKOFF §6), this AG Grid feature is unavailable - a point in favor of owning CC-2 ourselves.

4. **Aggregation editing is write-back, not just choose-the-agg.** It propagates edits *down* to leaves. That is a different (and riskier) capability than CC-2's "let the user pick sum vs. weighted-avg." Useful precedent for the picker UX, but the write-back semantics are likely an **anti-feature** for read-oriented financial aggregates (see below).

---

## Feature Landscape

### Table Stakes (a 2026 financial data layer is incomplete without these)

Missing any of these and we lose to Excel and/or to "just turn on AG Grid."

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **CC-1: simple per-row derived columns** | Core Excel expectation; AG Grid 36 now ships it in-UI; long-standing Hoist user request (KICKOFF §3.1) | MEDIUM | Must roll up correctly under grouping (declare aggregator, don't assume sum). Lazy-by-default to protect heap. |
| **CC-2: runtime user-chosen aggregation (sum/avg) on existing fields** | Removes the "pre-code every variant, everyone sees the union" pain (PROJECT §2.2); Excel pivot value-field settings do this | MEDIUM | Builds on the cube's existing incremental re-agg. The *runtime/dynamic* part is the new work, not the agg math. |
| **Correct multi-level grouped aggregation + grand totals** | Pivot-table baseline; financial users live in grouped views | LOW (exists) | Cube already does this; CC-2 must preserve it. |
| **"Show values as" / % of total (group, parent, grand)** | Standard pivot analytics; AG Grid 36 ships it; Excel pivots have "Show Values As" | MEDIUM | A ratio axis on top of CC-2. Owning it ourselves dodges AG Grid's CSRM-only limit. |
| **Derived columns survive incremental real-time updates** | The §3.3 batch cadence (~500 updates x ~20 fields, sub-second) is the project's reason to exist | HIGH | Pure-function CC-1 = recompute touched rows only. The harness must measure this. |
| **Derived/calc columns are filterable, sortable, groupable like real fields** | "It behaves like a column" is the AG Grid 36 promise and the user expectation | MEDIUM | In Hoist's model this means the derived value must reach the Store, not just the grid view. |
| **Number/currency/percentage formatting + renderers on derived columns** | Financial data is unreadable raw; non-negotiable for the audience | LOW | Hoist already has this; ensure derived/dynamic fields can carry it. |

### Differentiators (where Data 2.0 can beat both Excel and stock AG Grid)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **CC-2: native weighted-average-by-another-field** | Excel pivots **cannot** do this correctly (no SUMPRODUCT in calculated fields; forces helper columns / DAX). Doing it natively and at runtime is a clean win over the incumbent. | MEDIUM-HIGH | Needs value+weight carried to group level; the canonical "ratio that can't just be summed" case. |
| **Calc columns that live in the shared data layer, not just the grid** | Charts, toolbars, and other widgets see the same derived/aggregated values - the thing stock AG Grid calculated columns canNOT give you because they compute inside the grid (PROJECT §2.5) | HIGH | This *is* Hoist's core value proposition applied to calc columns. The strategic differentiator. |
| **CC-3: dependency chains with managed graph + cycle prevention** | Calc-on-calc with correct, minimal incremental recompute - AG Grid's column-level support here is unverified/absent | HIGH | High value, high risk. Flag for deep phase research. |
| **Sub-second recompute-and-render of derived + aggregated values under live batches** | Directly answers the lead client's "why isn't this real-time?" (KICKOFF §3.3) | HIGH | Differentiator only if the harness proves it. Verifiability over opinion (PROJECT core value). |
| **Lazy vs. materialized calc columns as an explicit, tunable choice** | Lets apps trade CPU for memory deliberately - addresses the memory-multiplication concern head-on | MEDIUM | A spec/architecture knob; rare in off-the-shelf grids. |

### Dynamic / Soft-Defined Schema - the 20% case (FACTOR, NOT GATE)

> **Framing per brief (KICKOFF §4.2, PROJECT constraints):** This is the **20% case, not the 80%**, and it is a **weighted factor, not a hard constraint**. Flag any candidate path that would *preclude* it or make it materially harder, and weigh that - but do NOT let it eliminate every otherwise-strong option. If the requirement set becomes self-contradictory (e.g. dynamic schema kills every fast engine), **surface the conflict explicitly** rather than over-tailoring the spec into a corner (KICKOFF §11). A solution that handles this poorly may still be acceptable.

Distinct from calculated columns: this is about **non-derived** fields. An upstream API starts publishing a new field, and an **entitled admin** defines it (type, display name, aggregation rule, renderer) so it appears in grids - **without recompiling or redeploying the UI app**. XH has shipped versions of this in a couple of apps already.

| Aspect | Expectation | Complexity | Notes |
|--------|-------------|------------|-------|
| Add a **non-derived** field at runtime (type, display name, agg rule, renderer) via UI or external API | No redeploy; entitled-admin gated | HIGH | Disfavors any engine requiring a fixed set of fields **compiled in**. |
| AG Grid **automatic column generation** as a partial enabler | Grid infers columns from data keys (first non-null row) | LOW (AG Grid side) | Solves *display* of unknown columns, NOT typing, agg rules, renderers, or entitlement - so it is only a fragment of the ask. |
| Schema definitions are **data, not code** | Field metadata sourced from config/API, persisted, versioned | HIGH | The real architectural weight is here, not in the grid. |
| Renderers/formatters selectable from a **registry** by config | Admin picks a renderer by name without writing one | MEDIUM | Needs a named-renderer registry the dynamic schema can reference. |

**The factor to weigh against each engine candidate (KICKOFF §8.2 rubric):** does its data model assume a fixed, compile-time-known column set? Strongly-typed columnar engines (Arrow, DuckDB-WASM) and schema-first stores may make runtime field addition awkward; flag and weigh, don't eliminate.

### Anti-Features (deliberately do NOT build / do NOT enable naively)

| Anti-Feature | Why Requested | Why Problematic | Instead |
|--------------|---------------|-----------------|---------|
| **Route calc columns through AG Grid's internal model (just "turn it on")** | AG Grid 36 ships it; clients will ask | Bypasses the shared Store; charts/toolbars/other widgets go blind to the derived values; forks the source of truth (PROJECT §2.5, KICKOFF §3.1) | Compute in the data layer; let the grid render. Use AG Grid as a *renderer* of our calc columns, not the *owner*. |
| **Full spreadsheet formula language (arbitrary cell refs, A1:B7 ranges, 100+ functions)** | "Make it like Excel"; AG Grid Formulas does cell-level `=REF(...)` | Cell-level formulas fight a row-record + MobX model; enormous surface; cycle/recompute complexity explodes; most needs are column-level | Column-level expression language scoped to field references + a curated function set. CC-1/CC-2/CC-3 cover the real needs. |
| **Aggregation *editing* / write-back (edit a total, push down to leaves)** | AG Grid 35.2 ships it; looks powerful | For read-oriented financial aggregates, editing a computed total and back-propagating to leaves is semantically fraught and audit-hostile; the cube is explicitly *not* for editable data (PROJECT §2.2) | Borrow only the picker UX. Keep aggregates read-only. |
| **Unbounded user-created calc columns with eager materialization** | Easy to expose; feels generous | Each materialized calc column multiplies leaf-level heap - the exact memory-multiplication risk the project is fighting (PROJECT §2.7) | Lazy by default; materialize on profiled need; bound/quota user-created columns. |
| **Mixed-level references with no rules (leaf calc reading a group aggregate freely)** | Powerful-seeming CC-3 generality | Ambiguous semantics, subtle bugs, recompute graph hazards | Define allowed reference directions explicitly in the spec; reject the rest at definition time. |
| **HFT-grade per-tick latency** | the lead client pressure for "real-time" | Out of scope per PROJECT; chasing microseconds distorts the whole design | Live-trading-*screen* cadence: coalesced batches, sub-second render (KICKOFF §3.3). |

---

## Feature Dependencies

```
Dynamic / soft-defined schema (non-derived fields at runtime)   [FACTOR, not gate]
    └──enables──> Calc columns referencing runtime-added fields

CC-1 (per-row derived)
    └──requires──> Derived value reaches the shared Store (not grid-only)
                       └──requires──> Field/column metadata can carry an aggregator + renderer

CC-2 (runtime user-chosen aggregation)
    └──requires──> Cube incremental re-aggregation (EXISTS today)
    └──requires──> Runtime-mutable set of active aggregations (NEW)
    └──enables───> "Show values as" / % of total  (ratio axis on top of CC-2)

CC-3 (dependency chains)
    └──requires──> CC-1 and/or CC-2 as referenceable inputs
    └──requires──> Dependency graph + topological recompute + cycle prevention
    └──requires──> Lazy/materialized evaluation policy (deep chains argue for materialization)

Real-time batch survival (sub-second recompute+render)
    └──enhances──> ALL of CC-1/CC-2/CC-3 (and is meaningless without the harness to prove it)

Shared-Store-resident calc columns  ──conflicts with──  AG Grid-internal calc columns
    (the central strategic tension: feature parity vs. shared-data-contract parity)
```

### Dependency Notes

- **CC-2 builds on the cube's existing incremental re-aggregation** - the agg math is solved; the *runtime-dynamic selection* of which aggregations are active is the new work.
- **"Show values as" sits on CC-2** - it is a presentation/ratio layer, not a new aggregation; do not build it before CC-2 exists.
- **CC-3 requires CC-1/CC-2 first** - there is nothing to chain until the base flavors exist; it also pulls in the lazy/materialized policy as a hard prerequisite for sane memory/CPU.
- **Dynamic schema enables but does not gate calc columns** - calc columns over a *static* compiled schema are fully viable; dynamic schema just widens what they can reference. Keep them decoupled so dynamic schema's difficulty never blocks the calc-column roadmap.
- **Shared-Store-resident calc vs. AG-Grid-internal calc is a true conflict** - the roadmap must pick a side per flavor; they cannot both be the source of truth for the same column.

---

## MVP Definition (feature-spec sequencing for the calc-columns + dynamic-schema spec)

### Specify / Build First (v1) - the table-stakes core

- [ ] **CC-1 simple per-row derived columns**, computed in the data layer, reaching the shared Store, with a declared roll-up aggregator and lazy-by-default evaluation - the canonical case and the AG Grid 36 competitive trigger.
- [ ] **CC-2 runtime user-chosen aggregation (sum, avg) on existing fields** - directly retires the "pre-code every variant, everyone sees the union" pain.
- [ ] **Correct grouped/grand-total behavior preserved** for all of the above (the cube already does this; the spec must not regress it).

### Add After Validation (v1.x) - the high-value differentiators

- [ ] **CC-2 weighted-average-by-another-field** - the clean win over Excel pivots; needs value+weight at group level.
- [ ] **"Show values as" / % of total** (group, parent, grand) as a ratio axis on CC-2 - owned by us to dodge AG Grid's CSRM-only limit.
- [ ] **Renderer/formatter registry** so derived (and later dynamic) fields can carry presentation by config.

### Future Consideration (v2+) - high value, high risk, flag for deep research

- [ ] **CC-3 dependency chains** with managed graph, topological incremental recompute, and cycle prevention - the differentiator most likely to break things.
- [ ] **Dynamic / soft-defined schema** for non-derived fields (the 20% case, weighted factor) - large architectural weight lives in "schema as data," not in the grid; AG Grid auto-column-generation only solves display.
- [ ] **Lazy/materialized as an exposed, per-column tunable** - once profiling under the harness justifies the knob.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| CC-1 simple per-row derived (data-layer-resident) | HIGH | MEDIUM | P1 |
| CC-2 runtime sum/avg selection | HIGH | MEDIUM | P1 |
| Preserve correct grouped/grand totals | HIGH | LOW (exists) | P1 |
| CC-2 weighted-avg-by-another-field | HIGH | MEDIUM-HIGH | P2 |
| "Show values as" / % of total | MEDIUM | MEDIUM | P2 |
| Renderer/formatter registry for derived fields | MEDIUM | MEDIUM | P2 |
| Real-time batch survival of derived values | HIGH | HIGH | P2 (gated by harness) |
| CC-3 dependency chains + cycle prevention | MEDIUM-HIGH | HIGH | P3 |
| Dynamic / soft-defined schema (non-derived, runtime) | MEDIUM (20% case) | HIGH | P3 (factor, not gate) |
| Lazy/materialized tunable per column | MEDIUM | MEDIUM | P3 |

**Priority key:** P1 = table-stakes core, spec first · P2 = differentiator, add after core validates · P3 = high-value/high-risk or 20%-case, defer + flag for deep research.

## Competitor Feature Analysis

| Feature | Excel (pivot / Power Pivot) | AG Grid 36 (stock) | Our target approach |
|---------|-----------------------------|--------------------|--------------------|
| CC-1 per-row derived | Calculated columns / helper columns | Calculated columns + Formulas (Enterprise) - computed in grid model | Compute in the **shared data layer**, render via grid - so all consumers see it |
| CC-2 runtime agg selection | PivotTable value-field settings (sum/avg/etc.) | `aggFunc` + aggregation editing (35.2) | Runtime-mutable active aggregations on the cube, no pre-coded field-per-variant |
| Weighted average in pivot | **Cannot** in calc fields; needs helper col or DAX measure | `aggFunc` custom function (developer-coded) | **Native, runtime, user-selectable** - the clean win |
| % of total | "Show Values As" | "Show values as" (36, **CSRM only**) | Owned ratio layer on CC-2, not row-model-limited |
| Calc-on-calc (CC-3) | Yes (cells reference cells) | Formulas chain via cell refs; column-level calc-on-calc **unverified** | Managed dependency graph + cycle prevention as a differentiator |
| Dynamic schema (non-derived, runtime) | Refresh/add to source | Automatic column generation (display only) | Schema-as-data + entitled-admin definition (the 20% factor) |
| Shared data across charts/toolbars/grid | N/A (Excel is the grid) | No - calc lives in the grid | **Yes - this is the core Hoist differentiator** |

---

## Open Items / Verification Gaps (hand to Phase 3 + 4)

- **AG Grid calculated-columns CC-3 depth:** can a calculated column reference *another calculated column* at the column level, and how are cycles handled? Not confirmed in the announcement or accessible docs (the calculated-columns doc page 403'd to direct fetch). Verify with a spike or authenticated docs access. (MEDIUM-LOW)
- **AG Grid Enterprise licensing per feature per client:** Formulas/pivot are Enterprise (confirmed via `FormulaModule`/`PivotModule` imports from `ag-grid-enterprise`); calculated columns and "show values as" tier tags not explicitly stated. Confirm XH per-client entitlement before depending on any. (KICKOFF §12 Q4)
- **Excel pivot weighted-average limitation:** corroborated across multiple Excel-help sources but not an authoritative Microsoft doc; treat as MEDIUM. The *direction* (Excel pivots struggle with weighted avg) is reliable enough to anchor the differentiator claim.
- **Mixed-level references in CC-3** (leaf calc reading group aggregate): a semantics decision the spec must make; no off-the-shelf precedent found.

## Sources

- [What's New in AG Grid 36](https://blog.ag-grid.com/whats-new-in-ag-grid-36/) - HIGH (official announcement; calculated columns, show values as, automatic column generation)
- [What's New in AG Grid 35.2](https://blog.ag-grid.com/whats-new-in-ag-grid-35-2/) - HIGH (aggregation editing)
- [What's New in AG Grid 35](https://blog.ag-grid.com/whats-new-in-ag-grid-35/) - HIGH (formula editor lineage)
- AG Grid live docs via Context7 (`/websites/ag-grid_javascript-data-grid`, 2026-06-27) - HIGH (Formulas `allowFormula`/`formulaDataSource`/`=REF(COLUMN...)` syntax; `FormulaModule`/`PivotModule` Enterprise imports; "show values as" % modes; automatic column generation first-non-null-row inference; aggregation editing `groupRowEditable`/`groupRowValueSetter`)
- [AG Grid Formulas](https://www.ag-grid.com/react-data-grid/formulas/) and [Aggregation](https://www.ag-grid.com/javascript-data-grid/aggregation/) - HIGH (feature confirmation; direct WebFetch 403'd, content cross-verified via Context7 + search snippets)
- [AG Grid Community vs Enterprise](https://www.ag-grid.com/javascript-data-grid/community-vs-enterprise/) - MEDIUM (tier framing)
- Excel weighted-average-in-pivot limitation: [ExcelDemy](https://www.exceldemy.com/weighted-average-excel-pivot-table/), [Statology](https://www.statology.org/excel-pivot-table-weighted-average/), [Data Cornering](https://datacornering.com/calculate-weighted-average-in-excel-pivottable-in-2-ways/) - MEDIUM (multiple corroborating sources; not authoritative MS doc)
- KICKOFF-PROMPT.md §3.1, §4.1, §4.2, §8.2, §11, §12 and PROJECT.md §2.2/§2.5/§2.7 - project-supplied context

---
*Feature research for: in-browser analytical/grid data layer for financial dashboards*
*Researched: 2026-06-27*
