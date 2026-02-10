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
never();            // Promise that never resolves — useful as a placeholder
```

## Promise Prototype Extensions

These methods are available on every Promise instance. They are added to `Promise.prototype`
at import time and declared globally via TypeScript's module augmentation.

### Error Handling

#### catchDefault

Delegates to Hoist's centralized exception handler (`XH.handleException()`) for convention-driven
logging and alerting. Typically called last in a promise chain:

```typescript
this.fetchDataAsync()
    .then(data => this.processData(data))
    .catchDefault();

// With options — same as XH.handleException options
this.fetchDataAsync()
    .catchDefault({showAlert: false});              // log only, no dialog
this.fetchDataAsync()
    .catchDefault({alertType: 'toast'});            // show toast instead of dialog
```

#### catchWhen / catchDefaultWhen

Selectively catch exceptions by name or predicate, re-throwing anything that doesn't match:

```typescript
// Catch by exception name — handler is optional, omit to silently swallow
fetchAsync()
    .catchWhen('AbortException');              // swallow aborts, return undefined

// Catch by predicate
fetchAsync()
    .catchWhen(
        e => e.httpStatus === 404,
        () => this.showNotFound()
    );

// Catch with default handler, only for specific exceptions
fetchAsync()
    .catchDefaultWhen('AbortException', {showAlert: false});
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

// In a model — TaskObserver typically defined as a @managed property
@managed loadTask = TaskObserver.trackLast();

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

The most common promise chain in Hoist applications — load data, link to a mask, track for
monitoring, and handle errors:

```typescript
async doLoadAsync() {
    return XH.fetchService
        .fetchJson({url: 'api/positions'})
        .thenAction(data => this.updatePositions(data))
        .linkTo(this.loadTask)
        .track('Loaded positions')
        .catchDefault();
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

### Forgetting `catchDefault()`

Unhandled promise rejections produce browser warnings and bypass Hoist's exception logging.
Always end promise chains with `.catchDefault()` unless the caller explicitly handles errors.

### `catchDefault` order matters

`catchDefault()` should be the *last* handler in the chain. Placing it before `.track()` means
tracking won't capture failures. The standard order is:
`.linkTo()` → `.track()` → `.catchDefault()`.

### `thenAction` vs `async/await`

Inside an `@action`-decorated `async` method, all synchronous code between `await` calls runs
within an action context automatically. `thenAction` is only needed in raw `.then()` chains.

## Related Packages

- [`/utils/async/`](../utils/README.md#async-utilities) — Timer and non-blocking loop utilities
- [`/core/`](../core/README.md) — TaskObserver, TrackOptions, ExceptionHandlerOptions,
  XH.handleException
- [`/mobx/`](../mobx/README.md) — MobX `action` used by `thenAction`
