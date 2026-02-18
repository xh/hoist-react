# Data Package

## Overview

The `/data/` package provides Hoist's data management layer - observable, in-memory data containers
with support for hierarchical structures, filtering, validation, and multi-dimensional aggregation.

The core classes are:

| Class | Purpose |
|-------|---------|
| **Store** | Observable collection of records with filtering, selection, and modification tracking |
| **StoreRecord** | Individual record wrapper with state tracking, validation, and tree navigation |
| **Field** | Metadata descriptor defining type parsing, defaults, and validation rules |
| **Cube** | Multi-dimensional aggregation engine for OLAP-style grouping and analysis |
| **View** | Query result from a Cube - hierarchical, auto-updating aggregated data |

Store, StoreRecord, and Field are used in virtually every Hoist application. Cube and View support
advanced analytics use cases where data needs to be dynamically grouped and aggregated.

The package also includes:
- **Filter system** - Composable, immutable filters with JSON serialization
- **Validation system** - Synchronous and async constraints with multiple severity levels

## Architecture

```
Store                                    Cube
├── fields: Field[]                      ├── fields: CubeField[]
├── records: StoreRecord[]               ├── store: Store (source data)
├── rootRecords: StoreRecord[]           └── views: View[]
├── filter: Filter
├── selModel: StoreSelectionModel        View
└── validator: StoreValidator            ├── query: Query (dimensions, filters)
                                         ├── result: ViewResult (observable output)
                                         └── stores: Store[] (connected for auto-loading)
StoreRecord
├── id: StoreRecordId
├── data: PlainObject            // Current field values
├── committedData: PlainObject   // Last committed state
├── parent / children            // Tree navigation
└── validationState              // Per-record validation

Field                                    CubeField extends Field
├── name: string                         ├── isDimension: boolean
├── type: FieldType                      └── aggregator: Aggregator
├── defaultValue: any
└── rules: Rule[]
```

## Store

**File**: `Store.ts`

The central data management class - a managed, observable collection of in-memory records.

### Creating a Store

```typescript
import {Store} from '@xh/hoist/data';

const store = new Store({
    fields: [
        {name: 'name', type: 'string', displayName: 'Full Name'},
        {name: 'salary', type: 'number', defaultValue: 0},
        {name: 'department', type: 'string'},
        {name: 'hireDate', type: 'localDate'}
    ],
    data: initialData  // Each record should have an 'id' property (default idSpec)
});
```

### Store Configuration

| Property | Type | Default | Description                                                                            |
|----------|------|---------|----------------------------------------------------------------------------------------|
| `fields` | `Array<string \| FieldSpec \| Field>` | - | Schema definition                                                                      |
| `fieldDefaults` | `Omit<FieldSpec, 'name'>` | - | Defaults applied to all fields                                                         |
| `idSpec` | `string \| Function` | `'id'` | Property name or function to derive record IDs                                         |
| `data` | `PlainObject[]` | - | Initial data to load                                                                   |
| `processRawData` | `(raw) => PlainObject` | - | Transform raw data before parsing                                                      |
| `filter` | `FilterLike` | - | Initial filter                                                                         |
| `filterIncludesChildren` | `boolean` | `false` | Include children when parent passes filter                                             |
| `loadTreeData` | `boolean` | `true` | Enable hierarchical loading                                                            |
| `loadTreeDataFrom` | `string` | `'children'` | Property containing child records                                                      |
| `loadRootAsSummary` | `boolean` | `false` | Treat root node as summary record                                                      |
| `freezeData` | `boolean` | `true` | Freeze record data objects for immutability (set to false as performance optimization) |
| `reuseRecords` | `boolean` | `false` | Cache records by ID and raw reference (performance)                                    |
| `idEncodesTreePath` | `boolean` | `false` | IDs imply fixed tree position (performance)                                            |
| `validationIsComplex` | `boolean` | `false` | Validate all uncommitted records on every change                                       |

### Data Loading

**`loadData(rawData, rawSummaryData?)`** - Complete dataset replacement:

```typescript
// Flat data
store.loadData([
    {id: 1, name: 'Alice', salary: 100000},
    {id: 2, name: 'Bob', salary: 90000}
]);

// Hierarchical data (children nested automatically)
store.loadData([
    {
        id: 'eng',
        name: 'Engineering',
        children: [
            {id: 'eng-1', name: 'Alice'},
            {id: 'eng-2', name: 'Bob'}
        ]
    }
]);
```

