# Coding Conventions

## Overview

This document catalogs the coding conventions used throughout hoist-react. It is written for both
AI coding assistants generating hoist-react code and developers contributing to the library or
building applications with it. The conventions here reflect established patterns in the codebase —
they should be followed for consistency, but are not all mechanically enforced.

Where possible, conventions are enforced by tooling (ESLint, Prettier, TypeScript compiler). This
document focuses on conventions that go beyond what tooling catches — patterns that are followed by
convention rather than configuration.

## Principles

These higher-level principles guide coding decisions across the codebase. The specific conventions
in later sections are expressions of these values.

### Don't Repeat Yourself

Extract shared logic rather than duplicating it. When the same pattern appears in multiple places,
factor it into a utility, base class method, or shared helper. That said, balance DRY against
readability — three similar lines of code can be clearer than a premature abstraction. Extract
when there is a genuine, stable pattern — not when two blocks of code happen to look alike today.

### Clear, Descriptive Naming

Choose variable, method, and class names that are clear and descriptive without being verbose.
Names should convey intent and read naturally:

```typescript
// ✅ Clear and descriptive
const selectedRecord = store.getById(id);
const isEditable = !this.readonly && record.status === 'DRAFT';

// ❌ Too terse
const r = store.getById(id);
const e = !this.readonly && record.status === 'DRAFT';

// ❌ Overly verbose
const theCurrentlySelectedRecordFromTheStore = store.getById(id);
```

### Prefer Lodash for Utility Operations

Use lodash for collection and object utilities — it provides null-safe, battle-tested
implementations that aid readability. Prefer native JS only when it is equally expressive:

```typescript
// ✅ Native JS when equally clear
const names = users.map(u => u.name);
records.forEach(r => r.validate());
const active = items.filter(it => it.isActive);

// ✅ Lodash when it adds clarity or handles edge cases
import {isEmpty, groupBy, cloneDeep, castArray, compact} from 'lodash';

if (isEmpty(records)) return;                    // null-safe, works on objects too
const byStatus = groupBy(records, 'status');     // no native equivalent
const copy = cloneDeep(config);                  // deep clone
const items = castArray(itemOrItems);            // normalize to array
const valid = compact(results);                  // remove falsy values
```

### Keep Code Concise

Favor direct, compact expression over verbose or ceremonial patterns. Hoist's own utilities
(`withDefault`, `throwIf`, `catchDefault`, element factories) exist to reduce boilerplate —
use them. When standard JS provides a clean solution, prefer that over a more elaborate
construction.

## Tooling-Enforced Style

The following config files define mechanically enforced style rules. Do not duplicate these rules
in code reviews or conventions discussions — the tooling handles them:

- **`.prettierrc.json`** — Formatting: single quotes, 4-space indent (2 for SCSS/JSON), 100-char
  print width, trailing commas off, arrow parens avoided
- **`eslint.config.js`** — Linting: `@xh/eslint-config` base rules + TSDoc syntax checking via
  `eslint-plugin-tsdoc` + Prettier integration
- **`tsconfig.json`** — TypeScript: `experimentalDecorators`, `noImplicitOverride`,
  `useDefineForClassFields`, `moduleResolution: "bundler"`, ES2022 target
- **`.stylelintrc.json`** — SCSS linting (if present)

Run `yarn lint` to check all rules. Run `yarn lint:code` for JS/TS only or `yarn lint:styles`
for SCSS only.

## Imports

### Import Ordering

When writing new code, prefer organizing imports in three groups separated by blank lines:

1. **External libraries** — third-party packages (`react`, `lodash`, `classnames`)
2. **`@xh/hoist` packages** — framework imports using the `@xh/hoist/` path alias
3. **Relative imports** — local files using `./` or `../` paths

This is a soft recommendation, not a strict rule — existing files are not always consistent.
No need to reformat existing imports, but new code benefits from the clarity:

```typescript
// External libraries
import classNames from 'classnames';
import {castArray, isEmpty, isNil} from 'lodash';
import {ReactNode} from 'react';

// @xh/hoist packages
import {frame, vbox} from '@xh/hoist/cmp/layout';
import {HoistModel, hoistCmp, uses, XH} from '@xh/hoist/core';
import {Store} from '@xh/hoist/data';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';

// Relative imports
import {MyHelper} from './impl/MyHelper';
import './MyComponent.scss';
import {MyModel} from './MyModel';
```

