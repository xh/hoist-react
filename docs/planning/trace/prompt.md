# Distributed Tracing for Hoist React

## Goal

Design and implement client-side distributed tracing in **hoist-react**, built on the
**W3C Trace Context** standard and the browser **Performance API**. The browser creates spans for
user actions and high-level operations, sends the `traceparent` header on fetch calls so that
**server-side request root spans become children of client spans**, and exports completed spans to
the Hoist server for relay to the configured collector.

This is the client-side complement to the hoist-core tracing work. Together, they produce end-to-end
traces that begin in the browser (user click → fetch → server processing → response) and flow
through to backend services.

---

## Context: Existing Infrastructure (follow these patterns closely)

Hoist React already has several systems that the tracing work should integrate with and mirror:

| Concern | Existing | Tracing (new) |
|---|---|---|
| **HTTP requests** | `FetchService` — centralized fetch wrapper with headers, interceptors, correlation IDs | Inject `traceparent` header; create fetch spans automatically |
| **Activity tracking** | `TrackService` — batched client activity log sent to `xh/track` | New `TracingService` for span lifecycle; export spans via dedicated endpoint |
| **Client health** | `ClientHealthService` — periodic health metrics | Tracing status included in health report |
| **Config access** | `ConfigService` / `XH.getConf()` — server-provided soft configs | Read `xhTracingConfig` for client-side settings |
| **App lifecycle** | `AppStateModel` — tracks PRE_AUTH → RUNNING with timing | App load span from `_xhLoadTimestamp` through RUNNING |
| **Navigation** | `RouterModel` — Router5-based routing | No auto-spans — route change is instantaneous; data loading captured by app `withSpanAsync` + fetch spans |
| **Correlation IDs** | `FetchService.correlationId` — per-request tracking | Replace/complement with W3C `traceparent` propagation |

Key source files to study:
- `svc/FetchService.ts` — HTTP layer, interceptors, correlation IDs
- `svc/TrackService.ts` — batched activity export pattern
- `svc/ClientHealthService.ts` — periodic reporting pattern
- `appcontainer/AppStateModel.ts` — app lifecycle and timing
- `core/HoistService.ts` — service base class and conventions

---

## Requirements

### 1. TracingService — Central Client-Side Tracing Service

A new `TracingService` singleton that manages the span lifecycle, trace context, and span export.

```typescript
// TracingService — installed as a core Hoist service
// Available as XH.tracingService and via convenience methods on XH

// Configuration driven by server-side xhTracingConfig soft config
// Client reads the 'enabled' and 'sampleRate' fields — exporter config is server-side only,
// since the client exports spans to the Hoist server (not directly to the collector).
```

**Core API:**

```typescript
class TracingService extends HoistService {

    /** Is client-side tracing currently enabled? */
    get enabled(): boolean

    /**
     * Create a span wrapping a synchronous operation.
     * Automatically handles timing, error recording, and parent/child nesting.
     */
    withSpan<T>(name: string, fn: () => T): T
    withSpan<T>(name: string, attrs: PlainObject, fn: () => T): T

    /**
     * Create a span wrapping an async operation.
     * Automatically handles timing, error recording, and parent/child nesting.
     */
    async withSpanAsync<T>(name: string, fn: () => Promise<T>): Promise<T>
    async withSpanAsync<T>(name: string, attrs: PlainObject, fn: () => Promise<T>): Promise<T>

    /**
     * Get the current active span, if any.
     * Useful for adding attributes or events to the current span from anywhere in the call stack.
     */
    get activeSpan(): Span

    /**
     * Generate a W3C traceparent header value for the current trace context.
     * Returns null if no active span or tracing is disabled.
     */
    get traceparent(): string
}
```

**Convenience on XH:**

```typescript
// Parallel to XH.track(), XH.fetchJson(), etc.
await XH.withSpanAsync('loadPortfolio', async () => { ... })
await XH.withSpanAsync('loadPortfolio', {fund: 'ABC'}, async () => { ... })
XH.withSpan('computeTotals', () => { ... })
```

**`Promise.span()` — chainable span for promises:**

Parallel to the existing `Promise.track()`, a `.span()` method on the Promise prototype that
wraps a promise in a span. The span starts when `.span()` is called and ends when the promise
settles. Useful when you already have a promise and want to add tracing in a chain:

