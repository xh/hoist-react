# Column Chooser — Locked Group Drag-and-Drop Spec

The single reference for how the desktop column chooser resolves drag-and-drop when the target grid has
`lockColumnGroups` (ag-Grid `marryChildren`). It defines the data model, the invariant that must never
be violated, the resolution algorithm, the case matrix, and worked examples that double as the test
corpus. Implementation lives in `colChooserDropEngine.ts` (pure) and `ColChooserBucketModel.ts` (the
ag-Grid glue); both cite the sections below, and the headless suite in §13.1 enforces them.

---

## 1. Model

- **Master order** — a single `ColumnState[]` array. This is what the chooser hands to
  `GridModel.updateColumnState`; its order becomes ag-Grid's applied column order (`applyColumnState`
  with `applyOrder`).
- **Buckets** (left-pinned / unpinned / right-pinned) are **views**, not partitions:
  `bucket(side) = master.filter(cs => (cs.pinned ?? null) === side)`.
- **Displayed** — a column is displayed in its bucket only if it is also rendered as a row. Two things
  remove it: routing to the Column Library (hidden columns, when the library is shown) and an active
  Store filter. The engine takes this as one `isDisplayed` predicate; every rule below that says
  "rendered" or "displayed" means this.
- **Pinning is orthogonal to order.** ag-Grid stores one master column list and derives the
  left/center/right containers by filtering it on each column's `pinned` flag; pinning a column does
  **not** reorder the master list (verified in ag-Grid 35.3.1 `setColsPinned` / `_getColumnState`).
  The chooser mirrors this: we never partition master by pinned side.

## 2. The invariant (the ag-Grid rule we must never violate)

> For every column group, at **every nesting level**, its leaves — **including hidden ones** —
> occupy a contiguous run in the master array.

This is exactly ag-Grid's `doesMovePassMarryChildren`: for each married group,
`maxIndex - minIndex <= leafCount - 1` over the single flat column list (hidden columns included,
pinned state ignored). Violating it triggers ag-Grid **warning #39** ("Applying column order broke a
group where columns should be married together"), the applied order is **discarded**, and the
chooser's state desyncs from ag-Grid.

A locked group **may span pinned sections** (e.g. one leaf pinned-left, the rest unpinned) — legal
precisely because pinning is orthogonal; the group stays contiguous in master and ag-Grid pulls the
pinned member into the left container for display.

Exported as `invariantHolds`, so tests can assert #39-freedom structurally.

## 3. Product pillars

1. Chooser DnD behavior should match ag-Grid header DnD behavior.
2. Resolution must **never** produce an illegal (group-splitting) master order. It achieves this by
   **clamping** the landing position, not by refusing the drop (§5B).
3. Pinning a member of a locked group is a **legal** move.
4. A cross-bucket drop onto a **pinned** bucket may set the pin flag **and** move the group, based on
   where it was dropped — to avoid forcing the user into a confusing two-step (drop somewhere legal,
   then reorder).
5. Cross-bucket drags obey the **same** constraints as intra-bucket drags, with one exception:
   dropping onto a pinned bucket may auto-move the group (the only hard constraint there is not
   splitting **another** group in that bucket).
6. Never disallow a drop because of a **hidden (invisible) column**. Snap the insertion point around
   hidden columns and handle the placement correctly.
7. Make the **smallest move** that still upholds the invariant — move a subgroup if that suffices;
   escalate to ancestors only as needed.

## 4. Terminology

- **Dragged leaves `L`** — every leaf column under the grabbed row(s).
- **Grab unit** — the shallowest node the user grabbed: a leaf, a subgroup, or a top-level group.
- **Source bucket / target bucket** — the buckets the drag starts in / is dropped on.
- **Cross-bucket drag** — target bucket ≠ source bucket (a pin/unpin/re-pin). Otherwise intra-bucket.
- **Rendered sibling** — a member of the grab unit's group, in the **target bucket**, currently
  displayed (§1), excluding the dragged leaves themselves.
- **Bounding group `B`** — the innermost ancestor of the grab unit with a rendered sibling in the
  target bucket. `B` bounds where the drop may land (§5B). `B` may not exist, which means
  unconstrained. Computed by `renderedAncestor`.
- **Move set** — the columns that actually relocate in master (a superset of `L` when whole groups
  must travel to stay contiguous).
