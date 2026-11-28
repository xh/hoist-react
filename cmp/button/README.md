# Button Package

## Overview

`Button`, `ButtonGroup` and `SplitButton` are shared by desktop and mobile. A component built on
them works on both platforms, with no platform-specific code. Import them from
`@xh/hoist/cmp/button`. The desktop and mobile button packages re-export them, beside their own
buttons such as `RefreshButton` and the grid buttons.

The props and their defaults are documented in `Button.ts`, `ButtonGroup.ts` and
`SplitButton.ts`.

## Usage

```typescript
import {button, buttonGroup, splitButton} from '@xh/hoist/cmp/button';
import {Icon} from '@xh/hoist/icon';

// Text, icon and intent
button({text: 'Save', icon: Icon.check(), intent: 'primary', onClick: () => model.saveAsync()})

// An icon-only button. Its tooltip text also names it for assistive tech.
button({icon: Icon.refresh(), tooltip: 'Refresh', onClick: () => model.refreshAsync()})

// Sizes - 'compact', 'standard' (the default) or 'large'
button({text: 'Details', size: 'compact'})

// A spinner while a task runs, with clicks ignored until it ends
button({text: 'Save', icon: Icon.check(), loading: model.saveTask, onClick: () => model.saveAsync()})

// Joined buttons, sized together
buttonGroup({
    size: 'compact',
    children: [button({icon: Icon.chartLine()}), button({icon: Icon.chartBar()})]
})

// A primary action, with related actions in a menu
splitButton({
    text: 'Save',
    icon: Icon.check(),
    onClick: () => model.saveAsync(),
    menuItems: [
        {text: 'Save As...', actionFn: () => model.saveAsAsync()},
        {text: 'Save a Copy', actionFn: () => model.saveCopyAsync()}
    ]
})
```

## Styles

A button has one of three styles:

- **Standard** - a filled background. The default on mobile.
- **Minimal** - no background or border until hovered or pressed. The default on desktop.
- **Outlined** - a border and no background.

Set `minimal` or `outlined`, or change the default for an app with `Button.defaults.minimal`. An
`intent` colors any style.

`active` draws a button pressed in, as for a toggle that is on. A button that opens a click
popover, such as a `MenuButton`, takes the active look while its popover is open.

## Sizes

`size` sets a button's height, padding and font size. A `ButtonGroup` or `SplitButton` passes its
size on to its buttons. Each size reads CSS variables, so an app can tune them:

| Size | Variables |
|---|---|
| `compact` | `--xh-button-compact-height`, `-padding`, `-minimal-padding`, `-font-size` |
| `standard` | `--xh-button-height`, `--xh-button-padding`, `--xh-button-minimal-padding`, `--xh-button-font-size` |
| `large` | `--xh-button-large-height`, `-padding`, `-minimal-padding`, `-font-size` |

A compact `Toolbar` sets the standard variables for the buttons in it, so they fit the bar.

## Loading

`loading` shows a spinner while an operation runs. Pass `true`, or a `TaskObserver` such as a
model's `loadObserver` - the button shows the spinner while the task is pending. The spinner takes
the place of the button's icon, or covers the content of a button without one. A loading button:

- keeps its size, so nothing around it moves;
- ignores clicks, and is marked busy and disabled for assistive tech (`aria-busy`,
  `aria-disabled`);
- stays focusable, so keyboard focus and its tooltip are not lost.

## ButtonGroup

`ButtonGroup` joins buttons into one control. Its `intent`, `minimal` and `outlined`, when set,
apply to each `Button` directly within it. A `MenuButton` or other popover target sits in a group
like a plain button. `fill` stretches the buttons across the group's width, and `vertical` stacks
them.

To bind a group of buttons to a value, use `ButtonGroupInput` from the platform input package.

## SplitButton

`SplitButton` joins a button for a primary action to an arrow button that opens a menu of related
actions. Each is its own button, with its own tab stop. Props for a Button apply to the primary
button. `intent`, `minimal`, `outlined`, `size` and `disabled` apply to both. Pass
`menuButtonProps` to set the arrow button's own props.

Put actions in the menu that relate to the primary one, and leave the primary action out of it.

## Platform differences

The component and its props are the same on desktop and mobile. What differs:

- **Element** - desktop renders a native `<button>`. Mobile renders a `div` with the button role,
  so it fills a block container and sizes to its content in a flex row, as other Hoist containers
  do. Browsers size a native button to its content whatever its `display`.
- **Default style** - minimal on desktop, standard on mobile.
- **Size** - mobile buttons are taller, with rounder corners, from the `.xh-mobile` values of the
  same CSS variables.
- **Hover** - mobile buttons have no hover look, which would stick after a tap.
- **Groups** - mobile groups space their buttons 1px apart. Desktop groups join their edges.

## Related

- [`/cmp/tooltip/`](../tooltip/README.md) - the `Tooltip` a button's `tooltip` prop shows.
- [`/desktop/cmp/menu/`](../../desktop/README.md) - `MenuButton`, for a button that only opens a
  menu.
