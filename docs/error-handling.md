# Error Handling

## Overview

Hoist provides a centralized error handling system that logs, reports, and displays exceptions in a
consistent way across the entire application. The primary entry point is `XH.handleException()`,
which processes any thrown object -- parsing it into a structured `HoistException`, displaying an
appropriate alert to the user (modal dialog or toast), logging to the browser console, and
optionally sending the error to the server for review in the Admin Console.

This centralized approach means individual catch blocks do not need to worry about how to log,
format, or display errors. Instead, they pass exceptions to the handler with optional overrides,
and the framework applies sensible defaults based on the exception's characteristics (e.g.
whether it came from an auto-refresh, was explicitly marked as "routine", or represents a session
mismatch).

## How It Works

The error handling pipeline has three stages:

```
Exception thrown
    │
    ▼
1. Parse ── Exception.create() normalizes any thrown value into a HoistException
    │         ExceptionHandler.parseOptions() applies defaults based on exception flags
    │
    ▼
2. Alert ── Show a modal dialog or toast to the user (unless suppressed)
    │
    ▼
3. Log ──── Console log (error or debug level, based on showAsError)
            Server-side log via TrackService (unless suppressed)
```

### Step 1: Exception Creation

Any value passed to `XH.handleException()` is first normalized into a `HoistException` via
`Exception.create()`. This factory method handles several input types:

- **Native Error** -- Enhanced in-place with Hoist properties (`isRoutine`, `isHoistException`)
- **Plain object** -- Properties are spread onto a new `HoistException`
- **String / other** -- Treated as the `message` of a new `HoistException`

Applications can create enhanced exceptions directly via `XH.exception()`:

```typescript
throw XH.exception({
    message: 'Portfolio not found',
    isRoutine: true
});
```

The `isRoutine` flag is the most important property on a `HoistException`. When `true`, it signals
that the exception represents an expected condition (e.g. a validation error, a permission denial)
rather than an unexpected technical failure. This changes the handler's default behavior -- see
the defaults table below.

### Step 2: Display

The handler shows an alert to the user unless `showAlert` is `false`. Two display modes are
available, controlled by the `alertType` option:

**Dialog (default)** -- A modal dialog with the error message, a "Show/Report Details" button
(for unexpected errors), and a dismiss button. When `requireReload` is `true`, the dismiss button
is replaced with a "Reload App" button and the dialog cannot be closed.

**Toast** -- A non-modal toast notification with a `danger` intent (for errors) or `primary` intent
(for routine alerts). The toast includes an action button that opens the full exception details
dialog, allowing the user to inspect and report the error without being blocked by a modal.

### Step 3: Logging

Exceptions are always logged to the browser console -- at `error` level for unexpected errors
and `debug` level for routine ones. Server-side logging via `TrackService` is enabled by default
for unexpected errors, sending a sanitized exception payload to the Hoist server where it appears
in the Admin Console's activity tracking log. Users can also manually report errors by clicking
"Show/Report Details" and providing an optional message.

## XH.handleException()

The primary entry point. Call it in `catch` blocks or use `Promise.catchDefault()` for the same
effect in promise chains.

```typescript
// In a try/catch block
try {
    await XH.postJson({url: 'api/trades', body: tradeData});
    XH.successToast('Trade submitted');
} catch (e) {
    XH.handleException(e);
}

// With options
try {
    await this.saveAsync();
} catch (e) {
    XH.handleException(e, {
        title: 'Save Failed',
        message: 'Unable to save the current record. Please try again.',
        alertType: 'toast'
    });
}
```

### ExceptionHandlerOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `message` | `string` | Exception's own message | User-facing text describing the error |
| `title` | `string` | `'Error'` or `'Alert'` | Title for the alert dialog or toast |
| `showAsError` | `boolean` | `true` (false if `isRoutine`) | Treat as an unexpected error -- affects styling, console log level, and server logging default |
| `logOnServer` | `boolean` | `true` when `showAsError` and not auto-refresh | Send the exception to the server for Admin Console review |
| `showAlert` | `boolean` | `true` (false for auto-refresh and aborted fetches) | Display any alert to the user |
| `alertType` | `'dialog' \| 'toast'` | `'dialog'` | How to display the error. Configurable app-wide via `ExceptionHandler.defaults.alertType` |
| `requireReload` | `boolean` | `false` (true for session mismatches) | Force user to reload the app to dismiss the error |
| `hideParams` | `string[]` | none | Parameter names to redact from the exception log and alert display |

