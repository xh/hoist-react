# Filter Components

## Overview

The `/cmp/filter/` package provides cross-platform models for building filter UIs that bind to
Hoist's filter system. These models work with the immutable `Filter` classes in `/data/filter/` but
add mutable state management, persistence, favorites, and bi-directional binding to filter targets
(Stores, Cube Views).

Two complementary approaches are provided:

- **FilterChooser** — A compact, typeahead-style input for quick filter construction. Users type
  field names and values into an OmniBox-style control that parses input into structured filters.
  Best for experienced users who know their data fields and want fast, keyboard-driven filtering.

- **FilterBuilder** — A visual query builder panel for constructing filters of arbitrary complexity.
  Supports nested AND/OR groups with NOT negation, type-appropriate value editors, and an explicit
  Apply/Cancel workflow. Best for complex filter construction and users who prefer a guided,
  visual interface.

Both components bind to the same `FilterBindTarget` interface and can be used together on the same
Store — changes in one are automatically reflected in the other via MobX reactions.

## FilterChooserModel

`FilterChooserModel` powers the FilterChooser component — a tokenized input field where users build
filters by typing field names, operators, and values. The model parses free-text input into
structured `FieldFilter` and `CompoundFilter` instances.

### Basic Usage

```typescript
import {FilterChooserModel} from '@xh/hoist/cmp/filter';

const filterChooserModel = new FilterChooserModel({
    bind: store,
    fieldSpecs: [
        'company',
        'city',
        'trade_date',
        {field: 'profit_loss', valueRenderer: numberRenderer({precision: 0})},
        {field: 'trade_volume', valueRenderer: millionsRenderer({precision: 1, label: true})}
    ]
});
```

### Key Configuration

| Property | Type | Description |
|----------|------|-------------|
| `bind` | `FilterBindTarget` | Store or Cube View to filter. Bi-directional binding. |
| `valueSource` | `FilterValueSource` | Source for field metadata and value suggestions. Defaults to `bind`. |
| `fieldSpecs` | `(string \| FilterChooserFieldSpecConfig)[]` | Fields available for filtering. Strings are resolved against `valueSource`. |
| `persistWith` | `PersistOptions` | Persist filter value and/or favorites to localStorage, Preferences, etc. |
| `initialValue` | `FilterLike` | Starting filter value. |
| `maxResults` | `number` | Max typeahead suggestions shown. Default 10. |
| `sortBy` | `string \| Function` | Sort order for value suggestions. |

### Favorites

FilterChooserModel supports saving and loading favorite filters — named filter configurations that
users can quickly recall. Enable via `persistWith` with `persistFavorites: true`.

### Platform Components

- **Desktop**: `filterChooser` in `@xh/hoist/desktop/cmp/filter`
- **Mobile**: `filterChooser` in `@xh/hoist/mobile/cmp/filter`

## FilterBuilderModel

`FilterBuilderModel` powers the FilterBuilder component — a visual query builder for constructing
filters with nested groups, multiple operators, and type-appropriate value editors. It maintains a
mutable working tree of filter nodes that can be committed to a bound target.

### Basic Usage

```typescript
import {FilterBuilderModel} from '@xh/hoist/cmp/filter';

const filterBuilderModel = new FilterBuilderModel({
    bind: store,
    fieldSpecs: [
        'active',
        'company',
        'city',
        'trade_date',
        {field: 'profit_loss'},
        {field: 'trade_volume'}
    ]
});
```

### Key Configuration

| Property | Type | Description |
|----------|------|-------------|
| `bind` | `FilterBindTarget` | Store or Cube View to filter. Bi-directional binding. |
| `valueSource` | `FilterValueSource` | Source for field metadata and value suggestions. Defaults to `bind`. |
| `fieldSpecs` | `(string \| FilterBuilderFieldSpecConfig)[]` | Fields available for filtering. Strings are resolved against `valueSource`. |
| `commitOnChange` | `boolean` | When `true`, edits sync immediately. When `false` (default), requires explicit `apply()`. |
| `maxGroupDepth` | `number` | Maximum nesting depth for filter groups. Default 3. |
| `persistWith` | `FilterBuilderPersistOptions` | Persist value and/or favorites. Supports split stores for each. |
| `initialValue` | `FilterLike` | Starting filter value. |
| `initialFavorites` | `FilterLike[]` | Starting favorites list. |

