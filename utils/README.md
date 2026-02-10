# Utils Package

## Overview

The `/utils/` package provides general-purpose utilities used throughout hoist-react and Hoist
applications. These are organized into five sub-packages by domain:

```
/utils/
├── async/       # Async iteration, Timer
├── datetime/    # Time constants, LocalDate
├── js/          # Language helpers, decorators, logging, DOM, versioning
├── react/       # React hooks, layout props, class names, observable refs
└── impl/        # Internal helpers (not for application use)
```

All public exports are available via their sub-package path (e.g. `@xh/hoist/utils/js`) or
through the top-level `@xh/hoist/utils/support` barrel export.

## Async Utilities

Import from `@xh/hoist/utils/async`.

### Timer

`Timer` is a promise-aware recurring task runner designed for polling, auto-refresh, and
scheduled operations. It prevents overlapping executions and handles failures gracefully.

```typescript
import {Timer, SECONDS} from '@xh/hoist/utils/support';

// Poll for updates every 30 seconds
const timer = Timer.create({
    runFn: () => this.refreshDataAsync(),
    interval: 30,
    intervalUnits: SECONDS,
    delay: true        // wait one interval before first run
});

// Dynamic interval from an AppConfig key — re-evaluated after each run
Timer.create({
    runFn: () => this.syncAsync(),
    interval: 'syncIntervalSecs',   // looked up via XH.configService
    intervalUnits: SECONDS,
    timeout: 60,
    timeoutUnits: SECONDS
});

// Change interval at runtime, or pause with <= 0
timer.setInterval(60);

// Cancel permanently
timer.cancel();
```

| Config | Description |
|--------|-------------|
| `runFn` | Function to execute. Return a Promise for async tasks to prevent overlapping runs |
| `interval` | Interval between runs in ms. Can be a number, a `() => number` function, or a string AppConfig key for dynamic lookup. Values `<= 0` pause the timer |
| `timeout` | Timeout for each run (default 3 minutes). Same dynamic value support as `interval`. Set to `null` for no timeout |
| `intervalUnits` | Unit multiplier for `interval` (default `MILLISECONDS`) |
| `timeoutUnits` | Unit multiplier for `timeout` (default `MILLISECONDS`) |
| `delay` | Initial delay in ms. `true` uses the interval value, `false` (default) runs immediately |

### forEachAsync / whileAsync

Non-blocking loop utilities that yield to the browser between iterations, preventing UI freezes
during long-running client-side processing:

```typescript
import {forEachAsync} from '@xh/hoist/utils/async';

// Process large array without blocking the UI
await forEachAsync(records, async (record) => {
    await processRecord(record);
}, {waitAfter: 50});  // yield every 50ms (default)
```

## DateTime Utilities

Import from `@xh/hoist/utils/datetime`.

### Time Constants

Named constants for common duration calculations. Use these with `Timer`, `olderThan()`,
and other duration-based APIs:

```typescript
import {SECONDS, MINUTES, HOURS, ONE_MINUTE, ONE_HOUR} from '@xh/hoist/utils/datetime';

Timer.create({runFn: myFn, interval: 30, intervalUnits: SECONDS});

if (olderThan(lastFetch, 5 * ONE_MINUTE)) { /* ... */ }
```

| Constant | Value | Use |
|----------|-------|-----|
| `MILLISECONDS` | `1` | Multiplier for ms-based APIs |
| `SECONDS` | `1000` | Multiplier for second-based intervals |
| `MINUTES` | `60000` | Multiplier for minute-based intervals |
| `HOURS` | `3600000` | Multiplier for hour-based intervals |
| `DAYS` | `86400000` | Multiplier for day-based intervals |
| `ONE_SECOND` ... `ONE_DAY` | (as above) | Aliases for the base multipliers |

### olderThan

Check if a timestamp has aged past a threshold:

```typescript
import {olderThan, ONE_MINUTE} from '@xh/hoist/utils/datetime';

// Returns true if lastRefresh is more than 5 minutes ago (or null)
if (olderThan(lastRefresh, 5 * ONE_MINUTE)) {
    await this.refreshAsync();
}
```

### LocalDate

An immutable date class that explicitly excludes time and timezone information — the
client-side equivalent of Java's `LocalDate`. Useful for business-day and calendar-day data
where time zone should be ignored.

Instances are memoized: `LocalDate.get('2025-01-15') === LocalDate.get('2025-01-15')` is `true`,
enabling strict equality checks.

