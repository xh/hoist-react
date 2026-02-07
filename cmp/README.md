# Component Package

## Overview

The `/cmp/` package provides Hoist's cross-platform UI components - reusable building blocks that
work across both desktop and mobile applications. These components handle data display, user input,
layout, and interaction patterns while remaining platform-agnostic.

Components in `/cmp/` fall into two categories:
- **Complete components** - Ready-to-use in applications (Grid, Chart, DataView, TabContainer)
- **Base classes and models** - Extended by platform-specific implementations in `/desktop/` and
  `/mobile/` (form fields, input models, layout containers)

## Relationship to Platform Packages

```
/cmp/ (cross-platform)
├── Models, base classes, platform-agnostic logic
├── Used directly by apps OR wrapped by platform packages
│
├── /desktop/
│   ├── Extends /cmp/ components with Blueprint UI
│   ├── Adds desktop-specific inputs, panels, toolbars
│   └── Desktop app container and shell
│
└── /mobile/
    ├── Extends /cmp/ components with Onsen UI
    ├── Adds mobile-specific inputs, navigator, panels
    └── Mobile app container and shell
```

**Example: Grid across platforms**

Both `GridModel` and the `Grid` component itself are fully cross-platform - applications import
and use them identically on desktop and mobile. The platform-specific packages provide *helper*
components built with platform-appropriate UI libraries:

- `/desktop/cmp/grid/` - Cell editors, column chooser dialog, filter UI (using Blueprint)
- `/mobile/cmp/grid/` - Column chooser sheet (using Onsen UI)

The core grid functionality (sorting, grouping, selection, data binding) works the same everywhere.

## Component Conventions

### Element Factories

Hoist components are created via element factories rather than JSX. Each component exports both
a React component (PascalCase) and a factory function (camelCase):

```typescript
// Component definition exports both forms
export const [Grid, grid] = hoistCmp.withFactory<GridProps>({...});
export const [TabContainer, tabContainer] = hoistCmp.withFactory<TabContainerProps>({...});

// Application usage - factory style (preferred)
panel({
    title: 'Data View',
    items: [
        grid({model: gridModel}),
        tabContainer({model: tabModel})
    ]
})

// JSX also supported
<Panel title="Data View">
    <Grid model={gridModel} />
    <TabContainer model={tabModel} />
</Panel>
```

Factories accept a config object with `item`/`items` for children, or children directly as
arguments when no other props are needed.

