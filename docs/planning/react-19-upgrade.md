# Plan: React 19 preparation (forward-compatible, stay on React 18)

**Branch:** `react-19` (based on `develop`)

**Goal:** remove the things in hoist-react's own code that will *block* a future React 19
migration, **without upgrading off React 18**. Every change here is forward-compatible — it
behaves identically on React 18 and simply drops an API that React 19 removes. The actual React
19 upgrade (runtime bump, dependency work) happens later and is tracked in
[#4205](https://github.com/xh/hoist-react/issues/4205).

**Out of scope for this branch** — these require React 19 and/or are not blockers, so they are
deferred to the real migration:

- `forwardRef` rework (see "Deferred" below — impossible on React 18 and not a blocker).
- `@types/react@19` / peer-range bump (keep types matched to the React 18 runtime).
- Blueprint `Popover` -> `PopoverNext` migration.
- Mobile `react-popper` -> `@floating-ui/react` migration.
- Third-party dependency peer-dep overrides and the app-level React 19 bump.

## Context

A scan of hoist-react for React-19-affected internal APIs found the surface is small, and most
of it is already handled:

- `ReactDOM.render` / `hydrate` / `unmountComponentAtNode` — **none** (already migrated to
  `createRoot`, in `appcontainer/AppContainerModel.ts` and
  `desktop/cmp/dash/container/DashContainerModel.ts`).
- `defaultProps` on function components — none.
- Legacy context (`childContextTypes` / `getChildContext`) — none.
- String refs / `element.ref` access / `props.ref` reads — none.
- `cloneElement` is used in several places but never to forward a `ref`, so the React 19
  `cloneElement` ref-handling change does not apply.

That leaves exactly one forward-compatible blocker to remove now: `findDOMNode`.

## The one change to make now: `findDOMNode` removal — required

`findDOMNode` is **deprecated in React 18** (works, warns under StrictMode) and **removed in
React 19**, so it is a genuine hard blocker. The ref-based replacement behaves identically on
React 18, so it can land now while staying on 18.

**`cmp/input/HoistInputModel.ts`** — import (line ~15) + the `domEl` getter (line ~77):

```ts
const current = this.domRef.current as ReactInstance;
return (!current || current instanceof Element ? current : findDOMNode(current)) as HTMLElement;
```

- The `findDOMNode` branch only fires when `domRef.current` is a class / `ReactInstance` rather
  than an `Element`. Inputs already place `domRef` on the rendered root, so resolve the element
  directly from the ref.
- Replace the fallback; if a non-`Element` ever appears, surface it (dev warning) instead of
  silently degrading. Drop the now-unused `ReactInstance` import.
- **Verify on React 18:** confirm `domRef.current` always resolves to a DOM `Element` across the
  HoistInput implementations now that the class-instance fallback is gone.

## Verification

- `tsc --build` clean (still against `@types/react@18`).
- `yarn lint`.
- Smoke in toolbox via `yarn startWithHoist`, focused on inputs and anything that reads
  `HoistInputModel.domEl` (focus management, autofocus, sizing/measurement, select/date inputs).
  Confirm no `findDOMNode` deprecation warnings remain in the console under StrictMode.

## Deferred to the actual React 19 migration (NOT in this branch)

### `forwardRef` -> `ref`-as-prop
Left for the migration for two reasons:

1. **Not possible on React 18.** `ref`-as-a-regular-prop is a React-19-only feature; stripping
   `forwardRef` while on 18 breaks ref forwarding (function components on 18 don't receive `ref`
   through props).
2. **Not a blocker.** `forwardRef` is *deprecated* in React 19, not removed — it still works, so
   it never blocks the migration. It is pure modernization cleanup to do after landing on 19.

Sites for later: `core/HoistComponent.ts` (the `cfg.isForwardRef` path — the framework-wide ref
wrap, the delicate one), `cmp/grid/columns/Column.ts` (x2), `kit/onsen/index.ts`.

### Types / peer bump
`@types/react` / `@types/react-dom` -> `19.x` and widening `peerDependencies.react` /
`react-dom` to `~18.2.0 || ^19` belong with the runtime upgrade. Bumping types ahead of the
React 18 runtime only produces phantom type errors that do not reflect runtime behavior.

### Minor / no-op
`propTypes` — React 19 ignores them (not an error). Only a stale comment reference in
`desktop/cmp/button/index.ts`; no runtime `propTypes` definitions found. Leave as-is.