```typescript
import {LocalDate} from '@xh/hoist/utils/datetime';

// Factory methods — always use these, never `new`
const date = LocalDate.get('2025-01-15');       // from ISO string (YYYY-MM-DD or YYYYMMDD)
const date2 = LocalDate.from(someMoment);       // from any moment-parseable input
const today = LocalDate.today();                // current local day
const appDay = LocalDate.currentAppDay();       // current day in app timezone
const serverDay = LocalDate.currentServerDay(); // current day in server timezone

// Properties
date.isoString;    // '2025-01-15'
date.timestamp;    // ms since epoch (midnight local)
date.isWeekday;    // true
date.isToday;      // false

// Manipulation — all methods return new LocalDate instances
date.add(5, 'days');         // 2025-01-20
date.subtract(1, 'months');  // 2024-12-15
date.nextWeekday();          // skip weekends
date.startOfMonth();         // 2025-01-01
date.diff(other, 'days');    // number of days between
```

**Avoid:** constructing LocalDate with `new` — always use the static factory methods
(`get()`, `from()`, `today()`) to benefit from memoization and equality guarantees.

## JavaScript Utilities

Import from `@xh/hoist/utils/js`.

### Decorators

Class method decorators for common patterns:

| Decorator | Description |
|-----------|-------------|
| `@debounced(ms)` | Debounce method execution by the specified duration. Per-instance (not per-class) |
| `@computeOnce` | Cache the result of a zero-argument method or getter lazily. Ideal for immutable objects (used extensively by `LocalDate`) |
| `@logWithInfo` | Wrap method with `withInfo()` — times execution and logs to `console.log` |
| `@logWithDebug` | Wrap method with `withDebug()` — times execution and logs to `console.debug` |
| `@enumerable` | Mark a getter as enumerable (getters default to non-enumerable) |
| `@abstract` | Method throws if called directly — must be overridden by subclass |
| `@sharePendingPromise` | Concurrent calls to a Promise-returning method with the same arguments share a single pending Promise. Arguments must be JSON-serializable |

```typescript
class MyModel extends HoistModel {
    // Debounce search as user types
    @debounced(300)
    onSearchChange() {
        this.loadResultsAsync();
    }

    // Share a single pending request across concurrent callers
    @sharePendingPromise
    async fetchDetailAsync(id: string) {
        return XH.fetchService.fetchJson({url: `detail/${id}`});
    }
}
```

### Logging

Managed, structured logging utilities providing level-aware, formatted console output.
`HoistBase` subclasses get these as instance methods (e.g. `this.logInfo()`), but they
can also be imported directly:

```typescript
import {logInfo, logWarn, logError, logDebug, withInfo} from '@xh/hoist/utils/js';

// Simple message with source label
logInfo('Data loaded successfully', this);
// → [MyModel] | Data loaded successfully

// Time an async operation
const result = await withInfo('Loading portfolio', async () => {
    return this.fetchDataAsync();
}, this);
// → [MyModel] | Loading portfolio | 342ms

// Conditional logging
warnIf(!config.apiKey, 'No API key configured — requests will fail');
```

Log levels: `error` > `warn` > `info` (default minimum) > `debug`. Adjust at runtime via
`XH.setLogLevel('debug')` — optionally persisted to localStorage for a configurable duration.

### Language Utilities

General-purpose helpers for objects, arrays, and strings:

| Function | Description |
|----------|-------------|
| `getOrCreate(obj, key, fn)` | Get cached value from object/Map/WeakMap, creating via `fn` if absent |
| `withDefault(...args)` | Return the first defined argument (useful for multi-level fallback defaults) |
| `throwIf(condition, msg)` | Throw exception if condition is truthy |
| `deepFreeze(obj)` | Recursively freeze objects, arrays, Maps, and Sets |
| `trimToDepth(obj, depth)` | Deep-copy with depth limit — nested content beyond `depth` replaced with `{...}` or `[...]` |
| `pluralize(s, count?, includeCount?)` | Pluralize a word, optionally matching a count |
| `singularize(s)` | Convert plural to singular |
| `ordinalize(n)` | Add ordinal suffix: `1` → `'1st'`, `11` → `'11th'` |
| `mergeDeep(target, ...sources)` | Deep merge objects (like lodash `merge` but arrays are replaced, not merged) |
| `executeIfFunction(v)` | Execute if function, otherwise return the value directly. Works with `Thunkable<T>` |
| `ensureUnique(arr, msg?)` | Throw if array has duplicate values |
| `createSingleton(clazz)` | Instantiate and cache a singleton on the class — used by HoistService/AppModel |

### DOM Utilities

