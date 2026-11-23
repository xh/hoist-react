# SortableList Package

## Overview

`SortableList` is a list that users reorder by dragging an item or with the keyboard. You render
each item; the list supplies the drag behavior: handles, the lifted item, the placeholder that marks
the drop position, auto-scrolling, keyboard moves and screen reader announcements. It works on
desktop and mobile. The props are documented in `SortableList.ts`.

It is built on [dnd-kit](https://dndkit.com) (`@dnd-kit/react`), which Hoist wraps in
[`/kit/dnd-kit/`](../../kit/README.md). Use the kit directly only for layouts a list can't express,
such as dragging between two lists.

## Usage

```typescript
import {sortableList} from '@xh/hoist/cmp/sortablelist';

// Bound to a model property - the list writes the new order through its setter.
sortableList({
    bind: 'dimensions',
    itemKey: dim => dim,
    getItemLabel: dim => model.getDimDisplayName(dim),
    renderItem: dim => dimensionRow({dim})
})

// Controlled by hand, for a caller that persists each move.
sortableList({
    value: model.steps,
    getItemLabel: step => step.name,
    onReorder: e => model.moveStepAsync(e.item, e.toIndex),
    renderItem: (step, {isDragging}) => stepRow({step, isDragging}),
    renderDetail: step => stepEditor({step})
})
```

The list is controlled. It never keeps its own order. When a reorder completes it writes the new
order to `bind`, if set, and then calls `onReorder` once with `{item, fromIndex, toIndex, items,
source}`. `items` is the whole list in its new order. A caller that applies neither sees the item
settle back. `onReorder` never fires mid-drag, on Escape, or for a drop in place.

Items are matched by `itemKey`, `'id'` by default, so keys must be stable and unique. The list
throws if a key is missing or repeated.

### Handles

- **`'start'`** (default) or **`'end'`** - the list draws a grip handle at that end of each item.
- **`'item'`** - the whole item is the handle. A press on a button, input or link inside it never
  starts a drag, so rows can hold their own controls.
- **`'custom'`** - the list draws nothing. Pass `ctx.handleRef` from `renderItem` to the element
  users should grab.

A drag starts after the pointer moves 4px, so a click on a handle or row still clicks. On touch it
starts after a 200ms press, so a finger can still scroll the list.

### Keyboard

Tab to a handle, then press Space or Enter to lift the item. Arrow keys move it, and Space or Enter
drops it. Escape puts it back. Alt with an arrow key moves the focused item one place at once, and
fires one `onReorder` per press. Each step is announced to screen readers by name, from
`getItemLabel`. The list stops the keys it handles from propagating, so a list inside a widget
doesn't also trigger an ancestor's shortcuts.

### Layout

Set `orientation: 'horizontal'` for a row of items, and `wrap: true` to let it wrap. The list
auto-scrolls itself, any scrolling ancestors and the window when a dragged item nears an edge.

### Expandable rows

Set `renderDetail` to make items expandable. Each item gets a chevron, which opens a detail under the
row at the list's full width - an editor, say - and closes it again. The chevron always follows
everything `renderItem` draws, and precedes an end handle, so chevrons line up in one column even
when rows have different trailing controls. The
chevron is a button with `aria-expanded`, and the detail is a region named for its item. The list
calls `renderDetail` only for open items, and the detail moves with its item when the list
reorders.

- **Which items expand:** every item by default. `isItemExpandable` limits it.
- **How many open at once:** one by default - opening an item closes the open one. Set
  `multiExpand: true` to allow several.
- **Who owns the open state:** the list, by default. Pass `expandedKeys` - item keys - to control
  it, and apply the keys `onExpandedChange` reports. `onExpandedChange` also reports changes when
  the list owns the state.
- **Row clicks:** a click on an expandable row opens or closes it, and the row shows a pointer and
  a hover tint. A click on a button, link, input, chip or other control in the row does only its own
  job, as do the click that ends a drag and one that ends a text selection. Set
  `toggleOnRowClick: false` for rows that are mostly controls. Row clicks never toggle with
  `handle: 'item'`, where a press on the row starts a drag - use the chevron.

`isItemDisabled` marks items that can't be picked up. Other items still move past them, so render
items that must keep a fixed position, such as pinned columns, outside the list. `disabled`
disables all reordering.

## Styling

Items draw no box of their own; style the rows you render. The list adds only the drag chrome: the
lifted item's background, shadow and slight tilt, and the dashed placeholder. Set the
`--xh-sortable-list-*` variables on `body.xh-app` to change them. The full set is in the
`Sortable Lists` block of [`styles/vars.scss`](../../styles/vars.scss):

Each row has horizontal padding around its handle and content, `--xh-sortable-list-item-padding`,
Hoist's half spacing by default. Set it to `0` on a list whose rows draw their own padding or a
full-width background.

```scss
body.xh-app {
  --xh-sortable-list-gap: 4px;
  --xh-sortable-list-drag-rotate: 0deg;
  --xh-sortable-list-item-border: var(--xh-border-solid);
}
```

## Common Pitfalls

- **Pass the list as `value`, not `items`.** Hoist's element factories treat `items` as an alias
  for `children`.
- **Apply the reorder, or bind.** A list with neither `bind` nor an `onReorder` that updates
  `value` always snaps back.
- **Keys must not change during a drag.** Derive `itemKey` from a stable id, never from an index
  or a value the row edits.

## Related Packages

- [`/kit/`](../../kit/README.md) - the dnd-kit wrapper, for custom drag-and-drop
- [`/cmp/`](../README.md) - the component catalog
