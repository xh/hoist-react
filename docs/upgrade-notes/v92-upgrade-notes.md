# Hoist React v92 Upgrade Notes

> **From:** v91.x → v92.0.0 | **Released:** TBD | **Difficulty:** 🟠 MEDIUM

## Overview

Hoist React v92 removes Blueprint. Hoist's desktop components render their own markup and behavior,
built on Floating UI for popovers and tooltips, and Hoist no longer loads Blueprint's stylesheet.
Desktop overlays and controls look and behave as before, with keyboard and focus improvements.

- **Blueprint removed (required if your app imports from `@xh/hoist/kit/blueprint`)** - see Step 2.
  Replace each Blueprint import with Hoist's equivalent component.

The most significant impacts are:

- **Imports from `@xh/hoist/kit/blueprint` fail to build.** The package is gone. Blueprint
  components an app imports directly from `@blueprintjs/core` also need replacing.
- **Desktop button tooltips are no longer native `title` attributes.** Test automation that finds
  buttons by title no longer matches buttons that set `tooltip`.

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
| `Classes.*` | The class name string, e.g. `'bp6-text-muted'` |

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

Hoist's markup keeps Blueprint's `bp6-*` class names in v92, alongside its own `xh-*` ones, so app
CSS that targets them still applies. Hoist ships the Blueprint styles its components use, so they
look as before.

Builds with `@xh/hoist-dev-utils` may log `Could not resolve @blueprintjs/icons - Blueprint icon
stubs disabled`. With no Blueprint in the app, this is harmless.

A desktop `Mask` with `inline: false` renders in Hoist's own overlay, not a Blueprint one.

### 3. Check the UI

Start the app in development mode and review it in both light and dark themes, and on mobile if
applicable. Check the popovers, menus, dialogs, tooltips and toasts your app opens.

## Verification Checklist

After completing all steps:

- [ ] `pnpm install` / `yarn install` / `npm install` completes without errors.
- [ ] `pnpm lint` / `yarn lint` / `npm run lint` passes.
- [ ] No imports from `@xh/hoist/kit/blueprint`, `@blueprintjs/core` or
  `@xh/hoist/mobile/cmp/popover` remain (Step 2).
- [ ] Test automation that found buttons by title still finds them (Step 2).

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) - canonical example of a Hoist app.
- [`cmp/popover/README.md`](../../cmp/popover/README.md) - Hoist's `Popover` and `Tooltip`.
