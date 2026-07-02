---
phase: 3
slug: baseline-performance-envelope
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-02
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none by design (no jest/vitest in hoist-react or Toolbox) - static checks + live flagged-Chrome measurement runs |
| **Config file** | none - Wave 0 does NOT install a framework (R&D phase, consistent with Phase 2) |
| **Quick run command** | `cd /Users/amcclain/dev/hoist-react && npx tsc --noEmit && yarn lint:code` |
| **Full suite command** | Quick command above + Toolbox `lint:types` + live Data Lab measurement run in flagged Chrome |
| **Estimated runtime** | ~60 seconds (static); live runs minutes per ladder pass |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit && yarn lint:code`
- **After every plan wave:** Static checks in both repos + live scorecard render check where UI changed
- **Before `/gsd:verify-work`:** Static checks green; live baseline runs completed and captured
- **Max feedback latency:** ~60 seconds (static checks)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD by planner | - | - | BASE-01 | — | N/A | manual (live) | Memory ladder on reference + small-heap Chrome; heap-by-layer readout; OOM near cap | ✅ | ⬜ pending |
| TBD by planner | - | - | BASE-02 | — | N/A | manual (live) | CPU ladder both cadences; keep-up + frame-budget criteria; MCP trace corroboration | ✅ | ⬜ pending |
| TBD by planner | - | - | BASE-03 | — | N/A | manual (live) | Anchor batch (~500x20); engine/genTxn/bridge/render medians; sum for end-to-end | ✅ | ⬜ pending |
| TBD by planner | - | - | BASE-04 | — | N/A | static + manual | `tsc`/lint clean on `TargetsConfig` + verdict fn; badges render live; D-08 checkpoint approves | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Note: the pure `evaluateScorecard(scorecard, targets)` verdict function (D-05) is genuinely
unit-testable, but with no test runner in either repo the planner should NOT add one for this
phase - validate via `tsc` types + live scorecard render showing correct badges on known runs.

---

## Wave 0 Requirements

None in the test-infrastructure sense (no framework by design). Real Wave-0 prerequisites:

- [ ] Launch Grails API + webpack dev server for Toolbox
- [ ] Install/verify `chrome-devtools-mcp`
- [ ] Define named ladder ViewManager profiles before the coarse sweep

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Memory envelope + small-heap wall | BASE-01 | Requires live flagged Chrome + real heap measurement | Run memory ladder on reference and small-heap (`--js-flags="--expose-gc --max-old-space-size=N"`) Chrome; read heap-by-layer; confirm OOM near cap |
| CPU/jank wall (steady + burst) | BASE-02 | Requires live sustained-load runs and frame timing | Run CPU ladder at both cadences; apply keep-up + frame-budget criteria; corroborate with chrome-devtools-mcp trace (treat MCP as corroborating only) |
| Stage-split latency at ~500x20 | BASE-03 | Requires live pipeline measurement | Run anchor batch; read engine/genTxn/bridge/render medians; sum for end-to-end |
| Targets adopted + wired | BASE-04 | Target adoption is a human decision (D-08 checkpoint) | Verify badges render against known runs; approve proposed numbers at checkpoint |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify (static checks) or documented manual-live verification
- [ ] Sampling continuity: no 3 consecutive tasks without at least static verification
- [ ] Wave 0 covers environment prerequisites (dev servers, MCP, ladder profiles)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s for static checks
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
