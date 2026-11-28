# Hoist React v92 Upgrade Notes

> **From:** v91.x → v92.0.0 | **Released:** TBD | **Difficulty:** 🟠 MEDIUM

## Overview

Hoist React v92 removes Blueprint. Hoist's desktop components render their own markup and behavior,
built on Floating UI for popovers and tooltips, and Hoist no longer loads Blueprint's stylesheet.
Desktop overlays and controls look and behave as before, with keyboard and focus improvements.

- **Blueprint removed (required if your app imports from `@xh/hoist/kit/blueprint`)** - see Step 2.
  Replace each Blueprint import with Hoist's equivalent component.
- **Blueprint class names removed (required if your app CSS targets `bp6-*` classes)** - see
  Step 3. A codemod renames them to Hoist's `xh-*` classes.

The most significant impacts are:

- **Imports from `@xh/hoist/kit/blueprint` fail to build.** The package is gone. Blueprint
  components an app imports directly from `@blueprintjs/core` also need replacing.
- **Desktop button tooltips are no longer native `title` attributes.** Test automation that finds
  buttons by title no longer matches buttons that set `tooltip`.
- **App CSS that targets `bp6-*` classes or reads `--bp-*` variables no longer applies.** Hoist
  renders neither, and logs a development-mode warning naming any left in a stylesheet.

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v91.x. An app upgrading from an earlier version should complete the
  prior upgrade notes first.

## Upgrade Steps

### 1. Update `package.json`

**File:** `client-app/package.json`

Before:

```json
"dependencies": {
    "@xh/hoist": "^91.0.0"
}
```

After:

```json
"dependencies": {
    "@xh/hoist": "^92.0.0"
}
```

Then run `pnpm install`, `yarn install`, or `npm install`.

### 2. Replace Blueprint Imports

Hoist no longer uses Blueprint. Its desktop components render their own markup and behavior,
`@xh/hoist/kit/blueprint` is gone, and `@blueprintjs/core` is no longer a dependency of Hoist. Find
the imports to change:

```bash
grep -rn "@xh/hoist/kit/blueprint\|@blueprintjs\|@xh/hoist/mobile/cmp/popover" src
```

Mobile apps import `popover` from `@xh/hoist/cmp/popover` in place of the removed
`@xh/hoist/mobile/cmp/popover`. Replace each Blueprint component, whether from
`@xh/hoist/kit/blueprint` or `@blueprintjs/core`, with Hoist's equivalent:

| Was (Blueprint) | Now |
|---|---|
| `dialog`, `Dialog` | `dialog` from `@xh/hoist/desktop/cmp/dialog` |
| `dialogBody`, `dialogFooter`, `dialogFooterActions` | The same names from `@xh/hoist/desktop/cmp/dialog` |
| `popover`, `Popover` | The same names from `@xh/hoist/cmp/popover` |
| `tooltip`, `Tooltip` | The same names from `@xh/hoist/cmp/tooltip` |
| `menuItem`, `menuDivider` | A `MenuItem` config, and `'-'` or `{heading}` for a divider. Map `onClick` to `actionFn`, `labelElement` to `rightElement`, and `shouldDismissPopover: false` to `keepMenuOpen: true` |
| `menu` | `menu` or `menuButton` from `@xh/hoist/desktop/cmp/menu`, with `MenuItem` configs |
| `showContextMenu` | `useContextMenu` from `@xh/hoist/desktop/hooks`, or `PanelProps.contextMenu` |
| `useHotkeys`, `HotkeyConfig` | The same names from `@xh/hoist/desktop/hooks` |
| `OverlayToaster` | `XH.toast()` |
| `alert` | `XH.message()`, `XH.alert()` or `XH.confirm()` |
| `callout` | `callout` from `@xh/hoist/cmp/callout` |
| `bpCard` | `card` from `@xh/hoist/cmp/card` |
| `switchControl` | `switchInput` from `@xh/hoist/desktop/cmp/input` |
| `radio`, `radioGroup` | `radioInput` from `@xh/hoist/desktop/cmp/input` |
| `textArea` | `textArea` from `@xh/hoist/desktop/cmp/input` |
| `rangeSlider` | `slider` from `@xh/hoist/desktop/cmp/input`, with a two-number array as its value |
| `tag` | No standalone equivalent. For tags in a grid cell, `tagsRenderer` from `@xh/hoist/cmp/grid` |
| `button`, `checkbox`, `inputGroup`, `numericInput`, `slider` and other controls | Hoist's components in `@xh/hoist/desktop/cmp/button` and `@xh/hoist/desktop/cmp/input` |
| `Position.BOTTOM_LEFT` and other `Position` values | The string, e.g. `'bottom-left'`, typed as `PopoverPosition` from `@xh/hoist/cmp/popover` |
| `PopoverInteractionKind.HOVER` and other kinds | The string, e.g. `'hover'` |
| `Classes.*` | Your own class name - Hoist styles none of Blueprint's classes, see Step 3 |

