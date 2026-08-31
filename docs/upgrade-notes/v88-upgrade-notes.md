# Hoist React v88 Upgrade Notes

> **From:** v87.x → v88.0.0 | **Released:** TBD | **Difficulty:** 🟢 LOW

## Overview

Hoist React v88 is under active development - this document will grow as breaking changes land.

The headline addition is **calculated fields** (`FieldSpec.calculatedFn` and
`CubeFieldSpec.calculatedFn`) - client-computed field values at both the Store and Cube View
layers. See the CHANGELOG for details; calculated fields are additive and require no app changes.

## Connected stores are now always `projectionOnly`

Stores connected to a Cube `View` are now always read-only projections - the View sets
`projectionOnly: true` on them at connection, adopting the rows it publishes as record `data` by
reference rather than re-parsing and copying them. The View already owns parsing (its rows are
generated from the cube's parsed records), so projection mode is faster on every load and update
and is required for Views using calculated fields. An explicit `projectionOnly: false` or a
`processRawData` function on a connected store now throws at connection.

Most apps need no changes - prior versions logged a warning recommending exactly this setting,
and an unset config (the common case) simply lands on the enforced mode. Apps that configured
around full parsing should migrate:

```typescript
// Before - explicit opt-out kept the connected store parsing each view row.
store: {fields: [...], projectionOnly: false}

// After - remove the config; the View enforces projection mode.
store: {fields: [...]}
```

- `modifyRecords()` (and other local modification APIs) throw on a projection store - route edits
  through `Cube.modifyRecordsAsync()` instead, so they survive view regeneration.
- Replace a connected store's `processRawData` transform with Cube fields or calculated fields
  (`FieldSpec.calculatedFn` / `CubeFieldSpec.calculatedFn`) - note `updateData()` never applied
  `processRawData`, so such transforms only ever ran on full loads and were stale on updates.
- `projectionOnly` remains a fully supported opt-in config for ordinary (non-connected) stores.

## Connected store fields flow from the View

A connected store's `fields` are now reconciled to its View's query fields, at connection and on
query changes. View-published data is described by the query's own `CubeField` instances - types,
`displayName`s, and calculated status flow through to everything reading field metadata off the
store (`StoreFilterField`, grid filter choosers, column editability) rather than being
independently and typically more weakly declared (e.g. grid-inferred `type: 'auto'` fields).

Most apps need no changes and simply get stronger metadata. Two cases to review:

```typescript
// Before - view-published fields redeclared on the connected store for typing/display.
store: {fields: [{name: 'commission', type: 'number', displayName: 'Comm.'}, 'cubeDimension']}

// After - view-published fields are adopted automatically; declare only store-layer extras.
// Customize display metadata for view-published fields on the CubeField itself.
store: {fields: ['cubeDimension']}
```

- An app field sharing a view field's name is superseded by the view's `CubeField` - move any
  custom `displayName` or other metadata for such fields onto the Cube's field definition.
- A store-layer `calculatedFn` field sharing a view field's name now throws at connection - both
  would claim to compute the value. Rename the store-layer field, or compute it on the View via
  `CubeFieldSpec.calculatedFn`.
- `Store.fields` visibly changes at connection and on `View.updateQuery` - code capturing a
  connected store's field list at construction should read it lazily instead.
