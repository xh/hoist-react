---
phase: 01-current-state-inventory
verified: 2026-06-27T00:00:00Z
status: passed
score: 4/4 must-haves verified
re_verification: null
---

# Phase 1: Current-State Inventory Verification Report

**Phase Goal:** Produce the authoritative, source-grounded understanding of the current data layer
that every later measurement and comparison depends on - resolving the two explicit unknowns
(copy-vs-reuse map and MobX reaction granularity), inventorying transports, and consolidating the
prior validation notes into one architecture document that also names the Phase 2 harness
instrumentation points.

**Verified:** 2026-06-27
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

This is a documentation phase. "Verification" = the four deliverable docs exist, cover their
required scope, and their load-bearing claims are genuinely source-grounded. All four checks pass:
docs exist with substantive content, every spot-checked file:line citation holds against actual
hoist-react source, requirements are marked complete, no forbidden client names, and the Phase 2
instrumentation bridge is concrete.

### Observable Truths

| #   | Truth (per-plan must_haves)                                                                                  | Status     | Evidence |
| --- | ----------------------------------------------------------------------------------------------------------- | ---------- | -------- |
| 1   | INV-02: copy-vs-reuse verdict at all 5 pipeline transitions, every verdict source-cited                     | VERIFIED   | COPY-VS-REUSE.md summary table covers transitions 1-5 (raw->StoreRecord->leaf ViewRowData->aggregate->grid StoreRecord->AG Grid node); each row carries file:line cites; spot-checks below all hold |
| 2   | INV-03: reaction granularity record-vs-batch across View.result->Store->GridModel->AG Grid, sync applyTransaction + mounted lifecycle | VERIFIED   | MOBX-GRANULARITY.md classifies every hop in the §7 verdict table; Grid.ts:693 confirmed synchronous applyTransaction; GridLocalModel.onLinked mounted-only lifecycle (§4,§6) confirmed against Grid.ts:186-203 |
| 3   | INV-04: 5 transport patterns + Cube/Store ingest adaptation, WS-push vs WS-notification distinction         | VERIFIED   | TRANSPORT-INVENTORY.md enumerates HTTP snapshot/diff, WS data push, WS-as-notification, SignalR, polling; each maps to loadDataAsync/updateDataAsync; invariant ingest contract articulated; push vs notification explicitly distinguished |
| 4   | INV-01: one authoritative doc, >=2 Mermaid diagrams, links 3 companions, names Phase 2 instrumentation points | VERIFIED   | ARCHITECTURE.md (527 lines) supersedes validation notes, 3 Mermaid diagrams, links + summarizes all 3 companions, Phase 2 instrumentation section with 6 boundaries tied to HARN-03/04/05 |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `docs/planning/data2/COPY-VS-REUSE.md` | INV-02, min 120 lines, contains "StoreRecord" | VERIFIED | 305 lines; full 5-transition map with summary table + per-transition reasoning + single-datum walkthrough + Phase 2 open-questions list |
| `docs/planning/data2/MOBX-GRANULARITY.md` | INV-03, min 120 lines, contains "applyTransaction" | VERIFIED | 315 lines; per-hop granularity, §7 verdict table, §6 mounted lifecycle, applyTransaction described as synchronous |
| `docs/planning/data2/TRANSPORT-INVENTORY.md` | INV-04, min 110 lines, contains "updateDataAsync" | VERIFIED | 341 lines; 5 patterns, ingest substrate section, isPartial fork, WebSocket surface, summary table, invariant contract |
| `docs/planning/data2/ARCHITECTURE.md` | INV-01, min 200 lines, contains ```mermaid | VERIFIED | 527 lines; 3 Mermaid diagrams; core artifact sections; shared-store contract; 2 wiring patterns; integrated findings; instrumentation points |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| COPY-VS-REUSE.md | data/StoreRecord.ts | StoreRecord.ts: cites | WIRED | StoreRecord.ts:240-244 confirmed: agId='ag_'+id, data, raw, committedData assigned in ctor |
| COPY-VS-REUSE.md | data/cube/View.ts | View.ts: cites | WIRED | View.ts:109-110 @observable.ref result confirmed; View.ts:554-558 reuseRecords throw confirmed |
| MOBX-GRANULARITY.md | cmp/grid/Grid.ts | Grid.ts: dataReaction + applyTransaction | WIRED | Grid.ts:693 agApi.applyTransaction synchronous confirmed; onLinked at :186-203 registers reaction set |
| MOBX-GRANULARITY.md | data/cube/View.ts | View.result observable.ref | WIRED | Confirmed |
| TRANSPORT-INVENTORY.md | svc/WebSocketService.ts | webSocketService surface | WIRED | subscribe/unsubscribe/sendMessage + WebSocketMessage referenced |
| TRANSPORT-INVENTORY.md | data/cube/Cube.ts | loadDataAsync/updateDataAsync | WIRED | Cube.ts:282 loadDataAsync, :299 updateDataAsync confirmed verbatim |
| ARCHITECTURE.md | COPY-VS-REUSE.md | linked + summarized | WIRED | 15 references incl. dedicated "Copy-vs-reuse (INV-02)" summary + link |
| ARCHITECTURE.md | MOBX-GRANULARITY.md | linked + summarized | WIRED | 12 references incl. summary section |
| ARCHITECTURE.md | TRANSPORT-INVENTORY.md | linked + summarized | WIRED | 8 references incl. summary section |

### Source Citation Spot-Checks (load-bearing claims)

| Claim | Cited | Holds? | Note |
| ----- | ----- | ------ | ---- |
| Synchronous applyTransaction | Grid.ts:693 | YES | `agApi.applyTransaction(transaction)` in syncData, no Async variant, no batching layer |
| Stable row id | Grid.ts:213 | YES | `getRowId: ({data}) => data.agId` |
| View.result @observable.ref | View.ts:109-110 | YES | `@observable.ref result: ViewResult = null` |
| ViewResult shape | View.ts:62-65 | YES | `{rows: ViewRowData[], leafMap: Map<...>}` |
| Cube ingest entry points | Cube.ts:282/299 | YES | loadDataAsync / updateDataAsync verbatim, forEachAsync fan-out |
| Cube internal store freezeData:false | Cube.ts:146-152 | YES | confirmed in Cube ctor |
| _connectedViews plain Set | Cube.ts:131 | YES | `_connectedViews: Set<View> = new Set()` |
| Store parseRaw new alloc | Store.ts:1156,1203-1217 | YES | `Object.create(this._dataDefaults)`, raw kept by ref |
| _filtered @observable.ref | Store.ts:307-308 | YES | confirmed |
| rebuildFiltered @action, no reaction | Store.ts:1123-1126 | YES | imperative `@action`, no addReaction on filter |
| Leaf shallow per-field copy | LeafRow.ts:34-44 | YES | `view.fields.forEach(({name}) => this.data[name] = rawRecord.data[name])` |
| Aggregate rows new alloc | AggregateRow.ts:27-46, BaseRow.ts:41-45 | YES | new ViewRowData per row, initAggregate computes values |
| reuseRecords forbidden on connected store | View.ts:554-558 | YES | parseStores throws |
| Mounted reactions in onLinked | Grid.ts:186-203 | YES | dataReaction + 10 others registered in onLinked |

All spot-checked citations hold. No citation discrepancies found.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| INV-01 | 01-04 | Authoritative architecture doc w/ Mermaid, supersedes validation notes | SATISFIED | ARCHITECTURE.md; REQUIREMENTS.md marks [x] / "Complete" |
| INV-02 | 01-01 | Copy-vs-reuse map at each pipeline transition | SATISFIED | COPY-VS-REUSE.md; REQUIREMENTS.md marks [x] / "Complete" |
| INV-03 | 01-02 | MobX reaction-granularity incl. sync applyTransaction + lifecycle | SATISFIED | MOBX-GRANULARITY.md; REQUIREMENTS.md marks [x] / "Complete" |
| INV-04 | 01-03 | Transport inventory + Cube/Store ingest adaptation | SATISFIED | TRANSPORT-INVENTORY.md; REQUIREMENTS.md marks [x] / "Complete" |

No orphaned requirements: REQUIREMENTS.md maps only INV-01..04 to Phase 1, all claimed by a plan.

### Success Criterion 5 (Phase 2 instrumentation bridge)

ARCHITECTURE.md "Phase 2 instrumentation points" section names 6 concrete source-seam boundaries
(Cube ingest loadDataAsync/updateDataAsync; Cube->View noteCubeUpdated; View.result @observable.ref
write; Store load/_filtered rebuild; Grid dataReaction->genTransaction->applyTransaction;
heap-attribution layers), each tied to specific HARN requirements (HARN-03 x6, HARN-04 x4,
HARN-05 x6 references). Criterion satisfied.

### Anti-Patterns Found

None. No TODO/FIXME/placeholder markers, no empty stub content. Zero em dashes across all four docs
(per writing-style rule). Documentation is substantive throughout.

### Human Verification Required

None blocking. Optional editorial review: a human familiar with the Data 2.0 strategy may wish to
confirm the framing emphasis on WebSocket push (TRANSPORT-INVENTORY §2) matches strategic intent,
but this is judgment, not a correctness gap - the source-grounded facts are verified.

### Gaps Summary

No gaps. All four deliverables exist, meet their min_lines and scope contracts, and their
load-bearing source citations were spot-checked and hold exactly. INV-01..04 are accounted for and
marked complete in REQUIREMENTS.md. The open-repo client-name guard passes (`--all`, zero forbidden
names). ARCHITECTURE.md establishes the Phase 2 instrumentation bridge with concrete boundaries tied
to HARN-03/04/05. Phase goal achieved.

---

_Verified: 2026-06-27_
_Verifier: Claude (gsd-verifier)_
