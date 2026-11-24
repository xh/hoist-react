### 💥 Breaking Changes

* Removed Blueprint. Desktop components now render Hoist's own markup and behavior, Hoist no longer
  loads Blueprint's stylesheet, and `@xh/hoist/kit/blueprint` is gone - replace its imports as in
  Step 2 of the upgrade notes. Hoist ships the Blueprint styles its components use, so they look
  the same. Move any direct `@blueprintjs/core` imports onto Hoist's components too.
    * Popovers and tooltips use the new `Popover` in `@xh/hoist/cmp/popover` and `Tooltip` in
      `@xh/hoist/cmp/tooltip` - see New Features. `DateInputProps.popoverModifiers` no longer has
      any effect.
    * Added `Dialog` to `@xh/hoist/desktop/cmp/dialog`, with `dialogBody`, `dialogFooter` and
      `dialogFooterActions`, and moved all Hoist dialogs, masks and overlays onto it. Import
      `dialog` and its parts from there rather than `@xh/hoist/kit/blueprint`.
    * Menus, context menus, toasts, hotkeys and the hotkeys dialog opened by `?` are Hoist's own.
      Hotkey combos keep the same syntax. Replace Blueprint `menuItem` and `menuDivider` elements
      with `MenuItem` configs and `'-'` tokens, e.g. in `AppMenuButton.extraItems` or from
      `ViewManagerModel.viewMenuItemFn`.
    * `Button`, `ButtonGroup`, `Checkbox`, `SwitchInput`, `RadioInput`, `TextInput`, `TextArea`,
      `NumberInput`, `SegmentedControl`, `Slider`, `TabSwitcher`, `Toolbar` overflow and `AppBar`
      render native elements. Button text is now also in an `xh-button__text` span.
    * Desktop `ButtonProps.tooltip` now shows a Hoist `Tooltip` rather than setting the native
      `title` attribute. Tests that find buttons by title should set `title` instead.
* Mobile `Popover` and `MenuButton` now use the cross-platform `Popover` from
  `@xh/hoist/cmp/popover`. Removed `@xh/hoist/mobile/cmp/popover` - import `popover` from
  `@xh/hoist/cmp/popover` instead. Popover content now renders in an `xh-popover__floating`
  element in a Floating UI portal, not in a `#xh-popover-portal` div. Restyle any app CSS that
  positions `.xh-popover__content-wrapper`.

### 🎁 New Features

* Added `Popover` to `@xh/hoist/cmp/popover`, Hoist's own popover, built on Floating UI. All
  desktop components that open popovers now use it.
    * Popovers, and the menus in them, use the app's font. Blueprint's used its own system font.
    * Escape now returns focus to the popover's target, so keyboard users keep their place.
    * It works on mobile too, with no arrow and a transparent backdrop that keeps a tap outside
      from reaching what lies behind. Set `backdrop` to dim the page behind it on either platform.
    * Any popover now closes when the app's route changes, as mobile popovers did before.
    * `content` also takes a component or a function that returns an element.
    * `offset` sets its distance from the target, in place of a Popper.js `offset` modifier.
* Added `Tooltip` to `@xh/hoist/cmp/tooltip`, a hover `Popover` with tooltip defaults, on desktop
  and mobile. It takes an `intent` and `compact`, and opens on keyboard focus as well as hover.
* Desktop `ButtonProps.tooltip` now takes a `ButtonTooltipConfig` as well as a string, for rich
  content, an `intent` or a `position`. Button tooltips open after 500ms, including on disabled
  buttons. Set `title` for the browser's native tooltip. Hoist's own buttons, such as
  `RefreshButton` and `ColChooserButton`, now show their default label this way.
* `Tooltip` now closes when its target is pressed, and stays closed until the pointer leaves, so
  it does not sit beside a popover or dialog the press opens.
* Dialogs now move keyboard focus inside when they open, and return it to where it was when they
  close.
* Desktop `Slider` handles now also take Home and End, to jump to either end, and PageUp and
  PageDown, to move by a label step.
* Desktop menus now support the keyboard: arrow keys, Home and End move between items, typing
  jumps to an item by its first letters, and ArrowRight and ArrowLeft open and close submenus.
  Escape in a submenu closes only that submenu.
    * Keys work as soon as a menu opens, whether by mouse or keyboard.
    * The focused item is highlighted as on hover, and moving the pointer over an item makes it
      the focused one.
    * Typing one letter repeatedly cycles through the items that start with it. A space continues
      a search in progress, so "save a" finds "Save As...".
* Added `MenuItem.rightElement`, an element shown at the right edge of a menu item, such as a
  button that acts on the item. A click on a control within it does not run the item's `actionFn`
  or close the menu, so its handler need not stop the event. Desktop and mobile menus both render
  it. Use it in place of Blueprint's `menuItem` with a `labelElement`.
* `ViewManagerConfig.viewMenuItemFn` now also takes a `MenuItem` config.

### 🐞 Bug Fixes

* Fixed Hoist's built-in desktop menus behaving differently from other menus. The `ViewManager`,
  app, `TabSwitcher` overflow and chooser favorites menus now render through `Menu`, so their
  submenus stay open briefly as the pointer leaves the parent item, and a right-click within them
  no longer shows the browser's context menu.
* Fixed desktop toasts shown together before the first toast appeared, such as at startup, each
  showing more than once, in stacks drawn over one another.

### ⚙️ Typescript API Adjustments

* Replaced Blueprint types in Hoist's public desktop props with Hoist-owned types, as a first step
  toward removing Blueprint. Runtime behavior is unchanged.
    * Added `PopoverPosition` and `PopoverBoundary` to the new `@xh/hoist/cmp/popover` package.
      They type `menuPosition`, `popoverPosition`, `tooltipPosition`, `popoverBoundary` and
      `tooltipBoundary`, and take the same values as before, so Blueprint `Position` constants
      still compile.
    * `ButtonProps` and `ButtonGroupProps` no longer extend Blueprint's props. They keep their
      declared props and all native `<button>` / `<div>` attributes, but drop Blueprint-only props
      such as `loading`, `alignText`, `large` and `small`. `ButtonGroupProps` keeps `fill`.
    * `MenuButtonProps.popoverProps` now takes `Partial<PopoverProps>`, on desktop and mobile.
      Mobile `MenuButtonProps.menuPosition` is now typed as `PopoverPosition`.
    * Added a Hoist-owned `HotkeyConfig` to `@xh/hoist/desktop/hooks`, for `PanelProps.hotkeys`
      and `useHotkeys`.
    * Deprecated `DateInputProps.popoverModifiers`, which passes Popper.js modifiers to Blueprint.
      Use `popoverPosition` and `popoverBoundary` instead.

### ✨ Styles

* `--xh-popover-backdrop-bg` now applies on desktop too, for a popover shown with `backdrop: true`.

### 📚 Libraries

* @blueprintjs/core `removed` - see Breaking Changes.
