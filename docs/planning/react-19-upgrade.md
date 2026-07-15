# React 19 upgrade

**Branch:** `react-19-upgrade` (based on `develop`) — see [#4205](https://github.com/xh/hoist-react/issues/4205).

**Outcome:** hoist-react now type-checks and runs against React 19. This is a clean cut — the
`react` / `react-dom` peer dependency moves to `^19.2.0` and React 18 is no longer supported.
Consuming apps upgrade to React 19 alongside this Hoist major.

## Context

A scan of hoist-react for React-19-affected internal APIs found the surface small, and most of it
was already handled before this branch:

- `ReactDOM.render` / `hydrate` / `unmountComponentAtNode` — **none** (already on `createRoot`, in
  `appcontainer/AppContainerModel.ts` and `desktop/cmp/dash/container/DashContainerModel.ts`).
- legacy Blueprint `Overlay` — already migrated to `Overlay2` in `kit/blueprint/Wrappers.ts`.
- `defaultProps` on function components — none.
- Legacy context (`childContextTypes` / `getChildContext`) — none.
- String refs / `element.ref` access / `props.ref` reads — none.
- `cloneElement` is used in several places but never to forward a `ref`, so the React 19
  `cloneElement` ref-handling change does not apply.

That left the work below: two removed/broken APIs (`findDOMNode`, Popper.js-based popovers), the
custom-element boolean-prop change that affects the Onsen kit, the types/peer bump, and the
type-only fallout from `@types/react@19`.

## Types / peer bump

- `package.json`: `peerDependencies.react` / `react-dom` → `^19.2.0` (React 18 dropped);
  dev `react` / `react-dom` → `^19.2.0`; `@types/react` / `@types/react-dom` and their
  `resolutions` pins → `19.x`.
- Removed `react-popper` as a direct dependency; added `@floating-ui/react` (see below).

## `findDOMNode` removal

`findDOMNode` is removed in React 19. `HoistInputModel.domEl` (`cmp/input/HoistInputModel.ts`)
used it as a fallback for when `domRef.current` resolved to a class instance rather than a DOM
element. A trace of all desktop + mobile HoistInput implementations confirmed every one roots
`domRef` on a DOM element, so the fallback was dead defensive code. `domEl` now resolves the
element directly from the ref; the `findDOMNode` / `ReactInstance` imports are dropped.

## Popovers off Popper.js → Floating UI

Both popover implementations relied on Popper.js, which is React-18-capped and not React 19
compatible.

- **Desktop kit wrapper — `kit/blueprint/Wrappers.ts`.** Blueprint's legacy `Popover` relies on
  the removed `findDOMNode`; its Floating UI-based `PopoverNext` (same Blueprint build) is the
  replacement — mirroring the existing `Overlay2 as Overlay` pattern. The wrapper now renders
  `PopoverNext` and runs incoming props through Blueprint's `popoverPropsToNextProps()` helper,
  which maps `position` / `modifiers` / `minimal` / `boundary` and preserves the legacy
  `shouldReturnFocusOnClose` default. Because the helper handles the mapping, the `popover`
  factory keeps its existing `PopoverProps` API and **no call sites needed edits**.
- **Mobile — `mobile/cmp/popover/Popover.ts`** (the sole `react-popper` consumer). Swapped
  `usePopper` for `@floating-ui/react`'s `useFloating`, reusing the Floating UI copy Blueprint's
  `PopoverNext` already pulls in rather than adding a separate library. Positioning uses
  `middleware: [autoPlacement() | flip(), shift({padding: 10})]` with `whileElementsMounted:
  autoUpdate`; placement names are shared with Popper.js so `menuPositionToPlacement` is
  unchanged. Element wiring uses Floating UI's own `refs.setReference` / `refs.setFloating`
  callback refs rather than the previous observable refs — the MobX-observer re-render the old
  approach depended on did not reliably fire under React 19 for the portaled content. The obsolete
  Popper.js-specific `popperOptions` escape-hatch prop was removed (breaking change; unused in
  Hoist).

## Onsen custom-element boolean props — `kit/onsen/index.ts`

react-onsenui encodes boolean props as the string `''` (or `null`). Under React 18 these were
assigned as DOM *attributes*; React 19 assigns them as DOM *properties* on the underlying custom
element, and Onsen's boolean property setters treat `''` as falsy — so props like `checked`,
`disabled`, and `visible` silently failed to apply. The kit wrapper now strips boolean props from
the rendered props and applies the real booleans imperatively via a ref in `useLayoutEffect`
(accounting for Onsen's deprecated aliases `isOpen`/`isCancelable`/`isDisabled`), routing through
Onsen's own setters.

## `@types/react@19` type adjustments

Type-only fallout, no runtime behavior change:

- `useRef` now requires an initial arg — `desktop/cmp/tab/dynamic/DynamicTabSwitcher.ts`
  (`useRef<HTMLDivElement>(null)`).
- Ref-callback return values are treated as cleanup functions — `desktop/cmp/input/CodeInput.ts`
  wraps its `createCodeEditor` ref callback to return `void` (the method is `async`, so it would
  otherwise return a Promise that React invokes as a destructor).
- `ReactElement.props` is typed `unknown` — `desktop/cmp/dash/canvas/widgetchooser/DashCanvasWidgetChooser.ts`
  narrows icon `props` before reading `iconName`.
- Widened FC return type / stricter element typing — casts in `cmp/grid/columns/Column.ts` and
  `desktop/cmp/tab/dynamic/scroller/Scroller.ts` (`as ReactElement`), and `ReactElement<any>` in
  `desktop/hooks/UseContextMenu.ts` and `desktop/hooks/UseHotkeys.ts`.

## Not done (still valid on React 19)

- **`forwardRef` → `ref`-as-prop.** `forwardRef` is *deprecated* in React 19, not removed — it
  still works, so it never blocked this upgrade. Left in place as future modernization cleanup;
  sites include `core/HoistComponent.ts` (the framework-wide `cfg.isForwardRef` ref wrap — the
  delicate one), `cmp/grid/columns/Column.ts`, and `kit/onsen/index.ts`.
- **`propTypes`** — React 19 ignores them (not an error). No runtime `propTypes` definitions exist
  in the codebase; only a stale comment reference in `desktop/cmp/button/index.ts`.

## Verification

- `tsc --noEmit` clean against `@types/react@19`.
- `yarn lint`.
- Smoke in toolbox via `yarn startWithHoist`:
  - inputs and anything reading `HoistInputModel.domEl` (focus, autofocus, sizing/measurement);
  - desktop popovers: Select, DateInput, combos, column chooser, ViewManager menu, mobile
    MenuButton — placement, dismissal, and focus-return behavior;
  - mobile Popover positioning, flip/shift near viewport edges, scroll/resize updates;
  - Onsen-backed mobile controls with boolean state (checkboxes, switches, dialog visibility).
