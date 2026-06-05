# Plan: hoist-react internal React 19 API migration

**Branch:** `react-19` (based on `develop`)

**Scope:** only hoist's own usage of React APIs that React 19 changed. Explicitly
**excludes** both Popover migrations (Blueprint `Popover` → `PopoverNext` and mobile
`react-popper` → `@floating-ui/react`) and all third-party dependency work. Those are tracked
separately in [#4205](https://github.com/xh/hoist-react/issues/4205).

## Context

A scan of hoist-react for React-19-affected internal APIs found the surface is small:

- `ReactDOM.render` / `hydrate` / `unmountComponentAtNode` — **none** (already migrated to
  `createRoot`, in `appcontainer/AppContainerModel.ts` and
  `desktop/cmp/dash/container/DashContainerModel.ts`).
- `defaultProps` on function components — none.
- Legacy context (`childContextTypes` / `getChildContext`) — none.
- String refs — none.

What remains is `findDOMNode`, `forwardRef`, and the type-level fallout from `@types/react@19`.

## 1. `findDOMNode` removal — required (removed in React 19)

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
- Coupled to the input ref plumbing (`ForwardedRef` / `useImperativeHandle`), so it dovetails
  with item 2.

## 2. `forwardRef` -> `ref`-as-prop — recommended (deprecated in 19, still works)

Four sites. The framework-core one is the delicate piece; the rest are mechanical.

- **`core/HoistComponent.ts`** (line ~203, the `cfg.isForwardRef` path) — the framework-wide
  decision of whether to wrap a component to receive `ref`. In React 19 `ref` is an ordinary
  prop, so the arity-based `isForwardRef` detection and the `forwardRef(ret)` wrap can be
  reworked. **Most careful change** — affects every hoist component that takes a ref.
- **`cmp/grid/columns/Column.ts`** (x2 — ag-Grid tooltip + cell-editor) — mechanical.
- **`kit/onsen/index.ts`** (Onsen kit wrapper) — mechanical.
- Decision point: do this now for cleanliness, or defer `HoistComponent` to a follow-up since
  `forwardRef` is not *removed* in 19. Recommend keeping them together so the ref model stays
  consistent.

## 3. Enabling step: types bump (needed to compile/verify the above)

- `@types/react` / `@types/react-dom` -> `19.x` (+ update the `resolutions` pins); widen
  `peerDependencies.react` / `react-dom` to `~18.2.0 || ^19` (retain React 18 support).
- Expect type-only fallout to surface under `tsc` and fix in place: `useRef` now requires an
  initial arg, ref-callback cleanup return types, `ReactElement.props` typed as `unknown`, the
  relocated `JSX` namespace. These are the internal React API changes that only appear once
  typed against 19.

## Minor / no-op

- **`propTypes`** — React 19 ignores them (not an error). Only a stale comment reference in
  `desktop/cmp/button/index.ts`; no runtime `propTypes` definitions found. Leave as-is or clean
  the comment opportunistically.

## Verification

- `tsc --build` clean against `@types/react@19`.
- `yarn lint`.
- Smoke in toolbox via `yarn startWithHoist`: focus on inputs (the `domEl` / ref path), grid
  tooltips & inline editors (Column `forwardRef` sites), and any Onsen-kit-wrapped mobile
  components.

## Suggested commits on `react-19`

1. Types/peer bump (`@types/react@19`, peer range) — gets the compiler onto 19.
2. `findDOMNode` removal in `HoistInputModel`.
3. `forwardRef` -> ref-as-prop (mechanical sites: Column, onsen).
4. `forwardRef` rework in `HoistComponent` core (separate commit — the risky one).

## Out of scope (tracked in #4205)

- Blueprint legacy `Popover` -> `PopoverNext` migration.
- Mobile `react-popper` -> `@floating-ui/react` migration.
- Third-party dependency peer-dep overrides (Blueprint, react-onsenui) and the app-level React 19
  bump.
