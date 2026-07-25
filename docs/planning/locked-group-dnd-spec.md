# Column Chooser — Locked Group Drag-and-Drop Spec

**Status:** Partially implemented in `ColumnChooserBucketModel.ts` and refined against **real ag-Grid
drag captures** (Toolbox, 2026-07). Those captures showed the master-index insertion (§8 step 1) and
the "nearest boundary" snap (§6) mishandle **groups that span buckets** (one member pinned, the rest
unpinned/hidden). The corrected resolution is **§5A (bucket-view insertion + per-bucket no-op)**, and
the ground-truth corpus is **§10A**. Where §6/§8 conflict with §5A/§10A, §5A/§10A win. §5A is now
**implemented**: Rule A as `viewInsertionIndex` (replacing the master-index base + nearest-boundary
snap), Rule B as a per-bucket `isNoOpDrop`. Verified against the §10A corpus (C-F1…C-LIB) via the live
`resolveDrop`/preview-commit path; awaiting a manual real-drag pass to confirm the indicator visuals.
**§5B is now implemented** (clamp-not-reject + group-as-single-row snap): a locked drop is never
refused for a group-split - it clamps to the bounding group's edge - and a foreign group collapses to
a single row whose vertical midpoint splits before/after. Where §5/§9 say "disallowed" for a split,
§5B wins.

**Purpose:** the single reference for how the column chooser resolves drag-and-drop when the target
grid has `lockColumnGroups` (ag-Grid `marryChildren`). It defines the data model, the invariant we
must never violate, the resolution algorithm, the full case matrix, and worked examples that double
as the test corpus. Every implementation and test should trace back to this document.

---

## 1. Model

- **Master order** — a single `ColumnState[]` array. This is what the chooser hands to
  `GridModel.setColumnState`; its order becomes ag-Grid's applied column order (`applyColumnState`
  with `applyOrder`).
- **Buckets** (left-pinned / unpinned / right-pinned) are **views**, not partitions:
  `bucket(side) = master.filter(cs => (cs.pinned ?? null) === side)`. With `showHidden: false` the
  display additionally omits `hidden` columns (they move to the Column Library).
- **Pinning is orthogonal to order.** ag-Grid stores one master column list and derives the
  left/center/right containers by filtering it on each column's `pinned` flag; pinning a column does
  **not** reorder the master list (verified in ag-Grid 35.3.1 `setColsPinned` / `_getColumnState`).
  The chooser must mirror this: we never partition master by pinned side.

## 2. The invariant (the ag-Grid rule we must never violate)

> For every column group, at **every nesting level**, its leaves — **including hidden ones** —
> occupy a contiguous run in the master array.

This is exactly ag-Grid's `doesMovePassMarryChildren`: for each married group,
`maxIndex - minIndex <= leafCount - 1` over the single flat column list (hidden columns included,
pinned state ignored). Violating it triggers ag-Grid **warning #39** ("Applying column order broke a
group where columns should be married together"), the applied order is **discarded**, and the
chooser's state desyncs from ag-Grid.

A locked group **may span pinned sections** (e.g. one leaf pinned-left, the rest unpinned) — this is
legal precisely because pinning is orthogonal; the group stays contiguous in master and ag-Grid pulls
the pinned member into the left container for display.

## 3. Product pillars

1. Chooser DnD behavior should match ag-Grid header DnD behavior.
2. Drop validation must **always** prevent a drop that would produce an illegal (group-splitting)
   master order.
3. Pinning a member of a locked group is a **legal** move.
4. A cross-bucket drop onto a **pinned** bucket may set the pin flag **and** move the group, based on
   where it was dropped — to avoid forcing the user into a confusing two-step (drop somewhere legal,
   then reorder).
5. Cross-bucket drags obey the **same** split-validation as intra-bucket drags, with one exception:
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
  **displayed** (respecting `showHidden`), excluding the dragged leaves themselves.
- **Move set** — the columns that actually relocate in master (a superset of `L` when whole groups
  must travel to stay contiguous).
- **Insertion point `P`** — the master gap the move set is spliced into.

