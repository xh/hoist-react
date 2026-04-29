# Hoist React v85 Upgrade Notes

> **From:** v84.x → v85.0.0 | **Released:** 2026-04-23 | **Difficulty:** 🟢 LOW

## Overview

Hoist React v85 extends the client-side tracing work started in v83/v84 with a richer and better
nested view of application startup. Hoist now creates and names well-structured parent spans for
app load, authentication, Hoist-internal init, and app-level init — and provides each service with
an `InitContext` so its own init work can nest underneath the correct parent in OTEL.

The single breaking change is a signature update to `XH.installServicesAsync()`,
`HoistService.initAsync()`, and `HoistAppModel.initAsync()` so they can receive and forward this
context. The upgrade is a small, mechanical find-replace; the real value comes from threading
`ctx.span` into the async work your services do during init so app-level load activity surfaces
with the same fidelity as Hoist's own.

The most significant app-level impacts are:

- **`XH.installServicesAsync()` takes `(services[], ctx)`** — spread-args form is no longer
  accepted; callers must pass an array of services plus the current phase's `InitContext`.
- **`HoistAppModel.initAsync()` and `HoistService.initAsync()` receive an `InitContext`** — pass
  it through to nested `installServicesAsync()` calls and use `ctx.span` as the parent for spans
  your service creates during init.
- **Propagate `ctx.span` into fetch and async work during init (recommended)** — doing so gives
  you per-service and per-request child spans under the `xh.client.appInit` root, making
  application load timing clearly visible in OTEL.
- **`LoadSpecConfig` replaces `LoadSpec | Partial<LoadSpec>` as the `loadAsync()` argument** — a
  new exported type defining the inputs callers may supply (`isRefresh`, `isAutoRefresh`, `meta`,
  and the new `span`). Pass `span` to seed the parent trace context for spans and fetches issued
  within the load.
- **Swiper upgraded v11 → v12** — resolves a critical prototype pollution CVE. Apps consuming
  Swiper directly should confirm the upgrade.
- **Long-deprecated APIs removed** — `loadModel` getters, several `GridModel`/`ChartModel`/
  `ExceptionHandler`/`FetchService` static setters, and the `withFilterByField`/`withFilterByKey`/
  `replaceFilterByKey`/`withFilterByTypes` filter helpers. Replacements have all shipped
  previously, but agents performing the upgrade should grep for residual call sites — see Step 6.

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v84.x
- [ ] Your package manager (**yarn** or **npm**) is available and working
- [ ] **hoist-core** — no new minimum is required. **hoist-core >= 39.0 is recommended** to pair
  with this release's span sampling and app-load span changes, including the new
  `xhTraceConfig.sampleRules` name-based matching. See
  [Version Compatibility](../version-compatibility.md) for details.

## Upgrade Steps

### 1. Update `package.json`

Bump hoist-react to v85.

**File:** `package.json`

Before:
```json
"@xh/hoist": "~84.0.1"
```

After:
```json
"@xh/hoist": "~85.0.0"
```

Then run `yarn install` or `npm install` to update dependencies.

If your app consumes Swiper directly, note that hoist-react v85 requires Swiper `^12.1.2` (up
from `^11.2.0`). Swiper 12 ships CSS sources only — update any SCSS imports in your app
accordingly:

```scss
// Before (Swiper 11)
@use 'swiper/scss';

// After (Swiper 12)
@use 'swiper/css';
```

### 2. Update `AppModel.initAsync()` Signatures

`HoistAppModel.initAsync()` now receives an `InitContext` argument. Update every override in
your app to accept the context and forward it to `super.initAsync()` and any
`XH.installServicesAsync()` calls.

**Find affected files:**
```bash
grep -rn "override async initAsync" client-app/src/
```

Before:
```typescript
import {XH} from '@xh/hoist/core';

export class AppModel extends HoistAppModel {
    override async initAsync() {
        await super.initAsync();
        await XH.installServicesAsync(MyServiceA, MyServiceB);
    }
}
```

