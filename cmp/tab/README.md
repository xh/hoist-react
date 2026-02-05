# Tab Package

## Overview

The `/cmp/tab/` package provides Hoist's tabbed interface system - components and models for
organizing content into switchable views. The system supports routing integration, lazy rendering,
smart refresh strategies, nested tab containers, and dynamic (user-configurable) tabs.

Platform-specific TabContainer components in `/desktop/cmp/tab/` and `/mobile/cmp/tab/` render
the tab UI while sharing the cross-platform models defined here.

## Architecture

```
TabContainerModel
├── tabs: TabModel[]              # Child tabs
├── activeTabId: string           # Currently active tab ID
├── route: string                 # Base route for routing (desktop only)
├── renderMode: RenderMode        # Default render strategy for tabs
├── refreshMode: RefreshMode      # Default refresh strategy for tabs
├── refreshContextModel           # RefreshContext for coordinated refresh
├── dynamicTabSwitcherModel       # For user-configurable tabs
└── Methods: activateTab(), addTab(), removeTab(), setTabs()

TabModel
├── id: string                    # Unique identifier
├── title: ReactNode              # Tab button text
├── icon: ReactElement            # Tab button icon
├── content: Content              # Tab body content
├── disabled: boolean             # Prevent activation
├── renderMode / refreshMode      # Per-tab overrides
├── childContainerModel           # For nested tab containers
└── Methods: activate(), setDisabled()
```

## TabContainerModel

The main model for configuring and managing a tabbed interface.

### Basic Usage

```typescript
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {tabContainer} from '@xh/hoist/desktop/cmp/tab';  // or mobile

const tabModel = new TabContainerModel({
    tabs: [
        {id: 'overview', title: 'Overview', content: () => overviewPanel()},
        {id: 'details', title: 'Details', content: () => detailsPanel()},
        {id: 'history', title: 'History', content: () => historyPanel()}
    ],
    defaultTabId: 'overview'
});

// Render
tabContainer({model: tabModel})
```

### Configuration

| Property | Type | Description |
|----------|------|-------------|
| `tabs` | `TabConfig[]` | Tab definitions |
| `defaultTabId` | `string` | Initial active tab (defaults to first tab) |
| `route` | `string` | Base route for URL routing (desktop only) |
| `renderMode` | `RenderMode` | When to render tab content (default: `'lazy'`) |
| `refreshMode` | `RefreshMode` | When to refresh tab content (default: `'onShowLazy'`) |
| `track` | `boolean` | Track tab views in activity log |
| `switcher` | `TabSwitcherConfig` | Tab switcher behavior (default: `{mode: 'static'}`) |
| `persistWith` | `PersistOptions` | Persistence configuration |
| `emptyText` | `ReactNode` | Placeholder when no tabs |

### Routing (Desktop Only)

Enable URL-based tab navigation by connecting TabContainerModel to routes defined in your AppModel.

**Routes must be defined centrally in AppModel's `getRoutes()`** - the `route` property on
TabContainerModel refers to a route name, and tab IDs must match child route names:

```typescript
// In AppModel - define route hierarchy
override getRoutes() {
    return [{
        name: 'default',
        path: '/app',
        children: [
            {name: 'overview', path: '/overview'},
            {name: 'reports', path: '/reports', children: [
                {name: 'daily', path: '/daily'},
                {name: 'weekly', path: '/weekly'}
            ]}
        ]
    }];
}

// TabContainerModel - route property references route name, tab IDs match child route names
@managed tabModel = new TabContainerModel({
    route: 'default',  // Matches route name above
    tabs: [
        {id: 'overview', content: overviewPanel},  // ID matches route name
        {
            id: 'reports',  // ID matches route name
            content: {
                tabs: [
                    {id: 'daily', content: dailyReport},   // ID matches nested route name
                    {id: 'weekly', content: weeklyReport}
                ]
            }
        }
    ]
});
// URLs: /app/overview, /app/reports/daily, /app/reports/weekly
```

See the built-in Admin console (`/admin/AppModel.ts`) or Toolbox app for complete examples of
routed tab hierarchies.

### Render Modes

Control when tab content is mounted:

| Mode | Description |
|------|-------------|
| `'lazy'` | Mount on first activation, keep mounted (default) |
| `'always'` | Mount all tabs immediately |
| `'unmountOnHide'` | Mount on activation, unmount when hidden |

