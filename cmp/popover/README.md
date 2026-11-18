# Popover Package

## Overview

`Popover` shows content that floats beside a target element, opened by clicking or hovering on
the target. Hoist's menus, pickers and choosers open in it. It is built on
[Floating UI](https://floating-ui.com/docs/react) and takes no model. The props and their defaults
are documented in `Types.ts`.

Desktop components use this `Popover`. Mobile still has its own, in `mobile/cmp/popover`, until the
two are merged.

## Usage

```typescript
import {popover} from '@xh/hoist/cmp/popover';

// Uncontrolled - a click on the button toggles the popover
popover({
    position: 'bottom-left',
    content: myPanel(),
    children: button({text: 'Details'})
})

// Controlled - the model owns the open state
popover({
    isOpen: model.isOpen,
    onInteraction: open => (model.isOpen = open),
    minimal: true,
    content: myMenu(),
    children: button({icon: Icon.menu()})
})

// Opens on hover, as for a short explanation
popover({
    interactionKind: 'hover',
    content: div({className: 'xh-pad', children: 'Heap figures come from the browser.'}),
    children: span('JS Heap ', Icon.info())
})
```

Pass exactly one target as the child. Nothing opens while `content` is null or empty.

## Closing

A click popover closes on a second click of its target, a click outside it, or Escape. Escape
closes only the innermost of nested popovers, and returns focus to its target.

A click on any element with the class `xh-popover-dismiss` inside the content closes the popover.
Menu items use this to close the menu that holds them. A click on a disabled element does not.

Presses inside overlays opened from within a popover do not close it. That covers nested popovers,
select dropdowns, AG Grid popups and Blueprint overlays, which each mount their own layer on the
page after the popover's.

## Portals

A popover renders in a portal on `document.body`, so no clipping ancestor cuts it off. Set
`usePortal: false` to render it inline, next to its target, or `portalContainer` for a specific
element. To send every popover within part of the app to one container, such as a popped-out
child window, wrap that part in `portalContainerProvider` from `@xh/hoist/utils/react`.

## Tooltip

`Tooltip` is a popover for a short label. It opens while the pointer rests on its target or the
target has keyboard focus, and presents itself to assistive tech with the `tooltip` role.

```typescript
import {tooltip} from '@xh/hoist/cmp/popover';

tooltip({
    content: 'Net of returns and discounts.',
    intent: 'primary',
    children: Icon.info()
})
```

For a plain-text label on a button, the button's `tooltip` prop - a native `title` - is often
enough. Style tooltips with the `--xh-tooltip-*` variables.

## Falling Back to Blueprint

For one release, an app can render desktop popovers and tooltips with Blueprint's, as before Hoist
had its own. Set this before the app renders:

```typescript
import {Popover, Tooltip} from '@xh/hoist/cmp/popover';

Popover.defaults.useBlueprint = true;
Tooltip.defaults.useBlueprint = true;
```

## Common Pitfalls

- **App CSS on `bp6-popover*` classes works for one release only.** The popover keeps Blueprint's
  class names next to its own `xh-popover__*` ones until then. Move app CSS to the `xh-popover__*`
  classes.
- **`popoverModifiers` on `DateInput` has no effect.** It passed Popper.js options to Blueprint.
  Use `popoverPosition` and `popoverBoundary` instead.
