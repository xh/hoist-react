# FilterBuilder — Execution Plan

## Overview

FilterBuilder is a new panel-based Hoist component for constructing filters of arbitrary complexity.
It provides a visual query builder UI as an alternative to FilterChooser's compact OmniBox-style
input, supporting nested AND/OR groups with NOT negation, type-appropriate value editors, and
full integration with Hoist's filter binding, persistence, and favorites systems.

## Key Design Decisions

- **commitOnChange pattern**: When `true`, edits sync immediately to the bound target. When `false`
  (default), changes accumulate in a working tree and the UI shows Apply/Cancel buttons in a bbar.
- **Bi-directional binding**: Binds to a `FilterBindTarget` (Store, Cube View) the same way
  FilterChooser and GridFilterModel do. Multiple filter components on the same target stay in sync
  via MobX reactions — no special interop needed.
- **NOT/negation per group**: Supported from the start. Requires adding `not?: boolean` to
  `CompoundFilter` and `CompoundFilterSpec` (backwards-compatible). Hoist-core work scheduled
  separately.
- **Card component for groups**: Each filter group renders as a collapsible `card` with intent-based
  styling for visual differentiation (AND vs OR, negation).
- **Placeholder for empty state**: Uses Hoist's `placeholder` component.
- **No drag-and-drop in v1**: Up/down shift buttons for reordering. DnD deferred to v2 (separate
  from the DnD library upgrade tracked in #3918).
- **Desktop-only v1**: Cross-platform model in `cmp/`, desktop component in `desktop/cmp/`. Mobile
  variant planned for later.
- **Favorites in bbar**: Favorites menu lives in the bottom toolbar alongside Apply/Cancel/Clear.
- **Toolbox example**: Built incrementally alongside the component for iterative testing and
  refinement via browser.

## File Map

```
data/filter/
├── FilterFieldSpec.ts             RENAMED from BaseFilterFieldSpec.ts
├── CompoundFilter.ts              MODIFIED: add `not` support
├── Types.ts                       MODIFIED: add `not` to CompoundFilterSpec

cmp/filter/
├── FilterBuilderModel.ts          NEW: Core cross-platform model
├── FilterBuilderFieldSpec.ts      NEW: Field spec subclass
├── index.ts                       MODIFIED: add exports
└── impl/
    ├── FilterGroupNode.ts         NEW: Mutable working-tree group node
    └── FilterRuleNode.ts          NEW: Mutable working-tree rule node

desktop/cmp/filter/
├── FilterBuilder.ts               NEW: Desktop component + sub-factories
├── FilterBuilder.scss             NEW: Styles
└── index.ts                       MODIFIED: add exports

../toolbox/client-app/src/
├── desktop/tabs/grids/            (or similar location)
│   ├── FilterBuilderPanel.ts      NEW: Toolbox example page
│   └── FilterBuilderPanelModel.ts NEW: Toolbox example model
└── desktop/AppModel.ts            MODIFIED: register new tab
```

---

## Phase 0: Core Data Model Enhancements

### 0a. Rename BaseFilterFieldSpec → FilterFieldSpec

**Files**: `data/filter/BaseFilterFieldSpec.ts`, `cmp/filter/FilterChooserFieldSpec.ts`,
`cmp/grid/filter/GridFilterFieldSpec.ts`

- Rename file and class. Update the two importing subclasses.
- No public export change needed — `BaseFilterFieldSpec` is not exported from `data/index.ts`.
- This establishes a clean hierarchy name: `FilterFieldSpec` (abstract base) with siblings
  `FilterChooserFieldSpec`, `GridFilterFieldSpec`, and the new `FilterBuilderFieldSpec`.

### 0b. Add `not` support to CompoundFilter

**Files**: `data/filter/CompoundFilter.ts`, `data/filter/Types.ts`

Add `not?: boolean` to `CompoundFilterSpec`:

```typescript
interface CompoundFilterSpec {
    filters: FilterLike[];
    op?: CompoundFilterOperator;
    not?: boolean;  // NEW — default false
}
```

In `CompoundFilter`:
- Add `readonly not: boolean` property (default `false`).
- Constructor: `this.not = !!not;`
- `getTestFn()`: Wrap result with negation when `this.not` is true.
- `equals()`: Include `other.not === this.not` in comparison.
- `toJSON()`: Include `not: true` in output only when true (omit when false for
  backwards-compatibility).

This is fully backwards-compatible — existing code never sets `not`, existing JSON payloads don't
include it, and `parseFilter()` will pass it through to the constructor when present.

**Hoist-core**: Corresponding Java-side change (add `not` field to `CompoundFilter`) will be
scheduled as a separate task. Client-side filtering works immediately; server-side filtering for
NOT groups requires the core update.

### 0c. Verify with lint and type-check

```bash
yarn lint:code && npx tsc --noEmit
```

---

## Phase 1: Cross-Platform Model Layer

All files in `cmp/filter/` — no desktop dependencies, fully cross-platform.

### 1a. FilterBuilderFieldSpec

**File**: `cmp/filter/FilterBuilderFieldSpec.ts`

New sibling extending `FilterFieldSpec` (the renamed base). Adds builder-specific configuration:

```typescript
interface FilterBuilderFieldSpecConfig extends FilterFieldSpecConfig {
    defaultOperator?: FieldFilterOperator;  // Pre-selected op for new rules on this field
}
```

Properties beyond base:
- `defaultOperator: FieldFilterOperator` — validated against `ops`, defaults to first available.

`loadValuesFromSource()` implementation: Simple — loads all values from source, similar to
FilterChooserFieldSpec. Sets up a debounced MobX reaction tracking `source.lastUpdated` for
auto-refresh (when `enableValues` is true and source is available).

**What it does NOT need** (specific to other consumers):
- `valueRenderer`, `valueParser`, `example` — FilterChooser-specific (typeahead rendering)
- `filterModel`, `renderer`, `inputProps`, `allValuesCount` — GridFilter-specific

### 1b. Working-Tree Node Models

**Files**: `cmp/filter/impl/FilterGroupNode.ts`, `cmp/filter/impl/FilterRuleNode.ts`

These are mutable observable nodes representing the user's in-progress filter construction. They
extend `HoistBase` (not `HoistModel` — no loading support needed).

**FilterGroupNode**:
```
@observable op: 'AND' | 'OR'
@observable not: boolean
@observable.ref children: (FilterGroupNode | FilterRuleNode)[]

addRule(fieldSpec?: FilterBuilderFieldSpec): FilterRuleNode
addGroup(): FilterGroupNode
removeChild(child): void
moveChild(child, direction: 'up' | 'down'): void
toFilter(): CompoundFilter | null    — convert to immutable Filter
get isEmpty(): boolean
get isComplete(): boolean            — all rules have field + op + value
```

**FilterRuleNode**:
```
@observable field: string | null
@observable op: FieldFilterOperator | null
@observable value: any

toFilter(): FieldFilter | null       — convert to immutable FieldFilter
get isComplete(): boolean            — field, op, and value all set
clear(): void
```

**Static factory**: `FilterGroupNode.fromFilter(filter: Filter): FilterGroupNode` — converts
an immutable `Filter` (or `CompoundFilter`) into a mutable working tree for editing.

### 1c. FilterBuilderModel

**File**: `cmp/filter/FilterBuilderModel.ts`

Core model. Cross-platform, no desktop dependencies.

```
FilterBuilderModel extends HoistModel

Constructor config:
  bind?: FilterBindTarget
  valueSource?: FilterValueSource         — defaults to bind if it's a FilterValueSource
  fieldSpecs?: (FilterBuilderFieldSpecConfig | string)[]
  fieldSpecDefaults?: Partial<FilterBuilderFieldSpecConfig>
  commitOnChange?: boolean                — default false
  initialValue?: Thunkable<FilterLike>
  initialFavorites?: Thunkable<FilterLike[]>
  maxGroupDepth?: number                  — default 3
  persistWith?: FilterBuilderPersistOptions

Observable state:
  @managed fieldSpecs: FilterBuilderFieldSpec[]
  @observable.ref rootGroup: FilterGroupNode     — mutable working tree
  @bindable commitOnChange: boolean
  @observable.ref favorites: Filter[]
  persistFavorites: boolean                      — set by initPersist if successful

Computed:
  @computed get value(): Filter                  — rootGroup.toFilter() (immutable)
  @computed get isDirty(): boolean               — value differs from committed
  @computed get isEmpty(): boolean               — rootGroup has no children

Binding (bi-directional, same pattern as FilterChooserModel):
  Inbound reaction:  track bind.filter → populate rootGroup via fromFilter()
  Outbound:          appendFilter(bind.filter?.removeFieldFilters(), value) → bind.setFilter()

Actions:
  addRule(parentGroup?, fieldSpec?)
  addGroup(parentGroup?)
  removeNode(node)
  moveNode(node, direction: 'up' | 'down')
  setGroupOp(group, op: 'AND' | 'OR')
  setGroupNot(group, not: boolean)
  apply()       — commit working tree to target (outbound sync)
  cancel()      — revert working tree to last committed state
  clear()       — empty the working tree
  reset()       — alias for cancel

Favorites (matching FilterChooserModel pattern):
  addFavorite(filter?)     — defaults to current value
  removeFavorite(filter)
  setFavorites(favorites)
  isFavorite(filter): boolean
  get favoritesOptions

Persistence (split-store capable, same pattern as FilterChooserModel):
  persistValue?: boolean | PersistOptions
  persistFavorites?: boolean | PersistOptions
  Separate PersistenceProvider instances for value and favorites
```

**commitOnChange behavior**:
- When `true`: Each mutation to the working tree triggers an immediate `apply()`.
- When `false`: Mutations accumulate. UI shows Apply/Cancel in bbar. Apply commits; Cancel reverts.

**Inbound sync detail**: When `bind.filter` changes externally (e.g., FilterChooser or
GridFilterModel updates the same Store), the reaction rebuilds the working tree via
`FilterGroupNode.fromFilter()`. When `commitOnChange` is false and the user has uncommitted edits
(isDirty), we need to decide: overwrite or warn. Initial implementation: overwrite silently when
not dirty, preserve working tree when dirty (log a warning).

### 1d. Exports

**File**: `cmp/filter/index.ts` — add exports for `FilterBuilderModel` and
`FilterBuilderFieldSpec`.

### 1e. Verify

```bash
yarn lint:code && npx tsc --noEmit
```

---

## Phase 2: Desktop Component

### 2a. FilterBuilder Component

**File**: `desktop/cmp/filter/FilterBuilder.ts`

Main component created via `hoistCmp.withFactory()`, exporting both `FilterBuilder` and
`filterBuilder` (element factory). Uses `model: uses(FilterBuilderModel)`.

**Component tree** (internal sub-component factories):

```
FilterBuilder (main)
│
├── [empty state] placeholder(Icon.filter(), 'Add a filter to get started.')
│     — shown when rootGroup has no children
│
├── filterGroupCard (recursive)
│   │
│   │  Renders as: card({
│   │    title: groupHeader,      — AND/OR selector + NOT toggle + Add Rule + Add Group + Remove
│   │    icon: ...,
│   │    intent: ...,             — visual differentiation (AND vs OR, negated)
│   │    modelConfig: {collapsible: true},
│   │    items: children
│   │  })
│   │
│   ├── filterRuleRow
│   │   └── hbox: [field select] [op select] [value editor] [↑] [↓] [×]
│   │
│   └── filterGroupCard (nested — recursive, depth-limited by maxGroupDepth)
│
├── filterRuleRow
│   ├── Field selector:    select({options: fieldSpecs, ...})
│   ├── Operator selector: select({options: spec.ops, ...})
│   ├── Value editor:      valueEditor (type-mapped, see below)
│   ├── Shift up button:   button({icon: Icon.chevronUp(), ...})
│   ├── Shift down button: button({icon: Icon.chevronDown(), ...})
│   └── Remove button:     button({icon: Icon.delete(), ...})
│
├── valueEditor (type-mapped sub-factory)
│   ├── string + enumerable values → select (with value options from fieldSpec)
│   ├── string + free text         → textInput
│   ├── int / number               → numberInput
│   ├── date / localDate           → dateInput
│   ├── bool                       → switchInput
│   ├── tags                       → select({enableMulti: true})
│   └── = / != with enumerable     → select (single or multi based on op)
│
├── bbar (toolbar)
│   ├── [commitOnChange=false]: button('Apply') + button('Cancel')
│   ├── button('Clear')
│   ├── filler()
│   └── favoritesButton → opens favoritesMenu
│
└── favoritesMenu (popover, matching FilterChooser pattern)
    ├── List of saved favorites (click to load)
    ├── "Add current" menu item
    └── Delete button per favorite
```

**Group header layout** (inside card title area):

```
[AND/OR toggle] [NOT checkbox] [spacer] [+ Rule] [+ Group] [× Remove]
```

The AND/OR control could be a `buttonGroupInput` or a small `select`. NOT is a `checkbox` or
`switchInput`. Action buttons are icon-only `button` components.

**Depth limiting**: The "Add Group" button is hidden when the current group is at `maxGroupDepth`.

**Scrolling**: The FilterBuilder's content area should be scrollable. The root-level bbar stays
fixed at the bottom. Consider `overflow: 'auto'` on the content container.

### 2b. FilterBuilder Styles

**File**: `desktop/cmp/filter/FilterBuilder.scss`

```scss
.xh-filter-builder {
    // Root container — flex column
    // Scrollable content area
    // Fixed bbar at bottom

    &__group {
        // Card-based group container
        // Indentation via nested cards (natural)
        // Colored left border or intent per group type
    }

    &__group-header {
        // AND/OR selector + NOT toggle + action buttons
        // Flexbox row, center-aligned
    }

    &__rule {
        // Horizontal row: field + op + value + actions
        // Flexbox row with gap
        // Consistent field widths for alignment
    }

    &__rule-field { /* Fixed or flex width for field selector */ }
    &__rule-op { /* Narrower width for operator selector */ }
    &__rule-value { /* Flex-grow for value editor */ }
    &__rule-actions { /* Fixed width for shift + remove buttons */ }

    &__bbar {
        // Bottom toolbar with apply/cancel/clear/favorites
    }
}
```

### 2c. Exports

**File**: `desktop/cmp/filter/index.ts` — add `FilterBuilder`, `filterBuilder` exports.

### 2d. Verify

```bash
yarn lint && npx tsc --noEmit
```

---

## Phase 3: Toolbox Example + Iterative Refinement

### 3a. Create Toolbox Example Page

**Files**: In `../toolbox/client-app/src/desktop/tabs/` (exact location TBD based on existing tab
structure).

The example page should demonstrate:

1. **Basic usage**: FilterBuilder bound to a Store, with a Grid showing filtered results.
   Various field types (string, number, date, bool, tags) to exercise all value editors.

2. **commitOnChange comparison**: Side-by-side or toggle between `commitOnChange: true` and
   `false` to show the difference in UX.

3. **Favorites**: Persistence enabled, demonstrating save/load/delete of favorite filters.

4. **Companion with FilterChooser**: Both FilterBuilder and FilterChooser bound to the same
   Store, demonstrating bi-directional sync.

5. **Nested groups**: Pre-populated example with nested AND/OR/NOT groups to show the full
   capability.

### 3b. Browser Testing

Use the Toolbox example to iteratively test and refine:
- Adding/removing rules and groups
- AND/OR toggling and NOT negation
- Value editors for each field type
- Shift up/down reordering
- Collapsible groups (expand/collapse)
- Apply/Cancel workflow (commitOnChange=false)
- Live sync (commitOnChange=true)
- Favorites save/load/delete
- Bi-directional sync with FilterChooser
- Empty state placeholder
- Scrolling with many rules
- Various container sizes

### 3c. Iterative Refinement

Based on browser testing, refine:
- Layout proportions and spacing
- Select component widths and behavior
- Group visual differentiation (colors, borders)
- Keyboard navigation and tab order
- Edge cases (empty values, invalid states, deeply nested groups)

---

## Phase 4: Polish and Documentation

### 4a. Final Verification

```bash
yarn lint && npx tsc --noEmit
```

Review all new files for:
- Consistent Hoist coding conventions
- Proper `@managed` decorators on child models
- Proper `@observable` / `@action` usage
- Named exports (no default exports)
- `null` over `undefined` as no-value sentinel

### 4b. Documentation

- Update `cmp/filter/` README (or create one) covering FilterBuilder alongside FilterChooser
- Update `docs/README.md` index if needed
- Run xh-update-doc-links for consistency

### 4c. Commit Strategy

Commits organized by phase:
1. Phase 0: "Rename BaseFilterFieldSpec, add CompoundFilter NOT support"
2. Phase 1: "Add FilterBuilderModel and supporting classes"
3. Phase 2: "Add desktop FilterBuilder component"
4. Phase 3: "Add Toolbox FilterBuilder example"
5. Phase 4: "FilterBuilder polish and documentation"

---

## Deferred (v2+)

- **Drag-and-drop reordering** — after DnD library upgrade (#3918) is merged
- **Mobile FilterBuilder variant** — `mobile/cmp/filter/FilterBuilder.ts`
- **FunctionFilter support** — curated library supplied by developer
- **Lock/disable individual rules**
- **Clone rules/groups**
- **"Quick filter" bar mode** — simplified single-level variant

---

## Key Reference Files

### Hoist Filter System
- `data/filter/Filter.ts` — Abstract base
- `data/filter/FieldFilter.ts` — Value-based filtering (14 operators)
- `data/filter/CompoundFilter.ts` — AND/OR grouping (+ NOT after Phase 0)
- `data/filter/FunctionFilter.ts` — Custom test functions (not serializable)
- `data/filter/Types.ts` — FilterBindTarget, FilterValueSource, FilterSpec interfaces
- `data/filter/Utils.ts` — parseFilter, appendFilter, flattenFilter

### Existing Filter Components (primary references)
- `cmp/filter/FilterChooserModel.ts` — Binding, persistence, favorites patterns
- `cmp/filter/FilterChooserFieldSpec.ts` — Field spec with value rendering/parsing
- `cmp/grid/filter/GridFilterModel.ts` — commitOnChange pattern, per-column filtering
- `cmp/grid/filter/GridFilterFieldSpec.ts` — Field spec with dynamic value filtering
- `desktop/cmp/filter/FilterChooser.ts` — Component structure, favorites UI

### Reusable Components
- `cmp/card/Card.ts` + `CardModel.ts` — Collapsible container for groups
- `cmp/layout/Placeholder.ts` — Empty state display

### Persistence
- `core/persist/PersistenceProvider.ts` — Factory, merge, read/write
- `docs/persistence.md` — Canonical persistence reference

### Prior Art
- [react-querybuilder](https://react-querybuilder.js.org/) — Architecture reference
- [react-awesome-query-builder](https://github.com/ukrbublik/react-awesome-query-builder)
- [Syncfusion Query Builder](https://www.syncfusion.com/react-components/react-query-builder)