## 5. Resolving a drop — validity + move set

Two decisions per drop: **is it allowed** (validity), and if so **what moves** (move set). Both are
recursive over the group hierarchy.

**Rendered ancestor `R`** — walking the dragged leaf's ancestor chain from **innermost outward**, the
first (i.e. deepest) group that has a rendered member in the target bucket (respecting `showHidden`),
other than the dragged leaves. Deepest keeps the shuffle as tight as possible. For a flat
(single-level) group, `R` is the group itself. `R` may not exist (no ancestor has a rendered member
in the target bucket).

### Validity (when is a drop disallowed?)

> ⚠️ **Superseded by §5B:** the "outside its run → disallowed" cases below are now **clamped** to the
> bounding group's edge, not rejected. The section stands as the definition of the bounding run; only
> the *reject* outcome is replaced by a *clamp*.

- **Intra-bucket drag** (no pin change): disallowed if the drop would take the dragged unit **outside
  its parent group's run**. (A leaf's parent is its innermost group; a subgroup's parent is its
  enclosing group.) Reorder *within* the parent is allowed. To move a group, drag the group's row.
- **Cross-bucket drag** (pin/unpin): disallowed **iff** a rendered ancestor `R` exists **and** the
  drop target is **not within `R`**. If no `R` exists, the drop is **never** disallowed.
- Never disallowed because of a hidden (invisible) column (§6).