- **Insertion point `P`** — the master gap the move set is spliced into.

## 5. Resolving a drop — constraint + move set

Two decisions per drop: **where it may land** (the bounding group, §5B) and **what moves** (the move
set, §7). Both are recursive over the group hierarchy.

The bounding group `B` determines how tightly the drop is constrained:

- **`B` exists** (a rendered sibling sits in the target bucket) → **constrained**: the block may only
  land within `B`'s run, and a position resolving outside it is clamped to the near edge (§5B).
- **No `B`** → **unconstrained**: the block relocates freely across the bucket. This is the case for a
  top-level or fresh group, and for an ungrouped leaf.

Counting only *rendered* siblings matters: a hidden same-bucket sibling must not constrain a fully
visible group's drag, while a genuine other-bucket portion must (§10A C-SPAN).

### What is actually refused

A locked drop is **never** refused for a group split. The only non-committing outcomes are:

1. **Selection refusals** (target-independent, checked before any position is considered) — the
   selection is empty, a grabbed row is not movable, a group row is mixed with any other row, or
   groups are locked and the selected leaves don't share one immediate parent. These surface as a
   `DropRejectReason` and an on-screen hint, since the rules are not self-evident.
2. **No-ops** (§5A Rule B) — the drop would leave every bucket's rendered sequence unchanged.
   Suppressed silently: no indicator, no commit.
3. Dropping onto the dragged unit itself.

### Move set

Set the pin on `L` only (cross-bucket). Then compute the move by the recursive escalation in §7. One
mechanism covers every case: a within-group reorder moves just `L`; a constrained drop shuffles the
child-of-`B` block; an unconstrained drop relocates the whole top-level group.

## 5A. Bucket-view insertion & no-op

Both rules think in **bucket-view space**, not interleaved master indices. Reasoning in master indices
gives wrong results whenever a **group spans buckets**, because the user's drop intent is expressed in
the *target bucket's rendered order*.

### Rule A — resolve insertion by the target bucket's rendered order, not raw master indices

ag-Grid reports a drop as *between two rendered rows of the target bucket*: `prev` (row above the gap)
and `next` (row below); either may be a bucket edge. The master insertion point is the gap that
reproduces that **rendered adjacency** while keeping every group contiguous:

- `prev`, `next` in the **same** group → reorder within that group (master gap between them).
- Different groups → the master gap **between `prev`'s group run and `next`'s group run** (after the
  whole group `prev` belongs to, before the whole group `next` belongs to, at the outermost level
  where they differ). A pinned/hidden member of either group living elsewhere in master does **not**
  pull the gap into that group's interior.
- Bucket start / end → before the first / after the last rendered unit's group run in that bucket.

Anchor immediately before `next` only when the dragged unit actually joins `next`'s group, or there is
no `prev` to fall back to. Otherwise the unit belongs to `prev`'s branch: land it beside `prev`, inside
its own run. Never overshoot to `next`'s raw master index, which can jump a run of hidden or
other-bucket columns and split the unit's group (§10A C-HIDDEN-GAP).

Consequence (**C-F1**): dropping a foreign leaf *below* the sole pinned member `m` of a spanning group
`G` lands it **after `G`'s entire run** — `G` stays contiguous and the leaf renders after `m` in the
bucket. It must **not** snap to `G`'s leading edge. "After a lone pinned member" must be an expressible
drop.

Implemented as `viewInsertionIndex`.

### Rule B — a drop is a no-op iff every bucket's RENDERED sequence is unchanged

Suppress the drop (no indicator, no commit) exactly when the per-bucket rendered column order — left
view, unpinned view, right view, **each independently** — is identical after the move. **Never mutate
master when the views would not change.**

Comparing per bucket rather than on the interleaved master projection is essential in both directions:
the interleaved check both missed real no-ops (silently churning master by moving a pinned member
within its own run — invisible to the user) and let that churn **degrade** the state, wedging two
pinned members at a group boundary and blocking subsequent legal reorders (**C-N1 / C-GR**).

Implemented as `isNoOpDrop`.

### 2b. A spanning group's row drag is constrained to its own run

Dragging the row of a group that spans buckets behaves like dragging its leaves: droppable only among
its other-bucket members, not relocatable anywhere. This requires `unitDepth` to include the dragged
group's **own** level when searching for `B`. A full or fresh group — no other rendered member in the
target bucket — stays unconstrained and relocates freely.

