# Core Package

## Overview

The `/core/` package contains the foundational classes and utilities that define Hoist's architecture.
Understanding these concepts is essential for working with any part of the framework.

Hoist applications are built around three primary artifact types:

| Artifact | Purpose | Lifecycle |
|----------|---------|-----------|
| **Components** | UI rendering via React | Transient - mount/unmount with views |
| **Models** | Observable state + business logic | Varies - can be linked to components or standalone |
| **Services** | App-wide data access + shared state | Singleton - live for app lifetime |

All three share a common foundation via `HoistBase`, which provides MobX integration, resource
management, and lifecycle support.

## Class Hierarchy

```
HoistBase (foundation)
├── HoistModel (stateful UI backing)
│   └── HoistAppModel (root application model)
├── HoistService (singleton services)
└── Store (data containers - see /data/)
```

## HoistBase

**File**: `HoistBase.ts`

The abstract foundation for all Hoist objects. Not typically extended directly by applications -
use `HoistModel`, `HoistService`, or `Store` instead.

### Key Features

**MobX Subscription Management**
```typescript
// Managed reaction - explicitly declare what to track
this.addReaction({
    track: () => this.selectedId,
    run: id => this.loadDetailsAsync(id),
    debounce: 300  // optional debouncing
});

// Preferred: pass multiple specs to a single addReaction call
this.addReaction(
    {track: () => this.selectedId, run: () => this.loadDetailsAsync()},
    {track: () => this.filters, run: () => this.applyFilters(), debounce: 100},
    {when: () => this.isReady, run: () => this.onReady()}  // one-time "when" form
);

// Managed autorun - tracks whatever observables are read
this.addAutorun(() => {
    console.log('Selection changed to:', this.selectedRecord?.name);
});

// Both are automatically disposed when the object is destroyed
```

**Resource Cleanup**
```typescript
export class MyModel extends HoistModel {
    // @managed marks child objects for automatic cleanup
    @managed gridModel = new GridModel({...});
    @managed detailModel = new DetailModel();

    // Or mark programmatically
    constructor() {
        super();
        this.markManaged(this.createHelperModel());
    }
}
// When MyModel.destroy() is called, all managed children are also destroyed
```

```typescript
// ✅ Do: Manage objects your class creates
@managed gridModel = new GridModel({...});

// ❌ Don't: Manage objects passed in from elsewhere - the provider controls their lifecycle
@managed gridModel = config.gridModel;
```

**Avoid:** Applying `@managed` to objects that don't implement `destroy()`. Objects that should
typically be managed include HoistModels, Stores, Cubes, and CubeViews.

**State Persistence**
```typescript
class MyModel extends HoistModel {
    override persistWith = {prefKey: 'MyModelState'};

    // Decorator form - syncs with configured PersistenceProvider
    @persist @bindable showAdvanced = false;

    // Or programmatic form for custom timing
    constructor() {
        super();
        makeObservable(this);
        this.markPersist('showAdvanced', {path: 'myModel.showAdvanced'});
    }
}
```

### Core API

| Method | Purpose |
|--------|---------|
| `addReaction(spec)` | Managed MobX reaction with explicit tracking |
| `addAutorun(fn)` | Managed MobX autorun with dynamic tracking |
| `markManaged(obj)` | Register object for cleanup on destroy |
| `markPersist(prop)` | Sync observable property with storage |
| `setBindable(prop, val)` | Set value via conventional setter |
| `destroy()` | Clean up all managed resources |
| `xhId` | Unique identifier for this instance |

## HoistModel

**File**: `model/HoistModel.ts`

The canonical unit for stateful UI backing in Hoist. Models hold observable state, implement
business logic, and coordinate data loading.

### Linked vs Unlinked Models

Models can operate in two modes:

**Linked Models** - Created by Hoist component wiring (`creates()` or `uses()` with config):
- 1:1 relationship with a component instance
- Access to `componentProps` (observable React props)
- Can lookup ancestor models via `lookupModel()`
- Receive lifecycle callbacks (`onLinked`, `afterLinked`)
- Auto-loaded on mount if `doLoadAsync()` is implemented
- Automatically destroyed on component unmount

**Unlinked Models** - Created directly by application code:
- Standalone state holders
- No component binding or context participation
- Application manages lifecycle

### Creating a Model