### Smart Defaults

The handler inspects the exception to determine sensible defaults, reducing the need for explicit
options in most cases:

| Exception characteristic | `showAsError` | `logOnServer` | `showAlert` | `requireReload` |
|--------------------------|---------------|---------------|-------------|-----------------|
| Standard exception | `true` | `true` | `true` | `false` |
| `isRoutine: true` | `false` | `false` | `true` | `false` |
| Auto-refresh failure (`fetchOptions.loadSpec.isAutoRefresh`) | (unchanged) | `false` | `false` | `false` |
| Aborted fetch (`isFetchAborted`) | (unchanged) | (unchanged) | `false` | `false` |
| Session mismatch (`SessionMismatchException`) | (unchanged) | (unchanged) | (unchanged) | `true` |

These defaults mean that most code can simply call `XH.handleException(e)` without options and
get the right behavior. Auto-refresh failures are silently logged. Aborted fetches (from
`autoAbortKey` or manual abort) are silently dropped. Session mismatches force a reload.

### Changing the App-Wide Default Alert Type

By default, exceptions display as modal dialogs. To make toasts the default across the entire
application, set the static property on `ExceptionHandler`:

```typescript
import {ExceptionHandler} from '@xh/hoist/core';

// In AppModel.initAsync() or similar startup code
ExceptionHandler.defaults.alertType = 'toast';
```

Individual calls to `XH.handleException()` can still override this with `alertType: 'dialog'`
for errors that warrant a modal.

### Displaying Exceptions Without Logging

`ExceptionHandler` provides two additional methods for re-displaying exceptions that have already
been handled, without triggering duplicate logging:

- `XH.exceptionHandler.showException(exception, options?)` -- Shows an exception dialog or toast
  without logging to the console or server. Useful for deferred display of a previously handled
  exception.
- `XH.exceptionHandler.showExceptionDetails(exception, options?)` -- Opens the exception details
  view directly, bypassing the initial alert. This is used internally by `ErrorBoundary` to let
  users inspect caught rendering errors.

Both methods accept the same `ExceptionHandlerOptions` as `XH.handleException()` for controlling
the display.

## Promise.catchDefault()

A concise way to add centralized error handling to a one-shot promise chain. It delegates directly
to `XH.handleException()` and accepts the same options.

`catchDefault()` is best suited for fire-and-forget contexts where there is no subsequent code
that depends on the promise's resolved value -- e.g. button click handlers or standalone
save/submit calls. For `async` methods with multiple steps, prefer a `try/catch` block instead
(see the pitfall below).

```typescript
// Button click handler -- no code follows, so catchDefault is ideal
onSubmitClick() {
    this.submitOrderAsync()
        .catchDefault({alertType: 'toast'});
}
```

### catchDefault in Promise Chains

When chaining multiple promise extensions, order matters. The standard pattern is:

```typescript
XH.fetchJson({url: 'api/positions', loadSpec})
    .linkTo(this.loadTask)        // 1. Mask UI while loading
    .track('Loaded positions')    // 2. Track timing
    .catchDefault();              // 3. Handle errors last
```

Placing `catchDefault()` before `.track()` would prevent tracking from capturing failures.

### catchDefaultWhen

Selectively apply default handling only for exceptions matching a predicate:

```typescript
this.submitOrderAsync()
    .catchDefaultWhen(e => e.isFetchAborted, {showAlert: false});
```

### catchWhen + catchDefault

Handle expected errors with custom logic while letting unexpected errors flow to the default
handler:

```typescript
this.submitOrderAsync()
    .catchWhen('ValidationException', e => {
        this.showValidationErrors(e.details);
    })
    .catchDefault();  // everything else gets standard handling
```

See [`/promise/README.md`](../promise/README.md) for the full promise extensions API.

## Error Handling in doLoadAsync

Models and services that implement `doLoadAsync()` participate in Hoist's managed loading system.
Error handling within these methods follows a consistent pattern that accounts for stale loads
and auto-refresh failures.

### The Standard Pattern