So the only place a group auto-relocates across the bucket is a cross-bucket drop with **no rendered
ancestor**. When `R` exists, the drop is constrained to reorder *within* `R` (which may still shuffle
`R`'s child subgroups — see §7), and drops outside `R` are rejected. E5 is the flat instance of this
(`R` = the group; drop outside it → disallowed); E7 is the no-`R` instance (whole top-level group
relocates).

### Move set

Set the pin on `L` only (cross-bucket). Then compute the move by the recursive escalation in §7. One
mechanism covers every allowed case: a within-group reorder moves just `L`; a cross-bucket drop with
`R` shuffles the child-of-`R` block; a cross-bucket drop with no `R` relocates the whole top-level
group.

## 5A. Bucket-view insertion & no-op (grounded in real captures — supersedes §6 snap / §8 step 1)

Real drag captures showed the master-index base insertion (§8 step 1) plus the "nearest boundary" snap
(§6) produce wrong results whenever a **group spans buckets**. Root cause: they reason in *interleaved
master indices*, but the user's drop intent is expressed in the *target bucket's rendered order*. Two
corrected rules; both think in **bucket-view space**.

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

Consequence (the **C-F1 fix**): dropping a foreign leaf *below* the sole pinned member `m` of a
spanning group `G` lands it **after `G`'s entire run** — `G` stays contiguous and the leaf renders
after `m` in the bucket. It must **not** snap to `G`'s leading edge. "After a lone pinned member" must
be an expressible drop.

### Rule B — a drop is a no-op iff every bucket's RENDERED sequence is unchanged

Suppress the drop (no indicator, no commit) exactly when the per-bucket rendered column order — left
view, unpinned view, right view, **each independently** — is identical after the move. **Never mutate
master when the views would not change.** The prior guard compared the *interleaved* master projection,
which (a) missed real no-ops and silently churned master (e.g. moved a pinned member within its own
run — invisible), and (b) that churn then **degraded the state**, wedging two pinned members at a
group boundary and blocking subsequent legal reorders (the **C-N1 / C-GR bug**).

## 5B. Clamp, don't reject; treat a foreign group as a single row (supersedes §5 validity rejects, §9 rows 3/5/7)

Two refinements make locked reorders forgiving instead of pixel-precise. Both are implemented in
`resolveDrop` / `viewInsertionIndex`; together they mean a locked drop is **never refused for a
group-split** — the split reason (`splitsLockedGroup`) is retired.

### Clamp to the bounding group's run (supersedes the "outside `R` → disallowed" rejects)

The **bounding group** `B` is the innermost ancestor of the dragged unit still rendered in the target
bucket (the old rendered-ancestor `R`, extended to the dragged group's own level per §5A/2b). Instead
of rejecting a drop that resolves **outside** `B`'s run, **clamp** the insertion index to `B`'s run
edge:

- The dragged unit may only land within `B`'s run; a resolved index below the run snaps to `B`'s
  trailing edge, above the run to its leading edge.
- **Null `B`** (a top-level / fresh group, or an ungrouped leaf) → **unconstrained**: the block may
  land anywhere in the bucket, clamped only to the bucket's own ends.
- The clamp keeps the block **inside its parent** — it never escalates to relocating the whole parent
  group. A lone leaf dragged past its group therefore snaps to its group's edge (a within-group
  reorder), never leaving it.

Consequence: the only non-committing outcome for a locked drop is a genuine **no-op** (§5A Rule B).
Every reachable cursor position resolves to the nearest legal spot. This retires the E2 / E5 / matrix
rows 3, 5, 7 rejections — they become clamps.

### Group-as-single-row snap — a foreign locked group is one drop unit

When the cursor sits **inside** a group the dragged unit is foreign to, treat that whole group as a
**single row**: cursor in the group's **top half** → insert **before** the group; **bottom half** →
**after**. The flip is the group's **vertical midpoint** — the centre of the middle rendered member
for an odd member count, the boundary between the two central members for an even count. This mirrors
ag-Grid's own single-row convention (above/below a row by its centre), scaled to the group's full
height. Implemented per-member since chooser rows are uniform height: for the hovered member at index
`i` among the group's `n` rendered members, with `below ∈ {0,1}` for the hovered half,
`2·i + below < n` ⇒ before, else after.

This supersedes the earlier **member-count midpoint** (`before ≤ after` counting members either side
of the gap), which biased toward "before" and forced the cursor most of the way through the group
before it read as "after". The only non-committing outcome is a genuine no-op — e.g. resolving to
"before a group" the dragged unit already sits immediately before. Combined with the clamp, dragging
past the last/first group holds at the bucket (or bounding-group) edge rather than refusing.

## 6. Universal rules (every drop, both modes)

- **Snap past hidden columns.** The visible drop gap maps to a *range* of master positions (hidden
  columns are invisible but present in master). Choose the position in that range that does not split
  any group outside the move set. A drop is **never** rejected because of a column the user can't see.
- **Snap out of other groups.** Group membership is fixed by column defs; a drop can never make a
  column join a group it isn't defined in. If `P` falls inside the run of a group the move set is not
  part of, snap `P` out of it. ⚠️ **Superseded by §5A Rule A:** snap by the drop's *rendered bucket
  position* (between `prev`/`next` group runs), **not** the group's nearest master boundary — the
  nearest-boundary rule mislands drops when a group spans buckets (C-F1).
- **Hidden columns may be moved silently.** A hidden column has no visible representation, so the
  resolver may reposition hidden columns freely to satisfy the invariant (e.g. to keep a group with
  hidden pinned members contiguous). This never affects the display and is always preferable to
  disallowing. Taken with the two rules above: hidden columns **never constrain a drop** — they are
  placed wherever keeps groups contiguous.
- **Preview == commit.** Implemented by **caching the validated resolved state** in
  `getValidDropPosition` and applying it verbatim on drop; the returned indicator anchor is
  display-only. (Re-resolving the commit from that anchor diverged when a group spans buckets — the
  anchor is a lossy proxy — so the commit must not re-derive; it applies the cached state matched to
  `event.rowsDrop`.)
- **Empty target bucket** (no rows, no rendered sibling): pin-flag only, **no master move** (the
  column keeps its master position, stays inside its group's run, and displays as the sole member of
  that side).

## 7. Move set — relaxed auto-move, smallest first (Q2)

Auto-move applies **only** in relaxed mode (§5). Strict mode never expands the move set: it moves the
dragged leaves alone and **disallows** the drop if that splits any group.

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
root only when an ancestor's other members already bracket `P` (that ancestor has rendered members
around the drop) — otherwise it escalates to the root.