Before:

```typescript
import {dialog, tooltip} from '@xh/hoist/kit/blueprint';

dialog({title: 'Edit', isOpen: model.isOpen, onClose: () => model.close(), children: form()});
tooltip({content: 'Refresh now', position: 'bottom', children: button({icon: Icon.refresh()})});
```

After:

```typescript
import {tooltip} from '@xh/hoist/cmp/tooltip';
import {dialog} from '@xh/hoist/desktop/cmp/dialog';

dialog({title: 'Edit', isOpen: model.isOpen, onClose: () => model.close(), children: form()});
tooltip({content: 'Refresh now', position: 'bottom', children: button({icon: Icon.refresh()})});

// Or, for a desktop button, pass the tooltip to the button itself
button({icon: Icon.refresh(), tooltip: {content: 'Refresh now', position: 'bottom'}});
```

Desktop `ButtonProps.tooltip` now shows a Hoist `Tooltip` rather than setting the native `title`.
Test automation that finds buttons by title (e.g. Playwright's `getByTitle`) no longer matches
buttons that set `tooltip` - set `title` on those buttons, or find them by `testId`.

The props carry over, except Blueprint-only ones. Hoist's `Dialog` always renders in a portal, so
drop `usePortal`. A `Tooltip` takes `position`, not `placement`, and has no `targetProps` - set
handlers and classes on its child instead.

A popover no longer takes Popper.js `modifiers`, including in `MenuButtonProps.popoverProps`. Set
`offset` for the distance from the target:

```typescript
// Before
menuButton({popoverProps: {modifiers: {offset: {enabled: true, options: {offset: [0, 4]}}}}});

// After
menuButton({popoverProps: {offset: {mainAxis: 4}}});
```

Do not add `@blueprintjs/core` to an app to keep a Blueprint component. Move it onto Hoist's
nearest component, such as a tree-mode `Grid` for a `Tree` or a `textInput` for `EditableText`.

Builds with `@xh/hoist-dev-utils` may log `Could not resolve @blueprintjs/icons - Blueprint icon
stubs disabled`. With no Blueprint in the app, this is harmless.

A desktop `Mask` with `inline: false` renders in Hoist's own overlay, not a Blueprint one.

### 3. Rename Blueprint Class Names

Hoist's markup no longer carries Blueprint's `bp6-*` class names, and Hoist no longer ships
Blueprint's styles or its `--bp-*` CSS variables. App CSS that targets a `bp6-*` class, or reads a
`--bp-*` variable, no longer applies. Run the codemod from `client-app` to rename them:

```bash
node node_modules/@xh/hoist/docs/codemod/v92/codemod-bp6-classes.mjs src
```

It renames each component class with one Hoist equivalent, in stylesheets and in TypeScript class
strings, and renames Blueprint's generic modifiers (`bp6-minimal`, `bp6-active`, `bp6-intent-*` and
the like) where the same compound selector names the component. It lists, with file and line,
everything it leaves for you: a modifier nested under its component (`&.bp6-active`), a class with
more than one Hoist name, a class Hoist never renders, and each `--bp-*` variable read. Pass
`--dry` to see the report without writing.

In development mode, Hoist logs a console warning listing any `bp6-*` class or `--bp-*` variable
still used in a loaded stylesheet.

A selector that paired a Hoist class with a Blueprint one, such as `.xh-button.bp6-button`, becomes
`.xh-button.xh-button`. The repeated class keeps the selector's specificity, so it still outranks
the rules it did before.

Blueprint's typography classes - `bp6-code`, `bp6-key`, `bp6-running-text`, `bp6-text-muted`,
`bp6-heading` and the like - have no Hoist equivalent. Style that markup with your own classes. For
`--bp-*` variables, use the value or the nearest `--xh-*` variable.

