### 🎁 New Features

* `runner().span()`, `runner().timer()` and `runner().counter()` accept `useNamePrefix: false` to
  use a name as given, without the caller's `telemetryPrefix`. This matches the `useNamePrefix`
  option in hoist-core.
* `runner().span()`, `runner().timer()` and `runner().counter()` all take either a name with
  optional tags or a config object. `span(name, tags)` and `timer()` / `counter()` with a
  `MetricConfig` are new.

### 🐞 Bug Fixes

* `runner().timer()` and `runner().counter()` now prepend the caller's `telemetryPrefix` to metric
  names, as they already did for span names. A name that already starts with the prefix is used as
  given. Apps that passed short metric names from a class with a `telemetryPrefix` will see those
  metrics renamed.
