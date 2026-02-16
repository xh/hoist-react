> **Status: DRAFT** — This document is awaiting review by an XH developer. Content may be
> incomplete or inaccurate. Do not remove this banner until a human reviewer approves the doc.

# Kit

The `/kit/` package provides centralized wrappers for all third-party UI and charting libraries
used by Hoist. It serves two purposes:

1. **Install-at-bootstrap libraries** — ag-Grid and Highcharts are provided by applications at
   runtime (since apps must supply their own licensed versions). Kit provides `installAgGrid()` and
   `installHighcharts()` functions that applications call during bootstrap to register these
   libraries with Hoist, along with version constraints to ensure compatibility.

2. **Re-exported component libraries** — Blueprint, Onsen, react-select, GoldenLayout, and several
   other UI libraries are imported by Kit, wrapped as needed (with element factories, prop
   stripping, transition disabling, etc.), and re-exported for use by Hoist's own components. Apps
   typically do not import from Kit directly — they use Hoist's higher-level component wrappers
   in `/desktop/`, `/mobile/`, and `/cmp/`.

## Architecture

```
kit/
├── ag-grid/              # ag-Grid install function + type re-exports
├── blueprint/            # Blueprint 6 wrappers, element factories, disabled transitions
├── golden-layout/        # GoldenLayout v1.5.9 with React 18 patches
├── highcharts/           # Highcharts install function with default config
├── onsen/                # Onsen UI wrappers with HoistModel prop stripping
├── react-beautiful-dnd/  # Drag-and-drop re-exports with element factories
├── react-dates/          # Date picker re-export with local CSS fix
├── react-dropzone/       # File drop zone re-export
├── react-markdown/       # Markdown renderer re-export
├── react-select/         # Select variants (async, creatable, windowed)
└── swiper/               # Touch slider re-export for mobile
```

## Installation Libraries

These libraries must be installed by the application during bootstrap, since they require
app-provided licensed versions.

### ag-Grid

Hoist's grid system (`GridModel` / `Grid` component) is built on ag-Grid. Applications provide
their own ag-Grid package (community or enterprise) via `installAgGrid()`:

```typescript
// In Bootstrap.ts
import {installAgGrid} from '@xh/hoist/kit/ag-grid';
import {AgGridReact} from 'ag-grid-react';
import {version} from 'ag-grid-community/package.json';

installAgGrid(AgGridReact, version);
```

**Version constraints:** Hoist requires ag-Grid **34.2.0 – 34.\*.\***. Attempting to install an
out-of-range version will log an error and leave ag-Grid unavailable.

Kit also re-exports key ag-Grid types (e.g. `GridOptions`, `GridApi`, `ColDef`) and select hooks
(e.g. `useGridCellEditor`) so that Hoist's internal grid implementation can reference them without
directly depending on the ag-Grid package.

### Highcharts

Hoist's charting system (`ChartModel` / `Chart` component) is built on Highcharts. Applications
provide their own Highcharts instance:

```typescript
// In Bootstrap.ts
import {installHighcharts} from '@xh/hoist/kit/highcharts';
import Highcharts from 'highcharts/highstock';

installHighcharts(Highcharts);
```

**Version constraints:** Hoist requires Highcharts **12.4.0 – 12.\*.\***.

On installation, Kit applies default Highcharts options:
- Comma thousands separator
- Numeric symbols: `k`, `m`, `b`, `t` (replaces SI `G` for billions)

## UI Component Libraries

These libraries are imported and wrapped by Kit for use by Hoist's component packages. Applications
should generally import Hoist components (from `/desktop/`, `/mobile/`, or `/cmp/`) rather than
these Kit wrappers directly.

### Blueprint

