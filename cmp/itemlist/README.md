# ItemList

## Overview

`ItemList` is a short, static list of entries. Each entry has a title, with an optional
description, leading icon and trailing detail. Use it for a handful of alerts, recent activity,
the trades that need attention, or the results of a search.

- Takes a plain array of entries. It needs no model and no Store.
- Renders an HTML `ul` or `ol`, with every entry at the height its content needs.
- Wraps long text, so a narrow list gets taller and does not overflow.
- Flags an entry with an `intent` color on its icon, number or accent bar.
- Makes its entries clickable, with keyboard support, when given `onEntryClick`.

### ItemList or DataView

Both show a list of records, each drawn as more than one line of text. Choose by the size of the
data and by what the user does with it.

| | `ItemList` | `DataView` |
|---|---|---|
| Data | A plain array, passed as a prop | A `Store`, held by a `DataViewModel` |
| Size | A handful of entries, all rendered | Any number of records. Renders only the rows in view |
| Row height | Set by the content of each entry | Fixed, or computed per record by `itemHeight` |
| Selection, sorting, grouping, filtering | None | Yes, as in a `Grid` |
| Content of a row | Title, description, icon and detail | Any element, from a `renderer` |
| Markup | An HTML list | An ag-Grid with one column |

Use `ItemList` in a card, a detail panel or a dashboard widget. Use `DataView` when the list can
grow long, when the user selects a row, or when rows need a layout of their own.

## Common Usage Patterns

### A Basic List

```typescript
import {itemList} from '@xh/hoist/cmp/itemlist';

itemList({
    entries: [
        {title: 'ACME Corp', detail: '1,204'},
        {title: 'Globex', detail: '988'},
        {title: 'Initech', description: 'On credit hold since March', detail: '402'}
    ]
})
```

The data prop is `entries`, not `items`. Hoist element factories reserve `items` for child
elements.

### Alerts With Icons and Intent

```typescript
import {badge} from '@xh/hoist/cmp/badge';
import {itemList} from '@xh/hoist/cmp/itemlist';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {Icon} from '@xh/hoist/icon';

itemList({
    dividers: true,
    entries: [
        {
            title: 'Margin call on ACME Fund',
            description: 'Collateral fell below the required level. Post 1.2m by end of day.',
            icon: Icon.warning(),
            intent: 'danger',
            detail: relativeTimestamp({timestamp: alert.time})
        },
        {
            title: 'Trade 48211 awaits approval',
            icon: Icon.clock(),
            intent: 'warning',
            detail: badge('Pending')
        }
    ]
})
```

`intent` colors the icon of an entry, not its text. In a list where no entry has an icon, it draws
a thin bar before the entry instead. Color alone does not reach every user, so say what it means
in the title or the description as well.

An entry with no icon keeps the space of one when another entry in the list has an icon. The
titles of all entries therefore line up.

### A Ranking

Set `ordered` to number the entries. The list renders as an `ol`, and shows each number in place
of an icon.

```typescript
itemList({
    ordered: true,
    size: 'compact',
    entries: topClients.map(it => ({title: it.name, detail: fmtMillions(it.revenue)}))
})
```

### Clickable Entries

Pass `onEntryClick` to make every entry a button. The user can reach each one with the Tab key
and activate it with Enter or Space. The handler gets the entry and its index in `entries`.

```typescript
itemList({
    entries: results.map(it => ({title: it.name, description: it.summary})),
    onEntryClick: (entry, index) => model.openResult(results[index])
})
```

### Conditional Entries and an Empty List

Set `omit` on an entry to leave it out. The list also skips a null entry. A list with no entries
to show renders nothing, unless `emptyText` is set:

```typescript
itemList({
    emptyText: 'No open alerts',
    entries: alerts.map(it => ({title: it.message, omit: it.dismissed}))
})
```

## Properties Reference

### ItemListProps

| Property | Type | Description |
|----------|------|-------------|
| `entries` | `ItemListEntry[]` | Entries to show, in order. Required |
| `ordered` | `boolean` | Numbers the entries and renders an `ol`. Default false |
| `dividers` | `boolean` | Draws a rule between entries. Default false |
| `size` | `'compact' \| 'standard'` | `compact` for smaller text and tighter rows. Default `standard` |
| `emptyText` | `ReactNode` | Shown in place of a list with no entries. Default is to render nothing |
| `onEntryClick` | `(entry, index) => void` | Handler for a click or an Enter or Space keypress on an entry |

The component also takes layout props, `className`, `testId` and `domAttrs`.

### ItemListEntry

| Property | Type | Description |
|----------|------|-------------|
| `title` | `ReactNode` | Main text of the entry. Required |
| `description` | `ReactNode` | Longer text beneath the title |
| `detail` | `ReactNode` | Short content at the far end of the title's line: a figure, a `Badge`, a timestamp |
| `icon` | `ReactElement` | Icon before the text. Not shown in an `ordered` list |
| `intent` | `Intent` | Semantic color for the icon, number or accent bar |
| `omit` | `boolean` | True to leave the entry out |

A string in `title`, `description` or `detail` renders as text, never as HTML or markdown.

### Layout of an Entry

The title and description wrap, and break within a word if they must. To truncate a title
instead, pass an element that does so.

The detail stays at the far end of the first line while a long title wraps beside it. In a very
narrow list, the detail drops to a line of its own, aligned right. This happens when the title
would get narrower than `--xh-item-list-title-min-width`.

## Styling

The list fills the width of its container and has no outer margin. Its container sets the
padding around it. Set these CSS variables to restyle all lists, or those under one selector. An
app sets them without the `xh-` prefix, for example `--item-list-entry-gap: 6px`.

| Variable | Sets |
|----------|------|
| `--xh-item-list-entry-padding`, `--xh-item-list-compact-entry-padding` | Padding of each entry, per size |
| `--xh-item-list-entry-gap` | Space between the icon, the text and the detail |
| `--xh-item-list-font-size`, `--xh-item-list-compact-font-size` | Text size, per size |
| `--xh-item-list-title-font-weight`, `--xh-item-list-title-min-width` | Weight of the title, and its least width beside a detail |
| `--xh-item-list-description-color`, `--xh-item-list-description-font-size` | Description text |
| `--xh-item-list-marker-color`, `--xh-item-list-marker-width` | Icons and numbers with no intent, and the width of their column |
| `--xh-item-list-primary-color`, `-success-color`, `-warning-color`, `-danger-color` | Intent colors |
| `--xh-item-list-accent-width` | Width of the accent bar |
| `--xh-item-list-divider` | Rule between entries |
| `--xh-item-list-hover-bg` | Background of a clickable entry on hover |
| `--xh-item-list-empty-color` | Color of `emptyText` |

## Related Packages

- `/cmp/dataview/` - DataView, for long lists backed by a Store
- [`/cmp/grid/`](../grid/README.md) - Grid, for tabular data
- `/cmp/badge/` - Badge, a common `detail` of an entry
- `/cmp/relativetimestamp/` - RelativeTimestamp, a common `detail` of an entry