```typescript
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {bindable, makeObservable, observable, runInAction} from '@xh/hoist/mobx';

class UserListModel extends HoistModel {
    // Observable state
    @observable.ref users: User[] = [];
    @bindable selectedUserId: string = null;

    // Managed child model - we create it, so we manage it
    @managed detailModel = new UserDetailModel();

    constructor() {
        super();
        makeObservable(this);  // Required when adding new observables
    }

    // Opt into managed loading by implementing this template method
    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            const users = await XH.fetchJson({url: 'api/users', loadSpec});
            runInAction(() => this.users = users);
        } catch (e) {
            XH.handleException(e);
        }
    }

    // Linked model lifecycle hook
    override onLinked() {
        // Safe to use lookupModel() and componentProps here
        const parentModel = this.lookupModel(ParentModel);
    }
}
```

### Model Lookup

Linked models can access ancestor models in the component hierarchy:

```typescript
class ChildModel extends HoistModel {
    // Decorator form - injected during onLinked
    @lookup(ParentModel) parentModel: ParentModel;

    // Or programmatic form
    override onLinked() {
        const parent = this.lookupModel(ParentModel);
        const anyAncestor = this.lookupModel('*');  // Wildcard - nearest model
    }
}
```

### Load Support

When `doLoadAsync()` is implemented, the model gains managed loading:

```typescript
// Trigger loads
await model.loadAsync();           // Initial/manual load
await model.refreshAsync();        // User-triggered refresh
await model.autoRefreshAsync();    // Auto-refresh (skips if pending)

// Track load state
model.loadObserver.isPending;      // Boolean for masking UI
model.lastLoadRequested;           // Timestamp
model.lastLoadCompleted;           // Timestamp
model.lastLoadException;           // Last error, if any
```

The `LoadSpec` passed to `doLoadAsync()` provides metadata about the load:

```typescript
override async doLoadAsync(loadSpec: LoadSpec) {
    const {isRefresh, isAutoRefresh} = loadSpec;

    // Adjust behavior based on load type
    if (isAutoRefresh) {
        // Lightweight refresh - skip expensive operations
    }

    // Check if a newer load has been triggered (useful for long-running loads)
    if (loadSpec.isStale) return;

    // Pass loadSpec to fetch calls for consistent tracking
    const data = await XH.fetchJson({url: 'api/data', loadSpec});
}
```

```typescript
// ✅ Do: Use public entry points which create LoadSpec for you
await model.loadAsync();        // isRefresh: false
await model.refreshAsync();     // isRefresh: true
await model.autoRefreshAsync(); // isAutoRefresh: true, skips if pending

// ❌ Don't: Call doLoadAsync directly - bypasses LoadSpec creation and tracking
await model.doLoadAsync();
```

## HoistService

**File**: `HoistService.ts`

Singleton classes for app-wide state and data access. Services are installed once during app
initialization and accessed globally via the `XH` singleton.

### Creating a Service

```typescript
import {HoistService, XH} from '@xh/hoist/core';

class TradeService extends HoistService {
    // Called during app startup - can block if it throws
    override async initAsync() {
        await this.loadReferenceDataAsync();
    }

    // Optional managed loading (same pattern as HoistModel)
    override async doLoadAsync(loadSpec: LoadSpec) {
        // Refresh cached data
    }

    // Service API
    async submitTradeAsync(trade: Trade): Promise<TradeResult> {
        return XH.postJson({url: 'api/trades', body: trade});
    }
}
```

### Installing Services

Services are installed in your `AppModel.initAsync()`:

```typescript
class AppModel extends HoistAppModel {
    override async initAsync() {
        // Install custom services - multiple calls for ordered initialization
        await XH.installServicesAsync(TradeService, PortfolioService);
        await XH.installServicesAsync(ReportService);  // Depends on above
    }
}
```

### Accessing Services

```typescript
// Access via XH using camelCased class name
XH.tradeService.submitTradeAsync(trade);

// Built-in services
XH.fetchService      // HTTP requests
XH.configService     // Server-side configuration
XH.prefService       // User preferences
XH.identityService   // Current user info
```

### Services vs Models

| Aspect | Service | Model |
|--------|---------|-------|
| Instances | One per app | Many per app |
| Lifecycle | App lifetime | Varies |
| State | Shared across app | Scoped to component/feature |
| Purpose | Data access, caching | UI state, business logic |

## Components and hoistCmp

**File**: `HoistComponent.ts`

Hoist components are functional React components enhanced with MobX reactivity and model integration.