```typescript
// Chain style — single-promise tracing
this.loadDataAsync()
    .span('loadPortfolio')
    .catchDefault();

// With attributes
this.loadDataAsync()
    .span('loadPortfolio', {fund: 'ABC'})
    .catchDefault();
```

Use `.span()` for single-promise chains, `withSpanAsync` for multi-step blocks — same
relationship as `.track()` has to `XH.track()`.

### 2. Trace Context Propagation via FetchService

The primary integration point. When tracing is enabled, `FetchService` must automatically inject
the W3C `traceparent` header on outgoing requests so the server's request root span becomes a
child of the client span.

**Implementation approach — use `addDefaultHeaders`:**

```typescript
// In TracingService.initAsync(), register a default header provider:
XH.fetchService.addDefaultHeaders((opts: FetchOptions) => {
    const traceparent = this.traceparent;
    return traceparent ? {traceparent} : {};
});
```

This is clean, non-invasive, and uses an existing FetchService extension point. No changes to
FetchService itself are required for header injection.

**Automatic fetch spans:**

In addition to injecting headers, create a span for each fetch call. Use a `FetchInterceptor` to
wrap the request lifecycle:

```typescript
// Conceptual — TracingService registers an interceptor that:
// 1. Creates a span before the fetch (name: 'fetch ' + method + ' ' + url path)
// 2. Records HTTP status, response size as span attributes
// 3. Marks the span as errored if the fetch fails
// 4. Ends the span on completion
```

The fetch span is the client-side analog of hoist-core's "outbound HTTP span" (Layer 3), but
created by the browser. The server's request root span nests under it via `traceparent`.

### 3. Span Model

A lightweight span representation for client-side use. No need for the full OpenTelemetry SDK in the
browser — implement a minimal span model that produces W3C-compatible trace/span IDs.

```typescript
interface Span {
    traceId: string        // 32 hex chars (128-bit)
    spanId: string         // 16 hex chars (64-bit)
    parentSpanId: string   // 16 hex chars, or null for root spans
    name: string
    startTime: number      // epoch ms (Date.now()-based) for collector alignment
    endTime: number        // epoch ms
    duration: number       // ms (endTime - startTime)
    status: 'ok' | 'error' | 'unset'
    attributes: PlainObject
    events: SpanEvent[]    // e.g. exceptions
    source: 'hoist' | 'app'
}

interface SpanEvent {
    name: string
    timestamp: number
    attributes?: PlainObject
}
```

**ID generation:** Use `crypto.getRandomValues()` for trace and span IDs — fast and
cryptographically random. No external library needed.

**Parent-child nesting:** Maintain a stack of active spans (async-aware). When `withSpan` is called
inside another `withSpan`, the inner span automatically becomes a child. Use a simple context
variable (module-scoped or on the service) — browser JS is single-threaded, so no thread-local
storage is needed. However, care is required around async boundaries — see Requirement 7.

### 4. Span Export to Hoist Server

Client spans are sent to the Hoist server, which relays them to the configured collector. This
avoids requiring the browser to know collector endpoints and keeps all exporter configuration
server-side.

**Export endpoint:** `POST xh/submitSpans` — a new endpoint on hoist-core's `TracingController`
that accepts an array of client spans and forwards them to the configured exporter.

**Batching:** Follow `TrackService`'s pattern — buffer completed spans and flush on a debounced
interval (e.g. 5–10 seconds) and on `beforeunload`.

```typescript
// Export payload shape
{
    spans: [
        {
            traceId: "abc123...",
            spanId: "def456...",
            parentSpanId: "ghi789..." | null,
            name: "fetch POST portfolioService/load",
            startTime: 1710000000000,    // epoch ms
            endTime: 1710000000250,
            duration: 250,
            status: "ok",
            attributes: {
                "http.method": "POST",
                "http.url": "/api/portfolioService/load",
                "http.status_code": 200,
                "source": "hoist"
            },
            events: []
        }
    ]
}
```

