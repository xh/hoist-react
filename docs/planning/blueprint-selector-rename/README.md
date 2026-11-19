# Selector rename - handoff

The last part of removing Blueprint from hoist-react: rewrite every `bp6-*` selector against
Hoist's own `xh-*` classes and remove the `bp6-*` class names from Hoist's markup. It lands in v91,
with the rest of the Blueprint removal, so apps migrate their CSS once. The plan's
[Follow-up: selector rename](../blueprint-removal-plan.md#follow-up-selector-rename) and
[Release strategy](../blueprint-removal-plan.md#release-strategy) sections hold the decisions. This
file is the working guide.

## Branch and PR

- Branch `claude/blueprint-selector-rename`, stacked on `claude/blueprint-phase1-api` (draft
  xh/hoist-react#4995). Its draft PR targets that branch, so its diff shows only this work.
- Pull before every change - more than one agent pushes to these branches. When
  `claude/blueprint-phase1-api` moves, merge it into this branch. Do not rebase a pushed branch.
- When #4995 merges to `develop`, retarget this PR to `develop`.
- Never push to `claude/blueprint-phase1-api` from this work.

## Rules

1. **No visual change.** Before and after screenshots of every Toolbox desktop and Admin route, in
   light and dark, must match apart from regenerated data. Visual cleanups wait for a separate,
   later step, with expected differences: the Blueprint blue of checked controls, the submenu
   caret glyph and the checkbox marks. The hotkeys dialog is already a Hoist dialog, on #4995.
2. **Write each component's rules from what it needs, not from `BlueprintBase.css`.** That file
   holds only the Blueprint rules a coverage recording saw, and it missed states: open submenus,
   vertical sliders, toasts at top or left positions, inline overlays, popover arrows, the dark
   submenu caret, dialog footers and match-target-width popovers all needed fixes. For each
   component, read Blueprint 6.23.0's full `lib/css/blueprint.css` (in Toolbox's `node_modules`, or
   npm) and port every rule for states the component can reach, including `.bp6-dark` variants.
3. **Name with BEM**: `xh-<component>`, `xh-<component>__<part>`, `xh-<component>--<modifier>`.
   Many `xh-*` classes already sit beside the `bp6-*` ones - reuse them. Blueprint's generic
   modifiers (`bp6-active`, `bp6-minimal`, `bp6-intent-*` and the like) become modifiers of the
   component they are on, such as `xh-button--active`.
4. **Remove the `bp6-*` classes from markup in the same commit** as their rules move. Remove the
   `bp6-dark` and `bp6-focus-disabled` toggles too, keeping `xh-dark` and `xh-focus-disabled`.
5. **Replace `--bp-*` custom properties** with `--xh-*` variables, or with values.
6. **One component per commit**, with its markup, styles and specs together.

## Checklist

- [x] Rebuild the screenshot tooling (see the plan's Handoff section) and capture the baseline at
      this branch's starting commit.
- [x] Settle the names for the `decide` and `per component` rows in `class-map.md` - see [Names](#names).
- [x] Pilot one component end to end - `Button` and `ButtonGroup` - and check the screenshots.
      Done in `66bb6b763` and `2da1c1d7a`: computed styles and screenshots of every route match the
      baseline apart from data.
- [x] Menus, submenus and context menus. One approved visual change: pressing a success, primary
      or warning item tints it in its intent color, as danger items already did. List it in the
      CHANGELOG entry.
- [x] Popover and tooltip. One approved visual change: compact tooltips take Blueprint's tighter
      4px 8px padding, as Hoist's override comment intended. List it in the CHANGELOG entry.
      `PopoverImpl` still accepts `.bp6-disabled` on a target - drop it once no input renders it.
- [x] Dialog, overlay and mask. No visual change.
- [x] Toasts. No visual change.
- [x] Hotkeys dialog - done on #4995 (`675e3e1e0`), as a Hoist dialog with only `xh-*` classes.
- [x] Inputs: `InputGroup`, `NumericInput`, `TextArea`, and the checkbox, switch and radio
      `Control`. No visual change. Their rules live in `desktop/styles/Inputs.scss`. A Blueprint
      `:not(.bp6-focus-style-manager-ignore *)` stays in it for the focus toggle step.
- [x] `SegmentedControl`. No visual change. Options are `xh-segmented-control__option`, with
      `--selected` and `--disabled`, inside `xh-segmented-control__options`.
- [x] `Slider`. No visual change.
- [x] Tabs: `TabList`, `TabSwitcher`, `DynamicTabSwitcher`. No visual change. Base rules live in
      `desktop/cmp/tab/impl/TabList.scss`, which `TabContainer` imports ahead of `Tabs.scss`.
      Tab title and panel ids now use the `xh-tab-title_` and `xh-tab-panel_` prefixes.
      `BlueprintOverrides.scss` holds nothing now.
- [ ] `Toolbar` overflow and `AppBar`.
- [ ] Theme and focus style toggles.
- [ ] Every other stylesheet in the inventory's "Stylesheets with `bp6-*` selectors" list.
- [ ] No `--bp-*` custom properties left.
- [ ] Delete `desktop/styles/BlueprintBase.css` and `desktop/styles/BlueprintOverrides.scss`, and
      their imports in `desktop/register.ts`. Re-run `inventory.mjs` - its class table should be
      empty.
- [ ] Add the final `bp6-*` to `xh-*` mapping table to the v91 upgrade notes, Step 8.
- [ ] Add `docs/codemod/v91/codemod-bp6-classes.mjs` with a spec, modeled on
      `codemod-css-vars.mjs`. It rewrites the mapped selectors in app `.scss`, `.css` and TS class
      strings, and reports the ones it cannot map, such as combined classes and Blueprint internals
      with no Hoist equivalent.
- [ ] Add a development-mode warning naming any `bp6-` selector in the loaded stylesheets. Model it
      on `ThemeModel.warnOnDocumentRootVars()`, which scans `document.styleSheets` the same way.
- [ ] CHANGELOG entry under Breaking Changes, pointing at the codemod and the mapping table.
- [ ] hoist-chat-kit: move its 26 `bp6-` references in 14 files to `xh-*`, in a PR in that repo.
- [ ] Toolbox: move its 5 `bp6-` references in 2 files, on `claude/hoist-no-blueprint` or a branch
      stacked on it.
- [ ] Ask whether the `xh:hoist-upgrade` skill, in the hoist-ai plugin, needs a step to run the new
      codemod.
- [ ] Update the PR description and the plan's Handoff section as items land.

## Names

Settled names for the `decide` and `per component` rows in `class-map.md`. A `-` means the
element already carries the `xh-*` class, so the `bp6-*` class is only dropped.

**Generic modifiers** become modifiers of the component they sit on:

| Blueprint | Hoist |
|---|---|
| `bp6-active` | `xh-button--active`, `xh-menu-item--active`, `xh-slider__handle--active` |
| `bp6-active` set by a popover on its target | `xh-popover__target--active` |
| `bp6-minimal` on a segmented option | `xh-segmented-control__option--selected` on the selected option instead |
| `bp6-disabled` | `xh-button--disabled`, `xh-menu-item--disabled`, `xh-control--disabled`, `xh-input-group--disabled`, `xh-slider__body--disabled`, `xh-segmented-control__option--disabled` |
| `bp6-intent-*` | `xh-<component>--intent-*`, as `xh-button--intent-*` and `xh-menu-item--intent-*` already are |
| `bp6-minimal`, `bp6-outlined`, `bp6-fill`, `bp6-vertical` | `xh-button--*`, `xh-button-group--*`, `xh-tab-list--vertical`, `xh-slider__body--vertical` |
| `bp6-small` | the existing `xh-segmented-control--compact`, which is set exactly when Blueprint's small was, and `.xh-action-col-cell .xh-record-action-button` for grid action buttons - `xh-record-action-button` alone also marks `RecordActionBar` buttons, which are not small |
| `bp6-inline` | `xh-control--inline` - SegmentedControl never set it |
| `bp6-start`, `bp6-end` | `xh-slider__handle--start`, `xh-slider__handle--end` |
| `bp6-heading` | `xh-dialog__title` (-), `xh-menu-header__title`, `xh-hotkeys-dialog__group-title` |
| `bp6-icon` | `xh-menu-item__submenu-icon` (-) |
| `bp6-fill`, `bp6-text-overflow-ellipsis` on a menu item | `xh-menu-item__text` (-) |
| `bp6-align-left`, `bp6-align-right` | `xh-appbar__group--left`, `xh-appbar__group--right` |
| `bp6-compact` | `xh-tooltip--compact` |
| `bp6-read-only`, `bp6-round` | `xh-input-group--read-only`, `xh-input-group--round` (-) |

**Component parts:**

| Blueprint | Hoist |
|---|---|
| `bp6-navbar` | `xh-appbar` (-) |
| `bp6-control-group` | `xh-control-group`, a shared layout class |
| `bp6-numeric-input` | `xh-numeric-input` |
| `bp6-hotkey-label` | `xh-hotkeys-dialog__hotkey-label` |
| `bp6-modifier-key` | `xh-key--modifier` |
| `bp6-input-left-container`, `bp6-input-action` | `xh-input-group__left-element`, `xh-input-group__right-element`, after the `leftElement` and `rightElement` props |
| `bp6-menu` | `xh-menu-list` (-) |
| `bp6-submenu` | `xh-menu-item--submenu` on the parent item's `li`, `xh-menu__submenu` on the submenu's popover (-) |
| `bp6-overlay-backdrop`, `bp6-overlay-content`, `bp6-overlay-scroll-container` | the `xh-dialog__*`, `xh-overlay__*` and `xh-popover__content-overlay` classes already beside them (-) |
| `bp6-popover` | `xh-popover__content-wrapper` (-) |
| `bp6-popover-placement-*` | `xh-popover__content-wrapper--top` and the other sides (-) - rendered from a template string, so the inventory misses it |
| `bp6-popover-open`, `bp6-popover-target` | `xh-popover__target-wrapper--open`, `xh-popover__target-wrapper` (-) |
| `bp6-radio-group` | `xh-radio-input` (-) |
| `bp6-slider` and its parts | `xh-slider__body` for the inner element, with `xh-slider__track`, `__progress`, `__handle`, `__label`, `__axis`, and `xh-slider__body--unlabeled` |
| `bp6-tabs` and its parts | `xh-tab-list`, with `xh-tab-list__tabs`, `__tab`, `__indicator`, `__indicator-wrapper` |
| `bp6-toast-container-in-portal`, `-inline`, `-top` and the other edges | `xh-toast-container--portal`, `xh-toast-container--anchored` (-), `xh-toast-container--top` and so on |

## Inventory

`inventory.mjs` writes `class-map.md`: every `bp6-*` class Hoist renders or styles, a proposed
`xh-*` name, where it is rendered, how many `BlueprintBase.css` rules use it, and which other
stylesheets do. Run it from the hoist-react root:

```bash
node docs/planning/blueprint-selector-rename/inventory.mjs
```

Proposals are hints, not decisions:

- `xh-x` beside `bp6-x` in a file that renders it is the strongest hint. Still check that both
  classes are on the same element.
- `per component` rows are Blueprint's generic modifiers. Map them per component.
- `not rendered - drop` rows are styled but never rendered by Hoist. Their rules can go, unless an
  app's own markup needs them - the codemod report covers that case.

## Gotchas from the work so far

- `BlueprintBase.css` writes pseudo-elements as `:before`. Blueprint's file writes `::before`.
  Normalize both, and attribute quoting, before comparing selectors.
- `desktop/register.ts` loads `BlueprintBase.css` and `BlueprintOverrides.scss` ahead of each
  component's stylesheet, so a component rule wins a specificity tie. Moved rules must keep
  winning once those files are gone.
- Hoist's markup is not Blueprint's in places. A popover's target wrapper is a `span`, submenus
  render in a portal, the popover arrow is an SVG sized inline, and the slider and tab list are
  Hoist's own. Port the effect of a Blueprint rule, not its selector.
- A popover's `disabled` prop keeps it closed and must not reach its target - `FormField`
  disables its validation tooltip while a field is valid.
- Tooltips use a doubled `.bp6-tooltip.bp6-popover` selector in `BlueprintOverrides.scss` to beat
  Blueprint's dark rules. Check the reason for any such specificity trick before dropping it.
- `BlueprintBase.css` lacks about 200 button rules for states Toolbox never showed: intents in
  minimal and outlined groups, vertical and fill groups, menu buttons inside groups. Port from
  Blueprint's own file with `tools/translate.cjs`, which keeps each selector's specificity.
- Blueprint writes `[class*=bp6-intent-]` and `[class*=bp6-intent]` unquoted, and its rules on a
  component often share a selector list with rules on Blueprint markup Hoist never renders
  (`bp6-icon`, spinners, `bp6-large`). Map those context classes to `null` in the spec, so the
  shared rule is not mistaken for another component's.
- A rule that styles one component inside another - a button in an input group, toast or control
  group - stays in `BlueprintBase.css` with the moved component's `xh-*` selectors added beside its
  `bp6-*` ones. It keeps its place in the cascade, and moves when the outer component does. The
  Dialog and NumericInput commits must also port their button rules that `BlueprintBase.css`
  lacks: `.bp6-dialog-footer-actions .bp6-button` and the numeric input's vertical button group.
- Hoist's rules often pair classes, as in `.xh-button.bp6-button`. Write these as
  `.xh-button.xh-button`, not `.xh-button`, so they keep their specificity against component and
  app rules. PinPad's keys and the grid action column changed when the pilot dropped the class.
  Translated Blueprint rules then map class for class, with no `:where()`. Keep `.bp6-dark` in
  Hoist's dark selectors until the theme toggle step, for the same reason.
- Moved rules load later than they did. A Blueprint rule that lost a specificity tie to
  `BlueprintOverrides.scss` on source order now wins it from its component stylesheet. The pilot hit
  this with `.xh-button > :last-child` and the icon margin in `.bp6-input-group .xh-icon`, fixed
  with a more specific override. Expect more as the overrides move.
- Blueprint's full file can change states that Hoist renders today, where the coverage-derived base
  lacked a rule. For menus: Blueprint's `.bp6-popover-open > .bp6-menu-item` highlight outranks
  Hoist's `[aria-expanded]` one, and its headings truncate where Hoist's wrap. The spec drops those.
  Compare forced states, not only screenshots, and ask before keeping a change.
- Popover lives in shared `cmp/popover`, whose stylesheet also loads on mobile. Its Blueprint rules
  and Hoist's desktop overrides went to `desktop/styles/Popover.scss`, imported by
  `desktop/register.ts` right after `BlueprintBase.css`. Do the same for other shared components.
- The popover arrow is an SVG that floating-ui sizes and places, and an SVG renders no `::before`.
  Blueprint's rules on the arrow element itself only nudge it 3px into the tooltip, so the spec
  drops them and keeps the fills.
- Capture the before and after clients one after the other, not at once. Run together, they share
  one server user, and pages that persist grid state, such as Admin's Grid Formatter Parity test,
  differ by timing. Do not commit or edit hoist-react files while a capture runs: the pre-commit
  hook and Toolbox's docs tab both trigger a rebuild, and the page reloads mid-run.
- The bundler rewrites Blueprint's legacy `:-ms-input-placeholder` as `:placeholder-shown`, which
  Hoist never had. Drop vendor placeholder variants when porting from the full file.
- `styles.cjs` keys elements by their class context, so new `xh-*` modifiers on markup show as
  "missing after" and "new after" pairs. Strip them from the keys before comparing.
- `translate.cjs` leaves a context class it has no mapping for as-is, so the rule silently stops
  matching once markup drops it - Slider's `.bp6-disabled .bp6-slider-handle` did. After each
  build, grep the new stylesheet for `bp6-` and map or drop every hit.
- When ported base rules go in their own file, check that it loads before every stylesheet that
  overrides it. `TabContainer` imported `Tabs.scss` ahead of `TabList`, so the base rules won ties.
- Verify each step on the routes and opened UI that render the component, with `styles.cjs` and
  `capture.cjs` route filters and `popups.cjs` scenarios. A full-route pass takes hours.
- Start the Toolbox server and clients with `setsid nohup ... &`, not as background tasks, which
  are killed after two hours.
- A class Blueprint puts on two kinds of element maps to an `:is()` of both, which keeps the weight
  of the one class - `bp6-overlay` became `:is(.xh-dialog__overlay, .xh-overlay)`.
- A grid's right-click menu is AG Grid's own, not a Hoist menu. Check Hoist context menus on a
  `contextMenu` panel, such as Toolbox's Panels intro.
- Check that a `bp6-*` class and the `xh-*` class you map it to are on the same elements. Grid
  action buttons carry `bp6-small`, but `xh-record-action-button` is also on `RecordActionBar`
  buttons, which are not small.

## Tools

`tools/` holds the scripts that verify each step. Install their dependencies once with
`npm install` in that folder. They use the Playwright and Chromium already installed in a cloud
session. All of them expect Toolbox at `localhost:3000` against this checkout, on a throwaway
server with the `agent@xh.io` login. Set `BASE` to point one at another client.

For before and after runs, serve a second Toolbox client against a worktree at the starting commit
(symlink its `node_modules` to this checkout's), on its own port:

```bash
cd ../toolbox/client-app
XH_DEV_PORT=3001 XH_HOIST_REACT_PATH=<baseline worktree> ./node_modules/.bin/rsbuild dev --env-mode inlineHoist
```

Then run `styles.cjs` with `BASE=http://localhost:3001` and without, at the same time, so both
see the same server data.

- `capture.cjs <dir> [routeRegex]` - screenshots of every Toolbox desktop and Admin route, light
  and dark, with `Math.random` seeded, the clock fixed and the version bar's tab id pinned.
- `diff.cjs <before> <after> <diffDir>` - pixel diff of two captures. Two captures of the same
  commit differ only on data-driven pages - treemaps, Activity, Memory, Logs, the cube grids - so
  check those by eye.
- `styles.cjs <dir> '<selectors>' [routeRegex]` - computed styles of the matching elements, their
  descendants and pseudo-elements on every route, at rest and with `:hover`, `:active` and
  `:focus` forced through the DevTools protocol on each distinct context. Screenshots only show
  the rest state. A full run takes about 40 minutes and 1 GB.
- `stylediff.cjs <before> <after>` - compares two `styles.cjs` runs, grouped by difference.
  Elements are matched by their class context, not document order, which shifts with data.
- `why.cjs <app> <route> <theme> <selector> <props> [states]` - lists the rules that set the given
  properties on the first matching element, most specific first, with their specificity.
- `menus.cjs <dir>` - computed styles and screenshots of open menus, light and dark: the Panels
  menu button with its submenu, the Toolbars menu with headings, and the Panels context menu with
  its submenu, with `:hover`, `:active` and `:focus` forced on each item. It clones a plain item
  for the states Toolbox does not render (primary and warning intents, active, a label). Compare
  two runs with `stylediff.cjs`.
- `popups.cjs <dir> [scenarioRegex]` - computed styles and screenshots of open popovers and
  dialogs: Picker, IconPicker, GroupingChooser, DateRangePicker, a menu button, an app bar tooltip
  with cloned intent and compact variants, `XH.alert`, `confirm`, `prompt`, an exception dialog,
  and six toasts across intents and positions. About a minute and a half for both servers. Compare two runs with `stylediff.cjs`.
- `translate.cjs <spec> <css> <outDir>` - translates the Blueprint rules a spec names onto `xh-*`
  classes, class for class, so specificity is unchanged. `specs/button.cjs` is the Button spec and
  `specs/menu.cjs` the Menu spec. A `contextMap` value can be a function of the compound's
  classes, `dropDecls` leaves out properties of a translated rule, and `dropSelectors` leaves out
  translated selectors that match it. `specs/popover.cjs` is the Popover and Tooltip spec.
  Run it on Blueprint's full `blueprint.css` for the component's own rules (`own.css`), and on
  `BlueprintBase.css` for the rules shared with other components (`base.css`, edited in place).

## Running and checking

The plan's [Handoff](../blueprint-removal-plan.md#handoff---current-state) section covers running
Toolbox against this branch, type-checking Toolbox against local hoist-react, and rebuilding the
screenshot, CSS coverage and bundle-size tooling. Before each push, run `pnpm lint`,
`pnpm typecheck` and `pnpm test` in hoist-react.

Follow hoist-react's `CLAUDE.md`: no AI attribution in commits or PR descriptions, no em dashes,
and a CHANGELOG entry for anything that changes what an app sees.
