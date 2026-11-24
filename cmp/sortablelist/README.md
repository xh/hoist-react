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
    itemRenderer: dim => dimensionRow({dim})
})

// Controlled by hand, for a caller that persists each move.
sortableList({
    value: model.steps,
    getItemLabel: step => step.name,
    onReorder: e => model.moveStepAsync(e.item, e.toIndex),
    itemRenderer: (step, {isDragging}) => stepRow({step, isDragging}),
    detailRenderer: step => stepEditor({step})
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
- **`'custom'`** - the list draws nothing. Pass `ctx.handleRef` from `itemRenderer` to the element
  users should grab.

A drag starts when a pointer holds a handle for 200ms, or when a mouse moves 4px, whichever comes
first. Either way the item lifts at once, which is the cue that it is held. A quick click on a
handle or row still clicks. On touch only the hold starts a drag, so a finger can still scroll the list.

### Keyboard

Tab to a handle, then press Space or Enter to lift the item. Arrow keys move it, and Space or Enter
drops it. Escape puts it back. Alt with an arrow key moves the focused item one place at once, and
fires one `onReorder` per press. Each step is announced to screen readers by name, from
`getItemLabel`. The list stops the keys it handles from propagating, so a list inside a widget
doesn't also trigger an ancestor's shortcuts.

### Layout

Set `orientation: 'horizontal'` for a row of items, and `wrap: true` to let it wrap.

Give the list a `maxHeight` and it fits its items up to that height, then scrolls them, with the
Add row pinned below. A fixed `height`, or a `flex` in a sized container, scrolls the same way, but
keeps its full height when the items are fewer - they and the Add row sit at the top. During a drag the list
auto-scrolls its items, any scrolling ancestors and the window when the dragged item nears an edge.
`scrollAcceleration` sets how fast - 15 by default, below dnd-kit's own 25.

### Removing and adding items

Set `removable: true`, or `onRemove`, to give each item a remove button, after its content and any chevron, so the
buttons line up in one column. Delete or Backspace on an item's handle removes it too.
`isItemRemovable` limits which items have one. Set `showRemoveOnHover` to show the buttons only
while their item is hovered or focused - they always show on touch devices. With `bind`, the list writes the list without the
item and then calls `onRemove({item, index, items})`, if set, for any other work the removal needs.
Without `bind`, apply `items` yourself.

The list shows an Add row after the items in one of two ways:

- **`getNewItem`** - a built-in Add button, labelled by `addText`. The list cannot build your data,
  so `getNewItem` returns the new item, or a promise of it, or null to add nothing. The list then
  focuses the new item and opens its detail, if it has one.
- **`addRenderer`** - your own control in the Add row, such as a select, picker or menu. It gets
  `{add, value, disabled}` and calls `add(item)` with each pick. `value` holds the current items,
  so a picker can leave out ones already chosen. When the list has a `detailRenderer`, the new
  item takes focus and its detail opens. Otherwise focus stays in the control, ready for the next
  pick - or moves to the new item, if the add leaves the row with no control.

```typescript
sortableList({
    value: model.pendingDims,
    itemKey: dim => dim,
    emptyText: 'Ungrouped',
    onAdd: e => model.addPendingDim(e.item),
    itemRenderer: dim => dimensionRow({dim}),
    addRenderer: ({add, value}) =>
        select({
            options: model.dimOptions.filter(it => !value.includes(it.value)),
            placeholder: 'Add level...',
            leftIcon: Icon.add(),
            onChange: add
        })
})
```

Either way, with `bind` the list appends the item and then calls `onAdd({item, index, items})`, if
set. Without `bind`, add `e.item` to `value` in `onAdd`. The Add row is the list's frame, lined up
with the items' rows - any "+" belongs to your control, such as Select's `leftIcon`.

Set `emptyText` to show a line in place of the items while there are none.

After a removal, focus moves to the item that took its place, or the one before it, or the Add row's
control once the list is empty. Screen readers hear "Removed {item}." and "Added {item}.".

### Expandable rows

Set `detailRenderer` to make items expandable. Each item gets a chevron, which opens a detail under the
row at the list's full width - an editor, say - and closes it again. The chevron always follows
everything `itemRenderer` draws, and precedes an end handle, so chevrons line up in one column even
when rows have different trailing controls. The
chevron is a button with `aria-expanded`, and the detail is a region named for its item. The list
calls `detailRenderer` only for open items, and the detail moves with its item when the list
reorders.

- **Which items expand:** every item by default. `isItemExpandable` limits it. An item it rejects
  shows its detail whenever `detailRenderer` returns one, with no chevron - so
  `isItemExpandable: () => false` gives details that are always shown, such as a step's body under
  its header.
- **How many open at once:** one by default - opening an item closes the open one. Set
  `multiExpand: true` to allow several.
- **Who owns the open state:** the list, by default. Pass `expandedKeys` - item keys - to control
  it, and apply the keys `onExpandedChange` reports. `onExpandedChange` also reports changes when
  the list owns the state.
- **Row clicks:** a click on an expandable row opens or closes it, and the row shows a pointer and
  a hover tint. A click on a button, link, chip, Hoist input or other control in the row does only
  its own job, as does a pick in a menu or popover the row opens, the click that ends a drag, and
  one that ends a text selection. Set
  `toggleOnRowClick: false` for rows that are mostly controls. Row clicks never toggle with
  `handle: 'item'`, where a press on the row starts a drag - use the chevron.

`isItemMovable` limits which items can be picked up - the rest show a lock in place of their grip. Other items still move past them, so render
items that must keep a fixed position, such as pinned columns, outside the list. `disabled`
disables all reordering.

## Styling

Pick a frame for the items with `variant`:

- **`'plain'`** (default) - no frame. Your rows draw their own, as in `GroupingChooser`.
- **`'divided'`** - one rounded border around the list, and a line between items, which sit flush.
- **`'spaced'`** - items set apart by a gap, each in its own rounded border.

The list also draws the drag chrome: the lifted item's background, border, shadow and slight tilt,
and the dashed placeholder, which takes the shape of the slot it marks - square in a divided list,
rounded in a spaced one. Each row has horizontal padding around its handle and content,
`--xh-sortable-list-item-padding`, Hoist's half spacing by default. Set it to `0` for rows that
draw their own padding or a full-width background.

Set the `--xh-sortable-list-*` variables on `body.xh-app` to change any of these. The full set is in
the `Sortable Lists` block of [`styles/vars.scss`](../../styles/vars.scss):

```scss
body.xh-app {
  --xh-sortable-list-border-radius: 2px;
  --xh-sortable-list-spaced-gap: 6px;
  --xh-sortable-list-drag-rotate: 0deg;
}
```

## dnd-kit Options

For anything dnd-kit supports that the list doesn't map to its own props, pass
`dndProviderProps` to its `DragDropProvider`, or `sortableProps` to each item's `useSortable`.
`sensors`, `plugins` and `modifiers` in `dndProviderProps` replace Hoist's own, and its drag
handlers run after Hoist's. The list's own `id`, `index`, `data` and `disabled` always win over
`sortableProps`. Both can interfere with the list's behavior, so prefer a mapped prop where one
exists.

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
