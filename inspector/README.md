# Inspector

> **Status: DRAFT** — This document is awaiting review by an XH developer. Content may be
> incomplete or inaccurate. Do not remove this banner until a human reviewer approves the doc.

The Inspector is a built-in developer and admin tool for real-time inspection of a running Hoist
application's `HoistModel`, `HoistService`, and `Store` instances, along with memory and
performance statistics. It renders in its own browser window alongside the desktop application,
driven by the `InspectorService` in [`/svc/`](../svc/README.md) (see
[Inspector Window](#inspector-window) below).

## Overview

During development (or for admin troubleshooting), the Inspector answers questions like:

- How many models are alive right now? Are any leaking?
- What are the current observable property values on a specific model instance?
- When was a model's `doLoadAsync()` last called? Did it succeed?
- How is JS heap memory trending over time?

The Inspector provides two main views: **Stats** (timeseries of model counts and memory) and
**Instances** (browsable list of all live instances with property inspection).

## Architecture

```
inspector/
├── InspectorPanel.ts                # Top-level container (renders Stats + Instances panels)
├── InspectorModel.ts                # Hosts the UI in a separate browser window
├── Inspector.scss                   # Inspector-specific styles
├── instances/
│   ├── InstancesPanel.ts            # All/Watchlist tabs (left) + detail tabs (right)
│   ├── InstancesModel.ts            # Model managing the All grid, nav tabs, and selection
│   ├── AllPanel.ts                  # All tab - every live instance, with quick filters
│   ├── watchlist/                   # Watchlist tab - starred instances and properties
│   │   ├── WatchlistPanel.ts
│   │   ├── WatchlistModel.ts        # Watched instance/property keys, persisted when named
│   │   ├── WatchlistPropsModel.ts   # Starred properties grid
│   │   └── WatchlistUtils.ts        # Instance keys, star icon, shared star column
│   └── details/                     # Detail tabs for the selected instances
│       ├── BasePropsModel.ts        # Shared property grid: getters, logging, watchlist star
│       ├── PropertiesPanel.ts       # Properties of selected instances, with quick filters
│       ├── PropertiesModel.ts
│       ├── DiagnosticsPanel.ts      # Data-pipeline diagnostics readout for selected instances
│       └── DiagnosticsModel.ts      # Model syncing op stats from selected instance diagnostics
└── stats/
    ├── StatsPanel.ts                # Chart + grid combo for timeseries stats
    └── StatsModel.ts                # Model tracking model count, heap memory, sync runs
```

The Inspector UI is rendered by `InspectorPanel`, which hosts two top-level tabs switched via a
picker in its header: **Memory** (`StatsPanel`) and **Objects** (`InstancesPanel`). Both are backed
by dedicated `HoistModel` subclasses.

The actual data collection happens in `InspectorService` (in [`/svc/`](../svc/README.md)), which:
- Maintains an observable `activeInstances` array synced from Hoist's internal instance registry
- Tracks `stats` (timestamped model count + heap memory snapshots)
- Provides `activate()`/`deactivate()` methods to start/stop collection

## Enabling the Inspector

### Configuration

The Inspector is controlled by an optional `xhInspectorConfig` soft config (AppConfig). When not
present, the Inspector defaults to enabled for all users.

```json
{
    "enabled": true,
    "requiresRole": "HOIST_ADMIN",
    "statsUpdateInterval": 30000
}
```

| Config Key | Type | Description |
|------------|------|-------------|
| `enabled` | `boolean` | Master switch. Default `true` |
| `requiresRole` | `string` | If set, only users with this role can access the Inspector |
| `statsUpdateInterval` | `number` | Milliseconds between background stats updates. Default `30000` (30s) |

### Activation Methods

The Inspector can be toggled via:

1. **Version bar button** — Desktop apps display a version bar at the bottom of the screen. When
   the Inspector is enabled, the version bar includes a toggle button
2. **Programmatic** — `XH.inspectorService.activate()` / `XH.inspectorService.deactivate()` /
   `XH.inspectorService.toggleActive()`

The `active` state is persisted to `localStorage`, so the Inspector will attempt to reopen across
page refreshes (see below).

## Inspector Window

The Inspector renders in a separate browser window (e.g. on a second monitor), leaving the app's
viewport entirely to the app and keeping the Inspector clear of app-level masks and modal dialogs.
The Inspector remains part of the main app's component tree via a cross-document React portal, so
it stays fully live with direct access to all app state.

Hosting and window lifecycle are managed by `InspectorModel`. Notes and limitations:

- Activating the service opens the window; deactivating it (or closing the window directly) closes
  it. Reloading or closing the main app window also closes the Inspector window.
- Browsers require a user gesture to open a window. If the Inspector was active before a page
  refresh, Hoist attempts to reopen it on load - if the browser blocks the open, the service is
  deactivated with a toast. Allow popups for the app's origin to restore the Inspector on reload.
- Toasts and framework dialogs (e.g. the "Restore Defaults" confirm) always render within the main
  app window, even when triggered from the Inspector.

## Memory Tab (Stats)

The Stats panel shows a timeseries chart and grid tracking:

| Metric | Description |
|--------|-------------|
| **Model Count** | Total number of live `HoistModel` instances |
| **Model Count Change (#Δ)** | Delta from previous snapshot (positive = models created, negative = destroyed) |
| **Used JS Heap** | Current used JavaScript heap memory (Chromium only, via `performance.memory`) |
| **Total JS Heap** | Total allocated heap |
| **% Limit** | Used heap as percentage of the browser's heap size limit |

The chart renders three series: model count (area), used heap (line), and count delta (column).
Clicking a row in the stats grid sets a "selected sync run" filter that can cross-filter the
Instances view to show only instances created during that sync batch.

**Sync runs:** Each time the Inspector detects new instances in the registry, it increments a sync
run counter. This groups instances by when they appeared, making it easier to identify which
navigation or load action created them.

## Objects Tab (Instances)

The Instances panel is a split layout. The left side chooses instances, via two tabs:

- **All** — Lists all live `HoistModel`, `HoistService`, `Store`, `Cube`, and `View` instances
  with their label (the same `ClassName [xhName]` or `ClassName [id]` used in log output),
  creation time, linked status, and sync run. Class name, name, and ID are available as hidden
  columns
- **Watchlist** — Starred instances (top) and starred properties (bottom), independent of the
  current selection and filters. The tab title shows the entry count

The right side shows details for the instances selected in whichever left tab is active:

- **Properties** — Properties of the selected instance(s), including observable values with
  live updates
- **Diagnostics** — Live readout of the data-pipeline `diagnostics` published by selected Stores,
  Cube Views, and GridModels

### All Tab Features

- **Grouping** — Toggle "Grouped" to group by type (Models, Services, Cubes, Views, Stores)
- **Anon filtering** — Toggle "Anon" to include instances without an `xhName`, hidden by default
- **XH impl filtering** — Toggle "xhImpl" to include Hoist's internal framework instances
  (marked with `xhImpl = true`)
- **Watchlist star** — Star any instance (via its star or context menu) to add it to the
  Watchlist tab. Named instances are keyed by `{className}:{xhName}` and persist across reloads;
  unnamed ones are keyed by `xhId` and last for the page load only. Watched instances with no live
  instance show as muted placeholder rows in the Watchlist - un-star one to drop it
- **Context menu** — Log instance to devtools console, trigger `loadAsync()` on models with
  `LoadSupport`, toggle Watchlist
- **Multi-select** — Select multiple instances to compare their properties side-by-side

### Properties Grid Features

- **Observable tracking** — Observable properties (via `@observable`, `@bindable`) are marked with
  an eye icon and their values update reactively in the grid
- **Getter evaluation** — Getter properties show as `get(?)` by default to avoid side effects.
  Click to evaluate on demand, or use "Load all getters" in the context menu to evaluate all at once
- **Watchlist star** — Star properties to add them to the Watchlist tab's properties grid, which
  aggregates watched properties across instances (grouped by instance) regardless of the property
  filters. Properties of named instances persist across reloads
- **Filtering** — Toggle filters for: own properties only, observable properties only, hide
  underscore-prefixed properties
- **Navigation** — When a property value is a HoistModel, HoistService, Store, Cube, or View,
  clicking its value navigates to that instance in the instances grid
- **Console logging** — Double-click a property or use the action button to log its value to the
  browser devtools console

### Diagnostics Panel

`Store`, Cube `View`, and `GridModel` publish `diagnostics` reporting on each data-pipeline
operation they perform - see [Diagnostics](../data/README.md#diagnostics) in the data package
README. When any selected instance publishes diagnostics, this panel shows one row per operation
kind with the last op's type (the path taken - e.g. an incremental patch vs. a full rebuild), the
work done, its timing, and cumulative count/average stats. Selecting a `Cube` reports via its
internal `Store`, where its data ops actually land.

- **Log operations to console** — Streams each op performed by the selected instances to the
  devtools console, by escalating their per-instance `diagnostics.logLevel` - no need to raise the
  app-wide `XH.logLevel`. Sticky per instance - logging continues when the selection moves
  elsewhere, and any number of instances can log at once.
- **Reset** — Clears counts and timings for the selected instances.

Select the instances along a data-change's path - e.g. a Cube's `Store`, a `View` on that cube, and
the `GridModel` displaying its results - to localize the cost of the change to the stage
responsible for it.

### Persistence

Inspector state is persisted to `localStorage` under the key
`xhInspector.{clientAppCode}.*`. This includes:

- Active top-level, All/Watchlist, and detail tabs, plus panel sizes
- Grid column state for all grids
- Quick filter selections (grouping, Anon and xhImpl visibility, property filters)
- Watchlist entries for named instances and their properties
- Store filter text
- Active/inactive state
- The last hour of memory stats, per browser tab, so the trend before a reload is kept

The "Restore Defaults" button in the Inspector toolbar clears all persisted state and restarts.

## Usage Patterns

### Development Workflow

The Inspector is most useful during active development:

1. Enable the Inspector via the version bar toggle
2. Navigate your app normally — watch the Stats chart for model count trends
3. If model count grows without bound on navigation, you may have a model leak
4. Select a suspicious instance in the Instances grid to inspect its properties
5. Add key properties to the Watchlist for persistent monitoring
6. Use sync run filtering to isolate instances created during a specific action

### Detecting Model Leaks

A common development issue is models that are created but never destroyed (e.g. models created in
`render()` without proper `@managed` cleanup). The Stats chart makes this visible:

- **Healthy pattern:** Model count rises on navigation, falls when navigating away (destruction
  cascade cleans up)
- **Leak pattern:** Model count only rises, never falling back down

Filter the Instances grid by sync run to identify which models were created during a particular
navigation step, then inspect their class names to determine which component is leaking.

## Common Pitfalls

### Heap Memory Only Available in Chromium

The `performance.memory` API used by the Stats view is non-standard and only available in
Chromium-based browsers (Chrome, Edge). In Firefox or Safari, heap-related columns will be empty.

### Inspector Overhead

When active, the Inspector runs an autorun (throttled to 300ms) that reads observable properties
from all tracked instances, plus a background stats timer. This adds some overhead — deactivate
the Inspector when not actively debugging.

### Getter Side Effects

Evaluating getters in the Properties grid can trigger side effects if the getter performs
computation, network requests, or state mutations. The Inspector avoids evaluating getters
automatically for this reason — they show as `get(?)` until explicitly triggered.

## Related Packages

- [`/svc/`](../svc/README.md) — `InspectorService` provides the data backing for the Inspector UI
- [`/core/`](../core/README.md) — `HoistBase`, `HoistModel`, `HoistService` are the instance
  types tracked by the Inspector
- [`/data/`](../data/README.md) — `Store` instances are also tracked in the Instances view
