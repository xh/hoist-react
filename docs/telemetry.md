# Telemetry & Observability

Hoist provides integrated client-side observability across four concerns:

- **Tracing** — distributed-trace spans for user actions, loads, and fetch calls, exported to
  the Hoist server and on to an OpenTelemetry collector.
- **Activity tracking** — business/usage events recorded to the server's activity log.
- **Metrics** — named timers and counters aggregated into the server's Micrometer registry.
- **Timed logging** — console timing of operations during development.

All four are composed through a single fluent entry point — the **`Runner`** chain on
`HoistBase` — so the same call site can span, log, track, mask, and meter a unit of work without
repetitive boilerplate.

> **Scope.** This document covers the client-side APIs. Span sampling and export, metric
> registration, and the server endpoints live in hoist-core — see its documentation for
> server-side configuration. For the required/recommended hoist-core pairing, see
> [Version Compatibility](./version-compatibility.md).

## The Runner chain

`HoistBase.runner(ctx?)` returns a `Runner` — a fluent builder that wraps a unit of async work
with optional observability, ending in a terminal that executes the work:

```typescript
await this.runner({loadSpec})
    .span('loadPortfolio')                       // trace span
    .linkTo(this.loadModel)                      // mask UI via a TaskObserver
    .track({category: 'Portfolio', message: 'Loaded portfolio'})
    .run(async ctx => {                          // terminal — receives the CallContext
        const positions = await XH.fetchJson({url: 'portfolio/positions'}, ctx);
        this.setPositions(positions);
    });
```

**Builder methods** (all optional, chain in any order):

| Method | Purpose |
|--------|---------|
| `span(name \| SpanConfig)` | Open a trace span around the work. |
| `logInfo(msgs)` / `logDebug(msgs)` | Time the work and log on completion (via `withInfo`/`withDebug`). |
| `track(opts \| message)` | Record an activity-tracking event with timing. |
| `linkTo(spec)` | Link to a `TaskObserver` for loading masks / progress messages. |
| `counter(name, tags?)` / `timer(name, tags?)` | Record a metric on completion (see [Metrics](#metrics)). |

**Terminal methods** (exactly one, executes the work):

| Terminal | Use |
|----------|-----|
| `run(fn)` | Run an arbitrary async `fn`, which receives the `CallContext`. |
| `fetch()` / `fetchJson()` / `getJson()` / `postJson()` / `putJson()` / `patchJson()` / `deleteJson()` | Shortcut to issue a single fetch under the chain — no manual context wiring. |

### CallContext

The `ctx` flowing through the chain is a **`CallContext`** — `{span, loadSpec}` — that carries
trace and load state across call boundaries. Apps don't construct it directly; pass a plain
**`CallContextLike`** literal (`{span?, loadSpec?}`) to `runner()` (or to a fetch method's second
argument) and the framework normalizes it.

```typescript
// Continue an existing context received from an upstream caller, nesting a child span:
async loadDetailAsync(ctx: CallContext) {
    return this.runner(ctx).span('detail').fetchJson({url: 'portfolio/detail'});
}
```

The framework wires the span's `parent` (from the chain's context, or `loadSpec.span`) and
`caller` (the `HoistBase` that started the chain, driving the `code.namespace` tag) automatically.

### telemetryPrefix

Set `telemetryPrefix` on a `HoistBase` subclass to namespace every span (and metric) name it
emits — the prefix is prepended with a `.` separator:

```typescript
class PortfolioService extends HoistService {
    override telemetryPrefix = 'myApp.portfolio';
    // runner().span('load') → span named 'myApp.portfolio.load'
}
```

Hoist's own framework classes use `xh.client.*` prefixes (e.g. `xh.client.auth`,
`xh.client.app`). Apps should adopt their own top-level namespace.

## Tracing

Tracing is provided by **`TraceService`** (`XH.traceService`) and controlled by the
`xhTraceConfig` soft config. **It is disabled by default** — when off, spans are still created
and passed to your code (so you can interact with `ctx.span` without null checks), but they are
flagged unsampled and never exported.

Each span carries auto-applied tags (client app code, load/tab IDs, user, `code.namespace`,
and `xh.source` of `'hoist'` or `'app'`). Supply your own via `SpanConfig`:

| `SpanConfig` field | Type | Description |
|--------------------|------|-------------|
| `name` | `string` | Span name (required). Combined with `telemetryPrefix` if set. |
| `kind` | `SpanKind` | `'internal'` (default), `'client'`, `'server'`, `'producer'`, `'consumer'`. |
| `tags` | `PlainObject` | Key/value attributes. Set a value to `null` to suppress a default tag. |
| `parent` | `Span \| string` | A live `Span` (in-process nesting) or a W3C `traceparent` string (remote). Usually omitted — nesting is derived from the call context. |

Exceptions thrown during a traced operation are stamped with the span's `traceId` for
correlation with server-side traces.

### Sampling

Spans are sampled **at creation (head-based)** using `xhTraceConfig.sampleRules` — an ordered
list of `{match, sampleRate}` rules. `match` is a map of tag keys to glob patterns (`*` = any,
`foo*` = prefix, `*foo` = suffix, `*foo*` = contains); the reserved key `name` matches the span
name. The first matching rule's `sampleRate` wins, falling back to a top-level `sampleRate`.
Child spans inherit their root's decision.

### Joining a remote trace