### Creating Components

```typescript
import {hoistCmp, creates, uses} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';

// Component that creates its own model
export const userList = hoistCmp.factory({
    model: creates(UserListModel),
    render({model}) {
        return panel({
            title: 'Users',
            item: grid(), // auto-discovers `GridModel` instance on `model`
            mask: 'onLoad'
        });
    }
});

// Component that receives model from parent/context
export const userDetail = hoistCmp.factory({
    model: uses(UserDetailModel),
    render({model}) {
        return panel({
            title: model.hasUser ? `Viewing ${model.username}` : `Select a User`,
            item: form({ // auto-discovers `FormModel` instance on `model`
                items: [/* formField components */]
            })
        })
    }
});

// Simple component with no model
export const statusBadge = hoistCmp.factory({
    model: false,
    className: 'status-badge',
    render({status, className}) {
        return div({className, item: status});
    }
});
```

### Component Configuration

| Option | Default | Purpose |
|--------|---------|---------|
| `render` | required | Render function `(props, ref?) => ReactNode` |
| `model` | `uses('*')` | Model spec via `creates()` or `uses()` |
| `className` | - | Base CSS class (combined with prop className) |
| `displayName` | - | Component name for debugging |
| `memo` | `true` | Wrap with React.memo |
| `observer` | `true` | Enable MobX reactivity |

> **Note:** When `className` is specified in the component config, it becomes the base class for
> the component. Any `className` passed by callers is added as an additional class, and the
> combined value is provided to `render()` via props. Apply this merged `className` to the
> component's root element.

### Model Specs: creates() vs uses()

**`creates(ModelClass)`** - Component creates and owns its model:
- Model is instantiated on first render
- Model is linked to component lifecycle
- Model is destroyed on unmount
- Model receives `onLinked`/`afterLinked` callbacks

**`uses(selector)`** - Component receives model from outside:
- Selector can be: class, `'*'` (any), `true`, or predicate function
- Options control fallback behavior:

```typescript
uses(GridModel)                                    // Require GridModel
uses(GridModel, {optional: true})                  // GridModel or null
uses(GridModel, {createDefault: true})             // Create if not found
uses(GridModel, {createFromConfig: true})          // Create from modelConfig prop
uses('*')                                          // Accept any model from context
```

**Model Resolution and Context Lookup:**

When a component specifies `uses(ModelClass)`, the model is resolved in this order:

1. **Explicit prop** - A model instance passed directly via the `model` prop
2. **Context lookup** - Search ancestor components for a matching published model
3. **Default creation** - If `createDefault: true`, create a new instance as fallback

Context lookup is enabled by default (`fromContext: true`), and `creates()` components publish
their models to context by default (`publishMode: 'default'`). This means child components can
automatically find their parent's model without explicit prop passing.

A common pattern: a panel model creates a `GridModel` and assigns it to a public property. The
component renders `grid()` with no model prop - the Grid component's `uses(GridModel)` spec
automatically finds the GridModel in context:

```typescript
// Model creates and holds a GridModel
class PortfolioPanelModel extends HoistModel {
    @managed gridModel: GridModel;

    constructor() {
        super();
        this.gridModel = new GridModel({
            columns: [{field: 'name'}, {field: 'value'}]
        });
    }
}

// Component renders grid() - no model prop needed!
const [PortfolioPanel, portfolioPanel] = hoistCmp.withFactory({
    model: creates(PortfolioPanelModel),
    render() {
        return panel({
            title: 'Portfolio',
            item: grid()  // GridModel found via context lookup
        });
    }
});
```

This works because:
1. `PortfolioPanelModel` is published to context when `PortfolioPanel` renders
2. `grid()` uses `uses(GridModel)` internally and searches context for a GridModel
3. Context lookup traverses ancestor models' public properties, finding `gridModel`

