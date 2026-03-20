# Grid Package

## Overview

Grid is Hoist React's primary component for displaying tabular and hierarchical data. Built on
ag-Grid, it provides a consistent API with extensive customization for sorting, grouping, filtering,
selection, inline editing, and export.

## Architecture

### Class Hierarchy

```
GridModel (orchestrator)
├── store: Store                  # Data source (from /data/)
├── selModel: StoreSelectionModel # Selection state
├── columns: Column[]             # Column definitions
├── filterModel: GridFilterModel  # Column-level filtering (desktop only)
├── colChooserModel: HoistModel   # Column visibility UI
└── agGridModel: AgGridModel      # ag-Grid wrapper (from /cmp/ag-grid/)
```

### Key Classes

- **GridModel** (`GridModel.ts`) - Central orchestrator managing sorting, grouping, selection,
  column state, and expansion. Created with `GridConfig` and provides the primary application API.

- **Column** (`columns/Column.ts`) - Individual column definition with ~50 configurable properties
  including rendering, sorting, filtering, editing, and export behavior. Applications provide
  `ColumnSpec` configs; Hoist creates `Column` instances internally.

- **ColumnGroup** (`columns/ColumnGroup.ts`) - Hierarchical column organization for multi-level
  headers. Configured via `ColumnGroupSpec`.

- **GridSorter** (`GridSorter.ts`) - Sort specification supporting ascending/descending and absolute
  value sorting. Includes a static `defaultComparator` for consistent null handling.

- **GridFilterModel** (`filter/GridFilterModel.ts`) - Manages column-level filters, integrating with
  Hoist's `Filter` system from `/data/`. Desktop only.

## Configuration Pattern

Grid uses a **Spec → Object** transformation:

- `ColumnSpec` (plain config object) → `Column` (runtime instance)
- `ColumnGroupSpec` → `ColumnGroup`
- `GridConfig` → `GridModel`

This allows declarative configuration while providing rich runtime APIs.

## Common Usage Patterns

### Basic Grid Setup

```typescript
import {grid, GridModel} from '@xh/hoist/cmp/grid';

const gridModel = new GridModel({
    store: {
        fields: ['name', 'value', 'date']
    },
    columns: [
        {field: 'name', flex: 1},
        {field: 'value', ...number},
        {field: 'date', ...date}
    ],
    sortBy: 'name'
});

// In component
grid({model: gridModel});
```

### Pre-built Column Specs

Import partial column configs and spread into your column definitions:

```typescript
import {number, boolCheck, date, dateTime, localDate, tags} from '@xh/hoist/cmp/grid';

columns: [
    {field: 'price', ...number},           // Right-aligned with number formatting
    {field: 'active', ...boolCheck},       // Green check for truthy values
    {field: 'created', ...date},           // Date formatting and Excel export
    {field: 'modified', ...dateTime},      // DateTime formatting
    {field: 'categories', ...tags}         // Tag pill rendering
]
```

### Sorting

```typescript
// Initial sort via config
new GridModel({
    sortBy: 'name',                           // Single column
    sortBy: ['name', {colId: 'value', sort: 'desc'}],  // Multi-column
    sortBy: {colId: 'value', sort: 'desc', abs: true}  // Absolute value sort
});

// Programmatic sort
gridModel.setSortBy([{colId: 'value', sort: 'desc'}]);

// Column-level sort order (cycles on header click)
{field: 'value', sortingOrder: ['desc', 'asc', null]}  // desc first, then asc, then clear
{field: 'value', absSort: true}  // Enable absolute value sorting option
```

### Grouping

```typescript
// Full-width row grouping by column
new GridModel({
    groupBy: 'category',           // Single level
    groupBy: ['region', 'category'], // Multi-level
    expandLevel: 1                 // Expand first level by default
});

// Programmatic grouping
gridModel.setGroupBy(['region']);
gridModel.expandAll();
gridModel.collapseAll();
gridModel.expandToLevel(2);
```

### Tree Mode

```typescript
new GridModel({
    treeMode: true,
    store: {loadTreeData: true},  // Store expects hierarchical data with `children`
    columns: [
        {field: 'name', isTreeColumn: true, flex: 1},  // Exactly one column hosts tree controls
        {field: 'value', ...number}
    ],
    treeStyle: 'highlights'  // 'highlights' | 'borders' | 'none'
});
```

