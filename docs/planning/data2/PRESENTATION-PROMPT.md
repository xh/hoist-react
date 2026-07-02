# Presentation Prompt: Hoist Data Layer - Baseline Performance Envelope

Copy everything below the line into your presentation design tool, attaching
`stats/envelope-stats.json` (chart data) and `BASELINE.md` (full narrative) alongside it.
The prompt is self-contained - the tool needs no other context.

---

## Prompt

Create a polished, data-driven technical presentation titled **"Hoist Data Layer:
The Performance Baseline"** (subtitle: "Measuring 1.0 before we build 2.0").

### Context you need (the tool has no other background)

Hoist is a web application development toolkit built by Extremely Heavy Industries (XH),
used to build data-dense desktop-style business apps in the browser (React + MobX +
AG Grid). Its client-side **data layer** moves server data into rendered grids through a
pipeline of cooperating pieces: a **Store** (client record storage) feeding a **Cube**
(dimensional aggregation engine), queried by a **View** that produces hierarchical rows,
which sync into an **AG Grid** for display. When a real-time update batch arrives (over
HTTP polling or WebSocket push), it flows: transport -> cube ingest + re-aggregation
("the engine") -> grid transaction build -> JS-to-grid bridge call -> render/paint.

The team is about to design **Data Layer 2.0**, a ground-up modernization. Before
designing it, they built a measurement harness and empirically mapped what the CURRENT
(1.0) stack can and cannot do - the "performance envelope." This presentation reports
that baseline: it is the "you are here" map that motivates and will later score the 2.0
work. Every number in it is a real measurement, not an estimate.

### How the numbers were produced (methodology - give it one slide)

- A scripted harness drove a live demo app (the "Data Lab") through a ladder of
  scenarios: synthetic datasets of controlled size (rows x fields), streamed update
  batches of controlled size and rate, against a real AG Grid.
- Each run: 5 warmup + 20 measured iterations; medians and p95s reported; forced garbage
  collection between memory samples (Chrome launched with special flags for precise heap
  numbers); the browser tab kept foregrounded so render timings are honest.
- Reference machine: MacBook Pro, Apple M3 Max, 36 GB RAM, Chrome 149 - deliberately
  strong hardware; a constrained "small-heap" machine pass is planned next.

### The data (attached: envelope-stats.json)

The attached JSON is flat and chart-ready:

- `memorySeries`: retained browser heap by dataset shape - `{leafRowCount, fieldCount,
  totalHeapDeltaBytes, tier}` where tier is comfortable / degraded / hardWall. Chart as
  bars or a scaling curve. Key values: 50k rows x 10 fields = 61 MB; 50k x 20f = 335 MB;
  100k x 20f = 514 MB; 50k x 40f = 665 MB; 200k x 20f = 872 MB.
- `cpuSeries`: per update-batch cost by batch size x rate x cadence - use
  `endToEndMedianMs` vs `batchIntervalMs` and the boolean `keepsUp`. Chart as a grouped
  bar or matrix showing which combinations keep up.
- `anchorBatch`: the stage breakdown for the flagship scenario - chart as a stacked bar
  of engine / genTxn / bridge / render.
- `tierBoundaries`: the observed boundary crossings with rationale strings.

### The story arc (build the deck around these five beats)

1. **Why measure first.** You cannot claim 2.0 is faster without a rigorous 1.0
   baseline. The team built the measuring stick before the new engine.
2. **Memory: fields cost more than rows.** At 50k rows, widening from 10 to 40 fields
   multiplies retained heap ~11x (61 MB -> 665 MB); multiplying rows 4x at fixed width
   less than triples it. There is also a fixed ~277 MB floor at 20 fields - grid
   infrastructure costs before data size matters. And a session-lifetime finding:
   running many heavy scenarios in one long-lived tab crashed the browser renderer
   (out of memory) even though every scenario passes individually - long-lived tabs
   accumulate.
3. **CPU: per-update cost is FLAT.** A 100-row batch costs the same ~400 ms as a
   2000-row batch over HTTP polling - the cost is fixed re-aggregation work per update,
   not proportional to changed rows. Consequence: 1-2 updates/sec keep up at any
   measured batch size; 10 updates/sec falls ~4x behind. This is the single most
   consequential finding for the 2.0 design.
4. **The trading-screen anchor keeps up - barely.** The flagship scenario (a real-time
   trading-screen workload: ~500 rows/tick, ~20 fields touched, 10 ticks/sec, WebSocket
   push) completes update-to-render in a median 92.9 ms - inside its 100 ms budget, but
   with almost no headroom, and its p95 (451 ms) spikes well past it. Median passes;
   tail does not. Also flag honestly: the same batch size over HTTP polling measured
   ~4-5x slower in the engine stage - a transport-coupled anomaly under investigation.
5. **What's next.** Finer-grained "zoom" runs around the observed boundaries, a
   small-heap machine pass to bound constrained hardware, then formally adopted
   green/yellow/red targets that Data Layer 2.0 must beat - with pass/fail verdicts
   wired into the measurement app's UI.

### Audience and tone

Dual audience: primarily technical developers (show the stage breakdown, the scaling
curves, the methodology - they will probe the numbers), secondarily IT decision-makers
(one slide in plain terms: per-tab memory budgets of ~335 MB for a 50k x 20f screen and
~870 MB at 200k rows; update-rate guidance; these are current-stack numbers on strong
hardware). Confident, empirical, no hype: the deck's credibility IS the measurement
rigor. Where a number is provisional (tier labels, the transport anomaly), say so - the
honesty is part of the story.

### Constraints

- Use only the terms Hoist, Toolbox, and generic descriptions like "a real-time
  trading-screen workload" - do not invent client or company names.
- Prefer charts generated from the attached JSON over decorative imagery.
- 10-14 slides.
