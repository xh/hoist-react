# Hoist React v88 Upgrade Notes

> **From:** v87.x → v88.0.0 | **Released:** TBD | **Difficulty:** 🟢 LOW

## Overview

Hoist React v88 is under active development - this document will grow as breaking changes land.

The headline addition is **calculated fields** (`FieldSpec.calculatedFn` and
`CubeFieldSpec.calculatedFn`) - client-computed field values at both the Store and Cube View
layers. See the CHANGELOG for details; calculated fields are additive and require no app changes.

## Connected stores now default to `projectionOnly`

Stores connected to a Cube `View` now default to `projectionOnly: true`, adopting the rows the
View publishes as record `data` by reference rather than re-parsing and copying them. The View
already owns parsing (its rows are generated from the cube's parsed records), so projection mode
is faster on every load and update and is required for Views using calculated fields.

Most apps need no changes - the default applies only where the config was left unset, and prior
versions logged a warning recommending exactly this setting. Apps that relied on full parsing of
view rows should opt out with an explicit `false`:

```typescript
// Before - connected store parsed each view row (with a console warning).
store: {fields: [...]}

// After - no change needed to get projection mode. To keep full parsing instead:
store: {fields: [...], projectionOnly: false}
```

Notes for opted-out or affected apps:

- `modifyRecords()` (and other local modification APIs) throw on a projection store - route edits
  through `Cube.modifyRecordsAsync()` instead, so they survive view regeneration.
- A connected store with a `processRawData` function is automatically left in full-parsing mode -
  note that `updateData()` has never applied `processRawData`, so such transforms only ever ran
  on full loads.
- Views with calculated fields (`CubeFieldSpec.calculatedFn`) require projection mode and will
  throw at connection if a store opts out.