```typescript
override async doLoadAsync(loadSpec: LoadSpec) {
    try {
        const data = await XH.fetchJson({url: 'api/data', loadSpec});

        // Always check for stale loads after async calls
        if (loadSpec.isStale) return;

        runInAction(() => this.data = data);
    } catch (e) {
        // Silently skip stale and auto-refresh failures
        if (loadSpec.isStale || loadSpec.isAutoRefresh) return;

        // Clear stale data so the UI reflects the failed state
        runInAction(() => this.data = []);

        // Report the error
        XH.handleException(e);
    }
}
```

### Why Check loadSpec.isStale?

A `LoadSpec` becomes stale when a newer load has been requested. This commonly happens when:

- A user changes a filter or selection while a previous load is still in-flight
- Auto-refresh triggers while the user is manually refreshing
- A reaction fires multiple times in quick succession

After any `await`, check `loadSpec.isStale` before updating state. In the catch block, check
both `isStale` and `isAutoRefresh` -- a failed auto-refresh should not show an error dialog
because it would interrupt the user for a background operation they did not initiate.

### Choosing alertType in doLoadAsync

For models that display as a sub-panel rather than the main content area, `alertType: 'toast'`
is often better than a modal dialog -- the error is shown without blocking the rest of the app:

```typescript
catch (e) {
    if (loadSpec.isStale || loadSpec.isAutoRefresh) return;
    runInAction(() => this.data = []);
    XH.handleException(e, {alertType: 'toast'});
}
```

### Displaying Errors Inline with ErrorMessage and lastLoadException

For child components like charts, secondary grids, or dashboard widgets, you often want to show
a load failure inline rather than popping up a modal or toast. The component should still render
its surrounding chrome (title, toolbar) so the user can adjust their query or take other actions
-- only the _content area_ should be replaced with an error message.

`LoadSupport` tracks the most recent load failure on `model.lastLoadException`. The component's
render function can check this property and swap in an `errorMessage` component:

```typescript
import {errorMessage} from '@xh/hoist/cmp/error';

export const myWidget = hoistCmp.factory({
    render({model}) {
        return panel({
            item: model.lastLoadException
                ? errorMessage({error: model.lastLoadException})
                : grid(),
            bbar: toolbar(/* toolbar still renders, user can adjust filters */)
        });
    }
});
```

The `errorMessage` component also accepts an `actionFn` prop to render a retry button. This is
useful when the failure is likely transient (e.g. a network timeout) and retrying has a reasonable
chance of success:

```typescript
errorMessage({
    error: model.lastLoadException,
    actionFn: () => model.refreshAsync()
})
```

Don't include a retry button when there is no reason to believe a retry will help -- for example,
when the error clearly indicates a permissions issue or an invalid query. Offering a retry in
those cases just encourages the user to repeat an action that will fail again.

For panels that display data, this is the best user experience. It avoids modal interruptions,
seamlessly prevents the user from seeing stale data that no longer matches their query, and still
provides a clear area to communicate the full error message. The developer chooses exactly which
part of the UI to replace -- consider what the user still needs to see and interact with (a
toolbar for adjusting filters, a title bar, sibling components) and scope the `errorMessage` to
replace only the content that actually failed to load.

The exception to this pattern is actions like form submissions or workflow steps, where there is
no part of the UI that should be taken down. In those cases, a modal dialog (or toast) is more
appropriate -- the deliberate interruption ensures the user notices that their action did not
succeed, which is a feature rather than a gap.

When using the inline pattern, handle the error in the model's `doLoadAsync` with
`showAlert: false` to
suppress the modal/toast (the inline `errorMessage` provides the user-facing feedback), but still
log to the server for admin visibility:

```typescript
catch (e) {
    if (loadSpec.isStale || loadSpec.isAutoRefresh) return;
    XH.handleException(e, {showAlert: false});
}
```

### doLoadAsync Without try/catch

Note that `doLoadAsync()` does not _require_ a try/catch block. If your load implementation
simply fetches data and assigns it without needing to clean up stale state or customize error
display, the exception will propagate up through `LoadSupport`, which tracks it on
`lastLoadException`. However, an unhandled exception from `doLoadAsync` will not be shown to the
user or logged to the server -- it will only appear in the browser console. For this reason,
most non-trivial implementations should include explicit error handling.