**`updateData(rawData | transaction)`** - Transactional updates preserving local modifications:

```typescript
// Simple array form - adds or updates based on ID match
store.updateData([
    {id: 1, salary: 110000}  // Updates existing
]);

// Transaction form - explicit control
store.updateData({
    update: [{id: 1, salary: 110000}],
    add: [{id: 3, name: 'Carol', salary: 95000}],
    remove: [2]
});
```

### Local Modifications

Stores track uncommitted changes separately from server-sourced data:

```typescript
// Add new records (must include id - use XH.genId() if needed)
store.addRecords([{id: XH.genId(), name: 'New Employee'}]);

// Modify existing records
store.modifyRecords([{id: 1, salary: 120000}]);

// Remove records
store.removeRecords([recordOrId]);

// Query modification state
store.hasLocalChanges;     // Any uncommitted changes?
store.addedRecords;        // Records added locally
store.removedRecords;      // Records removed locally
store.modifiedRecords;     // Records with modified fields
store.dirtyRecords;        // All uncommitted changes

// Commit or revert
store.commitRecords();     // Mark local changes as committed
store.revertRecords();     // Discard local changes
```

### Filtering

```typescript
// Set filter
store.setFilter({field: 'department', op: '=', value: 'Engineering'});

// Compound filter
store.setFilter({
    op: 'AND',
    filters: [
        {field: 'department', op: '=', value: 'Engineering'},
        {field: 'salary', op: '>=', value: 50000}
    ]
});

// Clear filter
store.clearFilter();

// Access filtered vs unfiltered data
store.records;       // Filtered records
store.allRecords;    // All records (ignores filter)
store.count;         // Filtered record count
store.allCount;      // Total record count
```

### Observable Properties

Stores are fully observable for MobX reactivity:

```typescript
// React to data changes
this.addReaction({
    track: () => store.records,
    run: records => console.log('Records changed:', records.length)
});

// Key observables
store.records              // Filtered records
store.count                // Filtered count
store.allCount             // Total count
store.empty                // No records?
store.lastUpdated          // Timestamp of last change
store.lastLoaded           // Timestamp of last loadData call
```

## StoreRecord

**File**: `StoreRecord.ts`

Wrapper around each data element providing state tracking, validation, and tree navigation.

### Record State

```typescript
const record = store.getById(1);

// Data access
record.id;                  // Unique identifier
record.data;                // Current field values
record.committedData;       // Last committed state (null if new)
record.raw;                 // Original raw data

// State predicates
record.isAdd;               // Never committed (new record)
record.isDirty;             // Has uncommitted changes
record.isModified;          // Alias for isDirty
record.isCommitted;         // No local modifications

// Field access
record.get('salary');                // Single field value
record.getValues();                  // All field values (with defaults)
record.getModifiedValues();          // Only changed fields
```

### Tree Navigation

For hierarchical data, records provide navigation without direct object references:

```typescript
record.parentId;            // Parent record ID
record.parent;              // Parent StoreRecord
record.children;            // Direct children (filtered)
record.allChildren;         // Direct children (unfiltered)
record.descendants;         // All descendants (filtered)
record.allDescendants;      // All descendants (unfiltered)
record.ancestors;           // All ancestors
record.depth;               // Nesting level (0 for roots)
record.treePath;            // Array of ancestor IDs
```

### Validation Access

```typescript
record.validationState;     // 'Valid' | 'NotValid' | 'Unknown'
record.isValid;             // Boolean shortcut
record.isNotValid;          // Boolean shortcut
record.errors;              // Map of field → error messages
record.errorCount;          // Total error count
record.validationResults;   // Map of field → ValidationResult[]
record.isValidationPending; // Async validation in progress?
```

## Field

**File**: `Field.ts`

Metadata descriptor defining type parsing, defaults, display names, descriptions, and validation
rules. The `displayName` and `description` properties flow from `Field` to `Column` automatically,
providing defaults for grid headers, tooltips, and chooser descriptions.

### Field Configuration

```typescript
const store = new Store({
    fields: [
        // Simple string form
        'lastName',

        // Full configuration
        {
            name: 'salary',
            type: 'number',
            displayName: 'Annual Salary',
            description: 'Total annual compensation before taxes',
            defaultValue: 0,
            rules: [required, numberIs({min: 0})]
        },

        {name: 'department', type: 'string'},
        {name: 'hireDate', type: 'localDate'}
    ]
});
```

