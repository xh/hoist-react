### 💥 Breaking Changes

* `Button` and `ButtonGroup` are now one component for desktop and mobile, in the new
  `@xh/hoist/cmp/button` package. The desktop and mobile button packages re-export them, so
  imports keep working. A component that renders a button can now be shared across platforms.
    * Desktop renders a native `<button>`, mobile a `div` with the button role, as before.
    * Mobile button text now sits in an `xh-button__text` span, as on desktop, and truncates with
      an ellipsis.
    * A `ButtonGroup`'s `intent`, `minimal` and `outlined`, when set, now apply to each `Button`
      directly within it, on desktop as on mobile.
    * Mobile `ButtonProps` takes no model type by default, as desktop's does.
* Rewrote the button stylesheet around CSS variables, at the weight of a single class. Hoist's
  former button rules used doubled classes, which outranked many app and component rules that
  style buttons. Those rules now apply as written. Check app CSS that targets `.xh-button`.

### 🎁 New Features

* Added `ButtonProps.size` - `'compact'`, `'standard'` or `'large'`, as for `Callout` and `StatCard`.
  A `ButtonGroup` passes its `size` on to its buttons.
* Added `ButtonProps.loading`, `true` or a `TaskObserver`, to show a spinner while a task runs.
  The spinner takes the place of the icon, or covers a button with none. A loading button keeps
  its size and focus, and ignores clicks.
* Added `SplitButton` to `@xh/hoist/cmp/button`, a button for a primary action joined to an arrow
  button that opens a menu of related actions, on desktop and mobile.

### ✨ Styles

* Button styles now come from one stylesheet for desktop and mobile, a sixth the size of the
  two before. Set the new `--xh-button-height`, `--xh-button-padding`,
  `--xh-button-minimal-padding` and `--xh-button-gap` variables to tune them.
* Component styles that Hoist's former button rules outranked now apply: larger `PinPad` keys,
  muted `CodeInput` toolbar buttons, tighter `DateRangePicker` step buttons, smaller action
  buttons in compact `Banner`s and a narrower mobile `TextInput` clear button.
