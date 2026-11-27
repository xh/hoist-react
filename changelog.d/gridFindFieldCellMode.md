### 🎁 New Features

* Added `GridFindField.mode`. Set it to `cells` to find matching grid cells and move between them
  as Excel's Find does, stepping from the focused cell and selecting the row of each match. A step
  to a column inside a collapsed column group expands the group. Set `includeHeaders` to find
  column headers too. The default `rows` mode finds and selects matching records, as before.
* Added `GridFindField.enableHotkey` to let Ctrl+F focus the field in place of the browser's find.
* Added `matchOn` to `StoreFilterField` and `GridFindField`. Set it to `rendered` to match the text
  each grid column shows, or `all` to match that or the raw value. The default `value` matches raw
  values, as before. `rendered` renders every searched cell on the first search, so it currently
  suits small grids only.

### 🐞 Bug Fixes

* Fixed `StoreFilterField` and `GridFindField` matching empty values to a query such as "null".
* Fixed `GridFindField` step buttons taking focus from the input, which stopped Enter and the arrow
  keys from stepping until the user clicked back into the input.
