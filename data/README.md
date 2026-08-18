# Data Package

| Section | Description |
|---------|-------------|
| [Overview](#overview) | Core classes, architecture diagram |
| [Store](#store) | Creating, loading, filtering, and observing record collections |
| [StoreRecord](#storerecord) | Record state, data access, tree navigation, validation |
| [Field](#field) | Type parsing, display names, descriptions, validation rules |
| [Filter System](#filter-system) | FieldFilter, CompoundFilter, FunctionFilter, and utilities |
| [Validation System](#validation-system) | Rules, constraints, severity levels, async validation |
| [Integration with GridModel](#integration-with-gridmodel) | Inline store config, data loading, and editing |
| [Tree Data](#tree-data) | Hierarchical loading, filtering, and summary records |
| [Cube (Aggregation)](#cube-aggregation) | Pointer to dedicated [`cube/README.md`](cube/README.md) |
| [Performance and Memory](#performance-and-memory) | Record reuse, projections, streaming loads, memory tuning |
| [Diagnostics](#diagnostics) | Per-operation timing and path reporting |
| [Common Patterns](#common-patterns) | processRawData, composite IDs, record queries |
| [Common Pitfalls](#common-pitfalls) | ID fields, data enumeration, mutation, record order |

## Overview

The `/data/` package is Hoist's data management layer - observable, in-memory data containers with
support for hierarchical structures, filtering, validation, and multi-dimensional aggregation.

The core classes are:

| Class | Purpose |
|-------|---------|
| **Store** | Observable collection of records with filtering, selection, and modification tracking |
| **StoreRecord** | Individual record wrapper with state tracking, validation, and tree navigation |
| **Field** | Metadata descriptor defining type parsing, defaults, and validation rules |
| **Cube** | Multi-dimensional aggregation engine for OLAP-style grouping and analysis |
| **View** | Query result from a Cube - hierarchical, auto-updating aggregated data |

Store, StoreRecord, and Field appear in virtually every Hoist application. Cube and View support
advanced analytics use cases, where the app groups and aggregates data dynamically.

The package also includes:

- **Filter system** - Composable, immutable filters with JSON serialization
- **Validation system** - Synchronous and async constraints with multiple severity levels
- **UrlStore** - A `Store` subclass that loads its own data from a URL
- **RecordAction** - Shared config for grid context menus and action columns
- **StoreSelectionModel** - Observable record selection, typically created and held by `GridModel`

## Architecture

```
Store                                    Cube
├── fields: Field[]                      ├── fields: CubeField[]
├── records: StoreRecord[]               ├── store: Store (source data)
├── rootRecords: StoreRecord[]           └── views: View[]
├── summaryRecords: StoreRecord[]
├── filter: Filter                       View
├── validator: StoreValidator            ├── query: Query (dimensions, filters)
└── diagnostics: StoreDiagnostics        ├── result: ViewResult (observable output)
                                         └── stores: Store[] (connected for auto-loading)
StoreRecord
├── id: StoreRecordId
├── data: PlainObject            // Current field values - read by field name only
├── committedData: PlainObject   // Last committed state
├── digest: RecordDigest         // Snapshot used to detect unchanged raw data
├── parent / children            // Tree navigation
└── validationState              // Per-record validation

Field                                    CubeField extends Field
├── name: string                         ├── aggregator: Aggregator
├── type: FieldType                      ├── isLeafDimension: boolean
├── isDimension: boolean                 └── parentDimension: string
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

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `fields` | `Array<string \| FieldSpec \| Field>` | - | Schema definition |
| `fieldDefaults` | `Omit<FieldSpec, 'name'>` | - | Defaults applied to all fields |
| `idSpec` | `string \| Function` | `'id'` | Property name or function to derive record IDs |
| `data` | `PlainObject[]` | - | Initial data to load |
| `processRawData` | `(raw) => PlainObject` | - | Transform raw data before parsing |
| `filter` | `FilterLike` | - | Initial filter |
| `filterIncludesChildren` | `boolean` | `false` | Include children when parent passes filter |
| `loadTreeData` | `boolean` | `true` | Enable hierarchical loading |
| `loadTreeDataFrom` | `string` | `'children'` | Property containing child records |
| `loadRootAsSummary` | `boolean` | `false` | Treat root node as summary record |
| `freezeData` | `boolean` | `true` | Freeze record data objects for immutability (set false as a performance optimization) |
| `reuseRecords` | `boolean \| string \| fn` | `null` | Reuse records when raw data yields an unchanged digest (performance) |
| `retainRaw` | `boolean` | `true` | Retain raw data reference on each record (set false to reduce memory) |
| `projectionOnly` | `boolean` | `null` | Read-only projection of data parsed elsewhere - adopts raw objects as record `data`. Recommended for View-connected stores |
| `idEncodesTreePath` | `boolean` | `false` | IDs imply a fixed tree position (performance). Not supported on View-connected stores |
| `validationIsComplex` | `boolean` | `false` | Validate all uncommitted records on every change |
| `experimental` | `PlainObject` | `{}` | Flags for experimental features - see [Performance and Memory](#performance-and-memory) |

`Store.defaults` exposes `freezeData` for an app-wide override. See `StoreDefaults` for details.

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

**`updateData(rawData | transaction)`** - Transactional updates that preserve local modifications:

```typescript
// Simple array form - adds or updates based on ID match
store.updateData([
    {id: 1, salary: 110000}  // Updates existing
]);

// Transaction form - explicit control
store.updateData({
    update: [{id: 1, salary: 110000}],
    add: [{id: 3, name: 'Carol', salary: 95000}],
    remove: [2],
    rawSummaryData: {id: 'summary', totalSalary: 5200000}
});
```

`updateData()` returns a `StoreChangeLog` reporting the changes it actually applied, or null if it
made none. Note that `remove` holds the removed `StoreRecord`s, not their ids - a removed record is
no longer resolvable against the Store. Read `record.id` where you need ids. `modifyRecords()`
returns a `StoreChangeLog` in the same form.

```typescript
const changes = store.updateData(rawData);
if (changes) {
    console.log(changes.add.length, changes.update.length, changes.remove.length);
}
```

**`loadDataAsync(rawData)`** - Streaming counterpart to `loadData()`. It accepts a sync or async
iterable that yields raw records, and creates records incrementally without buffering the complete
raw dataset in memory. Use it for very large datasets streamed from the server. Pair it with
`XH.fetchNdjson()` for NDJSON:

```typescript
await store.loadDataAsync(XH.fetchNdjson({url: 'myRows'}).lines);
```

The Store updates in a single transaction once the source completes, and remains unchanged if the
source throws. Stores with `loadRootAsSummary` cannot stream, as such payloads nest all rows within
a single root node.

This method does not accept summary data, because an aggregate cannot precede its stream. Install a
summary afterwards via `updateData({rawSummaryData})`.

### Record Order

Order is not a guaranteed property of a Store. Loads are free to preserve the positions of
incumbent records, so a payload that differs from the current dataset only in its ordering
processes as a no-op. Apply an explicit sort wherever deterministic order matters - a grid sort, or
a sort on an ordinal field supplied with the source data.

### Local Modifications

Stores track uncommitted changes separately from server-sourced data:

```typescript
// Add new records - data must include a literal id, as addRecords() skips idSpec
store.addRecords([{id: XH.genId(), name: 'New Employee'}]);

// Modify field values on existing records
store.modifyRecords([{id: 1, salary: 120000}]);

// Remove records
store.removeRecords([recordOrId]);

// Query modification state
store.isDirty;             // Any uncommitted changes?
store.addedRecords;        // Records added locally
store.removedRecords;      // Records removed locally
store.dirtyRecords;        // Records modified locally
store.modifiedRecords;     // Alias for dirtyRecords
store.committedRecords;    // Records as originally loaded

// Revert
store.revertRecords([1, 2]);  // Discard changes to specific records
store.revert();               // Discard all local changes
```

There is no explicit commit call. Records become committed when the server or other source of record
sends them back through `loadData()` or `updateData()`. A typical flush posts
`record.getModifiedValues()` to the server, then loads the server response.

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

// Re-run the current filter after external state it depends on has changed
store.refreshFilter();

// Access filtered vs unfiltered data
store.records;       // Filtered records
store.allRecords;    // All records (ignores filter)
store.count;         // Filtered record count
store.allCount;      // Total record count
```

Store re-filters automatically whenever record data changes. Call `refreshFilter()` only when the
state behind a `FunctionFilter` changes without any change to the records themselves.

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
store.maxDepth             // Deepest nesting level
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
record.data;                // Current field values - read by field name only
record.committedData;       // Last committed state
record.raw;                 // Original raw data (null if retainRaw: false, or a local add)
record.digest;              // Digest snapshotted for reuseRecords, if configured

// State predicates
record.isAdd;               // Never committed (new record)
record.isDirty;             // Has uncommitted changes
record.isModified;          // Alias for isDirty
record.isCommitted;         // No local modifications

// Field access
record.get('salary');                // Single field value
record.getValues();                  // All field values (with defaults)
record.getModifiedValues();          // Only changed fields, plus id (null if none)
record.matchesData({salary: 120000}) // Test against a partial data object
```

### Reading `data`

Read `record.data` by field name only. Store optimizes its internal layout for memory and varies it
per record, so `Object.keys()`, object spread, and `JSON.stringify()` do not reliably see every
field. Call `getValues()` to enumerate all field values, or `getModifiedValues()` to read
locally-modified values only. See
[Tuning Memory for Large Datasets](#tuning-memory-for-large-datasets) for the reason behind this.

```typescript
// ❌ Wrong: enumeration can miss fields that hold their default value
const clone = {...record.data};
const json = JSON.stringify(record.data);

// ✅ Correct: getValues() carries an own property for every declared Field
const clone = record.getValues();
const json = JSON.stringify(record.getValues());
```

### Tree Navigation

For hierarchical data, records support navigation without direct object references:

```typescript
record.parentId;            // Parent record ID
record.parent;              // Parent StoreRecord
record.children;            // Direct children (filtered)
record.allChildren;         // Direct children (unfiltered)
record.descendants;         // All descendants (filtered)
record.allDescendants;      // All descendants (unfiltered)
record.ancestors;           // All ancestors (filtered)
record.allAncestors;        // All ancestors (unfiltered)
record.depth;               // Nesting level (0 for roots)
record.treePath;            // Array of ancestor IDs, ending with this record's own

// Iteration variants, to avoid allocating intermediate arrays
record.forEachChild(fn);
record.forEachDescendant(fn);
record.forEachAncestor(fn);
```

### Validation Access

```typescript
record.validationState;     // 'Valid' | 'NotValid' | 'Unknown'
record.isValid;             // Boolean shortcut
record.isNotValid;          // Boolean shortcut
record.errors;              // Field name → error messages
record.errorCount;          // Total error count
record.allErrors;           // Flat array of all error messages
record.validationResults;   // Field name → ValidationResult[]
record.isValidationPending; // Async validation in progress?
```

## Field

**File**: `Field.ts`

Metadata descriptor defining type parsing, defaults, display names, descriptions, and validation
rules. The `displayName` and `description` properties flow from `Field` to `Column` automatically,
providing defaults for grid headers, tooltips, and chooser descriptions. A `GroupingChooserModel`
bound to a GridModel or View offers every field with `isDimension: true` for selection.

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

        {name: 'department', type: 'string', isDimension: true},
        {name: 'hireDate', type: 'localDate'},

        // Opt in to DOMPurify escaping of incoming string values
        {name: 'comment', type: 'string', enableXssProtection: true}
    ]
});
```

Hoist disables XSS protection by default, in keeping with its primary use case of secured internal
apps with large datasets. Set `enableXssProtection` per field, or app-wide via
`AppSpec.enableXssProtection`, for apps that display content from untrusted sources.

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

// Negated string matching
{field: 'name', op: 'not like', value: 'test'}
{field: 'code', op: 'not begins', value: 'TMP'}
{field: 'file', op: 'not ends', value: '.bak'}

// Array operations (for array-valued fields)
{field: 'tags', op: 'includes', value: 'urgent'}
{field: 'roles', op: 'excludes', value: 'guest'}
```

`FieldFilter.OPERATORS` lists every supported operator. Hoist logs a console warning when a filter
names a field the target Store does not declare.

#### Multi-Value Matching with Array Values

Certain operators accept an array as their `value`, and match if the field equals *any* of the
supplied values. Prefer this form for multi-value matching on a single field, rather than a
compound OR filter:

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

`FieldFilter.ARRAY_OPERATORS` lists the operators that support array values. The four range
operators (`>`, `>=`, `<`, `<=`) do not.

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

Custom filtering via a developer-supplied test function:

```typescript
import {FunctionFilter} from '@xh/hoist/data';

// Cannot be serialized - use for dynamic/complex logic
store.setFilter(new FunctionFilter({
    testFn: record => record.data.salary > record.data.minSalary
}));
```

### Filter Utilities

```typescript
import {parseFilter, appendFilter, flattenFilter} from '@xh/hoist/data';

// Parse various input formats into Filter instances
const fieldFilter = parseFilter({field: 'name', op: 'like', value: 'smith'});
const andFilter = parseFilter([filter1, filter2]);  // Wraps in AND

// Collect the leaf filters within a (possibly nested) CompoundFilter
const leaves = flattenFilter(andFilter);
```

#### Instance Methods for Filter Transformation

Every `Filter` subclass offers instance methods that return a new `Filter | null` with matching
filters removed. These methods traverse CompoundFilters recursively. Each method accepts an optional
argument to target a specific field or key, and removes all matching filters when called without
one.

```typescript
// Remove FieldFilters targeting a specific field
const remaining = filter.removeFieldFilters('status');

// Remove ALL FieldFilters (e.g. keep only FunctionFilters)
const remaining = filter.removeFieldFilters();

// Remove a FunctionFilter by key
const remaining = filter.removeFunctionFilters('default');

// Remove ALL FunctionFilters
const remaining = filter.removeFunctionFilters();
```

#### Combining Filters with `appendFilter()`

`appendFilter()` combines a source filter with one or more additions via AND. If the source is
already an AND CompoundFilter, it flattens the additions into that filter's children rather than
nesting them.

```typescript
// Replace FieldFilters on one field, keep everything else
const updated = appendFilter(filter?.removeFieldFilters('status'), newStatusFilter);

// Replace all FieldFilters, preserving FunctionFilters
const updated = appendFilter(filter?.removeFieldFilters(), newFieldFilters);

// Append multiple additions at once
const updated = appendFilter(filter, addition1, addition2);

// Handles null gracefully
appendFilter(null, newFilter)          // → newFilter
appendFilter(existingFilter, null)     // → existingFilter
appendFilter(null, null)               // → null
```

## Validation System

**Files**: `validation/Rule.ts`, `validation/constraints.ts`

Validation with sync and async constraints, at three severity levels.

### Defining Rules

Rules live on Fields and consist of constraints with optional conditions:

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

Constraints other than `required` pass null and empty values. Pair a constraint with `required`
where a value must be present.

### Custom Constraints

Constraints are functions that receive `(fieldState, allValues)` and return null (valid) or an
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

// Async constraint (e.g. server-side validation)
const uniqueEmail = async ({value}) => {
    const exists = await XH.fetchJson({url: 'api/checkEmail', params: {email: value}});
    return exists ? 'Email already in use' : null;
};
```

### Validation Severity Levels

Constraints can return results with different severity levels:

| Severity | Effect on `isValid` | Use Case |
|----------|---------------------|----------|
| `'error'` | Marks record invalid | Blocking issues the user must fix |
| `'warning'` | Record remains valid | Non-blocking concerns worth noting |
| `'info'` | Record remains valid | Informational hints or suggestions |

Only `'error'` severity marks a record as invalid. The `'warning'` and `'info'` severities let
constraints give feedback without blocking form submission or other actions. Associated UI
components (e.g. form fields) can display these lesser severities to relay helpful information to
the end user.

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
store.validator.errors;            // Record id → (field name → string[])
store.validator.errorCount;        // Total errors
store.validator.isPending;         // Async validation in progress?
await store.validateAsync();       // Recompute all, resolve to true if valid

// Record-level validation
record.isValid;
record.errors;                     // Field name → string[]
record.validationResults;          // Field name → ValidationResult[]
```

By default, Store validates only the records affected by a change. Set `validationIsComplex: true`
to validate every uncommitted record on every add, modify, or remove. Use this where a rule on one
record depends on the values of another.

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

`GridModel` also owns the `StoreSelectionModel` for its store, available as `gridModel.selModel` and
configured via the `selModel` config on `GridConfig`.

## Tree Data

Stores fully support hierarchical parent-child data.

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

Note that updates cannot move a record between parents. To restructure a hierarchy, load the new
shape via `loadData()`.

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
records (e.g. in a grid's pinned footer row).

```typescript
// Option 1: Load summary via second argument to loadData
store.loadData(
    [/* regular records */],
    {id: 'summary', totalSalary: 5000000, avgSalary: 75000}  // Summary data
);

store.summaryRecords;  // Array of summary StoreRecords
store.summaryRecord;   // Convenience getter for the single-summary case

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

Client-side OLAP-style aggregation for multi-dimensional grouping and analysis. The Cube subsystem
has its own dedicated documentation. See the [Cube package README](cube/README.md) for full coverage
of creating Cubes, aggregators, querying with Views, accessing results, and the recommended
configuration for View-connected Stores.

Two points matter most to app code that reads View output:

- Leaf rows carry the id of their source cube record. Aggregate and bucket row ids encode the row's
  dimension path.
- `View.result.leafMap` is null unless the `Query` sets `includeLeaves` or `provideLeaves`. Read the
  leaves behind a row with the exported `getCubeLeaves()` helper.

## Performance and Memory

Store and Cube `View` optimize memory and update cost automatically, with no app configuration. The
sections below cover the further opt-in configs, and the behavior each one assumes of its data
source.

### StoreRecord Reuse for Grid Stability

StoreRecords are immutable - Store freezes their `data` property by default. On `loadData()`, Store
compares new data fieldwise against the existing record with the same ID. If every field matches,
Store preserves the existing `StoreRecord` instance:

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
A `loadData()` call that changes nothing at all preserves the Store's record collections outright,
and skips all downstream work.

### Digest-Based Reuse with `reuseRecords`

For large datasets whose provider can cheaply identify unchanged records, set `reuseRecords` to
derive a *digest* from each incoming raw object. Store snapshots that digest on the record it
builds, and reuses the record whenever a later raw object for the same id yields an equal digest.
Each hit skips raw data processing, parsing, and record creation.

```typescript
const store = new Store({
    reuseRecords: true  // reuse on raw object identity - requires stable, immutable raws
});

const store = new Store({
    reuseRecords: 'lastUpdated' // digest is a raw property, e.g. a server-provided stamp
});

const store = new Store({
    reuseRecords: raw => raw.type + '|' + raw.seq // or derived - primitive values only
});
```

Digests must be primitives, compared via `===`. A null digest never matches. Build composite keys as
strings.

This config applies to `updateData()` as well, where Store drops an unchanged-digest update as a
no-op and so preserves any uncommitted local modifications on that record. An update with a changed
digest builds a new record and overwrites local modifications, as updates always do. `loadData()`
misses still fall back to the standard fieldwise comparison.

Do not combine `reuseRecords` with a `processRawData` function that depends on external state, as
Store bypasses that function for reused records.

Stores connected to a Cube `View` must leave this config unset. The View installs a digest that
reads a stamp it maintains on every row it publishes, and throws on connection if the app set an
explicit value. `CubeConfig.store` exposes the same config on the Cube's own internal store, where a
source that supplies per-row digests can preserve record identity across full reloads.

### Read-Only Projections with `projectionOnly`

Set `projectionOnly: true` to mark a store as a read-only projection of data that its provider
parses and owns. Store then uses each incoming raw object *as* its record's `data`, by reference.
This collapses the usual two objects per row to one, and skips the per-row parse on every load and
update.

Use this config for stores connected to a Cube `View`, or fed by an endpoint that returns data in
its final client-side form. A View logs a warning when a connected store leaves the config unset.
Set it explicitly to `false` to opt out and silence that warning.

```typescript
const store = new Store({
    fields: [...],
    projectionOnly: true
});

const view = cube.createView({
    query: {dimensions: ['region', 'product']},
    stores: store,
    connect: true
});
```

This mode carries real constraints:

- Raw data must already match what the Store's Fields would parse. Store applies neither `type`,
  `parseVal`, nor `defaultValue`.
- Store never modifies or freezes these objects, whatever the `freezeData` setting. A provider may
  mutate rows in place, but must then publish via `updateData()`. `loadData()` skips
  reference-equal objects as unchanged.
- `data` carries every key on the raw object, not only declared Fields. Only declared Field values
  take part in the equality checks that detect unchanged records.
- The local modification APIs (`addRecords`, `modifyRecords`, `removeRecords`, `revertRecords`, and
  `revert`) throw.
- Not compatible with `processRawData`.

### Streaming Loads

`Store.loadDataAsync()` accepts a sync or async iterable of raw records and creates records
incrementally, without buffering the complete raw dataset in memory. `XH.fetchNdjson()` is its
natural source. `Cube.loadDataAsync()` accepts a streaming source too. See
[Data Loading](#data-loading) above.

### Tuning Memory for Large Datasets

For stores holding tens of thousands of records or more, two independent knobs reduce retained
memory. They stack, and both are opt-in:

| Knob | What it does | When to use |
|------|--------------|-------------|
| `retainRaw: false` | Drops each record's reference to its raw source object once parsed | Your app never reads `StoreRecord.raw`. Incompatible with `reuseRecords: true`, which needs the raw for its identity check |
| `internStrings` (a `FetchOptions` config) | Deduplicates repeated string values within a response, and optionally across refetches of the same dataset | Your data repeats many string values (categories, statuses, names) |

Store builds record `data` objects for memory efficiency out of the box, and picks a representation
per record. Sparsely-populated records carry own properties only for fields that hold non-default
values, and reach their defaults through a shared prototype. Store clones densely-populated records
from a shared per-Store template that carries every declared field. Both forms stay in V8's compact
"fast properties" mode.

Wide objects built instead by per-field property adds would fall back to a per-object hashtable past
roughly 20 adds, at several times the memory per record.

One consequence deserves attention: `Object.keys()`, spread, and `JSON.stringify()` see own
properties only, which vary with each record's density. Call `record.getValues()` or
`record.getModifiedValues()` instead of enumerating `data` directly.

The `experimental.denseRecordThreshold` config governs the crossover between the two forms. It
exists for testing and tuning only. Set it above the field count of any record to force the sparse
form throughout.

### Experimental: `PatchableRecordSet`

`PatchableRecordSet` is an experimental, drop-in alternative to Hoist's internal `RecordSet`. It
makes transaction, filtering, and grid-sync costs scale with the size of a change rather than the
size of the store. It holds a shared, never-mutated `base` map plus a small `patch` layer of changed
entries, so a transaction merges at the cost of the patch alone.

```typescript
const store = new Store({
    fields: [...],
    experimental: {patchableRecordSet: true}
});
```

Enable it app-wide with the `xhStoreExperimental` soft-config. Note one behavior difference from the
default record set: record order is stable-by-incumbency rather than source-order. Existing records keep their positions
and additions append, including records that enter a filter incrementally. Apply a grid sort where
deterministic order matters. The `experimental.patchRecordsMaxRatio` config caps patch size
relative to the base (default `0.1`). A larger change flattens the record set into a fresh base.

This feature is available for early client access and testing. It is not yet part of the Hoist API.

## Diagnostics

`Store`, Cube `View`, and `GridModel` each expose a `diagnostics` object with one slot per kind of
operation. Each slot reports the work done, the elapsed time, and the path taken.

```typescript
store.diagnostics.load;      // Last load op, plus count and total elapsed ms
store.diagnostics.update;
store.diagnostics.filter;

const {type, add, update, remove, total, elapsed} = store.diagnostics.update.last;
// type: 'patched' | 'flattened' | 'full' | 'unchanged'

store.diagnostics.reset();
```

Diagnostics log at `debug` level by default. Set `diagnostics.logLevel = 'info'` on one instance to
follow that object alone at any `XH.logLevel`.

```typescript
gridModel.store.diagnostics.logLevel = 'info';
gridModel.diagnostics.logLevel = 'info';
```

This API supports app troubleshooting and benchmarking only. It can change without notice at any
release.

## Common Patterns

### Processing Raw Data with `processRawData`

Transform data before it enters the Store:

```typescript
const store = new Store({
    fields: ['fullName', 'salary'],
    processRawData: raw => {
        raw.fullName = `${raw.firstName} ${raw.lastName}`;
        raw.salary = raw.salary / 100; // Convert cents to dollars
        return raw;
    }
});
```

For efficiency, prefer modifying and returning the raw object in place, as above. The raw data is
typically transient, so there is no need to allocate a clone. If the app does cache, share, or
otherwise re-use the raw data, return a modified clone instead. In-place edits are also visible on
`StoreRecord.raw`.

### Composite or Alternate IDs with `idSpec`

For records without a single ID field, use a function to derive the ID:

```typescript
const store = new Store({
    fields: ['region', 'product', 'year', 'revenue'],
    idSpec: data => `${data.region}-${data.product}-${data.year}`
});
```

Store can also read a property other than `id` from the source data. The value must be unique across
all data elements, and Store still installs it as `StoreRecord.id` on the records it constructs.

```typescript
const store = new Store({
    fields: ['region', 'product', 'year', 'revenue'],
    idSpec: 'productUUID'
});
```

### Querying Records

```typescript
store.getById(1);                        // Record, or null
store.getById(1, true);                  // Restrict to post-filter records
store.getChildrenById('eng');            // Children of a record
store.getDescendantsById('eng');
store.getAncestorsById('eng-1');
store.recordIsFiltered(record);          // In the store, but excluded by the filter?
store.getField('salary');                // Field instance by name
store.fieldNames;                        // Names of all declared fields
store.getValuesForFieldFilter('status', filter);  // Candidate values for a filter UI
```

## Common Pitfalls

### Defining 'id' as a Field

The `id` property is a top-level property of `StoreRecord`, not a field. Do not include it in the
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
// Store derives record IDs from the 'id' property in raw data by default (idSpec: 'id')
```

### Forgetting to Include ID in Added Records

Records added via `addRecords()` must include a literal `id` in the raw data. This method does not
run the Store's `idSpec` function:

```typescript
// ❌ Wrong: Missing ID
store.addRecords([{name: 'New Employee'}]);

// ✅ Correct: Generate ID
store.addRecords([{id: XH.genId(), name: 'New Employee'}]);
```

### Enumerating `record.data`

Store optimizes the internal `data` layout for memory and varies it per record, so enumeration does
not reliably see every field:

```typescript
// ❌ Wrong: can silently miss fields holding their default value
const values = {...record.data};

// ✅ Correct: an own property for every declared Field
const values = record.getValues();
```

### Mutating Record Data Directly

Modify record data through Store APIs, not by direct mutation:

```typescript
// ❌ Wrong: Direct mutation bypasses tracking
record.data.salary = 100000;

// ✅ Correct: Use Store API
store.modifyRecords([{id: record.id, salary: 100000}]);
```

### Relying on Record Order

A Store makes no ordering guarantee. Do not read `store.records` positionally, and do not expect a
reload to reorder rows:

```typescript
// ❌ Wrong: assumes the Store preserves source order
const newest = store.records[0];

// ✅ Correct: sort explicitly, e.g. on an ordinal field from the source data
const newest = maxBy(store.records, r => r.data.seq);
```

### Reading Removed Records from a `StoreChangeLog`

`StoreChangeLog.remove` holds the removed `StoreRecord`s, not their ids. Those records are no longer
resolvable against the Store:

```typescript
const {remove} = store.updateData(transaction);

// ❌ Wrong: remove holds records, and getById() cannot resolve them anyway
remove.forEach(id => console.log(store.getById(id).data.name));

// ✅ Correct: read the records directly
remove.forEach(rec => console.log(rec.data.name));
```

### Hoist Cannot Persist a FunctionFilter

FunctionFilters work fine for runtime filtering, but Hoist cannot serialize them. This becomes a
problem when the app must persist the filter (e.g. via `@persist`):

```typescript
class MyModel extends HoistModel {
    // ❌ Problem: Hoist cannot serialize a FunctionFilter for persistence
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
- [`/data/cube/`](cube/README.md) - Cube, View, Query - multi-dimensional aggregation
- [`/cmp/grid/`](../cmp/grid/README.md) - GridModel consumes Store for data display
- [`/cmp/form/`](../cmp/form/README.md) - FormModel uses similar Field and validation patterns
- [`/svc/`](../svc/README.md) - FetchService, including `fetchNdjson()` and `internStrings`
- `/cmp/filter/` - UI components for filter construction
- `/cmp/grouping/` - GroupingChooser for specifying multi-level dimension groupings
