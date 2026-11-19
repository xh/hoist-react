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
   caret glyph, the checkbox marks and the hotkeys dialog.
2. **Write each component's rules from what it needs, not from `BlueprintBase.css`.** That file
   holds only the Blueprint rules a coverage recording saw, and it missed states: open submenus,
   vertical sliders, toasts at top or left positions, inline overlays, popover arrows, the dark
   submenu caret, dialog footers and match-target-width popovers all needed fixes. For each
   component, read Blueprint 6.21's full `lib/css/blueprint.css` (in Toolbox's `node_modules`, or
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

- [ ] Rebuild the screenshot tooling (see the plan's Handoff section) and capture the baseline at
      this branch's starting commit.
- [ ] Settle the names for the `decide` and `per component` rows in `class-map.md`.
- [ ] Pilot one component end to end - `Button` and `ButtonGroup` - and check the screenshots.
- [ ] Menus, submenus and context menus.
- [ ] Popover and tooltip.
- [ ] Dialog, overlay and mask.
- [ ] Toasts.
- [ ] Hotkeys dialog.
- [ ] Inputs: `InputGroup`, `NumericInput`, `TextArea`, and the checkbox, switch and radio
      `Control`.
- [ ] `SegmentedControl`.
- [ ] `Slider`.
- [ ] Tabs: `TabList`, `TabSwitcher`, `DynamicTabSwitcher`.
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

## Running and checking

The plan's [Handoff](../blueprint-removal-plan.md#handoff---current-state) section covers running
Toolbox against this branch, type-checking Toolbox against local hoist-react, and rebuilding the
screenshot, CSS coverage and bundle-size tooling. Before each push, run `pnpm lint`,
`pnpm typecheck` and `pnpm test` in hoist-react.

Follow hoist-react's `CLAUDE.md`: no AI attribution in commits or PR descriptions, no em dashes,
and a CHANGELOG entry for anything that changes what an app sees.