| Blueprint | Hoist | Modifiers on it |
|---|---|---|
| `bp6-button` | `xh-button` | `bp6-minimal` → `xh-button--minimal`, `bp6-outlined` → `xh-button--outlined`, `bp6-active` → `xh-button--active`, `bp6-disabled` → `xh-button--disabled`, `bp6-intent-*` → `xh-button--intent-*` |
| `bp6-button-group` | `xh-button-group` | `bp6-minimal` → `xh-button-group--minimal`, `bp6-outlined` → `xh-button-group--outlined`, `bp6-vertical` → `xh-button-group--vertical`, `bp6-fill` → `xh-button-group--fill` |
| `bp6-button-text` | `xh-button__text` |  |
| `bp6-menu` | `xh-menu-list` |  |
| `bp6-menu-item` | `xh-menu-item` | `bp6-active` → `xh-menu-item--active`, `bp6-disabled` → `xh-menu-item--disabled`, `bp6-intent-*` → `xh-menu-item--intent-*` |
| `bp6-menu-item-icon` | `xh-menu-item__icon` |  |
| `bp6-menu-item-label` | `xh-menu-item__label` |  |
| `bp6-menu-header` | `xh-menu-header` |  |
| `bp6-menu-divider` | `xh-menu-divider` |  |
| `bp6-submenu-icon` | `xh-menu-item__submenu-icon` |  |
| `bp6-context-menu-popover` | `xh-context-menu` |  |
| `bp6-context-menu-backdrop` | `xh-context-menu__backdrop` |  |
| `bp6-popover` | `xh-popover__content-wrapper` | `bp6-minimal` → `xh-popover__content-wrapper--minimal` |
| `bp6-popover-content` | `xh-popover__content` |  |
| `bp6-popover-arrow` | `xh-popover__arrow` |  |
| `bp6-popover-arrow-border` | `xh-popover__arrow-border` |  |
| `bp6-popover-arrow-fill` | `xh-popover__arrow-fill` |  |
| `bp6-popover-target` | `xh-popover__target-wrapper` |  |
| `bp6-popover-open` | `xh-popover__target-wrapper--open` |  |
| `bp6-active` on a popover's target | `xh-popover__target--active` | Set while an uncontrolled click popover is open. The target itself carries `xh-popover__target` |
| `bp6-popover-transition-container` | `xh-popover__floating` |  |
| `bp6-popover-dismiss` | `xh-popover-dismiss` |  |
| `bp6-popover-match-target-width` | `xh-popover__content-wrapper--match-target-width` |  |
| `bp6-popover-placement-top` | `xh-popover__content-wrapper--top` |  |
| `bp6-popover-placement-bottom` | `xh-popover__content-wrapper--bottom` |  |
| `bp6-popover-placement-left` | `xh-popover__content-wrapper--left` |  |
| `bp6-popover-placement-right` | `xh-popover__content-wrapper--right` |  |
| `bp6-tooltip` | `xh-tooltip` | `bp6-compact` → `xh-tooltip--compact`, `bp6-intent-*` → `xh-tooltip--intent-*` |
| `bp6-dialog` | `xh-dialog` |  |
| `bp6-dialog-header` | `xh-dialog__header` |  |
| `bp6-dialog-close-button` | `xh-dialog__close-button` |  |
| `bp6-dialog-body` | `xh-dialog__body` |  |
| `bp6-dialog-footer` | `xh-dialog__footer` |  |
| `bp6-dialog-footer-actions` | `xh-dialog__footer-actions` |  |
| `bp6-dialog-container` | `xh-dialog__container` |  |
| `bp6-toast` | `xh-toast` | `bp6-intent-*` → `xh-toast--intent-*` |
| `bp6-toast-message` | `xh-toast__message` |  |
| `bp6-toast-container` | `xh-toast-container` |  |
| `bp6-toast-container-in-portal` | `xh-toast-container--portal` |  |
| `bp6-toast-container-inline` | `xh-toast-container--anchored` |  |
| `bp6-toast-container-top` | `xh-toast-container--top` |  |
| `bp6-toast-container-bottom` | `xh-toast-container--bottom` |  |
| `bp6-toast-container-left` | `xh-toast-container--left` |  |
| `bp6-toast-container-right` | `xh-toast-container--right` |  |
| `bp6-input-group` | `xh-input-group` | `bp6-disabled` → `xh-input-group--disabled`, `bp6-read-only` → `xh-input-group--read-only`, `bp6-round` → `xh-input-group--round` |
| `bp6-input-action` | `xh-input-group__right-element` |  |
| `bp6-input-left-container` | `xh-input-group__left-element` |  |
| `bp6-text-area` | `xh-text-area` |  |
| `bp6-control` | `xh-control` | `bp6-disabled` → `xh-control--disabled`, `bp6-inline` → `xh-control--inline`, `bp6-align-left` → `xh-control--align-left`, `bp6-align-right` → `xh-control--align-right` |
| `bp6-checkbox` | `xh-control--checkbox` |  |
| `bp6-switch` | `xh-control--switch` |  |
| `bp6-radio` | `xh-control--radio` |  |
| `bp6-control-indicator` | `xh-control__indicator` |  |
| `bp6-control-input` | `xh-control__input` |  |
| `bp6-control-group` | `xh-control-group` |  |
| `bp6-numeric-input` | `xh-numeric-input` |  |
| `bp6-radio-group` | `xh-radio-input` |  |
| `bp6-segmented-control` | `xh-segmented-control__options` |  |
| `bp6-slider` | `xh-slider__body` | `bp6-disabled` → `xh-slider__body--disabled`, `bp6-vertical` → `xh-slider__body--vertical` |
| `bp6-slider-unlabeled` | `xh-slider__body--unlabeled` |  |
| `bp6-slider-track` | `xh-slider__track` |  |
| `bp6-slider-progress` | `xh-slider__progress` | `bp6-intent-*` → `xh-slider__progress--intent-*` |
| `bp6-slider-handle` | `xh-slider__handle` | `bp6-start` → `xh-slider__handle--start`, `bp6-end` → `xh-slider__handle--end`, `bp6-active` → `xh-slider__handle--active` |
| `bp6-slider-label` | `xh-slider__label` |  |
| `bp6-slider-axis` | `xh-slider__axis` |  |
| `bp6-tabs` | `xh-tab-list` | `bp6-vertical` → `xh-tab-list--vertical` |
| `bp6-tab-list` | `xh-tab-list__tabs` |  |
| `bp6-tab` | `xh-tab-list__tab` |  |
| `bp6-tab-indicator-wrapper` | `xh-tab-list__indicator-wrapper` |  |
| `bp6-tab-indicator` | `xh-tab-list__indicator` |  |
| `bp6-navbar` | `xh-appbar` |  |
| `bp6-navbar-group` | `xh-appbar__group` | `bp6-align-left` → `xh-appbar__group--left`, `bp6-align-right` → `xh-appbar__group--right` |
| `bp6-navbar-divider` | `xh-separator` | AppBar and Toolbar separators are both a shared `Separator` |
| `bp6-overflow-list` | `xh-overflow-list` |  |
| `bp6-overflow-list-spacer` | `xh-overflow-list__spacer` |  |
| `bp6-dark` | `xh-dark` |  |
| `bp6-focus-disabled` | `xh-focus-disabled` |  |
| `bp6-input` | `xh-input-group__input` on an InputGroup input, `xh-text-area` on a TextArea | |
| `bp6-overlay` | `xh-dialog__overlay` on a Dialog, `xh-overlay` on an Overlay | |
| `bp6-overlay-content` | `xh-dialog__container` on a Dialog, `xh-overlay__content` on an Overlay | |
| `bp6-overlay-backdrop` | `xh-dialog__backdrop`, `xh-overlay__backdrop` or `xh-popover__content-overlay` | |
| `bp6-overlay-open` | nothing on the overlay itself, `xh-overlay-open` on the body | |
| `bp6-overlay-scroll-container` | `xh-dialog__overlay` on a Dialog, `xh-overlay--scroll-container` on an Overlay | |
| `bp6-heading` | `xh-dialog__title` on a dialog title, `xh-menu-header__title` on a menu heading | |
| `bp6-button` inside `bp6-segmented-control` | `xh-segmented-control__option` | `bp6-disabled` → `xh-segmented-control__option--disabled`. Blueprint's `bp6-minimal` marked an unselected option - Hoist marks the selected one with `xh-segmented-control__option--selected` |