The block is positioned at `P` preserving internal order, so the dragged leaf's final index is its
natural position within the relocated block — matching ag-Grid, where dragging a married leaf moves
the whole group to the drop point. Pin changes apply to `L` only (the dragged leaves); carried
siblings keep their pin and ride along in order.

## 8. Resolution algorithm (locked grids)

> ⚠️ Step 1 ("base insertion `P0`" from the target's master index) and step 2's "snap … out of any
> group" are **superseded by §5A Rule A**: resolve `P` from the drop's *rendered bucket position*
> (`prev`/`next` group runs), not the target's raw master index. The rest of the algorithm (validity,
> escalation, apply) stands. The no-op suppression is **§5A Rule B** (per-bucket views), not the
> interleaved-master check.

Inputs: `master` (`ColumnState[]`), dragged leaves `L`, grab unit, target `T` + `position`
(`above`/`below`) or null (append), target bucket `side`, `showHidden`.

1. **Base insertion `P0`** from `T`/`position`:
   - `T` null → append at end of `side`'s run in master (empty bucket → §6 empty-bucket rule).
   - `T` a leaf → its master index (`above`) or +1 (`below`).
   - `T` a group → first index of its run (`above`) or last index +1 (`below`).
2. **Snap** `P0` → `P`: past hidden columns and out of any group `L` doesn't belong to (§6).
3. **Validity** (§5): compute `R` (innermost ancestor of `L` with a rendered member in the target
   bucket). Disallow if — intra-bucket and `P` leaves the dragged unit's parent run; or cross-bucket
   and `R` exists and `T` is not within `R`. Otherwise allowed.
4. **Move set** — recursive escalation from `L` alone, per §7, using `P`.
5. **Apply**: set `pinned = side` on `L` (cross-bucket only; unhide `L` if from library); remove the
   move set from master; splice it in at `P` (preserving internal order).
6. **Assert** the invariant (§2) holds on the result (it must, for an allowed drop).
7. **Multi-select** (Q3): run steps 1–6 for **each** selected row independently; if **any** is
   disallowed, disallow the entire drop. On success the move set is the union, spliced at `P`
   preserving relative order.

**Preview == commit:** `getValidDropPosition` runs steps 1–4 to decide allowed/disallowed and to
place the indicator at the resolved `P`; the commit runs the same. Never diverge.

## 9. Case matrix (locked)

> ⚠️ **Superseded by §5B:** rows 3, 5, 7 read "disallowed"; they now **clamp** the drop to the
> bounding group's edge instead. No locked drop is refused for a group-split.

| # | Grab unit | Drag | Rendered sibling in target? | Behavior |
|---|-----------|------|------------------------------|----------|
| 1 | Top-level group | any | n/a | Move whole group to drop position; snap around other groups/hidden. |
| 2 | Leaf / subgroup | intra-bucket, within own group | — | Reorder within group (allowed). |
| 3 | Leaf / subgroup | intra-bucket, outside own group | — | **Disallowed.** |
| 4 | Leaf / subgroup | cross-bucket → pinned, no sibling | no | **Relaxed:** pin `L` + auto-move smallest block to drop position. |
| 5 | Leaf / subgroup | cross-bucket → pinned, sibling present | yes | **Strict:** must land in group's run; else disallowed. |
| 6 | Leaf / subgroup | cross-bucket → unpinned, no sibling | no | **Relaxed:** unpin `L` + auto-move smallest block. |
| 7 | Leaf / subgroup | cross-bucket → unpinned, sibling present | yes | **Strict:** must rejoin group's run; else disallowed. |
| 8 | any | drop into empty pinned bucket | no | Pin-flag only, no master move (§6). |
| 9 | any | any | — | Insertion always snaps past hidden columns; never disallowed due to hidden (§6). |

Auto-move occurs **only in rows 4 and 6**. Every other `marryChildren` violation is enforced by
disallowing the drop (§5).

Library: dragging from the library into a bucket is identical to rows 2–8 with `showHidden:false`
(the column is hidden, so it has no rendered presence), plus `hidden:false` on the dragged leaf.
Dragging any bucket row into the library sets `hidden:true` (no reorder).