### Field Types

| Type | Description | Parsing |
|------|-------------|---------|
| `'auto'` | No parsing (default) | Pass-through |
| `'string'` | Text values | Converts to string |
| `'number'` | Floating point | Parses numeric strings |
| `'int'` | Integer | Parses and rounds |
| `'bool'` | Boolean | Handles 'true'/'false' strings |
| `'date'` | Date/time | Parses to Date object |
| `'localDate'` | Date only | Parses to LocalDate |
| `'json'` | JSON data | Parses JSON strings |
| `'tags'` | String array | Splits comma-separated |
| `'pwd'` | Password | Marks as sensitive |

## Filter System

**Files**: `filter/Filter.ts`, `filter/FieldFilter.ts`, `filter/CompoundFilter.ts`, `filter/FunctionFilter.ts`

Composable, immutable filter architecture with JSON serialization support.

### FieldFilter

Compares field values against candidate values:

```typescript
import {FieldFilter} from '@xh/hoist/data';

// Equality
{field: 'status', op: '=', value: 'active'}
{field: 'status', op: '!=', value: 'deleted'}

// Comparison (return false for null values)
{field: 'salary', op: '>=', value: 50000}
{field: 'age', op: '<', value: 65}

// String matching (case-insensitive)
{field: 'name', op: 'like', value: 'smith'}      // Contains
{field: 'name', op: 'begins', value: 'A'}        // Starts with
{field: 'email', op: 'ends', value: '@acme.com'} // Ends with

// Array operations (for array-valued fields)
{field: 'tags', op: 'includes', value: 'urgent'}
{field: 'roles', op: 'excludes', value: 'guest'}
```

#### Multi-Value Matching with Array Values

Certain operators accept an array as their `value`, matching if the field equals *any* of the
supplied values. This is the preferred approach for multi-value matching on a single field
(rather than constructing a compound OR filter):

```typescript
// Match any of these statuses - preferred form
{field: 'status', op: '=', value: ['active', 'pending', 'review']}

// Equivalent but more verbose - avoid
{
    op: 'OR',
    filters: [
        {field: 'status', op: '=', value: 'active'},
        {field: 'status', op: '=', value: 'pending'},
        {field: 'status', op: '=', value: 'review'}
    ]
}

// Also works with other operators
{field: 'department', op: '!=', value: ['HR', 'Legal']}  // Exclude multiple
{field: 'name', op: 'like', value: ['smith', 'jones']}   // Match any substring
```

The operators supporting array values are listed in `FieldFilter.ARRAY_OPERATORS`.

### CompoundFilter

Combines multiple filters with AND/OR logic:

```typescript
import {CompoundFilter} from '@xh/hoist/data';

// AND (all must pass)
{
    op: 'AND',
    filters: [
        {field: 'department', op: '=', value: 'Engineering'},
        {field: 'salary', op: '>=', value: 50000}
    ]
}

// Nested
{
    op: 'AND',
    filters: [
        {field: 'active', op: '=', value: true},
        {
            op: 'OR',
            filters: [
                {field: 'role', op: '=', value: 'admin'},
                {field: 'role', op: '=', value: 'manager'}
            ]
        }
    ]
}
```

### FunctionFilter

Custom filtering via developer-supplied test function:

```typescript
import {FunctionFilter} from '@xh/hoist/data';

// Cannot be serialized - use for dynamic/complex logic
store.setFilter(new FunctionFilter({
    testFn: (record) => record.data.salary > record.data.minSalary
}));
```

### Filter Utilities

```typescript
import {parseFilter, withFilterByField} from '@xh/hoist/data';

// Parse various input formats into Filter instances
const filter = parseFilter({field: 'name', op: 'like', value: 'smith'});
const filter = parseFilter([filter1, filter2]);  // Wraps in AND

// Update filter while preserving other clauses
const newFilter = withFilterByField(existingFilter, newFieldFilter, 'fieldName');
```

## Validation System

**Files**: `validation/Rule.ts`, `validation/constraints.ts`

Comprehensive validation supporting sync/async constraints with multiple severity levels.

### Defining Rules

Rules are defined on Fields and consist of constraints with optional conditions:

```typescript
import {required, numberIs, lengthIs} from '@xh/hoist/data';

const store = new Store({
    fields: [
        {
            name: 'email',
            type: 'string',
            rules: [required, validEmail]
        },
        {
            name: 'salary',
            type: 'number',
            rules: [
                required,
                numberIs({min: 0, max: 10000000})
            ]
        },
        {
            name: 'notes',
            type: 'string',
            rules: [
                lengthIs({max: 1000})
            ]
        },
        {
            name: 'bonus',
            type: 'number',
            rules: [
                // Conditional rule - only validate when salary exists
                {
                    when: (field, values) => values.salary > 0,
                    check: numberIs({min: 0})
                }
            ]
        }
    ]
});
```

### Built-in Constraints

| Constraint | Description |
|------------|-------------|
| `required` | Non-null, non-empty value |
| `validEmail` | Valid email format |
| `validEmails(opts?)` | Multiple semicolon-separated emails |
| `lengthIs({min?, max?})` | String length bounds |
| `numberIs({min?, max?, gt?, lt?, notZero?})` | Numeric constraints |
| `dateIs({min?, max?, fmt?})` | Date range (supports 'now', 'today') |
| `stringExcludes(...vals)` | Disallow specific substrings |
| `isValidJson` | Valid JSON format |
| `constrainAll(constraint)` | Apply constraint to each array element |

### Custom Constraints

Constraints are functions receiving `(fieldState, allValues)` and returning null (valid) or an
error message/result:

```typescript
// Simple constraint - first arg provides field state
const positiveNumber = ({value}) =>
    value < 0 ? 'Must be positive' : null;

// Cross-field validation - second arg provides all record values
const endDateAfterStart = ({value}, allValues) => {
    const {startDate} = allValues;
    if (startDate && value && value < startDate) {
        return 'End date must be after start date';
    }
    return null;
};

// Conditional requirement based on another field
const requireIfActive = ({value}, allValues) => {
    if (allValues.status === 'active' && !value) {
        return 'Required when status is active';
    }
    return null;
};

// Async constraint (e.g., server-side validation)
const uniqueEmail = async ({value}) => {
    const exists = await XH.fetchJson({url: 'api/checkEmail', params: {email: value}});
    return exists ? 'Email already in use' : null;
};
```

### Validation Severity Levels

Constraints can return results with different severity levels:

| Severity | Effect on `isValid` | Use Case |
|----------|---------------------|----------|
| `'error'` | Marks record invalid | Blocking issues that must be fixed |
| `'warning'` | Record remains valid | Non-blocking concerns worth noting |
| `'info'` | Record remains valid | Informational hints or suggestions |

Only `'error'` severity marks a record as invalid. The `'warning'` and `'info'` severities allow
constraints to provide feedback without blocking form submission or other actions. Associated UI
components (e.g., form fields) can display these lesser severities to relay helpful information
to the end user.

```typescript
// Return a string for error severity (default)
const required = ({value}) => isEmpty(value) ? 'Required' : null;

// Return a ValidationResult for other severities
const warnIfLarge = ({value}) =>
    value > 1000000 ? {severity: 'warning', message: 'Unusually large value'} : null;

const suggestFormat = ({value}) =>
    !value?.includes('-') ? {severity: 'info', message: 'Consider using dashes for readability'} : null;
```

### Validation State

```typescript
// Store-level validation
store.validator.validationState;   // 'Valid' | 'NotValid' | 'Unknown'
store.validator.isValid;           // Boolean
store.validator.errors;            // Map<recordId, Map<field, string[]>>
store.validator.errorCount;        // Total errors

// Record-level validation
record.isValid;
record.errors;                     // Map<field, string[]>
record.validationResults;          // Map<field, ValidationResult[]>
```

## Tree Data

Stores provide full support for hierarchical parent-child data.

### Loading Tree Data

```typescript
const store = new Store({
    fields: ['name', 'type', 'headcount'],
    loadTreeData: true,              // Default
    loadTreeDataFrom: 'children'     // Default property name
});

store.loadData([
    {
        id: 'root',
        name: 'Company',
        type: 'org',
        headcount: 150,
        children: [
            {
                id: 'eng',
                name: 'Engineering',
                type: 'dept',
                headcount: 50,
                children: [
                    {id: 'eng-1', name: 'Alice', type: 'employee', headcount: 1},
                    {id: 'eng-2', name: 'Bob', type: 'employee', headcount: 1}
                ]
            }
        ]
    }
]);
```

### Tree Filtering

```typescript
// Include children when parent matches
store.filterIncludesChildren = true;

// Or set during construction
new Store({
    filterIncludesChildren: true
});
```

