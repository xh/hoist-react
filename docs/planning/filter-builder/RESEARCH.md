# FilterBuilder — Research Notes

Supporting context for PLAN.md. Summarizes findings from the research phase.

## Prior Art: Query Builder Libraries

### react-querybuilder (most popular, ~200k weekly npm downloads)

- Modular architecture: core + optional DnD package + UI library compatibility packages.
- Data model: recursive `{combinator, not, rules}` where rules contain both rule objects and nested
  group objects. Maps cleanly to Hoist's CompoundFilter/FieldFilter hierarchy.
- Key UX patterns:
  - `maxGroupDepth` prop limits nesting to prevent overly complex queries.
  - `showShiftActions` provides up/down reordering buttons without DnD.
  - `showNotToggle` enables per-group NOT negation.
  - `showCombinatorsBetweenRules` renders AND/OR inline between rules.
- DnD is a separate optional package (`@react-querybuilder/dnd`), confirming that DnD is not
  essential for v1.
- NOT support is a standard, opt-in feature.

### react-awesome-query-builder (~31k weekly downloads)

- Richer out-of-box UI with multiple framework skins.
- Uses immutable tree internally (heavier state management).
- Built-in DnD, more complex configuration.
- Also supports NOT per group.

### Syncfusion React Query Builder (commercial)

- Professional polish, built-in DnD, header/rule/value templates.
- Also supports NOT conditions with a toggle in group headers.

### Key UX Best Practices (from research)

- **Limit nesting depth**: Default 2-3 levels, configurable. Most real queries rarely need more.
- **Visual hierarchy**: Colored left-border bars and indentation per nesting level.
- **AND/OR visualization**: Combinator shown in group header, with color differentiation.
- **Empty state**: Actionable CTA ("Add a filter to get started") with icon.
- **Value editors**: Type-mapped inputs (string→text/select, number→numberInput, date→dateInput).
- **DnD is universally optional**: Every major library treats it as enhancement, not requirement.

## Field Spec Hierarchy Analysis

### Current Structure

```
BaseFilterFieldSpec (abstract, in data/filter/)
├── FilterChooserFieldSpec (in cmp/filter/)
└── GridFilterFieldSpec (in cmp/grid/filter/)
```

### BaseFilterFieldSpec — Shared Core

Properties: `field`, `fieldType`, `displayName`, `ops`, `source`, `enableValues`, `forceSelection`,
`values`, `hasExplicitValues`.

Key methods: `filterType` getter (range/value/collection), `loadValues()`, `supportsOperator()`,
`supportsSuggestions()`, abstract `loadValuesFromSource()`.

### FilterChooserFieldSpec — Adds

- `valueRenderer` — custom display formatting for typeahead tags
- `valueParser` — parse user text input into typed values
- `example` — sample value shown in UI help
- Auto-loading: MobX reaction tracks `source.lastUpdated`, debounced 100ms

These are all specific to the typeahead/OmniBox interaction model.

### GridFilterFieldSpec — Adds

- `filterModel` — reference to owning GridFilterModel
- `renderer` — column-style value rendering for filter values tab
- `inputProps` — props for HoistInput in custom filter tab
- `defaultOp` — pre-selected operator in custom tab
- `allValuesCount` — total unique values for UI indication
- Complex `loadValuesFromSource()` — considers other active column filters for dynamic filtering

These are all specific to the grid column filter interaction model.

### FilterBuilderFieldSpec — Will Add

- `defaultOperator` — pre-selected operator for new rules
- Simple `loadValuesFromSource()` with auto-loading reaction (like FilterChooserFieldSpec)
- Does NOT need valueRenderer/valueParser/example (not a typeahead) or filterModel/renderer/
  inputProps (not a grid column filter)

### Key Finding

Zero property overlap between the two existing subclasses. Each is genuinely specialized for its
consumer's interaction model. FilterBuilder should follow this pattern as a third sibling, not
reuse either existing spec.

## FilterBindTarget — Bi-directional Binding Pattern

### Interface

```typescript
interface FilterBindTarget {
    filter: Filter;                         // Observable property
    setFilter(filter: FilterLike): unknown; // Update method
}
```

### How Components Stay in Sync

Multiple filter components (FilterChooser, GridFilterModel, FilterBuilder) all independently bind
to the same target (Store, Cube View). The target IS the integration point.

**Inbound sync**: MobX reaction tracks `bind.filter`. When target changes from any source, each
component updates its internal state.

**Outbound sync**: Component calls `appendFilter(bind.filter?.removeFieldFilters(), newValue)` then
`bind.setFilter()`. The "selective removal + append" pattern preserves FunctionFilters from other
components while replacing FieldFilters.

**Loop prevention**: Three layers:
1. Store's `setFilter()` checks `filter.equals()` — no-op if same.
2. Model's setValue checks `value.equals()` — no-op if same.
3. Async batching via `wait()` prevents mid-render conflicts.

### commitOnChange Pattern

`GridFilterModel` has a `commitOnChange` flag (default `false`). FilterBuilder will implement this
fully:
- `true`: Each working-tree mutation triggers immediate `apply()` → `bind.setFilter()`.
- `false`: Mutations accumulate. UI shows Apply/Cancel. Apply commits; Cancel reverts to last
  committed state.

## CompoundFilter NOT Support

### Prior Art

NOT/negation per group is supported by all major query builder libraries:
- react-querybuilder: `not: boolean` on each group, opt-in via `showNotToggle`
- react-awesome-query-builder: NOT button per group
- Syncfusion: NOT conditions toggle in group header

It's essentially universal and expected by users familiar with other query builders.

### Value Proposition

NOT is hard to express by inverting individual operators. Consider: "Show everyone NOT in
(Engineering AND hired after 2020)". Inverting via De Morgan's law changes the group structure and
loses the user's mental model. NOT preserves the user's intent and enables clean "exclude this
combination" scenarios.

### Implementation in Hoist

Small, backwards-compatible change to `CompoundFilter`:
- Add `readonly not: boolean` (default `false`).
- `getTestFn()`: Wrap result with `!` when `not` is true.
- `toJSON()`: Include `not: true` only when true (omit when false).
- `equals()`: Include `not` in comparison.

Existing code never sets `not`, so behavior is unchanged. Existing JSON payloads don't include it.

Hoist-core (Java): Add `not` field to `CompoundFilter` — small, backwards-compatible change.
Scheduled as separate task.

## Persistence Pattern

FilterBuilderModel will follow FilterChooserModel's persistence pattern exactly:
- Two separate `PersistenceProvider` instances for value and favorites.
- Different paths: `filterBuilder.value` and `filterBuilder.favorites`.
- Split-store capable: value and favorites can use different providers.
- `persistFavorites` boolean flag gating UI visibility.
- `FilterBuilderPersistOptions extends PersistOptions` with `persistValue` and `persistFavorites`.

## Reusable Components

### Placeholder (`cmp/layout/Placeholder.ts`)

Styled empty-state container. Flexbox column, centered, muted text. First child Icon auto-styled
large (4em) and semi-transparent. No model required.

### Card (`cmp/card/Card.ts` + `CardModel.ts`)

Bordered container with optional header (title + icon), intent-based styling (primary/success/
warning/danger border and header colors), and built-in collapsibility via `CardModel`. Uses
`<fieldset>` + `<legend>` semantically. Supports persistence of collapsed state.

For FilterBuilder groups:
- Title area hosts AND/OR selector + NOT toggle + action buttons.
- Content area hosts child rules and nested groups.
- Collapsible for complex queries.
- Intent colors for visual differentiation (AND=primary, OR=different, negated=warning/danger).
