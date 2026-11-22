# Hoist React v92 Upgrade Notes

> **From:** v91.x → v92.0.0 | **Released:** unreleased | **Difficulty:** 🟢 LOW

## Overview

Hoist React v92 moves its drag-and-drop onto [dnd-kit](https://dndkit.com) and adds two components,
`SortableList` and `Chip`. Most apps need no changes.

- **`kit/react-beautiful-dnd` removed (required if your app imports it)** - see Step 1. Hoist no
  longer installs `@hello-pangea/dnd`. Use `SortableList` for a reorderable list, or
  `@xh/hoist/kit/dnd-kit` for custom drag-and-drop.
- **`DynamicTabSwitcherModel.onDragEnd()` replaced (rare)** - see Step 2.

## Prerequisites

- hoist-core `45.0.0` or later, unchanged from v91.

## Upgrade Steps

### 1. Replace `@xh/hoist/kit/react-beautiful-dnd`

Find imports of the removed kit:

```bash
grep -rn "kit/react-beautiful-dnd\|@hello-pangea/dnd" client-app/src
```

**A single reorderable list** becomes a `SortableList`. You render each row, and the list supplies
the handle, the drag preview, the placeholder and keyboard reordering. It reports each completed
move once.

Before:

```typescript
import {dragDropContext, draggable, droppable} from '@xh/hoist/kit/react-beautiful-dnd';

dragDropContext({
    onDragEnd: result => {
        if (!result.destination) return;
        model.moveWidget(result.draggableId, result.destination.index);
    },
    children: droppable({
        droppableId: 'widgets',
        children: dndProps =>
            div({
                ref: dndProps.innerRef,
                children: [
                    ...model.widgets.map((w, idx) =>
                        draggable({
                            key: w.id,
                            draggableId: w.id,
                            index: idx,
                            children: dndProps =>
                                div({
                                    ref: dndProps.innerRef,
                                    ...dndProps.draggableProps,
                                    children: [
                                        div({...dndProps.dragHandleProps, children: Icon.grip()}),
                                        widgetRow({w})
                                    ]
                                })
                        })
                    ),
                    dndProps.placeholder
                ]
            })
    })
});
```

After:

```typescript
import {sortableList} from '@xh/hoist/cmp/sortablelist';

sortableList({
    value: model.widgets,
    getItemLabel: w => w.title,
    onReorder: e => model.moveWidget(e.item.id, e.toIndex),
    renderItem: w => widgetRow({w})
});
```

Pass the array as `value`, not `items`. Or bind it to a model property with `bind` - the list then
writes the new order through the property's setter. See the
[SortableList README](../../cmp/sortablelist/README.md).

**Two lists with drags between them** - such as "on your home" and "available" - use dnd-kit through
`@xh/hoist/kit/dnd-kit`: one `dragDropProvider`, and `useSortable` on each row with a `group` per
list. Hoist's mobile column chooser (`mobile/cmp/grid/impl/ColChooser.ts`) is a worked example.
Apply the live order in `onDragOver` and call `e.preventDefault()`, so React moves the rows - if
dnd-kit moves a row's DOM node to another list, React fails when it next updates that list.

### 2. Replace `DynamicTabSwitcherModel.onDragEnd()`

`onDragEnd(result)` took a react-beautiful-dnd drop result. Call `moveTab(fromIndex, toIndex)`
instead:

```typescript
// Before
switcherModel.onDragEnd({source: {index: 0}, destination: {index: 2}});

// After
switcherModel.moveTab(0, 2);
```

## Verification Checklist

- [ ] No imports of `@xh/hoist/kit/react-beautiful-dnd` or `@hello-pangea/dnd` remain:
  ```bash
  # Should return nothing
  grep -rn "kit/react-beautiful-dnd\|@hello-pangea/dnd" client-app/src
  ```
- [ ] `pnpm typecheck` / `npx tsc --noEmit` passes.
- [ ] Each reorderable list in the app still reorders by drag and with the keyboard, and keeps the
  new order after a reload if the app persists it.

## Reference

- [SortableList README](../../cmp/sortablelist/README.md) - props, handles, keyboard, styling.
- [Chip README](../../cmp/chip/README.md) - the new compact label component.
- [dnd-kit](https://dndkit.com) - the library under `@xh/hoist/kit/dnd-kit`.
