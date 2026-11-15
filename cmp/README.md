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
| `/keyvaluelist/` | Display-only list of labeled values (KeyValueList), such as the fields of a record in a detail panel |
| `/sparkline/` | Small inline trend chart in plain SVG (Sparkline), for a stat card or a grid cell |
| `/itemlist/` | Short, static list of entries with a title, description, icon and trailing detail (ItemList) |

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
| `/progressbar/` | Bar that shows a value against a maximum, or indeterminate progress (ProgressBar) |
| `/spinner/` | Loading spinner animations                               |
| `/steps/` | Ordered sequence of steps with a status each, as a row or a list (Steps) |

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

A small inline chart of a trend, with no axes, labels or legend: the line beside a key figure, or
a trend cell in each row of a grid. It draws plain SVG with no charting library, and takes no
model. Use a `Chart` when a reader must take exact values from the chart.

```typescript
import {sparkline} from '@xh/hoist/cmp/sparkline';

// A line in a neutral color, inline, at the default size of 80 by 24 pixels
sparkline({values: [101, 103, 102, 106, 109, 107, 113, 118]})

// Green if the series ends above its start, red if below, with a dot on the last value
sparkline({values, colorByTrend: true, showLast: true})

// Daily P&L as bars, with losses below a zero line in the negative value color
sparkline({values: dailyPnl, type: 'bar', colorNegative: true, baseline: 0})

// Under the figure of a StatCard, at the width of the card
statCard({
    title: 'Orders',
    value: fmtNumber(orders, {precision: 0}),
    detail: sparkline({values: ordersByDay, type: 'area', width: '100%'})
})
```

| Prop | Type | Description |
|------|------|-------------|
| `values` | `number[]` | The series to draw, in order. A null, undefined or NaN entry is a gap |
| `type` | `'line' \| 'area' \| 'bar'` | Shape of the series. Default `line` |
| `intent` | `Intent` | Semantic color for the series. Default is a neutral color |
| `colorByTrend` | `boolean` | Colors the series by its last value against its first. Ignored when `intent` is set |
| `colorNegative` | `boolean` | Draws bars below zero, or below `baseline`, in the negative value color. `bar` only |
| `showLast` | `boolean` | Marks the last value with a dot. `line` and `area` only |
| `showMinMax` | `boolean` | Marks the lowest and highest values with a dot each. `line` and `area` only |
| `baseline` | `number` | Value to draw a dashed reference line at. Bars grow from it |
| `min` / `max` | `number` | Fixed bounds of the scale. Default is the range of the series |
| `tooltip` | `boolean \| string` | Shows the accessible name, or the given string, as a native tooltip |

The component renders inline, like a `Badge`, with no outer margin. Pass layout props to size it.
With `width: '100%'` or `flex: 1` it stretches to its container, and the line keeps its thickness.

To show a sparkline in a grid cell, return it from the `renderer` of a column. In this example the
`history` field of each record holds an array of numbers:

```typescript
{
    field: 'history',
    headerName: 'Trend',
    width: 110,
    autosizable: false,
    sortable: false,
    excludeFromExport: true,
    renderer: values => sparkline({values, width: '100%', colorByTrend: true})
}
```

- A sparkline is a React element, so the column needs a `renderer`, not a `textRenderer`. Set
  `rendererIsComplex` only when the renderer reads other fields of the record.
- Give the column a `width` and set `autosizable: false`. A sparkline at `width: '100%'` has no
  width of its own to autosize to.
- The default height of 24 pixels fits a row in the `standard` and `large` sizing modes. Pass a
  smaller `height`, such as 14, for a `compact` or `tiny` grid.
- An array has no useful sort order or export value. Turn both off, or set the `sortValue` and
  `exportValue` of the column to a number, such as the last value.

Each sparkline scales to its own lowest and highest value by default. Set `min` and `max` to draw
several on one scale, such as those in a grid column. A value outside a fixed scale draws at the
nearer edge. Bars grow from zero, and their scale always takes zero in, so a series far from zero
draws bars of almost equal height. Set `min` or `baseline` to change that.

The component never fails on partial data. One usable value draws a dot, a series of equal values
draws a line across the middle, and an empty or missing array draws an empty box of the same size.

The root element has `role="img"` and a generated accessible name, such as "Trend: 12 points,
from 101 to 118". The name does not format numbers. Pass an `aria-label` through `domAttrs` to
name the metric and round its values.

