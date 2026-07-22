# Column Chooser — Unified Filter/Find & Multi-Grid Find Field

**Status:** Design/research. Captures the agreed direction for the desktop ColChooser's single
filter control, and the deferred follow-up to generalize `GridFindField` across multiple grids.
The first implementation covers **filter mode only** (see the companion implementation plan). This
doc records the overall model plus the multi-grid find-field research so the follow-up can proceed
without re-deriving it.

Related: `locked-group-dnd-spec.md` (drop resolution engine this feature must keep working).

---

## 1. Problem

The ColChooser presents up to four grids: three bucket grids (pinned-left / unpinned / pinned-right,
each a `GridModel`) and an optional Column Library grid. Today there are **two** separate controls in
**two** toolbars:

- **Library `tbar`** — a `storeFilterField` bound to the library grid. True filter (hides
  non-matching rows).
- **Chooser toolbar** — a `gridFindField` bound to **only** the unpinned bucket grid. Selects /
  navigates matches; never hides. Left/right pinned buckets are not searched at all.

Two toolbars, two controls, two match implementations, and inconsistent behavior. The goal: **one
toolbar spanning both sections, one filter control** driving consistent behavior across all present
grids, so a user can find a column whether it is hidden or visible and whether or not the library is
open — then act on it (show/hide/move) without first clearing the query.

---

## 2. Two modes

A single control, with a user-flippable **mode** (icon-only toggle, persisted so it roams across
choosers via `ColChooserOptionsModel` like `showGroups`/`showLibrary`):

- **Filter mode** — narrows every grid to matching rows (+ ancestor groups). Best for large,
  heavily-hidden libraries (>150 columns) where scanning highlights is impractical and horizontal
  scrolling is avoided. Complication: drag-and-drop over a filtered grid (see §5).
- **Find/highlight mode** — never hides; highlights matches in place and scrolls/navigates to them.
  Keeps full drag-and-drop context intact. Best when the user wants to reposition a found column
  relative to its neighbors.

The mode applies **consistently to both sections** (library and buckets). Because we own filter
application, switching a section between "filter" and "highlight" is just a choice of **where the
same match predicate is used**: as a Store filter (hide) vs. in a `rowClassRules` highlight class.

**Decision:** implement **filter mode first**. Find/highlight (and the mode toggle) follow once the
plumbing — single control, shared match predicate, filter-aware DnD — is in place.

---

## 3. One match predicate via `StoreFilterField` (controlled mode)

`StoreFilterField` already builds a field-based, `matchMode`-aware `FilterTestFn` and supports a
**controlled mode**: `autoApply: false` + `onFilterChange(testFn)` hands us the generated predicate
without touching any store. We then apply that one predicate to every grid store ourselves.

Key API facts (verified in source):

- `onFilterChange?: (filter: FilterTestFn) => any` — receives the test fn (or `null` when empty).
  **Not buffered** — fires on each keystroke.
- With no `store`/`gridModel` bound, `getActiveFields()` returns `includeFields` verbatim, and the
  generated `valGetters` read `rec.data[fieldName]` — so the predicate works against **any** store
  that carries those fields. Bucket stores and the library store share `name` + `description`;
  `chooserGroup` exists only on library records (harmlessly absent elsewhere).
- Controlled mode still requires either a `store` or a `bind`. Use `bind: 'filterText'` + a
  `@bindable filterText` on the ColChooserModel to hold the raw text with no store binding.
- Respect `filterMatchMode` from `ColChooserConfig` via the `matchMode` prop.

This gives a single predicate applied uniformly — no duplicated regex/field logic, and it leaves the
door open to highlight mode (same predicate, different application site).

---

## 4. `showHidden` is routing, not a filter

Critical distinction that shapes the DnD work:

- **`showHidden` (existing)** is implemented by **excluding** hidden columns from `buildData`/
  `loadData` — they are absent from the bucket store entirely (neither `records` nor `allRecords`).
  It is not a Store filter. `showHidden: false` only ever coincides with the library being shown, and
  in that state hidden columns are **relocated to the library grid** — they are owned by a different
  store, not merely hidden. So `showHidden` is a **routing** decision (bucket vs. library), and its
  exclude-from-load mechanism is correct. It should **not** become a Store filter.

- **The query filter (new)** is a genuine display filter: rows stay owned by the same grid, just
  hidden from ag-Grid. Hoist filters work by changing which records ag-Grid sees, not by an ag-Grid
  filter: `Store.records` = filtered (`_filtered.list`), `Store.allRecords` = everything
  (`_current.list`). So the query filter → `store.setFilter(testFn)`.

These two different mechanisms **converge on one displayed-truth: `store.records` per bucket**:

- `showHidden`-excluded rows → never loaded → not in `records`. ✓
- query-filtered rows → in `allRecords`, absent from `records`. ✓

So the drop engine's `showHidden: boolean` should be generalized to a **displayed predicate** derived
from `store.records`. This folds both concepts into the engine at one boundary without changing
`showHidden`'s own implementation. The engine still receives full `master` (`currentState`, always
every column regardless of routing/filter), so moves preserve hidden/filtered columns' positions.

---

## 5. Filter-aware drag-and-drop

