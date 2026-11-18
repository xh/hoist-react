# Plan: Removing BlueprintJS from hoist-react

Status: draft for discussion. Baseline: `develop` at `5e18f21` (91.0.0-SNAPSHOT),
`@blueprintjs/core` 6.23.

## Goal

Remove `@blueprintjs/core` as a dependency of hoist-react. Desktop components render Hoist-owned
markup and styles, and no Blueprint types, classes or CSS reach the public API.

Expected gains:

- No global `blueprint.css` (566 KB unminified, with 26 element-level rules such as `body` and
  `h1`-`h6`) fighting Hoist's own `--xh-*` theme.
- No build-time icon stubbing in hoist-dev-utils (`requiredBlueprintIcons`,
  `loadAllBlueprintJsIcons`) - see `kit/blueprint/README.md`.
- No more major-version churn from Blueprint upgrades (`Popover` -> `PopoverNext`, `bp5-` ->
  `bp6-` class renames, `Overlay` -> `Overlay2`).
- One overlay stack shared by desktop and mobile. Mobile is already Blueprint-free and has its own
  Floating UI popover (`mobile/cmp/popover/Popover.ts`).

## Current footprint

Blueprint is already well contained, which is what makes this feasible.

| Area | Measure |
|---|---|
| Direct `@blueprintjs/*` imports | `kit/blueprint/*`, plus type-only imports in 10 desktop files and `svc/EnvironmentService.ts` |
| TS files importing `@xh/hoist/kit/blueprint` | 89, all in `desktop/`, `admin/`, `inspector/` (none in `mobile/`) |
| SCSS files referencing `bp6-` / `$ns` | 35, 384 references in all. Largest: `kit/blueprint/styles.scss` (94), `Button.scss` (55), `SegmentedControl.scss` (23), `Toolbar.scss` (15) |
| TS files emitting `bp6-` class strings | 11 |
| Packages already gone | `@blueprintjs/datetime` (v90, replaced by `kit/react-day-picker`), `@blueprintjs/select` |
| Replacement primitives already in deps | `@floating-ui/react`, `@daypicker/react`, `react-select` |

Usage of `kit/blueprint` exports by framework code (file counts):

| Export | Files | Notes |
|---|---|---|
| `popover` | 26 | Hoist wrapper over `PopoverNext`, Floating UI underneath |
| `dialog` (+ `dialogBody` 6) | 24 | Hoist wrapper, transitions off |
| `tooltip` | 10 | |
| `menu` / `menuItem` / `menuDivider` | 10 / 7 / 5 | Includes submenus |
| `showContextMenu` | 5 | Imperative API |
| `Position` | 6 | Enum leaks into props |
| `overlay`, `Classes` | 3 each | DashCanvas, DashContainer, Mask (full-screen mode) |
| `OverlayToaster` | 1 | `ToastSource` |
| `useHotkeys`, `HotkeyConfig` | 2 | Global and panel hotkeys |
| `blueprintProvider`, `portalProvider` | 1 each | AppContainer, Inspector |
| One owner each | 1 | `button`, `buttonGroup`, `checkbox`, `switchControl`, `radio`/`radioGroup`, `inputGroup`, `textArea`, `numericInput`, `slider`/`rangeSlider`, `bpSegmentedControl`, `tabs`/`tab`, `navbar`/`navbarGroup`/`navbarDivider`, `overflowList`, `controlGroup`, `callout`, `tag` |

Each control in the last row is wrapped by exactly one Hoist component, so its replacement is
local. The overlay family (popover, tooltip, dialog, menu, context menu, toast) is where the
real work and risk sit.

### Blueprint types in Hoist's public API

These must change before Blueprint can go, and each is a breaking change for apps that pass them:

- `ButtonProps` extends Blueprint `ButtonProps` (`desktop/cmp/button/Button.ts:33`), so every
  Blueprint button prop (`intent`, `minimal`, `outlined`, `rightIcon`, ...) is Hoist API.
- `ButtonGroupProps` extends Blueprint `ButtonGroupProps` (`desktop/cmp/button/ButtonGroup.ts:30`).
- `MenuButton.popoverProps` / `menuPosition` (`desktop/cmp/menu/MenuButton.ts:42-45`).
- `submenuPopoverProps` in `desktop/cmp/menu/impl/MenuItems.ts:60`.
- `FormField.tooltipPosition` / `tooltipBoundary`, `DateInput.popoverBoundary`,
  `DateRangePicker.popoverPosition`.
- `popoverProps` passthroughs on inputs, and the `Position` enum used in app code.
- `HotkeyConfig`, imported from `@blueprintjs/core/src/...` in `desktop/hooks/UseHotkeys.ts:13`
  and `desktop/appcontainer/AppContainer.ts:7`. Importing from `src/` is fragile on its own and
  worth fixing early.