```typescript
import {observeResize, consumeEvent, elemWithin} from '@xh/hoist/utils/js';

// Observe element resizing with debounce
const observer = observeResize(
    (rect) => this.updateLayout(rect),
    myElement,
    {debounce: 100}
);

// Stop event propagation and prevent default in one call
consumeEvent(event);

// Check if click target is within a specific component
if (elemWithin(event.target, 'xh-grid-cell')) { /* ... */ }
```

### Version Utilities

For checking compatibility between hoist-react and hoist-core versions:

```typescript
import {checkMinVersion, checkVersion} from '@xh/hoist/utils/js';

checkMinVersion('71.2.0', '70.0.0');  // true — 71.x meets 70.x minimum
checkVersion('71.2.0', '70.0.0', '72.0.0');  // true — within range
```

### Test Utilities

Helpers for applying `data-testid` attributes for test automation:

```typescript
import {TEST_ID, getTestId} from '@xh/hoist/utils/js';

// getTestId(propsOrString, suffix?) → 'myComponent-header'
getTestId('myComponent', 'header');
```

## React Utilities

Import from `@xh/hoist/utils/react`.

### Hooks

Custom React hooks for DOM observation and lifecycle:

```typescript
import {useOnMount, useOnUnmount, useOnResize} from '@xh/hoist/utils/react';

const myCmp = hoistCmp.factory(() => {
    useOnMount(() => console.log('Mounted'));
    useOnUnmount(() => console.log('Cleaning up'));

    // Returns a callback ref — place on the element to observe
    const resizeRef = useOnResize(
        (rect) => model.setDimensions(rect.width, rect.height),
        {debounce: 100}
    );

    return box({ref: resizeRef, item: /* ... */});
});
```

| Hook | Description |
|------|-------------|
| `useOnMount(fn)` | Run once after component mounts |
| `useOnUnmount(fn)` | Run once after component unmounts |
| `useOnResize(fn, opts?)` | Run when element resizes. Returns a callback ref. Supports `debounce` option |
| `useOnVisibleChange(fn)` | Run when element visibility changes (0-size detection). Returns a callback ref |
| `useOnScroll(fn)` | Run on element scroll events. Returns a callback ref |
| `useCached(value, equalsFn)` | Return cached value if equality function returns true — provides stable references across renders |

### Layout Prop Utilities

Split Hoist layout props (margin, padding, flex, dimensions) from non-layout props.
Used internally by Hoist components but available for custom components:

```typescript
import {getLayoutProps, getNonLayoutProps} from '@xh/hoist/utils/react';

const layoutStyle = getLayoutProps(props);   // {flex: 1, padding: 10, ...}
const restProps = getNonLayoutProps(props);   // everything else
```

Numeric layout prop values are automatically converted to pixel strings (e.g. `10` → `'10px'`).

### Other React Utilities

| Function | Description |
|----------|-------------|
| `getClassName(baseName, props, ...extras)` | Combine a base CSS class with `props.className` and additional class names |
| `createObservableRef()` | Create a ref that works as both a React ref object and callback ref, with a MobX-observable `current` property |
| `elementFromContent(content, addProps?)` | Create a React element from a `Content` value (element, HoistComponent, or render function) |

## Common Pitfalls

### LocalDate `new` construction

Always use factory methods (`LocalDate.get()`, `LocalDate.from()`, `LocalDate.today()`). The
constructor is private and direct instantiation bypasses the memoization cache that enables
`===` equality checks.

### Timer minimum interval

`Timer` enforces a minimum interval of 500ms. Shorter intervals are automatically clamped with
a console warning.

### `@debounced` on class methods only

The `@debounced` decorator creates per-instance debounced functions. It cannot be applied to
standalone functions.

### `mergeDeep` array handling

Unlike lodash's `merge`, `mergeDeep` replaces arrays entirely rather than merging them
element-by-element. This is intentional — array merging produces unexpected results in most
Hoist config-merging scenarios.

### Logging level default

The default minimum log level is `info`, meaning `logDebug()` calls are no-ops until the level
is lowered via `XH.setLogLevel('debug')`. This is a performance feature, not a bug.

## Related Packages

- [`/promise/`](../promise/README.md) — Promise extensions (`catchDefault`, `track`, `linkTo`,
  `timeout`) that complement the async utilities here
- [`/mobx/`](../mobx/README.md) — MobX integration including `@bindable` decorator
- [`/core/`](../core/README.md) — HoistBase (provides `logInfo()`/`addAutorun()` delegates),
  decorators reference
- [`/format/`](../format/README.md) — Formatting utilities for numbers, dates, and display