After:
```typescript
import {InitContext, XH} from '@xh/hoist/core';

export class AppModel extends HoistAppModel {
    override async initAsync(ctx: InitContext) {
        await super.initAsync(ctx);
        await XH.installServicesAsync([MyServiceA, MyServiceB], ctx);
    }
}
```

Repeat for every `AppModel` in your project — typically one per client platform
(`desktop/AppModel.ts`, `mobile/AppModel.ts`, `admin/AppModel.ts`) plus any example or sub-app
`AppModel`s that override `initAsync()`.

### 3. Update `XH.installServicesAsync()` Call Sites

The spread-args form of `XH.installServicesAsync()` is no longer accepted. All call sites must
pass an array of service classes plus the current phase's `InitContext`. The `ctx` comes from the
enclosing `initAsync(ctx)` parameter.

**Find affected files:**
```bash
grep -rn "installServicesAsync" client-app/src/
```

Before:
```typescript
await XH.installServicesAsync(MyServiceA);
await XH.installServicesAsync(MyServiceA, MyServiceB);
```

After:
```typescript
await XH.installServicesAsync([MyServiceA], ctx);
await XH.installServicesAsync([MyServiceA, MyServiceB], ctx);
```

Forwarding `ctx` ensures service-init spans nest under the current phase's root span
(`xh.client.appInit` for app-level services).

### 4. Update Custom `HoistService.initAsync()` Signatures

`HoistService.initAsync()` now receives an `InitContext` argument. Update every override in your
app's services.

**Find affected files:**
```bash
grep -rn "override async initAsync" client-app/src/
```

Before:
```typescript
import {HoistService, XH} from '@xh/hoist/core';

export class PortfolioService extends HoistService {
    override async initAsync() {
        this.lookups = await XH.fetchJson({url: 'portfolio/lookups'});
    }
}
```

After:
```typescript
import {HoistService, InitContext, XH} from '@xh/hoist/core';

export class PortfolioService extends HoistService {
    override async initAsync(ctx: InitContext) {
        this.lookups = await XH.fetchJson({url: 'portfolio/lookups'});
    }
}
```

If your service does not perform any work during init beyond what the superclass does, you can
accept the `ctx` parameter without using it — TypeScript's `noUnusedParameters` will not complain
about method parameters.

**This is the minimum change required to compile.** The next step is recommended to get
meaningful telemetry for app load.

### 5. Propagate `ctx.span` into Init-Time Fetch and Async Work (Recommended)

The primary value of the new `InitContext` is that it lets service init work emit child spans
under `xh.client.appInit`, giving OTEL a proper breakdown of where app startup time is being
spent. Without this step, service-init fetches appear as detached root spans rather than nested
children of the app load.

#### 5a. Pass `ctx.span` to init-time `XH.fetchJson()` / `XH.postJson()` calls

`FetchOptions.span` accepts an existing `Span`, a `SpanConfig` object, or simply a string name
(v84 addition). When initializing a service, set `span` on the fetch call so the request is
traced as a child of the service's init span.

Before:
```typescript
override async initAsync(ctx: InitContext) {
    this.lookups = await XH.fetchJson({url: 'portfolio/lookups'});
    this.symbols = await XH.fetchJson({url: 'portfolio/symbols'});
}
```

After (simplest form — `ctx.span` as parent):
```typescript
override async initAsync(ctx: InitContext) {
    this.lookups = await XH.fetchJson({url: 'portfolio/lookups', span: ctx.span});
    this.symbols = await XH.fetchJson({url: 'portfolio/symbols', span: ctx.span});
}
```

After (named child span wrapping a group of calls):
```typescript
override async initAsync(ctx: InitContext) {
    await this.span({name: 'loadPortfolioRefData', parent: ctx.span}).run(async () => {
        this.lookups = await XH.fetchJson({url: 'portfolio/lookups'});
        this.symbols = await XH.fetchJson({url: 'portfolio/symbols'});
    });
}
```