The SegmentedControl option classes Hoist rendered before, on desktop and mobile, now follow the
same BEM names. The codemod renames these too:

| Was | Now |
|---|---|
| `xh-segmented-control-option` | `xh-segmented-control__option` |
| `xh-segmented-control-option--selected` | `xh-segmented-control__option--selected` |
| `xh-segmented-control-option--{intent}` | `xh-segmented-control__option--intent-{intent}` |
| `xh-segmented-control-option__label` | `xh-segmented-control__option-text` |

Toolbar separators no longer carry `xh-toolbar__separator`. They render the shared `Separator` from
`@xh/hoist/cmp/layout`, as AppBar separators do. Restyle them with `.xh-toolbar .xh-separator`, or
with the `--xh-separator-*` variables. The codemod lists each use of the old class.

`appBarSeparator` is deprecated. Put `'-'` in `AppBarProps.leftItems` or `rightItems`, as in a
Toolbar's items, or use `toolbarSep`.

### 4. Check the UI

Start the app in development mode and review it in both light and dark themes, and on mobile if
applicable. Check the popovers, menus, dialogs, tooltips and toasts your app opens.

## Verification Checklist

After completing all steps:

- [ ] `pnpm install` / `yarn install` / `npm install` completes without errors.
- [ ] `pnpm lint` / `yarn lint` / `npm run lint` passes.
- [ ] No imports from `@xh/hoist/kit/blueprint`, `@blueprintjs/core` or
  `@xh/hoist/mobile/cmp/popover` remain (Step 2).
- [ ] Test automation that found buttons by title still finds them (Step 2).
- [ ] The Blueprint class codemod report has been reviewed, and the app loads in development mode
  without the warning about Blueprint classes or variables (Step 3).

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) - canonical example of a Hoist app.
- [`codemod-bp6-classes.mjs`](../codemod/v92/codemod-bp6-classes.mjs) - the Blueprint class
  codemod.
- [`cmp/popover/README.md`](../../cmp/popover/README.md) - Hoist's `Popover` and `Tooltip`.