For details on creating components with `hoistCmp.factory()` and `hoistCmp.withFactory()`,
see the [Core Package README](../core/README.md#element-factories).

### Model-Driven Architecture

Most complex components are paired with a `HoistModel` subclass that manages state and behavior:

| Component | Model | Purpose |
|-----------|-------|---------|
| Grid | GridModel | Data display, sorting, grouping, selection |
| Chart | ChartModel | Highcharts configuration and series data |
| DataView | DataViewModel | Custom item rendering with Grid features |
| TabContainer | TabContainerModel | Tab state and navigation |
| Form | FormModel | Form fields, validation, data binding |
| Card | CardModel | Bordered container, collapsibility, persistence |
| FormFieldSet | FormFieldSetModel | Grouped fields with aggregate validation |

Models are created in application code and passed to components via the `model` prop or
discovered automatically via context lookup (see [Core README](../core/README.md#model-specs-creates-vs-uses)):

```typescript
class MyPanelModel extends HoistModel {
    @managed gridModel = new GridModel({
        store: {fields: ['name', 'value']},
        columns: [{field: 'name'}, {field: 'value'}]
    });
}

// In component
grid({model: this.model.gridModel})
```

### Observable State and Reactive Rendering

Component models use MobX decorators to mark state as observable. Components created with
`hoistCmp` are automatically wrapped as MobX observers - when observable state accessed during
render changes, the component efficiently re-renders.

```typescript
// Model defines observable state
class MyComponentModel extends HoistModel {
    @observable selectedId: string = null;
    @observable.ref data: MyData[] = [];

    @action
    setSelectedId(id: string) {
        this.selectedId = id;
    }
}

// Component reads observable state during render
const myComponent = hoistCmp.factory({
    render({model}) {
        const {selectedId, data} = model;
        return div(
            `Selected: ${selectedId}`,
            `Count: ${data.length}`
        );
    }
});
```

This reactive binding is automatic and efficient - MobX tracks which observables each component
accesses and triggers re-renders only when those specific values change. This eliminates manual
subscription management and optimizes rendering without requiring `React.memo` or similar
techniques.

## Sub-Package Catalog

### Data Display

| Sub-package | Description |
|-------------|-------------|
| `/grid/` | Primary data grid built on ag-Grid (sorting, grouping, filtering, editing, export). [See README](./grid/README.md) |
| `/dataview/` | Custom item rendering using Grid infrastructure |
| `/chart/` | Highcharts integration for data visualization |
| `/treemap/` | Hierarchical treemap and split treemap visualizations |
| `/zoneGrid/` | Multi-zone grid layout for complex record displays |

### Layout and Containers

| Sub-package | Description |
|-------------|-------------|
| `/layout/` | Foundational flexbox containers (Box, VBox, HBox, Frame, Viewport). [See README](./layout/README.md) |
| `/card/` | Bordered container for grouping content with optional header, intent styling, and collapsibility |

### Forms and Input

| Sub-package | Description |
|-------------|-------------|
| `/form/` | Form container, field models, and FormFieldSet for grouped validation. [See README](./form/README.md) |
| `/input/` | Base input model and props for platform inputs. [See README](./input/README.md) |

### Navigation

| Sub-package | Description |
|-------------|-------------|
| `/tab/` | Tabbed interface container and models. [See README](./tab/README.md) |

### Data Filtering and Grouping

| Sub-package | Description |
|-------------|-------------|
| `/filter/` | FilterChooserModel for building filter UIs |
| `/grouping/` | GroupingChooserModel for dimension selection |
| `/store/` | Store-related UI components (count label, filter field) |

### State Persistence

| Sub-package | Description |
|-------------|-------------|
| `/viewmanager/` | Save and restore named views with GridModel state. [See README](./viewmanager/README.md) |

### Feedback and Status

| Sub-package | Description                                              |
|-------------|----------------------------------------------------------|
| `/badge/` | Badge component for counts and status indicators         |
| `/loadingindicator/` | Loading state display in a compact and non-blocking form |
| `/mask/` | Overlay mask for blocking interactions                   |
| `/spinner/` | Loading spinner animations                               |

### Utilities

| Sub-package | Description |
|-------------|-------------|
| `/ag-grid/` | AgGridModel wrapper for ag-Grid integration |
| `/clock/` | Real-time clock display |
| `/error/` | Error boundary and error message display |
| `/markdown/` | Markdown rendering component |
| `/pinpad/` | PIN entry interface |
| `/relativetimestamp/` | Human-readable relative time display |
| `/websocket/` | WebSocket indicator component |

## Key Sub-Packages

### Grid (`/grid/`)

The primary component for tabular data. Wraps ag-Grid with a consistent API for sorting, grouping,
filtering, selection, inline editing, and export. Most data-intensive applications use Grid
extensively.

```typescript
import {grid, GridModel, date, number} from '@xh/hoist/cmp/grid';

// Model - typically created as a @managed property of a parent HoistModel
const gridModel = new GridModel({
    store: {fields: ['name', 'value', 'date']},
    columns: [
        {field: 'name', flex: 1},
        {field: 'value', ...number},
        {field: 'date', ...date}
    ],
    sortBy: 'name'
});

// Component - renders the grid, model found via context or passed explicitly
grid()                        // GridModel found via context lookup
grid({model: gridModel})      // Or pass model explicitly
```

See the [Grid README](./grid/README.md) for complete documentation.

### Chart (`/chart/`)

Highcharts integration for data visualization. ChartModel manages chart configuration and series
data, while the Chart component handles rendering.

```typescript
import {chart, ChartModel} from '@xh/hoist/cmp/chart';

const chartModel = new ChartModel({
    highchartsConfig: {
        chart: {type: 'line'},
        xAxis: {type: 'datetime'},
        yAxis: {title: {text: 'Value'}}
    }
});

chartModel.setSeries([{name: 'Series 1', data: [...]}]);
```

### DataView (`/dataview/`)

Custom item rendering using Grid infrastructure. Useful when each record needs a custom visual
representation rather than tabular columns.

```typescript
import {dataView, DataViewModel} from '@xh/hoist/cmp/dataview';

const dataViewModel = new DataViewModel({
    store: {fields: ['title', 'description', 'thumbnail']},
    itemHeight: 80,
    renderer: (value, {record}) => div({
        className: 'my-card',
        items: [
            img({src: record.data.thumbnail}),
            span(record.data.title)
        ]
    })
});
```

### TabContainer (`/tab/`)

Tabbed interface for organizing content into switchable views. TabContainerModel manages tab
state while platform-specific components handle rendering.

```typescript
import {TabContainerModel} from '@xh/hoist/cmp/tab';

const tabModel = new TabContainerModel({
    tabs: [
        {id: 'overview', title: 'Overview', content: () => overviewPanel()},
        {id: 'details', title: 'Details', content: () => detailsPanel()},
        {id: 'history', title: 'History', content: () => historyPanel()}
    ]
});
```

See the [Tab README](./tab/README.md) for complete documentation.

### Card (`/card/`)

A bordered container for grouping related content with an optional inline header, intent-based
border/header coloring, and collapsible content. Built on an HTML `<fieldset>` and `<legend>` for
base styling. Children are arranged vertically in a flexbox container by default.

```typescript
import {card, CardModel} from '@xh/hoist/cmp/card';

// Simple static card - no model needed (created automatically)
card({
    title: 'User Details',
    icon: Icon.user(),
    items: [nameField(), emailField()]
})

// Collapsible card with persistence
const cardModel = new CardModel({
    collapsible: true,
    defaultCollapsed: false,
    renderMode: 'unmountOnHide',
    persistWith: {localStorageKey: 'detailsCard'}
});

card({
    model: cardModel,
    title: 'Details',
    items: [/* ... */]
})
```

CardModel supports `collapsible` state with configurable `renderMode` (`'always'`, `'lazy'`,
`'unmountOnHide'`) and optional persistence of collapsed state. Cards can display an `intent`
(`'primary'`, `'success'`, `'warning'`, `'danger'`) for colored borders and headers.

**FormFieldSet** (`/cmp/form/formfieldset/`) extends Card to group related `FormField` components,
displaying their aggregate validation state as intent-colored borders and tooltips. See the
[Form README](./form/README.md#formfieldset) for details.

### Layout (`/layout/`)

Foundational flexbox containers for building layouts:

- **Box** - Base flex container
- **VBox** - Vertical (column) flex layout
- **HBox** - Horizontal (row) flex layout
- **Frame** - Box that flexes to fill available space (`flex: 'auto'`) with **HFrame/VFrame** variants
- **Viewport** - Full-screen container

```typescript
import {vframe, hbox} from '@xh/hoist/cmp/layout';

vframe({
    items: [
        hbox({items: [sidebar(), mainContent()]}),
        footer()
    ]
})
```

See the [Layout README](./layout/README.md) for complete documentation.

## Related Packages

- `/core/` - HoistModel, hoistCmp factory, component infrastructure
- `/data/` - Store, StoreRecord, Field - data layer used by Grid, DataView
- `/desktop/` - Desktop platform components extending /cmp/
- `/mobile/` - Mobile platform components extending /cmp/
- `/format/` - Number and date formatters used by Grid renderers
