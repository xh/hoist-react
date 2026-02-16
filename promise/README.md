# Promise Package

## Overview

The `/promise/` package extends the global `Promise` prototype with Hoist-specific methods for
error handling, activity tracking, UI masking, and timeouts. It also provides standalone utility
functions for starting and managing promise chains.

All extensions are chainable and preserve the original promise's resolved value — they add
cross-cutting behavior without changing the data flowing through the chain.

```
/promise/
├── Promise.ts    # Standalone functions + prototype extensions
└── index.ts
```

## Standalone Functions

Import from `@xh/hoist/promise`.

### wait

Return a promise that resolves after a specified delay. A lightweight way to start a promise
chain or introduce a pause:

```typescript
import {wait} from '@xh/hoist/promise';

// Start a chain with an initial delay
await wait(500);
doSomething();

// Equivalent to setTimeout but promise-based
wait(1000).then(() => refreshUI());
```

### waitFor

Return a promise that resolves when a condition becomes true, polling at a configurable
interval. Rejects with a timeout exception if the condition is not met in time:

```typescript
import {waitFor} from '@xh/hoist/promise';

// Wait for a model to finish loading
await waitFor(() => model.loadCompleted, {interval: 100, timeout: 10000});

// Defaults: interval=50ms, timeout=5000ms
await waitFor(() => document.querySelector('.my-element'));
```

### resolve / never

```typescript
import {resolve, never} from '@xh/hoist/promise';

resolve('value');   // Promise that resolves immediately with the given value
never();            // Promise that never resolves — e.g. to halt an async operation pending app reload
```

## Promise Prototype Extensions

These methods are available on every Promise instance. They are added to `Promise.prototype`
at import time and declared globally via TypeScript's module augmentation.

### Error Handling

#### catchDefault

Delegates to Hoist's centralized exception handler (`XH.handleException()`) for convention-driven
logging and alerting. Best suited for fire-and-forget contexts where no subsequent code depends on
the resolved value -- e.g. button click handlers or standalone save calls.