### Named Imports

Always use named imports. Lodash is imported from `'lodash'` (not per-function subpaths like
`'lodash/isEmpty'`). MobX decorators and utilities are imported from `'@xh/hoist/mobx'`
(not directly from `'mobx'`) — Hoist's MobX module re-exports the public API with additional
enhancements.

```typescript
// ✅ Do: Import from top-level lodash
import {isEmpty, isNil, castArray} from 'lodash';

// ❌ Don't: Import from lodash subpaths
import isEmpty from 'lodash/isEmpty';

// ✅ Do: Import MobX through Hoist's re-export
import {observable, action, computed} from '@xh/hoist/mobx';

// ❌ Don't: Import MobX directly
import {observable} from 'mobx';
```

### Type Imports

Use `import type` for type-only imports that are erased at compile time. This can be a standalone
`import type` statement or inline `type` qualifiers within a regular import:

```typescript
// Standalone type import
import type {ColDef, GridOptions} from '@xh/hoist/kit/ag-grid';

// Inline type qualifier within a value import
import {HoistModel, type PlainObject, XH} from '@xh/hoist/core';
```

### Barrel Exports

Packages expose their public API through `index.ts` barrel files using `export *`:

```typescript
// cmp/grid/index.ts
export * from './Grid';
export * from './GridModel';
export * from './GridSorter';
export * from './columns';
export * from './filter/GridFilterModel';
```

Consumers import from the package path, not from individual files:

```typescript
// ✅ Do: Import from the package barrel
import {GridModel, Column} from '@xh/hoist/cmp/grid';

// ❌ Don't: Import from internal file paths
import {GridModel} from '@xh/hoist/cmp/grid/GridModel';
```

## TypeScript Usage

### `interface` vs `type`

Prefer `interface` for object shapes (configs, props, specs). Use `type` for unions, intersections,
mapped types, and other type-level operations:

```typescript
// Interface for object shapes
interface GridConfig {
    columns: Column[];
    store: Store;
    sortBy?: string;
}

// Type for unions and utility types
type SortDirection = 'asc' | 'desc';
type Awaitable<T> = T | Promise<T>;
```

### `any` Usage

`any` is used in Hoist where strict typing would be impractical — particularly for generic
framework APIs, decorator implementations, and interop with loosely-typed third-party libraries.
This is intentional and pragmatic. Do not add `any` where a more specific type is readily available,
but do not over-engineer types for internal plumbing where `any` keeps code readable.

### Generics

Use single uppercase letters for generic type parameters (`T`, `S`, `M`). Use descriptive names
when a class has multiple related type parameters:

```typescript
class Store<T extends StoreRecord = StoreRecord> { ... }
```

### `override` Keyword

TypeScript's `override` keyword is required when overriding base class methods —
`noImplicitOverride` is enabled in `tsconfig.json`:

```typescript
class MyModel extends HoistModel {
    override onLinked() { ... }
    override async doLoadAsync(loadSpec: LoadSpec) { ... }
}
```

### `declare config`

Models use TypeScript's `declare` keyword to narrow the inherited `config` property to their
specific config type. This is always the first member in the class body:

```typescript
export class PanelModel extends HoistModel {
    declare config: PanelConfig;

    // ... rest of class
}
```

### `readonly`

Use `readonly` for properties set once in the constructor and never reassigned:

```typescript
readonly collapsible: boolean;
readonly resizable: boolean;
readonly side: BoxSide;
```

### No `I` Prefix

Do not prefix interface names with `I`. Use descriptive names like `Config`, `Props`, `Spec`,
`Options`:

```typescript
// ✅ Do
interface PanelConfig { ... }
interface GridProps { ... }

// ❌ Don't
interface IPanelConfig { ... }
```

## Naming Conventions

### Files

- **PascalCase** for files containing a primary class or component export (`GridModel.ts`,
  `Panel.ts`, `FetchService.ts`)
- **camelCase** for utility files and internal helpers (`index.ts`, `impl/ResizeContainer.ts`)

### Interfaces and Types

- **`Config`** suffix for model/class constructor option types (`PanelConfig`, `GridConfig`)
- **`Props`** suffix for React component prop types (`PanelProps`, `GridProps`)
- **`Spec`** suffix for declarative configuration objects (`DashViewSpec`, `FieldSpec`,
  `LoadSpec`)
