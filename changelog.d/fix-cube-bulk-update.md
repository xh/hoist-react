### 🐞 Bug Fixes

* Fixed a large `Cube` data update freezing the browser when a field used an aggregator that does
  not override `replace()`, such as a custom one. The View re-aggregated each group once per changed
  leaf. It now aggregates each group once.
