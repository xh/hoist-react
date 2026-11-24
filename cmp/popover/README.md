# Popover Package

## Overview

`Popover` shows content that floats beside a target element, opened by clicking or hovering on
the target. Hoist's menus, pickers and choosers open in it. It is built on
[Floating UI](https://floating-ui.com/docs/react) and takes no model. The props and their defaults
are documented in `Types.ts`. For a short label on hover, use
[`Tooltip`](../tooltip/README.md), a hover popover with tooltip defaults.

Desktop and mobile components both use this `Popover`. Any popover closes when the app's route
changes, so the app does not navigate underneath it.

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
select dropdowns, AG Grid popups and other overlays, which each mount their own layer on the
page after the popover's.

## Portals

A popover renders in a portal on `document.body`, so no clipping ancestor cuts it off. Set
`usePortal: false` to render it inline, next to its target, or `portalContainer` for a specific
element.

## On Mobile

On mobile, a popover has no arrow, is fixed in place, and is covered by a transparent backdrop
while open. A tap outside it closes it without reaching the element beneath. Set `backdrop: true`
to dim the page behind it, as mobile's `MenuButton` does. The target sits inside an outer `div`
that carries the popover's `className`, as with mobile's earlier popover.

## Common Pitfalls

- **App CSS on `bp6-popover*` classes no longer applies.** The popover renders only its
  `xh-popover__*` classes. Move app CSS to them - the v92 class codemod does this.
- **Changing the route closes popovers.** A popover whose content changes the route closes with
  the change. Keep route changes out of popover content that should stay open.
- **`popoverModifiers` on `DateInput` has no effect.** It passed Popper.js options to Blueprint.
  Use `popoverPosition` and `popoverBoundary` instead.
- **Popper.js `modifiers` in `popoverProps` have no effect.** Set `offset` for the distance from
  the target, as in `menuButton({popoverProps: {offset: {mainAxis: 4}}})`.
