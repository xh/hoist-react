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
