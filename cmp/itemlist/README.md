# ItemList Package

## Overview

`ItemList` shows a short, static list of entries. Each entry has a title, and can add a
description, a leading icon and a trailing detail: a handful of alerts, recent activity, the
results of a search. It takes a plain array and no model, and renders every entry as an HTML list.
The props and their defaults are documented in `ItemList.ts`.

Choose it by the size of the data and by what the user does with it:

| | `ItemList` | `DataView` | `Grid` |
|---|---|---|---|
| Data | A plain array | A `Store` | A `Store` |
| Size | A handful of entries, all rendered | Any number. Renders the rows in view | Any number |
| Row content | Title, description, icon, detail | Any element, from a `renderer` | Columns |
| Selection, sort, group | None | Yes | Yes, plus filter and export |

## Usage

```typescript
import {itemList} from '@xh/hoist/cmp/itemlist';

// Alerts with an icon, an intent color and a trailing detail each
itemList({
    dividers: true,
    emptyText: 'No open alerts',
    entries: alerts.map(it => ({
        title: it.title,
        description: it.message,
        icon: Icon.warning(),
        intent: it.isUrgent ? 'danger' : 'warning',
        detail: relativeTimestamp({timestamp: it.time}),
        onClick: () => model.openAlert(it)
    }))
})

// A numbered ranking in the compact size
itemList({
    numbered: true,
    size: 'compact',
    entries: topClients.map(it => ({title: it.name, detail: fmtMillions(it.revenue)}))
})
```

The `detail` slot fits a figure, a `badge`, a timestamp or a small button. An entry with an
`onClick` uses its title as the button that takes focus, so a button in `detail` is not nested
inside another button. A click on that button goes to the button only.

## Styling

Set the `--xh-item-list-*` variables on `body.xh-app` to change the spacing and colors. The full
set is in the `Item Lists` block of [`styles/vars.scss`](../../styles/vars.scss). See the
[Styles README](../../styles/README.md) for how overrides work.

## Common Pitfalls

- **Rows go in `entries`, not `children`.** A factory renders `children`, and the legacy `items`,
  as child elements. The list throws in development mode when it gets rows that way.
- **`intent` does not color the text.** It colors the icon or number, or a thin bar when no entry
  has either. Say what the color means in the text as well.
- **`disabled` needs an `onClick`.** It dims and disables a clickable entry, and has no effect on
  other entries.
- **A long or growing list belongs in a `DataView`.** `ItemList` renders every entry.

## Related Packages

- [`/cmp/`](../README.md) - `DataView` and the component catalog
- [`/cmp/grid/`](../grid/README.md) - tabular data with selection, sorting and export
