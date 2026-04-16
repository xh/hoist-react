# MobX Package

## Overview

The `/mobx/` package is Hoist's integration layer with [MobX](https://mobx.js.org/). It serves
three purposes:

1. **Re-exports** core MobX and mobx-react-lite APIs from a single Hoist import path
2. **Configures** MobX with `enforceActions: 'observed'` for the entire application
3. **Provides** the `@bindable` decorator for Hoist's model system

```
/mobx/
├── index.ts        # Re-exports + MobX configuration
└── decorators.ts   # @bindable decorator (TC39 accessor decorator)
```

All Hoist code imports MobX APIs from `@xh/hoist/mobx` rather than directly from `mobx`.
This ensures the `enforceActions` configuration is applied and `@bindable` support is available.

## Re-exported APIs

The following are re-exported from MobX and mobx-react-lite:

| Export | Source | Purpose |
|--------|--------|---------|
| `observable` | mobx | Mark properties as reactive state |
| `computed` | mobx | Derive cached values from observables |
| `action` | mobx | Mark methods that modify observable state |
| `runInAction` | mobx | Execute a block of code as an action |
| `autorun` | mobx | Run a side-effect whenever observed values change |
| `reaction` | mobx | Run a side-effect when a specific data expression changes |
| `when` | mobx | Run a side-effect once when a condition becomes true |
| `override` | mobx | Re-declare inherited observable/action annotations in subclasses |
| `toJS` | mobx | Convert observable data to plain JavaScript |
| `extendObservable` | mobx | Add observable properties to an existing object |
| `trace` | mobx | Debugging: log why a computed/reaction re-evaluated |
| `untracked` | mobx | Read observables without creating a dependency |
| `comparer` | mobx | Built-in equality comparers for computed values |
| `isObservableProp` | mobx | Check if a property is observable |
| `observer` | mobx-react-lite | HOC that makes React components reactive to observable changes |

## Action Enforcement

The package configures MobX with `enforceActions: 'observed'`, meaning any modification to
an observable property that is currently being observed must occur inside an `@action` method,
`runInAction()` block, or `@bindable` setter. MobX logs a warning if this rule is violated.

This enforcement prevents accidental state mutations and makes data flow predictable.

## @bindable Decorator

The `@bindable` decorator creates an observable `accessor` field with an automatically generated
setter method:

```typescript
import {HoistModel} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';

class PortfolioModel extends HoistModel {
    @bindable accessor selectedFund: string = null;
    @bindable accessor showInactive: boolean = false;
}
```

This creates:
- Observable properties `selectedFund` and `showInactive`
- Setter methods `setSelectedFund(value)` and `setShowInactive(value)` (MobX actions)

The `accessor` keyword is required — it transforms the field into a getter/setter pair that
TC39 decorators can intercept to add reactivity.

### @bindable vs @observable

Both decorators make properties reactive. Choose based on how the property is modified:

Use `@bindable` when a property is intended to be set freely from outside the model — the
generated setter is a MobX action, so external code can safely assign values without wrapping
in `runInAction`:

```typescript
// ✅ Direct assignment works — @bindable's setter is an action
model.selectedFund = 'Growth';

// Also works — but prefer direct assignment for auto-generated setters
model.setSelectedFund('Growth');
```

Use `@observable` when the model manages the property internally and is not expected to be
changed from outside, or when the model provides custom `@action` setters that include
additional logic (validation, side-effects, coordinated updates):

```typescript
class PortfolioModel extends HoistModel {
    // Internal state — updated only by the model's own methods
    @observable.ref accessor records: StoreRecord[] = [];

    // Custom setter with coordinated side-effects
    @observable.ref accessor activeFilter: Filter = null;

    @action
    setActiveFilter(filter: Filter) {
        this.activeFilter = filter;
        this.loadDataAsync();       // trigger reload as part of the update
    }

    @action
    updateRecords(data) {
        this.records = this.store.processedRecords;
    }
}
```

### @bindable.ref

Use `@bindable.ref` for properties where only reference changes should trigger reactions — not
deep mutations within the value. This uses `observable.ref` semantics under the hood:

```typescript
@bindable.ref accessor selectedRecord: StoreRecord = null;  // track reference only
@bindable.ref accessor dimensions: {width: number, height: number} = null;
```

### Setter Convention

If a class defines an explicit `setFoo()` method, call it — it likely contains additional logic
(validation, side-effects). For auto-generated `@bindable` setters, prefer direct assignment:

```typescript
// ✅ Do: direct assignment for auto-generated setters
model.showInactive = true;

// ✅ Do: call explicit setter when one is defined (it has extra logic)
model.setFilter(newFilter);   // e.g. triggers reload
```

## @computed Decorator

The `@computed` decorator marks a getter as a cached derived value. MobX tracks which observables
the getter reads and only re-evaluates it when those dependencies change. More importantly,
`@computed` only notifies downstream observers when the getter's **output** changes — not merely
when its inputs change. This output-gating behavior is the primary optimization `@computed`
provides and the main reason to use it.

### Reducing Re-renders

Consider a form model that aggregates dirty state across many fields:

```typescript
@computed
get isDirty(): boolean {
    return some(this.fields, f => f.isDirty);
}
```

Without `@computed`, every component that reads `isDirty` would re-render whenever *any* field's
dirty state changes — even if the overall result stays `true`. With `@computed`, MobX re-runs
the getter when a field changes, but only triggers re-renders if the boolean actually flips.
The computed acts as a firewall in the dependency graph, collapsing many fine-grained observable
changes into a single stable output.

This is especially valuable for:

- **Boolean aggregations** — combining many observable flags into one (`isDirty`, `isValid`,
  `canEdit`). The output is a single boolean that changes far less often than any individual input.
