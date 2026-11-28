### 💥 Breaking Changes

* Removed Blueprint. Hoist's desktop components now render their own markup, styles and behavior,
  and `@blueprintjs/core` is no longer a dependency. See Steps 2 and 3 of the upgrade notes.
    * Removed `@xh/hoist/kit/blueprint`. Use `dialog` from `@xh/hoist/desktop/cmp/dialog`,
      `popover` from `@xh/hoist/cmp/popover`, `tooltip` from `@xh/hoist/cmp/tooltip`, and
      `MenuItem` configs in place of `menuItem` and `menuDivider`. Replace any direct
      `@blueprintjs/core` imports the same way.
    * Removed Blueprint's `bp6-*` classes and `--bp-*` CSS variables. Components render BEM `xh-*`
      classes only. Run `docs/codemod/v92/codemod-bp6-classes.mjs` to rename app selectors and
      class strings. In development mode, Hoist warns about any `bp6-*` class or `--bp-*` variable
      left in a stylesheet.
    * Renamed `SegmentedControl` option classes to BEM names on desktop and mobile. Toolbar and
      AppBar separators now render the shared `Separator`, in place of `xh-toolbar__separator`. The
      codemod covers both.
    * Popovers no longer take Popper.js `modifiers`. Use `offset` to set the distance from the
      target.
    * Desktop `ButtonProps.tooltip` now shows a Hoist `Tooltip`, not a native `title`. Tests that
      find buttons by title should set `title` or use `testId`.
* Removed `@xh/hoist/mobile/cmp/popover`. Import `popover` from `@xh/hoist/cmp/popover`. Mobile
  popover content now renders in a Floating UI portal, not in `#xh-popover-portal`.

### 🎁 New Features

* Added `Popover` to `@xh/hoist/cmp/popover`, built on Floating UI for desktop and mobile. It takes
  an `offset`, an optional `backdrop`, and `content` as an element, component or function. It
  returns focus to its target on Escape and closes on a route change.
* Added `Tooltip` to `@xh/hoist/cmp/tooltip`, with `intent` and `compact` options. It opens on
  keyboard focus as well as hover, and closes when its target is pressed.
* Added `Dialog` to `@xh/hoist/desktop/cmp/dialog`, with `dialogBody`, `dialogFooter` and
  `dialogFooterActions`. Dialogs move focus inside when they open and restore it when they close.
* Desktop `ButtonProps.tooltip` now also takes a `ButtonTooltipConfig`, for rich content, an
  `intent` or a `position`.
* Added keyboard support to desktop menus: arrow keys, Home and End, type-ahead, and ArrowRight
  and ArrowLeft for submenus.
* Added `MenuItem.rightElement`, for a control at the right edge of a menu item. A click on it does
  not run the item's `actionFn` or close the menu.
* Added Home, End, PageUp and PageDown keys to desktop `Slider` handles.
* `AppBarProps.leftItems` and `rightItems` now take `'-'` for a separator.
* `ViewManagerConfig.viewMenuItemFn` now also takes a `MenuItem` config.

### 🐞 Bug Fixes

* Fixed the built-in desktop menus for `ViewManager`, the app menu, `TabSwitcher` overflow and
  chooser favorites. Their submenus now stay open as the pointer leaves, and right-click no longer
  shows the browser's context menu.
* Fixed desktop toasts shown together on first use, such as at startup, each showing more than
  once.

### ⚙️ Technical

* Deprecated `appBarSeparator`. Use `'-'` in `AppBarProps.leftItems` or `rightItems`, or
  `toolbarSep`.
* Deprecated `DateInputProps.popoverModifiers`, which now has no effect. Use `popoverPosition` and
  `popoverBoundary`.

### ⚙️ Typescript API Adjustments

* Replaced Blueprint types in Hoist's public desktop props with Hoist-owned types.
    * Added `PopoverPosition` and `PopoverBoundary` to `@xh/hoist/cmp/popover`. They type the
      `*Position` and `*Boundary` props and take the same string values as before.
    * `ButtonProps` and `ButtonGroupProps` no longer extend Blueprint's props. They drop
      Blueprint-only props such as `loading`, `alignText`, `large` and `small`.
    * `MenuButtonProps.popoverProps` now takes `Partial<PopoverProps>`, on desktop and mobile.
    * `HotkeyConfig` in `@xh/hoist/desktop/hooks` is now Hoist's own type.

### ✨ Styles

* Pressing a success, primary or warning menu item now tints it in its intent color, as danger
  items already did.
* Compact tooltips now use a tighter 4px 8px padding.
* `--xh-popover-backdrop-bg` now applies on desktop too.

### 📚 Libraries

* @blueprintjs/core `removed`.