## 10. Worked examples (test corpus)

Notation: `colId·L`/`colId·R` = pinned left/right; plain = unpinned; `(h)` = hidden. Arrays are
**master order**. Buckets shown as filters.

### E1 — pin a leaf, no sibling in target → relaxed, group moves (the canonical case)
```
groupA=[colA,a1,a2]  groupB=[colB,b1,b2]   (both locked)
before  [colA·L, a1, a2, colB, b1, b2]      left:[colA]  unpinned:[a1,a2,colB,b1,b2]
drag colB → left bucket, drop before colA
after   [colB·L, b1, b2, colA·L, a1, a2]     left:[colB,colA]  unpinned:[b1,b2,a1,a2]
```
Pin `colB`; `groupB` moves before `groupA`; `b1,b2` follow, reordering the unpinned bucket.

### E2 — intra-bucket leaf outside its group → disallowed (regression #1)
```
groupA=[colA,colB]   plus X,Y   (locked)
state   [colA, colB, X, Y]      unpinned:[colA,colB,X,Y]
drag colA (leaf), drop after Y  →  DISALLOWED (would split groupA)
```
To move the group, drag the `groupA` row instead.

### E3 — intra-bucket group reorder of a spanning group
```
groupA=[colA·L, a1, a2]  groupB=[colB·L, b1, b2]
before  [colA·L, a1, a2, colB·L, b1, b2]     left:[colA,colB]  unpinned:[a1,a2,b1,b2]
drag groupB row (unpinned bucket → represents b1,b2) before groupA's a1
after   [colB·L, b1, b2, colA·L, a1, a2]     left:[colB,colA]  unpinned:[b1,b2,a1,a2]
```
Whole `groupB` (incl. pinned `colB`) relocates; matches ag-Grid header behavior.

### E4 — hidden column, snap around it (regression #2)
```
groupA=[colA(h), colB]  groupB=[colC]   showHidden:false   (locked)
before  [colA(h), colB, colC]           unpinned display:[colB, colC]  (colA hidden→library)
drag colC before colB
after   [colC, colA(h), colB]           unpinned display:[colC, colB]
```
The visible gap "before `colB`" snaps **past hidden `colA`** to before the whole `groupA` block, so
`groupA` stays contiguous. Never disallowed for the invisible `colA`.

### E5 — pin a leaf, sibling already in target → strict
```
groupB=[b0·L, colB, b2]   (b0 pinned left)   (locked)
before  [b0·L, colB, b2, ...]            left:[b0]  unpinned:[colB, b2, ...]
drag colB → left bucket
 - drop adjacent to b0 (into groupB's left run) → allowed (colB joins b0)
 - drop far from b0                              → DISALLOWED (strict; a one-step legal drop exists)
```

### E6 — nested groups, intra-bucket leaf drops are strict (disallowed)
```
superX=[groupB, groupC]  groupB=[b1,b2]  groupC=[c1,c2]  groupA=[a1,a2]  (all locked, unpinned)
state   [a1, a2, b1, b2, c1, c2]
drag b1 (leaf), drop between c1 and c2   → DISALLOWED (b1 would leave groupB → split)
drag b1 (leaf), drop before a1           → DISALLOWED (splits groupB and superX)
```
Intra-bucket is always strict: `b1`'s only legal intra-bucket move is within `groupB`. To move
`groupB` after `groupC`, drag the `groupB` row; to move `superX` before `groupA`, drag a superX-level
row.

