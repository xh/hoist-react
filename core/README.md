# Core Package

| Section | Description |
|---------|-------------|
| [Overview](#overview) | Architecture overview and primary artifact types |
| [Class Hierarchy](#class-hierarchy) | Inheritance tree for Hoist's foundational classes |
| [HoistBase](#hoistbase) | MobX integration, resource management, and lifecycle |
| [HoistModel](#hoistmodel) | Stateful UI backing — linked/unlinked models, loading, lookup |
| [HoistService](#hoistservice) | Singleton services for app-wide state and data access |
| [Components and hoistCmp](#components-and-hoistcmp) | Functional components with MobX reactivity, model wiring, and defaults |
| [Element Factories](#element-factories) | Declarative JS-native alternative to JSX |
| [XH Singleton](#xh-singleton) | Top-level API entry point for the framework |
| [Decorators Reference](#decorators-reference) | Quick reference for all Hoist and MobX decorators |
| [Common Patterns](#common-patterns) | Constructor boilerplate, async naming, multiple models, error handling |
| [Common Pitfalls](#common-pitfalls) | Frequently encountered issues and how to avoid them |

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

**State Persistence** (see [Persistence concept doc](../docs/persistence.md) for full details)
```typescript
class MyModel extends HoistModel {
    override persistWith = {prefKey: 'MyModelState'};

    // Decorator form - syncs with configured PersistenceProvider
    @persist @bindable accessor showAdvanced = false;

    // Or programmatic form for custom timing
    constructor() {
        super();
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
import {bindable, observable, runInAction} from '@xh/hoist/mobx';

class UserListModel extends HoistModel {
    // Observable state
    @observable.ref accessor users: User[] = [];
    @bindable accessor selectedUserId: string = null;

    // Managed child model - we create it, so we manage it
    @managed detailModel = new UserDetailModel();

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

> See [Lifecycles: Models, Services, and Load/Refresh](../docs/lifecycle-models-and-services.md) for a
> comprehensive guide to model and service lifecycles, LoadSupport, the refresh system, and
> common patterns.

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

Callers can also pass arbitrary application data through `LoadSpec.meta` to communicate
context-specific information into `doLoadAsync()` - useful for tagging the source of a load,
passing parameters through a refresh chain, or branching behavior on a per-call basis. The
field is always defined (defaults to `{}` when omitted), so consumers can read keys without a
null check on `meta` itself:

```typescript
// Caller - supply meta when triggering a load or refresh
await model.loadAsync({meta: {reason: 'userClickedSync', accountId}});
await model.refreshAsync({reason: 'pollTick'});

// doLoadAsync - read keys directly off meta
override async doLoadAsync(loadSpec: LoadSpec) {
    const {reason, accountId} = loadSpec.meta;
    if (reason === 'pollTick') { /* lighter-weight path */ }
}
```

Note the calling shape: `loadAsync()` accepts a full `LoadSpecConfig` (so `meta` goes inside
`{meta: {...}}`), while `refreshAsync()` and `autoRefreshAsync()` accept `meta` directly as
their only argument - their `isRefresh`/`isAutoRefresh` flags are already implied.

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
    className: 'my-app-status-badge',
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
| `defaults` | - | Typed static config for the component, overridable at app bootstrap (see below) |

> **Best practice: Define `className` in the component spec** rather than hardcoding it inside
> the render function. The framework automatically merges the spec's base class with any
> `className` passed by callers, ensuring every component consistently supports caller-provided
> CSS class overrides without each render function needing to handle the merging itself.
>
> The merged `className` is provided to `render()` via props — it already contains both the
> base class from the spec and any caller-supplied classes. Apply it to the component's root
> element. If you need to add conditional modifier classes, combine them with the prop value
> (e.g. via the `classNames` library) — but don't re-add the base class, it's already included.
>
> Hoist library components use the `xh-` prefix for their base class names (e.g.
> `className: 'xh-panel'`). Applications should standardize on their own app-specific prefix.

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

### Component Defaults

Components can declare a typed `defaults` object to expose **static, app-wide configuration** that
applications can override at bootstrap (e.g. in `Bootstrap.ts`) to customize all instances of the
component.

Most often this supplies default values for selected props — when read in `render` as fallbacks,
**instance props take precedence**. But `defaults` is not restricted to props and may carry other
app-overridable settings (thresholds, modes, etc.).

```typescript
// 1) Define a defaults interface — typically mirrors a few props the author wants to be
//    globally configurable, but may also include non-prop tunables.
export interface ButtonDefaults {
    minimal?: boolean;
    outlined?: boolean;
}

// 2) Pass as a second generic and include in the component config
export const [Button, button] = hoistCmp.withFactory<ButtonProps, ButtonDefaults>({
    displayName: 'Button',
    defaults: {
        minimal: true,
        outlined: false
    },
    render(props) {
        const {defaults} = Button;
        const {minimal = defaults.minimal, outlined = defaults.outlined, ...rest} = props;
        // ...
    }
});

// 3) Override in app Bootstrap.ts — mutate fields directly.
Button.defaults.minimal = false;
```

This pattern is analogous to `static defaults` on Model and Service classes (e.g.
`GridModel.defaults`), adapted for functional components created via `hoistCmp`.

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

### Authoring a Container Component: `items` In, `children` Out

There is an important asymmetry between the **calling** side of an element factory and the
**authoring** side of a Hoist component's render function. Understanding it is essential when
writing any component that accepts and renders child elements.

| Side | Prop name | Why |
|------|-----------|-----|
| **Calling** a factory | `item` / `items` | Hoist's config-object API for passing children |
| **Inside** a render function | `children` | The standard React prop populated by `React.createElement` |

When you call a factory like `panel({items: [a, b, c]})`, the factory strips `items` off the
config object and passes the values as **rest arguments** to `React.createElement(Panel, props,
a, b, c)`. React then exposes them inside the component as `props.children` — the standard React
children prop. There is no `items` prop reaching the render function; only `children` does.

The canonical pattern when writing a container component is therefore: **destructure `children`
from props, then pass them along to your inner factory as `items`**. This is exactly how Hoist's
own library components are implemented. From `cmp/layout/Box.ts`:

```typescript
export const [Box, box] = hoistCmp.withFactory<BoxComponentProps>({
    render(props, ref) {
        // Read inbound children as the standard React `children` prop...
        let [layoutProps, {children, model, testId, ...restProps}] = splitLayoutProps(props);

        // ...and pass them onward to the inner factory as `items`.
        return div({
            ref,
            ...restProps,
            items: children
        });
    }
});
```

Typing follows the same convention: `HoistProps` declares `children?: ReactNode`, so destructuring
`children` from `props` is fully typed and works for any component extending `HoistProps`.

#### Iterating, Wrapping, or Spreading Children

The simple pass-through pattern above relies on the fact that `items` and `item` accept any
`ReactNode` shape, so you can hand `children` directly to an inner factory. But if your
component needs to **inspect, transform, or interleave** children — e.g. prepend a header before
each child, wrap each in a styled box, or count them — you need an iterable array first.

React's `children` prop is intentionally opaque: it can be a single node, an array, a fragment,
`null`, or `undefined` depending on how the caller invoked the factory. Don't try to iterate it
directly. Use `React.Children.toArray()` to normalize to a flat, keyed array, then iterate or
spread as needed:

```typescript
import {Children} from 'react';
import {hbox, vbox, div} from '@xh/hoist/cmp/layout';

// A container that renders a fixed header above its children,
// each wrapped in a styled row.
export const labeledList = hoistCmp.factory({
    render({header, children}) {
        const items = Children.toArray(children);

        return vbox({
            className: 'my-labeled-list',
            items: [
                div({className: 'my-labeled-list__header', item: header}),
                ...items.map((child, idx) =>
                    hbox({
                        className: 'my-labeled-list__row',
                        items: [div({item: `${idx + 1}.`}), child]
                    })
                )
            ]
        });
    }
});
```

`Children.toArray` handles all the edge cases — missing children, a single child, a fragment, a
sparse array — and assigns stable keys based on each child's position, so React's reconciler
won't complain about missing `key` props on the wrapped children. This is the pattern used
internally by `Toolbar` (filtering and inserting separators between children) and `TileFrame`
(laying out a variable number of children in a grid). For shallow per-child transforms where
you don't also need an array (e.g. to count, slice, or interleave), `Children.map(children, fn)`
is a slightly more direct alternative.

#### Why the asymmetry?

`item`/`items` are deliberate Hoist enhancements to the config-object form — `item` (singular)
has no equivalent in standard React, and reads naturally for the very common case of a single
child (`panel({title, item: grid()})`). On the receiving side, however, the framework rides on
React's standard `createElement(type, props, ...children)` contract; what arrives at the render
function is whatever React provides, which is always `children`.

#### The `$item` / `$items` Escape Hatch

When a component being rendered actually defines its own `items` (or `item`/`omit`) prop — for
example, Blueprint's `OverflowList` — prefix it with `$` to bypass the factory's special handling
and pass it through as a real prop. The `$` is stripped before the prop reaches the component.

```typescript
// `overflowList` is from Blueprint and has its own `items` prop.
// Use `$items` to pass an array as a regular prop (not as Hoist children).
overflowList({
    $items: children as readonly ReactNode[],
    minVisibleItems: 3,
    visibleItemRenderer: item => item
});
```

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
    @observable accessor value = null;
    @managed childModel = new ChildModel();

    constructor() {
        super();
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

### Forgetting the `accessor` Keyword on Observables

TC39 decorators require the `accessor` keyword on properties decorated with `@observable`,
`@observable.ref`, `@bindable`, or `@bindable.ref`. Without `accessor`, the decorator cannot
intercept the property and observables silently won't react.

```typescript
// ❌ Wrong: Missing accessor — observables won't react
class MyModel extends HoistModel {
    @observable data = null;
}

// ✅ Correct: Use accessor with observable decorators
class MyModel extends HoistModel {
    @observable accessor data = null;
}
```

Note: `@computed` (on getters), `@action` (on methods), and `@managed` (on properties) do **not**
use `accessor`.

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

### Expecting `items` in Render Functions

A common trap when authoring a Hoist component is to assume that the `items`/`item` prop used to
*call* the factory also appears in the render function's `props`. It does not. The factory
translates `items` to React's standard children rest-args, which arrive at the render function as
`props.children`. See [Authoring a Container Component](#authoring-a-container-component-items-in-children-out)
for the full explanation.

```typescript
// ❌ Wrong: `items` is never populated on the inbound props.
export const myContainer = hoistCmp.factory({
    render({items, ...rest}) {           // items is always undefined here
        return panel({items, ...rest});
    }
});

// ✅ Correct: Destructure the standard React `children` prop, then pass it
// downstream as `items` to the next factory.
export const myContainer = hoistCmp.factory({
    render({children, ...rest}) {
        return panel({items: children, ...rest});
    }
});
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
@bindable accessor data = null;  // Hoist installs an action-wrapped setter

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
- [`/mobx/`](../mobx/README.md) - `@bindable`, MobX re-exports and configuration
- [`/promise/`](../promise/README.md) - Promise extensions (`catchDefault`, `track`, `linkTo`, `timeout`)
- [`/utils/`](../utils/README.md) - Decorators (`@debounced`, `@computeOnce`), Timer, LocalDate, logging