### Working Tree Architecture

FilterBuilderModel maintains a mutable tree of observable nodes representing the user's in-progress
filter. This tree is separate from the immutable `Filter` objects used by the rest of the system:

- **FilterGroupNode** — Represents an AND/OR group with optional NOT negation. Contains child
  rules and nested groups.
- **FilterRuleNode** — Represents a single field/operator/value filter condition.

The `value` computed property converts the working tree to an immutable `Filter` on demand.
The `apply()` method commits this value to the bound target.

### Apply/Cancel Workflow

When `commitOnChange` is `false` (the default), the FilterBuilder shows Apply and Cancel buttons:

- **Apply** commits the working tree to the bound target
- **Cancel** reverts the working tree to the last committed state
- **Clear** removes all rules and groups (auto-applies when `commitOnChange` is `true`)

The `isDirty` computed tracks whether the working tree differs from the committed value.

### Favorites

FilterBuilderModel supports the same favorites pattern as FilterChooserModel. Enable via
`persistWith` with `persistFavorites: true`:

```typescript
const filterBuilderModel = new FilterBuilderModel({
    bind: store,
    fieldSpecs: ['company', 'city', 'trade_date'],
    persistWith: {
        localStorageKey: 'myAppFilterBuilder',
        persistFavorites: true
    }
});
```

### Bi-directional Binding

When both a FilterBuilder and FilterChooser are bound to the same Store, they stay in sync
automatically. Changes applied by one are reflected in the other via MobX reactions on the shared
`FilterBindTarget.filter` property. No special interop code is needed.

Note: When `commitOnChange` is `false` and the FilterBuilder has uncommitted edits, inbound changes
from the bound target are ignored (with a console warning) to avoid overwriting the user's work.

### Platform Components

- **Desktop**: `filterBuilder` in `@xh/hoist/desktop/cmp/filter`
- **Mobile**: Not yet available (planned).

## FilterBuilderFieldSpec

Extends `FilterFieldSpec` with builder-specific configuration. Apps do not instantiate this class
directly — it is created internally by `FilterBuilderModel` from the `fieldSpecs` config.

| Property | Type | Description |
|----------|------|-------------|
| `defaultOperator` | `FieldFilterOperator` | Pre-selected operator for new rules. Defaults to first available op. |

Inherits all base `FilterFieldSpec` properties including `field`, `fieldType`, `ops`,
`enableValues`, and `values`.

## Using FilterBuilder and FilterChooser Together

A common pattern places a FilterBuilder panel alongside a Grid, with a FilterChooser in a toolbar
for quick access — all bound to the same Store:

```typescript
class MyPanelModel extends HoistModel {
    @managed gridModel = new GridModel({
        store: {fields: ['company', 'city', 'profit_loss']},
        columns: [companyCol, cityCol, profitLossCol],
        colDefaults: {filterable: true}
    });

    @managed filterBuilderModel = new FilterBuilderModel({
        bind: this.gridModel.store,
        fieldSpecs: ['company', 'city', {field: 'profit_loss'}]
    });

    @managed filterChooserModel = new FilterChooserModel({
        bind: this.gridModel.store,
        fieldSpecs: ['company', 'city', {field: 'profit_loss'}]
    });
}
```

## Related

- [`/data/filter/`](../../data/README.md) — Immutable Filter classes (FieldFilter, CompoundFilter,
  FunctionFilter) and the FilterBindTarget interface
- [`/cmp/grid/`](../grid/README.md) — GridModel with built-in column-level filtering via
  GridFilterModel
- [Persistence](../../docs/persistence.md) — How `persistWith` works across localStorage,
  Preferences, and other stores