## Let Exceptions Propagate from Services

Service methods that fetch data from the server should typically **not** catch their own exceptions.
Instead, they should let exceptions propagate to the calling model, where the developer has the
context to decide how to handle them -- whether to show a modal dialog, a toast, an inline
`errorMessage`, or to suppress the alert entirely.

The decisions around exception handling are inherently tied to the UI: what is the user doing,
what should they see, and what controls do they need to recover? These decisions belong in the
model and component layer, not in a shared service. If a service catches and handles an exception
internally, its callers lose the ability to make those choices.

```typescript
// ✅ Do: let the exception propagate to the caller
class PortfolioService extends HoistService {
    async loadPositionsAsync(portfolioId: string) {
        return XH.fetchJson({url: 'api/positions', params: {portfolioId}});
    }
}

// ❌ Don't: catch and handle in the service -- callers can't customize the UX
class PortfolioService extends HoistService {
    async loadPositionsAsync(portfolioId: string) {
        try {
            return XH.fetchJson({url: 'api/positions', params: {portfolioId}});
        } catch (e) {
            XH.handleException(e);  // caller never knows the load failed
        }
    }
}
```

If a service needs to catch an exception for its own purposes (e.g. to log additional context or
clean up internal state), it should re-throw after doing so:

```typescript
async loadPositionsAsync(portfolioId: string) {
    try {
        return await XH.fetchJson({url: 'api/positions', params: {portfolioId}});
    } catch (e) {
        console.debug('Position load failed for portfolio:', portfolioId);
        throw e;  // re-throw so the caller can handle
    }
}
```

## Routine Exceptions

Exceptions marked with `isRoutine: true` represent expected application conditions -- not
unexpected technical failures. They allow the exception handling system to be used for
business-case signaling: the system is working as designed, nothing has gone wrong, and no
follow-up investigation is needed. An exception is simply the mechanism used to communicate a
condition that the UI needs to handle -- a validation failure, a permission denial, or a
business rule that prevents an action.

The distinction matters for operational health. Non-routine exceptions logged to the server
should represent genuine signs of unexpected trouble -- things a developer should investigate
and eventually resolve. Marking expected conditions as `isRoutine` keeps the server-side error
log clean and actionable, so that real problems stand out rather than being buried in noise.

The framework creates routine exceptions automatically in certain cases (e.g. aborted fetches),
and server-side Hoist can return routine exceptions for validation or business-rule failures.

```typescript
// Server-side (Hoist Core / Grails) can return routine exceptions:
//   throw new RoutineRuntimeException("Portfolio not found")
// FetchService parses the isRoutine flag from the server response.

// Client-side creation
throw XH.exception({
    message: 'User does not have permission to perform this action.',
    isRoutine: true
});
```

When `isRoutine` is `true`, the handler defaults change:
- `showAsError` defaults to `false` -- title shows "Alert" instead of "Error", primary styling
  instead of danger
- `logOnServer` defaults to `false` -- no server-side log entry
- Console logging uses `debug` level instead of `error`
- The "Show/Report Details" button is hidden (since `showAsError` is false)

These defaults can still be overridden in the options passed to `handleException()`.

## ErrorBoundary

`ErrorBoundary` is a React component that catches unhandled errors during the React rendering
lifecycle -- specifically errors thrown during `render()`, component mounting, or other React
lifecycle methods. It does **not** catch errors from imperative callbacks like `doLoadAsync()`,
event handlers, or MobX reactions -- those must be handled with `try/catch` or `catchDefault()`.

When a rendering error is caught, the boundary replaces its children with an `ErrorMessage`
component showing the error and an optional retry button.

```typescript
import {errorBoundary} from '@xh/hoist/cmp/error';

// Wraps children -- catches React rendering lifecycle errors
errorBoundary({
    items: [myComponent()]
});

// With custom error handling
errorBoundary({
    modelConfig: {
        errorHandler: {showAlert: false},  // ExceptionHandlerOptions
        errorRenderer: (e) => myCustomErrorDisplay(e)
    },
    items: [myComponent()]
});
```

