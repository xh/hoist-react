# Steps Package

> **Status: DRAFT** - This document is awaiting review by an XH developer. Content may be
> incomplete or inaccurate. Do not remove this banner until a human reviewer approves the doc.

## Overview

`Steps` shows an ordered sequence of steps, each with a status: the lifecycle of an order, the
stages of a wizard, a workflow or a checklist. A line connects each step to the next. It takes no
model and holds no state. The props and their defaults are documented in `Steps.ts`.

Choose it over its neighbors by what the sequence means:

- **Steps** - named stages with a status on each: pending, current, complete, warning or error.
- **`ItemList` with `numbered`** - a ranking or a list with numbers but no status. See the
  [ItemList README](../itemlist/README.md).
- **`ProgressBar`** - an amount done, not a set of stages. See the
  [ProgressBar README](../progressbar/README.md).

## Usage

```typescript
import {steps} from '@xh/hoist/cmp/steps';

// `current` derives each status: steps before it are complete, steps after it are pending
steps({
    current: 2,
    steps: [{title: 'Submitted'}, {title: 'Approved'}, {title: 'Routed'}, {title: 'Filled'}]
})

// A vertical list with a status on each step, as a simple timeline
steps({
    vertical: true,
    steps: [
        {title: 'Submitted', status: 'complete', detail: '09:30'},
        {title: 'Approved', status: 'complete', detail: '09:42', description: 'By the risk desk'},
        {title: 'Routed', status: 'error', description: 'The venue rejected the order'},
        {title: 'Filled'}
    ]
})
```

`Steps` shows progress but does not switch content. For a wizard, keep the active page in a
model, such as a `TabContainerModel`, and drive it from `onStepClick`:

```typescript
steps({
    current: model.stepIndex,
    steps: wizardSteps.map(it => ({title: it.title, disabled: !model.canVisit(it)})),
    onStepClick: (step, index) => model.goToStep(index)
})
```

By default the steps show as a row, each with an equal share of the width. When a share would be
narrower than `minStepWidth`, the row shows as a vertical list and adds the `xh-steps--fallback`
class. It goes back to a row when the width allows. Set `vertical` for long descriptions.

## Styling

Set the `--xh-steps-*` variables on `body.xh-app` to change the colors and sizes. The full set is
in the `Steps` block of [`styles/vars.scss`](../../styles/vars.scss). See the
[Styles README](../../styles/README.md) for how overrides work.

## Common Pitfalls

- **Steps go in `steps`, not `items`.** A factory renders `items` as child elements. The
  component throws in development mode when it gets steps as `items`.
- **A status is not an `Intent`.** A failed step is `status: 'error'`, which draws in the danger
  color. `danger` is not a status.
- **`current` counts left-out steps.** It and the index passed to `onStepClick` refer to the
  position in `steps` as given. The numbers on the markers count only the steps that show.
- **`disabled` needs an `onStepClick`.** It stops the user from going to a step, and has no
  effect on a sequence that is not clickable.
- **In a row, the component needs a size.** It is a block, so in an `hbox` give it a `flex` or a
  `width`.

## Related Packages

- [`/cmp/tab/`](../tab/README.md) - `TabContainerModel`, to hold the pages of a wizard
- [`/cmp/itemlist/`](../itemlist/README.md) - a plain list, numbered or not
- [`/cmp/progressbar/`](../progressbar/README.md) - progress as an amount