Set the `--xh-sparkline-*` CSS variables to change the default size, line width and colors. Every
shape draws in the CSS `color` of the component, so a class that sets `color` gives one sparkline
a color of its own.

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

A short, static list of entries, each with a title and an optional description, leading icon and
trailing detail: a handful of alerts, recent activity, the results of a search. The list is
presentation-only. It takes a plain array, with no model and no Store.

```typescript
import {itemList} from '@xh/hoist/cmp/itemlist';

// Alerts with an icon, an intent color and a trailing detail each
itemList({
    dividers: true,
    emptyText: 'No open alerts',
    entries: [
        {
            title: 'Margin call on ACME Fund',
            description: 'Collateral fell below the required level. Post 1.2m by end of day.',
            icon: Icon.warning(),
            intent: 'danger',
            detail: relativeTimestamp({timestamp: alert.time})
        },
        {title: 'Trade 48211 awaits approval', icon: Icon.clock(), detail: badge('Pending')}
    ]
})

// A numbered ranking in the compact size
itemList({
    ordered: true,
    size: 'compact',
    entries: topClients.map(it => ({title: it.name, detail: fmtMillions(it.revenue)}))
})

// Clickable entries - the index is the position in the array as given
itemList({
    entries: results.map(it => ({title: it.name, description: it.summary, disabled: it.locked})),
    onEntryClick: (entry, index) => model.openResult(results[index])
})
```

| Prop | Type | Description |
|------|------|-------------|
| `entries` | `ItemListEntry[]` | Entries to show, in order. Null entries are skipped |
| `ordered` | `boolean` | Numbers the entries shown and renders an `ol`. Default false |
| `dividers` | `boolean` | Draws a rule between entries. Default false |
| `size` | `'compact' \| 'standard'` | `compact` for smaller text and tighter rows. Default `standard` |
| `emptyText` | `ReactNode` | Shown in place of a list with no entries to show. Default is to render nothing |
| `onEntryClick` | `(entry, index) => void` | Handler for a click or Enter/Space keypress. Makes each entry a focusable button |

| `ItemListEntry` key | Type | Description |
|---------------------|------|-------------|
| `title` | `ReactNode` | Main text of the entry |
| `description` | `ReactNode` | Longer text beneath the title |
| `detail` | `ReactNode` | Short content at the far end of the title's line: a figure, a `Badge`, a timestamp |
| `icon` | `ReactElement` | Icon before the text. Not shown in an `ordered` list |
| `intent` | `Intent` | Semantic color for the icon or number, or for a thin bar in a list with neither |
| `disabled` | `boolean` | Dims the entry and leaves it out of `onEntryClick` |
| `omit` | `boolean` | True to leave the entry out |

The data prop is `entries`, not `items`, because Hoist element factories reserve `items` for
child elements. `onEntryClick` gets the index of the entry in `entries` as given, which counts
null and omitted entries. That index can differ from the number an `ordered` list shows.

Choose between `ItemList` and `DataView` by the size of the data and by what the user does with
it:

| | `ItemList` | `DataView` |
|---|---|---|
| Data | A plain array, passed as a prop | A `Store`, held by a `DataViewModel` |
| Size | A handful of entries, all rendered | Any number of records. Renders only the rows in view |
| Row height | Set by the content of each entry | Fixed, or computed per record by `itemHeight` |
| Selection, sorting, grouping | None | Yes, as in a `Grid` |
| Content of a row | Title, description, icon and detail | Any element, from a `renderer` |

The list fills the width of its container and has no outer margin. Text wraps and is never
truncated. A long title wraps beside its detail, and the detail drops to a line of its own only
in a very narrow list. An entry with no icon keeps the space of one when another entry has an
icon, so that every title lines up.

A `title`, `description` or `detail` that is null, a boolean or a blank string renders nothing,
so `cond && 'Text'` is safe. The list skips an entry with all three blank. A string renders as
text, never as HTML.

`intent` colors the icon or number of an entry, not its text. Say what the color means in the
text as well. The component renders an HTML list, so a screen reader announces the count and the
position of each entry.

Set the `--xh-item-list-*` CSS variables to change the spacing and colors.

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
`'unmountOnHide'`) and optional persistence of collapsed state. Cards can display an `intent`
(`'primary'`, `'success'`, `'warning'`, `'danger'`) for colored borders and headers.

`CardModel.collapsible` is observable, so an app can change it after it creates the model. Set it
false to remove the collapse control, which also expands a collapsed card. Set it true to add the
control. The card then returns to the collapsed state it last had while collapsible, or to its
persisted state, and is otherwise left expanded.

