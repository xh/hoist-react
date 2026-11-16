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
    ├── Extends /cmp/ components with native, touch-styled elements
    ├── Adds mobile-specific inputs, navigator, panels
    └── Mobile app container and shell
```

**Example: Grid across platforms**

Both `GridModel` and the `Grid` component itself are fully cross-platform - applications import
and use them identically on desktop and mobile. The platform-specific packages provide *helper*
components built with platform-appropriate UI libraries:

- `/desktop/cmp/grid/` - Cell editors, column chooser dialog, filter UI (using Blueprint)
- `/mobile/cmp/grid/` - Column chooser sheet

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
    @observable accessor selectedId: string = null;
    @observableRef accessor data: MyData[] = [];

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
| `/treemap/` | Hierarchical treemap and split treemap visualizations. Needs the Highcharts `treemap` module, and `heatmap` or `coloraxis` for its colors |
| `/zoneGrid/` | Multi-zone grid layout for complex record displays |
| `/cubegrid/` | Cube View as a tree grid, with pivot paths as nested column groups when pivoted. [See README](./cubegrid/README.md) |
| `/statcard/` | Tiles that call out key figures (StatCard), laid out in equal-width rows (StatCardStrip) |
| `/keyvaluelist/` | Display-only list of labeled values (KeyValueList), such as the fields of a record in a detail panel. [See README](./keyvaluelist/README.md) |
| `/sparkline/` | Small inline trend chart in plain SVG (Sparkline), for a stat card or a grid cell. [See README](./sparkline/README.md) |
| `/itemlist/` | Short, static list of entries with a title, description, icon and trailing detail (ItemList). [See README](./itemlist/README.md) |

### Layout and Containers

| Sub-package | Description |
|-------------|-------------|
| `/layout/` | Foundational flexbox containers (Box, VBox, HBox, Frame, Viewport) and Separator. [See README](./layout/README.md) |
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
| `/daterange/` | DateRangePickerModel for period selection - presets, relative lookbacks, months and years, custom ranges. [See README](./daterange/README.md) |
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
| `/progressbar/` | Bar that shows a value against a maximum, or indeterminate progress (ProgressBar). [See README](./progressbar/README.md) |
| `/spinner/` | Loading spinner animations                               |
| `/steps/` | Ordered sequence of steps with a status each, as a row or a list (Steps). [See README](./steps/README.md) |

### Utilities

| Sub-package | Description |
|-------------|-------------|
| `/ag-grid/` | AgGridModel wrapper for ag-Grid integration |
| `/clock/` | Real-time clock display |
| `/error/` | Error boundary and error message display |
| `/markdown/` | Markdown rendering component |
| `/pdfviewer/` | PDF document viewer built on pdf.js. [See README](./pdfviewer/README.md) |
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

### Sparkline (`/sparkline/`)

A small inline trend chart in plain SVG, with no axes or labels, for a `StatCard` or a grid cell.
Use a `Chart` when the reader needs exact values. See the [Sparkline README](./sparkline/README.md).

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

### ItemList (`/itemlist/`)

A short, static list of entries, each with a title, description, icon and trailing detail. It takes
a plain array, so use `DataView` for many records. See the [ItemList README](./itemlist/README.md).

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

// Muted text after the title, items at the far end of the header, and a footer row
card({
    title: 'Positions',
    subtitle: '12 rows',
    headerItems: [badge(3), button({icon: Icon.download(), onClick: () => model.exportAsync()})],
    footer: 'Prices as of the last close',
    items: [/* ... */]
})
```

CardModel supports `collapsible` state with configurable `renderMode` (`'always'`, `'lazy'`,
`'unmountOnHide'`) and optional persistence of collapsed state. The `footer` follows the same
`renderMode` as the content. Cards can display an `intent` (`'primary'`, `'success'`,
`'warning'`, `'danger'`) for colored borders and headers.

`CardModel.collapsible` is observable, so an app can turn collapsing on or off after it creates
the model. Turning it off expands a collapsed card. Turning it back on restores the collapsed
state the card last had while collapsible, or its persisted state, and otherwise leaves it
expanded.

A card with `headerItems` stretches its header across the card. A click on a header item does not
collapse the card. Screen readers name the card by its title, not by its header items, so give a
card with header items and no title an `aria-label` through `domAttrs`. An `aria-label` or
`aria-labelledby` in `domAttrs` always wins over the name the card sets itself. For a filled header
bar above the content, use a desktop or mobile `Panel`.

**FormFieldSet** (`/cmp/form/formfieldset/`) extends Card to group related `FormField` components,
displaying their aggregate validation state as intent-colored borders and tooltips. See the
[Form README](./form/README.md#formfieldset) for details.

### KeyValueList (`/keyvaluelist/`)

A display-only list of labeled values, such as the fields of a record in a detail panel, laid out
in as many columns as the width allows. See the [KeyValueList README](./keyvaluelist/README.md).

### ProgressBar (`/progressbar/`)

A bar that shows a value against a maximum, with an optional target marker, or an animated fill
for work of unknown length. See the [ProgressBar README](./progressbar/README.md).

### Steps (`/steps/`)

An ordered sequence of steps with a status on each, as a row or a vertical list: an order
lifecycle, the stages of a wizard, a checklist. See the [Steps README](./steps/README.md).

### Layout (`/layout/`)

Foundational flexbox containers for building layouts:

- **Box** - Base flex container
- **VBox** - Vertical (column) flex layout
- **HBox** - Horizontal (row) flex layout
- **Frame** - Box that flexes to fill available space (`flex: 'auto'`) with **HFrame/VFrame** variants
- **Viewport** - Full-screen container
- **Separator** - Rule between sections, with an optional label

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

- [`/core/`](../core/README.md) - HoistModel, hoistCmp factory, component infrastructure
- [`/data/`](../data/README.md) - Store, StoreRecord, Field - data layer used by Grid, DataView
- [`/desktop/`](../desktop/README.md) - Desktop platform components extending /cmp/
- [`/mobile/`](../mobile/README.md) - Mobile platform components extending /cmp/