Apps also import `@xh/hoist/kit/blueprint` directly (the kit README tells them to), and app SCSS
targets `bp6-*` classes. GitHub code search in this session reaches only hoist-react, so app
usage is not measured here - see Open questions.

## Approach

### Foundation: build on Floating UI, own the controls

Recommendation: build overlays on `@floating-ui/react`, which is already a dependency and already
powers both Blueprint's `PopoverNext` and Hoist's mobile `Popover`. Hand-roll the simple controls
as styled native elements. This adds no new UI library and keeps styling entirely in `--xh-*`
vars.

`@floating-ui/react` provides positioning plus the interaction hooks this work needs:
`useHover`, `useFocus`, `useDismiss`, `useRole`, `useListNavigation`, `useTypeahead`,
`FloatingFocusManager`, `FloatingPortal`, `FloatingTree` (nested menus) - see
<https://floating-ui.com/docs/react>.

Hoist inputs are already adapters. `HoistInputModel` owns value, commit, validation and
formatting, and the Blueprint control underneath does little:

- `NumberInput` renders `numericInput` with `buttonPosition: 'none'`. Hoist does its own parsing
  (shorthand units, commas while editing), formatting and commit, and already clamps Blueprint's
  arrow-key stepping to min/max (`desktop/cmp/input/NumberInput.ts:224`). A replacement is a
  `role="spinbutton"` input with arrow-key stepping. A headless NumberField would bring its own
  parsing and formatting, which would fight Hoist's.
- `Slider` maps a Hoist scale onto Blueprint's label, track-fill and range-handle props. A
  library would save pointer drag, per-thumb keyboard handling and ARIA, but likely not the tick
  labels.

So a headless library (React Aria Components, Base UI, Radix) would mostly pay off for one
control, Slider, at the cost of a new dependency with its own upgrade churn. Not worth it unless
the spike shows a hand-rolled range slider cannot reach keyboard and screen-reader parity at
reasonable cost. Do not mix overlay systems in any case: two focus, dismiss and portal models
conflict when nested.

"Identical behavior" here means the same Hoist props, look and keyboard behavior. DOM structure
and CSS classes change regardless, which is the app-facing break covered under Release strategy.

### Keep the seam, swap behind it

`kit/blueprint` is already the single integration point. Use that:

1. Create Hoist-owned implementations (e.g. `desktop/cmp/popover`, `desktop/cmp/overlay`) with
   Hoist-owned prop types.
2. Point framework code at them, one component family per PR.
3. Leave `kit/blueprint` exporting Blueprint, marked `@deprecated`, for apps still using it.
4. Drop the dependency in a later major, once internal use is zero and apps have had a release to
   migrate.

This lets each phase ship independently in normal majors, with upgrade notes, instead of one large
release.

## Phases

### Phase 0 - Spike and baselines (S)

- Build a Floating UI `Popover` and `Menu` (with submenu, keyboard nav, typeahead) behind the
  existing `popover` / `menu` factories on a branch. Run Toolbox against it.
- Build a hand-rolled range `Slider` and check keyboard and screen-reader parity with axe and a
  manual pass. This is the one case that could justify a headless library.
- Capture Playwright screenshots of Toolbox desktop pages in light and dark themes as a visual
  baseline. Unit tests here do not cover rendering, so this baseline is the main regression
  check for every later phase.
- List the a11y behavior to match per component (focus trap and restore, Escape, arrow keys,
  ARIA roles), taken from Blueprint's current behavior.

### Phase 1 - Decouple the public API (M, breaking)