To continue a trace started elsewhere (a `traceparent` received off-channel via WebSocket, SSE,
or a queue message), pass the string as the span `parent`:

```typescript
this.runner().span({name: 'processMessage', parent: incomingTraceparent}).run(...);
```

The new span adopts the remote `traceId`, `parentSpanId`, and sampling decision. Malformed
traceparents are ignored and the span becomes a root.

## Activity tracking

Activity tracking records business/usage events (with timing) to the server's activity log,
viewable in the Admin Console. Choose the form that fits the call site:

```typescript
// In a Runner chain — preferred when also spanning/masking/logging:
await this.runner().track({category: 'Export', message: 'Exported report'}).run(fn);

// As a FetchService option — convenient for a one-off tracked request:
await XH.fetchJson({url: 'api/report', track: 'Generated report'});

// As a Promise extension — for a standalone async op with no Runner chain:
await this.processRecordsAsync(records).track('Processed records');

// Fire-and-forget event — no operation to time:
XH.track('Opened settings dialog');
```

## Metrics

`MetricsService` (`XH.metricsService`) records named timers and counters, debouncing batches to
the server's Micrometer registry. The fluent way to record is via the `Runner` chain:

```typescript
// Record elapsed time + a success/failure count for a unit of work
await this.runner()
    .timer('myApp.portfolio.loadTime')
    .counter('myApp.portfolio.loadCount')
    .run(() => this.loadPositionsAsync());
```

Both attach an `xh.outcome` tag (`success` / `failure`) based on whether the work threw, making
it trivial to slice by success rate. Direct `XH.metricsService.recordTimer()` /
`recordCount(name, value?, tags?)` calls are available for cases outside a chain.

## Threading context

Tracing relies on **explicitly threading `ctx`** through nested work — there is no automatic
async-context propagation in the browser (Node's `AsyncLocalStorage` is unavailable, and the
TC39 `AsyncContext` proposal has not yet shipped). The framework does this for you at the load
seam (`doLoadAsync`'s `loadSpec` carries the span) and within the chain's terminal; you only
thread manually when nesting further work.

```typescript
// ✅ Do: thread the ctx into nested fetches/runners so they nest under the span
await this.runner({loadSpec}).span('load').run(async ctx => {
    const ids = await XH.fetchJson({url: 'api/ids'}, ctx);
    await this.runner(ctx).span('detail').run(c => this.loadDetailAsync(ids, c));
});

// ❌ Don't: drop ctx — the fetch/child starts a NEW root span, detached from 'load'
await this.runner({loadSpec}).span('load').run(async ctx => {
    const ids = await XH.fetchJson({url: 'api/ids'});           // orphaned
    await this.runner().span('detail').run(...);                // orphaned
});
```

**Avoid:** building a synchronous "current span" global to dodge the threading. It would be
silently *wrong* across `await` boundaries (worse than an explicit omission). Explicit-but-
forgettable beats ambient-but-wrong until a real propagation primitive lands.

## Best practices

- **Set `telemetryPrefix`** on your app's base model/service classes so names are consistently
  namespaced.
- **Name spans for the operation** (`'loadPortfolio'`, `'deleteFiles'`), not generically.
- **Thread `ctx` into nested fetches and runners** so their spans nest under the parent. Neither
  the linter nor the types catch a dropped `ctx` - it silently yields an orphaned span - so be
  deliberate (see [Common pitfalls](#common-pitfalls)).
- **Prefer the fetch-shortcut terminals** (`runner().span(...).fetchJson(...)`) for a span that
  wraps a single fetch — no manual `ctx` at all.
- **Compose, don't chain off the raw promise.** Use the chain's `.linkTo()` / `.track()` /
  `.logInfo()` builder methods rather than chaining the equivalent promise extensions off a bare
  `fetchJson(...)`.

## Common pitfalls

### Orphaned spans from a dropped context

Forgetting to thread `ctx` into a nested fetch or runner produces a detached root span instead of
a child — silently, with no error. See [Threading context](#threading-context).

### Using deprecated fetch/span APIs

`HoistBase.withSpan()` and the `FetchOptions.span` / `loadSpec` fields are **deprecated** (removal
in **v88**). Use `runner().span(...)` and pass context via the fetch method's second argument:

```typescript
// ❌ Don't (deprecated)
await XH.fetchJson({url: 'api/data', loadSpec});

// ✅ Do
await XH.fetchJson({url: 'api/data'}, {loadSpec});
```

### Expecting metrics without the server endpoint

Recorded counters/timers silently go nowhere on hoist-core < 40.0.1. Treat client metrics as
recommended-only until that pairing is in place.

## Reference implementations

Two framework files model these patterns end-to-end:

- **`desktop/cmp/rest/data/RestStore.ts`** — load + CRUD + bulk operations, each spanned with
  context threaded into the fetch and linked to a load observer.
- **`admin/tabs/cluster/instances/logs/LogViewerModel.ts`** — instrumenting user actions
  (including a masked mutation and a raw binary `XH.fetch` download) alongside a load.

## Related

- [`/svc/`](../svc/README.md) — `FetchService`, `TraceService`, `MetricsService`, `TrackService`.
- [`/core/`](../core/README.md) — `HoistBase.runner()`, `telemetryPrefix`.
- [`/promise/`](../promise/README.md) — the `linkTo` / `track` / `catchDefault` extensions the
  Runner composes.
- [Version Compatibility](./version-compatibility.md) — hoist-core pairing for tracing/metrics.
