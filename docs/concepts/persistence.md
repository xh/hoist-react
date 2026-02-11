# Persistence

Hoist's persistence system saves user-specific UI state — grid column layouts, form values, active
tabs, panel sizes — to various backing stores and restores it automatically on return. Key backing
stores include server-side **preferences** (roam across devices), browser **localStorage** (survive
restarts), and **ViewManager** (named, saveable, shareable views). This gives users a seamless
experience: their customizations survive page refreshes, browser restarts, and even device changes.

A key design principle is that models and components consume persistence through a uniform API
regardless of the backing store. Code that declares `persistWith` works the same whether state is
saved to localStorage, a server-side preference, or a full ViewManager. This means you can start
simple — or with no persistence at all — and upgrade the backing store later without changing the
models that produce and consume the persisted state.

## How It Works

The core flow has four steps:

1. **Read** — On model construction, `PersistenceProvider` reads saved state from the backing store
2. **Apply** — Saved state is applied immediately to the model, replacing defaults
3. **Watch** — A MobX reaction observes the model for future state changes
4. **Write** — Changes are debounced and written back to the backing store

This happens early in construction — before reactions fire and before the component renders.
Critically, there is no "thrashing": persisted state replaces defaults in one step, not as a
separate update that would trigger unnecessary reaction cycles.

```
Model defaults set → PersistenceProvider reads store → Saved state applied → Reaction installed
                                                      (no render yet)       (watches for changes)
```

If the backing store has no saved state (first-time user) or the read fails, the in-code default
value is used. The system fails gently — persistence errors are logged but never block the app.

### Write Behavior

When persisted state changes:

- If the new state **equals the default**, the stored value is **cleared** (removed from the
  backing store) rather than written. This keeps the store clean and ensures users who haven't
  customized anything have no stored state.
- If a `settleTime` is configured and the last read was recent (within `settleTime` ms), the
  write is **suppressed**. This handles cases where components re-interpret saved state during
  or shortly after render — e.g. a dashboard converting relative sizes to pixels — producing
  observable changes that are not actually user-driven and should not be written back.
- Writes are **debounced** (default 250ms) to avoid excessive storage operations during rapid
  changes like column resizing.

## Backing Stores

Hoist provides six `PersistenceProvider` implementations:

| Provider | Shortcut Key | Scope | Survives |
|----------|-------------|-------|----------|
| `LocalStorageProvider` | `localStorageKey` | Browser + domain | Sessions, restarts |
| `SessionStorageProvider` | `sessionStorageKey` | Browser tab | Tab lifetime only |
| `PrefProvider` | `prefKey` | Server, per-user | Everything (synced to server) |
| `ViewManagerProvider` | `viewManagerModel` | Named saved views | Everything (shareable) |
| `DashViewProvider` | `dashViewModel` | Dashboard widget | With parent dashboard |
| `CustomProvider` | `getData` / `setData` | App-defined | App-defined |

### localStorage

Stores state in the browser's `localStorage` via `LocalStorageService`. Values are scoped to the
browser and domain — they persist across sessions and browser restarts but are not available on
other devices. Keys are automatically namespaced by the app code.

Best for: column widths, panel sizes, UI preferences that don't need to roam between devices.

### sessionStorage

Stores state in the browser's `sessionStorage` via `SessionStorageService`. Values are scoped to
the current tab and cleared when the tab closes.

Best for: temporary state that should reset on each visit, like expanded/collapsed sections.

### Preference (Server-Side)

Stores state in a Hoist Preference (JSON type) via `PrefService`. Values are saved to the server
and associated with the current user — they survive everything and are available from any device.

Best for: important user preferences that should roam, like default groupings or filter settings.

### ViewManager

Stores state within named saved views managed by `ViewManagerModel`. Multiple components can
register with the same `ViewManagerModel`, and their combined state is saved as a single named
view that users can create, switch between, share, and pin.

Best for: complex multi-component configurations (grid + filters + grouping) that users want to
save and switch between. See the [ViewManager README](../../cmp/viewmanager/README.md) for full
details.

### DashView

Stores state within a `DashViewModel`, which represents a single widget in a dashboard. The
`DashModel` (parent) collects and persists all widget states together. This provider is used
by components rendered inside dashboard widgets.

Best for: widget-specific state within a dashboard layout. Models used within dashboard widgets
should look up their `DashViewModel` and use it as their persistence target. This is especially
important for widgets that allow multiple copies (the default — `DashViewSpec.unique: false`).
Multiple copies of a widget are only useful if each instance can be configured differently, and
persisting each instance's settings to its own `DashViewModel` is what makes that possible.

### Custom

Provides app-defined `getData` / `setData` functions for full control over storage. The functions
receive and return plain objects.

## Configuration

### PersistOptions

