# Plan: React 19 preparation (forward-compatible, stay on React 18)

**Branch:** `react-19` (based on `develop`)

**Goal:** remove the things in hoist-react's own code that will *block* a future React 19
migration, **without upgrading off React 18**. Every change here is forward-compatible — it
behaves identically on React 18 and simply drops an API or component that React 19 removes /
breaks. The actual React 19 upgrade (runtime bump, dependency work) happens later and is tracked
in [#4205](https://github.com/xh/hoist-react/issues/4205).

**Why these are all React-18-safe:** each phase swaps a React-19-incompatible API for a
replacement that *also* runs on React 18. The precedent is already in the tree —
`kit/blueprint/Wrappers.ts` runs `Overlay2 as Overlay` on React 18 today. Phases 2 and 3 apply
that same pattern to `PopoverNext` and `@floating-ui/react`.

## Context

A scan of hoist-react for React-19-affected internal APIs found the surface is small, and most
of it is already handled:

- `ReactDOM.render` / `hydrate` / `unmountComponentAtNode` — **none** (already migrated to
  `createRoot`, in `appcontainer/AppContainerModel.ts` and
  `desktop/cmp/dash/container/DashContainerModel.ts`).
- legacy Blueprint `Overlay` — already migrated to `Overlay2` in `kit/blueprint/Wrappers.ts`.
- `defaultProps` on function components — none.
- Legacy context (`childContextTypes` / `getChildContext`) — none.
- String refs / `element.ref` access / `props.ref` reads — none.
- `cloneElement` is used in several places but never to forward a `ref`, so the React 19
  `cloneElement` ref-handling change does not apply.

That leaves three forward-compatible blockers to remove, sequenced as phases below.

## Phase 1 — `findDOMNode` removal (required)

`findDOMNode` is **deprecated in React 18** (works, warns under StrictMode) and **removed in
React 19**, so it is a genuine hard blocker. The ref-based replacement behaves identically on
React 18.

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

## Phase 2 — `Popover` kit wrapper on `PopoverNext` (mirror the `Overlay2` approach)

Blueprint's legacy `Popover` relies on the removed `findDOMNode` and breaks under React 19.
`PopoverNext` is the `findDOMNode`-free replacement in the same Blueprint 6.15.0 package and runs
on React 18 — exactly as `Overlay2` already does. We handle it identically: the kit owns a
`Popover` wrapper that re-exports `PopoverNext` under our canonical name.

- **`kit/blueprint/Wrappers.ts`** — change the import from `Popover as BpPopover` to
  `PopoverNext as BpPopover`; point the `PopoverProps` type import at `PopoverNext`'s props. Keep
  the thin wrapper that disables the open/close transition by default (verify the right knob on
  `PopoverNext` — `transitionDuration: 0` may become `animation`-based; see prop map below).
- Propagate the `PopoverNext` prop renames to call sites that pass Popover props:
  - **`desktop/cmp/input/DateInput.ts`** (`minimal`, `modifiers`, `position`, `boundary`,
    `onInteraction`)
  - **`desktop/cmp/input/Picker.ts`** (`minimal`, `position`, `onInteraction`) — shared base for
    Select/combo inputs
  - **`desktop/cmp/viewmanager/ViewMenu.ts`** (verify — `shouldDismissPopover` is a `MenuItem`
    prop, likely unaffected)
  - **`mobile/cmp/menu/MenuButton.ts`** (`popoverProps?: Partial<PopoverProps>` passthrough)
- Prop map (Blueprint v6.14 guide): `position` -> `placement`; `modifiers` -> `middleware` (via
  `popperModifiersToNextMiddleware()`); `minimal={true}` -> `animation="minimal"` +
  `arrow={false}`; `boundary="clippingParents"` -> `"clippingAncestors"`.
- **Behavior watch:** `shouldReturnFocusOnClose` default flips `false` -> `true` — verify
  Select/DateInput focus return doesn't regress.
- Enable the `@typescript-eslint/no-deprecated` rule to surface any remaining deprecated
  Blueprint usages.
- **React 18 safe:** `PopoverNext` ships in the current Blueprint build and runs on React 18
  (same as `Overlay2`). No runtime bump required.

## Phase 3 — `react-popper` -> `@floating-ui/react`

`react-popper` is deprecated, its repo archived, and its peer dep caps at React 18 — a genuine
code incompatibility with React 19. `@floating-ui/react` supports React 16.8+, so this is a
like-for-like swap that runs on React 18.

- **`mobile/cmp/popover/Popover.ts`** is the sole consumer (`usePopper` at line ~93; results used
  for `popper.styles.popper` at line ~126; `ReactDom.createPortal` at line ~120 stays — unchanged
  in React 19).
- Replace `usePopper` with `useFloating` + `autoUpdate` + `offset` / `flip` / `shift`
  middleware; map `styles.popper` / `attributes` to floating-ui's `floatingStyles`.
- Add `@floating-ui/react` dependency; remove `react-popper` (and the `react-popper` entry in
  `package.json`).
- **React 18 safe:** floating-ui runs on React 18; no runtime bump required.

## Verification (each phase)

- `tsc --build` clean (still against `@types/react@18`).
- `yarn lint` (incl. `no-deprecated` after Phase 2).
- Smoke in toolbox via `yarn startWithHoist`:
  - Phase 1 — inputs / anything reading `HoistInputModel.domEl` (focus, autofocus,
    sizing/measurement); confirm no `findDOMNode` StrictMode warnings remain.
  - Phase 2 — desktop popovers: Select, DateInput, combos, column chooser, ViewManager menu,
    mobile MenuButton; check placement, dismissal, and focus-return behavior.
  - Phase 3 — mobile Popover positioning, flip/shift near viewport edges, scroll/resize updates.

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
