# Routing

> **Status: DRAFT** — This document is awaiting review by the XH team. Content may be incomplete or inaccurate.

## Overview

Hoist provides client-side routing via `RouterModel`, a lightweight wrapper around
[Router5](https://router5.js.org/) that exposes route state as MobX observables. Applications
define their route hierarchy centrally in `HoistAppModel.getRoutes()`, and the framework handles
initialization, URL synchronization, and browser history management. Route state drives
`TabContainerModel` tab selection on desktop and `NavigatorModel` page navigation on mobile,
enabling URL-addressable views that integrate naturally with the browser's back/forward buttons.

Routing in Hoist is intentionally simple. Most applications do not need to interact with the
router directly — the primary integration point is `TabContainerModel.route`, which automatically
synchronizes tabs with route state. For more advanced use cases, `XH.routerState` provides the
observable state needed to build custom route-driven behaviors.

## How Routing is Initialized

Routing initialization is handled entirely by the framework. During app startup,
`AppContainerModel.completeInitAsync()` calls `startRouter()` after `AppModel.initAsync()` has
completed. This method:

1. Calls `appModel.getRoutes()` to retrieve the application's route definitions
2. Registers them with the underlying Router5 instance via `RouterModel.addRoutes()`
3. Sets the first route as the default
4. Starts the router, which reads the current URL and establishes the initial route state

Applications do not need to interact with `RouterModel` directly — it is created and managed as
a sub-model of `AppContainerModel`. Access the routing system through the `XH` singleton
convenience methods described below.

## Defining Routes

Routes are defined by overriding `getRoutes()` in your `AppModel` (which extends
`HoistAppModel`). This method returns an array of Router5 route specification objects with `name`,
`path`, and optional `children` properties.

```typescript
class AppModel extends HoistAppModel {

    override getRoutes() {
        return [{
            name: 'default',
            path: '/app',
            children: [
                {name: 'dashboard', path: '/dashboard'},
                {name: 'time', path: '/time'},
                {name: 'invoices', path: '/invoices'},
                {name: 'events', path: '/events'}
            ]
        }];
    }
}
```

### Route Spec Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Unique identifier for the route segment. Route names are dot-separated: `'default.dashboard'` |
| `path` | `string` | URL path segment. Prepended to the parent's path to form the full URL |
| `children` | `Route[]` | Nested child routes |
| `omit` | `Thunkable<boolean>` | Hoist extension — if `true`, the route is excluded from registration. Can be a function evaluated at registration time |

### Route Naming Conventions

Route names use dot-notation to represent the hierarchy. For the example above, the fully
qualified route names would be:

- `'default'` — resolves to `/app`
- `'default.dashboard'` — resolves to `/app/dashboard`
- `'default.time'` — resolves to `/app/time`
- `'default.invoices'` — resolves to `/app/invoices`

The first route returned by `getRoutes()` becomes the **default route** — the route navigated to
when the URL has no matching path. By convention, most apps name this `'default'` and map it to
their base context path (e.g. `'/app'` or `'/admin'`).

### Nested Route Hierarchies

Routes can be nested to any depth. This is essential for apps with nested `TabContainerModel`
instances, where each level of nesting corresponds to a level in the route hierarchy:

```typescript
override getRoutes() {
    return [{
        name: 'default',
        path: '/app',
        children: [
            {name: 'home', path: '/home'},
            {
                name: 'grids',
                path: '/grids',
                children: [
                    {name: 'standard', path: '/standard'},
                    {name: 'tree', path: '/tree'},
                    {name: 'columnFiltering', path: '/columnFiltering'}
                ]
            },
            {
                name: 'reports',
                path: '/reports',
                children: [
                    {name: 'daily', path: '/daily'},
                    {name: 'weekly', path: '/weekly'}
                ]
            }
        ]
    }];
}
// URLs: /app/home, /app/grids/standard, /app/reports/weekly, etc.
```

### Route Parameters

Route parameters are defined in the `path` using Router5's `:paramName` syntax. They are
extracted from the URL and made available via `XH.routerState.params`:

```typescript
override getRoutes() {
    return [{
        name: 'default',
        path: '/app',
        children: [
            {
                name: 'simpleRouting',
                path: '/simpleRouting',
                children: [{name: 'recordId', path: '/:recordId'}]
            }
        ]
    }];
}
// URL /app/simpleRouting/123 → XH.routerState.params = {recordId: '123'}
```

Router5 also supports optional URL query parameters. Parameters included in a path segment with
the `?paramName` syntax are extracted from the query string:

```typescript
{name: 'tree', path: '/tree?dims'}
// URL /app/grids/tree?dims=region → params = {dims: 'region'}
```

Parameter constraints can be specified using angle-bracket syntax (e.g. `/:id<\\d+>` for
numeric-only parameters). See the
[Router5 documentation](https://router5.js.org/guides/defining-routes) for full syntax details.

### Conditional Route Exclusion

Routes support an `omit` property (a Hoist extension, not part of Router5) that allows
declarative exclusion of routes at registration time. This is useful for role-gated sections:

```typescript
override getRoutes() {
    return [{
        name: 'default',
        path: '/app',
        children: [
            {name: 'dashboard', path: '/dashboard'},
            {name: 'admin', path: '/admin', omit: !XH.getUser().isHoistAdmin}
        ]
    }];
}
```

Note that `omit` is evaluated once at route registration time (during app startup) — it is not
reactive. For dynamic tab visibility based on changing conditions, use `TabConfig.omit` instead.

## XH Routing API

The `XH` singleton exposes the primary routing API used by application code:

| API | Type | Description |
|-----|------|-------------|
| `XH.routerState` | `State` (observable) | Current Router5 state object — `{name, path, params, meta}` |
| `XH.navigate(name, params?, opts?)` | method | Navigate to a route by its fully qualified name |
| `XH.appendRoute(name, params?)` | method | Append a route segment to the current route, preserving existing params |
| `XH.popRoute()` | method | Remove the last route segment from the current route, preserving params |
| `XH.router` | `Router` | Underlying Router5 router instance for advanced use |
| `XH.routerModel` | `RouterModel` | Hoist model hosting observable state — rarely needed directly |

### `XH.routerState`

The most commonly used property. It is a MobX `@observable.ref` value that updates whenever
the route changes, making it available for use in MobX reactions:

```typescript
this.addReaction({
    track: () => XH.routerState,
    run: (state) => {
        const {name, params} = state;
        console.log(`Route changed to ${name}`, params);
    }
});
```

The state object contains:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Fully qualified route name (e.g. `'default.grids.standard'`) |
| `path` | `string` | Resolved URL path (e.g. `'/app/grids/standard'`) |
| `params` | `object` | All route parameters, merged across all route segments |
| `meta` | `object` | Router5 metadata including `params` keys per route segment |

### `XH.navigate()`

Navigate to a route by its fully qualified name. This is a shortcut to `XH.router.navigate()`:

```typescript
// Navigate to a specific route
XH.navigate('default.grids.standard');

// Navigate with parameters
XH.navigate('default.other.simpleRouting.recordId', {recordId: 123});

// Replace the current history entry (no new back-button step)
XH.navigate('default.other.simpleRouting', {}, {replace: true});
```

### `XH.appendRoute()` and `XH.popRoute()`

These convenience methods manipulate the current route by adding or removing segments:

```typescript
// If current route is 'default.grids', navigate to 'default.grids.standard'
XH.appendRoute('standard');

// If current route is 'default.grids.standard', navigate back to 'default.grids'
XH.popRoute();

// Append with additional parameters
XH.appendRoute('detail', {recordId: 123});
```

These are particularly useful in mobile apps, where `NavigatorModel` uses `appendRoute` and
`popRoute` to push and pop pages on the navigation stack.

## TabContainerModel Route Integration

The most common routing integration in Hoist desktop apps is through `TabContainerModel`. When
a tab container is configured with a `route`, it automatically synchronizes the active tab with
the URL.

### How It Works

1. The container observes `XH.routerState` via a MobX reaction
2. When the route changes, it finds the tab whose ID matches the active child route
3. When a tab is activated programmatically, the container navigates to the corresponding route
4. Router5 `forward` rules ensure that navigating to a parent route (e.g. `'default'`) redirects
   to the active child tab's route (e.g. `'default.dashboard'`)

### Configuration

Set `route` on `TabContainerModel` to the route name that corresponds to the parent of the
tab-level routes. Tab IDs must match the child route names:

```typescript
// 1. Define routes in AppModel
override getRoutes() {
    return [{
        name: 'default',
        path: '/app',
        children: [
            {name: 'dashboard', path: '/dashboard'},
            {name: 'time', path: '/time'},
            {name: 'invoices', path: '/invoices'},
            {name: 'events', path: '/events'}
        ]
    }];
}

// 2. Configure TabContainerModel with matching route and tab IDs
@managed tabModel = new TabContainerModel({
    route: 'default',
    tabs: [
        {id: 'dashboard', content: dashboardPanel},   // matches route name 'dashboard'
        {id: 'time', content: timePanel},              // matches route name 'time'
        {id: 'invoices', content: invoicePanel},       // matches route name 'invoices'
        {id: 'events', content: eventPanel}            // matches route name 'events'
    ]
});
```

### Nested Tab Containers

When a tab's `content` is a `TabConfig[]` array or `TabContainerConfig` object (from which
`TabModel.parseContent()` creates a child `TabContainerModel`), the child container inherits
routing automatically. The child's `route` is set to
`parentRoute.tabId`:

```typescript
// Route hierarchy: default > grids > {standard, tree, columnFiltering}
@managed tabModel = new TabContainerModel({
    route: 'default',
    tabs: [
        {id: 'home', content: homePanel},
        {
            id: 'grids',
            content: {
                tabs: [
                    {id: 'standard', content: standardGrid},
                    {id: 'tree', content: treeGrid},
                    {id: 'columnFiltering', content: columnFilteringGrid}
                ]
            }
        }
    ]
});
// URL /app/grids/tree activates: outer tab 'grids' → inner tab 'tree'
```

### Route vs Persistence

`TabContainerModel` supports `persistWith` to remember the user's last active tab across
sessions. However, `persistActiveTabId` and `route` should not be used together — routing
takes precedence over persisted tab state, and the two can conflict. Hoist will log a warning
if `persistActiveTabId` is explicitly set to a truthy value while `route` is also configured.
Note that simply passing `persistWith` alongside `route` is safe, because the default for
`persistActiveTabId` is `!this.route` (i.e. it automatically disables itself when routing is
active).

Other persistence options (such as `persistFavoriteTabIds` for dynamic tab switcher
configurations) are compatible with routing.

## Observing Route State

`XH.routerState` is the primary mechanism for building custom route-aware behaviors. Because it
is a MobX observable, it integrates naturally with Hoist's `addReaction` pattern.

### Syncing UI State with Route Parameters

A common pattern is syncing a selected record with a route parameter, so that a specific record
can be deep-linked via URL:

```typescript
class DetailPanelModel extends HoistModel {
    private readonly BASE_ROUTE = 'default.other.simpleRouting';

    @managed gridModel = new GridModel({...});

    constructor() {
        super();
        this.addReaction(
            {
                // Update grid selection when route changes
                track: () => [XH.routerState.params, this.lastLoadCompleted],
                run: () => this.updateGridFromRoute()
            },
            {
                // Update route when grid selection changes
                track: () => this.gridModel.selectedId,
                run: () => this.updateRouteFromGrid()
            }
        );
    }

    private async updateGridFromRoute() {
        const {name, params} = XH.routerState,
            {recordId} = params;

        if (!name.startsWith(this.BASE_ROUTE)) return;

        if (recordId) {
            await this.gridModel.selectAsync(Number(recordId));
            if (!this.gridModel.selectedRecord) {
                XH.dangerToast(`Record ${recordId} not found.`);
                XH.navigate(this.BASE_ROUTE, {}, {replace: true});
            }
        } else {
            this.gridModel.clearSelection();
        }
    }

    private updateRouteFromGrid() {
        const {name, params} = XH.routerState,
            {selectedId} = this.gridModel;

        if (!name.startsWith(this.BASE_ROUTE)) return;

        if (selectedId) {
            XH.navigate(
                `${this.BASE_ROUTE}.recordId`,
                {recordId: selectedId},
                {replace: true}
            );
        } else {
            XH.navigate(this.BASE_ROUTE, {}, {replace: true});
        }
    }
}
```

Key points in this pattern:
- Track `lastLoadCompleted` alongside `routerState.params` so the reaction fires after data
  has loaded and the grid can actually select the requested record
- Use `{replace: true}` when pushing state *from* the UI to the route, to avoid polluting the
  browser's back-button history with every selection change
- Guard against the current route not matching the expected base — this prevents the reaction
  from interfering when the user has navigated elsewhere

### Dismissing Dialogs on Route Change

Hoist's built-in dialog models (messages, options, about, feedback, changelog) all observe
`XH.routerState` and auto-dismiss when the route changes. This prevents dialogs from lingering
over stale content when a user navigates via browser back/forward. The same pattern is available
for application use:

```typescript
this.addReaction({
    track: () => XH.routerState,
    run: () => this.closePopover()
});
```

## Mobile Routing

On mobile, `NavigatorModel` replaces `TabContainerModel` as the primary route consumer. It uses
a stack-based navigation model where routes map to pages pushed onto and popped from a swipeable
stack.

Mobile routing shares the same `getRoutes()` definition and `XH` routing API, but navigation
patterns differ:

```typescript
// Push a new page onto the stack
XH.appendRoute('gridDetail', {id: 123});

// Pop the current page and go back
XH.popRoute();

// Navigate to an absolute route
XH.navigate('default.grids.gridDetail', {id: 123});
```

Note that `TabContainerModel` routing is **not supported on mobile** — the model will log a
warning if `route` is set in a mobile app context.

## Direct Router5 Access

For advanced use cases not covered by the convenience methods above, the underlying Router5
router instance is available via `XH.router`. This provides access to the full Router5 API
including:

```typescript
// Check if a specific route is currently active
XH.router.isActive('default.grids');

// Get the current state directly
const state = XH.router.getState();

// Build a URL path from a route name and params (e.g. for links)
const path = XH.router.buildPath('default.other.simpleRouting.recordId', {recordId: 123});
```

Applications should prefer the `XH` convenience methods for standard navigation and use
`XH.router` only when they need Router5-specific features.

## Common Pitfalls

### Mismatched Tab IDs and Route Names

When using `TabContainerModel` with routing, each tab's `id` must exactly match the `name` of
the corresponding child route in `getRoutes()`. Mismatches cause silent failures — the tabs
render but clicking them does not update the URL, and navigating via URL does not activate tabs.

```typescript
// getRoutes() defines a child route named 'dashboard'
{name: 'dashboard', path: '/dashboard'}

// Tab ID must match exactly
{id: 'dashboard', content: dashboardPanel}    // Correct
{id: 'dash', content: dashboardPanel}         // Will not route
```

### Missing Route Definitions for Tab Containers

Setting `route` on a `TabContainerModel` without defining matching routes in `getRoutes()` will
not cause an error, but URL-based navigation will silently fail. Every routed tab container
needs a corresponding entry in the route hierarchy.

### Route Parameter Values Are Always Strings

Route parameters extracted from the URL are always strings, even if they represent numeric
values. Remember to parse them:

```typescript
const {recordId} = XH.routerState.params;
// recordId is '123', not 123
await gridModel.selectAsync(Number(recordId));
```

### Avoid Combining `route` and `persistActiveTabId`

If a `TabContainerModel` has both `route` configured and `persistActiveTabId` explicitly set to
a truthy value, the persisted tab and the initial route may conflict. Hoist defaults
`persistActiveTabId` to `!this.route`, so passing `persistWith` without explicitly setting
`persistActiveTabId` is safe. Explicitly enabling both will produce a warning. Let routing drive
initial tab selection for routed containers.

### Mobile Apps Cannot Use TabContainer Routing

`TabContainerModel` routing is a desktop-only feature. Mobile apps use `NavigatorModel` for
route-driven navigation instead. Setting `route` on a mobile `TabContainerModel` will log a
warning and have no effect.

### Reactions on `routerState` Fire on Every Route Change

If you observe `XH.routerState` in a reaction, it will fire on *any* route change, not just
changes relevant to your component. Always guard your reaction logic against the current route:

```typescript
this.addReaction({
    track: () => XH.routerState,
    run: (state) => {
        // Only react to changes within the expected route subtree
        if (!state.name.startsWith('default.mySection')) return;
        this.handleRouteChange(state);
    }
});
```

## Key Source Files

| File | Description |
|------|-------------|
| [`/appcontainer/RouterModel.ts`](../appcontainer/RouterModel.ts) | Core model wrapping Router5 with MobX observables |
| [`/core/XH.ts`](../core/XH.ts) | `XH.routerState`, `XH.navigate()`, `XH.appendRoute()`, `XH.popRoute()`, `XH.router` |
| [`/core/HoistAppModel.ts`](../core/HoistAppModel.ts) | `getRoutes()` base method for application route definitions |
| [`/appcontainer/AppContainerModel.ts`](../appcontainer/AppContainerModel.ts) | `startRouter()` — initializes and starts routing during app startup |
| [`/cmp/tab/TabContainerModel.ts`](../cmp/tab/TabContainerModel.ts) | Route-based tab synchronization (desktop only) |
| [`/mobile/cmp/navigator/NavigatorModel.ts`](../mobile/cmp/navigator/NavigatorModel.ts) | Route-driven page stack navigation (mobile only) |

## Related Documentation

- [`/appcontainer/README.md`](../appcontainer/README.md) — App shell overview including routing section
- [`/cmp/tab/README.md`](../cmp/tab/README.md) — Full tab system documentation with routing integration details
- [`/mobile/README.md`](../mobile/README.md) — Mobile navigation and routing patterns
- [`/core/README.md`](../core/README.md) — XH singleton API including navigation convenience methods
- [Lifecycle: App](./lifecycle-app.md) — App initialization sequence (routing starts after `INITIALIZING_APP`)
