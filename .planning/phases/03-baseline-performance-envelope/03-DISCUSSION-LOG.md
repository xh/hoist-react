# Phase 3: Baseline Performance Envelope - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-07-02
**Phase:** 03-baseline-performance-envelope
**Areas discussed:** Envelope sweep design, Targets & pass/fail wiring, Results capture & report
(Small-heap reference machine was offered but not selected - left to Claude's discretion/research)

---

## Envelope sweep design

### Sweep strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Ladder + zoom (Recommended) | Curated ladder of scenario points, then finer points around degradation | ✓ |
| Adaptive escalation | Binary-search style escalation until failure | |
| Fixed grid only | One predefined matrix, no follow-up zooming | |

### Memory wall definition

| Option | Description | Selected |
|--------|-------------|----------|
| Tiered thresholds (Recommended) | Comfortable / degraded / hard wall - graded green/yellow/red envelope | ✓ |
| Hard wall only | Wall = OOM or renderer kill, one number per shape | |
| Fixed heap budget | Pick a budget up front, report where each shape crosses it | |

### Jank / CPU wall definition

| Option | Description | Selected |
|--------|-------------|----------|
| Keep-up + frame budget (Recommended) | Wall when median update->render exceeds batch interval OR p95 exceeds frame budget (~100 ms) | ✓ |
| Keep-up only | Throughput saturation only | |
| Long-task based | Long Tasks API framing (needs new instrumentation) | |

### Headline sweep axes

| Option | Description | Selected |
|--------|-------------|----------|
| Rows x fields, batch x rate (Recommended) | Memory: leaf rows x field count; CPU: batch size x rate (steady + burst) | ✓ |
| Add aggregation depth | Also sweep cube dimension count as a third memory axis | |
| Rows only, cadence only | Minimal single-axis sweeps | |

**Notes:** User injected a directive mid-area: an early stats + narrative package for the Claude
design tool (interactive team presentation, infographics of walls and scaling; technical dev
audience + IT decision-maker concerns) is an immediate side deliverable - ship from the coarse
ladder pass, before full phase completion.

---

## Targets & pass/fail wiring

### Targets home

| Option | Description | Selected |
|--------|-------------|----------|
| Typed targets in harness core (Recommended) | TargetsConfig in data/measure with adopted numbers as named default export | ✓ |
| Toolbox-side config | Targets live in the Data Lab app only | |
| Doc only | No automatic pass/fail evaluation | |

### Pass/fail UI

| Option | Description | Selected |
|--------|-------------|----------|
| Scorecard badges + comparison (Recommended) | Inline badges per targeted metric + target columns in comparison table | ✓ |
| Separate verdict panel | Dedicated 'vs targets' panel, scorecard stays raw | |
| Programmatic only | scoreAgainstTargets() function, no UI this phase | |

### Target anchoring

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid floor + aspiration (Recommended) | Must-hold floor from measured baseline + aspirational target from business need | ✓ (user typed "(1)") |
| Business-need driven | Purely client-ask driven | |
| Baseline-derived | Measured envelope plus safety margin | |

### Adoption process

| Option | Description | Selected |
|--------|-------------|----------|
| Review checkpoint (Recommended) | Proposal doc + human-verify checkpoint; user approves/adjusts each target before commit | ✓ |
| Adopt-then-adjust | Commit proposed numbers immediately, revise at verification | |
| Team review | Targets provisional until XH leadership reviews | |

---

## Results capture & report

### Report home

| Option | Description | Selected |
|--------|-------------|----------|
| BASELINE.md + stats dir (Recommended) | docs/planning/data2/BASELINE.md + checked-in exported run JSON | ✓ |
| Doc only, runs stay local | Numbers transcribed, raw runs unversioned | |
| Split: doc + external stats | Stats handed to design tool outside the repo | |

### Run export (PROVISIONAL - user AFK, timeout; recommended option adopted)

| Option | Description | Selected |
|--------|-------------|----------|
| Export + import (Recommended) | Download runs as JSON + import for cross-machine comparison | ✓ (provisional) |
| Export only | Download only | |
| Clipboard/manual | Copy button / devtools | |

### Stats package shape (PROVISIONAL - user AFK, timeout; recommended option adopted)

| Option | Description | Selected |
|--------|-------------|----------|
| Raw + distilled (Recommended) | Raw run JSON + distilled ENVELOPE-STATS JSON for design-tool consumption | ✓ (provisional) |
| Distilled only | Just the distilled file | |
| Raw only | Design tool distills what it needs | |

### Sweep execution mode (PROVISIONAL - user AFK, timeout; recommended option adopted)

| Option | Description | Selected |
|--------|-------------|----------|
| Claude-driven, no batch runner (Recommended) | Claude drives ladder via browser tooling; coarse ladder first | ✓ (provisional) |
| Build a batch runner | Data Lab run-queue | |

---

## Chrome measurement tooling (user-raised question)

User asked whether Chrome DevTools MCP or similar tooling could increase measurement efficiency
or accuracy; open to installing/configuring anything useful.

| Option | Description | Selected |
|--------|-------------|----------|
| DevTools MCP + optional driver (Recommended) | Install chrome-devtools-mcp (traces, long tasks, CPU throttling); optional headed CDP driver script as plan item | ✓ (provisional - two timeouts) |
| DevTools MCP only | MCP, no driver script | |
| Go straight to CDP driver | Puppeteer/Playwright headed driver now | |
| Stay manual | Keep Phase 2 manual protocol | |

---

## Claude's Discretion

- Small-heap reference machine selection (real hardware vs constrained-heap emulation; specs) -
  area offered but not selected for discussion; must be researched, proposed, and NAMED (BASE-01)
- Ladder point values and zoom granularity; burst shape parameters
- Exact memory tier boundaries and frame-budget ms (propose with evidence)
- BASE-03 batch definition details; iteration/warmup counts (DEFAULT_PROTOCOL baseline)
- Distilled stats schema and BASELINE.md structure

## Deferred Ideas

- In-harness batch runner / run queue (revisit if Claude-driven sweeps prove tedious)
- Headless / CI automation (carried deferred from Phase 2; the optional CDP driver is headed
  automation of the interactive protocol, not CI)
