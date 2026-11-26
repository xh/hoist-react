### 🎁 New Features

* `runner().span()`, `runner().timer()` and `runner().counter()` accept `useNamePrefix: false` to
  use a name as given, without the caller's `telemetryPrefix`. `timer()` and `counter()` now also
  take a `MetricConfig` object. This matches the `useNamePrefix` option in hoist-core.

### 🐞 Bug Fixes

* `runner().timer()` and `runner().counter()` now prepend the caller's `telemetryPrefix` to metric
  names, as they already did for span names. A name that already starts with the prefix is used as
  given. Apps that passed short metric names from a class with a `telemetryPrefix` will see those
  metrics renamed.