- **`Options`** suffix for optional parameter bundles (`GridAutosizeOptions`, `SearchOptions`)

### Methods

- **`Async` suffix** for methods returning Promises (`doLoadAsync`, `refreshAsync`,
  `deleteRecordAsync`, `completeAuthAsync`)

### Private Members

Use the `private` keyword for internal properties not intended for external use:

```typescript
private committed: RecordSet;
private dataDefaults = null;
private fieldMap: Map<string, Field>;
```

### Constants

- **`UPPER_SNAKE_CASE`** for true constants and enum-like values (`MINUTES`, `MILLISECONDS`)

### Framework Prefixes

- **`xh`** prefix for CSS classes, custom properties, and framework-level identifiers (`xh-panel`,
  `xh-grid`, `--xh-panel-bg`)
- **`XH`** for the framework singleton entry point

## Class Structure

### Member Ordering

Hoist classes follow a canonical ordering for readability and consistency. Not every class has
all sections, but when present they appear in this order:

1. **Static members** — static properties and methods
2. **`declare config`** — TypeScript config type declaration
3. **Immutable properties** — `readonly` properties set in constructor
4. **`@managed` properties** — child objects with managed lifecycle
5. **Observable state** — `@observable` and `@bindable` properties
6. **Computed getters** — `@computed` derived state
7. **Constructor** — initialization logic
8. **Lifecycle hooks** — `onLinked`, `afterLinked`, `doLoadAsync`, `destroy`
9. **Public methods** — `@action` methods and public API
10. **Private implementation** — `private` properties and internal helpers

### Section Dividers

Use comment dividers to separate logical sections within a class. The format is a line of dashes
inside a comment block:

```typescript
export class MyModel extends HoistModel {
    declare config: MyModelConfig;

    //-----------------------
    // Immutable Properties
    //-----------------------
    readonly name: string;
    readonly sortable: boolean;

    //---------------------
    // Observable State
    //---------------------
    @observable selectedId: string = null;
    @bindable filter: string = '';

    constructor(config: MyModelConfig) {
        super();
        makeObservable(this);
        // ...
    }

    //-----------------
    // Actions
    //-----------------
    @action
    setSelectedId(id: string) { ... }

    //-----------------
    // Implementation
    //-----------------
    private refreshData() { ... }
}
```

The exact number of dashes is not significant — match the approximate width of the section label
for visual balance.

### Constructor Pattern

Model constructors call `super()`, then `makeObservable(this)`, then initialize properties from
config:

```typescript
constructor(config: MyModelConfig) {
    super();
    makeObservable(this);
    const {name, sortable = true, defaultFilter = ''} = config;
    this.name = name;
    this.sortable = sortable;
    this.filter = defaultFilter;
}
```

### Model vs Service

- **Models** (`HoistModel`) — stateful, often multiple instances, lifecycle tied to component tree.
  Hold observable state, support loading/refresh, persist UI state.
- **Services** (`HoistService`) — singletons, installed at app startup via
  `XH.installServicesAsync()`, accessed as `XH.myService`. Hold app-wide state and provide data
  access methods.

## Component Patterns

### `hoistCmp.withFactory` vs `hoistCmp.factory`

**Library components** use `hoistCmp.withFactory`, which returns a `[Component, factory]` pair.
The PascalCase name is the React component (exported for JSX usage); the camelCase name is the
element factory for functional-style rendering:

```typescript
// Library/public component — exports both Component and factory
export const [MyPanel, myPanel] = hoistCmp.withFactory<MyPanelProps>({
    displayName: 'MyPanel',
    model: uses(MyPanelModel),
    className: 'xh-my-panel',

    render({model, className, ...props}, ref) {
        return frame({
            className,
            ref,
            item: grid({model: model.gridModel}),
            bbar: toolbar(
                button({text: 'Refresh', onClick: () => model.refreshAsync()})
            )
        });
    }
});
```

**Application components and internal implementation components** typically use `hoistCmp.factory`,
which returns only the element factory. Since these components are rendered via factory calls (not
JSX), the PascalCase React component is not needed:

```typescript
// App or impl component — only the factory is used
const myDetail = hoistCmp.factory<MyDetailProps>({
    displayName: 'MyDetail',
    model: uses(MyDetailModel),

    render({model}) {
        return vbox(
            label(model.title),
            grid({model: model.gridModel})
        );
    }
});
```