### E7 — nested groups, relaxed cross-bucket auto-move escalates to the smallest legal ancestor
```
groupA=[colA·L, a1, a2]  superX=[groupB, groupC]  groupB=[b1,b2]  groupC=[c1,c2]  (all locked)
before  [colA·L, a1, a2, b1, b2, c1, c2]     left:[colA]  unpinned:[a1,a2,b1,b2,c1,c2]
drag b1 → left bucket, drop before colA       (no rendered sibling of groupB in left → relaxed)
  - try groupB  [b1,b2]      → [b1·L, b2, colA·L, a1, a2, c1, c2]  → superX split → escalate
  - try superX  [b1,b2,c1,c2]→ [b1·L, b2, c1, c2, colA·L, a1, a2]  → all contiguous → DONE
after   [b1·L, b2, c1, c2, colA·L, a1, a2]   left:[b1,colA]  unpinned:[b2,c1,c2,a1,a2]
```
Pin `b1`; escalation walks `groupB` → `superX` and stops at the first block that satisfies the
invariant.

*(Add right-pinned mirrors and multi-select examples before implementation.)*

## 10A. Captured real-drag cases (ground truth — the primary test corpus)

Captured from **actual ag-Grid drags** in Toolbox (2026-07); locked, `showHidden:false`. `params` are
what ag-Grid passed to `getValidDropPosition` (`target`, `position`, `overNode`, `y`). "Current" =
observed behavior of the present implementation; "Correct" = required behavior per §5A. Behavior is
left/right symmetric unless noted.

Baseline (natural order): `grp-security=[symbol,underlyer(h),assetClass,sector,ccy,side]`,
`grp-account=[portfolio,subPortfolio(h),strategy,trader]`, both locked.

### C-F1 — foreign leaf, below a lone spanning member → **BUG**
Setup: `symbol`·L (security spans). Drag foreign `tradeDate`; params `target=symbol, position=below`.
- **Current:** resolves `above / grp-security` → commits `left:[tradeDate, symbol]` (before security).
  Every hover over the security area (`symbol` above/below, `grp-security` above/below) collapses to
  "before security" — **no hover can place `tradeDate` after `symbol`**.
- **Correct (§5A-A):** `left:[symbol, tradeDate]`; `tradeDate` pinned, spliced after security's whole
  run; security stays contiguous. No #39.

### C-F2 — foreign leaf, above the member → OK
Same setup, `target=symbol, position=above` → before security. Correct as-is.

### C-S3 — sibling leaf, below the member → OK
Drag `assetClass` (a security sibling), `target=symbol, position=below` → `left:[symbol, assetClass]`,
joins security after `symbol`. Correct (same group ⇒ no snap).

### C-N1 — visible no-op that churns master → **BUG**
Setup: `symbol`·L + `portfolio`·L (two spanning groups). Drag the `grp-security` **group row**;
params `target=grp-account, position=above` (group hover normalized to `above`).
- **Current:** commits — both bucket views identical (`left:[symbol,portfolio]` unchanged) but master
  mutated: `symbol` silently moved to the **trailing edge** of security's run. No #39.
- **Correct (§5A-B):** no visible change in any bucket ⇒ **no-op, suppress** (no indicator, no commit).

