# 14 - The portable pattern: beyond charts

Charts are the first Hoist component that must work equally well from code and from JSON written
by a dashboard or an agent. Grid is next, then forms. This file states the pattern Chart V2 sets,
so later components follow it rather than invent their own split. Evidence and counts are in
`../notes/portable-spec-pattern.md`. Tags: **[V]** verified in code, **[I]** inferred.

## The problem

Hoist specs and configs hold functions freely: renderers, comparators, `Thunkable<T>`, handlers,
components. That is right for code and must stay. But a dashboard widget or an agent tool call
can only carry JSON. Today each consumer bridges the gap its own way [V]:

- Dash persists `viewSpecId` plus plain state, and keeps functions in the code-side view spec.
- Grid persists column state only. Definitions never leave code.
- hoist-chat-kit hand-writes its own portable column type and maps it to `ColumnSpec` with inline
  lambdas (`ChatUiGrid.ts`, `ChatUiTableData.ts`). It maps form rules the same way.
- `FieldFilter` tags class values with `valueType`. `FormModel` tags them with `_xhType`.
- `FunctionFilter.toJSON()` throws. `AggregatorToken` is a closed set apps cannot extend.

## The pattern

1. **Portable** means JSON-safe and able to rebuild an equivalent object where the same names are
   registered. Not a synonym for serializable: serializable output need not come back.
2. **Config extends Spec.** A component's constructor config stays flat. The keys that define the
   component form a named Spec, declared once as a key list. Infra keys (store, persistWith,
   handlers, child models) stay on Config and never travel.
3. **Definition and state.** The Spec is the definition. User tweaks live in a state overlay keyed
   by id, with same-name keys. Each model method writes one layer. Restore defaults clears the
   overlay.
4. **Every function slot in a Spec also takes a `NamedRef`** - `'percent'` or
   `{id: 'percent', args: {...}}` - the `*Like` idiom Hoist already uses for menu tokens and
   aggregators. Function-only keys belong on Config.
5. **Registries per domain.** A generic `NamedRegistry<T>` in core. Typed instances owned by their
   packages: formats, cell renderers, column presets, constraints, transforms, data sources.
   Bare names for Hoist built-ins, dotted names for apps. Registration records a function's id,
   so `toPortable()` writes it back as a ref.
6. **Presets, not just functions.** A registered preset is a partial code spec that may contain
   functions, e.g. Toolbox's `profitLossCol` [V]. JSON then says
   `{preset: 'acme.profitLoss', width: 120}`. The stored JSON must be portable; the resolved spec
   need not be.
7. **Widget envelope.** Type id and data source live on the widget (Dash `viewSpecId`, chat-kit
   catalog name), never in the Spec.
8. **Unknown names survive.** Load renders a placeholder; save writes the ref back unchanged.
   Widget state carries a version `v` for migrations, as chat-kit's catalog does.
9. **One codec.** Dates in portable JSON are ISO strings, typed by schema or store field. No third
   tag convention.

## How Grid would follow

[I, high] A type-only change: `GridConfig extends GridSpec`, with `GRID_SPEC_KEYS` declared once.
None of the 37 Toolbox or 19 admin `new GridModel(...)` call sites change [V for the counts].
Then:

| Need | Today [V] | Change |
|---|---|---|
| Read the definition | No `getSpec()` | Add `getSpec()` over the key list |
| Edit one column without losing user state | `setColumns()` resets and persists column state | Add `addColumn` / `updateColumn` / `removeColumn` that keep state by colId |
| Restore defaults after an agent edit | `_defaultState` fixed in the constructor | Update the baseline on definition writes, as the chart does |
| Portable formats | `numberRenderer({precision})` returns a closure that drops its options | Tag the format factories with their ref. Then about 70 Toolbox renderer uses become portable with no app change [V count by pattern] |
| Portable columns | chat-kit's own `ChatUiGridColumn` | Hoist `PortableColumn`: plain ColumnSpec keys plus `format`, `renderer` and `preset` refs |
| Cells that render components | Inline lambdas (about 15 in Toolbox) | Must be registered `cellRenderer`s. No way around it. |

A realistic agent-built grid - columns with formats, sort, group, tree, summary, a filter, a
source - is fully covered by `PortableGridSpec` plus the format, preset and source domains.
Editors, record actions and event handlers need registration.

## Forms and data

- **Forms.** Hoist constraints are already named factories with options (`required`,
  `numberIs({min})`, ...) [V]. About 73 of 80 Toolbox `rules: [` lines use them [V by pattern].
  Rules become `{id: 'numberIs', args: {min: 0}}`. `FormModel` takes its fields at construction
  only; chat-kit works around that with one FormModel per field [V]. The form layout is a widget
  tree, which chat-kit already defines; Hoist should own the rule refs first.
- **Filters.** `FieldFilter` and `CompoundFilter` already round-trip [V]. `FunctionFilter` already
  has a `key`; a registered filter function can make that key its ref.
- **Cube.** Make `AggregatorToken` an open registry domain with today's tokens as built-ins.
- **Columns from data.** CubeGrid already builds columns from data values (`PivotSpec`, with
  `PivotMeasureSpec.column` as a template) [V]. Chart `splitBy` is the same idea at series scale.
  Both need deterministic generated ids and state that survives ids not yet seen.

## Sequencing

Build only what charts need in Chart V2, in a shape Grid can adopt unchanged:

1. **With Chart V2:** `NamedRef`, `NamedRegistry`, `toPortable()`, a format registry whose
   entries build chart format functions from Hoist's formatters (`fmtNumber`, `fmtPercent`, ...),
   the chart transform registry, runtime ref validation.
2. **When Grid needs agent-built grids:** tag the grid renderer factories (`numberRenderer` and
   its siblings) with the same format refs, `GridSpec` and its key list, state-keeping column
   methods, a movable defaults baseline, `PortableColumn`, the cell renderer and column preset
   domains. chat-kit then drops its own column mapping.
3. **Later:** constraint refs for forms, filter function refs, open aggregators.

## The case against, and what would flip it

**Against:** the generic layer may add little. Dash's id-plus-state already works. Agent schemas
are curated per model anyway (11, principle 4). Each saved name becomes a permanent stability
duty.

**What survives that:** tagged format factories, refs with args, presets and registries. Each
removes a duplicate that exists today.

**Flip conditions:**

- If no component other than charts gets agent- or user-assembled instances within the next few
  releases, keep the pattern inside charts and skip the core registry.
- If chat-kit cannot use Hoist's portable types as tool schemas, the shared types lose their main
  second consumer, and the case for a Hoist-wide layer weakens.