### Model Binding

The `model` option in `hoistCmp.withFactory` declares how a component finds its model:

- **`uses(ModelClass)`** — looks up or creates a model of the given class
- **`uses(ModelClass, {fromContext: false})`** — always creates a new model (no context lookup)
- **`false`** — component has no model association

### Local Models

The `useLocalModel` hook creates a model tied to the lifecycle of a component that will not be
discoverable to child components. This is useful when a component needs internal state specific to
a single instance or otherwise irrelevant to the primary model.

Prefer the name **`impl`** for local models.

```typescript
render({model, className, ...rest}, ref) {
    const impl = useLocalModel(GroupingChooserLocalModel),
        {value, allowEmpty} = model,
        {editorIsOpen} = impl;
    // ...
}
```

### `displayName`

Always set `displayName` on components. It appears in React DevTools and error messages. It should
match the PascalCase export name.

### Element Factories vs JSX

Hoist strongly prefers element factory calls over JSX. Factories are functions that take a config
object with an `item`/`items` key for children:

```typescript
// ✅ Preferred: Element factory style
panel({
    title: 'Users',
    items: [grid({model: gridModel})],
    bbar: toolbar(button({text: 'Save'}))
})

// Also supported: JSX style (rarely used by XH)
<Panel title="Users" bbar={<Toolbar><Button text="Save" /></Toolbar>}>
    <Grid model={gridModel} />
</Panel>
```

Factories also accept children as direct arguments when no other props are needed:

```typescript
hbox(leftPanel(), rightPanel())
```

## Export Patterns

### Named Exports Only

All exports are named. Default exports are not used:

```typescript
// ✅ Do: Named exports
export class GridModel extends HoistModel { ... }
export const [Grid, grid] = hoistCmp.withFactory({ ... });

// ❌ Don't: Default exports
export default class GridModel { ... }
```

### Component Export Pairs

Library components export both the PascalCase component and camelCase factory via
`hoistCmp.withFactory`. The PascalCase form ensures the component is available for JSX usage:

```typescript
export const [Panel, panel] = hoistCmp.withFactory({ ... });
export const [Grid, grid] = hoistCmp.withFactory({ ... });
```

Application and internal implementation components typically export only the factory via
`hoistCmp.factory`, since they are rendered via factory calls rather than JSX.

## Variable Declarations

### Multi-Variable `const`

When declaring multiple related variables, use comma-separated `const` declarations. This is
particularly common when destructuring alongside additional computed variables:

```typescript
const {store, treeMode, filterModel} = model,
    impl = useLocalModel(GridLocalModel),
    maxDepth = impl.isHierarchical ? store.maxDepth : null,
    container = enableFullWidthScroll ? vframe : frame;
```

This pattern keeps related declarations together as a single logical group.

## Null and Undefined

### `null` Preferred

Hoist uses `null` (not `undefined`) as the conventional "no value" sentinel for observable
properties and return values. Properties are initialized to `null` rather than left `undefined`:

```typescript
@observable selectedId: string = null;
@observable.ref lastResponse: Response = null;
```

### `== null` Pattern

Use loose equality (`== null` / `!= null`) when checking for both `null` and `undefined`.
This is an intentional exception to the general `===` preference — the codebase uses `== null`
extensively (~700 occurrences) for concise null-or-undefined checking:

```typescript
// ✅ Do: Loose equality for null/undefined checks
if (value == null) return defaultValue;
if (record != null) process(record);

// ❌ Don't: Verbose alternative
if (value === null || value === undefined) return defaultValue;
```

### Utility Functions

- **`isNil(value)`** — lodash function, equivalent to `value == null`. Used when the check reads
  more naturally as a predicate (e.g., in conditions with other `is*` checks)
- **`withDefault(...args)`** — returns the first argument that is not `undefined`. Useful for
  providing fallback values from config where `null` is a valid, intentional value that should
  be respected (not treated as "missing"):

```typescript
this.sortable = withDefault(sortable, true);
```

## Comments and Documentation

### Copyright Header

Every `.ts` and `.js` source file begins with the copyright header:

```typescript
/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
```

The year reflects the current copyright year. This header is required for all files in the
hoist-react package. Application code does not use this header.

### Section Dividers

