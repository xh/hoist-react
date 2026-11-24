### 💥 Breaking Changes

See [`docs/upgrade-notes/v92-upgrade-notes.md`](docs/upgrade-notes/v92-upgrade-notes.md) for
detailed, step-by-step upgrade instructions with before/after code examples.

* Removed `@xh/hoist/kit/react-beautiful-dnd` and the `@hello-pangea/dnd` dependency. Use the new
  `SortableList` for reorderable lists, or `@xh/hoist/kit/dnd-kit` for custom drag-and-drop.
* Replaced `DynamicTabSwitcherModel.onDragEnd()` with `moveTab(fromIndex, toIndex)`.

### 🎁 New Features

* Added `Chip`, a compact label for a status, category or value. It supports intents and custom
  colors, filled, `minimal` and `outlined` styles, three sizes, and clickable, toggle (`active`)
  and removable (`onRemove`) variants. See [`cmp/chip/README.md`](cmp/chip/README.md).
* Added `SortableList`, a list users reorder by dragging or with the keyboard. Callers render each
  item, and the list supplies handles, the drop placeholder, auto-scrolling and screen reader
  announcements, then reports each completed move once via `bind` or `onReorder`. A `variant`
  frames the items - plain, divided or spaced. `removable` (or `onRemove`) adds remove buttons. An
  Add row holds a built-in button (`getNewItem`) or the caller's own picker (`addRenderer`), with
  focus and announcements handled, and `emptyText` fills an empty list. `isItemMovable` and
  `isItemRemovable` exempt individual items. A drag starts on a short hold or, with a mouse, as
  soon as it moves. Items can expand to show a detail under their row, opened by a chevron or a
  click on the row. See
  [`cmp/sortablelist/README.md`](cmp/sortablelist/README.md).
* Added `FormField.rightItems`, for per-field buttons or menus such as a reset, and
  `FormField.inputRenderer`, to wrap or replace a field's bound input, on desktop and mobile. Both
  can be set form-wide through `fieldDefaults`. Inline, the items follow the input. Stacked, they
  sit at the right end of the label's row. Desktop `rightItemsWidth` reserves their width so an
  inline form's inputs end at one edge.
* `GroupingChooser` and the mobile column chooser can now be reordered with the keyboard, and
  `GroupingChooser` dimensions can be removed with Delete or Backspace on their handle.
* Added `Icon.gripVertical()`.
* Added `SegmentedControl.toggleOnClick` (desktop and mobile). A two-option control becomes a
  toggle - a click anywhere on it, or Space or Enter on its focused segment, flips the value - for
  an On / Off choice in place of a switch.

### 🐞 Bug Fixes

* Fixed `GroupingChooser` rows drifting away from the pointer while dragged inside its popover.

### ✨ Styles

* Added `--xh-chip-*` variables for the new `Chip`, and `--xh-sortable-list-*` variables for the
  new `SortableList`. The item lifted by a drag has a border and a shadow, set by
  `--xh-sortable-list-drag-border-color` and `--xh-sortable-list-drag-shadow`. Each row has
  horizontal padding from `--xh-sortable-list-item-padding`, Hoist's half spacing by default.
* `FilterChooser` favorites now show their filter labels as minimal `Chip`s.
* Mixed the text of minimal and outlined intent `Chip`s 65% toward the text color in the light
  theme, as custom-colored chips already were. Success text on its wash rises from 3.72:1 to 5.45:1
  and warning from 2.84:1 to 4.55:1.
* Darkened the fill of a filled warning `Chip` to `--xh-intent-warning-darkest`, raising white text
  from 4.20:1 to 5.07:1, and mixed a custom-colored `Chip`'s text 50% toward the text color in the
  dark theme, so a dark base color such as `--xh-purple` reads at 4.85:1 rather than 3.41:1.
* Removed the `xh-grouping-chooser__row--dragging` class. A dragged row is styled by `SortableList`.
* `GroupingChooser` rows use `SortableList`'s grip handle, and its desktop dimension selects show a
  dropdown chevron and a hover tint. Removed the `xh-grouping-chooser__row__grabber` class.
* `GroupingChooser`'s "Add level..." select now sits in `SortableList`'s Add row,
  `xh-sortable-list__add`. Removed the `xh-grouping-chooser__add-control` and
  `xh-grouping-chooser__add-control__icon` classes.
* Added `xh-form-field__input-row`, `xh-form-field__right-items` and `xh-form-field--right-items`
  for the new `FormField.rightItems`. Fields without items keep their existing DOM.

### 📚 Libraries

* @dnd-kit/react, @dnd-kit/dom and @dnd-kit/abstract `added` at `0.5.3`
* @hello-pangea/dnd `removed`
