### 💥 Breaking Changes

* Removed Blueprint's `bp6-*` class names from Hoist's markup and stylesheets, and its `--bp-*` CSS
  variables. Each component now renders BEM `xh-*` classes only, such as `xh-menu-item--active`
  and `xh-tab-list__tab`. Run `docs/codemod/v92/codemod-bp6-classes.mjs` to rename app selectors
  and class strings - Step 3 of the upgrade notes maps every class. Hoist logs a
  development-mode warning naming any `bp6-*` class or `--bp-*` variable left in a stylesheet.
* Renamed SegmentedControl option classes on desktop and mobile to BEM names, such as
  `xh-segmented-control__option--intent-danger` for `xh-segmented-control-option--danger`. The
  codemod renames these too.
* Toolbar and AppBar separators now render the shared `Separator` from `@xh/hoist/cmp/layout`, in
  place of `xh-toolbar__separator` and Blueprint's navbar divider. Restyle app CSS on the old class
  with `.xh-toolbar .xh-separator`. The codemod lists each use.

### 🎁 New Features

* `AppBarProps.leftItems` and `rightItems` now take `'-'` for a separator, as a Toolbar's items do.

### ✨ Styles

* Pressing a success, primary or warning menu item now tints it in its intent color, as danger items
  already did.
* Compact tooltips now take their tighter 4px 8px padding, as Hoist's styles always intended.

### ⚙️ Technical

* Deprecated `appBarSeparator`. Use `'-'` in `AppBarProps.leftItems` or `rightItems`, or
  `toolbarSep`.