- **Filtered collections** — deriving a subset from an observable list. When used with
  `@computed.struct`, the output only changes when the actual contents change.
- **Multi-observable conditions** — combining several observables into a derived state that
  downstream components and reactions depend on.

```typescript
class TaskListModel extends HoistModel {
    @observable.ref accessor tasks: Task[] = [];
    @observable accessor filterText: string = '';
    @observable accessor showCompleted: boolean = false;

    // ✅ Good: combines three observables. Components that only care about
    // the filtered result won't re-render when an irrelevant filter changes.
    @computed
    get visibleTasks(): Task[] {
        let ret = this.tasks;
        if (this.filterText) {
            ret = ret.filter(t => t.name.includes(this.filterText));
        }
        if (!this.showCompleted) {
            ret = ret.filter(t => !t.completed);
        }
        return ret;
    }

    // ✅ Good: boolean derived from the computed above — changes far less
    // often than the underlying task list.
    @computed
    get hasVisibleTasks(): boolean {
        return !isEmpty(this.visibleTasks);
    }
}
```

### @computed.struct

By default, `@computed` uses reference equality (`===`) to compare old and new results. For
getters that return new object or array instances on each evaluation, use `@computed.struct` to
compare by structural equality instead:

```typescript
@computed.struct
get persistableColumnState(): ColumnState[] {
    return this.cleanColumnState(this.columnState);
}
```

This prevents reactions from firing when the getter produces a structurally identical result
even though the reference is new. Use sparingly — structural comparison has its own cost.

### When to Use Plain Getters Instead

Not every getter needs `@computed`. Plain getters are re-evaluated on every access but add no
MobX tracking overhead. Prefer plain getters when the output always changes whenever the input
changes (see [Common Pitfalls](#unnecessary-computed-on-simple-transformations) below) or when
the derivation is trivial and accessed from a single reactive context.

## Common Pitfalls

### Using `@observable` (deep) for non-primitives

MobX's default `@observable` applies deep observation, recursively wrapping nested properties
in proxies. This is rarely what you want for arrays, objects, or class instances. Use the `.ref`
variant instead:

```typescript
// ❌ Don't: deep observation wraps the array and its contents in proxies
@observable accessor items: Item[] = [];

// ✅ Do: ref observation tracks only the reference — no proxy wrapping
@observable.ref accessor items: Item[] = [];

// ✅ Primitives are fine with plain @observable — no proxies involved
@observable accessor isOpen: boolean = false;
@observable accessor count: number = 0;
@observable accessor label: string = '';
```

The same applies to `@bindable` vs `@bindable.ref` — use `@bindable.ref` for non-primitives.

In hoist-react, bare `@observable` is used only for primitives (booleans, strings, numbers,
enums). Everything else — arrays, objects, class instances — uses `@observable.ref` or
`@bindable.ref`.

### Mutating `.ref` values in place

When using `.ref` variants, MobX only tracks *reference changes* to the property, not mutations
within the value. To trigger reactions, you must replace the entire value with a new instance:

```typescript
@observable.ref accessor filters: Filter[] = [];

// ❌ Don't: push mutates the existing array — MobX won't detect the change
@action addFilter(f: Filter) {
    this.filters.push(f);
}

// ✅ Do: spread into a new array to create a new reference
@action addFilter(f: Filter) {
    this.filters = [...this.filters, f];
}

// ✅ Do: same pattern for objects — spread into a new object
@observable.ref accessor settings: {theme: string, compact: boolean} = {theme: 'dark', compact: false};

@action updateTheme(theme: string) {
    this.settings = {...this.settings, theme};
}
```

### Accessor fields are non-enumerable

TC39 `accessor` fields become getter/setter pairs on the class prototype. Unlike plain class
fields, they do not appear in `Object.keys()`, `JSON.stringify()`, `{...spread}`, or `for...in`
loops. Code that iterates model properties to discover observable state must use MobX APIs
(e.g. `getObservableKeys()`) instead of `Object.keys()`.

### Unnecessary `@computed` on simple transformations

Adding `@computed` to a getter that performs a 1:1 transformation of a single observable provides
no optimization if the output always changes when the input changes. The decorator still re-runs
the getter and compares the result, but since the result is always different, the comparison is
wasted work and the output-gating benefit never applies:

```typescript
// ❌ Don't: output always changes when `count` changes — no gating benefit
@computed
get countLabel(): string {
    return `${this.count} items`;
}

// ❌ Don't: formatted string always changes when the date changes
@computed
get formattedDate(): string {
    return fmtDate(this.selectedDate);
}

// ✅ Do: plain getter — simple and honest about re-evaluation
get countLabel(): string {
    return `${this.count} items`;
}
```

This pattern typically indicates a misunderstanding of what `@computed` does — treating it as a
general-purpose caching mechanism (like `useMemo`) rather than an output-change gate that
prevents unnecessary downstream reactions. Reserve `@computed` for getters where the output
genuinely changes less often than its inputs.

### Importing from `mobx` directly

Always import from `@xh/hoist/mobx`. Importing directly from `mobx` bypasses Hoist's
`enforceActions` configuration and `@bindable` support.

## Related Packages

- [`/core/`](../core/README.md) — HoistModel (where `@computed` getters and observable state are
  defined), `@managed` decorator, `addAutorun()`/`addReaction()` managed reactive subscriptions
- [`/promise/`](../promise/README.md) — `thenAction()` for modifying observables in promise chains
- [`/utils/js/`](../utils/README.md#decorators) — Additional decorators (`@debounced`,
  `@computeOnce`, `@logWithInfo`)
