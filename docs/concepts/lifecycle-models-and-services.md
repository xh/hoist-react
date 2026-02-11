# Lifecycles: Models, Services, and Load/Refresh

This is Part 2 of the Lifecycle documentation, covering the lifecycle of **models and services**
after the app is running. For the app initialization sequence — how a Hoist app goes from entry
point to `RUNNING` state — see [Part 1: Application Lifecycle](./lifecycle-app.md).

Once the app is running, Hoist manages three core lifecycles:

- **HoistModel** — created, linked to a component, loaded, refreshed, destroyed on unmount
- **HoistService** — created, initialized during startup, loaded/refreshed, lives for app lifetime
- **LoadSupport** — the shared loading/refresh infrastructure used by both

## HoistModel Lifecycle

A HoistModel progresses through a well-defined sequence of phases. Understanding this sequence is
essential for knowing where to place initialization code, reactions, and cleanup logic.

```
Construction → Linking (onLinked) → Post-Link (afterLinked, initial load) → Refresh → Destruction
```

### Construction

The constructor runs before the model is associated with any component. At this point:

- `makeObservable(this)` has been called by the `HoistModel` base constructor
- `LoadSupport` is auto-created if the class overrides `doLoadAsync()`
- MobX observables declared with `@observable` or `@bindable` are active
- Persistence decorators (`@persist`) read from the backing store and apply saved values
- `lookupModel()` is **not yet available** — the model is not yet linked

This is the right place for creating child models, stores, and other infrastructure that doesn't
depend on the component hierarchy:

```typescript
class OrderPanelModel extends HoistModel {
    @managed gridModel: GridModel;
    @managed filterModel: FilterChooserModel;

    constructor() {
        super();
        makeObservable(this);
        this.gridModel = new GridModel({columns: [...]});
        this.filterModel = new FilterChooserModel({...});
    }
}
```

### Linking (`onLinked`)

When the owning component renders for the first time, Hoist links the model to the component
hierarchy. The linking sequence (implemented in `core/model/Hooks.ts`) is:

1. `_modelLookup` is set — `lookupModel()` becomes available
2. `@lookup`-decorated properties are resolved from the ancestor hierarchy
3. `componentProps` is set from the component's current props
4. **`onLinked()` is called**

`onLinked()` runs **during the first render** of the linked component. Use it for work that
requires access to parent models or component props:

```typescript
class DetailPanelModel extends HoistModel {
    @lookup(ParentModel) parentModel: ParentModel;

    @managed dashModel: DashContainerModel;
    @managed panelModel: PanelModel;

    override onLinked() {
        const {persistWith} = this.parentModel;

        this.dashModel = new DashContainerModel({
            persistWith: {...persistWith, path: 'detailDash'},
            viewSpecs: [...]
        });

        this.panelModel = new PanelModel({
            persistWith: {...persistWith, path: 'detailPanel'},
            defaultSize: 400,
            side: 'bottom'
        });

        this.addReaction({
            track: () => this.parentModel.selectedRecord,
            run: record => this.selectedId = record?.id ?? null,
            debounce: 300
        });
    }
}
```

Key points about `onLinked()`:
- Runs synchronously during render — avoid heavy async work
- `lookupModel()` and `@lookup` properties are available
- `componentProps` are set and readable
- Safe to create child models that depend on the parent hierarchy
- Safe to set up `addReaction()` / `addAutorun()` calls

### Post-Link (`afterLinked`)

After the first render completes, Hoist runs a `useEffect` that:

1. Calls **`afterLinked()`** on the model
2. Calls `loadAsync()` if the model has `LoadSupport` (i.e. overrides `doLoadAsync()`)
3. Registers the model with the nearest `RefreshContextModel` for future refresh cycles

`afterLinked()` runs after the component has mounted — equivalent to `useEffect` timing. Use it
for work that should happen after the DOM is painted, such as reactions that depend on rendered
state:

```typescript
override afterLinked() {
    this.addReaction({
        track: () => this.commentModel.unreadCount,
        run: count => this.updateBadge(count),
        fireImmediately: true
    });
}
```

