# Inspector

> **Status: DRAFT** — This document is awaiting review by an XH developer. Content may be
> incomplete or inaccurate. Do not remove this banner until a human reviewer approves the doc.

The Inspector is a built-in developer and admin tool for real-time inspection of a running Hoist
application's `HoistModel`, `HoistService`, and `Store` instances, along with memory and
performance statistics. It renders by default as a resizable bottom panel within the desktop
application UI, driven by the `InspectorService` in [`/svc/`](../svc/README.md), and can also be
popped out into a separate browser window (see [Pop-Out Window](#pop-out-window) below).

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
├── InspectorModel.ts                # Hosts the UI docked in the app or in a popped-out window
├── Inspector.scss                   # Inspector-specific styles
├── instances/
│   ├── InstancesPanel.ts            # Instance grid (left) + tabbed properties/diagnostics (right)
│   ├── InstancesModel.ts            # Model managing instance/property grids, watchlist, getters
│   ├── DiagnosticsPanel.ts          # Data-pipeline diagnostics readout for selected instances
│   └── DiagnosticsModel.ts          # Model syncing op stats from selected instance diagnostics
└── stats/
    ├── StatsPanel.ts                # Chart + grid combo for timeseries stats
    └── StatsModel.ts                # Model tracking model count, heap memory, sync runs
```

The Inspector UI is rendered by `InspectorPanel`, which composes two side-by-side panels: a
`StatsPanel` (resizable left) and an `InstancesPanel`. Both are backed by dedicated `HoistModel`
subclasses.

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

The `active` state is persisted to `localStorage`, so the Inspector will remain open across page
refreshes.

## Pop-Out Window

Because the docked Inspector renders as a standard part of the app's component tree, app-level
masks and modal dialogs will cover and block it. A button in the Inspector's header pops it out
into a separate browser window (e.g. onto a second monitor), leaving the app's viewport entirely
to the app while keeping the Inspector fully live, with direct access to all app state.

Hosting and window lifecycle are managed by `InspectorModel`, which portals the same component
tree rendered when docked into the popped-out window. Notes and limitations:

- The popped-out state is not restored on app load - browsers require a user gesture to open a
  window, so the Inspector returns docked after a refresh.
- Closing the popped-out window directly returns the Inspector to its docked state. Reloading or
  closing the main app window closes the popped-out window.
- Toasts and framework dialogs (e.g. the "Restore Defaults" confirm) always render within the main
  app window, even when triggered from a popped-out Inspector.

## Stats View

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

## Instances View

The Instances panel is a split layout with:

- **Instances grid** (left, resizable) — Lists all live `HoistModel`, `HoistService`, `Store`,
  `Cube`, and `View` instances with their class name, creation time, linked status, and sync run
- **Properties grid** (right) — Shows properties of the selected instance(s), including observable
  values with live updates
- **Diagnostics panel** (tabbed with properties) — Live readout of the data-pipeline
  `diagnostics` published by selected Stores, Cube Views, and GridModels

### Instance Grid Features

- **Grouping** — Toggle "Show in Groups" to group by type (Models, Services, Stores)
- **XH impl filtering** — Toggle "Show XH Impl" to show/hide Hoist's internal framework instances
  (marked with `xhImpl = true`)
- **Actions** — Log instance to devtools console, trigger `loadAsync()` on models with
  `LoadSupport`
- **Multi-select** — Select multiple instances to compare their properties side-by-side

### Properties Grid Features

- **Observable tracking** — Observable properties (via `@observable`, `@bindable`) are marked with
  an eye icon and their values update reactively in the grid
- **Getter evaluation** — Getter properties show as `get(?)` by default to avoid side effects.
  Click to evaluate on demand, or use "Load All Getters" to evaluate all at once
- **Watchlist** — Star properties to pin them to a persistent "Watchlist" group that aggregates
  watched properties across multiple instances
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

- **Log ops** — Streams each op performed by the selected instances to the devtools console,
  by escalating their per-instance `diagnostics.logLevel` - no need to raise the app-wide
  `XH.logLevel`. Resets when the selection changes.
- **Reset** — Clears counts and timings for the selected instances.

Select the instances along a data-change's path - e.g. a Cube's `Store`, a `View` on that cube, and
the `GridModel` displaying its results - to localize the cost of the change to the stage
responsible for it.

### Persistence

Inspector state is persisted to `localStorage` under the key
`xhInspector.{clientAppCode}.*`. This includes:

- Panel sizes (stats panel, instances panel)
- Grid column state for both grids
- Quick filter selections (grouping, xhImpl visibility, property filters)
- Store filter text
- Active/inactive state

The "Restore Defaults" button in the Inspector header clears all persisted state and restarts.

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
