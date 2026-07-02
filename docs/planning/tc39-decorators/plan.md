# TC39 Modern Decorators Migration — Implementation Plan

**Issue:** [xh/hoist-react#4321](https://github.com/xh/hoist-react/issues/4321)
**Target release:** Hoist React v84 (coordinated with `hoist-dev-utils`)

> This is the execution plan. The issue body contains the detailed design (API signatures,
> reference implementations, and gotchas) — treat it as the authoritative spec and cite it
> in commits rather than duplicating here.

---

## 1. Goal

Migrate hoist-react from TypeScript `experimentalDecorators` to TC39 Stage 3 (2022.3 / Babel
`2023-05`) decorators. Eliminate the `makeObservable(this)` boilerplate from ~150 model files
and align with the direction of TypeScript, MobX 6, and the broader ecosystem.

**Success criteria**

- `tsc --noEmit` passes with `experimentalDecorators` removed from `tsconfig.json`.
- All `@observable`, `@bindable`, and custom decorators work without `makeObservable(this)`.
- Toolbox (desktop + mobile + admin + all example apps) runs end-to-end against the migrated
  build, with reactive UI and working `setXxx()` setters.
- No regression in the ~6 `Object.keys()` / serialization call sites that inspect model
  instances.
- `@xh/hoist` and `hoist-dev-utils` release atomically so that consuming apps have a single
  upgrade path.

---

## 2. Current State (verified 2026-04-15)

| Item | Value |
|---|---|
| `@xh/hoist` version | `84.0.0-SNAPSHOT` |
| TypeScript | `~5.9.3` |
| MobX | `~6.15.0` |
| `tsconfig.json` | `experimentalDecorators: true`, `useDefineForClassFields: true`, **no** `emitDecoratorMetadata` |
| `makeObservable(this)` call sites | **178 occurrences across 150 files** (`rg "makeObservable\(this\)"`) |
| Custom mobx decorator | `mobx/decorators.ts` — `@bindable`, `@bindable.ref` (legacy 3-arg API, uses `_xhBindableProperties` metadata) |
| `mobx/overrides.ts` | Wraps native `makeObservable` to finish `@bindable` props; also exports `isObservableProp` and `checkMakeObservable` |
| Custom decorators | `utils/js/Decorators.ts` — `@debounced`, `@computeOnce`, `@logWithInfo`, `@logWithDebug`, `@enumerable`, `@abstract`, `@sharePendingPromise` (all legacy 3-arg) |
| `checkMakeObservable` call site | `HoistBase.ts` constructor |

---

## 3. Repository Coordination

Two repos ship together; apps need both at once or they silently break.

| Repo | Change | Release order |
|---|---|---|
| `hoist-dev-utils` | `@babel/plugin-proposal-decorators` → `{version: '2023-05'}` | **Must land first or simultaneously.** See [line 465 of configureWebpack.js](https://github.com/xh/hoist-dev-utils/blob/develop/configureWebpack.js#L465-L468). |
| `hoist-react` | All changes in this plan | Must pin a compatible `hoist-dev-utils` peer/range. |
| `toolbox` | Application migration — tsconfig, `accessor` keywords, delete `makeObservable(this)` | Validates both of the above. |

**Breakage mode if mis-ordered:**
- dev-utils shipped but apps still on legacy syntax → `@observable`/`@bindable` silently non-reactive.
- hoist-react ships `accessor` keywords but app still on `{version: 'legacy'}` → Babel parse errors.

**Decision required:** confirm the release mechanism (major bump of both? minor bump with a
release-notes callout?) before Phase 2 lands. Bundle as a single "Hoist v84" coordinated release.

---

## 4. Phases

Phases are numbered by execution order. Most hoist-react changes must land on a single branch
because they are observable only together — attempting to merge incrementally will break the
build at each step.

### Phase 0 — Spike & validation branch

Prove the approach end-to-end on a minimal surface before committing to the full migration.

1. Branch `tc39-decorators` in hoist-react.
2. Branch `tc39-decorators` in hoist-dev-utils. Flip `{version: 'legacy'}` to `{version: '2023-05'}`.
   Publish a local/linked build.
3. In hoist-react, pick **one leaf model** with representative decorators
   (e.g. `cmp/clock/Clock.ts` — single `@bindable` and `@observable`). Apply the full migration
   pattern: remove `experimentalDecorators` from a scratch tsconfig, add `accessor`, delete
   `makeObservable(this)`, rewrite `@bindable` for TC39.
4. Run `tsc --noEmit` and exercise the model in a toolbox dev build linked against both local
   branches.
5. **Gate:** observable is reactive, `setXxx()` setter exists and is action-wrapped,
   `tsc --noEmit` clean. If any of this fails, revisit the `@bindable` reference implementation in
   the issue before proceeding.

### Phase 1 — Rewrite `@bindable` / `@bindable.ref`

File: `mobx/decorators.ts`.

- Replace the 3-arg legacy implementation with a TC39 accessor decorator that delegates to
  `observable(value, context)` / `observable.ref(value, context)` and uses
  `context.addInitializer` to install the action-wrapped `setXxx()` on the prototype.
- Reference signature and body in §2 of the issue.
- Delete the `_xhBindableProperties` metadata path entirely — no longer needed.
- Export unchanged surface: `bindable` (callable) with a `.ref` property.

### Phase 2 — Rewrite custom decorators

File: `utils/js/Decorators.ts`.

Port all 7 decorators to the 2-arg `(value, context)` TC39 signature. Per the issue:

| Decorator | New signature | Notes |
|---|---|---|
| `@computeOnce` | method/getter | Returns replacement function |
| `@debounced(ms)` | method | Decorator factory |
| `@logWithInfo` / `@logWithDebug` | method | Returns replacement |
| `@enumerable` | getter | **Re-examine semantics** — TC39 accessor enumerability differs; may require a different mechanism or could become a no-op. Confirm current call sites still need it. |
| `@abstract` | method/getter | Returns throwing function |
| `@sharePendingPromise` | method | Returns replacement |

hoist-react has no unit-test framework, so validation for each decorator is done by exercising
it in toolbox. Build a small scratch tab/model in toolbox that uses every decorator
(`@debounced`, `@computeOnce`, `@logWithInfo`, `@logWithDebug`, `@enumerable`, `@abstract`,
`@sharePendingPromise`) and confirm in the browser:
- behavior is preserved,
- each composes with `@observable` / `@bindable` where relevant,
- `override` keyword still works with it in subclasses.

Delete the scratch tab after Phase 7 validation passes.

### Phase 3 — Add `accessor` keyword to observable fields

Touches: ~150 files, ~223 `@observable*` + ~158 `@bindable*` occurrences.

**Approach.** Scripted codemod — too many sites for manual edits, and the pattern is uniform.

 ```
# Match (on its own line, possibly preceded by blank/comment lines):
#   @observable(.ref|.shallow|.deep)?
# or:
#   @bindable(.ref)?
# …followed on the next non-blank line by a typed field declaration.
# Insert the `accessor` keyword before the field name.
```

Rules:

- Applies to: `@observable`, `@observable.ref`, `@observable.shallow`, `@observable.deep`,
  `@bindable`, `@bindable.ref`.
- Does **not** apply to: `@action`, `@computed`, `@managed`, `@observable` with a `get`/`set`
  pair already written out, or `@observable.struct` (verify none exist in repo).
- Convention: decorator on its own line, `accessor <name>: <type>` on the next line — matches
  existing one-per-line style.

Write the codemod as a one-shot script (Node, regex-based) rather than a ts-morph transform
— the pattern is regular enough. Commit the script to `docs/planning/tc39-decorators/` for
reference but do not ship it in the released package.

Verify with `tsc --noEmit` after the codemod runs.

### Phase 4 — Remove `makeObservable(this)` and simplify constructors

1. Bulk-remove `makeObservable(this);` lines from all 150 files — `sed -i '' '/makeObservable(this);/d'`
   or equivalent codemod. The call is always on its own line and always trivial.
2. For each file, check if the constructor now contains only `super(...)` with no other
   statements. If so, delete the empty constructor (TypeScript synthesizes `super()`).
   This is a second pass — do it as a separate commit for reviewability.
3. Remove `import {makeObservable}` where it is the only import from `@xh/hoist/mobx` in a
   given file.

### Phase 5 — Delete `mobx/overrides.ts` and update exports

- Delete `mobx/overrides.ts`.
- Remove `checkMakeObservable(this)` call from `HoistBase.ts` constructor.
- Update `mobx/index.ts`:
  - Drop custom `makeObservable` / `isObservableProp` / `checkMakeObservable` re-exports.
  - Re-export native `makeObservable` and `isObservableProp` from `mobx` as a pass-through for
    any external consumer that still imports them. Keep the surface backward-compatible at the
    import level; the calls just become no-ops for hoist patterns.

### Phase 6 — tsconfig flip

Only after Phases 1–5 are on the branch and `tsc --noEmit` is clean:

- Remove `"experimentalDecorators": true` from `tsconfig.json`.
- Confirm `emitDecoratorMetadata` is absent (already is).
- Re-run `tsc --noEmit`.

This is the point of no return for the branch — legacy decorators stop compiling.

### Phase 7 — Toolbox migration (validation app)

In a branch of `toolbox` tracking the hoist-react branch:

1. Remove `experimentalDecorators` from `client-app/tsconfig.json`.
2. Run the same codemod (add `accessor`) across `client-app/src/`.
3. Remove `makeObservable(this)` calls and empty constructors.
4. `cd client-app && yarn tsc --noEmit && yarn lint`.
5. `yarn startWithHoist` linked to the hoist-react branch; smoke-test:
   - Desktop app (`/app`) — tabs, grids, charts, forms.
   - Admin console (`/admin`) — all panels.
   - Mobile app (`/mobile`).
   - Example apps: `/todo`, `/contact`, `/portfolio`, `/news`, `/recalls`, `/fileManager`,
     `/weather`.
6. Specifically exercise the 6 known `Object.keys()` risk sites from the issue's Gotchas §1.

### Phase 8 — Coordinated release

- Land hoist-dev-utils `{version: '2023-05'}` change; publish next version.
- Land hoist-react branch; publish v84 pinned to the new hoist-dev-utils.
- Publish toolbox.
- Write upgrade notes for consuming apps (see §6 below).

---

## 5. Verification

Run at the end of Phase 6 and again after Phase 7.

| Check | Command / Method |
|---|---|
| TypeScript compiles | `cd hoist-react && npx tsc --noEmit` |
| No legacy decorator syntax remains | `rg '@(observable\|bindable)' --type ts \| rg -v 'accessor'` — should be empty |
| No `makeObservable(this)` calls remain | `rg 'makeObservable\(this\)' --type ts` — should be empty (outside upgrade-notes) |
| `@bindable` setters exist | Runtime: `new SomeModel().setFoo` is a function |
| `@observable` is reactive | Runtime: wire an `autorun` on a model field in the browser console, mutate, confirm it fires |
| `@action` overrides still actions | Audit: `rg 'override .*\(' -B2` for methods whose base is `@action`, verify subclass is too |
| Object.keys call sites unchanged | Manual review of the 6 files listed in issue Gotchas §1 |
| Toolbox smoke test | Per Phase 7 checklist |

---

## 6. Risk Register

Drawn from the issue's Gotchas section — ordered by likelihood × blast radius.

| # | Risk | Mitigation |
|---|---|---|
| R1 | **Accessor fields are non-enumerable.** `Object.keys(model)` / `JSON.stringify(model)` / `{...model}` silently lose `@observable` and `@bindable` fields. | Audit the 6 sites listed in the issue before Phase 6 lands. Update each to use explicit property lists or MobX's `toJS` / `getObservableFields` instead of `Object.keys`. Add a changelog note. |
| R2 | **`@action` override silently drops action semantics.** Subclass override compiles but is no longer action-wrapped. | Grep pass as part of Phase 6 review: find `override` methods whose base is `@action`, confirm the override has `@action` too. `noImplicitOverride` already forces the `override` keyword, which narrows the search. |
| R3 | **`@enumerable` decorator may be semantically broken.** TC39 accessor enumerability is controlled differently. | Covered in Phase 2. If no consumer depends on the current behavior, consider deleting the decorator rather than porting. |
| R4 | **Release coordination failure.** Apps ship against mismatched dev-utils + hoist-react and silently break. | Pin compatible versions in hoist-dev-utils peerDependency / hoist-react engines field. Write upgrade notes that call out the atomic upgrade explicitly. |
| R5 | **External consumers read `_xhBindableProperties`.** If any downstream code introspects this metadata for tooling/serialization, it disappears. | Search consuming XH repos (toolbox, any client apps Lee has access to). Document removal in upgrade notes. |
| R6 | **`useDefineForClassFields: true` + legacy decorator interaction masked bugs.** Babel's legacy mode compiled field initializers as assignments; TC39 mode flips this. | Phase 0 spike validates this. Known risky patterns: fields initialized in the constructor vs. inline, fields referenced in base-class constructors, superclass fields with same names. |
| R7 | **Codemod false positives / negatives.** Regex-based `accessor`-insertion could miss multi-line decorator expressions or hit unintended targets. | Review the codemod's diff in a scratch commit before squashing. `tsc --noEmit` catches most failures; visual diff catches the rest. |

---

## 7. Open Questions

Resolve before Phase 2 lands:

1. **Release versioning.** Is this a hoist-react v84.0 breaking release, or held for a larger v85?
   What version of hoist-dev-utils ships with it?
2. **`@enumerable` decorator.** Audit current usage — is there any consumer whose behavior we
   must preserve, or can we delete it?
3. **Codemod location.** Script lives in `docs/planning/tc39-decorators/` for audit, or gets
   deleted after the migration lands? (Recommend: keep for the single upgrade-notes cycle, then
   remove.)
4. **Downstream apps.** Beyond toolbox, are there internal XH apps that need parallel branches
   prepared before release?

---

## 8. Out of Scope

- Rewriting `@action`, `@computed`, or `@managed` — their APIs don't change.
- Migrating away from MobX or changing observable semantics.
- Refactoring models that currently work around the lack of TC39 decorators.
- Documentation rewrites beyond the architecture-primer mentions of `makeObservable(this)`.

---

## 9. Upgrade Notes (sketch for consuming apps)

Write a full upgrade note at `docs/upgrade-notes/v84-upgrade-notes.md` when the release lands.
Key points for the sketch now:

1. Bump `@xh/hoist` and `@xh/hoist-dev-utils` together.
2. Remove `experimentalDecorators` from `tsconfig.json`.
3. Add `accessor` keyword to all `@observable` / `@bindable` fields — codemod snippet provided.
4. Delete all `makeObservable(this)` calls and any now-empty constructors.
5. Audit any `Object.keys` / `JSON.stringify` / spread on model instances.
6. Audit any `@action` method overridden in subclass — subclass needs its own `@action`.

---

## Appendix A — Enumerability Audit of the 6 Risk Sites

The issue's Gotchas §1 lists 5 `Object.keys()` call sites (the "~6" in the issue prose is
approximate — 5 is the exact count) in hoist-react that could regress when `@observable` /
`@bindable` fields become non-enumerable accessor properties.

Verdict up front: **none of the 5 sites actually iterates a `HoistModel` / `HoistBase` instance.**
Every one enumerates either a plain server-response payload or a locally-constructed dictionary
(`Record<string, T>`). The TC39 enumerability change has **no effect** on any of them.

Additional spot checks — `JSON.stringify(this)`, `for (… in this/model)`, `{...this}` / `{...model}`
— return **zero matches** anywhere in hoist-react. There is no code in the framework that relies on
decorated fields being enumerable.

The risk register entry R1 stands, but it applies to **consuming apps**, not to hoist-react itself.
Toolbox (Phase 7) and any other XH apps still need to be audited with the same grep.

### A.1 — Site-by-site analysis

#### 1. `cmp/form/FormModel.ts:324`

```typescript
const allFields = Object.keys(this.fields);
```

- **`this.fields` type:** `Record<string, BaseFieldModel> = {}` (FormModel.ts:106) — a plain
  object keyed by field name.
- **What's being enumerated:** dictionary keys (field names). The *values* are `BaseFieldModel`
  instances, but `Object.keys` returns the dict's keys, not any model's own properties.
- **Impact of enumerability change:** None. A plain object's keys are always enumerable.
- **Action:** No change required.

#### 2. `admin/tabs/cluster/objects/DetailModel.ts:67,70`

```typescript
const {adminStatsByInstance, comparableAdminStats} = record.data,
    instanceNames = Object.keys(adminStatsByInstance),
    ...
    otherFields = without(
        Object.keys(adminStatsByInstance[instanceNames[0]] ?? {}),
        ...diffFields, 'name', 'type', 'config', 'replicate'
    );
```

- **`adminStatsByInstance` provenance:** destructured off `record.data`, a `StoreRecord` data
  payload — i.e. deserialized JSON from the server.
- **What's being enumerated:** instance names, then the stat field names for one instance. Both
  are plain JSON objects.
- **Impact of enumerability change:** None.
- **Action:** No change required.

#### 3. `admin/tabs/cluster/objects/ClusterObjectsModel.ts:296,329`

```typescript
const recordNames = Object.keys(recordsByName);
...
return Object.values(recordsByName).filter(record => !record.parentName);
```

- **`recordsByName` provenance:** declared at line 246 as
  `Record<string, ClusterObjectRecord> = mapValues(byName, objs => …)` — a locally-built plain
  dictionary.
- **What's being enumerated:** dictionary keys/values where each value is a `ClusterObjectRecord`
  plain-data interface (not a HoistModel).
- **Impact of enumerability change:** None.
- **Action:** No change required.

#### 4. `desktop/cmp/dash/canvas/impl/utils.ts:70`

```typescript
const groupedItems = {},
    ...
return [
    ...Object.keys(groupedItems).map(group => { ... }),
    ...ungroupedItems
];
```

- **`groupedItems` provenance:** `const groupedItems = {}` declared at line 24 as a local object
  literal and populated via `groupedItems[groupName] = [item]`.
- **What's being enumerated:** group-name keys in a local bucketing dict.
- **Impact of enumerability change:** None.
- **Action:** No change required.

#### 5. `desktop/cmp/dash/canvas/widgetchooser/DashCanvasWidgetChooser.ts:97`

```typescript
...Object.keys(groupedItems).map(groupName => { ... })
```

- **`groupedItems` provenance:** same local-dict pattern as site 4.
- **Impact of enumerability change:** None.
- **Action:** No change required.

### A.2 — What this means for the risk register

The issue framed R1 as a hoist-react-internal risk. The audit shows the real exposure is on the
consumer side:

- **Inside hoist-react:** R1 is effectively closed. The 5 grep hits are false positives; no other
  enumeration patterns exist. Downgrade R1's severity for framework work.
- **Inside toolbox and downstream apps:** R1 is fully open. Phase 7 validation must run the same
  grep pattern plus `rg 'JSON\.stringify'`, `rg '\.\.\.this'`, `rg '\.\.\.\w+Model'`, and
  `rg 'for \(.* in '` across consuming codebases. Document this in the v84 upgrade notes with
  concrete grep commands consumers can run before upgrading.

### A.3 — Audit commands (for reuse in app migrations)

```bash
# Run these from the root of any hoist-consuming app.

# Dict-style enumeration — verify each hit targets a plain dict, not a model instance
rg 'Object\.(keys|entries|values)' --type ts --type tsx

# Serialization — any call on `this` or a model variable in a HoistModel/HoistBase subclass is risky
rg 'JSON\.stringify' --type ts --type tsx

# Spread over `this` or a model
rg '\{\s*\.\.\.(this|\w+Model)\b' --type ts --type tsx

# for...in loops over a model
rg 'for \(.*\bin\s+(this|\w+Model)\b' --type ts --type tsx

# Property descriptor introspection
rg 'Object\.(getOwnPropertyNames|getOwnPropertyDescriptors)' --type ts --type tsx
```

For each hit, confirm the target is a plain object, not a HoistModel/HoistBase subclass. If it
is a model, replace with an explicit property list, a `toJS()` call, or a dedicated serializer.