[Blueprint](https://blueprintjs.com/) (v6) provides the foundation for many desktop components —
buttons, menus, popovers, dialogs, form controls, and more.

Kit wraps Blueprint components to:
- **Disable transitions** — `Dialog` and `Popover` are wrapped to set `transitionDuration: 0` by
  default, avoiding visual jitter in Hoist's snappy UI
- **Provide element factories** — All major Blueprint components are exported as both React
  components and Hoist element factory functions (e.g. `button()`, `menuItem()`, `popover()`)
- **Initialize focus management** — `FocusStyleManager.onlyShowFocusOnTabs()` is called on import
  to avoid focus outlines on mouse click

### Onsen UI

[Onsen UI](https://onsen.io/) provides mobile-specific components used by Hoist's `/mobile/`
package — buttons, pages, tabs, toolbars, dialogs, and navigation.

Kit wraps Onsen components to:
- **Strip HoistModel props** — Onsen internally serializes component props to JSON, which fails on
  complex `HoistModel` instances. Kit's wrapper uses `omitBy` to strip any HoistModel-valued props
  before passing to Onsen
- **Disable auto-styling** — `onsen.disableAutoStyling()` is called on import
- **Provide element factories** — Leaf and container components are wrapped with `elementFactory()`

### react-select

[react-select](https://react-select.com/) powers Hoist's `Select` input component. Kit re-exports
five variants with element factories:

| Export | Description |
|--------|-------------|
| `reactSelect` | Standard select |
| `reactCreatableSelect` | Allows creating new options |
| `reactAsyncSelect` | Loads options asynchronously |
| `reactAsyncCreatableSelect` | Async + creatable combined |
| `reactWindowedSelect` | Windowed rendering for large option lists |

### GoldenLayout

[GoldenLayout](http://golden-layout.com/) (v1.5.9) powers Hoist's `DashContainerModel` — the
tabbed, draggable, resizable dashboard layout. This is the most heavily patched library in Kit,
with several patches applied directly to GoldenLayout's internal classes:

- **React 18 support** — `ReactComponentHandler._render()` is patched to use `createRoot()` instead
  of the legacy `ReactDOM.render()`, and `_destroy()` uses `root.unmount()`
- **Functional component support** — `_getReactComponent()` is patched to pass through props
  (including a unique `id`, `viewState`, and GoldenLayout container/event hub references) instead
  of relying on class component lifecycle methods
- **Touch drag improvements** — `DragListener` is patched to handle touch events correctly,
  including longer hold-to-drag delays and context menu triggering on shorter holds
- **Root drop zone fix** — Patches `_$createRootItemAreas` to account for non-zero viewport offsets
- **jQuery touchmove** — Configures non-passive touchmove handlers to prevent errors

### Other Libraries

| Library | Kit Sub-package | Used By | Purpose |
|---------|-----------------|---------|---------|
| react-beautiful-dnd | `react-beautiful-dnd/` | DashCanvas widget reordering | Drag-and-drop with `DragDropContext`, `Droppable`, `Draggable` |
| react-dates | `react-dates/` | DateInput (desktop) | `SingleDatePicker` with local CSS fix |
| react-dropzone | `react-dropzone/` | FileChooser | File drop zone via `Dropzone` component |
| react-markdown | `react-markdown/` | Markdown display | `ReactMarkdown` component for rendering markdown content |
| Swiper | `swiper/` | Mobile TabContainer | Touch slider with creative effect for swipeable tabs |

## Usage Patterns

### Bootstrap Setup

A typical application's `Bootstrap.ts` calls the installation functions early in setup:

```typescript
import {installAgGrid} from '@xh/hoist/kit/ag-grid';
import {installHighcharts} from '@xh/hoist/kit/highcharts';
import {AgGridReact} from 'ag-grid-react';
import Highcharts from 'highcharts/highstock';

installAgGrid(AgGridReact, '34.2.1');
installHighcharts(Highcharts);
```

### Importing from Kit (Internal Use)

Hoist's own component packages import from Kit. Application code should almost never need to:

```typescript
// ✅ Do: Import Hoist's component wrappers
import {button} from '@xh/hoist/desktop/cmp/button';

// ❌ Don't: Import from Kit directly in application code
import {button} from '@xh/hoist/kit/blueprint';
```

The exception is if you need a Blueprint or other library component that Hoist does not wrap (e.g.
`Tree`, `EditableText`).

## Common Pitfalls

### Version Mismatch Errors

Both `installAgGrid()` and `installHighcharts()` enforce version ranges. If you see an error like
"This version of Hoist requires an ag-Grid version between X and Y," upgrade or downgrade the
library to match Hoist's required range.

### Importing Libraries Directly vs. Through Kit

When Hoist wraps a library (e.g. Blueprint's `Dialog` with transitions disabled), importing the
unwrapped version directly can cause inconsistent behavior:

```typescript
// ✅ Do: Use Kit's wrapped Dialog (transitions disabled)
import {dialog} from '@xh/hoist/kit/blueprint';

// ❌ Don't: Import Blueprint Dialog directly (default transitions enabled)
import {Dialog} from '@blueprintjs/core';
```

### GoldenLayout jQuery Dependency

GoldenLayout v1.5.9 requires jQuery. Hoist includes jQuery as a dependency, but some bundler
configurations may need explicit resolution. See the [v80 upgrade notes](../docs/upgrade-notes/v80-upgrade-notes.md)
for jQuery resolution guidance.

## Related Packages

- [`/cmp/grid/`](../cmp/grid/README.md) — Grid system built on ag-Grid (installed via Kit)
- [`/desktop/cmp/dash/`](../desktop/cmp/dash/README.md) — Dashboard system built on GoldenLayout
  (imported via Kit)
- [`/desktop/`](../desktop/README.md) — Desktop components built on Blueprint (imported via Kit)
- [`/mobile/`](../mobile/README.md) — Mobile components built on Onsen UI (imported via Kit)