```typescript
const tabModel = new TabContainerModel({
    renderMode: 'lazy',  // Container default
    tabs: [
        {id: 'light', content: lightPanel},
        {id: 'heavy', content: heavyPanel, renderMode: 'unmountOnHide'}  // Per-tab override
    ]
});
```

### Refresh Modes

Control when tab content is refreshed:

| Mode | Description |
|------|-------------|
| `'onShowLazy'` | Refresh on show, skip if not stale (default) |
| `'onShowAlways'` | Refresh every time tab is shown |
| `'onLoadAlways'` | Refresh on load and every show |
| `'never'` | Only refresh when explicitly requested |

```typescript
const tabModel = new TabContainerModel({
    refreshMode: 'onShowLazy',
    tabs: [
        {id: 'dashboard', content: dashboard, refreshMode: 'onShowAlways'},
        {id: 'settings', content: settings, refreshMode: 'never'}
    ]
});
```

### Tab Navigation

```typescript
// Activate by ID or TabModel
tabModel.activateTab('details');
tabModel.activateTab(tabModel.tabs[1]);

// Sequential navigation
tabModel.activateNextTab();
tabModel.activatePrevTab();
tabModel.activateNextTab(true);  // Cycle to first if at end

// Read active state
tabModel.activeTabId;   // 'overview'
tabModel.activeTab;     // TabModel instance
tabModel.nextTab;       // Next enabled tab
tabModel.prevTab;       // Previous enabled tab
```

### Dynamic Tabs

Add, remove, and modify tabs at runtime:

```typescript
// Add a tab
tabModel.addTab({
    id: 'newTab',
    title: 'New Tab',
    content: () => newTabPanel()
}, {
    index: 2,                 // Insert position
    activateImmediately: true // Activate after adding
});

// Remove a tab
tabModel.removeTab('newTab');
tabModel.removeTab(tabModel.findTab('newTab'));

// Update tab title
tabModel.setTabTitle('details', 'User Details');

// Replace all tabs
tabModel.setTabs(newTabs);
```

### User-Configurable Tabs (Dynamic Switcher) - Desktop Only

The dynamic switcher enables users to customize their tab bar:

- **Drag-and-drop reordering** - Users can reorder tabs by dragging
- **Favorites** - Mark frequently-used tabs for quick access
- **Overflow handling** - Smooth horizontal scrolling when tabs exceed available width
- **Persistence** - Tab order and favorites persist across sessions

Recommended for any tab container, especially an app's primary navigation container, where a non-trivial
number of tabs are available and/or some users might focus on particular tabs but not need others.

```typescript
const tabModel = new TabContainerModel({
    switcher: {mode: 'dynamic'},  // or {mode: 'static'} (default)
    tabs: [...],
    persistWith: {
        localStorageKey: 'tabs',
        persistFavoriteTabIds: true
    }
});
```

### Persistence

Persist active tab and/or favorite tabs:

```typescript
const tabModel = new TabContainerModel({
    tabs: [...],
    persistWith: {
        localStorageKey: 'mainTabs',
        persistActiveTabId: true,        // Remember last active tab
        persistFavoriteTabIds: true      // For dynamic switcher
    }
});
```

**Note:** `persistActiveTabId` and `route` cannot both be used - routing takes precedence.

## TabModel

Configuration for individual tabs within a container.

### TabConfig Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier (required) |
| `title` | `ReactNode` | Display title (defaults to startCase of id) |
| `icon` | `ReactElement` | Icon for tab button |
| `tooltip` | `ReactNode` | Tooltip on hover |
| `disabled` | `boolean` | Prevent activation |
| `excludeFromSwitcher` | `boolean` | Hide from UI but allow programmatic/routed access |
| `showRemoveAction` | `boolean` | Show close button (desktop only) |
| `content` | `Content` | Tab body - function, element, or nested tabs |
| `renderMode` | `RenderMode` | Override container's render mode |
| `refreshMode` | `RefreshMode` | Override container's refresh mode |
| `omit` | `boolean \| () => boolean` | Conditionally exclude tab |

### Content Types