Filtering a bucket is structurally the **same** problem the engine already solves for hidden columns:
resolve the drop against *rendered* rows, then splice into full master (carrying non-rendered columns
along at their existing positions). See `locked-group-dnd-spec.md` §5A.

Required changes:

1. **Engine (`colChooserDropEngine.ts`)** — replace `showHidden: boolean` with
   `isDisplayed: (colId) => boolean` in `ResolveDropInput` and thread it through `isRendered`
   (in `viewInsertionIndex`), `groupRenderedInBucket`, `renderedAncestor`, and the exported
   `isNoOpDrop`. Update `colChooserDropEngine.spec.ts` (tests construct the predicate instead of a
   bool) and the spec doc's `showHidden` references.
2. **Model** — `ColChooserModel` exposes the displayed leaf-colId set (union of the three bucket
   stores' non-group `records`). `ColumnChooserBucketModel.resolveDrop` / `isNoOpDrop` pass
   `isDisplayed` from it instead of `showHidden`.
3. **Anchor lookups** — `getDropHighlight` and `getGroupBoundaryRecord` use `store.getById(id)` to
   mean "is this row displayed." That works today only because excluded rows aren't in the store.
   `getById` defaults to `respectFilter = false`, so once a Store filter is applied it will return
   filtered-out rows and the anchor could land on an invisible row. **Switch these calls to
   `store.getById(id, true)`.** (ag-Grid `getRowNode`/`getDisplayedRowAtIndex` are already
   filter-aware; the `belowLast` fallback covers a null node.)

Tree filtering is already correct: `RecordSet.withFilter` Pass 2 walks up and marks all parents of
any passing record, so a matching leaf retains its ancestor **group** rows and renders in context.
Set `filterIncludesChildren: true` on the bucket stores so matching a **group header** reveals its
columns (the reverse direction; default is false).

### Accepted caveats (documented, consistent with the hidden-column precedent)

- **Intra-bucket reorder precision degrades under a filter** — you can only drop relative to *visible*
  rows; filtered-out columns keep their master positions and ride along. Fine for "put X next to Y,"
  imprecise for an exact absolute slot. This is the intended behavior for an actively-filtering user.
- **Locked-group contiguity relaxes** as a group's *rendered* run shrinks (`renderedAncestor`/
  `dropWithinGroup` bound by rendered members). Same relaxation `showHidden: false` already produces.
- **No-op suppression** silently swallows a move whose only effect is crossing filtered-out columns —
  the desired "nothing visibly happened" behavior.

Cross-bucket moves and pin-in-place (§6 append) are unambiguous and safe under a filter; only
intra-bucket reordering is fuzzy.

---

## 6. Deferred: multi-grid `GridFindField`

Find/highlight mode wants one control that highlights and **navigates** matches across all present
grids (left → unpinned → right → library), rolling across grid boundaries with an aggregate count.
`GridFindField` is single-grid today; the clean generalization is a per-grid sub-state.

### Decomposition

- **`GridFindState` (per grid):** holds a `GridModel` ref, its ordered `results` (matching ids), its
  current index (`-1`/null when not active), and the per-grid mechanics — `getActiveFields`,
  `getRecords` + the two sort passes (`sortRecordsRecursive`, `sortRecordsByGroupBy`),
  `getValGetters`. Everything that reads exactly one `gridModel`.
- **Outer model (shared):** `query`, `matchMode`/`queryBuffer`/`include`/`exclude`, the compiled
  regex, the **ordered list** of states, an **active-state** pointer, aggregate `count`, global
  position, and `selectNext`/`selectPrev` that step within the active state and roll to the next
  non-empty state at the boundary.

Single-grid is the N=1 case of this collection, so existing behavior is preserved by construction —
which is what dissolves the regression risk of touching an app-wide component.

### Edges to handle (all tractable)

- **`selectedIdx` is derived from `gridModel.selectedId` today**, not stored — clicking a matching
  row updates the count. Multi-grid must reconcile "which grid holds the active selection" against the
  stored active pointer (or keep deriving by scanning states for a selected match).
- **Cross-grid selection on roll-over** — stepping into grid B should clear A's selection, or selected
  rows accumulate across grids.
- **Grid ordering is load-bearing** — the component takes an ordered `gridModels` list.
- **One `include`/`exclude`/`matchMode` applies to all grids** — fine here (shared schema), slightly
  opinionated as public API.

### Match indicator (open decision for the ColChooser use)

- **Dedicated find-highlight** (row class, decoupled from selection): needs explicit `ensureVisible`
  scroll, but leaves the ColChooser's manual multi-select + space-to-toggle bulk action free.
- **Reuse row selection** (as `GridFindField` does today): free auto-scroll + keyboard toggle, but
  fights manual multi-select. Likely the wrong fit for the ColChooser.

Because we already apply the match predicate ourselves (§3), highlight mode does **not** strictly
require the multi-grid `GridFindField` — a `rowClassRules` highlight keyed to the shared predicate,
plus an `ensureNodeVisible` scroll to the first match in the unpinned bucket, is sufficient for the
ColChooser alone. Generalizing `GridFindField` is only worth it if we want navigation (prev/next +
count) and/or to fix the app-wide single-grid limitation. Treat it as an independent follow-up.
