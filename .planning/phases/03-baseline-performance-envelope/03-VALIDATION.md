---
phase: 3
slug: baseline-performance-envelope
status: finalized
nyquist_compliant: true
wave_0_complete: true
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

- **After every task commit:** Run `npx tsc --noEmit && yarn lint:code` (hoist-react) or `yarn lint:types && yarn lint:code` (Toolbox)
- **After every plan wave:** Static checks in both repos + live scorecard render check where UI changed
- **Before `/gsd:verify-work`:** Static checks green; live baseline runs completed and captured
- **Max feedback latency:** ~60 seconds (static checks)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01 T1 | 03-01 | 1 | BASE-04 | T-03-01 | provisional targets only, no committed numbers pre-checkpoint | static | `cd hoist-react && npx tsc --noEmit && yarn lint:code` | ✅ | ⬜ pending |
| 03-01 T2 | 03-01 | 1 | BASE-04 | T-03-01 | pure fns, only `./types` imports | static | `cd hoist-react && npx tsc --noEmit && yarn lint:code` | ✅ | ⬜ pending |
| 03-02 T1 | 03-02 | 1 | BASE-01/02/03 | T-03-02b | dev-local export; open-repo rule on checked-in stats | static | `cd toolbox && yarn lint:types && yarn lint:code` | ✅ | ⬜ pending |
| 03-02 T2 | 03-02 | 1 | BASE-01/02/03 | T-03-02 | untrusted JSON import shape-validated (no eval) | static + manual | `cd toolbox && yarn lint:types && yarn lint:code`; live reject-malformed spot-check | ✅ | ⬜ pending |
| 03-03 T1 | 03-03 | 2 | BASE-01/02/03 | T-03-SC | chrome-devtools-mcp legitimacy gate (blocking-human) | manual (checkpoint) | package provenance verify + branch confirm | ✅ | ⬜ pending |
| 03-03 T2 | 03-03 | 2 | BASE-01/02/03 | — | flagged Chrome launch; named ladder profiles | manual (checkpoint) | dev servers up (`:8080/ping`, `:3000/datalab/`); profiles defined | ✅ | ⬜ pending |
| 03-03 T3 | 03-03 | 2 | BASE-01/02/03 | — | coarse ladder pass captured; open-repo on exports | manual (live) | run coarse ladder (reference machine); export raw run JSON to stats dir | ✅ | ⬜ pending |
| 03-04 T1 | 03-04 | 3 | BASE-01/02/03 | T-03-04 | no client names in stats file | static | `node -e "require(envelope-stats.json)"` key check | ✅ | ⬜ pending |
| 03-04 T2 | 03-04 | 3 | BASE-01/02/03 | T-03-04 | open-repo rule in narrative | static | `test -f BASELINE.md && grep -q "## Methodology"` | ✅ | ⬜ pending |
| 03-05 T1 | 03-05 | 3 | BASE-01/02 | — | small-heap machine decision + heap-cap validation | manual (decision checkpoint) | name machine; validate `--max-old-space-size` cap; OOM policy | ✅ | ⬜ pending |
| 03-05 T2 | 03-05 | 3 | BASE-01/02 | — | small-heap + zoom pass captured | manual (live) | run small-heap memory pass + zoom rungs; export to stats dir | ✅ | ⬜ pending |
| 03-06 T1 | 03-06 | 4 | BASE-04 | T-03-06 | anchor described generically; no client name | static | `test -f TARGETS-PROPOSAL.md && grep -q floor && grep -q maxRecordsXFields` | ✅ | ⬜ pending |
| 03-06 T2 | 03-06 | 4 | BASE-04 | T-03-06b | no number committed until D-08 sign-off | manual (human-verify) | user approves/adjusts every target (all four families) | ✅ | ⬜ pending |
| 03-06 T3 | 03-06 | 4 | BASE-04 | T-03-06b | adopted numbers only after checkpoint | static | `cd hoist-react && npx tsc --noEmit && yarn lint:code && grep -q "## Adopted Targets" BASELINE.md` | ✅ | ⬜ pending |
| 03-07 T1 | 03-07 | 5 | BASE-04 | T-03-07 | pure display of local verdicts | static | `cd toolbox && yarn lint:code`; grep `evaluateScorecard`/`evaluateEnvelope` | ✅ | ⬜ pending |
| 03-07 T2 | 03-07 | 5 | BASE-04 | T-03-07 | Hoist badge/Icon, no raw HTML | static + manual | `cd toolbox && yarn lint:code && yarn lint:styles`; live badge render check | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Note: the pure `evaluateScorecard` + `evaluateEnvelope` verdict functions (D-05) are genuinely
unit-testable, but with no test runner in either repo the planner does NOT add one for this
phase - validate via `tsc` types + live scorecard render showing correct badges on known runs.

---

## Wave 0 Requirements

None in the test-infrastructure sense (no framework by design - complete). Real Wave-0 prerequisites
are live-environment, not code scaffolding, and are gated at the 03-03 checkpoints before any sweep:

- [ ] Launch Grails API + webpack dev server for Toolbox (03-03 T2)
- [ ] Install/verify `chrome-devtools-mcp` (03-03 T1 legitimacy gate)
- [ ] Define named ladder ViewManager profiles before the coarse sweep (03-03 T2)

`wave_0_complete: true` reflects that no code-level test scaffold is required for this R&D phase; the
live prerequisites above are enforced as blocking checkpoints in 03-03 at execution time.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Memory envelope + small-heap wall | BASE-01 | Requires live flagged Chrome + real heap measurement | Run memory ladder on reference and small-heap (`--js-flags="--expose-gc --max-old-space-size=N"`) Chrome; read heap-by-layer; confirm OOM near cap |
| CPU/jank wall (steady + burst) | BASE-02 | Requires live sustained-load runs and frame timing | Run CPU ladder at both cadences; apply keep-up + frame-budget criteria; corroborate with chrome-devtools-mcp trace (treat MCP as corroborating only) |
| Stage-split latency at ~500x20 | BASE-03 | Requires live pipeline measurement | Run anchor batch; read engine/genTxn/bridge/render medians; sum for end-to-end |
| Targets adopted + wired (per-scorecard + envelope-level) | BASE-04 | Target adoption is a human decision (D-08 checkpoint) | Verify per-scorecard badges + envelope-targets summary render against known runs; approve proposed numbers at checkpoint |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (static checks) or documented manual-live verification
- [x] Sampling continuity: no 3 consecutive tasks without at least static verification
- [x] Wave 0 covers environment prerequisites (dev servers, MCP, ladder profiles)
- [x] No watch-mode flags
- [x] Feedback latency < 60s for static checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** signed (planner, 2026-07-02) - per-task map backfilled with real 03-0x task IDs; auto
tasks carry `tsc`/lint static verify, checkpoints carry live-measurement/human-decision verification.
</content>