## 5B. Clamp, don't reject; treat a foreign group as a single row

Two rules make locked reorders forgiving instead of pixel-precise. Both live in `resolveDrop` /
`viewInsertionIndex`.

### Clamp to the bounding group's run

Rather than rejecting a drop that resolves **outside** `B`'s run, **clamp** the insertion index to
`B`'s run edge:

- A resolved index below the run snaps to `B`'s trailing edge; above the run, to its leading edge.
- **Null `B`** → unconstrained: the block may land anywhere in the bucket, clamped only to the
  bucket's own ends.
- The clamp keeps the block **inside its parent** — it never escalates to relocating the whole parent
  group. A lone leaf dragged past its group snaps to its group's edge (a within-group reorder), never
  leaving it.

Every reachable cursor position therefore resolves to the nearest legal spot.

### Group-as-single-row snap — a foreign locked group is one drop unit

When the cursor sits **inside** a group the dragged unit is foreign to, treat that whole group as a
**single row**: cursor in the group's **top half** → insert **before** the group; **bottom half** →
**after**. The flip is the group's **vertical midpoint** — the centre of the middle rendered member for
an odd member count, the boundary between the two central members for an even count. This mirrors
ag-Grid's own single-row convention (above/below a row by its centre), scaled to the group's full
height.

Implemented per-member, since chooser rows are uniform height: for the hovered member at index `i`
among the group's `n` rendered members, with `below ∈ {0,1}` for the hovered half,
`2·i + below < n` ⇒ before, else after.

A member-count midpoint (counting members either side of the gap) is **not** equivalent — it biases
toward "before" and forces the cursor most of the way through the group before it reads as "after".

## 6. Universal rules (every drop, both modes)

- **Snap past hidden columns.** The visible drop gap maps to a *range* of master positions (hidden
  columns are invisible but present in master). Choose the position in that range that does not split
  any group outside the move set. A drop is **never** rejected because of a column the user can't see.
- **Snap out of other groups.** Group membership is fixed by column defs; a drop can never make a
  column join a group it isn't defined in. If `P` falls inside the run of a group the move set is not
  part of, snap `P` out of it — by the drop's **rendered bucket position** (§5A Rule A), never by the
  group's nearest master boundary.
- **Hidden columns may be moved silently.** A hidden column has no visible representation, so the
  resolver may reposition hidden columns freely to satisfy the invariant (e.g. to keep a group with
  hidden pinned members contiguous). This never affects the display and is always preferable to
  disallowing. Taken with the two rules above: hidden columns **never constrain a drop** — they are
  placed wherever keeps groups contiguous.
- **Preview == commit.** `getValidDropPosition` **caches the validated resolved state** and the commit
  applies it verbatim, matched to `event.rowsDrop`. The returned indicator anchor is display-only and
  the commit must never re-derive from it: the anchor is a lossy proxy that re-resolves differently
  when a group spans buckets.
- **Empty target bucket** (no rows, no rendered sibling): pin-flag only, **no master move** — the
  column keeps its master position, stays inside its group's run, and displays as the sole member of
  that side. Order is unchanged, so this can never split a group.

## 7. Move set — auto-move, smallest first

Group membership is fixed by column defs; DnD only reorders and re-pins. To find the smallest legal
move, apply the primitive move (pin `L`, place it at `P`) then repair the invariant bottom-up:

1. Candidate move set = **`L` alone**, relocated to `P`.
2. Check the invariant (§2) over the whole master.
3. If satisfied → **done** (smallest move found — e.g. a within-group reorder moves only the leaf).
   If violated → escalate: candidate = `L`'s **innermost** group as a block at `P`. Go to 2.
4. Keep escalating outward through ancestor groups until the invariant holds. If the **root**
   (top-level) ancestor still violates, move it as a block to `P` — this always satisfies the
   invariant, since a top-level group has no parent to split.

This is exactly "walk up the hierarchy, stop as soon as `marryChildren` holds." It stops before the
root only when an ancestor's other members already bracket `P`; otherwise it escalates to the root.

The block is positioned at `P` preserving internal order, so the dragged leaf's final index is its
natural position within the relocated block — matching ag-Grid, where dragging a married leaf moves
the whole group to the drop point. Pin changes apply to `L` only (the dragged leaves); carried
siblings keep their pin and ride along in order.

