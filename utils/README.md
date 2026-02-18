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

Timer implements `destroy()` and should typically be installed on a `@managed` model property
so it is automatically cancelled when the owning model is destroyed.

```typescript
import {Timer, SECONDS} from '@xh/hoist/utils/support';

// Poll for updates every 30 seconds — @managed ensures cleanup
@managed timer = Timer.create({
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

Non-blocking loop utilities that periodically yield to the browser, preventing UI freezes
during tight synchronous loops that would otherwise hold the thread until completion:

```typescript
import {forEachAsync} from '@xh/hoist/utils/async';

// Process large array without blocking the UI — the loop body is synchronous,
// but forEachAsync yields to the browser every 50ms (default) between iterations
await forEachAsync(records, (record) => {
    processRecord(record);
}, {waitAfter: 50});
```

## DateTime Utilities

Import from `@xh/hoist/utils/datetime`.

### Time Constants

Named constants for common duration calculations. Use these with `Timer`, `olderThan()`,
and other duration-based APIs:

```typescript
import {SECONDS, MINUTES, HOURS, ONE_MINUTE, ONE_HOUR} from '@xh/hoist/utils/datetime';

Timer.create({runFn: myFn, interval: 30, intervalUnits: SECONDS});

if (olderThan(lastFetch, 5 * MINUTES)) { /* ... */ }
```

| Constant | Value | Use |
|----------|-------|-----|
| `MILLISECONDS` | `1` | Multiplier for ms-based APIs |
| `SECONDS` | `1000` | Multiplier for second-based intervals |
| `MINUTES` | `60000` | Multiplier for minute-based intervals |
| `HOURS` | `3600000` | Multiplier for hour-based intervals |
| `DAYS` | `86400000` | Multiplier for day-based intervals |
| `ONE_SECOND` ... `ONE_DAY` | (as above) | Aliases for readability when used directly (e.g. `wait(ONE_MINUTE)`) |

### olderThan

Check if a timestamp has aged past a threshold:

```typescript
import {olderThan, ONE_MINUTE} from '@xh/hoist/utils/datetime';

// Returns true if lastRefresh is more than 5 minutes ago (or null)
if (olderThan(lastRefresh, 5 * MINUTES)) {
    await this.refreshAsync();
}
```

### LocalDate

An immutable date class that explicitly excludes time and timezone information — the
client-side equivalent of Java's `LocalDate`. Useful for business-day and calendar-day data
where time zone should be explicitly ignored (e.g. trade dates, birthdays, holidays).

#### Memoization and Equality

Instances are memoized: only one object is ever created for a given calendar day. This enables
strict equality checks with `===`, making LocalDate safe to use as a Map key or in identity
comparisons:

```typescript
const a = LocalDate.get('2025-12-25');
const b = LocalDate.get('2025-12-25');
a === b;  // true — same instance

// Use as a Map key with confidence
const tradesByDate = new Map<LocalDate, Trade[]>();
tradesByDate.set(tradeDate, trades);
tradesByDate.get(LocalDate.get('2025-09-15'));  // works — same reference
```

#### Factory Methods

Always use factory methods — never `new`. The primary factory is `get()`, which accepts
`YYYY-MM-DD` or `YYYYMMDD` format strings. This is the standard way to create a LocalDate
from serialized server-side data:

```typescript
import {LocalDate} from '@xh/hoist/utils/datetime';

// get() — preferred. Accepts explicit date-only string formats
const maturity = LocalDate.get('2025-09-15');
const sameDay = LocalDate.get('20250915');       // YYYYMMDD also supported

// from() — accepts any moment-parseable input, including ISO timestamps.
// Use when parsing dates from external sources where the format may vary
const fromTimestamp = LocalDate.from('2025-09-15T14:30:00Z');  // time/zone discarded

// Convenience factories
const today = LocalDate.today();
const appDay = LocalDate.currentAppDay();       // current day in app timezone
const serverDay = LocalDate.currentServerDay(); // current day in server timezone
```

#### Properties and Manipulation

All manipulation methods return new (memoized) LocalDate instances. Methods can be chained:

```typescript
const maturity = LocalDate.get('2025-09-15');
maturity.isoString;       // '2025-09-15'
maturity.dayOfWeek();     // 'Monday'
maturity.isWeekday;       // true

// Chain manipulation methods
maturity
    .subtract(5, 'days')   // 2025-09-10
    .nextWeekday()         // 2025-09-11
    .startOfMonth();       // 2025-09-01

// Business day navigation
maturity.nextWeekday();          // skip weekends
maturity.addWeekdays(5);         // advance 5 business days
maturity.currentOrNextWeekday(); // same day if weekday, else next Monday

// Comparison
maturity.diff(LocalDate.today(), 'days');

// Serializes as 'YYYY-MM-DD' via toJSON() — pass directly in fetch params
const startDate = LocalDate.today().startOfMonth();
XH.fetchJson({url: 'api/trades', params: {startDate}});
```

## JavaScript Utilities

Import from `@xh/hoist/utils/js`.

### Decorators

Hoist uses **legacy (Stage 2) decorators** via Babel (configured in `hoist-dev-utils`), with
TypeScript's `experimentalDecorators` flag enabled. This is the `(target, key, descriptor)`
API, not the newer TC39 Stage 3 standard. Most application code simply uses the decorators
below, but anyone writing a custom decorator must use the legacy signature.

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
All `HoistBase` subclasses (models, services) get these as instance methods, automatically
prepending the class name as a source label:

```typescript
// In a HoistModel or HoistService — class name prepended automatically
this.logInfo('Loaded', positions.length, 'positions');
// → [PortfolioModel] | Loaded | 2847 | positions