### C-GR — pinned group-row reorder degrades after a churn → **BUG** (consequence of C-N1)
Setup: two spanning groups pinned. Dragging the group rows past each other **works initially** (whole
group runs relocate, no #39). But once a C-N1 churn leaves the two pinned members adjacent at the
group boundary in master, **every subsequent reorder resolves `disallowed`** (any swap would now split
a group). Correct: the churn must never happen (§5A-B), so the wedged state never arises; group-row
reorder stays available (or is a clean no-op when the view wouldn't change).

### C-RIGHT — right-pinned mirror → same behavior
All of the above reproduce in the right bucket. Note: with **two** pinned members present, a foreign
leaf *can* reach the gap **between** them (by hovering the second member's group row), even though it
cannot land "after" a lone pinned member — same underlying snap flaw as C-F1.

### C-NEST — nested spanning introduces no new failure mode
Setup: pin `delta` (leaf of `grp-greeks`, nested in `grp-risk`) → both inner and outer group span.
Captured: a **foreign** leaf below `delta` reproduces C-F1 (lands before the whole `grp-risk` run,
can't land after `delta`); dragging the `grp-greeks` subgroup row or the `delta` leaf reproduces C-N1
(indicator "below Delta," commits an invisible churn). An **inner-group sibling** (`gamma`) and a
**same-outer-group cousin** (`dv01`, in `grp-rates`) both drop correctly. ⇒ Rules A/B cover nesting
as-is; no separate nested rule.

### C-LIB — library → pinned bucket = cross-bucket + unhide (same F1)
Setup: `symbol`·L (security spans), `showHidden:false` (hidden columns live in the Column Library).
Dragging a hidden **sibling** (`underlyer`) into the top bucket below Symbol → unhides and joins
security after Symbol (correct). Dragging a hidden **foreign** column (`cost`, `vega`) → cannot land
below Symbol; snaps to before security — **same C-F1**. A library drop is a cross-bucket drop with
`hidden:false` on `L`; it obeys §5A identically.

### C-SPAN — dragging a spanning group's row rejoins its other-bucket members
Setup: `grp-account` split — `portfolio`·L (left), `strategy`/`trader` unpinned (`subPortfolio` hidden).
Dragging the **Account group row** from the left bucket into the unpinned bucket:
- **Was (bug):** every hover over the account rows (`strategy`, `trader`, the group header) →
  **disallowed**; only before/after the whole group was allowed, the indicator snapping to the
  group's edges and jumping around. Cause: the preview's "prevent dropping a group inside itself"
  guard rejected *any* descendant of the dragged group — including its members in the **other** bucket.
- **Correct/fixed:** behaves like dragging the group's leaves — droppable **anywhere among**
  `strategy`/`trader`, with `portfolio` rejoining the run at the drop point (and unpinning). The move
  engine (`resolveDrop`) already produced the right result for both the group- and leaf-drag; the fix
  narrows the guard to the dragged **leaves** (`payload.leafColIds`), so a spanning group's
  other-bucket members are valid targets. Dropping onto the dragged unit itself — its own leaves, or
  its group node (`recordIds`) — is still blocked.
- **Strict, not relaxed (2b):** a spanning group's row drag is constrained to its own run in the
  target bucket (droppable only among its other-bucket members), exactly like dragging its leaves —
  not relaxed/move-anywhere. This required `unitDepth` to include the dragged group's **own** level,
  and the validity bound (`renderedAncestor`, used for intra- and cross-bucket alike) to count only
  **rendered** non-dragged members — so a hidden same-bucket sibling never makes a full *visible*
  group's drag strict, while a genuine other-bucket portion does. A full/fresh group (no other
  rendered member in the target) stays relaxed and relocates freely.

## 11. Unlocked groups

No contiguity constraint, so none of §5–§9 apply: any column may be dropped anywhere. The move
degenerates to "set pin flag on `L` + splice `L` at the drop position in master." We keep the **same
non-partitioned master order** as locked (master ≡ ag-Grid's order; buckets are filters). If
maintaining master order across pin/unpin proves to require locked-specific machinery, the documented
fallback is to partition master as `left ++ unpinned ++ right` so it matches the bucket
representation exactly — but this should be a last resort, not the default.

## 12. Resolved decisions & remaining risk

Resolved:

- **Strict/relaxed trigger (§5)** — confirmed: keyed on a rendered sibling in the target bucket,
  symmetric across pin/unpin.
- **Smallest move / nesting (§7)** — confirmed: recursive bottom-up escalation, stop as soon as
  `marryChildren` holds, move the root if still violated.
- **Non-movable columns** — no special handling: the column's own drag handle is disabled (existing
  `movable` behavior); other columns still move around it.
- **Multi-select (§8.7)** — validate each dragged row independently; any violation disallows the
  whole drop.

Implemented (from real captures — §5A, §10A):

- **Bucket-view insertion (§5A Rule A)** — `viewInsertionIndex` resolves the landing by the drop's
  rendered position among the target bucket's rows (`prev`/`next` group runs), replacing the
  master-index base + nearest-boundary snap. Fixes C-F1 and the "can only drop before a group" family;
  verified for foreign / sibling / cousin / between / flip / nested / library.
- **Per-bucket no-op (§5A Rule B)** — `isNoOpDrop` compares each bucket's rendered sequence
  independently; never mutates master when no bucket view changes. Fixes C-N1 (invisible churn) and,
  transitively, C-GR.

Highest implementation risk (needs exhaustive tests, not open questions):

- **Deep nesting** — §7 escalation and §5A snapping interact; build out E6/E7 plus right-pinned
  mirrors as the primary test corpus.
- **`showHidden:false` + hidden pinned members** — exercise the silent-hidden-move rule (§6) so no
  drop is ever blocked by an invisible column.
- **Group spanning buckets** — the C-F1/C-N1/C-GR family (§10A); the main driver of the §5A rework.

Confirmed:

- **"Rendered sibling" checks any ancestor** — `R` is the shallowest ancestor with a rendered member
  in the target; §7 escalation shuffles child subgroups within `R` as needed (E7 and nested variants).

Out of scope for v1:

- **RTL** — ag-Grid flips left/right; note only.

## 13. Testing

Two layers. The **headless engine suite** is the first-line regression; the **in-browser recipe**
covers the ag-Grid glue the headless suite deliberately can't.

### 13.1 Headless engine regression (primary — run after any engine or model change)

```
npx tsx desktop/cmp/grid/impl/colchooser/colChooserDropEngine.spec.ts
```

A self-contained, exit-coded driver (`colChooserDropEngine.spec.ts`, matching the `mcp/data/*.spec.ts`
convention — no framework; `tsx` is already a devDep) that runs the §10A corpus (C-F1…C-SPAN) plus the
§5A rules against the pure `resolveDrop` engine, asserting: allow/disallow, the rendered per-bucket
result, no-op suppression (Rule B), and the **marryChildren (#39) invariant** on every allowed locked
drop — all structurally, without ag-Grid. Prints ✓/✗ per case and exits non-zero on any failure.
**Extend it** by adding a row to its `cases` table whenever a new drag scenario is captured.

Covers the whole resolution policy. Does **not** cover (by design): (a) how ag-Grid maps a physical
drag to `getValidDropPosition` params, and (b) the drop-indicator rendering. Those are §13.2.

### 13.2 In-browser verification (the ag-Grid glue)

Run in the Toolbox at `/admin/tests/columnChooser`. Use it to confirm the param mapping, that the
indicator lines up with the actual landing, and that applied states are #39-free against **real**
ag-Grid. Physical row drags can't be driven synthetically (ag-Grid's row-drag machinery ignores
synthetic mouse events), so this is a human-at-the-keyboard pass; the console harness captures what
happens. The commit path applies the state the preview cached, so a headless-verified `resolveDrop`
result is what commits — this layer is about the *inputs* ag-Grid feeds in and the *indicator* it draws.

Paste the harness once (it walks the React fiber for the bucket models — **depends on framework
internals; adjust the walk if those change**):

```js
// Acquire the mounted chooser's live models -> window.__gm/__cc/__allBuckets/__chainOf.
window.__acquire = function () {
    const host = [...document.querySelectorAll('div')].find(d =>
        Object.keys(d).some(k => k.startsWith('__reactContainer$')));
    const key = Object.keys(host).find(k => k.startsWith('__reactContainer$'));
    const seen = new Set(), stack = [host[key].current], buckets = new Set();
    const scan = o => { try { if (o?.constructor?.name === 'ColumnChooserBucketModel') buckets.add(o); } catch {} };
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
  unpinned); `__setState({})` clears. (Re-run after any code change, since HMR rebuilds the models.)
- **Capture drags:** perform the drag in the UI, then read `__drags` (each drop's per-bucket
  before/after view + `#39` delta) and `__previews` (the hover → `{allowed, resPos}` sequence — this is
  the real ag-Grid `(target, position, overNode, y)` mapping). `__w39` is the running #39 count.
- **Indicator pass:** with a scenario set, drag and watch the drop line; confirm it lands where
  dropped and that `__w39` stays 0 for legal drops.

This is exactly how the §10A cases were captured. When a new case is found, reproduce it here, read the
real params from `__previews`, then encode it as a headless case in §13.1.
