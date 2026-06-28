# Transport / Pattern Inventory (INV-04)

**Date:** 2026-06-28
**Phase:** 1 - Current-State Inventory
**Requirement:** INV-04

## Purpose

Adaptability across client transports is an overarching principle of this project. The Phase 2
harness must parameterize the change-delivery transport (HARN-02), and any Data 2.0 path must stay
transport-agnostic rather than tuned to one delivery mechanism. This document inventories every
update-delivery transport and pattern the data layer must support, and - critically - states for
each how `Cube`/`Store` ingest adapts: which ingest API receives the data, and in what shape.

The key finding that makes transport-agnosticism achievable is set out in
[The invariant ingest contract](#the-invariant-ingest-contract): regardless of transport, ingest
collapses to exactly two operations - a full snapshot or an incremental diff. Transport choice
governs *how data arrives*; it does not change *where data lands*.

**Framing correction from validation.** The local sample apps available for inspection happen to
use HTTP poll-then-diff and WebSocket-as-notification, and an earlier validation draft over-read
that as "poll-then-diff, NOT WebSocket push." That was an over-read of a narrow slice. WebSocket
**data push** via `XH.webSocketService` is a first-class, strategically important Hoist capability
used heavily in client apps not checked out locally; it must not be written out of the story or
under-weighted relative to the samples. See `KICKOFF-VALIDATION.md` §1 and
`validation/C-real-usage.md` §3.

---

## The ingest substrate (the constant all transports feed into)

Every transport ultimately resolves to one of two `Cube` entry points, which delegate to the
equivalent `Store` methods and then fan out to connected `View`s. This is the fixed target; the
transports above it are interchangeable.

### Full snapshot - `Cube.loadDataAsync()`

```typescript
// data/cube/Cube.ts:282-286
async loadDataAsync(rawData: PlainObject[], info: PlainObject = {}): Promise<void> {
    this.store.loadData(rawData);
    this.setInfo(info);
    await forEachAsync(this._connectedViews, v => v.noteCubeLoaded());
}
```

Takes a flat array of leaf-level rows and **fully replaces** the dataset. It delegates to
`Store.loadData()` (`data/Store.ts:387-407`), which builds a new committed record set
(`this._committed = this._current = this._committed.withNewRecords(records)`,
`data/Store.ts:403`) - so records absent from the new array are dropped. It then iterates
`_connectedViews` and calls `view.noteCubeLoaded()` on each. The fan-out is `await`-ed via
`forEachAsync` specifically to avoid locking up the browser when many expensive views are attached
(`data/cube/Cube.ts:277-279`).

### Incremental diff - `Cube.updateDataAsync()`

```typescript
// data/cube/Cube.ts:299-314
async updateDataAsync(
    rawData: PlainObject[] | StoreTransaction,
    infoUpdates: PlainObject = {}
): Promise<void> {
    const changeLog = this.store.updateData(rawData);   // delegate to Store
    const hasInfoUpdates = !isEmpty(infoUpdates);
    if (hasInfoUpdates) this.setInfo({...this.info, ...infoUpdates});
    if (changeLog || hasInfoUpdates) {
        await forEachAsync(this._connectedViews, v => v.noteCubeUpdated(changeLog));
    }
}
```

Takes either a flat array **or** a structured `StoreTransaction`, and applies an
**incremental upsert + delete** rather than a full replace. It delegates to `Store.updateData()`
(`data/Store.ts:433`), which - unlike `loadData()` - leaves records that are *not* mentioned in
the transaction in place (`data/Store.ts:418-419`). The connected-view fan-out runs only when there
is an actual change (`if (changeLog || hasInfoUpdates)`).

The accepted shapes are (`data/Store.ts:170-193`):

```typescript
interface StoreTransaction {
    update?: PlainObject[];                       // matched to existing records by id
    add?: Array<PlainObject | ChildRawData>;      // new records (optionally under a known parent)
    remove?: StoreRecordId[];                      // ids to delete (descendants also removed)
    rawSummaryData?: Some<PlainObject>;            // summary/root-aggregate update
}
```

If a flat array is passed instead of a `StoreTransaction`, `Store.updateData()` splits it into
`update` vs `add` by testing each row's id against existing records (`data/Store.ts:440-457`) - so
the array form can express adds and updates but **not** deletes. Deletes require the explicit
`{remove: [...]}` transaction form.

### Store-level equivalents

`Cube.loadDataAsync` / `updateDataAsync` are thin wrappers over the store-level primitives, which
applications also use directly when feeding a `GridModel.store` outside of a Cube:

| Cube method               | Delegates to                              | Semantics                                  |
| ------------------------- | ----------------------------------------- | ------------------------------------------ |
| `Cube.loadDataAsync()`    | `Store.loadData()` (`data/Store.ts:387`)  | Full replacement of the committed record set |
| `Cube.updateDataAsync()`  | `Store.updateData()` (`data/Store.ts:433`) | Transactional add / update / remove        |

(`GridModel.loadData()` and `GridModel.updateData()` proxy to the grid's own `Store` in the same
way - relevant because one common pattern feeds query results straight into a grid store rather than
into a Cube; see [HTTP snapshot/diff](#1-http-snapshotdiff-poll-then-diff).)

### The `isPartial` decision point

Every transport ultimately resolves to one question: **is this delivery a full snapshot or a
partial diff?** A representative server contract returns a flag indicating which, and the client
routes accordingly:

```typescript
// representative poll-then-diff handler (generalized from sample-app usage)
if (!isPartial) {
    await cube.loadDataAsync(cubeData);     // full replace
} else {
    await cube.updateDataAsync(cubeData);   // incremental upsert + delete
}
```

This snapshot-vs-diff fork is the universal contract every transport below resolves to (see
`validation/C-real-usage.md` §2d for the grounded example).

---

## The WebSocket service surface

WebSocket data push and WebSocket-as-notification both ride on `XH.webSocketService`
(`svc/WebSocketService.ts`). The relevant public surface:

- **`subscribe(topic, fn): WebSocketSubscription`** (`svc/WebSocketService.ts:122-133`) - registers
  a handler for inbound messages on an application-specific topic. Returns a `WebSocketSubscription`
  the caller is expected to retain (ideally via a `@managed` property) so it is disposed on
  destroy.
- **`unsubscribe(subscription)`** (`svc/WebSocketService.ts:139-144`) - cancels a subscription;
  `WebSocketSubscription.destroy()` (`svc/WebSocketService.ts:381-383`) calls through to it.
- **`sendMessage(message)`** (`svc/WebSocketService.ts:149-158`) - sends a message back to the
  server over the same socket. Explicitly *not* recommended over plain Ajax for ordinary requests.
- **`connected`** (`svc/WebSocketService.ts:66-68`) and **`channelKey`**
  (`svc/WebSocketService.ts:60`) - observable connection state. The server assigns a unique
  `channelKey` per user + client-app instance, which the app passes in server requests so the
  server can target pushes to this specific connection (`svc/WebSocketService.ts:18-22`).

The message shape is minimal (`svc/WebSocketService.ts:386-389`):

```typescript
interface WebSocketMessage {
    topic: string;
    data?: any;     // arbitrary - data payload OR lightweight notification metadata
}
```

The crucial point: **`data` is opaque.** Whether `data` carries the dataset itself (push) or just a
"refresh ready" signal (notification) is an application-level convention, not a service-level
distinction. The service merely decodes the JSON, dispatches by topic to subscribers
(`svc/WebSocketService.ts:266-299`), and applies a few built-in Hoist topics (heartbeat,
registration, force-suspend). This is precisely why the same transport supports the two very
different patterns documented below.

---

## The transports / patterns

### Asymmetric control

Throughout, note **who controls the transport**. For a Hoist-fronted Grails server, the delivery
shape is *ours to shape* - we can choose snapshot vs diff, batch size, push vs poll, and the wire
contract. For a client-owned upstream system (a SignalR hub, a fixed vendor feed), the transport is
*fixed* and Hoist must adapt to whatever it presents. The adaptability principle (PROJECT.md):
broadly-adopted solutions must work across transports; transport-specific optimizations are valuable
but must be labeled **conditional**, not the default path.

### 1. HTTP snapshot/diff (poll-then-diff)

**What it is.** The client periodically fetches over HTTP. The server returns either a full
snapshot or a partial diff, signaled by an `isPartial`-style flag (often alongside a
`lastRefreshed` timestamp the client sends so the server can compute the delta).

**Control.** Ours, when the server is a Hoist/Grails backend - we define the snapshot-vs-diff
contract and the diff shape.

**How it reaches ingest.** This is the snapshot-vs-diff fork made literal: full snapshot ->
`cube.loadDataAsync(data)`; partial diff -> `cube.updateDataAsync(data)` (which may be a flat array
of upserts, or a `{update, add, remove}` transaction when deletes are involved). When the app feeds
a grid store directly rather than a Cube, the same fork lands at `gridModel.loadData()` vs
`gridModel.updateData()`.

**Notes.** This is the dominant pattern observed in the local sample apps (`validation/C-real-usage.md`
§2d): a server response carrying a full-or-partial dataset routed to `loadDataAsync` vs
`updateDataAsync`. The partial path exists precisely because some datasets are large enough that a
full refresh on every poll would be wasteful.

### 2. WebSocket data push (via `XH.webSocketService`)

**What it is.** The client `subscribe`s to a topic; the server pushes data payloads as they change.
The pushed `WebSocketMessage.data` *is* the dataset (or the incremental changes), not a signal to go
fetch.

**Control.** Ours, when the push originates from a Hoist/Grails server. The server uses the client's
`channelKey` to target the specific connection.

**How it reaches ingest.** The subscription handler routes the payload to ingest. An incremental
push lands at `cube.updateDataAsync(msg.data)` (the common real-time case - a stream of upserts and
deletes); a full re-push lands at `cube.loadDataAsync(msg.data)`. The decode-and-dispatch happens in
`WebSocketService.onMessage` -> `notifySubscribers` (`svc/WebSocketService.ts:266-314`); the
application handler does the ingest call.

**Notes.** This is a first-class Hoist capability and is **strategically important** - it is not
represented in the local sample apps, so do not under-weight it. Toolbox demonstrates it in its
portfolio example: `PositionSession` subscribes to live position updates and forwards each message
to its `onUpdate` handler (`toolbox/.../core/positions/PositionSession.ts:19-21`,
fed by `core/svc/PortfolioService.ts`). The "real-time" question for high-volume clients is about
*throughput / latency under load* on this path, not whether push exists. This is the pattern the
Phase 4 Toolbox demo (DEMO-02) exercises at a trading-screen cadence, and the one whose synchronous
main-thread cost the Phase 2/3 baseline must characterize.

### 3. WebSocket-as-notification

**What it is.** A lightweight "data ready" message arrives over the same WebSocket, but it carries
**metadata, not data** - flags such as a progress indicator, a success/failure status, or a
bulk-update-in-progress marker. Receipt of the message triggers a separate HTTP fetch; the **HTTP
response**, not the WebSocket payload, is what flows into the Cube.

**Control.** Mixed - the notification channel is typically ours (Hoist server signaling), and the
follow-on HTTP fetch is the controllable poll-then-diff path of pattern #1.

**How it reaches ingest.** The WebSocket handler does *not* call `updateDataAsync` with `msg.data`.
Instead it kicks off a refresh, and the resulting HTTP response resolves to the snapshot-vs-diff
fork - `cube.loadDataAsync` or `cube.updateDataAsync` - exactly as in pattern #1. Generalized shape:

```typescript
// generalized WS-as-notification (sample-app pattern, names elided)
this.refreshSub = XH.webSocketService.subscribe('someRefreshReadyTopic', msg => {
    this.refreshAsync(msg.data);   // msg.data = metadata; refresh does the HTTP fetch + ingest
});
```

**Notes.** This is the WebSocket pattern actually seen in the local sample apps (used in several
places, none of which push raw data) - see `validation/C-real-usage.md` §2e / §3. The distinction
from pattern #2 is the crux of the framing correction: **same transport, opposite data path.** In
push (#2) the socket carries the dataset and feeds ingest directly; in notification (#3) the socket
carries only a trigger and the dataset arrives over HTTP. Both are legitimate; the layer must
support both and must not conflate them.

### 4. SignalR

**What it is.** A client-system push/notify channel (Microsoft's real-time messaging stack),
presented by an upstream system rather than by Hoist. It can carry either data payloads (push, like
#2) or notifications (like #3).

**Control.** Fixed - SignalR is a client-owned transport Hoist must adapt to. There is **no
Hoist-native SignalR client**; `XH.webSocketService` speaks Hoist's own WebSocket protocol to a
Hoist/Grails server, not SignalR. Integrating a SignalR feed therefore means standing up the SignalR
client (e.g. the vendor SDK) at the app/service layer and bridging its messages to ingest.

**How it reaches ingest.** Whatever the SignalR client delivers resolves to the same fork: a data
payload -> `cube.updateDataAsync` (or `loadDataAsync` for a full re-push); a notification -> trigger
an HTTP fetch that then resolves to the fork (as in #3). The adapter differs; the two ingest entry
points do not.

**Notes.** SignalR is named as a real client transport in the project framing. Its presence is the
clearest argument for keeping the layer transport-agnostic: it is a transport we do *not* control,
yet it must land at the same `loadDataAsync` / `updateDataAsync` contract as everything else.

### 5. Polling

**What it is.** Periodic HTTP fetch on a timer. The degenerate case of pattern #1 - with or without
server-side diffing.

**Control.** Ours (client-driven cadence; server contract typically ours too).

**How it reaches ingest.** If the server does no diffing, every poll returns a full snapshot ->
`cube.loadDataAsync` each cycle. If the server diffs, polling becomes pattern #1 proper and resolves
to `loadDataAsync` vs `updateDataAsync` per the `isPartial` flag.

**Notes.** Worth listing separately because the "no server diff" variant is a real and simple option
(full snapshot every cycle) - it trades wire/ingest cost for server simplicity, and it is the
baseline against which diffing's value is measured.

---

## Summary table

| Transport                  | Control        | Reaches ingest via                                            | Snapshot or diff                  | Notes                                                        |
| -------------------------- | -------------- | ------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------- |
| HTTP snapshot/diff         | Ours           | `cube.loadDataAsync` / `cube.updateDataAsync` per `isPartial` | Either (server decides)           | Dominant pattern in local samples                           |
| WebSocket data push        | Ours           | Subscription handler -> `cube.updateDataAsync` (or `loadDataAsync`) | Usually diff; full on re-push | First-class; Toolbox portfolio example; strategically key   |
| WebSocket-as-notification  | Mixed          | WS message triggers HTTP fetch -> the fork                    | Either (HTTP response decides)    | Socket carries metadata only; data arrives over HTTP        |
| SignalR                    | Fixed (client) | App-layer SignalR adapter -> the fork                         | Either                            | No Hoist-native client; bridge at app/service layer         |
| Polling                    | Ours           | `cube.loadDataAsync` each cycle (or the fork if server diffs) | Snapshot (or either with diffing) | Degenerate case of HTTP snapshot/diff                       |

---

## The invariant ingest contract

The architectural payoff of this inventory: **no matter the transport, ingest collapses to two
operations.**

1. **Full snapshot** -> `Cube.loadDataAsync()` (delegating to `Store.loadData()`) - replace the
   dataset.
2. **Incremental diff** -> `Cube.updateDataAsync()` (delegating to `Store.updateData()`) - apply an
   add / update / remove transaction.

Everything above the line - HTTP, WebSocket push, WebSocket notification, SignalR, polling - is an
**adapter** whose only job is to land data at one of these two entry points. Transport governs *how
data arrives and who controls timing*; it does not change *where data lands* or *the shape ingest
accepts*. The connected-view fan-out (`noteCubeLoaded` / `noteCubeUpdated`) is identical regardless
of which transport drove the ingest call.

This is what makes transport-agnosticism achievable in practice, and it has two direct downstream
consequences:

- **Phase 2 harness (HARN-02).** The harness parameterizes change-delivery transport by varying only
  the adapter that calls into these two entry points. The cube/store/view machinery below the
  contract is held constant across transports, so transport is a clean experimental knob rather than
  a confound. A "WebSocket push" run and a "poll-then-diff" run differ only in the driver that
  invokes `updateDataAsync`; the measured ingest -> view -> grid cost is comparable across them.
- **Any Data 2.0 path.** A replacement engine must preserve this same two-operation contract at the
  ingest boundary (and the `View.result -> Store` seam below it) to remain transport-agnostic and to
  satisfy coexistence. Per the adaptability principle, a transport-specific optimization (e.g. a
  delta-push fast path tied to a controllable WebSocket) is legitimate but must be labeled
  **conditional** - it cannot become the only path data can take into the layer.

---

## References

- `svc/WebSocketService.ts` - `XH.webSocketService`; `subscribe`/`unsubscribe`/`sendMessage`;
  `WebSocketSubscription`, `WebSocketMessage`.
- `data/cube/Cube.ts` - `loadDataAsync` (`:282`), `updateDataAsync` (`:299`); connected-view
  fan-out.
- `data/Store.ts` - `loadData` (`:387`), `updateData` (`:433`), `StoreTransaction` (`:170`),
  `StoreChangeLog` (`:199`).
- `docs/planning/data2/KICKOFF-VALIDATION.md` §1 - transport is pluggable; WebSocket push is
  first-class.
- `docs/planning/data2/validation/C-real-usage.md` §2d/§2e/§3 - poll-then-diff and
  WebSocket-as-notification, grounded.
- Toolbox portfolio example - `core/positions/PositionSession.ts`, `core/svc/PortfolioService.ts`
  (public app; WebSocket data push via `XH.webSocketService.subscribe`).
