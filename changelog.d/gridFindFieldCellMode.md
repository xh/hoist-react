### 🎁 New Features

* Added `GridFindField.mode`. Set it to `cells` to find matching column headers and grid cells
  and move between them as Excel's Find does, stepping from the focused cell and selecting the row
  of each matching cell. The default `rows` mode finds and selects matching records, as before.
* Added `GridFindField.enableHotkey` to let Ctrl+F focus the field in place of the browser's find.

### 🐞 Bug Fixes

* Fixed `GridFindField` step buttons taking focus from the input, which stopped Enter and the arrow
  keys from stepping until the user clicked back into the input.
