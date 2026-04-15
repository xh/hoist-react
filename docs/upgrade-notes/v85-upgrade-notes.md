# Hoist React v85 Upgrade Notes

> **From:** v84.x → v85.0.0 | **Difficulty:** 🟠 MEDIUM (codemod-assisted, mostly mechanical)

## Overview

v85 migrates Hoist from TypeScript's legacy `experimentalDecorators` to the **TC39 Stage 3
(2022.3 / Babel `2023-05`) modern decorator standard**, aligning with the direction of TypeScript,
MobX, and the broader ecosystem. The visible payoffs:

- `makeObservable(this)` is no longer needed — observable fields register at class-definition time.
- Subclass initialization is less error-prone: forgetting `makeObservable(this)` previously caused
  silent reactivity failures.

The cost is one atomic upgrade: TypeScript, Babel, and app code all have to flip together.
`@xh/hoist` v85 and `@xh/hoist-dev-utils` v14 **must be upgraded simultaneously**. Mixing a v85
app bundle with dev-utils v13 (legacy Babel) or vice-versa will silently break every
`@observable` / `@bindable` field.

## Prerequisites

- [ ] Running hoist-react v84.x and hoist-dev-utils v13.x
- [ ] TypeScript 5.0+ (v85 requires TS 5.9)

## Upgrade steps

### 1. Update `package.json`

Bump **both** hoist-react and hoist-dev-utils. They release together.

```json
"@xh/hoist": "~85.0.0",
"@xh/hoist-dev-utils": "~14.0.0"
```

### 2. Remove `experimentalDecorators` from `tsconfig.json`

TypeScript 5+ treats decorators as TC39 by default when this flag is absent.

```diff
  "compilerOptions": {
-   "experimentalDecorators": true,
    "useDefineForClassFields": true,
    ...
  }
```

Also remove `emitDecoratorMetadata` if present.

### 3. Run the codemod to add `accessor` keywords

Every `@observable` / `@observable.ref` / `@observable.shallow` / `@observable.deep` /
`@bindable` / `@bindable.ref` field must now be an `accessor` field:

```typescript
// Before
@observable.ref users: User[] = [];
@bindable selectedFund: string = null;

// After
@observable.ref accessor users: User[] = [];
@bindable accessor selectedFund: string = null;
```

A one-shot codemod is shipped with the framework:

```bash
# From your app repo root (the repo containing client-app/):
node ./node_modules/@xh/hoist/docs/planning/tc39-decorators/codemod-add-accessor.mjs \
    client-app/src
```

It handles both inline (`@observable foo = 0`) and stacked-decorator forms
(`@bindable @persist foo = true`, `@managed @observable.ref grid: GridModel`).

`@action`, `@computed`, `@managed`, and `@persist` are **unchanged** — they don't take `accessor`.

### 4. Run the codemod to remove `makeObservable(this)` calls

```bash
node ./node_modules/@xh/hoist/docs/planning/tc39-decorators/codemod-remove-makeObservable.mjs \
    client-app/src
```

This removes every `makeObservable(this);` line, deletes constructors that are now empty
(contain only `super(...)`), and strips `makeObservable` from imports that no longer reference it.

### 5. Replace any `@override` decorators with `@action`

Under TC39, MobX's `@override` decorator is annotation-only and logs *"'override' cannot be used
with decorators — this is a no-op"* at runtime. Subclass overrides of base `@action` methods must
now decorate with `@action` directly.

Grep for instances:

```bash
rg '^\s*@override' client-app/src
```

For each hit, replace `@override` with `@action` (or `@computed` / `@flow` if the base member was
decorated as such). Remove `override` from the corresponding `@xh/hoist/mobx` import if it is no
longer referenced.

### 6. Audit model-property iteration (risk R1)

**Accessor fields are not enumerable.** `@observable` / `@bindable` fields are now getter/setter
pairs on the class prototype rather than own enumerable instance properties. Code that introspects
a model via `Object.keys`, `Object.entries`, `Object.values`, `JSON.stringify`, spread (`{...model}`),
or `for…in` will **silently miss** those fields.

Run these greps from your app root and inspect each hit — is the target a plain dict, or a
`HoistModel` / `HoistBase` subclass? Plain dicts are fine; model instances need updating to use an
explicit property list, `toJS()`, or a dedicated serializer.

```bash
# Dict/model enumeration — examine each hit's target
rg 'Object\.(keys|entries|values)' client-app/src

# Serialization of a model
rg 'JSON\.stringify' client-app/src

# Spread over `this` or a `*Model` variable
rg '\{\s*\.\.\.(this|\w+Model)\b' client-app/src

# for…in loop over a model
rg 'for\s*\(.*\bin\s+(this|\w+Model)\b' client-app/src

# Property-descriptor introspection
rg 'Object\.(getOwnPropertyNames|getOwnPropertyDescriptors)' client-app/src
```

The hoist-react framework itself does not enumerate model instances this way (a full internal audit
surfaced five candidate sites, all iterating plain dictionaries rather than models). The risk is
**app-side only**.

### 7. Verify

```bash
cd client-app
yarn tsc --noEmit      # must be clean
yarn lint
yarn start             # smoke-test interactively
```

## Other notable changes

- **`mobx/overrides.ts` is gone.** `makeObservable` and `isObservableProp` are now re-exported
  straight from MobX as pass-throughs; `checkMakeObservable` no longer exists. Apps that were
  importing these from `@xh/hoist/mobx` continue to work (the calls are just no-ops).
- **`_xhBindableProperties` metadata no longer exists.** Any tooling or app code reading this
  property off model prototypes must be updated.
- **Direct assignments to `@bindable` fields still work** in strict mode (`enforceActions:
  'observed'`) — hoist-react wraps the accessor's setter in `runInAction` internally.
- **`@enumerable` decorator is removed.** It had zero call sites across hoist-react and toolbox.
  If your app uses it, define a replacement inline using a TC39 getter decorator, or switch to a
  regular enumerable data property.

## Troubleshooting

### `An 'accessor' property cannot be declared optional`
Change `@observable accessor foo?: T` → `@observable accessor foo: T | undefined`.

### `Property 'value' will overwrite the base property...`
A subclass overriding a parent's `@observable` / `@bindable` `accessor` field needs the
`override` keyword, its own decorator, and an initializer:
```typescript
@observable.ref override accessor value: FormModel[] = [];
```

### `[MobX] Please use '@observable accessor foo' instead of '@observable foo'`
The codemod missed this one — usually because `@decorator // comment` or a non-standard
decorator stack confused the regex. Add `accessor` manually.

### Static class blocks error in Babel
`@xh/hoist-dev-utils` v14 enables `@babel/plugin-transform-class-static-block` automatically. If
you maintain a custom Babel config outside dev-utils, ensure that plugin is enabled alongside
`@babel/plugin-proposal-decorators` `{version: '2023-05'}`.