See [Class Structure > Section Dividers](#section-dividers) above. Comment dividers are also used
at the module level to separate groups of related functions or constants.

### TSDoc

Public APIs use TSDoc comments (`/** ... */`). TSDoc syntax is checked by ESLint
(`eslint-plugin-tsdoc`). Use `@param`, `@returns`, `@see`, and `@throws` tags as appropriate:

```typescript
/**
 * Load data into the store, replacing any existing records.
 *
 * @param rawData - array of plain objects to load as records.
 * @param rawSummaryData - optional summary row data.
 */
loadData(rawData: PlainObject[], rawSummaryData?: PlainObject) { ... }
```

### Observable Annotation Comments

When a property's observable behavior is significant to callers, annotate it in a comment:

```typescript
/** Currently selected record, or null if none. (observable) */
@observable.ref selectedRecord: StoreRecord = null;
```

### Step-Numbered Comments

For multi-step processes, use numbered comments to guide readers through the sequence:

```typescript
// 1) Parse the raw response into records
const records = this.parseResponse(raw);
// 2) Apply client-side filters
const filtered = this.applyFilters(records);
// 3) Update the store
this.store.loadData(filtered);
```

## Async Patterns

### `async/await`

Always use `async/await` over raw Promise chains. Methods that return Promises are suffixed
with `Async`:

```typescript
async doLoadAsync(loadSpec: LoadSpec) {
    const data = await XH.fetchService
        .fetchJson({url: 'api/users'})
        .catchDefault();
    this.store.loadData(data);
}
```

### `await` vs `return` on the Last Line

Use `await` without `return` when the method performs work but has no meaningful return value.
Most Hoist async methods (`doLoadAsync`, `refreshAsync`, `deleteRecordAsync`) fall into this
category — they produce side effects, not return values:

```typescript
// ✅ Side-effect method — just await, no return
async doLoadAsync(loadSpec: LoadSpec) {
    const data = await XH.fetchService.fetchJson({url: 'api/users'});
    this.store.loadData(data);
}
```

Use `return` (without `await`) only when the resolved value is a meaningful part of the method's
API contract:

```typescript
// ✅ Method's job is to produce and return a value
async fetchUsersAsync(): Promise<User[]> {
    return XH.fetchService.fetchJson({url: 'api/users'});
}
```

**Avoid** `return await` — it is redundant in most cases. The one exception is inside a
`try/catch`, where `return await` is required for the local `catch` to handle rejections
(a plain `return` passes the promise through unwrapped, bypassing the `catch`).

### Promise Extensions

Hoist extends the Promise prototype with chainable methods. The most common:

- **`.catchDefault()`** — catches and passes to `XH.handleException()` with default options
- **`.track({model, category})`** — links to a `TaskObserver` for loading masks/indicators
- **`.timeout(ms)`** — rejects if not settled within the given time
- **`.linkTo(observable)`** — writes resolved value to an observable property

See [`/promise/README.md`](../promise/README.md) for the full API.

### `Timer.create()`

For recurring async operations, use `Timer.create()` with an interval:

```typescript
Timer.create({
    runFn: () => this.refreshAsync(),
    interval: 30 * SECONDS
});
```

## Error Handling

### `XH.handleException()`

The primary error handling API. Parses, logs, and displays exceptions. In general, pass exceptions
to the centralized handler rather than building custom error display logic. The exception is when
an external API returns errors with a structured shape that should be parsed and reformatted into
a useful message for the user — in that case, a wrapping layer that decodes the API-specific
exception before passing it to the handler is appropriate:

```typescript
try {
    await this.saveAsync();
} catch (e) {
    XH.handleException(e, {message: 'Failed to save record.'});
}
```

### `catchDefault()`

Chain `.catchDefault()` on promises to handle errors via `XH.handleException()` with framework
defaults. Use this only for **fire-and-forget** cases such as `onClick` handlers, where there is
no subsequent code that depends on the result:

```typescript
// ✅ Good: fire-and-forget handler — no code follows that depends on success
onSaveClick() {
    this.saveAsync().catchDefault();
}
```

**Avoid** `.catchDefault()` in model business logic — it swallows the exception and allows
execution to continue, which can leave variables undefined or state inconsistent. Use `try/catch`
with `XH.handleException()` instead when subsequent code depends on the operation succeeding.

### `throwIf()`

Use for precondition assertions that throw on violation:

```typescript
throwIf(!this.store, 'Store is required');
throwIf(this.readonly, 'Cannot edit in read-only mode');
```

### `catch (ignored)`

When a catch block intentionally discards the exception, name the parameter `ignored`:

```typescript
try {
    JSON.parse(raw);
} catch (ignored) {}
```

For full coverage of error handling patterns and options, see
[Error Handling](./error-handling.md).

## Logging

### Instance Methods

Classes extending `HoistBase` have logging methods that automatically include the class name
and instance ID in output:

```typescript
this.logInfo('Loading data for', this.store.count, 'records');
this.logDebug('Filter applied:', filter);
this.logWarn('Unexpected state:', state);
this.logError('Failed to process:', e);
```

### Standalone Functions

For logging outside a class context, use the standalone functions from `@xh/hoist/utils/js`:

```typescript
import {logInfo, logDebug, logWarn, logError} from '@xh/hoist/utils/js';

logInfo('Application started', 'App');
```

### Timed Wrappers

`withInfo()` and `withDebug()` wrap a function call, logging its duration. They work with both
synchronous and async functions:

```typescript
// Synchronous — logs duration of processing
const result = withDebug('Processing records', () => {
    return this.processRecords(raw);
});

// Async — logs duration including await time
const data = await withDebug('Loading grid data', async () => {
    return XH.fetchService.fetchJson({url: 'api/data'});
});
```

### Logging Decorators

`@logWithInfo` and `@logWithDebug` wrap a method to log its execution time:

```typescript
@logWithDebug
syncFromStore() {
    // ... method body is timed and logged at debug level
}
```

### `apiDeprecated()`

Logs a deprecation warning (once per session) for APIs being phased out:

```typescript
apiDeprecated('XH.appLoadModel', {
    msg: 'Use XH.appLoadObserver instead',
    v: '80'
});
```

## Equality

### `===` Default

Use strict equality (`===` / `!==`) for all comparisons except null checking. The codebase
enforces this consistently.

### `== null` Exception

The one sanctioned exception: use `== null` / `!= null` for null-or-undefined checks. This
pattern accounts for the vast majority of loose equality usage in the codebase. See
[Null and Undefined](#-null-pattern) above.

## CSS Class Naming

### `xh-` Prefix

All Hoist CSS classes are prefixed with `xh-`:

```scss
.xh-panel { ... }
.xh-grid { ... }
.xh-toolbar { ... }
```

### BEM-Style Naming

Hoist uses BEM-inspired naming for elements and modifiers:

- **Element separator `__`:** `.xh-panel__inner`, `.xh-panel-header__title`
- **Modifier separator `--`:** `.xh-grid--hierarchical`, `.xh-grid--flat`

```scss
.xh-panel {
    &__inner {
        flex: 1;
        background-color: var(--xh-panel-bg);
    }
}

.xh-grid {
    &--hierarchical { ... }
    &--flat { ... }
}
```

### CSS Variables

Hoist's theme is built on CSS variables (custom properties) using the `--xh-` prefix. Applications
can reference these variables for consistent theming but should not define new variables with the
`--xh-` prefix — that namespace is reserved for the library:

```scss
--xh-panel-bg
--xh-panel-border-color
--xh-intent-primary
--xh-grid-bg
```

## Key Source Files

These files are good references for the conventions described above:

| File | Demonstrates |
|------|-------------|
| [`core/HoistBase.ts`](../core/HoistBase.ts) | Base class, logging, MobX integration, lifecycle |
| [`core/model/HoistModel.ts`](../core/model/HoistModel.ts) | Model pattern, `declare config`, lifecycle hooks |
| [`core/HoistComponent.ts`](../core/HoistComponent.ts) | `hoistCmp.withFactory`, component definitions |
| [`desktop/cmp/panel/PanelModel.ts`](../desktop/cmp/panel/PanelModel.ts) | Class structure, section dividers, member ordering, observables |
| [`cmp/grid/GridModel.ts`](../cmp/grid/GridModel.ts) | Large model with full structure, imports, actions |
| [`cmp/grid/Grid.ts`](../cmp/grid/Grid.ts) | Component with factory pattern, multi-var const |
| [`.prettierrc.json`](../.prettierrc.json) | Formatting rules |
| [`eslint.config.js`](../eslint.config.js) | Lint configuration |
| [`tsconfig.json`](../tsconfig.json) | TypeScript compiler options |
