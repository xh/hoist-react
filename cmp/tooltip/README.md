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

## Common Pitfalls

- **A button's `tooltip` prop is a native `title`, not this component.** That is often enough for
  a plain-text label. Use `Tooltip` for styled or richer content, or to show the label sooner.
- **Style tooltips with the `--xh-tooltip-*` CSS variables.** App CSS on `bp6-tooltip` classes works
  for one release only.