### Summary Records

Summary records hold aggregated totals or other derived data, displayed separately from regular
records (e.g., in a grid's pinned footer row).

```typescript
// Option 1: Load summary via second argument to loadData
store.loadData(
    [/* regular records */],
    {id: 'summary', totalSalary: 5000000, avgSalary: 75000}  // Summary data
);

store.summaryRecords;  // Array of summary StoreRecords

// Option 2: Use loadRootAsSummary for nested data structures
const store = new Store({
    loadRootAsSummary: true
});

store.loadData([{
    id: 'summary',
    totalSalary: 5000000,
    children: [/* actual records extracted as store.records */]
}]);
```

**Note:** To display summary records in a Grid, set `showSummary` on the GridModel:

```typescript
const gridModel = new GridModel({
    store,
    showSummary: true,  // or 'top' | 'bottom' for specific placement
    columns: [...]
});
```

See `cmp/grid/GridModel.ts` for details on summary row rendering.

## Cube (Aggregation)

**Files**: `cube/Cube.ts`, `cube/CubeField.ts`, `cube/Query.ts`, `cube/View.ts`

Multi-dimensional aggregation for OLAP-style grouping and analysis.

### Creating a Cube

```typescript
import {Cube} from '@xh/hoist/data';

const cube = new Cube({
    fields: [
        // Dimensions - can be grouped on
        {name: 'region', isDimension: true},
        {name: 'product', isDimension: true},
        {name: 'year', isDimension: true},

        // Measures - aggregated values
        {name: 'revenue', aggregator: 'SUM'},
        {name: 'quantity', aggregator: 'SUM'},
        {name: 'avgPrice', aggregator: 'AVG'}
    ]
});

await cube.loadDataAsync(salesData);
```

### Built-in Aggregators

| Aggregator | Description |
|------------|-------------|
| `'SUM'` | Total of non-null values |
| `'SUM_STRICT'` | Total only if all non-null |
| `'AVG'` | Average of non-null values |
| `'AVG_STRICT'` | Average only if all non-null |
| `'MIN'` | Minimum value |
| `'MAX'` | Maximum value |
| `'UNIQUE'` | Count of unique values |
| `'LEAF_COUNT'` | Count of leaf records |
| `'CHILD_COUNT'` | Count of immediate children |

### Querying and Accessing View Data

```typescript
// Create a view with specific groupings
const view = cube.createView({
    query: {
        cube,
        dimensions: ['region', 'product'],
        filter: {field: 'year', op: '=', value: 2024},
        includeLeaves: false,
        includeRoot: true
    },
    connect: true  // Auto-update when cube data changes
});
```

There are two primary ways to access view data:

**Option 1: Read `view.result` directly**

The observable `ViewResult` contains hierarchical `ViewRowData` objects:

```typescript
// React to view updates
addReaction({
    track: () => view.result,
    run: (result) => {
        const {rows, leafMap} = result;
        // rows: ViewRowData[] - hierarchical aggregated data
        // leafMap: Map<id, LeafRow> - direct access to leaf-level rows
    }
});
```

**Option 2: Connect stores for automatic loading**

Provide one or more stores that the view will automatically populate:

```typescript
const store = new Store({fields: [...]});

const view = cube.createView({
    query: {...},
    stores: store,   // View auto-loads data into this store
    connect: true
});

// Store now receives updates automatically
gridModel.store === store;  // Use with GridModel
```

**Update triggers:** View data updates when either:
- The underlying Cube data changes (requires `connect: true`)
- The `view.query` is modified via `view.updateQuery()`

## Integration with GridModel

Stores are the primary data source for GridModel:

```typescript
import {GridModel} from '@xh/hoist/cmp/grid';
import {numberEditor} from '@xh/hoist/desktop/cmp/grid';

const gridModel = new GridModel({
    // Inline store config
    store: {
        fields: [
            {name: 'name', type: 'string'},
            {name: 'salary', type: 'number', rules: [required]}
        ]
    },
    columns: [
        {field: 'name', flex: 1},
        {field: 'salary', width: 120, editable: true, editor: numberEditor()}
    ]
});

// Load data through GridModel (delegates to store)
gridModel.loadData(data);

// Access store directly
gridModel.store.records;
gridModel.store.setFilter({field: 'salary', op: '>', value: 50000});
```

## Common Patterns

### StoreRecord Reuse for Grid Stability

StoreRecords are immutable - their `data` property is frozen by default. When `loadData()` is
called, Store performs a **fieldwise comparison** of new data against existing records with the
same ID. If data is unchanged, the existing `StoreRecord` instance is preserved:

```typescript
// First load
store.loadData([{id: 1, name: 'Alice', salary: 50000}]);
const record1 = store.getById(1);

// Second load - data unchanged, record instance reused
store.loadData([{id: 1, name: 'Alice', salary: 50000}]);
const record2 = store.getById(1);
record1 === record2;  // true - same instance preserved

// Third load - data changed, new record created
store.loadData([{id: 1, name: 'Alice', salary: 55000}]);
const record3 = store.getById(1);
record1 === record3;  // false - new instance with updated data
```

This preserves ag-Grid row state (expansion, selection) for unchanged records across data refreshes.

**Optimization with `reuseRecords`:** For large datasets with immutable raw data objects, set
`reuseRecords: true` to skip the fieldwise comparison. Records are reused when the raw data
object itself is reference-identical, avoiding equality checks and record creation overhead:

```typescript
const store = new Store({
    reuseRecords: true  // Use raw data identity instead of fieldwise comparison
});
```

### Processing Raw Data with `processRawData`

Transform data before it enters the Store:

```typescript
const store = new Store({
    fields: ['fullName', 'salary'],
    processRawData: raw => ({
        ...raw,
        fullName: `${raw.firstName} ${raw.lastName}`,
        salary: raw.salary / 100  // Convert cents to dollars
    })
});
```

### Composite or Alternate IDs with `idSpec`

For records without a single ID field, use a function to derive the ID:

```typescript
const store = new Store({
    fields: ['region', 'product', 'year', 'revenue'],
    idSpec: data => `${data.region}-${data.product}-${data.year}`
});
```

A field other than `id` can also be read from the source data when loading records. Note that the
value for this property must be unique across all data elements, and that it will still be installed
as `StoreRecord.id` on the constructed records.

```typescript
const store = new Store({
    fields: ['region', 'product', 'year', 'revenue'],
    idSpec: 'productUUID'
});
```

## Common Pitfalls

### Defining 'id' as a Field

The `id` property is a top-level property of `StoreRecord`, not a field. Don't include it in your
fields configuration:

```typescript
// ❌ Wrong: id is not a field
const store = new Store({
    fields: [
        {name: 'id'},
        {name: 'name'},
        {name: 'salary'}
    ]
});

// ✅ Correct: Only define actual data fields
const store = new Store({
    fields: [
        {name: 'name'},
        {name: 'salary'}
    ]
});
// Record IDs are derived from the 'id' property in raw data by default (idSpec: 'id')
```

### Forgetting to Include ID in Added Records

Records added via `addRecords()` must include an ID in the raw data:

```typescript
// ❌ Wrong: Missing ID
store.addRecords([{name: 'New Employee'}]);

// ✅ Correct: Generate ID
store.addRecords([{id: XH.genId(), name: 'New Employee'}]);
```

### Mutating Record Data Directly

Record data should be modified through Store APIs, not direct mutation:

```typescript
// ❌ Wrong: Direct mutation bypasses tracking
record.data.salary = 100000;

// ✅ Correct: Use Store API
store.modifyRecords([{id: record.id, salary: 100000}]);
```

### FunctionFilter Cannot Be Persisted

FunctionFilters work fine for runtime filtering but cannot be serialized. This becomes a problem
when the filter needs to be persisted (e.g., via `@persist`):

```typescript
class MyModel extends HoistModel {
    // ❌ Problem: FunctionFilter cannot be serialized for persistence
    @persist
    @observable.ref
    filter: Filter = new FunctionFilter({testFn: r => r.data.custom > 0});

    // ✅ Correct: FieldFilter/CompoundFilter are serializable
    @persist
    @observable.ref
    filter: Filter = parseFilter({field: 'custom', op: '>', value: 0});
}
```

## Related Packages

- [`/core/`](../core/README.md) - HoistModel, HoistBase - base classes Store extends
- [`/cmp/grid/`](../cmp/grid/README.md) - GridModel consumes Store for data display
- [`/cmp/form/`](../cmp/form/README.md) - FormModel uses similar Field and validation patterns
- `/cmp/filter/` - UI components for filter construction
- `/cmp/grouping/` - GroupingChooser for specifying multi-level dimension groupings