**Avoid** using `catchDefault()` with `await` when code continues after the call. On rejection,
`catchDefault()` handles the error and returns `undefined`, allowing subsequent code to run with
an unexpected `undefined` value. Use a `try/catch` block instead when further code depends on the
result. See [Error Handling: Common Pitfalls](../docs/error-handling.md#common-pitfalls) for
details.

```typescript
// Button click handler -- fire-and-forget, ideal for catchDefault
onSubmitClick() {
    this.submitOrderAsync()
        .catchDefault({alertType: 'toast'});
}

// With options — same as XH.handleException options
this.refreshCacheAsync()
    .catchDefault({showAlert: false});              // log only, no dialog
```

#### catchWhen / catchDefaultWhen

Selectively catch exceptions by name or predicate, re-throwing anything that doesn't match:

```typescript
// Catch by predicate — handler is optional, omit to silently swallow
fetchAsync()
    .catchWhen(e => e.isFetchAborted);        // swallow aborts, return undefined

// Catch by predicate with handler
fetchAsync()
    .catchWhen(
        e => e.httpStatus === 404,
        () => this.showNotFound()
    );

// Catch by exception name
fetchAsync()
    .catchWhen('ValidationException', e => this.showValidationErrors(e));

// Catch with default handler, only for matching exceptions
fetchAsync()
    .catchDefaultWhen(e => e.isFetchAborted, {showAlert: false});
```

The `selector` parameter accepts:
- A function `(e) => boolean` — filter by any exception property
- A string or array of strings — match against `e.name`

### Activity Tracking

#### track

Record a promise's execution with timing via Hoist's activity tracking system
(`XH.track()`). Captures start time, elapsed duration, and exception details if rejected:

```typescript
// Simple message
this.loadPortfolioAsync()
    .track('Loaded portfolio');

// Full TrackOptions
this.savePositionAsync(positionId)
    .track({
        category: 'Trading',
        message: 'Saved position',
        data: {positionId}
    });
```

Routine exceptions (those marked `isRoutine`) are not tracked. Elapsed time is automatically
nulled out if an interactive re-login occurred during the promise's execution.

### UI Masking

#### linkTo

Link a promise to a `TaskObserver` to coordinate loading masks and progress messages:

```typescript
import {TaskObserver} from '@xh/hoist/core';

// In a model
loadTask = TaskObserver.trackLast();

async loadDataAsync() {
    return XH.fetchService
        .fetchJson({url: 'api/data'})
        .linkTo(this.loadTask);
}

// With a message shown on the mask
fetchAsync()
    .linkTo({observer: this.loadTask, message: 'Loading positions...'});

// Conditionally skip masking
fetchAsync()
    .linkTo({observer: this.loadTask, omit: () => this.isBackgroundRefresh});
```

The most common pattern is passing the `TaskObserver` to a Panel's `mask` prop:

```typescript
panel({
    mask: this.loadTask,
    items: [/* ... */]
})
```

### Timing

#### timeout

Reject if a promise doesn't settle within the specified interval:

```typescript
// Simple timeout in ms
fetchSlowServiceAsync()
    .timeout(30000);

// With custom error message
fetchSlowServiceAsync()
    .timeout({interval: 30000, message: 'Service timed out'});
```

Throws `Exception.timeout()` on expiration.

#### wait (instance method)

Introduce a delay after a promise settles, passing through the original value or rejection:

```typescript
// Delay before proceeding to the next step
this.saveAsync()
    .wait(500)
    .then(() => this.refreshAsync());
```

### MobX Integration

#### thenAction

Wraps the `then` callback in a MobX `action()`, required when a Promise chain modifies
MobX observables:

```typescript
fetchAsync()
    .thenAction(data => {
        this.records = data;     // modifying @observable
        this.loading = false;    // modifying @observable
    });
```

**Avoid:** Using `thenAction` when you can use `async/await` inside an `@action` method instead
— it's more readable and doesn't require special handling.

### Pass-through

#### tap

Execute a side-effect function without changing the value flowing through the chain:

```typescript
fetchAsync()
    .tap(data => console.log('Received', data.length, 'records'))
    .then(data => processData(data));  // data is unchanged
```

## Common Patterns

### Standard Load Pattern

The most common promise chain in Hoist applications — load data, link to a mask, and track for
monitoring:

```typescript
async doLoadAsync() {
    try {
        const data = await XH.fetchService
            .fetchJson({url: 'api/positions'})
            .linkTo(this.loadTask)
            .track({category: 'Portfolio', message: 'Loaded positions'});

        runInAction(() => this.updatePositions(data));
    } catch (e) {
        XH.handleException(e);
    }
}
```

### Conditional Error Handling

Handle expected errors gracefully while letting unexpected ones bubble to the default handler:

```typescript
this.submitOrderAsync()
    .catchWhen('ValidationException', e => {
        this.showValidationErrors(e.details);
    })
    .catchDefault();  // everything else gets standard handling
```

## Common Pitfalls

### `catchDefault` order matters

`catchDefault()` should be the *last* handler in the chain. Placing it before `.track()` means
tracking won't capture failures. The standard order is:
`.linkTo()` → `.track()` → `.catchDefault()`.

### `thenAction` vs `async/await`

Inside an `@action`-decorated `async` method, all synchronous code between `await` calls runs
within an action context automatically. `thenAction` is only needed in raw `.then()` chains.

### `@managed` on TaskObserver

`TaskObserver` does not implement `destroy` and requires no cleanup, so marking it `@managed` is
unnecessary. It's not harmful, but there's no benefit — a plain property declaration is sufficient.

## Related Packages

- [`/utils/async/`](../utils/README.md#async-utilities) — Timer and non-blocking loop utilities
- [`/core/`](../core/README.md) — TaskObserver, TrackOptions, ExceptionHandlerOptions,
  XH.handleException
- [`/mobx/`](../mobx/README.md) — MobX `action` used by `thenAction`
