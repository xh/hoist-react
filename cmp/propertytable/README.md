# PropertyTable Package

## Overview

`PropertyTable` shows labeled values for display only, such as the fields of a record in a detail
panel. It takes a plain array of entries and no model, and renders an HTML description list. The
props and their defaults are documented in `PropertyTable.ts`.

Choose it by what the user does with the values:

- **PropertyTable** - the user reads the values. The app formats each one.
- **Read-only `Form`** - the same fields can switch to editing, or the values need the bindings,
  validation or renderers of a `FormModel`. Set `readonly` on the `FormModel`. See the
  [Form README](../form/README.md).
- **`Grid`** - the user compares many records, or sorts and filters them.

## Usage

```typescript
import {propertyTable} from '@xh/hoist/cmp/propertytable';
import {fmtDate, fmtNumber} from '@xh/hoist/format';

propertyTable({
    entries: [
        {label: 'Symbol', value: trade.symbol},
        {label: 'Quantity', value: fmtNumber(trade.quantity, {precision: 0})},
        {label: 'Settles', value: fmtDate(trade.settleDate)},
        {label: 'Status', value: trade.status, intent: trade.isRejected ? 'danger' : null},
        {label: 'Broker', value: trade.broker, omit: !trade.isExternal},
        {label: 'Confirmed', value: trade.confirmed ? 'Yes' : 'No'}
    ],
    emptyText: 'No trade selected'
})

// Labels above their values, in at most three columns, with a rule between rows
propertyTable({entries, labelSide: 'top', columns: 3, dividers: true, size: 'compact'})

// A summary, with each value set at the far side of its column, across from its label
propertyTable({entries, valueAlign: 'right', dividers: true})
```

A value can be any element, such as a `badge` or a link. A null or undefined value shows the
list's `nullDisplay`, `-` by default. The list fills the width of its container and fits as
many columns as that width allows, down to one column in a narrow panel. Use it inside a `card` to
give a group of values a title.

## Styling

Set the `--xh-property-table-*` variables on `body.xh-app` to change the gaps, label width and
colors. The full set is in the `Property Tables` block of
[`styles/vars.scss`](../../styles/vars.scss). See the [Styles README](../../styles/README.md) for
how overrides work.

```scss
body.xh-app {
  --xh-property-table-label-max-width: 12em;
  --xh-property-table-label-text-color: var(--xh-text-color-muted);
}
```

## Common Pitfalls

- **Rows go in `entries`, not `children`.** A factory renders `children`, and the legacy `items`,
  as child elements. The list throws in development mode when it gets rows that way.
- **Only null or undefined shows `nullDisplay`.** Other values render as React renders them, so a
  boolean or a blank string shows nothing. Pass text such as `'Yes'` or `'No'` for a boolean.
- **The list never formats.** Format numbers and dates with `@xh/hoist/format` before you pass
  them.
- **`columns` is a maximum.** The list drops columns while one would be narrower than
  `minColumnWidth`. Lower `minColumnWidth` to keep more columns in a narrow container.

## Related Packages

- [`/cmp/form/`](../form/README.md) - read-only forms for values that can also be edited
- [`/cmp/`](../README.md) - the `Card` container and the component catalog
- [`/format/`](../../format/README.md) - formatters for values