**Timestamps:** Span `startTime` and `endTime` must be wall-clock epoch milliseconds
(`Date.now()`-based), not `performance.now()` relative values. The collector assembles traces
from spans arriving at different times from different sources (client, server, downstream
services) — epoch timestamps are required for alignment. Batched, out-of-order delivery is
normal and expected; the collector reconstructs the trace tree from `traceId`/`parentSpanId`
relationships and absolute timestamps, not arrival order.

**`beforeunload` flush:** Use `navigator.sendBeacon()` for reliable delivery on page unload,
falling back to synchronous fetch if `sendBeacon` is unavailable.

### 5. Built-In Hoist Internal Spans

Tracing works in three layers on the client, mirroring the server's three-layer model.

### Layer 1: User Action / Navigation Spans (automatic, Hoist framework)

Automatic spans representing the app bootstrap, broken into phases that map directly to
`AppStateModel`'s existing state transitions:

```
[app-load]                          ← root span, _xhLoadTimestamp → RUNNING
  ├─ [pre-auth]                     ← PRE_AUTH → AUTHENTICATED (includes SSO redirects)
  ├─ [hoist-init]                   ← core Hoist service installation
  └─ [app-init]                     ← AppModel.initAsync() (app service installation + setup)
```

- **`app-load`:** Root span from `window._xhLoadTimestamp` through `AppState.RUNNING`,
  capturing the full bootstrap duration.
- **`pre-auth`:** Time spent in authentication, including any SSO redirects or login flows.
  This can dominate load time and is valuable to isolate.
- **`hoist-init`:** Core Hoist service installation — framework overhead.
- **`app-init`:** `AppModel.initAsync()` — app-level service installation and setup.

All tagged `source: 'hoist'`.


### Layer 2: Business Operation Spans (manual, application developers)

Developers instrument significant operations in their models and services:

```typescript
// In an app model or service
async loadPortfolioAsync() {
    await XH.withSpanAsync('loadPortfolio', {fund: this.selectedFund}, async () => {
        const positions = await this.loadPositionsAsync();
        const analytics = await this.computeAnalyticsAsync(positions);
        this.setPositions(positions, analytics);
    });
}
```

These nest as children of the navigation or user action span if one is active. Tagged
`source: 'app'`.

### Layer 3: Fetch Spans (automatic, Hoist framework)

Every `FetchService` call gets an automatic span (see Requirement 2). These nest under whatever
business span is active, creating the full picture:

```
[loadPortfolio]                              ← Layer 2 (app developer)
  ├─ [fetch POST portfolioService/load]      ← Layer 3 (auto)
  │    └─ [server: request root]             ← hoist-core Layer 1
  │         └─ [server: loadPositions]       ← hoist-core Layer 2
  └─ [fetch POST analyticsService/compute]   ← Layer 3 (auto)
       └─ [server: request root]             ← hoist-core Layer 1
```

Tagged `source: 'hoist'`.

### What NOT to auto-instrument

- Route transitions — instantaneous state changes; data loading is captured by `withSpanAsync`
  and fetch spans.
- Individual MobX reactions/computations — too granular, too noisy.
- Timer ticks and auto-refresh cycles — covered by existing metrics/tracking.
- Component renders — use React DevTools for this.
- WebSocket messages — these are typically high-frequency heartbeats.


### 6. Configuration

Client-side tracing is controlled by the **same `xhTracingConfig` soft config** used by hoist-core.
The client reads the fields it needs:

```json
{
    "enabled": true,
    "sampleRate": 1.0,
    "clientEnabled": true
}
```

| Field | Client reads? | Purpose |
|---|---|---|
| `enabled` | Yes | Master switch — if false, no tracing anywhere |
| `sampleRate` | Yes | Sampling rate applied to new root spans |
| `clientEnabled` | Yes | Client-specific switch — allows disabling client spans while keeping server tracing |
| `otlpConfig`, `zipkinConfig` | No | Server-side only — client exports to Hoist server |

**Sampling:** When starting a new root span (no active parent), apply the configured `sampleRate`
using a random check. If the trace is sampled out, `withSpan` still executes the wrapped function
but does not create or export a span. If joining an existing trace (parent span is active),
always participate — sampling decisions are made at the root only.

### 7. Async Context Propagation

Browser JavaScript is single-threaded, but async operations interleave. The tracing context must
be correctly maintained across `await` boundaries.