- Define Hoist types to replace each item in [Blueprint types in Hoist's public
  API](#blueprint-types-in-hoists-public-api). Use Floating UI's `Placement` strings for
  position, and accept Blueprint `Position` values for one release with a dev-mode warning.
- Define `ButtonProps` explicitly. Decide which Blueprint button props to keep (`intent`,
  `minimal`, `outlined`, `active`, `rightIcon`, `loading` are likely in use) and drop the rest.
- Add Hoist class names (`xh-button`, `xh-button--minimal`, `xh-popover`, ...) alongside the
  `bp6-` classes now, so app CSS can move to them before the `bp6-` classes disappear.
- Fix the `@blueprintjs/core/src/...` imports.

### Phase 2 - Overlay stack (L, the core of the work)

In this order, since later items build on earlier ones:

1. **Portal and stacking** - one Hoist portal container and z-index scale, replacing
   `BlueprintProvider` / `PortalProvider`. Check interplay with AG Grid popups and
   `ModalSupport`.
2. **Popover** - 26 call sites through one factory. Port the viewport-padding middleware already
   in `kit/blueprint/Wrappers.ts`.
3. **Tooltip** - on the Popover base, keeping the `--xh-tooltip-*` vars.
4. **Menu, MenuItem, MenuDivider, submenus** - `FloatingTree`, list navigation, typeahead.
   `MenuButton`, `ContextMenu`, `DashContainerMenuButton` and ViewManager menus move with it.
5. **Context menu** - replace `showContextMenu`, used by `useContextMenu` and grid and dash
   container context menus.
6. **Dialog and Overlay** - focus trap, Escape, backdrop, scroll lock. 24 dialog call sites plus
   the `dialogBody` / `dialogFooter` helpers. `Mask` full-screen mode, DashCanvas and
   DashContainer use `overlay` and `Classes.OVERLAY_SCROLL_CONTAINER`.
7. **Toasts** - replace `OverlayToaster` in `ToastSource`.
8. **Hotkeys** - replace `useHotkeys` and the hotkeys help dialog (`?` key).

### Phase 3 - Controls (M, parallelizable)

One PR per Hoist component, each a contained change: `Button`, `ButtonGroup`, `Checkbox`,
`SwitchInput`, `RadioInput`, `TextInput`, `TextArea`, `NumberInput`, `SegmentedControl`,
`Slider` (single and range), `TabSwitcher`, `AppBar`, `Toolbar` overflow (`overflowList`, can
use `ResizeObserver`), `DateRangePicker` `controlGroup`, `LeftRightChooser` `callout`, admin
`tag`.

`NumberInput` and `Slider` carry the most behavior (stepping, keyboard, drag, range handles).
Budget for them accordingly.

### Phase 4 - CSS (M)

- Rewrite the 35 SCSS files and 11 TS files that reference `bp6-` classes against Hoist classes.
- Remove the `blueprint.css` import from `kit/blueprint/index.ts`. Port the global rules Hoist
  actually relies on (body font, heading and link styles, focus outline) into `styles/XH.scss` on
  purpose, and check the visual baseline for drift.
- Remove the `bp6-dark` toggle in `appcontainer/ThemeModel.ts:101` and
  `FocusStyleManager.onlyShowFocusOnTabs()` (use `:focus-visible`).

### Phase 5 - Remove the dependency (S, breaking)

- Remove `@blueprintjs/core` from `package.json`, delete `kit/blueprint`, and drop the Blueprint
  version in `svc/EnvironmentService.ts`.
- Remove icon stubbing from hoist-dev-utils in a matching major.
- Update `mcp/data/symbol-search.spec.ts:645`, which uses `@blueprintjs/core` as a fixture.
- Update `desktop/README.md`, `kit/README.md`, the docs index and doc registry
  (`xh-update-doc-links` skill).

## Release strategy

| Release | Contents | App impact |
|---|---|---|
| N | Phase 1. `kit/blueprint` marked deprecated for app use. | Type changes on button, menu and popover props. Hoist classes available. |
| N+1 | Phase 2 | Overlay markup and classes change. App CSS on `bp6-popover`, `bp6-dialog`, `bp6-menu` breaks. |
| N+2 | Phases 3-4 | Control markup changes. `blueprint.css` gone, so app styles relying on its globals may shift. |
| N+3 | Phase 5 | Apps still importing `kit/blueprint` must add their own `@blueprintjs/core` or migrate. |

Each release needs upgrade notes listing every removed class and prop, with before/after examples
(`xh-upgrade-notes` skill).

## Risks

- **Accessibility and keyboard parity.** Blueprint's menus, tabs, sliders and dialogs carry years
  of keyboard and ARIA fixes. Regressions are easy to ship and hard to notice. Mitigation: the
  Phase 0 behavior checklist, and a headless library for the hardest controls if needed.
- **Nested overlays.** Menu in popover in dialog, select dropdowns inside dialogs, grid filter
  popovers. Dismissal and focus across nesting levels are where custom overlay stacks usually
  break.
- **App CSS breakage.** Every `bp6-` selector in app code breaks silently, with no build error.
  Phase 1's parallel Hoist classes give apps a release to move.
- **Apps using `kit/blueprint` directly.** Size unknown until measured.
- **Visual drift** from dropping `blueprint.css` globals.

## Open questions

1. Floating UI plus hand-rolled controls is the default (see Foundation). Phase 0 confirms it,
   or shows that Slider alone needs a headless library.
2. How much do client apps import `kit/blueprint` or style `bp6-*` classes? A code search across
   app repos would size the migration burden and the length of the deprecation window.
3. Match Blueprint's current look exactly, or take the chance to restyle controls?
4. Pace: one phase per major as above, or compress Phases 2-4 into one release?