```typescript
// Function returning content (recommended for lazy rendering)
{id: 'panel', content: () => myPanel()}

// Direct element
{id: 'static', content: myStaticElement}

// Nested tab container (array shorthand)
{
    id: 'reports',
    content: [
        {id: 'daily', content: dailyReport},
        {id: 'weekly', content: weeklyReport}
    ]
}

// Nested tab container (explicit config)
{
    id: 'reports',
    content: {
        tabs: [...],
        renderMode: 'unmountOnHide'
    }
}
```

### TabModel Methods

```typescript
const tab = tabModel.findTab('details');

// Activate this tab
tab.activate();

// Check state
tab.isActive;   // boolean
tab.disabled;   // boolean

// Enable/disable
tab.setDisabled(true);

// Update appearance (direct assignment calls underlying @bindable setter)
tab.title = 'New Title';
tab.icon = Icon.check();
```

## Refresh Integration

TabContainer integrates with Hoist's refresh system via `RefreshContextModel`:

```typescript
class MyTabPanelModel extends HoistModel {
    override async doLoadAsync(loadSpec: LoadSpec) {
        // Called based on tab's refreshMode
        const data = await XH.fetchJson({url: 'api/data', loadSpec});
        this.setData(data);
    }
}

// In TabContainer config
{
    id: 'panel',
    content: () => myTabPanel(),
    refreshMode: 'onShowLazy'  // Refresh when shown if stale
}
```

The tab's `refreshContextModel` coordinates with the container's context for cascading refresh.

## Common Patterns

### Tab Container in a Model

```typescript
class AppModel extends HoistModel {
    @managed tabModel = new TabContainerModel({
        tabs: [
            {id: 'dashboard', title: 'Dashboard', icon: Icon.home(), content: dashboardPanel},
            {id: 'reports', title: 'Reports', icon: Icon.chartLine(), content: reportsPanel},
            {id: 'settings', title: 'Settings', icon: Icon.gear(), content: settingsPanel}
        ],
        track: true,
        persistWith: {localStorageKey: 'mainTabs'}
    });
}
```

### Conditional Tabs

```typescript
const tabModel = new TabContainerModel({
    tabs: [
        {id: 'overview', content: overview},
        {
            id: 'manage',
            content: managementPanel,
            omit: () => !XH.getUser().hasRole('MANAGER')
        },
        {
            id: 'debug',
            content: debugPanel,
            omit: XH.environmentService.isProduction
        }
    ]
});
```

### Tabs with Dynamic Titles

Tab titles can be any ReactNode. For reactive titles (e.g., with badges that update), use a
reaction to update the title when the underlying data changes:

```typescript
// In your model constructor
this.addReaction({
    track: () => this.alertCount,
    run: count => {
        const alertsTab = this.tabModel.findTab('alerts');
        alertsTab.title = count > 0
            ? hbox('Alerts ', badge({item: count, intent: 'danger'}))
            : 'Alerts';
    },
    fireImmediately: true
});
```

### Reacting to Tab Changes

```typescript
this.addReaction({
    track: () => this.tabModel.activeTabId,
    run: id => {
        if (id === 'details') {
            this.loadDetailsAsync();
        }
    }
});
```

## Common Pitfalls

### Setting `activeTabId` Directly

```typescript
// ❌ Don't: Setting activeTabId directly won't trigger proper tab activation
tabModel.activeTabId = 'details';

// ✅ Do: Use the activateTab API
tabModel.activateTab('details');
```

The `activateTab()` method handles routing updates, refresh triggers, and other side effects that
direct property assignment would bypass.

### Missing Route Definitions

Setting `route` on a TabContainerModel without defining matching routes in your AppModel's
`getRoutes()` will silently fail - tabs will render but URL navigation won't work. Ensure every
routed tab ID has a corresponding route name in the hierarchy:

```typescript
// ❌ Tab has route but no matching route definition in AppModel.getRoutes()
new TabContainerModel({
    route: 'main',
    tabs: [{id: 'overview', ...}]  // Won't route unless 'main' with child 'overview' is defined
});

// ✅ Route hierarchy in AppModel matches tab IDs
getRoutes() {
    return [{name: 'main', path: '/main', children: [
        {name: 'overview', path: '/overview'}
    ]}];
}
```

## Related Packages

- `/desktop/cmp/tab/` - Desktop TabContainer component with Blueprint tabs
- `/mobile/cmp/tab/` - Mobile TabContainer component with Onsen tabs
- `/core/` - RefreshContextModel, RenderMode, RefreshMode