Escalation and the §5B clamp are complementary: the clamp bounds *where* the block may land, and
escalation decides *what* travels once it lands there.

## 8. Resolution algorithm (locked grids)

Inputs: `master` (`ColumnState[]`), dragged leaves `L`, grab unit, target `T` + `position`
(`above`/`below`) or null (append), target bucket `side`, `isDisplayed`.

1. **Selection gate** — refuse the whole drag up front if the selection is incoherent (§5), before any
   position is considered.
2. **`T` null** (empty bucket, or an append below the last row) → pin-flag only, no master move (§6).
3. **Insertion `P`** — resolve from the drop's rendered bucket position via §5A Rule A, applying the
   group-as-single-row snap for a foreign group (§5B).
4. **Bounding group `B`** (§5B) — the innermost ancestor of the grab unit with a rendered sibling in
   the target bucket, including the unit's own level for a group drag (§5A/2b). Clamp `P` to `B`'s run.
5. **Move set** — recursive escalation from `L` alone, per §7, using the clamped `P`.
6. **Apply**: set `pinned = side` on `L` (cross-bucket only; unhide `L` if from library); remove the
   move set from master; splice it in at `P` (preserving internal order).
7. **No-op check** (§5A Rule B) — if no bucket's rendered sequence changed, suppress.
8. **Assert** the invariant (§2) holds on the result. Escalation guarantees it: the root candidate
   always satisfies.

**Multi-select:** the selection gate (step 1) accepts only a coherent selection — a single group row,
or leaves sharing one immediate parent. Redundant rows (a group dragged alongside its own descendants)
are first collapsed to the enclosing unit by `collapseSelection`, so such a selection reads as a single
group drag rather than an incoherent mix.

**Preview == commit:** `getValidDropPosition` runs the whole algorithm to place the indicator and
caches the resolved state; the drop applies that state. Never diverge (§6).

## 9. Case matrix (locked)

| # | Grab unit | Drag | Rendered sibling in target? | Behavior |
|---|-----------|------|------------------------------|----------|
| 1 | Top-level group | any | n/a | Move whole group to drop position; snap around other groups/hidden. |
| 2 | Leaf / subgroup | intra-bucket, within own group | — | Reorder within group. |
| 3 | Leaf / subgroup | intra-bucket, outside own group | — | **Clamp** to own group's run edge (a within-group reorder). |
| 4 | Leaf / subgroup | cross-bucket → pinned, no sibling | no | **Unconstrained:** pin `L` + auto-move smallest block to drop position. |
| 5 | Leaf / subgroup | cross-bucket → pinned, sibling present | yes | **Constrained:** clamp into the group's run (joins the sibling). |
| 6 | Leaf / subgroup | cross-bucket → unpinned, no sibling | no | **Unconstrained:** unpin `L` + auto-move smallest block. |
| 7 | Leaf / subgroup | cross-bucket → unpinned, sibling present | yes | **Constrained:** clamp into the group's run (rejoin). |
| 8 | any | drop into empty pinned bucket | no | Pin-flag only, no master move (§6). |
| 9 | any | any | — | Insertion always snaps past hidden columns; never disallowed due to hidden (§6). |

Auto-move across the bucket occurs only in rows 4 and 6. Every other row is held inside its group's
run by the clamp, so no row in this matrix refuses a drop.

Library: dragging from the library into a bucket is identical to rows 2–8 (the column is hidden, so it
has no rendered presence), plus `hidden:false` on the dragged leaf. Because it unhides, a library drop
always changes the rendered view and is never a no-op. Dragging any bucket row into the library sets
`hidden:true` with no reorder; a non-hideable column can be dragged there but is never hidden.

## 10. Worked examples (test corpus)

Notation: `colId·L`/`colId·R` = pinned left/right; plain = unpinned; `(h)` = hidden. Arrays are
**master order**. Buckets shown as filters.

### E1 — pin a leaf, no sibling in target → unconstrained, group moves (the canonical case)
```
groupA=[colA,a1,a2]  groupB=[colB,b1,b2]   (both locked)
before  [colA·L, a1, a2, colB, b1, b2]      left:[colA]  unpinned:[a1,a2,colB,b1,b2]
drag colB → left bucket, drop before colA
after   [colB·L, b1, b2, colA·L, a1, a2]     left:[colB,colA]  unpinned:[b1,b2,a1,a2]
```
Pin `colB`; `groupB` moves before `groupA`; `b1,b2` follow, reordering the unpinned bucket.