this.logWarn('Stale data — last refresh was', minutesAgo, 'minutes ago');
// → [PortfolioModel] | Stale data — last refresh was | 12 | minutes ago

this.logDebug('Filter applied:', filter);
// → (no output at default log level — zero overhead)
```

#### Timed Execution

`withInfo()` and `withDebug()` wrap a function call with automatic timing. They work with
both sync and async functions, logging elapsed time on completion:

```typescript
// Time an async load — returns the result of the function
const data = await this.withInfo('Loading positions', () => {
    return XH.fetchService.fetchJson({url: 'api/positions'});
});
// → [PortfolioModel] | Loading positions | 342ms

// withDebug for lower-priority timing — no logging overhead at default level
this.withDebug('Filtering records', () => {
    this.applyFilters();
});
```

#### Log Levels

Levels ranked by severity: `error` > `warn` > `info` (default minimum) > `debug`.

Messages below the current minimum level are completely skipped — `logDebug()` and
`withDebug()` calls incur no formatting or output overhead at the default `info` level.
Use them freely to instrument code without worrying about production performance.

Adjust the level at runtime via the `XH` singleton:

```typescript
// Lower level to see debug output (resets on page refresh)
XH.setLogLevel('debug');

// Persist to localStorage for 30 minutes (survives refresh, max 1440 mins)
XH.setLogLevel('debug', 30);

// Convenience shortcut
XH.enableDebugLogging();        // equivalent to XH.setLogLevel('debug')
XH.enableDebugLogging(60);      // with persistence

// Check current level
XH.logLevel;                    // 'info' | 'debug' | 'warn' | 'error'
```

#### Standalone Usage

The logging functions can also be imported directly for use outside of `HoistBase` classes.
Pass a source label as the last argument:

```typescript
import {logInfo, logWarn, withInfo} from '@xh/hoist/utils/js';

logInfo('Cache cleared', 'MyCacheHelper');
// → [MyCacheHelper] | Cache cleared

warnIf(!config.apiKey, 'No API key configured — requests will fail');
```

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

| Hook | Description |
|------|-------------|
| `useOnMount(fn)` | Run once after component mounts |
| `useOnUnmount(fn)` | Run once after component unmounts |
| `useOnResize(fn, opts?)` | Run when element resizes. Returns a callback ref. Supports `debounce` option |
| `useOnVisibleChange(fn)` | Run when element visibility changes (0-size detection). Returns a callback ref |
| `useOnScroll(fn)` | Run on element scroll events. Returns a callback ref |
| `useCached(value, equalsFn)` | Return cached value if equality function returns true — provides stable references across renders |

#### useOnResize

Returns a callback ref — place it on the element to observe. The callback receives
a `DOMRectReadOnly` with the element's dimensions. A common pattern is tracking width to
switch between compact and full layouts:

```typescript
const myWidget = hoistCmp.factory<MyWidgetModel>({
    render({model}) {
        return panel({
            item: model.compactMode ? compactView() : fullView(),
            ref: useOnResize(({width}) => model.onResize(width))
        });
    }
});
```

#### useOnVisibleChange

Returns a callback ref that fires when an element's visibility changes (based on 0-size
detection). Useful for pausing expensive work (e.g. polling, rendering) when a component
is hidden in an inactive tab or collapsed panel:

```typescript
// Component — wire visibility into the model
const priceFeed = hoistCmp.factory<PriceFeedModel>({
    render({model}) {
        return panel({
            ref: useOnVisibleChange(visible => model.visible = visible),
            item: grid()
        });
    }
});

// Model — react to visibility changes
class PriceFeedModel extends HoistModel {
    @bindable visible = false;

    override onLinked() {
        this.addReaction({
            track: () => this.visible,
            run: visible => {
                if (visible) {
                    this.subscribeToPrices();
                } else {
                    this.unsubscribeFromPrices();
                }
            }
        });
    }
}
```

Both hooks can be composed together via `composeRefs` when a component needs to track
both resize and visibility:

```typescript
import composeRefs from '@seznam/compose-react-refs';

const ref = composeRefs(
    useOnVisibleChange(v => model.visible = v),
    useOnResize(({width}) => model.width = width)
);
return panel({ref, item: body()});
```

### Layout Prop Utilities

Split Hoist layout props (margin, padding, flex, dimensions) from non-layout props.
Used internally by Hoist components but available for custom components:

```typescript
import {getLayoutProps, getNonLayoutProps} from '@xh/hoist/utils/react';

const layoutStyle = getLayoutProps(props);   // {flex: 1, padding: 10, ...}
const restProps = getNonLayoutProps(props);   // everything else
```

Numeric layout prop values are automatically converted to pixel strings (e.g. `10` → `'10px'`).

See [`/cmp/layout/` — Layout Props (BoxProps)](../cmp/layout/README.md#layout-props-boxprops)
for the full list of supported props and conversion details.

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
is lowered via `XH.setLogLevel('debug')` or `XH.enableDebugLogging()`. This is a performance
feature, not a bug.

## Related Packages

- [`/promise/`](../promise/README.md) — Promise extensions (`catchDefault`, `track`, `linkTo`,
  `timeout`) that complement the async utilities here
- [`/mobx/`](../mobx/README.md) — MobX integration including `@bindable` decorator
- [`/core/`](../core/README.md) — HoistBase (provides `logInfo()`/`addAutorun()` delegates),
  decorators reference
- [`/format/`](../format/README.md) — Formatting utilities for numbers, dates, and display