The `span().run()` form is useful when init does several related calls — the wrapper span
rolls them up into one phase in the timeline, and individual fetches nest beneath it
automatically via the `FetchService` span. `HoistBase.span()` auto-populates `caller`
with `this`, so the emitted span correctly carries `code.namespace`.

#### 5b. Pass `ctx.span` through to `AppModel` initialization work

If your `AppModel.initAsync()` does substantial setup beyond installing services — loading
reference data, bootstrapping caches, preparing router state — give that work a named child span
so it shows up distinctly in OTEL.

`Loadable.loadAsync()` now accepts a {@link LoadSpecConfig} - a plain config object with
`isRefresh`, `isAutoRefresh`, `meta`, and a new `span` field (replaces the prior
`LoadSpec | Partial<LoadSpec>` signature). Pass `ctx.span` (or a derived child span) so the
load's `doLoadAsync` work nests correctly. The supplied span is exposed inside `doLoadAsync` as
`loadSpec.span`; forward `loadSpec` to `FetchService` calls and any nested `loadAsync()` calls
as before so fetches and child loads nest under it automatically.

```typescript
override async initAsync(ctx: InitContext) {
    await super.initAsync(ctx);
    await XH.installServicesAsync([LookupService, EventService], ctx);

    // Direct: parent the load under ctx.span
    await this.lookupService.loadAsync({span: ctx.span});

    // Or wrap several related calls in a named child span
    await this.span({name: 'loadInitialClientData', parent: ctx.span}).run(async span => {
        await this.eventService.loadAsync({span});
    });
}
```

#### Reference: how built-in Hoist services use `InitContext`

The built-in services are the canonical examples. A few patterns worth noting:

- **`ConfigService`** passes a named span with an explicit parent:
  ```typescript
  await XH.fetchJson({
      url: 'xh/getConfig',
      span: {name: 'xh.client.config.get', parent: ctx.span, caller: this}
  });
  ```

- **`EnvironmentService`** passes `ctx.span` directly to name the fetch span after the HTTP
  method:
  ```typescript
  await XH.fetchJson({url: 'xh/environment', span: ctx.span});
  ```

- **`PrefService`** threads `ctx.span` into a private helper that then creates a named child
  span — a good pattern when init delegates to an internal method:
  ```typescript
  override async initAsync(ctx: InitContext) {
      return this.loadPrefsAsync(ctx.span);
  }
  private async loadPrefsAsync(span: Span) {
      await XH.fetchJson({
          url: 'xh/getPrefs',
          span: {name: 'xh.client.prefs.get', parent: span, caller: this}
      });
  }
  ```

For application spans, prefer plain descriptive names (e.g. `loadPortfolioRefData`) — the
`xh.*` naming convention is reserved for framework-owned spans.

### 6. Remove Usage of Long-Deprecated APIs

Several APIs deprecated in earlier Hoist versions (most since v82) are now removed. The
replacements have all shipped previously, so most apps will already be off them — but agents
performing the upgrade should sweep for any residual call sites. `tsc --noEmit` is the primary
safety net: any remaining usages will surface as missing-property or unknown-import errors.

**Find affected files:**
```bash
grep -rnE "\.loadModel\b|\.appLoadModel\b|applyColumnStateChanges|GridModel\.(DEFAULT_RESTORE_DEFAULTS_WARNING|DEFAULT_AUTOSIZE_MODE|defaultContextMenu)|ChartModel\.defaultContextMenu|ExceptionHandler\.(REDACT_PATHS|ALERT_TYPE|TOAST_PROPS)|FetchService\.(autoGenCorrelationIds|genCorrelationId|correlationIdHeaderKey)|withFilterByField|withFilterByKey|replaceFilterByKey|withFilterByTypes" client-app/src/
```

Replace each match per the table below:

| Removed | Replacement |
|---|---|
| `model.loadModel` (on `HoistModel`, `HoistService`, `UrlStore`, `RestFormModel`) | `model.loadObserver` |
| `XH.appLoadModel` | `XH.appLoadObserver` |
| `gridModel.applyColumnStateChanges(state)` | `gridModel.updateColumnState(state)` |
| `GridModel.DEFAULT_RESTORE_DEFAULTS_WARNING = v` | `GridModel.defaults.restoreDefaultsWarning = v` |
| `GridModel.DEFAULT_AUTOSIZE_MODE = v` | `GridModel.defaults.autosizeMode = v` |
| `GridModel.defaultContextMenu` (get/set) | `GridModel.defaults.contextMenu` |
| `ChartModel.defaultContextMenu` (get/set) | `ChartModel.defaults.contextMenu` |
| `ExceptionHandler.REDACT_PATHS = v` | `ExceptionHandler.defaults.redactPaths = v` |
| `ExceptionHandler.ALERT_TYPE = v` | `ExceptionHandler.defaults.alertType = v` |
| `ExceptionHandler.TOAST_PROPS = v` | `ExceptionHandler.defaults.toastProps = v` |
| `FetchService.autoGenCorrelationIds = v` | `FetchService.defaults.autoGenCorrelationIds = v` |
| `FetchService.genCorrelationId = v` | `FetchService.defaults.genCorrelationId = v` |
| `FetchService.correlationIdHeaderKey = v` | `FetchService.defaults.correlationIdHeaderKey = v` |
| `withFilterByField(filter, newFilter, field)` | `appendFilter(filter.removeFieldFilters(field), newFilter)` |
| `withFilterByKey(filter, newFilter, key)` | `appendFilter(filter.removeFunctionFilters(key), newFilter)` |
| `replaceFilterByKey(filter, replacement, key)` | `appendFilter(filter.removeFunctionFilters(key), replacement)` |
| `withFilterByTypes(filter, newFilter, types)` | Use `filter.removeFieldFilters()` / `filter.removeFunctionFilters()` combined with `appendFilter()` |

## Verification Checklist

After completing all steps:

- [ ] `yarn install` / `npm install` completes without errors
- [ ] `yarn lint` / `npm run lint` passes (or only pre-existing warnings remain)
- [ ] `npx tsc --noEmit` passes — **primary gate** for the mechanical API changes
- [ ] Application loads without console errors
- [ ] All `AppModel.initAsync()` overrides accept and forward `ctx: InitContext`:
  `grep -rn "override async initAsync" client-app/src/`
- [ ] All `XH.installServicesAsync()` call sites use the `(services[], ctx)` form:
  `grep -rn "installServicesAsync" client-app/src/`
- [ ] All custom `HoistService.initAsync()` overrides accept `ctx: InitContext`
- [ ] (Recommended) Init-time fetch calls in your services pass `ctx.span` (or a derived span)
  via `FetchOptions.span`
- [ ] Grids render and function correctly (sorting, filtering, grouping)
- [ ] Forms validate and submit correctly
- [ ] If your app consumes Swiper directly: swiper styles import is `swiper/css` (not
  `swiper/scss`), and carousels/pagers render correctly
- [ ] No residual usages of removed deprecated APIs remain (Step 6) — the Step 6 grep returns
  no matches under `client-app/src/`
- [ ] (If OTEL export is enabled) App load trace in your collector shows nested
  `xh.client.load` → `xh.client.appInit` → per-service spans, with your app's init-time fetches
  appearing as children

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) — canonical example of a Hoist app; see its
  `client-app/src/**/AppModel.ts` and `client-app/src/core/svc/*Service.ts` for the expected
  shape of `initAsync(ctx)` overrides.
- [`/svc/README.md`](../../svc/README.md) — reference for `TraceService`, `FetchService`, and the
  `FetchOptions.span` API used in Step 5.
- [`/core/README.md`](../../core/README.md) — reference for `HoistService`, `HoistAppModel`, and
  the `HoistBase.span()` builder used in Step 5.