### E2 — intra-bucket leaf outside its group → clamped to the group edge
```
groupA=[colA,colB]   plus X,Y   (locked)
before  [colA, colB, X, Y]      unpinned:[colA,colB,X,Y]
drag colA (leaf), drop after Y
after   [colB, colA, X, Y]      unpinned:[colB,colA,X,Y]
```
`B` = `groupA` (rendered sibling `colB`). The drop resolves past `groupA`'s run, so it clamps to the
run's trailing edge — a reorder within `groupA`, never a split. To move the whole group, drag the
`groupA` row.

### E3 — intra-bucket group reorder of a spanning group
```
groupA=[colA·L, a1, a2]  groupB=[colB·L, b1, b2]
before  [colA·L, a1, a2, colB·L, b1, b2]     left:[colA,colB]  unpinned:[a1,a2,b1,b2]
drag groupB row (unpinned bucket → represents b1,b2) before groupA's a1
after   [colB·L, b1, b2, colA·L, a1, a2]     left:[colB,colA]  unpinned:[b1,b2,a1,a2]
```
Whole `groupB` (incl. pinned `colB`) relocates; matches ag-Grid header behavior.

### E4 — hidden column, snap around it
```
groupA=[colA(h), colB]  groupB=[colC]   colA routed to library   (locked)
before  [colA(h), colB, colC]           unpinned display:[colB, colC]
drag colC before colB
after   [colC, colA(h), colB]           unpinned display:[colC, colB]
```
The visible gap "before `colB`" snaps **past hidden `colA`** to before the whole `groupA` block, so
`groupA` stays contiguous. Never disallowed for the invisible `colA`.

### E5 — pin a leaf, sibling already in target → constrained
```
groupB=[b0·L, colB, b2]   (b0 pinned left)   (locked)
before  [b0·L, colB, b2, ...]            left:[b0]  unpinned:[colB, b2, ...]
drag colB → left bucket
 - drop adjacent to b0 (into groupB's left run) → lands there (colB joins b0)
 - drop far from b0                             → clamps into groupB's run, joining b0
```
`B` = `groupB` (rendered sibling `b0`), so both hovers resolve inside `groupB`'s run. An imprecise drag
lands at the nearest legal spot rather than being refused.

### E6 — nested groups, intra-bucket leaf drops clamp to the innermost group
```
superX=[groupB, groupC]  groupB=[b1,b2]  groupC=[c1,c2]  groupA=[a1,a2]  (all locked, unpinned)
before  [a1, a2, b1, b2, c1, c2]
drag b1 (leaf), drop between c1 and c2  →  [a1, a2, b2, b1, c1, c2]   (clamped to groupB's tail)
drag b1 (leaf), drop before a1          →  no-op (b1 already at groupB's leading edge)
```
`B` = `groupB` (rendered sibling `b2`), so `b1` can only reorder within `groupB`. Escalation never
fires: the clamp keeps `b1` inside its parent instead of relocating `groupB` or `superX`. To move
`groupB` after `groupC`, drag the `groupB` row; to move `superX`, drag a superX-level row.

### E7 — nested groups, cross-bucket auto-move escalates to the smallest legal ancestor
```
groupA=[colA·L, a1, a2]  superX=[groupB, groupC]  groupB=[b1,b2]  groupC=[c1,c2]  (all locked)
before  [colA·L, a1, a2, b1, b2, c1, c2]     left:[colA]  unpinned:[a1,a2,b1,b2,c1,c2]
drag b1 → left bucket, drop before colA       (no rendered sibling of groupB in left → unconstrained)
  - try groupB  [b1,b2]      → [b1·L, b2, colA·L, a1, a2, c1, c2]  → superX split → escalate
  - try superX  [b1,b2,c1,c2]→ [b1·L, b2, c1, c2, colA·L, a1, a2]  → all contiguous → DONE
after   [b1·L, b2, c1, c2, colA·L, a1, a2]   left:[b1,colA]  unpinned:[b2,c1,c2,a1,a2]
```
Pin `b1`; escalation walks `groupB` → `superX` and stops at the first block that satisfies the
invariant.