**Approach:** Use a simple context stack on `TracingService`:

```typescript
// Simplified — the active span is tracked as a stack
private _spanStack: Span[] = [];

get activeSpan(): Span {
    return this._spanStack[this._spanStack.length - 1] ?? null;
}

async withSpanAsync<T>(name: string, attrs: PlainObject, fn: () => Promise<T>): Promise<T> {
    const span = this.startSpan(name, attrs);
    this._spanStack.push(span);
    try {
        const result = await fn();
        span.status = 'ok';
        return result;
    } catch (e) {
        span.status = 'error';
        span.events.push({name: 'exception', timestamp: performance.now(), attributes: {message: e.message}});
        throw e;
    } finally {
        span.endTime = performance.now();
        span.duration = span.endTime - span.startTime;
        this._spanStack.pop();
        this.exportSpan(span);
    }
}
```

**Important caveat:** A simple stack works correctly for *sequential* async operations (one
`await` after another within a single `withSpanAsync`). It does **not** correctly handle concurrent
async operations that independently create spans (e.g. `Promise.all([withSpanAsync(...),
withSpanAsync(...)]`), because the stack-based lookup cannot distinguish which branch of
execution is "current" — browsers lack `AsyncLocalStorage` or equivalent.

For the rare concurrent case, support an explicit `parent` override in the attrs object:

```typescript
await XH.withSpanAsync('loadDashboard', async (span) => {
    await Promise.all([
        XH.withSpanAsync('loadPositions', {parent: span}, async () => { ... }),
        XH.withSpanAsync('loadOrders', {parent: span}, async () => { ... })
    ]);
});
```

This does not affect the simple sequential case — if `parent` is not provided, the stack-based
lookup applies as usual. The `withSpanAsync` callback receives the current span as its argument
to make this pattern easy.

### 8. Standard Span Attributes

All client spans include a consistent set of attributes, following OpenTelemetry semantic
conventions where applicable:

**On every span:**

| Attribute | Value | Notes |
|---|---|---|
| `source` | `'hoist'` or `'app'` | Mirrors hoist-core convention |

**On fetch spans (Layer 3):**

| Attribute | Value | Notes |
|---|---|---|
| `http.method` | `GET`, `POST`, etc. | OTel HTTP semantic convention |
| `http.url` | Request URL (path only, no origin) | Relative to app base |
| `http.status_code` | Response status | OTel HTTP semantic convention |

**Client metadata** (sent with the export batch, not per-span — avoids repetition):

| Field | Source | Notes |
|---|---|---|
| `appCode` | `XH.appCode` | Maps to `service.name` resource attribute server-side |
| `clientAppCode` | `XH.clientAppCode` | Distinguishes desktop/mobile/admin |
| `appVersion` | `XH.appVersion` | Maps to `service.version` |
| `loadId` | `XH.loadId` | Unique per page load |
| `tabId` | `XH.tabId` | Unique per browser tab |
| `username` | `XH.getUsername()` | Current user |

### 9. Relationship to Existing Correlation IDs

`FetchService` already supports correlation IDs via the `X-Correlation-ID` header. With tracing
enabled, `traceparent` provides a strictly superior mechanism — the correlation ID is effectively
the `traceId` + `spanId`.

**Approach:**
- When tracing is enabled, `traceparent` replaces `X-Correlation-ID` as the primary request
  correlation mechanism.
- When tracing is disabled, existing correlation ID behavior is unchanged.
- `TrackService` entries should include `traceId` when available, enabling correlation between
  activity logs and traces.

### 10. Interaction with Page Visibility and App Suspension

- **Page hidden/frozen:** Do not create new root spans when the page is not visible
  (`!XH.pageIsVisible`). Ongoing spans should still complete normally.
- **App suspended (idle):** Flush any pending spans before suspension. On resume, start fresh —
  do not carry stale trace context across suspension boundaries.
- **`beforeunload`:** Flush pending spans via `navigator.sendBeacon()`.

### 11. No External Dependencies

Do not add OpenTelemetry SDK packages to hoist-react. The client-side implementation should be
lightweight and self-contained:

- **Span model:** Simple TypeScript interfaces and classes (see Requirement 3).
- **ID generation:** `crypto.getRandomValues()` — built into all modern browsers.
- **Timing:** `performance.now()` for high-resolution timestamps.
- **Export:** JSON over `FetchService` / `sendBeacon` to the Hoist server.

The server side (hoist-core) already has the full OTel SDK and handles conversion to OTLP format
for export to collectors. The client just needs to produce well-structured span data.

---

## Implementation Standards

All new code must follow hoist-react's established conventions. Study the existing codebase —
particularly `FetchService`, `TrackService`, `ClientHealthService`, and `ConfigService` — as
the direct templates for this work.

### Code Style and Conventions

- **TypeScript strict mode** — all new files must compile cleanly with the project's existing
  `tsconfig.json` settings.
- **`HoistService`** base class for the new service, following the singleton pattern
  (`static instance: TracingService`).
- **Hoist copyright header** on all new files (see any existing file for the template).
- **Javadoc-style comments** on public API methods and properties, following the patterns in
  `FetchService` and `TrackService`.

### Service Patterns (follow `TrackService` exactly)

- Extend `HoistService`. Use `initAsync()` for startup registration (interceptors, event
  listeners).
- Config access via `XH.getConf('xhTracingConfig', {})` — same pattern as `TrackService.conf`.
- Debounced batched export — same pattern as `TrackService.pushPendingBuffered()`.
- `beforeunload` listener for reliable flush — same as `TrackService`.

### File Location

- `svc/TracingService.ts` — the service itself, alongside `TrackService.ts` and
  `FetchService.ts`.
- `svc/tracing/` — supporting types and utilities if needed (Span model, ID generation), but
  prefer keeping everything in the single service file if it stays manageable.

### Integration Points (non-invasive)

Prefer using existing extension points over modifying existing files:

- **FetchService:** Use `addDefaultHeaders()` and `addInterceptor()` — no changes to
  FetchService.ts needed.
- **AppStateModel:** Read timing data from the model after RUNNING — no changes needed.
- **`promise/Promise.ts`:** Add `.span()` to the Promise prototype, following the existing
  `.track()` implementation as a direct template.

If changes to existing files are necessary (e.g. adding a convenience method to `XH`), keep them
minimal.

### DRY and Readability

- **No duplicated logic**: If span export follows the same batching pattern as `TrackService`,
  consider whether the pattern can be shared. But do not over-abstract — if the two services
  diverge in details (different endpoints, different payload shapes), keeping them independent
  is fine.
- **Minimal new files**: One service file plus supporting types. Do not create a parallel
  class hierarchy or plugin system.
- **Readable TypeScript**: Use clear type annotations on public APIs. Internal implementation
  can use inference where types are obvious.

---

## Deliverables

1. **`TracingService`** — Central service: span lifecycle, context propagation, config-driven
   enable/disable, batched export.
2. **Span model** — TypeScript types for `Span`, `SpanEvent`, and W3C-compatible ID generation.
3. **FetchService integration** — Automatic `traceparent` injection and fetch span creation via
   existing `addDefaultHeaders` / `addInterceptor` extension points.
4. **App load span** — Bootstrap-to-RUNNING timing captured as the initial trace.
5. **XH convenience methods** — `XH.withSpan()`, `XH.withSpanAsync()`, and `XH.tracingService` accessors.
6. **`Promise.span()`** — Chainable span method on the Promise prototype, paralleling `Promise.track()`.
7. **Span export** — Batched JSON export to `xh/submitSpans` with `sendBeacon` fallback.
8. **Server-side endpoint** — `xh/submitSpans` on hoist-core to accept and relay client spans
   (coordinate with hoist-core tracing work — may be a separate deliverable).

---

## Out of Scope (for now)

- **Full OpenTelemetry SDK in browser** — too heavy; use lightweight custom spans.
- **User interaction spans** (click, input) — too granular for initial release. Can be added
  later as opt-in instrumentation.
- **Web Vitals / Core Web Vitals** — separate concern, better handled by dedicated libraries.
- **WebSocket message tracing** — high-frequency heartbeats would generate excessive spans.
- **Service Worker / Web Worker tracing** — not used by Hoist apps currently.
- **Visual trace waterfall in admin console** — traces are analyzed in Datadog/Grafana/Zipkin.