### Selection

```typescript
new GridModel({
    selModel: 'single',    // Default for desktop
    selModel: 'multiple',  // Multi-select with shift/ctrl
    selModel: 'disabled'   // Default for mobile
});

// Programmatic selection
await gridModel.selectAsync(recordOrId);
await gridModel.selectFirstAsync();
await gridModel.preSelectFirstAsync();  // Only if nothing selected
gridModel.clearSelection();

// Read selection - all properties are observable
gridModel.selectedRecord;   // Single record or null
gridModel.selectedRecords;  // Array of records
gridModel.hasSelection;     // Boolean
```

### Filtering

```typescript
// Enable column header filters (desktop only)
new GridModel({
    filterModel: true,  // Default config
    filterModel: {
        bind: store,    // Filter target (defaults to grid's store)
        commitOnChange: true
    },
    columns: [
        {field: 'status', filterable: true},  // Enable filter on specific columns
        {field: 'name', filterable: true}
    ]
});
```

### Inline Editing

```typescript
new GridModel({
    columns: [
        {
            field: 'name',
            editable: true,  // Or function: ({record}) => record.data.canEdit
            editor: textEditor()  // From @xh/hoist/desktop/cmp/grid
        }
    ],
    clicksToEdit: 2  // Double-click to edit (default)
});

// Programmatic editing
await gridModel.beginEditAsync({record: rec, colId: 'name'});
await gridModel.endEditAsync();
```

### Export

```typescript
new GridModel({
    enableExport: true,
    exportOptions: {filename: 'my-data'}
});

// Server-side export (uses GridExportService)
await gridModel.exportAsync({type: 'excel'});

// Client-side export (ag-Grid native)
gridModel.localExport('my-data', 'csv');
```

### Custom Renderers

Use `xxxRenderer` factory functions (e.g., `numberRenderer`) when passing a statically configured
renderer directly to the `renderer` config - the factory returns a reusable function. When rendering
dynamically based on record data or otherwise customizing per-cell, call the underlying formatter
directly (e.g., `fmtNumber`) to avoid creating a new function on each render. See
[`/format/README.md`](../../format/README.md) for the full formatter and renderer API.

```typescript
import {numberRenderer, fmtNumber} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';

columns: [
    // Configured formatter - passes options to the underlying format function
    {
        field: 'price',
        renderer: numberRenderer({precision: 2, prefix: '$'})
    },

    // Renderer function returning different icons based on value
    {
        field: 'status',
        renderer: (status) => {
            switch (status) {
                case 'active': return Icon.checkCircle({className: 'xh-green'});
                case 'pending': return Icon.clock({className: 'xh-orange'});
                case 'inactive': return Icon.x({className: 'xh-red'});
                default: return null;
            }
        }
    },

    // Renderer accessing multiple record fields - requires rendererIsComplex flag
    {
        field: 'value',
        rendererIsComplex: true,
        renderer: (value, {record}) => {
            const {currency} = record.data;
            return fmtNumber(value, {precision: 2, label: currency});
        }
    }
]
```

## Column Properties Reference

Every column within a `GridModel` must resolve to a **unique ID**. The `colId` defaults to `field`
when not explicitly set — so if two columns share the same `field` name (even across column groups),
they must specify distinct `colId` values. Similarly, `ColumnGroup.groupId` defaults to `headerName`
and must also be unique across the grid. GridModel validates this at construction time and will throw
if duplicates are detected.

Key categories of `ColumnSpec` properties:

| Category | Properties                                                                                                   |
|----------|--------------------------------------------------------------------------------------------------------------|
| Identity | `field`, `colId` (unique), `displayName`, `description`                                                      |
| Display | `headerName`, `headerTooltip`, `width`, `flex`, `minWidth`, `maxWidth`, `hidden`, `align`                    |
| Sorting | `sortable`, `sortingOrder`, `absSort`, `sortValue`, `sortToBottom`, `comparator`                             |
| Filtering | `filterable`                                                                                                 |
| Editing | `editable`, `editor`, `editorIsPopup`                                                                        |
| Export | `exportName`, `exportValue`, `excludeFromExport`, `excelFormat`, `excelWidth`                                |
| Chooser | `chooserName`, `chooserGroup`, `chooserDescription`\*, `excludeFromChooser`, `hideable`                      |
| Rendering | `renderer`, `rendererIsComplex`, `tooltip`, `cellClass`, `cellClassRules`                                    |
| Tree | `isTreeColumn`, `headerHasExpandCollapse`                                                                    |
| Autosize | `autosizable`, `autosizeIncludeHeader`, `autosizeIncludeHeaderIcons`, `autosizeMinWidth`, `autosizeMaxWidth` |