## 10A. Captured real-drag cases (the primary test corpus)

Captured from **actual ag-Grid drags** in Toolbox (2026-07); locked, hidden columns routed to the
library. `params` are what ag-Grid passes to `getValidDropPosition` (`target`, `position`, `overNode`,
`y`). Behavior is left/right symmetric unless noted. Most cases are encoded in the headless suite
(§13.1) by these IDs; C-GR and C-RIGHT are not — the first is a consequence of C-N1 rather than an
independent scenario, the second a symmetry note.

Baseline (natural order): `grp-security=[symbol,underlyer(h),assetClass,sector,ccy,side]`,
`grp-account=[portfolio,subPortfolio(h),strategy,trader]`, both locked.

### C-F1 — foreign leaf, below a lone spanning member
Setup: `symbol`·L (security spans). Drag foreign `tradeDate`; params `target=symbol, position=below`.
Required: `left:[symbol, tradeDate]` — `tradeDate` pinned, spliced after security's whole run, security
contiguous, no #39. "After a lone pinned member" must be reachable; snapping to security's leading edge
instead would make it impossible to express (§5A Rule A).

### C-F2 — foreign leaf, above the member
Same setup, `target=symbol, position=above` → before security.

### C-S3 — sibling leaf, below the member
Drag `assetClass` (a security sibling), `target=symbol, position=below` → `left:[symbol, assetClass]`,
joining security after `symbol`. Same group ⇒ no snap.

### C-N1 — visible no-op that would churn master
Setup: `symbol`·L + `portfolio`·L (two spanning groups). Drag the `grp-security` **group row**; params
`target=grp-account, position=above` (group hover normalized to `above`). Both bucket views are
unchanged, so the drop must be **suppressed** (§5A Rule B). Committing it would move `symbol` to the
trailing edge of security's run — invisible, but see C-GR.

### C-GR — pinned group-row reorder degrades after a churn (consequence of C-N1)
Setup: two spanning groups pinned. Dragging the group rows past each other relocates whole group runs,
no #39. But once a C-N1 churn leaves the two pinned members adjacent at the group boundary in master,
**every subsequent reorder resolves as disallowed** — any swap would then split a group. The churn must
never happen (Rule B), so the wedged state never arises.

### C-RIGHT — right-pinned mirror
All of the above reproduce in the right bucket. Note: with **two** pinned members present, a foreign
leaf can reach the gap **between** them by hovering the second member's group row.

### C-NEST — nested spanning introduces no new failure mode
Setup: pin `delta` (leaf of `grp-greeks`, nested in `grp-risk`) → both inner and outer group span. A
foreign leaf below `delta` is a C-F1 instance; dragging the `grp-greeks` subgroup row or the `delta`
leaf is a C-N1 instance. An inner-group sibling (`gamma`) and a same-outer-group cousin (`dv01`, in
`grp-rates`) both drop directly. ⇒ Rules A/B cover nesting as-is; no separate nested rule.

### C-LIB — library → pinned bucket = cross-bucket + unhide
Setup: `symbol`·L (security spans), hidden columns in the library. A library drop is a cross-bucket
drop with `hidden:false` on `L`, obeying §5A identically: a hidden **sibling** (`underlyer`) dragged
into the top bucket below Symbol unhides and joins security after Symbol; a hidden **foreign** column
(`cost`, `vega`) is the C-F1 case.

### C-SPAN — dragging a spanning group's row rejoins its other-bucket members
Setup: `grp-account` split — `portfolio`·L (left), `strategy`/`trader` unpinned (`subPortfolio` hidden).
Dragging the **Account group row** from the left bucket into the unpinned bucket must behave like
dragging the group's leaves: droppable **anywhere among** `strategy`/`trader`, with `portfolio`
rejoining the run at the drop point (and unpinning).

- The "don't drop a group inside itself" guard must gate on the dragged **leaves**
  (`payload.leafColIds`), not on every descendant — a spanning group's members in the **other** bucket
  are valid targets. Dropping onto the dragged unit itself (its own leaves, or its group node via
  `recordIds`) is still blocked.
- **Constrained, not unconstrained (2b):** the drag is bounded to its own run in the target bucket,
  exactly like dragging its leaves. This is why `unitDepth` includes the dragged group's own level, and
  why `renderedAncestor` counts only **rendered** non-dragged members — so a hidden same-bucket sibling
  never constrains a fully visible group, while a genuine other-bucket portion does.