In practice, `onLinked()` is used more frequently than `afterLinked()`. Most reactions and child
model creation can happen in `onLinked()`. Use `afterLinked()` when you specifically need
post-render timing.

### Loading (`doLoadAsync`)

If a model overrides `doLoadAsync()`, Hoist automatically creates a `LoadSupport` instance and
calls `loadAsync()` after linking. The `doLoadAsync()` method receives a `LoadSpec` describing
the load:

```typescript
override async doLoadAsync(loadSpec: LoadSpec) {
    const data = await XH.fetchJson({
        url: 'api/orders',
        loadSpec  // Pass to FetchService for auto-refresh awareness
    });
    if (loadSpec.isStale) return;  // A newer load was triggered — discard results

    this.gridModel.loadData(data);
}
```

**Never call `doLoadAsync()` directly** — always use `loadAsync()`, `refreshAsync()`, or
`autoRefreshAsync()`, which create `LoadSpec` instances and route through `LoadSupport`.

See [LoadSupport Deep Dive](#loadsupport-deep-dive) below for details on `LoadSpec` properties.

### Destruction

When the owning component unmounts, Hoist destroys the model by calling `destroy()`. The base
`HoistBase.destroy()` implementation:

1. Marks the instance as destroyed (`isDestroyed = true`)
2. Disposes all managed MobX subscriptions (autoruns, reactions) added via `addAutorun()` /
   `addReaction()`
3. Calls `XH.safeDestroy()` on all objects registered via `markManaged()`
4. Calls `XH.safeDestroy()` on all properties decorated with `@managed`

This cascade ensures child models, stores, and other resources are cleaned up automatically. The
`@managed` decorator is the primary mechanism for declaring ownership:

```typescript
class ReportModel extends HoistModel {
    @managed gridModel: GridModel;
    @managed store: Store;
    @managed cubeView: View;

    // NOT @managed — this ViewManagerModel is owned by AppModel, not this model
    viewManagerModel: ViewManagerModel;
}
```

**Avoid:** Overriding `destroy()` to manually clean up resources that `@managed` and
`addReaction()` / `addAutorun()` already handle. The base implementation covers the vast majority
of cases.

## HoistService Lifecycle

Services share much of the same loading/refresh infrastructure as models but differ in key ways:

| Aspect | HoistModel | HoistService |
|--------|-----------|--------------|
| Creation | Component mount or app code | `XH.installServicesAsync()` during startup |
| Count | Many instances, matching component tree | One singleton per class |
| Initialization | `onLinked()` / `afterLinked()` | `initAsync()` during app startup |
| Component access | `componentProps`, `lookupModel()` | None — not linked to components |
| Destruction | On component unmount | Typically lives for app lifetime |
| Access pattern | Via props, context, or `lookupModel()` | Via `XH.myService` |

### `initAsync()`

Services are initialized during app startup via `XH.installServicesAsync()`. Each service's
`initAsync()` is called after construction. Services within a single `installServicesAsync()` call
are initialized concurrently — use separate `await`ed calls to enforce ordering:

```typescript
// In AppModel.initAsync()
override async initAsync() {
    // Phase 1: reference data (must complete first)
    await XH.installServicesAsync(LookupService);

    // Phase 2: these can initialize concurrently
    await XH.installServicesAsync(OrderService, TradeService);
}
```

**Throwing from `initAsync()` will block app startup.** Handle non-fatal errors internally:

```typescript
class AnalyticsService extends HoistService {
    override async initAsync() {
        try {
            this.config = await XH.fetchJson({url: 'analytics/config'});
        } catch (e) {
            // Non-fatal — analytics can degrade gracefully
            this.logWarn('Failed to load analytics config', e);
            this.config = DEFAULT_CONFIG;
        }
    }
}
```

### Load Support

Services participate in the same `LoadSupport` system as models — override `doLoadAsync()` to
enable loading. However, unlike models, **services are not bound to a component and are not
automatically registered with a `RefreshContextModel`**. This means a service's `doLoadAsync()`
will not run on app refresh or auto-refresh unless the app explicitly calls `loadAsync()` on it.

The standard practice is to wire service loads into `AppModel.doLoadAsync()`, passing the
received `loadSpec` through so that staleness tracking, auto-refresh awareness, and load masking
work correctly end-to-end:

```typescript
// In AppModel — wire service loads into the app-level refresh cycle
override async doLoadAsync(loadSpec: LoadSpec) {
    await XH.pricingService.loadAsync(loadSpec);
    await XH.portfolioService.loadAsync(loadSpec);
}
```

The service itself simply implements `doLoadAsync()` like a model:

```typescript
class PricingService extends HoistService {
    prices: Map<string, number> = new Map();

    override async initAsync() {
        // One-time setup (e.g. register config keys, set up WebSocket listeners)
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const data = await XH.fetchJson({url: 'pricing/latest', loadSpec});
        this.prices = new Map(data.map(it => [it.symbol, it.price]));
    }
}
```

As with `initAsync()`, the same tiered approach applies to loading — call services sequentially
when later loads depend on earlier results, or group independent loads together:

```typescript
override async doLoadAsync(loadSpec: LoadSpec) {
    // Phase 1: reference data that other services depend on
    await XH.lookupService.loadAsync(loadSpec);

    // Phase 2: independent domain services can load concurrently
    await Promise.all([
        XH.orderService.loadAsync(loadSpec),
        XH.tradeService.loadAsync(loadSpec)
    ]);
}
```

### Singleton Pattern

Each service class is instantiated once and installed as a camelCase property on `XH`:

```typescript
class OrderService extends HoistService {...}
// After installation: XH.orderService
```

The service is also available as a static singleton on its own class via `OrderService.instance`.

## LoadSupport Deep Dive

`LoadSupport` is the shared infrastructure that powers `loadAsync()`, `refreshAsync()`, and
`autoRefreshAsync()` on both models and services. It is automatically created when a class
overrides `doLoadAsync()`.

### LoadSpec Properties

Every call to `doLoadAsync()` receives a `LoadSpec` with these properties:

| Property | Type | Description |
|----------|------|-------------|
| `isRefresh` | `boolean` | `true` if triggered by refresh (manual or auto). `false` for initial load. |
| `isAutoRefresh` | `boolean` | `true` if triggered by the auto-refresh timer. Implies `isRefresh`. |
| `isFirstLoad` | `boolean` | `true` if this is the first load (loadNumber === 0). |
| `isStale` | `boolean` | `true` if a newer load has been **requested** since this one started. |
| `isObsolete` | `boolean` | `true` if a newer load has **successfully completed** since this one started. |
| `meta` | `PlainObject` | Application-specific metadata attached to the load request. |
| `loadNumber` | `number` | Sequential index of this load (0-based). |

### Staleness Checking

`isStale` and `isObsolete` are the key tools for handling concurrent loads. Check them after any
`await` to avoid overwriting newer data with stale results:

```typescript
override async doLoadAsync(loadSpec: LoadSpec) {
    const rawData = await XH.fetchJson({url: 'api/positions', loadSpec});
    if (loadSpec.isStale) return;  // A newer load is already in progress

    const enriched = await this.enrichDataAsync(rawData);
    if (loadSpec.isStale) return;  // Check again after second async call

    this.gridModel.loadData(enriched);
}
```

- **`isStale`** — a newer `loadAsync()` has started. The current load's results may be superseded.
- **`isObsolete`** — a newer `loadAsync()` has completed successfully. The current load's results
  are definitely superseded.

### Load Observer

`LoadSupport` creates a `TaskObserver` (`loadObserver`) that tracks the pending state of loads.
This is commonly used to mask UI during loading:

```typescript
panel({
    mask: 'onLoad',  // Masks entire panel (including tbar) during loadAsync()
    tbar: [refreshButton(), exportButton()],
    items: [
        grid(),
        mask({bind: model.calcTask})  // Masks grid area only during a custom task
    ]
})
```

The `mask: 'onLoad'` prop on `panel` covers the entire panel including its toolbar. The `mask()`
component rendered as a sibling of the grid covers only the panel's content area, allowing the
toolbar to remain interactive during a long-running calculation.

### Load Metadata

`LoadSupport` tracks observable timestamps and the last exception:

| Property | Type | Description |
|----------|------|-------------|
| `lastLoadRequested` | `Date` | When the most recent load was triggered |
| `lastLoadCompleted` | `Date` | When the most recent load finished (success or failure) |
| `lastLoadException` | `any` | The exception from the last load, or `null` if it succeeded |

### Auto-Refresh Skip Logic

When `autoRefreshAsync()` is called, `LoadSupport` applies special handling:

1. If a user-triggered load is already pending (`loadObserver.isPending`), the auto-refresh is
   **skipped entirely** — it would be redundant.
2. Auto-refresh loads are **not linked** to `loadObserver` — they don't trigger load masks. This
   prevents background refreshes from disrupting the user.
3. Application code might switch on `loadSpec.isAutoRefresh` and decline to perform certain kinds
   of data refreshing, modify exception handling, and/or apply a longer timeout.

## Refresh System

Hoist provides a coordinated refresh system that cascades through the component hierarchy.

### RefreshContextModel

`RefreshContextModel` maintains a list of registered `Loadable` targets. When its `refreshAsync()`
is called, it calls `loadAsync()` on all registered targets via `loadAllAsync()`, which uses
`Promise.allSettled` — a failure in one target does not block others.

Linked models with `LoadSupport` are automatically registered with their nearest
`RefreshContextModel` when they mount, and unregistered when they unmount.

### RootRefreshContextModel

The top-level `RootRefreshContextModel` (available as `XH.refreshContextModel`) adds one key
behavior: **AppModel loads first, then registered targets load in parallel**. This is wired into
the built-in refresh button included by default in the top `AppBar` (disable via the
`AppBar.hideRefreshButton` prop).

```
XH.refreshAppAsync()
  → RootRefreshContextModel.refreshAsync()
    → 1. AppModel.loadAsync(loadSpec)           // Sequential — completes first
    → 2. loadAllAsync(registeredTargets, loadSpec)  // Parallel — all at once
```

This ordering ensures that app-wide services refreshed in `AppModel.doLoadAsync()` have updated
data before individual models refresh.

### TabContainer Refresh Contexts

`TabContainerModel` creates a separate `RefreshContextModel` for each tab. This enables efficient
refresh handling — inactive tabs can defer or skip refreshes based on their `refreshMode`
configuration. See the [Tab documentation](../../cmp/tab/README.md) for details.

### AutoRefreshService

`AutoRefreshService` provides built-in app-wide auto-refresh via the root `RefreshContextModel`.
When active, it periodically triggers `autoRefreshAsync()` on the root context, cascading through
`AppModel.doLoadAsync()` (and its wired services) down to every mounted model with `LoadSupport`.

Auto-refresh requires two things to be active:

1. **A refresh interval for the client app** — configured via the `xhAutoRefreshIntervals` JSON
   soft config. Intervals are specified in seconds and keyed by `clientAppCode`, allowing different
   refresh rates for different client apps within the same project:
   ```json
   {"myApp": 120, "tradeBlotter": 15}
   ```

2. **The user's `xhAutoRefreshEnabled` preference** — a boolean pref that defaults to `false`.
   Apps can add an `AutoRefreshAppOption` to the global options dialog to let users toggle this,
   or set a default pref value server-side if per-user customization is not desired.

The service runs a 1-second timer that checks whether enough time has elapsed since the last
completed load. It skips auto-refresh when:

- The page is not visible (`XH.pageIsVisible` is `false`)
- A user-triggered load is already pending
- The configured interval has not yet elapsed since the last load completed

This means manual refreshes reset the auto-refresh countdown, and slow-loading apps won't pile up
overlapping refresh cycles.

## Common Patterns

### Standard Model with Loading and Reactions

```typescript
class OrderListModel extends HoistModel {
    @managed gridModel: GridModel;
    @managed filterModel: FilterChooserModel;

    constructor() {
        super();
        makeObservable(this);
        this.gridModel = new GridModel({columns: [...]});
        this.filterModel = new FilterChooserModel({...});

        this.addReaction({
            track: () => this.filterModel.value,
            run: () => this.loadAsync()
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            const orders = await XH.fetchJson({url: 'orders', loadSpec});
            if (loadSpec.isStale) return;
            this.gridModel.loadData(orders);
        } catch (e) {
            if (loadSpec.isStale) return;  // Don't alert user for a superseded load
            this.gridModel.clear();
            // Passing loadSpec to fetchJson above means the exception already
            // carries auto-refresh context — ExceptionHandler will automatically
            // suppress alerts and server logging for auto-refresh failures.
            XH.handleException(e, {alertType: 'toast'});
        }
    }
}
```

### Model Using `onLinked` to Access Parent State

```typescript
class DetailModel extends HoistModel {
    @lookup(MasterModel) masterModel: MasterModel;
    @managed panelModel: PanelModel;

    override onLinked() {
        this.panelModel = new PanelModel({
            persistWith: this.masterModel.persistWith,
            defaultSize: 350,
            side: 'bottom'
        });

        this.addReaction({
            track: () => this.masterModel.selectedRecord,
            run: () => this.loadAsync(),
            debounce: 200
        });
    }
}
```

### AppModel with Phased Service Installation

```typescript
class AppModel extends HoistAppModel {
    @managed tabModel: TabContainerModel;

    override async initAsync() {
        // Phase 1: reference data (other services depend on these lookups)
        await XH.installServicesAsync(LookupService);

        // Phase 2: domain services (can initialize concurrently)
        await XH.installServicesAsync(OrderService, TradeService);

        // Phase 3: set up application UI
        this.tabModel = new TabContainerModel({
            route: 'default',
            track: true,
            tabs: [...]
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        // Services must be explicitly loaded here — they are not in the
        // RefreshContextModel and will not load on app refresh otherwise.
        // Pass loadSpec through for staleness tracking and auto-refresh awareness.
        await XH.lookupService.loadAsync(loadSpec);
        await Promise.all([
            XH.orderService.loadAsync(loadSpec),
            XH.tradeService.loadAsync(loadSpec)
        ]);
    }
}
```

### doLoadAsync with Auto-Refresh Optimization

```typescript
override async doLoadAsync(loadSpec: LoadSpec) {
    // On auto-refresh, skip expensive reprocessing if the raw data hasn't changed
    if (loadSpec.isAutoRefresh) {
        const summary = await XH.fetchJson({url: 'positions/summary', loadSpec});
        if (summary.lastModified <= this.lastDataTimestamp) return;
    }

    const data = await XH.fetchJson({url: 'positions/full', loadSpec});
    if (loadSpec.isStale) return;

    this.lastDataTimestamp = data.lastModified;
    this.gridModel.loadData(data.rows);
}
```

## Common Pitfalls

### Calling `lookupModel()` Before Linking

`lookupModel()` and `@lookup` properties are only available during or after `onLinked()`. Calling
them in the constructor will warn and return `null`:

```typescript
// ❌ Don't: lookupModel is not available during construction
constructor() {
    super();
    const parent = this.lookupModel(ParentModel);  // null — not linked yet
}

// ✅ Do: use onLinked() for hierarchy-dependent work
override onLinked() {
    const parent = this.lookupModel(ParentModel);  // Works
}
```

### Calling `doLoadAsync()` Directly

Always use `loadAsync()`, `refreshAsync()`, or `autoRefreshAsync()` — never call `doLoadAsync()`
directly. The wrapper methods create `LoadSpec` instances and route through `LoadSupport` for
proper tracking, masking, and staleness detection:

```typescript
// ❌ Don't: bypasses LoadSupport
this.doLoadAsync(new LoadSpec(...));

// ✅ Do: go through the managed API
this.loadAsync();
this.refreshAsync();
```

### Triggering `loadAsync` from a Reaction Without a Closure

When calling `loadAsync()` from a reaction's `run` function, wrap it in a closure. The reaction
passes its tracked value as an argument, which `loadAsync()` would misinterpret as a `LoadSpec`:

```typescript
// ❌ Don't: reaction passes tracked value to loadAsync as first arg
this.addReaction({
    track: () => this.filterModel.value,
    run: this.loadAsync  // Tracked value passed as LoadSpec — throws error
});

// ✅ Do: wrap in closure
this.addReaction({
    track: () => this.filterModel.value,
    run: () => this.loadAsync()
});
```

### Forgetting `@managed` on Owned Child Models

Child models and stores created by a model should be decorated with `@managed` to ensure they
are destroyed when the parent is destroyed. Without it, resources leak:

```typescript
// ❌ Don't: gridModel will not be destroyed when this model is destroyed
gridModel: GridModel;

// ✅ Do: @managed ensures automatic cleanup
@managed gridModel: GridModel;
```

Do **not** use `@managed` on models that are owned elsewhere — such as a `ViewManagerModel`
owned by `AppModel` but referenced by many child models.

### Not Wiring Service Loads into `AppModel.doLoadAsync()`

Services are not bound to components and are not registered with a `RefreshContextModel`. If you
don't explicitly call `service.loadAsync(loadSpec)` from `AppModel.doLoadAsync()`, the service's
`doLoadAsync()` will **never run** — not on app refresh, not on auto-refresh, not when the user
clicks the refresh button:

```typescript
// ❌ Don't: service has doLoadAsync() but is never wired into the refresh cycle
class PricingService extends HoistService {
    override async doLoadAsync(loadSpec: LoadSpec) {
        this.prices = await XH.fetchJson({url: 'pricing/latest', loadSpec});
    }
}
// AppModel.doLoadAsync() doesn't call XH.pricingService.loadAsync()
// → PricingService.doLoadAsync() never runs after init

// ✅ Do: wire the service into AppModel.doLoadAsync()
class AppModel extends HoistAppModel {
    override async doLoadAsync(loadSpec: LoadSpec) {
        await XH.pricingService.loadAsync(loadSpec);
    }
}
```

### Not Checking `isStale` After Async Calls

Long-running loads can be superseded by newer ones (e.g. user changes a filter while data is
loading). Without staleness checks, out-of-order returns could cause old data to overwrite new:

```typescript
// ❌ Don't: stale data may overwrite fresh data from a newer load
override async doLoadAsync(loadSpec: LoadSpec) {
    const data = await XH.fetchJson({url: 'positions', loadSpec});
    this.gridModel.loadData(data);  // Might be stale!
}

// ✅ Do: check isStale after each await
override async doLoadAsync(loadSpec: LoadSpec) {
    const data = await XH.fetchJson({url: 'positions', loadSpec});
    if (loadSpec.isStale) return;
    this.gridModel.loadData(data);
}
```

## Key Source Files

| File | Contents |
|------|----------|
| `core/HoistBase.ts` | Base class — `destroy()`, `addAutorun()`, `addReaction()`, `@managed`, `markPersist()` |
| `core/model/HoistModel.ts` | Model base — `onLinked()`, `afterLinked()`, `doLoadAsync()`, `lookupModel()` |
| `core/HoistService.ts` | Service base — `initAsync()`, `doLoadAsync()`, singleton pattern |
| `core/HoistAppModel.ts` | App model — `initAsync()`, `doLoadAsync()`, `getRoutes()`, `getAppOptions()` |
| `core/load/LoadSupport.ts` | Managed loading — `loadAsync()`, `refreshAsync()`, `loadObserver`, staleness tracking |
| `core/load/LoadSpec.ts` | Load metadata — `isRefresh`, `isAutoRefresh`, `isStale`, `isObsolete`, `isFirstLoad` |
| `core/model/RefreshContextModel.ts` | Refresh coordination — target registration, cascading refresh |
| `core/model/RootRefreshContextModel.ts` | Root refresh — AppModel-first ordering |
| `core/model/CreatesSpec.ts` | `creates()` function for component-owned model creation |
| `core/model/ModelLookup.ts` | Model resolution hierarchy — parent/child lookup |
| `core/model/Hooks.ts` | Linking implementation — `useModelLinker`, `useLocalModel`, `useContextModel` |