All persistence configuration flows through `PersistOptions`:

| Property | Type | Description |
|----------|------|-------------|
| `path` | `string` | Dot-delimited key within the backing store object |
| `prefKey` | `string` | Hoist Preference key (implies `PrefProvider`) |
| `localStorageKey` | `string` | localStorage key (implies `LocalStorageProvider`) |
| `sessionStorageKey` | `string` | sessionStorage key (implies `SessionStorageProvider`) |
| `viewManagerModel` | `ViewManagerModel` | ViewManager instance (implies `ViewManagerProvider`) |
| `dashViewModel` | `DashViewModel` | DashView instance (implies `DashViewProvider`) |
| `getData` / `setData` | functions | Custom read/write (implies `CustomProvider`) |
| `debounce` | `number` or `DebounceSpec` | Write debounce interval in ms. Default `250`. |
| `settleTime` | `number` | Suppress writes for this many ms after a read. |
| `type` | `string` or `Class` | Explicit provider type (usually inferred from shortcut keys). |

The provider type is usually inferred from which shortcut key is present. You don't need to
specify `type` explicitly.

## Using Persistence

There are three approaches to making state persistent, from simplest to most flexible.

### Approach 1: `@persist` / `@persist.with` Decorators

The simplest way to persist an individual property. Apply the decorator to any `@observable` or
`@bindable` property on a `HoistBase` subclass:

```typescript
class MyModel extends HoistModel {
    override persistWith = {localStorageKey: 'myPanel'};

    @bindable @persist showAdvanced = false;
    @observable @persist selectedView = 'summary';
    @bindable @persist.with({prefKey: 'myPanelTheme'}) theme = 'light';
}
```

The `@persist` decorator (without arguments) uses the model's `persistWith` as its provider
config and the property name as its path. `@persist.with(options)` allows overriding with
property-specific options — including a completely different provider.

**Decorator ordering matters:** `@persist` must come after the MobX decorator in source order
(which means it is applied first at runtime):

```typescript
// ✅ Correct: MobX decorator first, then @persist
@bindable @persist showAdvanced = false;

// ❌ Wrong: @persist must come after the MobX decorator
@persist @bindable showAdvanced = false;
```

### Approach 2: `markPersist()`

The imperative equivalent of `@persist`. Use it when persistence cannot be set up at property
declaration time — most commonly in dashboard widgets, where the backing store is a
`DashViewModel` that must be looked up from the component hierarchy via `onLinked()`:

```typescript
class WidgetModel extends HoistModel {
    @bindable selectedRegion = 'all';
    @bindable groupBy = 'sector';

    override onLinked() {
        // DashViewModel is only available after linking into the component tree
        const dashViewModel = this.lookupModel(DashViewModel);
        this.persistWith = {dashViewModel};
        this.markPersist('selectedRegion');
        this.markPersist('groupBy');
    }
}
```

### Approach 3: Model Constructor Config (`persistWith`)

Many built-in Hoist models accept `persistWith` as a constructor config and handle their own
persistence setup internally. This is the most common approach for complex models like `GridModel`:

```typescript
const gridModel = new GridModel({
    persistWith: {localStorageKey: 'orderGrid'},
    columns: [...]
});
```

