### 🐞 Bug Fixes

* Fixed a bulk `Cube.updateDataAsync()` re-aggregating every group once per changed leaf for an
  aggregator with no incremental `replace()`, such as an app's own. A large update could freeze the
  browser. Such a field now aggregates each group once.
