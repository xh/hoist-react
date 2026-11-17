# KeyValueList Package

> **Status: DRAFT** - This document is awaiting review by an XH developer. Content may be
> incomplete or inaccurate. Do not remove this banner until a human reviewer approves the doc.

## Overview

`KeyValueList` shows labeled values for display only, such as the fields of a record in a detail
panel. It takes a plain array of entries and no model, and renders an HTML description list. The
props and their defaults are documented in `KeyValueList.ts`.

Choose it by what the user does with the values:

- **KeyValueList** - the user reads the values. The app formats each one.
- **Read-only `Form`** - the same fields can switch to editing, or the values need the bindings,
  validation or renderers of a `FormModel`. Set `readonly` on the `FormModel`. See the
  [Form README](../form/README.md).
- **`Grid`** - the user compares many records, or sorts and filters them.

## Usage

```typescript
import {keyValueList} from '@xh/hoist/cmp/keyvaluelist';
import {fmtDate, fmtNumber} from '@xh/hoist/format';

keyValueList({
    entries: [
        {label: 'Symbol', value: trade.symbol},
        {label: 'Quantity', value: fmtNumber(trade.quantity, {precision: 0})},
        {label: 'Settles', value: fmtDate(trade.settleDate)},
        {label: 'Status', value: trade.status, intent: trade.isRejected ? 'danger' : null},
        {label: 'Broker', value: trade.broker, omit: !trade.isExternal},
        {label: 'Confirmed', value: trade.confirmed ? 'Yes' : 'No'}
    ]
})

// Labels above their values, in at most three columns, with a rule between rows
keyValueList({entries, labelSide: 'top', columns: 3, dividers: true, size: 'compact'})
```

A value can be any element, such as a `badge` or a link. The list fills the width of its
container and fits as many columns as that width allows, down to one column in a narrow panel.
Use it inside a `card` to give a group of values a title.

## Styling

Set the `--xh-key-value-list-*` variables on `body.xh-app` to change the gaps, label width and
colors. The full set is in the `Key Value Lists` block of
[`styles/vars.scss`](../../styles/vars.scss). See the [Styles README](../../styles/README.md) for
how overrides work.

```scss
body.xh-app {
  --xh-key-value-list-label-max-width: 12em;
  --xh-key-value-list-label-text-color: var(--xh-text-color-muted);
}
```

## Common Pitfalls

- **Rows go in `entries`, not `items`.** A factory renders `items` as child elements. The list
  throws in development mode when it gets rows as `items`.
- **A boolean value shows as blank.** React renders `true` and `false` as nothing, so the list
  shows its `emptyText`. Pass text such as `'Yes'` or `'No'`.
- **The list never formats.** Format numbers and dates with `@xh/hoist/format` before you pass
  them.
- **`columns` is a maximum.** The list drops columns while one would be narrower than
  `minColumnWidth`. Lower `minColumnWidth` to keep more columns in a narrow container.

## Related Packages

- [`/cmp/form/`](../form/README.md) - read-only forms for values that can also be edited
- [`/cmp/`](../README.md) - the `Card` container and the component catalog
- [`/format/`](../../format/README.md) - formatters for values