\* `description` defaults from `Field.description` and serves as the default for both
`headerTooltip` and `chooserDescription` when those are not explicitly set.

## Extension Points

### ag-Grid Passthrough

Both `Column` and `ColumnGroup` support an `agOptions` property for direct ag-Grid configuration:

```typescript
{
    field: 'notes',
    agOptions: {
        wrapText: true,
        autoHeight: true
    }
}
```

`GridModel` does not expose a top-level `agOptions`, but the underlying `AgGridModel` is accessible
for advanced use cases.

### Custom Comparators

```typescript
{
    field: 'priority',
    comparator: (valueA, valueB, sortDir, abs, {recordA, recordB, defaultComparator}) => {
        // Custom sort logic
        const priorityOrder = {high: 0, medium: 1, low: 2};
        return priorityOrder[valueA] - priorityOrder[valueB];
    }
}
```

### appData

Both `GridModel` and `Column` support an `appData` property for storing custom application data:

```typescript
new GridModel({
    appData: {source: 'user-list'},
    columns: [{field: 'name', appData: {searchable: true}}]
});
```

## App-Level Defaults

GridModel and GridFilterModel expose a `static defaults` object for app-wide configuration
overrides. Set these at app startup (e.g. in your `AppModel` constructor) to change framework
defaults for all grids. Instance-level config always takes precedence.

### GridModel.defaults

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `autosizeMode` | `GridAutosizeMode` | `'onSizingModeChange'` | Default autosize mode for all grids |
| `restoreDefaultsWarning` | `ReactNode` | Confirmation message | Warning shown before restoring grid defaults |
| `contextMenu` | `GridContextMenuItemLike[]` | Standard menu items | Base context menu for all grids |

### GridFilterModel.defaults

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `activeFilterIcon` | `ReactElement` | `Icon.filter()` | Icon shown in column headers when a filter is active |

### Example

```typescript
import {GridModel} from '@xh/hoist/cmp/grid';
import {GridFilterModel} from '@xh/hoist/cmp/grid';
import {Icon} from '@xh/hoist/icon';

// In AppModel constructor
GridModel.defaults.autosizeMode = 'managed';
GridModel.defaults.contextMenu = [
    ...GridModel.defaults.contextMenu,
    '-',
    'myCustomAction'
];
GridFilterModel.defaults.activeFilterIcon = Icon.filter({prefix: 'fas', intent: 'warning'});
```

## Pitfalls

### Duplicate Column IDs

GridModel requires that every column and column group resolves to a unique ID. Column IDs default to
`field` names, so assembling columns from multiple sources (e.g. concatenating arrays of field names
or spreading shared column sets) can easily produce duplicates. GridModel will throw at construction
time with a `Non-unique ids` error if this happens.

To fix, either remove the duplicate column or provide an explicit `colId` on one of the conflicting
columns:

```typescript
const detailColumns = [{field: 'name'}, {field: 'status'}];
const metricColumns = [{field: 'name'}, {field: 'value'}];

// BAD - 'name' appears in both arrays, producing duplicate colIds
columns: [...detailColumns, ...metricColumns]

// GOOD - deduplicate by field before passing to GridModel
columns: uniqBy([...detailColumns, ...metricColumns], 'field')
```

## Related Packages

- [`/data/`](../../data/README.md) - Store, StoreRecord, Field, Filter infrastructure
- `/cmp/ag-grid/` - AgGridModel wrapper
- `/desktop/cmp/grid/` - Desktop-specific components (editors, column chooser dialogs)
- `/mobile/cmp/grid/` - Mobile-specific components
- [`/svc/`](../../svc/README.md) - GridExportService, GridAutosizeService
