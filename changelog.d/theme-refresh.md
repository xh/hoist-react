### 💥 Breaking Changes

* Removed the `--xh-intent-*-h`, `--xh-intent-*-s` and `--xh-intent-*-l1` to `-l5` CSS variables.
  Each intent is now one fill color in `--xh-intent-<name>`, and Hoist derives its other shades
  from that fill. An app that set the removed variables sets the fill for each theme - see Step 4
  of the upgrade notes.

### 🎁 New Features

* Added a neutral color ramp, `--xh-neutral-0` to `--xh-neutral-11`, that the grays of both themes
  now read. Two seed variables drive every step: `--xh-neutral-hue` and `--xh-neutral-tint`. An app
  can set them to re-tint its whole theme, and contrast between steps holds. The dark theme
  sets its own hue, so set the hue for both themes to change it.
* Added CSS variables for chart colors, scrollbar shape, tree grid group fills, the panel title
  border and the hover outline of an input (`--xh-form-field-hover-box-shadow`).

### ✨ Styles

* Refreshed the light and dark themes. Surfaces, borders and text now come from the neutral ramp.
  Charts have new series palettes for each theme.
* Adjusted the intent colors so that a white button label and intent-colored text meet 4.5:1
  contrast. The one exception is a warning button in the light theme, at 4.2:1.
* Text and icons in an intent color now all read `--xh-intent-*-text-color`. Before, buttons, menu
  items, grid menu options and the `xh-intent-*` classes each used a different shade.
* Toasts with an intent now take the Hoist intent colors, not fixed colors.
* A `FormField` label keeps its color when the field is invalid. The required marker, the outline
  and the message show the error. A `FormFieldSet` shows a problem in its header and keeps a
  neutral border.
* `FormField` labels are now a little smaller and heavier than the value, in a softer color.
* Text inputs, text areas and selects show a stronger outline on hover.
* The `colors` tree style now fills expanded parent rows only, as the `highlights` style does.