See [Built-in Model Support](#built-in-model-support) below for which models support this.

## Built-in Model Support

Several Hoist models have built-in persistence support, accepting `persistWith` in their
constructor config and managing their own `PersistenceProvider` instances internally.

### GridModel

The most sophisticated built-in persistence, with four independently configurable aspects:

| Aspect | Path | What's Persisted |
|--------|------|------------------|
| `persistColumns` | `grid.columns` | Column visibility, order, width, pinned state |
| `persistSort` | `grid.sortBy` | Sort columns and directions |
| `persistGrouping` | `grid.groupBy` | Row grouping columns |
| `persistExpandToLevel` | `grid.expandLevel` | Expand level for grouped/tree data |

Each aspect can be `true` (use root `persistWith`), `false` (skip), or a `PersistOptions` object
to override the provider for that aspect:

```typescript
new GridModel({
    persistWith: {viewManagerModel: myViewManager},
    persistColumns: true,           // Use viewManagerModel (the default)
    persistSort: false,             // Do not persist - default sort should always be restored
    persistGrouping: true,          // Use viewManagerModel
    persistExpandToLevel: {localStorageKey: 'orderGridExpandLevel'},  // Override: use localStorage
    columns: [...]
});
```

### FormModel

Persists field values with optional include/exclude lists:

```typescript
new FormModel({
    persistWith: {
        localStorageKey: 'searchForm',
        includeFields: ['status', 'dateRange'],  // Only persist these fields
        // Or: excludeFields: ['password']        // Persist all except these
    },
    fields: [...]
});
```

FormModel handles `Date` and `LocalDate` serialization automatically — these types are tagged
with `_xhType` markers in the stored JSON and deserialized back to their proper types on read.

### TabContainerModel

Persists the active tab ID and favorite tabs (for dynamic tab switchers):

```typescript
new TabContainerModel({
    persistWith: {
        localStorageKey: 'mainTabs',
        persistActiveTabId: true,      // Persist last-active tab
        persistFavoriteTabIds: true     // Persist favorited tabs
    },
    tabs: [...]
});
```

**Note:** `persistActiveTabId` must be `false` (or omitted) when using route-based tabs (`route`
config), as the route already determines the active tab.

### PanelModel

Persists collapsed state and panel size. Panels are frequently a good candidate for localStorage
persistence, since panel sizing and layout tend to be driven by screen size and device
considerations rather than needing to roam across devices:

```typescript
new PanelModel({
    persistWith: {localStorageKey: 'detailPanel'},
    side: 'bottom',
    defaultSize: 400,
    collapsible: true
});
```

### GroupingChooserModel

Persists the selected grouping dimensions and optionally favorite groupings. When
`persistFavorites` is configured, the component automatically enables UI for saving, loading, and
managing favorite groupings — no additional setup required.

The `persistFavorites` option can use a different backing store than the value itself. This is a
useful pattern when you have multiple choosers across different views that share the same
dimensions. The selected value persists per-instance (e.g. within a ViewManager view), but
favorites can be stored in a server-side preference and shared across all choosers:

```typescript
new GroupingChooserModel({
    persistWith: {
        viewManagerModel: myViewManager,                        // Value: per-view
        persistFavorites: {prefKey: 'favePortfolioGroupings'}   // Favorites: shared across views
    },
    dimensions: ['region', 'sector', 'symbol'],
    initialValue: ['region', 'sector']
});
```

### FilterChooserModel

Persists the active filter selections and optionally favorite filters. The same split-store
pattern can be used here — filter value persists per-instance, favorites shared across views:

```typescript
new FilterChooserModel({
    persistWith: {
        viewManagerModel: myViewManager,                      // Value: per-view
        persistFavorites: {prefKey: 'favePortfolioFilters'}   // Favorites: shared across views
    },
    fieldSpecs: [...]
});
```

## Configuration Inheritance

The `persistWith` property on `HoistBase` establishes default persistence options for the model
and its children. Child components can inherit these defaults and override specific settings.

### How `mergePersistOptions` Works

When a child specifies persistence options, `PersistenceProvider.mergePersistOptions()` combines
the parent defaults with the child overrides using this rule:

- **Type-related keys** (`prefKey`, `localStorageKey`, `viewManagerModel`, etc.) — child values
  **replace** the parent entirely. You can't inherit a `localStorageKey` and add a `prefKey`.
- **Other keys** (`path`, `debounce`, `settleTime`) — child values **merge** with parent values.

This means a model can set `persistWith` once and all its child models inherit the same backing
store, each using a different `path` to namespace their state:

```typescript
class ReportModel extends HoistModel {
    override persistWith = {viewManagerModel: myViewManager};

    @managed gridModel: GridModel;
    @managed filterModel: FilterChooserModel;
    @managed groupingModel: GroupingChooserModel;

    constructor() {
        super();
        // All children inherit the ViewManager provider but use their own paths
        this.gridModel = new GridModel({
            persistWith: this.persistWith,  // grid.columns, grid.sortBy, etc.
            columns: [...]
        });
        this.filterModel = new FilterChooserModel({
            persistWith: {...this.persistWith, persistFavorites: {prefKey: 'reportFilters'}},
            ...
        });
        // A second FilterChooserModel needs a custom path to avoid colliding
        // with the first — otherwise both would read/write 'filterChooser.value'.
        this.detailFilterModel = new FilterChooserModel({
            persistWith: {
                ...this.persistWith,
                path: 'detailFilterChooser',
                persistFavorites: false
            },
            ...
        });
        this.groupingModel = new GroupingChooserModel({
            persistWith: {...this.persistWith, persistFavorites: {prefKey: 'reportGroupings'}},
            ...
        });
    }
}
```

In this pattern, all components register with the same `ViewManagerModel`. When the user saves a
view, the grid columns/sort, filter selections, and grouping dimensions are all captured together.
Favorites are stored separately in preferences (server-side), since they should persist across
views. Note the custom `path` on `detailFilterModel` — without it, both filter models would
default to the same `filterChooser.value` path and overwrite each other.

## Timing and Construction Order

### `@persist` Decorator Timing

The `@persist` decorator operates during property initialization (before the constructor body
runs). It:

1. Reads the in-code default value
2. Creates a `PersistenceProvider` and reads from the backing store
3. If a stored value exists, replaces the default
4. Returns the final value as the property initializer result
5. After the next tick (once `makeObservable()` has completed), installs a MobX reaction to
   watch for future changes

This design ensures the persisted value is in place before any reactions see it — no thrashing.

### Constructor Sequence

For models using `persistWith` in their constructor config (like `GridModel`):

```
1. Set default values (column definitions, initial sort, etc.)
2. Configure persistence (PersistenceProvider reads store, applies saved state)
3. State is now ready — reactions and rendering see the persisted values
```

### ViewManager Initialization

`ViewManagerModel` requires async initialization before it can be used as a persistence provider.
Models that use ViewManager persistence should create the `ViewManagerModel` in `AppModel.initAsync()`
and pass it to child models after it's ready. See
[Initialize in AppModel](../../cmp/viewmanager/README.md#initialize-in-appmodel) in the
ViewManager README for the standard setup pattern.

## Common Patterns

### Model with `@persist` Decorators

```typescript
class FilterPanelModel extends HoistModel {
    override persistWith = {localStorageKey: 'filterPanel'};

    @bindable @persist showAdvanced = false;
    @bindable @persist includeArchived = false;
    @observable.ref @persist selectedStatuses = ['active', 'pending'];
}
```

### Grid with ViewManager Persistence

```typescript
class OrdersModel extends HoistModel {
    override persistWith = {viewManagerModel: AppModel.instance.ordersViewManager};

    @managed gridModel = new GridModel({
        persistWith: this.persistWith,
        columns: [...]
    });

    @managed filterModel = new FilterChooserModel({
        persistWith: this.persistWith,
        ...
    });
}
```

### Panel Collapse/Resize with localStorage

```typescript
class DetailModel extends HoistModel {
    @managed panelModel = new PanelModel({
        persistWith: {localStorageKey: 'detailPanel'},
        side: 'bottom',
        defaultSize: 350,
        collapsible: true,
        resizable: true
    });
}
```

## Common Pitfalls

### Decorator Ordering

`@persist` (or `@persist.with`) must come after the MobX decorator. Since decorators in
TypeScript are applied bottom-up, `@persist` needs to be the inner decorator so it runs first
and sets up the value before MobX makes it observable:

```typescript
// ✅ Correct: @bindable first (outer), @persist second (inner, runs first)
@bindable @persist showAdvanced = false;

// ❌ Wrong: @persist is outer, runs after @bindable — fails to find the property
@persist @bindable showAdvanced = false;
```

### Missing `persistWith` on the Model

`@persist` and `markPersist()` merge their options with `this.persistWith`. If `persistWith` is
not set on the model and no explicit provider options are given to the decorator, the persistence
provider cannot be created:

```typescript
// ❌ No persistWith on model — @persist has no backing store
class MyModel extends HoistModel {
    @bindable @persist showAdvanced = false;
}

// ✅ Set persistWith to establish the backing store
class MyModel extends HoistModel {
    override persistWith = {localStorageKey: 'myModel'};
    @bindable @persist showAdvanced = false;
}
```

### Conflicting Route and Persisted Active Tab

`TabContainerModel` cannot use both `route` and `persistActiveTabId` — the route determines the
active tab, so persisting it would conflict. The model logs a warning if both are configured.

## Key Source Files

| File | Contents |
|------|----------|
| `core/persist/PersistenceProvider.ts` | Base provider — `create()`, `bindToTarget()`, `mergePersistOptions()`, read/write/clear |
| `core/persist/Persistable.ts` | `Persistable` interface, `PersistableState` wrapper |
| `core/persist/PersistOptions.ts` | `PersistOptions` interface, `PersistenceProviderType` |
| `core/HoistBase.ts` | `persistWith` property, `markPersist()` method |
| `core/HoistBaseDecorators.ts` | `@persist`, `@persist.with` decorators, timing logic |
| `core/persist/provider/LocalStorageProvider.ts` | Browser localStorage provider |
| `core/persist/provider/SessionStorageProvider.ts` | Browser sessionStorage provider |
| `core/persist/provider/PrefProvider.ts` | Server-side Preference provider |
| `core/persist/provider/ViewManagerProvider.ts` | ViewManager saved views provider |
| `core/persist/provider/DashViewProvider.ts` | Dashboard widget state provider |
| `core/persist/provider/CustomProvider.ts` | App-defined getData/setData provider |
| `cmp/grid/impl/InitPersist.ts` | GridModel persistence setup (columns, sort, grouping, expandLevel) |
| `cmp/form/FormModel.ts` | FormModel persistence (field values, Date/LocalDate serialization) |
| `cmp/tab/TabContainerModel.ts` | TabContainerModel persistence (activeTabId, favoriteTabIds) |
| `desktop/cmp/panel/PanelModel.ts` | PanelModel persistence (collapsed, size) |