This pattern enables clean component hierarchies where models are defined at the appropriate level
and automatically available to descendants, eliminating prop drilling. When you need to pass a
model explicitly (e.g., multiple GridModels), see [Common Patterns](#multiple-models-of-same-type).

### Forward Refs

Components accepting a ref should declare a two-argument render function:

```typescript
export const myInput = hoistCmp.factory({
    render({value, onChange}, ref) {
        return input({ref, value, onChange});
    }
});
```

## Element Factories

**File**: `elem.ts`

Hoist strongly prefers element factories over JSX for rendering. Factories provide a declarative,
JavaScript-native approach to building component trees.

### Basic Usage

```typescript
import {div, span} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';

// Config object form - props + children via item/items
panel({
    title: 'My Panel',
    className: 'my-panel',
    items: [
        div({className: 'header', item: 'Welcome'}),
        button({text: 'Click Me', onClick: handleClick})
    ]
})

// Shorthand form - children as arguments (when no other props needed)
div(
    span('Hello'),
    span('World')
)
```

### ElementSpec Properties

| Property | Purpose |
|----------|---------|
| `item` / `items` | Child element(s) |
| `omit` | Conditional rendering - `true` or `() => boolean` to exclude |
| `key` | React key |
| `className` | CSS class(es) |
| All others | Passed as props to component |

> **Note:** `item` and `items` are interchangeable - either accepts a single element or an array.
> Use whichever reads better in context.

### Conditional Rendering

The `omit` property provides clean conditional rendering without ternaries:

```typescript
panel({
    items: [
        grid({model: gridModel}),
        // Only render when data is loaded
        chart({model: chartModel, omit: !hasData}),
        // Dynamic condition
        exportButton({omit: !model.exportsEnabled})
    ]
})
```

### Creating Factories

```typescript
import {elementFactory} from '@xh/hoist/core';
import {MyComponent} from './MyComponent';

// From any React component
export const myComponent = elementFactory(MyComponent);

// Combined with hoistCmp
export const myHoistCmp = hoistCmp.factory({...});  // Returns factory directly
```

## XH Singleton

**File**: `XH.ts`

The top-level API entry point for the entire Hoist framework. Provides access to services,
application state, and common operations.

### Key Categories

**Application State**
```typescript
XH.appCode              // Application identifier
XH.appState             // 'PRE_AUTH' | 'INITIALIZING' | 'RUNNING' | 'SUSPENDED'
XH.darkTheme            // Current theme (observable)
XH.viewportSize         // {width, height} (observable)
```

**Data Access and common Service API aliases**
```typescript
await XH.fetchJson({url: 'api/users'});
await XH.postJson({url: 'api/users', body: newUser});
XH.getConf('featureEnabled', false);  // Server config
XH.getPref('gridPageSize', 50);       // User preference
```

**User Interaction**

```typescript
import {SECONDS} from '@xh/hoist/utils';

XH.successToast('Saved successfully');
XH.toast({message: 'Some message that might take time to absorb', timeout: 30 * SECONDS});
await XH.confirm({message: 'Delete this record?'});
await XH.prompt({message: 'Enter name:'});
XH.handleException(error);
```

**Navigation**
```typescript
XH.navigate('users', {id: 123});
XH.appendRoute('detail');
XH.popRoute();
```

## Decorators Reference

| Decorator | Package | Purpose |
|-----------|---------|---------|
| `@observable` | mobx | Mark property as observable state |
| `@computed` | mobx | Mark getter as derived/cached value |
| `@action` | mobx | Mark method as state-modifying action |
| `@bindable` | @xh/hoist/mobx | Observable + auto-generated setter |
| `@managed` | @xh/hoist/core | Mark for automatic cleanup |
| `@persist` | @xh/hoist/core | Sync with persistence provider |
| `@lookup` | @xh/hoist/core | Inject ancestor model (linked models) |

## Common Patterns

### Constructor Boilerplate

```typescript
class MyModel extends HoistModel {
    @observable value = null;
    @managed childModel = new ChildModel();

    constructor() {
        super();
        makeObservable(this);  // Always call when adding observables

        // Set up reactions after makeObservable
        this.addReaction({
            track: () => this.value,
            run: () => this.onValueChange()
        });
    }
}
```

### Async Method Naming

Methods returning Promises are suffixed with `Async`:

```typescript
async loadUsersAsync() {...}
async submitFormAsync() {...}
async initAsync() {...}
```

### Multiple Models of Same Type

When a model contains multiple instances of the same model class (e.g., two GridModels), context
lookup cannot determine which one to use. In these cases, pass the model explicitly:

```typescript
class ComparisonPanelModel extends HoistModel {
    @managed leftGridModel: GridModel;
    @managed rightGridModel: GridModel;

    constructor() {
        super();
        this.leftGridModel = new GridModel({columns: [...]});
        this.rightGridModel = new GridModel({columns: [...]});
    }
}

const [ComparisonPanel, comparisonPanel] = hoistCmp.withFactory({
    model: creates(ComparisonPanelModel),
    render({model}) {
        return hbox(
            grid({model: model.leftGridModel}),   // Explicit - context has two GridModels
            grid({model: model.rightGridModel})
        );
    }
});
```

Use explicit model props when:
- Multiple models of the same type exist in context
- You want to bypass context lookup for clarity
- The model comes from a different part of the hierarchy

### Error Handling

Exception handling in `doLoadAsync()` should account for cases where failure is expected or
acceptable, and should clean up any stale state to avoid displaying data that no longer matches
the user's query.

```typescript
override async doLoadAsync(loadSpec: LoadSpec) {
    try {
        const users = await XH.fetchJson({url: 'api/users', loadSpec});
        runInAction(() => this.users = users);
    } catch (e) {
        // Stale or auto-refresh failures can often be ignored silently
        if (loadSpec.isStale || loadSpec.isAutoRefresh) return;

        // Clear any stale data so UI reflects the failed state
        runInAction(() => this.users = []);

        // Call to handleException visually alerts users and reports to server for tracking
        XH.handleException(e, {
            message: 'Failed to load users',
            alertType: 'toast'
        });
    }
}
```

## Common Pitfalls

### Forgetting `makeObservable(this)` in Subclasses

MobX requires each class that introduces new `@observable` or `@computed` properties to call
`makeObservable(this)` in its constructor. The base class call doesn't cover subclass decorators.

```typescript
// ❌ Wrong: Observables won't work
class MyModel extends HoistModel {
    @observable data = null;
    // Missing makeObservable call!
}

// ✅ Correct: Call makeObservable in constructor
class MyModel extends HoistModel {
    @observable data = null;

    constructor() {
        super();
        makeObservable(this);
    }
}
```

### Calling `lookupModel()` Before Model is Linked

Model lookup only works for linked models, and only during or after the `onLinked()` callback.

```typescript
// ❌ Wrong: Called too early
class MyModel extends HoistModel {
    parentModel = this.lookupModel(ParentModel);  // Will warn and return null
}

// ✅ Correct: Call in onLinked or later
class MyModel extends HoistModel {
    parentModel: ParentModel;

    override onLinked() {
        this.parentModel = this.lookupModel(ParentModel);
    }
}
```

### Managing Objects You Don't Own

Don't use `@managed` on objects passed in from elsewhere - the provider controls their lifecycle.

```typescript
// ❌ Wrong: Will destroy a model the parent still needs
class ChildModel extends HoistModel {
    @managed gridModel: GridModel;

    constructor({gridModel}) {
        super();
        this.gridModel = gridModel;  // Passed in from parent
    }
}

// ✅ Correct: Only manage what you create
class ChildModel extends HoistModel {
    gridModel: GridModel;  // Not managed - parent owns it
    @managed localStore = new Store({...});  // Managed - we created it
}
```

### Mutating Observables Outside Actions

MobX requires observable state changes to occur within actions. Use `@action`, `runInAction()`,
or `@bindable` (which generates action-wrapped setters).

```typescript
// ❌ Wrong: Direct mutation outside action
async doLoadAsync() {
    const data = await fetchData();
    this.data = data;  // MobX warning in strict mode
}

// ✅ Correct: Wrap in runInAction
async doLoadAsync() {
    const data = await fetchData();
    runInAction(() => this.data = data);
}

// ✅ Also correct: Use @bindable to reduce boilerplate
@bindable data = null;  // Hoist installs an action-wrapped setter

async doLoadAsync() {
    const data = await fetchData();
    this.data = data;  // Direct assignment works - setter created by `@bindable` is an action
}
```

## Related Packages

- [`/data/`](../data/README.md) - Store, StoreRecord, Field - data layer infrastructure
- [`/svc/`](../svc/README.md) - Built-in services (FetchService, ConfigService, etc.)
- [`/cmp/`](../cmp/README.md) - Cross-platform components
- [`/desktop/`](../desktop/README.md) and [`/mobile/`](../mobile/README.md) - Platform-specific components
- [`/mobx/`](../mobx/README.md) - `@bindable`, `makeObservable`, MobX re-exports and configuration
- [`/promise/`](../promise/README.md) - Promise extensions (`catchDefault`, `track`, `linkTo`, `timeout`)
- [`/utils/`](../utils/README.md) - Decorators (`@debounced`, `@computeOnce`), Timer, LocalDate, logging
