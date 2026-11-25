### 🎁 New Features

* Added `GridFindField.mode`. Set it to `cells` to find matching column headers and grid cells
  and move between them as Excel's Find does, stepping from the focused cell without changing row
  selection. The default `rows` mode finds and selects matching records, as before.
* Added `GridFindField.enableHotkey` to let Ctrl+F focus the field in place of the browser's find.

### ✨ Styles

* Added `--xh-grid-cell-find-match-bg` to tint the cells matching a `GridFindField` in `cells` mode.
