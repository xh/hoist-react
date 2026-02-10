# Dashboard

## Overview

The `/desktop/cmp/dash/` package provides Hoist's dashboard system — configurable layouts where
users can add, remove, resize, and rearrange views (widgets). Two implementations are available:

- **DashContainer** — Space-filling, tabbed/tiled layout powered by
  [GoldenLayout](https://golden-layout.com/) v1.5. Views are organized in rows, columns, and
  stacks (tabs) that users can drag, resize, and rearrange. **Note:** Hoist uses the 1.x branch
  of GoldenLayout, which provides first-class React support. The newer 2.x branch dropped this
  support, so do not reference 2.x documentation or APIs.
- **DashCanvas** — Scrollable, grid-based widget layout powered by
  [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout). Views are placed
  on a configurable grid and can be dragged and resized freely.

Both share a common architecture of ViewSpecs (templates), ViewModels (instances), and state
persistence, allowing users to customize their workspace.

### Choosing Between DashContainer and DashCanvas

The two implementations have different layout models and are suited to different use cases:

**DashContainer** is fully space-filling — it does not scroll. Widgets divide the available space
using relative sizing in both dimensions, and can be stacked into tabsets. It devotes minimal space
to UI chrome (no padding between widgets, tabs instead of individual headers), making it a good fit
for **space-constrained layouts** such as detail panels docked to the bottom or side of a screen.

**DashCanvas** is space-filling horizontally but widgets have explicit heights (defaulted by the
developer, then driven by user resizing), with configurable snapping points for width (`columns`)
and height (`rowHeight` in pixels). The canvas scrolls vertically, allowing users to see more
widgets at once without tabbing between them. This makes it well-suited for **full-screen reporting
dashboards** and similar use cases where users benefit from viewing multiple widgets simultaneously.

| | DashContainer | DashCanvas |
|---|---|---|
| **Scrolling** | No — fills available space | Vertical scroll |
| **Widget sizing** | Relative in both dimensions | Grid-snapped width, fixed-height rows |
| **Stacking/tabs** | Yes — widgets can share a stack | No — all widgets visible |
| **Chrome overhead** | Minimal — no inter-widget padding | Per-widget panel headers and margins |
| **Best for** | Detail panels, constrained layouts | Primary dashboards, reporting tools |

When in doubt, **favor DashCanvas** — it is the more modern library and generally the more flexible
tool. Ultimately, the choice depends on the specific use case and developer preference — these are
suggestions, not rules.

## Architecture

```
DashModel (abstract base)
├── viewSpecs: ViewSpec[]         # Available view templates
├── state: ViewState[]            # Current layout state
├── viewModels: ViewModel[]       # Active view instances
├── layoutLocked: boolean         # Prevent drag/resize
├── contentLocked: boolean        # Prevent adding/removing views
├── renameLocked: boolean         # Prevent renaming views
├── emptyText: string             # Shown when container is empty
├── addViewButtonText: string     # Button label in empty overlay
├── extraMenuItems: MenuItemLike[]# Additional context menu items
└── refreshContextModel           # For coordinated refresh

DashViewSpec (base interface)
├── id: string                    # Unique identifier
├── content: Content              # Rendered content
├── title: string                 # Default title (defaults to startCase(id))
├── icon: ReactElement            # Default icon
├── groupName: string             # Menu grouping
├── unique: boolean               # Allow multiple instances?
├── allowAdd/Remove/Rename        # Permission flags
└── omit: Thunkable<boolean>      # Exclude from dashboard

DashViewModel (base class)
├── id: string                    # Instance identifier
├── viewSpec: ViewSpec            # Template reference
├── containerModel                # Parent DashContainerModel or DashCanvasModel
├── title: string                 # Display title (customizable, persisted)
├── titleDetails: string          # Dynamic suffix (not persisted)
├── fullTitle: string             # Computed: title + titleDetails
├── icon: ReactElement            # Display icon (customizable)
├── isActive: boolean             # Currently visible?
├── viewState: PlainObject        # Custom state for the view (persisted)
├── extraMenuItems: MenuItemLike[]# Extra context menu items for this view
└── refreshContextModel           # For coordinated refresh
```

## DashContainer

### Basic Usage

```typescript
import {dashContainer, DashContainerModel} from '@xh/hoist/desktop/cmp/dash';

const dashModel = new DashContainerModel({
    viewSpecs: [
        {id: 'grid', title: 'Data Grid', icon: Icon.grid(), content: () => gridPanel()},
        {id: 'chart', title: 'Chart', icon: Icon.chartLine(), content: () => chartPanel()},
        {id: 'summary', title: 'Summary', content: () => summaryPanel()}
    ],
    initialState: [
        {type: 'row', content: [
            {type: 'stack', width: 70, content: [
                {type: 'view', id: 'grid'},
                {type: 'view', id: 'chart'}
            ]},
            {type: 'view', id: 'summary', width: 30}
        ]}
    ]
});

dashContainer({model: dashModel})
```

### DashContainerModel Config

| Option | Type | Description |
|--------|------|-------------|
| `viewSpecs` | `DashContainerViewSpec[]` | Available view templates. Required. |
| `viewSpecDefaults` | `Partial<ViewSpec>` | Properties to merge deeply into all viewSpecs. |
| `initialState` | `DashContainerViewState[]` | Initial layout. Default `[]`. |
| `renderMode` | `RenderMode` | When to render views. Default `'lazy'`. Can be overridden per-view. |
| `refreshMode` | `RefreshMode` | When to refresh views. Default `'onShowLazy'`. Can be overridden per-view. |
| `layoutLocked` | `boolean` | Prevent drag/resize. Default `false`. |
| `contentLocked` | `boolean` | Prevent adding/removing views. Default `false`. |
| `renameLocked` | `boolean` | Prevent renaming views. Default `false`. |
| `showMenuButton` | `boolean` | Show context menu button in stack headers. Default `false`. |
| `margin` | `number` | Gap between items in pixels. Default `6`. |
| `persistWith` | `PersistOptions` | Persistence configuration. Default persistence path is `'dashContainer'`. |
| `emptyText` | `string` | Placeholder text when empty. Default `'No views have been added to the container.'` |
| `addViewButtonText` | `string` | Button label in empty overlay. Default `'Add View'`. |
| `extraMenuItems` | `MenuItemLike[]` | Additional context menu items shown below the 'Add' action. |
| `goldenLayoutSettings` | `PlainObject` | Passthrough config for the GoldenLayout instance. |

### State Structure

State is nested arrays of containers and views:

```typescript
// Container types: 'row', 'column', 'stack'
// View type: 'view' (references viewSpec.id)

[{
    type: 'row',
    content: [
        {
            type: 'stack',
            width: '200px',  // Fixed pixel width
            content: [
                {type: 'view', id: 'navigation'},
                {type: 'view', id: 'filters'}
            ]
        },
        {
            type: 'column',
            width: 80,  // Relative width (percentage)
            content: [
                {type: 'view', id: 'grid', height: 60},
                {type: 'view', id: 'details', height: 40}
            ]
        }
    ]
}]
```

**Container types:**
- `row` — lays out children horizontally
- `column` — lays out children vertically
- `stack` — lays out children as tabs (can only contain `view` items)

**Sizing:**
- Numeric values = relative percentages of available space
- String values (e.g., `'200px'`) = fixed pixels (converted to relative at parse time)
- Unspecified = remaining space divided equally among unsized children

### DashContainerViewSpec

Extends `DashViewSpec` with:

| Option | Type | Description |
|--------|------|-------------|
| `renderMode` | `RenderMode` | Per-view render strategy. Defaults to the model's `renderMode`. |
| `refreshMode` | `RefreshMode` | Per-view refresh strategy. Defaults to the model's `refreshMode`. |

### Key Methods

```typescript
// Add a view
dashModel.addView('chartId');                    // Add to root
dashModel.addView('chartId', stackContainer);    // Add to specific stack
dashModel.addView('chartId', container, 2);      // Add at index

// Remove a view
dashModel.removeView(viewModelId);

// Rename a view (opens inline editor on the tab)
dashModel.renameView(viewModelId);

// Get view spec or model
dashModel.getViewSpec('chartId');
dashModel.getViewModel(viewModelId);

// Restore initial state (async — destroys and recreates GoldenLayout)
await dashModel.restoreDefaultsAsync();

// Load specific state (async)
await dashModel.loadStateAsync(newState);
```

## DashCanvas

### Basic Usage

```typescript
import {dashCanvas, DashCanvasModel} from '@xh/hoist/desktop/cmp/dash';

const canvasModel = new DashCanvasModel({
    viewSpecs: [
        {
            id: 'kpi',
            title: 'KPI Card',
            content: () => kpiCard(),
            width: 3,
            height: 2,
            minWidth: 2,
            minHeight: 1
        },
        {
            id: 'chart',
            title: 'Chart',
            content: () => chartWidget(),
            width: 6,
            height: 4
        }
    ],
    initialState: [
        {viewSpecId: 'kpi', layout: {x: 0, y: 0, w: 3, h: 2}, title: 'Revenue'},
        {viewSpecId: 'kpi', layout: {x: 3, y: 0, w: 3, h: 2}, title: 'Orders'},
        {viewSpecId: 'chart', layout: {x: 0, y: 2, w: 6, h: 4}}
    ],
    columns: 12,
    rowHeight: 50
});

dashCanvas({model: canvasModel})
```

### DashCanvasModel Config

| Option | Type | Description |
|--------|------|-------------|
| `viewSpecs` | `DashCanvasViewSpec[]` | Available view templates. Required. |
| `viewSpecDefaults` | `Partial<ViewSpec>` | Properties to merge deeply into all viewSpecs. |
| `initialState` | `DashCanvasItemState[]` | Initial layout. Default `[]`. |
| `columns` | `number` | Grid columns. Default `12`. |
| `rowHeight` | `number` | Row height in pixels. Default `50`. |
| `compact` | `boolean \| 'vertical' \| 'horizontal'` | Compaction mode. `true` defaults to `'vertical'`. Default `'vertical'`. |
| `margin` | `[x, y]` | Gap between items in pixels. Default `[10, 10]`. |
| `containerPadding` | `[x, y]` | Outer padding in pixels. Defaults to same as `margin`. |
| `maxRows` | `number` | Maximum row count. Default `Infinity`. |
| `showGridBackground` | `boolean` | Show grid lines behind widgets. Default `false`. |
| `layoutLocked` | `boolean` | Prevent drag/resize. Default `false`. |
| `contentLocked` | `boolean` | Prevent adding/removing views. Default `false`. |
| `renameLocked` | `boolean` | Prevent renaming views. Default `false`. |
| `persistWith` | `PersistOptions` | Persistence configuration. Default persistence path is `'dashCanvas'`. |
| `emptyText` | `string` | Placeholder text when empty. Default `'No widgets have been added.'` |
| `addViewButtonText` | `string` | Button label in empty overlay. Default `'Add Widget'`. |
| `extraMenuItems` | `MenuItemLike[]` | Additional context menu items shown below the 'Add' action. |

### State Structure

Canvas state is a flat array of widget positions:

```typescript
[
    {
        viewSpecId: 'kpi',
        layout: {x: 0, y: 0, w: 3, h: 2},  // Grid coordinates
        title: 'Revenue KPI'                 // Optional custom title
    },
    {
        viewSpecId: 'chart',
        layout: {x: 3, y: 0, w: 6, h: 4},
        state: {chartType: 'line'}           // Optional view-specific state
    }
]
```

### DashCanvasViewSpec

Extends `DashViewSpec` with:

| Option | Type | Description |
|--------|------|-------------|
| `width` | `number` | Default width in columns. Default `5`. |
| `height` | `number` | Default height in rows. Default `5`. |
| `minWidth` | `number` | Minimum width in columns. |
| `maxWidth` | `number` | Maximum width in columns. |
| `minHeight` | `number` | Minimum height in rows. |
| `maxHeight` | `number` | Maximum height in rows. |
| `autoHeight` | `boolean` | Auto-size height to content. Default `false`. |
| `hidePanelHeader` | `boolean` | Hide the widget's panel header. Default `false`. |
| `hideMenuButton` | `boolean` | Hide the menu button in the widget header. Default `false`. |
| `allowDuplicate` | `boolean` | Allow duplicating this widget via the context menu. Default `true`. |

### Key Methods

```typescript
// Add a view (returns the new DashCanvasViewModel)
canvasModel.addView('chartId');
canvasModel.addView('chartId', {position: 'first'});         // At top of canvas
canvasModel.addView('chartId', {position: 'last'});          // At bottom of canvas
canvasModel.addView('chartId', {position: existingViewId});  // At another view's position
canvasModel.addView('chartId', {title: 'Custom', width: 8, height: 4, state: {type: 'bar'}});

// Remove or replace a view
canvasModel.removeView(viewModelId);
canvasModel.replaceView(viewModelId, 'newSpecId');  // Keeps existing layout position

// Clear all views
canvasModel.clear();

// Rename a view (shows prompt dialog)
canvasModel.renameView(viewModelId);

// Scroll a view into the viewport
canvasModel.ensureViewVisible(viewModelId);

// Restore initial state (sync — unlike DashContainer's async version)
canvasModel.restoreDefaults();

// Grid info
canvasModel.columns;  // Number of columns
canvasModel.rows;     // Current row count
canvasModel.isEmpty;  // No widgets?
```

## Common Features

### ViewSpec Base Config

Both dash types share these base properties on their ViewSpecs:

| Option | Type | Description |
|--------|------|-------------|
| `id` | `string` | Unique identifier. Required. |
| `content` | `Content` | View content to render. Required. |
| `title` | `string` | Default display title. Defaults to `startCase(id)`. |
| `icon` | `ReactElement` | Display icon. |
| `groupName` | `string` | Group name for the "Add" menu — specs with the same group are nested into a submenu. |
| `omit` | `Thunkable<boolean>` | Skip this spec entirely. References in state are quietly dropped. Useful for role-based exclusion. Default `false`. |
| `unique` | `boolean` | Only one instance allowed at a time. Default `false`. |
| `allowAdd` | `boolean` | Can add new instances via the menu. Existing instances in state are still loaded. Default `true`. |
| `allowRemove` | `boolean` | Can remove instances. Default `true`. |
| `allowRename` | `boolean` | Can rename instances. Default `true`. |

### DashViewModel

`DashViewModel` is the model for each active view instance. Content rendered within a dash view can
look up this model to access and modify view-level state. It is not created directly — instances are
produced automatically from ViewSpecs and state.

A primary interaction with `DashViewModel` within application code is to use it to configure
[persistence](#persistence).

**Key properties:**

| Property | Description |
|----------|-------------|
| `id` | Unique instance identifier. |
| `viewSpec` | The `DashViewSpec` used to create this view. |
| `containerModel` | The parent `DashContainerModel` or `DashCanvasModel`. |
| `title` | Display title — `@bindable`, persisted. Initialized from viewSpec. |
| `titleDetails` | Dynamic suffix appended after `title`. Not persisted. |
| `fullTitle` | Computed: `title` + `titleDetails`, space-separated. |
| `icon` | Display icon — `@bindable`. Initialized from viewSpec. |
| `viewState` | `PlainObject` for custom view-specific state — `@bindable`, persisted. |
| `isActive` | Whether the view is currently visible (e.g. the active tab in a stack). |
| `extraMenuItems` | `MenuItemLike[]` for additional context menu items specific to this view. |
| `renderMode` | Resolved from viewSpec, falling back to the container model. |
| `refreshMode` | Resolved from viewSpec, falling back to the container model. |

**Key methods:**

```typescript
// Update a single key within viewState (immutable update)
viewModel.setViewStateKey('chartType', 'bar');
```

### DashCanvasViewModel

`DashCanvasViewModel` extends `DashViewModel` with additional canvas-specific properties:

| Property | Description |
|----------|-------------|
| `headerItems` | `ReactNode[]` — additional items to display in the widget's panel header. Useful for injecting controls like column chooser buttons. |
| `hidePanelHeader` | Whether to hide this widget's panel header. Initialized from viewSpec. |
| `hideMenuButton` | Whether to hide this widget's header menu button. Initialized from viewSpec. |
| `autoHeight` | Whether the widget resizes its height to fit content. Initialized from viewSpec. |
| `allowDuplicate` | Whether the widget can be duplicated via the context menu. Initialized from viewSpec. |

```typescript
// Scroll a canvas view into the viewport
viewModel.ensureVisible();
```

### Locking

Control user interactions at the model level:

```typescript
const dashModel = new DashContainerModel({
    layoutLocked: false,   // Can drag/resize?
    contentLocked: false,  // Can add/remove views?
    renameLocked: false,   // Can rename views?
    ...
});

// Dynamic locking — all three properties are @bindable
dashModel.layoutLocked = true;
dashModel.contentLocked = true;
```

### Persistence

Dashboards support two complementary levels of persistence:

1. **Layout persistence** — The `DashModel` persists which views are present and how they are
   arranged (positions, sizes, tabs). This is the "outer" state.
2. **Widget state persistence** — Individual widget models persist their own internal settings
   (selected metric, filter values, sort order, column visibility) through their `DashViewModel`.
   This is the "inner" state that makes each view instance unique.

Both levels work together: when a user adds two instances of the same widget side by side and
configures them differently (e.g. one showing Revenue, the other showing Orders), both the
layout *and* each widget's settings are persisted. This is a core reason dashboards are useful —
they give users a customizable workspace with persistent, per-widget configuration.

#### Layout Persistence

Enable layout persistence by providing `persistWith` on the model config:

```typescript
const dashModel = new DashContainerModel({
    persistWith: {localStorageKey: 'dashboard'},
    ...
});
```

The default persistence `path` is `'dashContainer'` for DashContainerModel and `'dashCanvas'` for
DashCanvasModel. Override with `{...persistWith, path: 'custom'}` when multiple dash models share
a persistence provider.

#### Widget State Persistence

Widget models persist their state by targeting their `DashViewModel` as the persistence provider.
Under the hood, Hoist's `DashViewProvider` reads and writes to `DashViewModel.viewState` — a
`PlainObject` that the parent `DashModel` rolls into its own persisted state automatically. This
creates a hierarchical persistence chain:

```
Widget model → DashViewModel.viewState → DashModel.state → localStorage / pref / ViewManager
```

This wiring must happen in `onLinked()` because the `DashViewModel` is resolved via `@lookup`,
which requires the model to be linked into the component tree first. This is an example of
**deferred persistence setup** — persistence cannot be configured at construction time because the
required context (the view model) is not yet available.

```typescript
class MetricWidgetModel extends HoistModel {
    @lookup(() => DashViewModel) viewModel: DashViewModel;

    @bindable metric: string = 'hours';
    @bindable showPrior: boolean = true;
    @managed filterModel: FilterChooserModel;

    override onLinked() {
        super.onLinked();

        // 1. Point persistence at this widget's DashViewModel
        this.persistWith = {dashViewModel: this.viewModel};

        // 2. Mark individual @bindable properties for persistence
        this.markPersist('metric');
        this.markPersist('showPrior');

        // 3. Pass the same persistWith to child models that also need persistence.
        //    Here the FilterChooserModel will use the DashViewModel to persist its *primary value*.
        //    It has been further customized to save *user favorite filters* into a user preference,
        //    a common pattern to allow a user to access their favorites from any instance.
        this.filterModel = new FilterChooserModel({
            persistWith: {...this.persistWith, persistFavorites: {prefKey: 'metricFilters'}}
            // ...other configs
        });
    }
}
```

**Key points:**
- Call `super.onLinked()` before setting up persistence.
- Set `this.persistWith` before calling `markPersist()` — `markPersist` reads from it.
- Child models (GridModel, FilterChooserModel, PanelModel, etc.) can share the same
  `persistWith`, using `path` to namespace their state within the view's state object.

### Context Menus

Right-click on tabs (DashContainer) or widget headers (DashCanvas) shows a context menu for adding,
removing, and renaming views. The menu respects all locking and permission flags.

Custom menu items can be added at two levels:

- **Model-level:** `extraMenuItems` in the model config — shown in all context menus.
- **View-level:** Set `viewModel.extraMenuItems` — shown only in that view's menu.

A common pattern is adding a "Restore Default Layout" item:

```typescript
const dashModel = new DashCanvasModel({
    extraMenuItems: [
        {
            text: 'Restore Default Layout',
            icon: Icon.reset(),
            actionFn: () => dashModel.restoreDefaults()
        }
    ],
    ...
});
```

### Render and Refresh Modes

DashContainer supports render/refresh modes like TabContainer. These control when views are
mounted and refreshed as the user switches between tabs:

```typescript
const dashModel = new DashContainerModel({
    renderMode: 'lazy',        // Mount on first show (default)
    refreshMode: 'onShowLazy', // Refresh when shown if stale (default)
    viewSpecs: [
        {
            id: 'heavy',
            renderMode: 'unmountOnHide',  // Per-view override
            content: heavyPanel
        }
    ]
});
```

## Widget Content Patterns

### Accessing the DashViewModel

Widget content rendered inside a dash view can look up its `DashViewModel` (or
`DashCanvasViewModel`) via `@lookup`. This is how widgets access their title, viewState,
persistence, and other view-level configuration:

```typescript
class MyWidgetModel extends HoistModel {
    @lookup(() => DashViewModel) viewModel: DashViewModel;

    // For DashCanvas-specific features (headerItems, etc.)
    @lookup(() => DashCanvasViewModel) canvasViewModel: DashCanvasViewModel;
}
```

Because `@lookup` resolves from the component tree, the view model is not available at
construction time — only after `onLinked()`. This is why persistence setup, child model
creation, and other initialization that depends on the view model must happen in `onLinked()`,
not in the constructor. See the [Widget State Persistence](#widget-state-persistence) section
for the full pattern.

### Dynamic Titles

Widgets often update their title to reflect current state — e.g. showing the selected metric
or time period:

```typescript
override onLinked() {
    super.onLinked();
    this.addReaction({
        track: () => [this.metric, this.period],
        run: () => {
            this.viewModel.title = `${this.displayMetric} ${this.period.toUpperCase()}`;
        }
    });
}
```

### Injecting Header Items (DashCanvas)

DashCanvas widgets can inject buttons or controls into their panel header via
`DashCanvasViewModel.headerItems`:

```typescript
override onLinked() {
    super.onLinked();
    if (this.viewModel instanceof DashCanvasViewModel) {
        this.viewModel.headerItems = [
            colChooserButton({gridModel: this.gridModel}),
            modalToggleButton({panelModel: this.panelModel})
        ];
    }
}
```

### Conditional ViewSpecs

Use `omit` to conditionally include viewSpecs based on user roles or other runtime conditions.
`omit` is `Thunkable`, so it can be a static boolean or a function evaluated at render time:

```typescript
viewSpecs: [
    {id: 'info', title: 'Basic Info', content: infoWidget},
    {id: 'admin', title: 'Admin Tools', content: adminWidget, omit: !XH.getUser().isHoistAdmin},
    {id: 'forecast', title: 'Forecast', content: forecastWidget, omit: !XH.getConf('enableForecasts')}
]
```

## Common Patterns

### Dashboard in a Model

```typescript
class WorkspaceModel extends HoistModel {
    @managed dashModel = new DashContainerModel({
        viewSpecs: this.buildViewSpecs(),
        initialState: this.defaultLayout,
        showMenuButton: true,
        persistWith: {localStorageKey: 'workspace.dash'}
    });

    private buildViewSpecs(): DashContainerViewSpec[] {
        return [
            {id: 'portfolio', title: 'Portfolio', icon: Icon.portfolio(), content: portfolioGrid},
            {id: 'positions', title: 'Positions', icon: Icon.list(), content: positionsGrid},
            {id: 'chart', title: 'Chart', icon: Icon.chartLine(), content: priceChart}
        ];
    }

    private get defaultLayout() {
        return [{
            type: 'row',
            content: [
                {type: 'stack', content: [
                    {type: 'view', id: 'portfolio'},
                    {type: 'view', id: 'positions'}
                ]},
                {type: 'view', id: 'chart'}
            ]
        }];
    }
}
```

### Dashboard with ViewManager

For dashboards that support named, saveable, and shareable views, persist through a
`ViewManagerModel`. The ViewManagerModel is typically created in `AppModel` and accessed via
`XH.appModel`:

```typescript
class WorkspaceModel extends HoistModel {
    @managed dashModel: DashContainerModel;

    constructor() {
        super();
        this.persistWith = {viewManagerModel: XH.appModel.workspaceViewManager};
        this.dashModel = new DashContainerModel({
            viewSpecs: this.buildViewSpecs(),
            initialState: this.defaultLayout,
            showMenuButton: true,
            persistWith: this.persistWith
        });
    }

    private buildViewSpecs(): DashContainerViewSpec[] {
        return [
            {id: 'portfolio', title: 'Portfolio', icon: Icon.portfolio(), content: portfolioGrid},
            {id: 'positions', title: 'Positions', icon: Icon.list(), content: positionsGrid},
            {id: 'chart', title: 'Chart', icon: Icon.chartLine(), content: priceChart}
        ];
    }

    private get defaultLayout() {
        return [{
            type: 'row',
            content: [
                {type: 'stack', content: [
                    {type: 'view', id: 'portfolio'},
                    {type: 'view', id: 'positions'}
                ]},
                {type: 'view', id: 'chart'}
            ]
        }];
    }
}
```

### DashContainer in a Collapsible Panel

A common layout pattern: a primary grid with a collapsible detail panel containing a
DashContainer for flexible detail views:

```typescript
const detailPanel = hoistCmp.factory<ReportModel>(({model}) => {
    return panel({
        collapsedTitle: 'Details',
        collapsedIcon: Icon.detail(),
        compactHeader: true,
        modelConfig: {
            side: 'bottom',
            defaultSize: '30%',
            persistWith: {localStorageKey: 'detailPanelModel'}
        },
        item: dashContainer()
    });
});
```

### Dynamic Locking

Lock dashboard editing based on runtime conditions such as a user preference or admin setting:

```typescript
// Observbable flag on model to control editability
@bindable lockDashEditing: boolean = false;

// Then in constructor or onLinked()
this.addReaction({
    track: () => this.lockDashEditing,
    run: lockEditing => {
        const {dashModel} = this;
        dashModel.contentLocked = lockEditing;
        dashModel.layoutLocked = lockEditing;
    },
    fireImmediately: true
});
```

### Widget Dashboard with Multiple Instances

DashCanvas supports multiple instances of the same viewSpec, each with their own title and state.
This is useful for KPI dashboards or configurable widgets:

```typescript
const widgetDash = new DashCanvasModel({
    viewSpecs: [
        {
            id: 'kpi',
            title: 'KPI',
            width: 3,
            height: 2,
            content: kpiWidget
        }
    ],
    initialState: [
        {viewSpecId: 'kpi', layout: {x: 0, y: 0, w: 3, h: 2}, title: 'Revenue',
            state: {metric: 'revenue', period: 'mtd'}},
        {viewSpecId: 'kpi', layout: {x: 3, y: 0, w: 3, h: 2}, title: 'Orders',
            state: {metric: 'orderCount', period: 'mtd'}},
        {viewSpecId: 'kpi', layout: {x: 6, y: 0, w: 3, h: 2}, title: 'Margin',
            state: {metric: 'margin', period: 'ytd'}}
    ],
    columns: 12,
    rowHeight: 80
});
```

Each instance receives its own `viewState` via `DashViewModel`, which the widget model reads
to determine what metric to display. Users can then further customize each widget, with those
changes persisted back through the same `viewState`.

**Note:** For production dashboards, consider using a `ViewManagerModel` instead of hard-coding
a detailed `initialState`. Admins can design the desired widget layout and settings in a global
view that is then set as the default for all users — providing the same starting point without
baking it into code, and allowing it to be updated without a deploy. Use `initialState` for simpler
or more constrained use cases, e.g. a detail dashboard with a small number of widgets.


### viewSpecDefaults

Apply shared config to all viewSpecs. Merges deeply, so individual viewSpecs can override:

```typescript
const dashModel = new DashContainerModel({
    viewSpecDefaults: {
        unique: true,
        allowRename: false,
        icon: Icon.grid()
    },
    viewSpecs: [
        {id: 'orders', title: 'Orders', content: ordersGrid},
        {id: 'chart', title: 'Chart', icon: Icon.chartLine(), content: priceChart}  // overrides icon
    ]
});
```

## Common Pitfalls

### Loading DashContainer state is destructive

Calling `loadStateAsync` destroys and recreates the entire GoldenLayout instance, including all
view components. Avoid calling it frequently — use persistence and `restoreDefaultsAsync` instead
of programmatically swapping layouts. If you need dynamic content within a view, use `viewState`
rather than changing the layout structure.

### Persisted state references obsolete viewSpecs

When removing a viewSpec from your code, any persisted state referencing it will log a warning
and skip that view gracefully. However, users may see unexpected empty spaces in their layout.
Consider providing a "Restore Default Layout" menu item via `extraMenuItems` so users can reset
when their layout becomes stale.

### `restoreDefaults` is sync for DashCanvas, async for DashContainer

DashCanvasModel's `restoreDefaults()` runs synchronously and returns void. DashContainerModel's
`restoreDefaultsAsync()` is async and returns a Promise — it must destroy and recreate
GoldenLayout. Await it if you need to take action after the layout is rebuilt.

## Key Source Files

| File | Description |
|------|-------------|
| `desktop/cmp/dash/DashModel.ts` | Abstract base — shared state, locking, refresh context. |
| `desktop/cmp/dash/DashViewModel.ts` | Per-view model — title, icon, viewState, active state. |
| `desktop/cmp/dash/DashViewSpec.ts` | Base ViewSpec interface — id, content, permissions. |
| `desktop/cmp/dash/DashConfig.ts` | Base config interface — shared constructor options. |
| `desktop/cmp/dash/container/DashContainerModel.ts` | GoldenLayout integration, state management, addView/removeView. |
| `desktop/cmp/dash/container/DashContainer.ts` | Component factory for rendering a DashContainer. |
| `desktop/cmp/dash/canvas/DashCanvasModel.ts` | react-grid-layout integration, grid positioning, addView/replaceView. |
| `desktop/cmp/dash/canvas/DashCanvasViewModel.ts` | Canvas-specific view model — headerItems, autoHeight, ensureVisible. |
| `desktop/cmp/dash/canvas/DashCanvas.ts` | Component factory for rendering a DashCanvas. |
| `core/persist/provider/DashViewProvider.ts` | PersistenceProvider that reads/writes to DashViewModel.viewState. |

## Related Packages

- [`/cmp/tab/`](../../../cmp/tab/README.md) — TabContainerModel for similar render/refresh patterns
- [`/cmp/viewmanager/`](../../../cmp/viewmanager/README.md) — ViewManagerModel for named view persistence
- [`/core/`](../../../core/README.md) — Persistable interface, RenderMode, RefreshMode
- [`/desktop/cmp/panel/`](../panel/README.md) — Panel container used to wrap dashboard content