Hoist automatically wraps key structural components with `ErrorBoundary`, including Panel
contents, Tab pages, DashContainer widgets, DashCanvas widgets, DockView widgets, mobile
Navigator pages, and the top-level AppContainer. This means a rendering failure in one tab or
dashboard widget will not crash the entire application.

The `ErrorBoundaryModel` provides two methods for programmatic use:
- `handleError(e)` -- Process the exception (via `XH.handleException` with the configured
  options) and display the error state
- `showError(e)` -- Display the error state without re-processing the exception (for errors
  that have already been handled)

## Server-Side Error Logging

When `logOnServer` is `true` (the default for unexpected errors), the handler sends a sanitized
exception payload to the Hoist server via `TrackService`. This entry appears in the Admin
Console's activity tracking log with a `'Client Error'` category.

The logged payload includes:
- Exception name, message, and stack trace
- HTTP status and server details (for fetch exceptions)
- Fetch request details (URL, params, headers -- with sensitive values redacted)
- App version, username, and browser metadata
- Whether the user was shown an alert
- An optional user-provided message (via the "Report" dialog)

### Sensitive Data Redaction

The handler automatically redacts values at paths listed in
`ExceptionHandler.defaults.redactPaths`. By default this includes `Authorization` headers. Applications
can add additional paths:

```typescript
ExceptionHandler.defaults.redactPaths.push('fetchOptions.params.apiKey');
```

The `hideParams` option provides per-call redaction of specific request parameters:

```typescript
XH.handleException(e, {
    hideParams: ['password', 'ssn']
});
```

### User Error Reports

The exception detail dialog includes a text area where users can describe what they were doing
when the error occurred, plus a "Send" button to submit this report. The report is sent via
`ExceptionHandler.logOnServerAsync()` and includes the user's message alongside the full
exception details. The support email displayed on failure is configured via the `xhEmailSupport`
soft config.

## FetchService Exception Integration

`FetchService` produces richly structured `HoistException` objects that carry HTTP metadata
the handler can use for smart defaults:

| Exception Type | `isRoutine` | `isFetchAborted` | Handler Behavior |
|----------------|-------------|-------------------|------------------|
| HTTP 4xx/5xx error | `false` (unless server sets `isRoutine`) | `false` | Standard error dialog + server log |
| Server-returned routine error | `true` | `false` | "Alert" dialog (not "Error"), no server log |
| Aborted fetch (via `autoAbortKey` or manual abort) | `true` | `true` | No alert, no server log |
| Network / timeout error | `false` | `false` | Standard error dialog + server log |

Because `FetchService` sets these flags automatically, application code rarely needs to handle
fetch errors specially -- `XH.handleException(e)` or `.catchDefault()` will do the right thing.

## Common Pitfalls

### Swallowing Exceptions Silently

Catching errors without calling `handleException()` or logging means failures go unnoticed.
Even if you don't want to show an alert, consider logging to the server for visibility:

```typescript
// ❌ Don't: error disappears silently
catch (e) {
    // nothing
}

// ✅ Do: log for admin visibility, but don't bother the user
catch (e) {
    XH.handleException(e, {showAlert: false});
}
```

### Forgetting isStale / isAutoRefresh Checks in doLoadAsync

Without these checks, a stale load failure will show an error dialog for data the user no longer
cares about, or an auto-refresh failure will interrupt the user's current work:

```typescript
// ❌ Don't: auto-refresh failure pops up an error dialog
catch (e) {
    XH.handleException(e);
}

// ✅ Do: skip alerts for background and stale operations
catch (e) {
    if (loadSpec.isStale || loadSpec.isAutoRefresh) return;
    XH.handleException(e);
}
```

### Not Clearing Stale Data on Error

When a load fails, the UI may still be displaying data from a previous successful load. If the
user's query has changed, this stale data is misleading:

```typescript
// ❌ Don't: grid shows old data after a failed reload with new filters
catch (e) {
    XH.handleException(e);
}

// ✅ Do: clear the grid so the UI reflects the actual state
catch (e) {
    if (loadSpec.isStale || loadSpec.isAutoRefresh) return;
    gridModel.clear();
    XH.handleException(e);
}
```

### Using catchDefault When Code Continues After the Promise

`catchDefault()` is a `.catch()` handler -- on rejection, it calls `XH.handleException()` and
returns `undefined`. Unlike a `try/catch` block, execution does _not_ jump to a separate error
path. Any code that follows will continue to run with `undefined` in place of the expected value:

```typescript
// ❌ Don't: data will be undefined after a failed fetch, causing a confusing follow-on error
async doLoadAsync(loadSpec) {
    const data = await XH.fetchJson({url: 'api/trades', loadSpec}).catchDefault();
    runInAction(() => this.trades = data.trades);  // TypeError: Cannot read property of undefined
}

// ✅ Do: use try/catch when subsequent code depends on the result
async doLoadAsync(loadSpec) {
    try {
        const data = await XH.fetchJson({url: 'api/trades', loadSpec});
        if (loadSpec.isStale) return;
        runInAction(() => this.trades = data.trades);
    } catch (e) {
        if (loadSpec.isStale || loadSpec.isAutoRefresh) return;
        XH.handleException(e);
    }
}
```

Reserve `catchDefault()` for fire-and-forget contexts where no subsequent code depends on the
resolved value -- button click handlers or standalone save calls.


### Using catchDefault Before Other Promise Extensions

`catchDefault()` should be the _last_ handler in a promise chain. Placing it before `.track()`
means the tracking extension never sees the failure:

```typescript
// ❌ Don't: track() won't capture failures
fetchAsync()
    .catchDefault()
    .track('Loaded data');

// ✅ Do: catchDefault last
fetchAsync()
    .linkTo(this.loadTask)
    .track('Loaded data')
    .catchDefault();
```

### Using requireReload Unnecessarily

`requireReload: true` prevents the user from dismissing the error dialog -- they must reload the
entire application. Reserve this for truly unrecoverable situations like initialization failures
or session mismatches:

```typescript
// ❌ Don't: force a full reload for a recoverable error
XH.handleException(e, {requireReload: true});

// ✅ Do: reserve requireReload for truly unrecoverable situations
XH.handleException(e, {
    message: 'Failed to restore app defaults',
    requireReload: true  // App state is now inconsistent
});
```

## Key Source Files

| File | Description |
|------|-------------|
| [`core/ExceptionHandler.ts`](../core/ExceptionHandler.ts) | Central handler -- `handleException()`, `logOnServerAsync()`, option defaults, sanitization |
| [`core/XH.ts`](../core/XH.ts) | `XH.handleException()` and `XH.exception()` convenience aliases |
| [`exception/Exception.ts`](../exception/Exception.ts) | `Exception.create()` factory -- normalizes thrown values into `HoistException` |
| [`exception/Types.ts`](../exception/Types.ts) | `HoistException`, `FetchException`, and `TimeoutException` interfaces |
| [`promise/Promise.ts`](../promise/Promise.ts) | `catchDefault()`, `catchWhen()`, `catchDefaultWhen()` prototype extensions |
| [`appcontainer/ExceptionDialogModel.ts`](../appcontainer/ExceptionDialogModel.ts) | Model for the exception display dialog |
| [`desktop/appcontainer/ExceptionDialog.ts`](../desktop/appcontainer/ExceptionDialog.ts) | Desktop exception dialog view |
| [`cmp/error/ErrorBoundary.ts`](../cmp/error/ErrorBoundary.ts) | React error boundary wrapper |
| [`cmp/error/ErrorMessage.ts`](../cmp/error/ErrorMessage.ts) | Inline error display component |
| [`core/load/LoadSupport.ts`](../core/load/LoadSupport.ts) | Managed loading -- tracks `lastLoadException` |
| [`svc/FetchService.ts`](../svc/FetchService.ts) | HTTP request service -- creates structured fetch exceptions |

## Related Documentation

- [`/promise/README.md`](../promise/README.md) -- Promise extensions including `catchDefault`, `catchWhen`, and `catchDefaultWhen`
- [`/appcontainer/README.md`](../appcontainer/README.md) -- Exception dialog, toasts, and app shell
- [`/svc/README.md`](../svc/README.md) -- FetchService error handling and TrackService for server-side logging
- [`/core/README.md`](../core/README.md) -- `doLoadAsync` error handling patterns, `LoadSpec`, and `HoistModel`
- [Lifecycle: Models & Services](./lifecycle-models-and-services.md) -- LoadSupport, refresh system, and `doLoadAsync` lifecycle