### C-HIDDEN-GAP — a hidden foreign group between two rendered neighbours
Setup (mirrors the Toolbox `columnChooser` example): a nested `Sales` group (`projected` + `actual`
subgroups), followed in master by an all-hidden `Compensation` group, then a trailing ungrouped
`retain`. Dropping the `projected` subgroup below `actual`'s last leaf must reorder **within** the Sales
run. Resolving on raw master indices instead overshoots to `retain`'s index across the hidden
Compensation columns, splitting Sales and forcing the whole group to the end (§5A Rule A).

## 11. Unlocked groups

No contiguity constraint, so none of §5–§9 apply: any column may be dropped anywhere. The move
degenerates to "set pin flag on `L` + splice `L` at the drop position in master" — no clamp, no snap,
splits allowed. We keep the **same non-partitioned master order** as locked (master ≡ ag-Grid's order;
buckets are filters). If maintaining master order across pin/unpin proves to require locked-specific
machinery, the documented fallback is to partition master as `left ++ unpinned ++ right` so it matches
the bucket representation exactly — but this should be a last resort, not the default.

## 12. Decisions

- **Constraint trigger (§5)** — keyed on a rendered sibling in the target bucket, symmetric across
  pin/unpin.
- **Smallest move / nesting (§7)** — recursive bottom-up escalation; stop as soon as `marryChildren`
  holds, move the root if still violated.
- **Non-movable columns** — enforced only on the rows the user grabbed. A `movable:false` column can't
  be dragged directly, but rides along freely when a parent group moves, matching ag-Grid's
  `suppressMovable`. A group is draggable if **any** descendant is movable; only an all-locked group is
  itself locked.
- **Bounding group counts rendered members only** — a hidden or filtered-out sibling never constrains
  a drag (§10A C-SPAN).
- **RTL** — out of scope; ag-Grid flips left/right, note only.

## 13. Testing

Two layers. The **headless engine suite** is the first-line regression; the **in-browser recipe**
covers the ag-Grid glue the headless suite deliberately can't.

### 13.1 Headless engine regression (primary — run after any engine or model change)

```
npx tsx desktop/cmp/grid/impl/colchooser/colChooserDropEngine.spec.ts
```

A self-contained, exit-coded driver (matching the `mcp/data/*.spec.ts` convention — no framework; `tsx`
is already a devDep) that runs the §10A corpus plus the §5A/§5B rules against the pure `resolveDrop`
engine, asserting: allow/disallow, the rendered per-bucket result, no-op suppression (Rule B), and the
**marryChildren (#39) invariant** on every allowed locked drop — all structurally, without ag-Grid.
**Extend it** by adding a row to its `cases` table whenever a new drag scenario is captured.

Does **not** cover, by design: (a) how ag-Grid maps a physical drag to `getValidDropPosition` params,
and (b) the drop-indicator rendering. Those are §13.2.

### 13.2 In-browser verification (the ag-Grid glue)

Run in the Toolbox at `/admin/tests/columnChooser`. Use it to confirm the param mapping, that the
indicator lines up with the actual landing, and that applied states are #39-free against **real**
ag-Grid. Physical row drags can't be driven synthetically (ag-Grid's row-drag machinery ignores
synthetic mouse events), so this is a human-at-the-keyboard pass; the console harness captures what
happens.

Paste the harness once. It walks the React fiber for the bucket models, so it **depends on framework
internals and on the `ColChooserBucketModel` class name** — adjust the walk if either changes.

