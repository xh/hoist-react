### 💥 Breaking Changes

* Renamed the `isFetchAborted` exception flag to `isAborted` (on `FetchException` and related
  `HoistException`s). The flag is now also set by the new `LoadAbortedException`. Update any
  references from `e.isFetchAborted` to `e.isAborted` (e.g. in `catchWhen`/`catchDefaultWhen`
  predicates).
* `loadAsync()` no longer rejects when `doLoadAsync()` throws. Errors not filtered as stale or
  auto-refresh now route to the new `Loadable.handleLoadException()` hook, which alerts the user by
  default where such errors were previously logged to the console only. Override the hook (e.g.
  `XH.handleException(e, {showAlert: false})`) to quiet a model, and remove any `.catch()` or
  `.catchDefault()` chained onto `loadAsync()` calls - they no longer fire.

### 🎁 New Features

* `Loadable` lifecycle improvements - less boilerplate and more consistent handling of stale,
  obsolete, and auto-refresh errors:
    * New `Loadable.skipStaleLoads` flag (default `true`) - controls whether loads superseded
      by a newer *started* request are aborted and silenced. Loads superseded by a newer
      *completed* request are always skipped.
    * New `Loadable.skipAutoRefreshErrors` flag (default `true`) - controls whether errors
      raised during an auto-refresh are silenced rather than routed to `handleLoadException`.
    * New `Loadable.handleLoadException(e, loadSpec)` hook - called only for surface-worthy
      failures not skipped via the flags above. Default delegates to `XH.handleException(e)`.
