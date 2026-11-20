# Tooltip Package

## Overview

`Tooltip` shows a short label beside a target while the pointer rests on it or it has keyboard
focus. It presents itself to assistive tech with the `tooltip` role, and works on desktop and
mobile.

A tooltip is a hover [`Popover`](../popover/README.md) with tooltip defaults: a short open delay,
no close delay, a smaller arrow, and tooltip styling. It takes the subset of `PopoverProps` that
applies to a tooltip - `position`, `boundary`, `portalContainer`, `usePortal` and the rest behave
as documented for `Popover`. It adds `intent` to color the tooltip and `compact` for less padding.

## Usage

```typescript
import {tooltip} from '@xh/hoist/cmp/tooltip';

tooltip({
    content: 'Net of returns and discounts.',
    intent: 'primary',
    children: Icon.info()
})

// Off until there is something to say
tooltip({
    content: validationMsg,
    disabled: !validationMsg,
    position: 'right',
    children: myInput()
})
```

Pass exactly one target as the child. Nothing opens while `content` is null or empty.

The target renders inside a `span`. Set `targetTagName: 'div'` for a block-level target, or
`renderTarget` to render the target with no wrapper.

Desktop buttons take a tooltip directly, as text or a config:

```typescript
button({icon: Icon.refresh(), tooltip: 'Refresh'})

button({
    icon: Icon.warning(),
    tooltip: {content: staleDataSummary(), intent: 'warning', position: 'bottom'}
})
```

## Common Pitfalls

- **Prefer a desktop button's `tooltip` prop to wrapping it.** `ButtonProps.tooltip` takes a string
  or a config with these props, renders this component with no wrapper element, and opens it on
  disabled buttons too. Set the button's `title` instead for the browser's native tooltip.
- **Style tooltips with the `--xh-tooltip-*` CSS variables.** App CSS on `bp6-tooltip` classes no
  longer applies - target `xh-tooltip` instead.