```js
// Acquire the mounted chooser's live models -> window.__gm/__cc/__allBuckets/__chainOf.
window.__acquire = function () {
    const host = [...document.querySelectorAll('div')].find(d =>
        Object.keys(d).some(k => k.startsWith('__reactContainer$')));
    const key = Object.keys(host).find(k => k.startsWith('__reactContainer$'));
    const seen = new Set(), stack = [host[key].current], buckets = new Set();
    const scan = o => { try { if (o?.constructor?.name === 'ColChooserBucketModel') buckets.add(o); } catch {} };
    while (stack.length) {
        const f = stack.pop();
        if (!f || seen.has(f)) continue;
        seen.add(f);
        for (const bag of [f.memoizedProps, f.memoizedState]) {
            if (!bag || typeof bag !== 'object') continue;
            for (const k in bag) {
                const v = bag[k]; scan(v);
                if (v && typeof v === 'object') for (const k2 in v) try { scan(v[k2]); } catch {}
            }
        }
        if (f.child) stack.push(f.child);
        if (f.sibling) stack.push(f.sibling);
    }
    // Group by parent chooser; pick the mounted one (its unpinned bucket has a live agApi).
    const byParent = new Map();
    for (const b of buckets) { if (!byParent.has(b.parent)) byParent.set(b.parent, []); byParent.get(b.parent).push(b); }
    const chosen = [...byParent.values()].find(bs => bs.find(b => b.pinned == null)?.chooserGridModel.agApi)
        ?? [...byParent.values()][0];
    window.__allBuckets = chosen;
    window.__cc = chosen[0].parent;
    window.__gm = window.__cc.gridModel;
    window.__chainOf = id =>
        (chosen.find(b => b.pinned == null).parentChainMap.get(id) ?? []).map(g => g.groupId);
    return chosen.map(b => b.pinned ?? 'unpinned');
};

// Watch for ag-Grid warning #39 (marryChildren). __w39 counts them.
window.__w39 = 0;
if (!window.__origWarn) {
    window.__origWarn = console.warn.bind(console);
    console.warn = (...a) => {
        if (/#39|marryChildren/i.test(a.map(String).join(' '))) window.__w39++;
        return window.__origWarn(...a);
    };
}

// Capture every preview + drop: real ag-Grid params, per-bucket before/after, #39 delta.
window.__drags = [];
window.__previews = [];
window.__install = function () {
    __acquire();
    const cd = n => n?.data?.data ?? null;
    const vw = side => __gm.columnState
        .filter(c => (c.pinned ?? null) === side && (__cc.showHidden || !c.hidden)).map(c => c.colId);
    const snap = () => ({left: vw('left'), unpinned: vw(null), right: vw('right')});
    __allBuckets.forEach(b => {
        if (b.__wrapped) return;
        const gvdp = b.getValidDropPosition.bind(b);
        b.getValidDropPosition = params => {
            const res = gvdp(params);
            __previews.push({bucket: b.pinned ?? 'unpinned', target: cd(params.target)?.id,
                pos: params.position, overNode: !!params.overNode, y: Math.round(params.y),
                allowed: res?.allowed, resPos: res?.position});
            return res;
        };
        const end = b.handleRowDragEnd.bind(b);
        b.handleRowDragEnd = e => { const before = snap(), w = __w39; end(e);
            __drags.push({kind: 'intra', bucket: b.pinned ?? 'unpinned', before, after: snap(), w39: __w39 - w}); };
        const cross = b.handleCrossBucketDrop.bind(b);
        b.handleCrossBucketDrop = (e, s) => { const before = snap(), w = __w39; cross(e, s);
            __drags.push({kind: 'cross', bucket: b.pinned ?? 'unpinned', before, after: snap(), w39: __w39 - w}); };
        b.__wrapped = true;
    });
};
__install();

// Scenario setup + dumps.
window.__setState = pins => { __gm.setColumnState(__gm.columnState.map(c => ({...c, pinned: pins[c.colId] ?? null})));
    __install(); __drags.length = 0; __previews.length = 0; __w39 = 0; };
window.__dumpMaster = () => __gm.columnState.map(c => `${c.pinned?.[0] ?? '-'}${c.hidden ? 'h' : ''}${c.colId}`);
```

Then:

- **Set a scenario:** `__setState({symbol: 'left', portfolio: 'left'})` pins those columns (all else
  unpinned); `__setState({})` clears. Re-run after any code change, since HMR rebuilds the models.
- **Capture drags:** perform the drag in the UI, then read `__drags` (each drop's per-bucket
  before/after view + `#39` delta) and `__previews` (the hover → `{allowed, resPos}` sequence — the
  real ag-Grid `(target, position, overNode, y)` mapping). `__w39` is the running #39 count.
- **Indicator pass:** with a scenario set, drag and watch the drop line; confirm it lands where
  dropped and that `__w39` stays 0 for legal drops.

This is how the §10A cases were captured. When a new case is found, reproduce it here, read the real
params from `__previews`, then encode it as a headless case in §13.1.