| Prop | Type | Description |
|------|------|-------------|
| `subtitle` | `ReactNode` | Muted text after the title, for example a row count |
| `headerItems` | `ReactNode[]` | Items at the far end of the header, for example buttons or a badge |
| `footer` | `ReactNode` | Row under the content, set apart by a rule. Hidden while the card is collapsed |

A blank `subtitle` or `footer` renders nothing, and blank members of `headerItems` are left out.

A card with `headerItems` stretches its header across the card, with a rule between the title and
the items in place of the top border. A click on a header item does not collapse the card. Screen
readers name the card by its title, not by its header items. A card with header items and no
title has no name of its own, so pass an `aria-label` through `domAttrs`. The
header stays inline with the border in every case. For a filled header bar above the content, use
a desktop or mobile `Panel`.

**FormFieldSet** (`/cmp/form/formfieldset/`) extends Card to group related `FormField` components,
displaying their aggregate validation state as intent-colored borders and tooltips. See the
[Form README](./form/README.md#formfieldset) for details.

### KeyValueList (`/keyvaluelist/`)

A display-only list of labeled values, such as the fields of a record in a detail panel. The list
is presentation-only and takes no model. It renders as an HTML description list (`dl`), fills the
width of its container and has no outer margin.

```typescript
import {keyValueList} from '@xh/hoist/cmp/keyvaluelist';
import {fmtDate, fmtNumber} from '@xh/hoist/format';

// Labels in an aligned column on the left, in as many columns as the width allows
keyValueList({
    entries: [
        {label: 'Symbol', value: trade.symbol},
        {label: 'Quantity', value: fmtNumber(trade.quantity, {precision: 0})},
        {label: 'Settles', value: fmtDate(trade.settleDate)},
        {label: 'Status', value: trade.status, intent: trade.isRejected ? 'danger' : null},
        {label: 'Broker', value: trade.broker, omit: !trade.isExternal}
    ]
})

// Labels above their values, in at most three columns, with a rule between rows
keyValueList({entries, labelPosition: 'top', columns: 3, minColumnWidth: 160, dividers: true})
```

| Prop | Type | Description |
|------|------|-------------|
| `entries` | `KeyValueEntry[]` | Labeled values to show, in order. A null entry is skipped |
| `labelPosition` | `'left' \| 'top'` | Where each label sits against its value. Default `left` |
| `columns` | `number` | Number of columns, never more than the entries. Omit to fit the width |
| `minColumnWidth` | `number` | Narrowest a column gets, in pixels. Default 300, or 180 with `top` |
| `emptyText` | `ReactNode` | Shown for a null, undefined or blank string value. Default `-` |
| `size` | `'compact' \| 'standard'` | `compact` for smaller text and tighter rows |
| `dividers` | `boolean` | True to draw a rule between rows |

An entry is `{label, value, intent, omit}`. The caller formats each `value`: the list never
formats. A boolean value shows as the text `true` or `false`. Set `intent` to color a value, and
`omit` to leave an entry out.

With no `columns`, the list fits as many columns of at least `minColumnWidth` as its width allows,
and stacks in one column in a narrow container. A `columns` count holds at any width. Set
`minColumnWidth` with it to make it a maximum.

Long labels and values wrap, within a word if needed, so the list never forces horizontal
overflow. Set the `--xh-key-value-list-*` CSS variables to change the gaps, label width and
colors.

### ProgressBar (`/progressbar/`)

A horizontal bar that shows a value against a maximum: the progress of a task, or usage against a
limit. The bar is presentation-only and takes no model. It is a block, so it fills the width of a
block or a column. In a row such as an `hbox`, give it a `flex` or a `width`.

```typescript
import {progressBar} from '@xh/hoist/cmp/progressbar';

// A value on the default scale of 0 to 100, shown as a whole percent
progressBar({label: 'Upload', value: 72})

// A custom scale, a pre-formatted figure, an intent and a marker at a threshold
progressBar({
    label: 'Desk A risk',
    value: 8.1,
    max: 10,
    valueLabel: '$8.1m of $10m',
    target: 7.5,
    intent: 'warning'
})

// No value - an indeterminate bar for work of unknown length
progressBar({label: 'Loading positions'})
```

| Prop | Type | Description |
|------|------|-------------|
| `value` | `number` | Value to show, clamped to the range. Omit it for an indeterminate bar |
| `min` / `max` | `number` | Values of an empty and a full bar. Default 0 and 100 |
| `label` | `ReactNode` | Caption above the bar, which wraps if long. Also the accessible name of the bar |
| `valueLabel` | `ReactNode` | Figure above the bar, pre-formatted by the caller. Defaults to a whole percent |
| `showValueLabel` | `boolean` | False to hide the figure. Default true |
| `intent` | `Intent` | Semantic color for the fill. Default is the primary color |
| `target` | `number` | Value to mark on the track, for a threshold or a goal. No marker shows for a target outside the range |

A null prop takes its default, and a blank `label` renders nothing. The default figure reads
`100%` only for a full bar and `0%` only for an empty one, so `99.6` reads `99%`.

The bar never fails on odd data. A value outside the range draws an empty or a full bar. A NaN
value, or a `max` that is not above `min`, draws an empty bar with no figure.

The root element has `role="progressbar"` and reports its range and value to screen readers. Pass
an `aria-label` through `domAttrs` for a bar with no `label`. The indeterminate animation stops
for users who ask their system for reduced motion.

Set the `--xh-progress-bar-*` CSS variables to change the height, radius and colors.

### Steps (`/steps/`)

An ordered sequence of steps, each with a status: the lifecycle of an order, the stages of a
wizard, a workflow or a checklist. A line connects each step to the next. The component is
presentation-only and takes no model.

```typescript
import {steps} from '@xh/hoist/cmp/steps';

// `current` derives each status: steps before it are complete, steps after it are pending
steps({
    current: 2,
    steps: [{title: 'Submitted'}, {title: 'Approved'}, {title: 'Routed'}, {title: 'Filled'}]
})

// A vertical list with a status on each step - doubles as a simple timeline
steps({
    orientation: 'vertical',
    steps: [
        {title: 'Submitted', status: 'complete', detail: '09:30'},
        {title: 'Approved', status: 'complete', detail: '09:42', description: 'By the risk desk'},
        {title: 'Routed', status: 'error', description: 'The venue rejected the order'},
        {title: 'Filled'}
    ]
})

// Clickable steps for a wizard
steps({
    current: model.stepIndex,
    steps: wizardSteps,
    onStepClick: (step, index) => model.goToStep(index)
})
```

| Prop | Type | Description |
|------|------|-------------|
| `steps` | `StepSpec[]` | Steps to show, in order. A null entry is left out |
| `current` | `number` | Index in `steps` of the current step, from 0. An index past the last step completes them all |
| `orientation` | `'horizontal' \| 'vertical'` | Direction of the sequence. Default `horizontal` |
| `onStepClick` | `(step, index) => void` | Handler for a click or Enter/Space keypress. Makes each step a focusable button, except a `disabled` one |

| `StepSpec` key | Type | Description |
|----------------|------|-------------|
| `title` | `ReactNode` | Name of the step |
| `description` | `ReactNode` | Longer text beneath the title |
| `detail` | `ReactNode` | Short secondary text, for example a timestamp |
| `status` | `StepStatus` | `pending`, `current`, `complete`, `warning` or `error`. Takes priority over `current` |
| `icon` | `ReactElement` | Icon for the marker, in place of the number or the status icon |
| `disabled` | `boolean` | True to make the step ignore `onStepClick`. It takes no focus and no click, and shows dimmed |
| `omit` | `boolean` | True to leave the step out |

Markers number the steps that show, from 1. `current` and the index passed to `onStepClick` count
every entry of `steps`, including a step that is left out. A blank `title`, `description` or
`detail` renders nothing. A status is not an `Intent`: a failed step is `error`, drawn in the
danger color.

A horizontal sequence gives each step an equal share of the width, with its text centered under
its marker. Text wraps and is never truncated, so the row gets taller in a narrow container and
does not overflow it. Use `vertical` for long descriptions. The list is a block, so in a row such
as an `hbox` it needs a `flex` or a `width`.

The component renders an ordered list and sets `aria-current="step"` on the current step. A
marker that shows its status by icon alone names that status for screen readers.

Set the `--xh-steps-*` CSS variables to change the colors and sizes.

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

- [`/core/`](../core/README.md) - HoistModel, hoistCmp factory, component infrastructure
- [`/data/`](../data/README.md) - Store, StoreRecord, Field - data layer used by Grid, DataView
- [`/desktop/`](../desktop/README.md) - Desktop platform components extending /cmp/
- [`/mobile/`](../mobile/README.md) - Mobile platform components extending /cmp/
