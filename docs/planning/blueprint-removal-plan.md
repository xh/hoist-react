# Plan: Removing BlueprintJS from hoist-react

Status: Phases 0-5 done - see [Phase 0 results](#phase-0-results), and
[Handoff](#handoff---current-state) for where the work stands. The selector rename follows as a
separate technical PR that must also land in v91 - see
[Follow-up: selector rename](#follow-up-selector-rename).
All phases land on one branch and one PR, xh/hoist-react#4995, reviewed and merged to `develop` as
a whole - see [Delivery](#delivery).
Baseline: `develop` at `5e18f21` (91.0.0-SNAPSHOT), `@blueprintjs/core` 6.23.

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
- One `Popover` for desktop and mobile. Mobile is already Blueprint-free, with its own smaller
  Floating UI popover (`mobile/cmp/popover/Popover.ts`). Phase 2 replaces both with a single
  component in `cmp/popover`.
- Overlays in the app font. Blueprint's portals set `font-family:
  var(--bp-typography-family-default)` (Blueprint's system font stack), so popovers, menus and
  dialogs ignore `--xh-font-family` today. Hoist-owned overlays inherit the app font.
- Keyboard support Blueprint lacks - see [Phase 0 results](#phase-0-results).

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
control, Slider, at the cost of a new dependency with its own upgrade churn. The Phase 0 spike
built a hand-rolled range slider at parity in under 300 lines, so no headless library is needed.
Do not mix overlay systems in any case: two focus, dismiss and portal models conflict when nested.

"Identical behavior" here means the same Hoist props, look and keyboard behavior. DOM structure
and CSS classes change regardless, which is the app-facing break covered under Release strategy.

### Keep the seam, swap behind it

`kit/blueprint` is already the single integration point. Use that:

1. Create Hoist-owned implementations (e.g. `cmp/popover`, `desktop/cmp/overlay`) with
   Hoist-owned prop types, kept in the same package as the component.
2. Point framework code at them, one component family at a time.
3. Leave `kit/blueprint` exporting Blueprint, marked `@deprecated`, for apps still using it.
4. Drop the dependency in a later major, once internal use is zero and apps have had a release to
   migrate.

### Delivery

All phases go on one branch and one PR (xh/hoist-react#4995), with commits grouped by phase, and
merge to `develop` together once the work is complete. `develop` is merged into the branch
periodically (merge commits, not rebases) to keep it current.

## Phases

### Phase 0 - Spike and baselines (S, done)

- Build a Floating UI `Popover` and `Menu` (with submenu, keyboard nav, typeahead) behind the
  existing `popover` / `menu` factories on a branch. Run Toolbox against it.
- Build a hand-rolled range `Slider` and check keyboard and screen-reader parity with axe and a
  manual pass. This is the one case that could justify a headless library.
- Capture Playwright screenshots of Toolbox desktop pages as a visual baseline. Unit tests here do
  not cover rendering, so this baseline is the main regression check for every later phase.
- List the a11y behavior to match per component (focus trap and restore, Escape, arrow keys,
  ARIA roles), taken from Blueprint's current behavior.

#### Phase 0 results

The spike code is on the `claude/inspiring-cerf-g3fry2` branch (xh/hoist-react#4993), off by
default. Set `localStorage.xhSpikeFloatingUi = 'true'`
and reload to switch the `popover`, `menu` / `menuItem` / `menuDivider`, `slider` / `rangeSlider`
factories and `showContextMenu` from Blueprint to the spike versions (`kit/blueprint/Spike.ts`).

| File | Lines | Replaces |
|---|---|---|
| `desktop/cmp/popover/impl/FloatingPopover.ts` | 530 | `PopoverNext` + `Overlay2` |
| `desktop/cmp/menu/impl/FloatingMenu.ts` | 316 | `Menu`, `MenuItem`, `MenuDivider` |
| `desktop/cmp/contextmenu/impl/FloatingContextMenu.ts` | 63 | `showContextMenu` |
| `desktop/cmp/input/impl/SliderImpl.ts` | 281 | `Slider`, `RangeSlider` |

Each emits Blueprint's DOM and `bp6-*` classes, so existing Hoist and app styles apply unchanged.
Checked by Playwright against Toolbox, with and without the flag:

- **Visual** - screenshots of the app menu, a DashContainer context menu and submenu, a column
  filter, GroupingChooser, DateInput and the Slider page match. Remaining diffs are sub-pixel, plus
  the font change below.
- **Popover** - open, Escape, outside click, a select inside a popover, menu-item dismissal, date
  picking and backdrop clicks all behave as Blueprint does. Position is identical.
- **Menu** - mouse behavior matches, including a diagonal move into a submenu and clicking a
  nested leaf. Blueprint's menu has no keyboard navigation at all: focus never leaves the popover.
  The spike adds arrow keys, Home/End, typeahead, Enter to activate, and ArrowRight / ArrowLeft /
  Escape for submenus, with Escape closing one level at a time.
- **Slider** - arrow keys, track click, drag and range handles that cannot cross match. The spike
  adds Home/End and PageUp/PageDown, `aria-valuetext` from the label renderer ("$62k", not
  "62000"), and per-handle `aria-valuemin` / `aria-valuemax` on a range. axe reports the same
  result in both modes: 10 handles with no accessible name, an existing gap where a slider is not
  inside a labeled `FormField`.
- **Focus** - Blueprint drops focus to `<body>` when Escape closes a popover. The spike returns it
  to the target.

Findings that shape the later phases:

- **No headless library needed.** Floating UI covers overlays, and the hand-rolled slider reached
  parity.
- **Overlays can nest across systems.** A popover treats presses inside any body-level layer
  mounted after its own (a submenu, a react-select menu, an AG Grid popup, a Blueprint overlay) as
  inside. This lets Blueprint and Hoist overlays coexist during the migration.
- **Blueprint's own class names can stay on Hoist markup** for a transition release, so app CSS
  keeps working while apps move to `xh-*` classes. This shortens the release plan below.
- **Not built in the spike:** `enforceFocus`, transitions, tooltips, dialogs, toasts, hotkeys and
  the simple controls. The spike still takes Blueprint prop types and uses Blueprint's
  `popoverPropsToNextProps`. Phase 2 code would use Hoist-owned types.

### Phase 1 - Decouple the public API (M, done)

Types only - runtime behavior is unchanged.

- Added `PopoverPosition` and `PopoverBoundary` to a new `cmp/popover` package, the home of the
  Phase 2 `Popover`. They keep Blueprint's position strings (`bottom-left`), not Floating UI's
  `Placement` strings (`bottom-start`) as first planned. Blueprint's `Position` constants are those
  same strings, so existing app code still compiles. Phase 2 maps them to Floating UI internally.
- `ButtonProps` and `ButtonGroupProps` keep their declared props plus native `<button>` / `<div>`
  attributes. They drop Blueprint-only props (`loading`, `alignText`, `large`, `small`, ...) that
  neither hoist-react nor Toolbox use.
- `MenuButtonProps.popoverProps` takes a Hoist `MenuButtonPopoverProps` subset. Phase 2 replaces it
  with the shared `PopoverProps`.
- Added a Hoist-owned `HotkeyConfig` to `desktop/hooks`, removing the `@blueprintjs/core/src/...`
  imports. Deprecated `DateInputProps.popoverModifiers`.
- Toolbox typechecks against the branch with no errors.
- Deferred: `xh-*` classes alongside `bp6-*` ones. Under the two-release plan, each component gets
  them when it is rebuilt.

### Phase 2 - Overlay stack (L, the core of the work)

In this order, since later items build on earlier ones:

1. **Portal and stacking** - one Hoist portal container and z-index scale, replacing
   `BlueprintProvider` / `PortalProvider`. Check interplay with AG Grid popups and
   `ModalSupport`.
2. **Popover** - one cross-platform `Popover` in `cmp/popover`, built from the spike, replacing
   both Blueprint's on desktop (26 call sites through one factory) and mobile's own
   `mobile/cmp/popover/Popover.ts`. Port the viewport-padding middleware already in
   `kit/blueprint/Wrappers.ts`.
    - Mobile's props (`content`, `isOpen`, `onInteraction`, `disabled`, `position`, `backdrop`,
      `popoverClassName`) are a subset of the spike's. Mobile's one framework call site is its
      `MenuButton`.
    - Platform defaults cover mobile's own behavior: a transparent tap-catching backdrop that
      respects the safe-area insets, fixed positioning, and `auto` placement. Closing on route
      change moves into the shared component for both platforms.
    - Mobile apps import the shared component from `@xh/hoist/cmp/popover`. Phase 5 removed
      `mobile/cmp/popover`.
    - The shared component must not import `kit/blueprint`, which would pull Blueprint into mobile
      bundles. Check mobile bundle size before and after.
    - Test touch behavior with Playwright's mobile emulation and on a device - in particular that
      focus handling on open does not raise the on-screen keyboard. Toolbox's
      `docs/running-locally.md` covers on-device testing.
    - A shared `PopoverProps` replaces `MenuButtonPopoverProps`, and mobile's inline position union
      moves to `PopoverPosition`.
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

One commit per Hoist component, each a contained change: `Button`, `ButtonGroup`, `Checkbox`,
`SwitchInput`, `RadioInput`, `TextInput`, `TextArea`, `NumberInput`, `SegmentedControl`,
`Slider` (single and range), `TabSwitcher`, `AppBar`, `Toolbar` overflow (`overflowList`, can
use `ResizeObserver`), `DateRangePicker` `controlGroup`, `LeftRightChooser` `callout`, admin
`tag`.

`NumberInput` and `Slider` carry the most behavior (stepping, keyboard, drag, range handles).
Budget for them accordingly.

### Phase 4 - CSS (M, done)

- Replaced `blueprint.css` (567 KB) with `desktop/styles/BlueprintBase.css` (158 KB): the 649
  Blueprint rules Hoist's desktop components match, light or dark, with their state variants and
  the custom properties and keyframes they use. Found by recording CSS coverage across all 120
  Toolbox desktop routes and 41 Admin routes in both themes, with menus, dialogs, toasts and the
  hotkeys dialog open. Hoist's overrides moved to `desktop/styles/BlueprintOverrides.scss`. Both
  load from `desktop/register.ts`, ahead of each component's stylesheet.
- Screenshots of every route in both themes, with and without `blueprint.css`, match apart from
  regenerated data.
- `installFocusStyle()` replaces `FocusStyleManager.onlyShowFocusOnTabs()`, with the same
  mouse/Tab switch rather than `:focus-visible`, which would show outlines on clicked text inputs.
- The `useBlueprint` fallbacks were dropped rather than shipped for a release.
- The selector rename moved to a follow-up PR - see below.

### Phase 5 - Remove the dependency (S, breaking, done)

- Removed `@blueprintjs/core`, `kit/blueprint`, and the Blueprint version in
  `svc/EnvironmentService.ts` and the Admin About panel.
- Apps build menu items from `MenuItem` configs, the replacement for Blueprint's `menuItem`.
  `MenuItem.rightElement` takes the place of `labelElement`, and a click on a control within it
  does not run the item's `actionFn` or close the menu. Hoist's own menus use configs too, so
  `menuItem` and `menuDivider` stay internal to `desktop/cmp/menu`.
- Removed the `mobile/cmp/popover` re-export of the shared `Popover`.
- Updated docs, the doc registry and the v91 upgrade notes (Step 8 maps each `kit/blueprint`
  import to its replacement).
- Toolbox moved off `kit/blueprint` in its own branch.
- Still to do in hoist-dev-utils: remove its Blueprint icon stubbing. Until then, builds log a
  harmless warning that `@blueprintjs/icons` could not be resolved.

### Handoff - current state

Notes for picking the work up in a new session. Pull before every change - more than one agent
pushes to this branch.

**Branches and PRs**
- hoist-react: `claude/blueprint-phase1-api`, draft xh/hoist-react#4995.
- Toolbox: `claude/hoist-no-blueprint`, draft xh/toolbox#965 - merge together with #4995.

**Decisions made after the phases above**
- `Tooltip` and `TooltipProps` live in their own `@xh/hoist/cmp/tooltip` package, a facade over
  `cmp/popover/impl/PopoverImpl`. `cmp/popover` does not export them.
- Desktop `ButtonProps.tooltip` takes `string | ButtonTooltipConfig` and renders a Hoist `Tooltip`
  on the button itself, with no wrapper. `title` stays the native tooltip. Button tooltips open
  after 500ms, and on disabled buttons too - driven by pointer events, since React drops
  `onMouseEnter` on a disabled button. Hoist's own buttons default `tooltip`, giving way to an
  app's `title`.
- A tooltip closes when its target is pressed and stays closed until the pointer leaves.
- `portalContainerProvider` is internal, in `cmp/popover/impl`.
- `menuItem` and `menuDivider` are not exported. Apps and Hoist's own menus build items from
  `MenuItem` configs, and `MenuItem.rightElement` takes the place of Blueprint's `labelElement`.
- Submenus render in a portal, so the parent menu and its popover cannot clip them.
- New internal components use `hoistCmp.factory` with `model: false` and `observer: false`.

**Still to check in a browser**
- Button tooltips - position, delay, close on press, and disabled buttons in Firefox and Safari.
- Mobile on a real device, the popped-out Inspector, tab and sparkline tooltips.

**Still to do**
- The selector rename PR below, on branch `claude/blueprint-selector-rename` - its working guide
  and class inventory are in [blueprint-selector-rename](blueprint-selector-rename/README.md).
- hoist-dev-utils: remove its Blueprint icon stubbing, which now logs a harmless warning.

**Running Toolbox against this branch** - see the root `CLAUDE.md`. In a cloud session:
- Start the server and client detached with `setsid nohup ... &`, so they outlive the 2-hour limit
  on background commands. The server needs `JAVA_HOME` and
  `-Porg.gradle.java.installations.paths` set to a JDK 25, plus the throwaway H2 settings and the
  `agent@xh.io` / `localDevOnly` login.
- Start the client from the Toolbox worktree with
  `XH_HOIST_REACT_PATH=<hoist-react path> pnpm startWithHoist`.
- To type-check Toolbox against local hoist-react, use a temporary copy of its `tsconfig.json`
  with the `paths` block uncommented and `references` removed.
- Toolbox's pre-commit typecheck runs against the published `@xh/hoist`, which lacks this
  branch's APIs - commit Toolbox changes with `--no-verify` until hoist-react publishes them.

**Verification tooling** - the scripts used so far lived in a session scratchpad and are gone.
Rebuild them as needed:
- Screenshots: Playwright over every Toolbox desktop and Admin route, in light and dark, against
  two Toolbox builds - one on `develop` hoist-react, one on this branch - then a pixel diff.
- CSS coverage, for regenerating `BlueprintBase.css`: Playwright's `startCSSCoverage` across the
  same routes plus state variants, keeping the Blueprint rules used.
- Bundle size: production Toolbox builds with hoist-react compiled inline. The build refuses
  inline Hoist for a prod build, so patch `configureRsbuild.js` in Toolbox's `node_modules`
  temporarily to allow it, and restore it after.

### Follow-up: selector rename

A separate technical PR, which lands in v91 with the rest of this work, so apps migrate their CSS
once:

- Rewrite `BlueprintBase.css` and the SCSS and TS that reference `bp6-*` classes against `xh-*`
  classes, moving rules into each component's stylesheet. Write each component's rules from what it
  needs, not from the coverage recording, which missed states such as open submenus.
- Replace the `--bp-*` custom properties with `--xh-*` variables or values. Settle the remaining
  Blueprint looks along the way: the hotkeys dialog, the submenu caret glyph, the checkbox marks
  and the Blueprint blue of checked controls.
- Remove the `bp6-*` classes from Hoist's markup in the same PR, with no aliases, along with the
  `bp6-dark` and `bp6-focus-disabled` toggles. Delete `BlueprintBase.css` and
  `BlueprintOverrides.scss`.
- Add a `bp6-*` to `xh-*` mapping table to the v91 upgrade notes.
- Add a codemod to `docs/codemod/v91`, as for the CSS variables. It rewrites the mapped selectors
  in app `.scss`, `.css` and TS class strings, and reports the ones it cannot map - combined classes
  such as `.bp6-button.bp6-minimal`, and Blueprint internals with no Hoist equivalent. The
  `xh:hoist-upgrade` skill runs it and works through the report.
- In development mode, scan the loaded stylesheets at startup and log a warning naming any `bp6-`
  selector, as Hoist does for old CSS variable names. App CSS on a removed class otherwise fails
  silently.
- Migrate hoist-chat-kit (26 `bp6-` references in 14 files) and Toolbox (5 in 2 files) in the same
  release - chat-kit renders inside apps, so its CSS must move with Hoist's.
- Verify with the same before/after screenshots of every route.

## Release strategy

One release. Everything lands in v91 with no fallback flags, including the selector rename, so
Hoist's markup carries only `xh-*` classes when v91 ships. v91 already asks apps to migrate their
CSS, with the CSS variable codemod, so the `bp6-*` codemod runs in the same upgrade rather than in
a second breaking release. Apps importing `kit/blueprint` or `@blueprintjs/core` move to Hoist's
components, as in the v91 upgrade notes.

## Risks

- **Accessibility and keyboard parity.** Regressions are easy to ship and hard to notice.
  Phase 0 found the bar lower than expected for menus and sliders, where Blueprint lacks keys the
  spike adds. Dialogs (focus trap) and tabs are not yet checked. Mitigation: the Phase 0
  Playwright checks, extended per component.
- **Nested overlays.** Menu in popover in dialog, select dropdowns inside dialogs, grid filter
  popovers. Dismissal and focus across nesting levels are where custom overlay stacks usually
  break. The spike's layer-order rule handled every case tested; popovers inside dialogs remain
  to check.
- **App CSS breakage.** Every `bp6-` selector in app code breaks silently, with no build error.
  Mitigation: the codemod rewrites the mapped selectors and reports the rest, and the
  development-mode warning names any `bp6-` selector left in loaded stylesheets.
- **Apps using `kit/blueprint` directly.** Size unknown until measured.
- **Visual drift** from dropping `blueprint.css` globals.

## Open questions

1. How much do client apps import `kit/blueprint` or style `bp6-*` classes? A code search across
   app repos would size the migration, and show which unmapped selectors the codemod should
   handle.
2. Match Blueprint's current look exactly, or take the chance to restyle controls?

Resolved by Phase 0: Floating UI plus hand-rolled controls, with no headless library. Release
pace: one release - see [Release strategy](#release-strategy).
