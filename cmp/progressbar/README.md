# ProgressBar Package

> **Status: DRAFT** - This document is awaiting review by an XH developer. Content may be
> incomplete or inaccurate. Do not remove this banner until a human reviewer approves the doc.

## Overview

`ProgressBar` is a horizontal bar that shows a value against a maximum: the progress of a task, or
usage against a limit. It can also animate for work of unknown length. It takes no model and works
on desktop and mobile. The props and their defaults are documented in `ProgressBar.ts`.

Hoist does not wrap the Blueprint progress bar. Choose between this bar and the loading
components by where the status belongs:

- **ProgressBar** - a value the user reads in the layout, such as a quota, a fill rate or the
  progress of an upload. Set `indeterminate` for an inline status of unknown length.
- **`mask` or `loadingIndicator`** - a load that blocks or overlays a panel, with a message from
  a `TaskObserver`. See the [Promise README](../../promise/README.md#linkto).

## Usage

```typescript
import {progressBar} from '@xh/hoist/cmp/progressbar';

// A value on the default scale of 0 to 100, shown as a whole percent
progressBar({label: 'Upload', value: 72})

// A custom scale, a pre-formatted figure, an intent and a marker at a threshold
progressBar({
    label: 'Desk A risk',
    value: 8.1,
    max: 10,
    valueText: '$8.1m of $10m',
    target: 7.5,
    intent: 'warning'
})

// Work of unknown length
progressBar({label: 'Loading positions', indeterminate: true})
```

The bar is a block, so it fills the width of a block or a column. In a row such as an `hbox`,
give it a `flex` or a `width`. Several bars in a `vbox` or a `card` make a simple usage panel.

## Styling

Set the `--xh-progress-bar-*` variables on `body.xh-app` to change the height, radius and colors.
The full set is in the `Progress Bars` block of [`styles/vars.scss`](../../styles/vars.scss). The
ones an app is most likely to change:

```scss
body.xh-app {
  --xh-progress-bar-height: 6px;
  --xh-progress-bar-fill-bg: var(--xh-intent-success);
  --xh-progress-bar-track-bg: var(--xh-bg-alt);
}
```

## Common Pitfalls

- **A null `value` draws an empty bar, not an animation.** Set `indeterminate` for work of
  unknown length.
- **A bar with no `label` has no accessible name.** Pass an `aria-label` through `domAttrs`.
- **Only a string or number figure reaches screen readers.** An element passed as `valueText`
  shows on screen but does not become the `aria-valuetext` of the bar.

## Related Packages

- [`/cmp/`](../README.md) - `Mask`, `LoadingIndicator` and the component catalog
- [`/format/`](../../format/README.md) - formatters for the `valueText` figure
