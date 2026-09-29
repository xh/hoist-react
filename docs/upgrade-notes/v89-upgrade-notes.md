# Hoist React v89 Upgrade Notes

> **From:** v88.x → v89.0.0 | **Released:** TBD | **Difficulty:** 🟢 LOW

## Overview

Hoist React v89 is under active development - this document will grow as breaking changes land.

The headline addition is **derived fields** (`FieldSpec.derivedFn` + `dependsOn`) - field values
computed from a record's other values, on plain Stores and at every level of a Cube View. See the
CHANGELOG and the [Cube README](../../data/cube/README.md#derived-fields) for details; derived
fields are additive and require no app changes.

## Connected stores are always `projectionOnly`

A Store connected to a Cube `View` is now always a read-only projection of the View's rows - the
View sets `projectionOnly` on connection, and an explicit `projectionOnly: false` or a
`processRawData` config on a connected store throws.

```typescript
// Before - opt-in, with a warning when unset.
const gridModel = new GridModel({store: {fields: [...], projectionOnly: true}, ...});

// After - implied. Drop the flag, or leave it - `true` remains accepted.
const gridModel = new GridModel({store: {fields: [...]}, ...});
```

- Apps that parsed View rows into their own records (via `processRawData` or by leaving
  `projectionOnly` unset with fields of a different `type`) must instead declare the needed fields
  on the Cube - a derived `CubeField` covers most such transforms, and is computed once by the
  View rather than once per connected store.
- `modifyRecords()` and other local modification APIs throw on a projection store - route edits
  through `Cube.modifyRecordsAsync()` instead, so they survive view regeneration.
- `projectionOnly` remains a fully supported opt-in config for ordinary (non-connected) stores.
