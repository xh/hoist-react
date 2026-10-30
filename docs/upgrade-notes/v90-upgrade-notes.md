# Hoist React v90 Upgrade Notes

> **From:** v89.x → v90.0.0 | **Released:** TBD | **Difficulty:** 🟠 MEDIUM

## Overview

Hoist React v90 resets Hoist's CSS custom properties onto a simpler baseline, and removes Onsen UI
from the mobile toolkit. A codemod automates nearly all of the CSS migration. The other required
steps apply only to apps that use the affected APIs or styles.

- **Number `formatConfig` (required if used)** - v90 removes `NumberFormatOptions.formatConfig`
  with numbro. A few number edge cases also changed, such as negative ties - see Step 1.
- **CSS variables (required if your app customizes or reads Hoist's CSS variables)** - see Steps
  2-5. The new baseline is designed to read the way developers - and AI coding agents - expect CSS
  variables to work:
    - **One tier of variables.** The unprefixed override hooks are gone. Previously Hoist defined
      each variable as `--xh-grid-bg: var(--grid-bg, var(--xh-bg))`, with the unprefixed
      `--grid-bg` as the app-level hook. Apps now set the `--xh-*` variables directly.
    - **Sizes carry units.** Size variables hold real lengths (`--xh-spacing: 10px`) instead of
      unitless numbers, and every `-px` companion variable (`--xh-pad-px`, `--xh-font-size-px`,
      ...) is gone - read the base variable directly.
    - **Consistent names.** About 40 variables were renamed to follow one naming grammar - e.g.
      `--xh-pad` → `--xh-spacing`, `--xh-tbar-*` → `--xh-toolbar-*`, `--xh-appbar-color` →
      `--xh-appbar-text-color`. See [Renamed Variables](#renamed-variables) and the naming
      conventions in [`styles/README.md`](../../styles/README.md#naming-conventions).
    - **Overrides on `body.xh-app` always win**, in every theme and platform combination.
    - **Three variables that never had any effect were removed.**
- **`DateInput` picker props (required if used)** - the desktop `DateInput` calendar is now
  react-day-picker 10, so `dayPickerProps` takes v10 props, and `timePickerProps` is gone. Apps
  that rendered Blueprint's `datePicker` from the kit need another calendar - see Step 6.
- **Mobile styling (required if an app styled Onsen class names)** - mobile components no longer
  render Onsen UI elements. App SCSS that targeted Onsen's class names or CSS variables, and any
  use of the `modifier` prop, needs updating - see Step 7.
- **`WindowedSelect` kit exports (required if used)** - v90 removes the `WindowedSelect` and
  `reactWindowedSelect` exports from `@xh/hoist/kit/react-select` along with the
  react-windowed-select library. The `enableWindowed` prop of `Select` works as before - see
  Step 8.

The most significant CSS impacts are:

- **Old names and unitless values fail silently.** An app still setting `--grid-bg`, `--xh-pad`, or
  `--xh-font-size: 14` loses that customization without an error. Run the codemod, and watch for
  Hoist's development-mode console warning about unitless size variables.
- **Overrides set on `:root` or `html` no longer apply** - move them to `body.xh-app`.

## Upgrade Steps

### 1. Replace `formatConfig` and Review Number Edge Cases

Hoist no longer depends on numbro. `fmtNumber` and the formatters and renderers built on it format
digits with the browser's `Intl.NumberFormat`, fixed to the `en-US` locale. The
`NumberFormatOptions.formatConfig` option took a numbro format, so v90 removes it. Passing it fails
to compile and throws at runtime.

**Find affected code:**

```bash
grep -rn "formatConfig" client-app/src/
```

Replace each numbro format key with the matching Hoist option. Hoist groups thousands and rounds by
default, but numbro does neither unless the format asks. Map the keys a format leaves out as well,
or the output can gain commas and lose decimal places.

| numbro key | Hoist option |
|---|---|
| `thousandSeparated` left out or `false` | `withCommas: false` |
| `thousandSeparated: true` | None - Hoist groups thousands by default |
| `mantissa: n` | `precision: n` |
| `mantissa` left out | `precision: null` |
| `trimMantissa: true` | `zeroPad: false` |
| `negative: 'parenthesis'` | `ledger: true, forceLedgerAlign: false` |
| `forceSign: true` | `withPlusSign: true` |
| `average: true` | `fmtThousands()`, `fmtMillions()`, `fmtBillions()` or `fmtQuantity()` |
| `output: 'percent'` | `fmtPercent()` |

Before:

```typescript
numberRenderer({label: 'ms', formatConfig: {thousandSeparated: false, mantissa: 0}})
```

After:

```typescript
numberRenderer({label: 'ms', precision: 0, withCommas: false})
```

An app that imports numbro itself, for example to call `numbro.unformat()`, must declare numbro in
its own `package.json`.

Ordinary values render exactly as before. These edge cases changed:

| Input | Before | After | Why |
|---|---|---|---|
| `fmtNumber(-2.5, {precision: 0})` | `-2` | `-3` | Ties round half away from zero for both signs. numbro rounded negative ties toward zero. |
| `fmtNumber(-1.005, {precision: 2})` | `-1.00` | `-1.01` | The same rule. `1.005` gives `1.01`, as before. |
| `fmtPercent(-0.0045, {precision: 1})` | `-0.4%` | `-0.5%` | A negative value near a tie rounds as a positive one. `0.0045` gives `0.5%`, as before. |
| `fmtNumber(9.9999999e-7, {precision: 6})` | `0.000000` | `0.000001` | At a fixed precision, values below 1e-6 round like any other. numbro truncated them. At `'auto'` precision they still show as zero. |
| `fmtNumber(2390421244, {precision: 12})` | `2,390,421,243.999999500000` | `2,390,421,244.000000000000` | Past 15 significant digits the stored value shows. numbro added float noise when it shifted the decimal point. |
| `fmtNumber(1234.0001, {precision: 2, zeroPad: 0, omitFourDigitComma: true})` | `1234` | `1,234` | A `zeroPad` of `0` is the same as `false`. |
| `fmtNumber(Infinity)` | `Infinity` | `∞` | The `Intl.NumberFormat` symbol for infinity. |
| `fmtNumber('1,234.5', {precision: 2})` | `1,234.50` | `NaN` | A string renders as JavaScript's `Number()` reads it. `'1234.5'` still formats. |
| `fmtNumber('N/A')` | throws a `TypeError` | `NaN` | The same rule. |

Parse formatted text with `parseNumber()` before you format it, and update tests or exports that
match the text `Infinity`.

### 2. Run the CSS Variable Codemod

From your `client-app` directory, after installing v90:

```bash
# Preview first - reports every change without writing.
node node_modules/@xh/hoist/docs/codemod/v90/codemod-css-vars.mjs --dry src

# Then apply.
node node_modules/@xh/hoist/docs/codemod/v90/codemod-css-vars.mjs src
```

It scans `.scss`, `.css`, `.ts`, `.tsx`, `.js`, `.jsx`, and `.md` files and:

1. **Migrates unprefixed hooks** to their `--xh-*` variable, including the handful whose names
   never matched (see [Old Hook Name Mismatches](#old-hook-name-mismatches)). Only declarations
   inside a root-level selector (`body`, `html`, `:root`, `.xh-app`, `.xh-dark`, `.xh-mobile`, and
   combinations) are migrated - the only places the hooks ever worked. Pass `--no-hooks` to skip.
2. **Renames** every renamed or retired `--xh-*` variable, anywhere it appears.
3. **Adds `px`** to size variables set to a bare number: `--xh-spacing: 8;` → `--xh-spacing: 8px;`.
4. **Simplifies arithmetic** that re-applied the unit: `calc(var(--xh-spacing) * 1px)` →
   `var(--xh-spacing)`, and `calc(var(--xh-toolbar-item-spacing) * 2px)` →
   `calc(var(--xh-toolbar-item-spacing) * 2)`.

Before:
```scss
body.xh-app {
  --pad: 8;
  --border-color: #cccccc;
  --tbar-min-size: 50;
  --grid-header-cell-lr-pad: 14;

  &.xh-dark {
    --tbar-bg: #1d272c;
  }
}

.my-panel__header {
  padding: var(--xh-pad-half-px) var(--xh-pad-px);
  font-size: var(--xh-font-size-small-px);
}
```

After:
```scss
body.xh-app {
  --xh-spacing: 8px;
  --xh-border-color: #cccccc;
  --xh-toolbar-min-size: 50px;
  --xh-grid-header-padding-inline: 14px;

  &.xh-dark {
    --xh-toolbar-bg: #1d272c;
  }
}

.my-panel__header {
  padding: var(--xh-spacing-half) var(--xh-spacing);
  font-size: var(--xh-font-size-small);
}
```

The codemod ends with a report. Work through each section of it:

- **Hook migrations** - every unprefixed name it converted, with file and line. Confirm each was a
  Hoist hook rather than an app variable that happened to share a hook's name (e.g. `--gray`).
- **Removed variables still referenced** - delete these usages; the variables never had any effect.
- **Warnings** - `calc()` expressions that add a bare number to a size variable (add a unit to the
  number) or divide by one, TypeScript assigning a size variable a bare number, and code that
  references a size variable by name. For the last, check whether the code reads the variable's
  value - e.g. via `getComputedStyle(...).getPropertyValue()` - and appends a unit, which now
  doubles up (`41pxpx`).

### 3. Review What the Codemod Cannot Migrate

**Hooks set outside a root-level selector.** An unprefixed hook set on a container never had any
effect - Hoist read the hooks only on `body` - so the codemod leaves these alone. Search for any that
remain:

```bash
# Unprefixed custom properties. Add your own app prefix (e.g. --myapp-) to the exclusion list.
grep -rnE '^\s*--[a-z][a-z0-9-]*\s*:' --include='*.scss' --include='*.css' src \
  | grep -vE -- '--(xh|ag|bp[0-9]?|fa|myapp)-'
```

For any hit that names a Hoist hook, decide whether you want it at all: renamed to its `--xh-*`
variable, it will *start* applying within that subtree for the first time.

**Names built at runtime.** Variable names assembled dynamically - SCSS interpolation such as
`--xh-grid-tree-group-color-level-#{$i}`, or strings concatenated in TypeScript - are not detected.
Search for `--xh-` near `#{` or string concatenation and update them by hand using the
[Renamed Variables](#renamed-variables) table.

**Unit math on your own variables.** The codemod fixes `* 1px`-style arithmetic only where it reads
a Hoist size variable directly. If your own variable copies one, such as
`--my-font-size: var(--xh-grid-font-size)`, arithmetic on it is not detected. Fix it by hand:
`calc(var(--my-font-size) * 0.5px)` → `calc(var(--my-font-size) * 0.5)`.

**Form-field validation colors.** In prior versions the
`--form-field-{info,invalid,warning}-border-color` hooks fed *two* variables each: the
`-border-color` variable (as intended) and, by mistake, the matching `-box-shadow` variable - so an
app that set the hook to a color replaced the whole `box-shadow` value with a bare color, an
invalid value that browsers silently dropped. That app therefore saw its color on the validation
border but no inset shadow. In v90 the shadow variables reference the `-border-color` variables
properly, so setting `--xh-form-field-invalid-border-color` colors both the border and the inset
shadow. To keep the prior no-shadow appearance, add e.g.
`--xh-form-field-invalid-box-shadow: none;` alongside the color.

### 4. Check Override Selectors

Set overrides on `body.xh-app`. Hoist declares its defaults on `body`, wrapping its dark-theme and
mobile variants in `:where()` so every framework declaration has the specificity of a bare `body`
selector. A `body.xh-app` override therefore wins in every theme and platform combination - the
same reach the old unprefixed hooks had.

Two selectors that worked with the old hooks no longer do:

- **Bare `body`** ties with Hoist's declarations and wins only by source order.
- **`:root` or `html`** has no effect at all. Values set there reach `body` only by inheritance,
  and Hoist's own declarations on `body` take precedence. The old hooks were read wherever Hoist
  declared its variables, so an inherited hook value worked; an inherited `--xh-*` value does not.

Before:
```scss
:root {
  --grid-large-font-size: 16;
}
```

After:
```scss
body.xh-app {
  --xh-grid-large-font-size: 16px;
}
```

The codemod migrates the name and unit here but leaves the selector - change `:root` / `html` to
`body.xh-app` by hand. Where you want per-theme values, nest an `&.xh-dark` block as in Step 2.

**Scoped overrides** - setting a variable on a container rather than `body.xh-app` - only reach CSS
that reads that exact variable. Variables derived from it were resolved once on `body`, so
`.my-panel { --xh-spacing: 4px; }` does not change `--xh-spacing-half` within the panel. See "Base
vs. Derived Variables" in [`styles/README.md`](../../styles/README.md#base-vs-derived-variables).

### 5. Check the Console and the UI

Start the app in development mode. Hoist logs a warning at startup if any size variable resolves to
a bare number - almost always an override the codemod could not see, such as one set from
TypeScript or built with interpolation:

```
[ThemeModel] | CSS size variables must include a unit as of Hoist v90 (e.g. '8px', not '8').
Unitless values found for: --xh-spacing, ...
```

The check covers the active theme at startup; switch themes and reload to check the other. Then
review the app in both light and dark themes, and on mobile if applicable.

### 6. Update `DateInput` Picker Props

The desktop `DateInput` popover now renders its calendar with react-day-picker 10, the library the
mobile `DateInput` already uses, and a time picker of Hoist's own. Hoist no longer depends on
`@blueprintjs/datetime`, which also removes the second copies of date-fns and react-day-picker that
every app installed. Apps that only render `dateInput` with `value`, `minDate`, `maxDate`,
`timePrecision`, `showActionsBar` and the other standard props need no change. Behavior to note:

- The calendar's month and year are still dropdowns, and `fixedWeeks` is still on.
- The time picker is 24-hour, matching the `HH:mm` display formats. Arrow keys step the focused
  field, and a field selects its contents on focus.
- Today and Clear buttons appear under the calendar when `showActionsBar` is set, as before.

**Find affected code:**

```bash
grep -rn "dayPickerProps\|timePickerProps\|datePicker\|DatePicker" client-app/src/
```

**`dayPickerProps`** is now `Partial<DayPickerProps>` from `@xh/hoist/kit/react-day-picker`, so it
takes react-day-picker 10 props where before it took react-day-picker 8 props. Rename the keys an
app passes per the [react-day-picker upgrade guide](https://daypicker.dev/upgrading), which covers
the v8 renames that carried into v10. The common ones:

| react-day-picker 8 | react-day-picker 10 |
|---|---|
| `disabledDays` or `disabled` | `disabled` - matchers such as `{before: date}` and `{dayOfWeek: [0, 6]}` are unchanged |
| `fromDate` / `toDate`, `fromMonth` / `toMonth`, `fromYear` / `toYear` | `startMonth` / `endMonth` |
| `modifiers` with `modifiersStyles` or `modifiersClassNames` | Same props, but a modifier's generated class is `rdp-<name>`, not `rdp-day_<name>` |
| `classNames` keys such as `day_selected`, `day_today`, `nav_button_previous` | `selected`, `today`, `button_previous` - see the `ClassNames` type |
| `components.Caption` | `components.MonthCaption` |

Hoist still owns `mode`, `selected`, `onSelect` and `required`, and merges any `disabled` matchers
with those it generates from `minDate` and `maxDate`.

Before:

```typescript
dateInput({
    bind: 'tradeDate',
    dayPickerProps: {
        disabledDays: {daysOfWeek: [0, 6]},
        fromYear: 2020,
        toYear: 2030
    }
})
```

After:

```typescript
dateInput({
    bind: 'tradeDate',
    dayPickerProps: {
        disabled: {dayOfWeek: [0, 6]},
        startMonth: new Date(2020, 0),
        endMonth: new Date(2030, 11)
    }
})
```

**`timePickerProps`** is removed. It took Blueprint `TimePicker` options, none of which apply to
Hoist's time picker. Delete the prop. An app that set `useAmPm: true` gets a 24-hour picker. The
`formatString` and `parseStrings` props still control how the text input shows and reads the time.

Before:

```typescript
dateInput({bind: 'start', timePrecision: 'minute', timePickerProps: {useAmPm: true}})
```

After:

```typescript
dateInput({bind: 'start', timePrecision: 'minute'})
```

**`datePicker` and `DatePicker`** are no longer exported from `@xh/hoist/kit/blueprint`. An app
that rendered Blueprint's calendar directly can render `dayPicker` from
`@xh/hoist/kit/react-day-picker` instead, which carries Hoist's theme for light and dark modes.
Its props are react-day-picker 10 props, so apply the table above.

Before:

```typescript
import {datePicker} from '@xh/hoist/kit/blueprint';

datePicker({value: model.date, onChange: date => (model.date = date), minDate, maxDate})
```

After:

```typescript
import {dayPicker} from '@xh/hoist/kit/react-day-picker';

dayPicker({
    mode: 'single',
    required: true,
    selected: model.date,
    onSelect: date => (model.date = date),
    disabled: [{before: minDate}, {after: maxDate}],
    startMonth: minDate,
    endMonth: maxDate
})
```

An app that imports `@blueprintjs/datetime` or `date-fns` itself must now declare them in its own
`package.json`. Prefer dropping the Blueprint import, since a second calendar library adds a second
copy of date-fns to the bundle.

### 7. Update Mobile Styling That Targeted Onsen UI

Hoist's mobile components used to render [Onsen UI](https://onsen.io/) custom elements, which
stamped their own class names into the DOM. In v90 they render native elements under `xh-` class
names, and Onsen's stylesheet and CSS variables are gone. Most apps need no change: Toolbox did
not. An app that styled Onsen's class names, or passed the `modifier` prop, needs the steps below.

**Find affected code:**

```bash
grep -rnE "modifier:|\.(button|text-input|search-input|checkbox|switch|list-item|page|dialog|dialog-container|dialog-mask|toast|tabbar)(__|--|[^a-z-])|ons-|--(highlight-color|text-color|tabbar-height|font-size)\b" client-app/src/
```

**Remove imports from `@xh/hoist/kit/onsen`.** The kit is gone along with the `onsenui` and
`react-onsenui` packages. An app that imported Onsen components through it, or installed Onsen
itself, must replace them with Hoist's mobile components or its own.

**Remove the `modifier` prop.** Mobile `Button`, `TextInput`, `NumberInput`, `SearchInput`,
`Checkbox` and `SwitchInput` no longer accept it. It carried an Onsen modifier string such as
`'large'` or `'underbar'`; there is no equivalent. Style the component's `className` instead.

**Replace Onsen selectors with Hoist's.** The DOM each component renders is now Hoist's own:

| Component | Onsen selector (v89) | Hoist selector (v90) |
|---|---|---|
| `Button` | `ons-button`, `.button` | `.xh-button` |
| `TextInput` | `ons-input`, `.text-input` | `.xh-text-input`, `.xh-text-input__input` |
| `NumberInput` | `ons-input`, `.text-input` | `.xh-number-input`, `.xh-number-input__input` |
| `SearchInput` | `ons-search-input`, `.search-input` | `.xh-search-input`, `.xh-search-input__input` |
| `Checkbox` | `.checkbox__input`, `.checkbox__checkmark` | `.xh-check-box__input`, `.xh-check-box__checkmark` |
| `SwitchInput` | `.switch__toggle`, `.switch__handle` | `.xh-switch-input__toggle`, `.xh-switch-input__handle` |
| Menu items | `ons-list-item`, `.list-item`, `.center` | `.xh-menu__list__item`, `.xh-menu__list__item__content` |
| `Dialog`, `DialogPanel` | `.dialog-mask`, `.dialog`, `.dialog-container` | `.xh-dialog__mask`, `.xh-dialog__frame`, `.xh-dialog__container` |
| `Toast` | `ons-toast`, `.toast`, `.toast__message`, `.toast-bg-intent-*` | `.xh-toast`, `.xh-toast__content`, `.xh-toast--intent-*` |
| `TabContainer` | `ons-tabbar`, `.tabbar`, `.tabbar__button`, `ons-tab` | `.xh-tab-switcher`, `button.xh-tab`, `.xh-tab--active` |
| Tab content | `ons-page`, `.page`, `.page__content`, `.page__background` | `.xh-tab-wrapper`, `.xh-tab-page` |

Onsen's CSS variables (`--highlight-color`, `--tabbar-height`, `--text-color`, `--font-size` and
others) are no longer defined. Use the matching `--xh-*` variable from `styles/vars.scss`.

**Review test selectors.** Mobile `Checkbox` and `SwitchInput` now put their `testId` on the
native `<input>`, as on desktop, rather than on a wrapper element. Mobile `TabContainer` now
applies `${testId}-switcher` and `${testId}-switcher-${tabId}`, which were desktop-only before.

**Behavior to note:**

- Mobile components render in the app font (`--xh-font-family`). Onsen applied the system font
  (`-apple-system`, Helvetica Neue) to its buttons, dialogs, tabs, menus and toasts. To keep the
  system font for buttons, set `font-family` on `.xh-button` in app SCSS.
- Mobile `Button` renders a `div` with `role="button"`, as Onsen's element was in effect, so it
  still fills a block container and sizes to its content in a flex row.
- Mobile `Dialog` and `DialogPanel` render into a portal on the document body.
- Mobile `TabContainer` renders every tab's content, including tabs with `excludeFromSwitcher`,
  which it previously left out. Inactive tabs are hidden with `display: none`, as on desktop,
  rather than laid out off-screen.
- Mobile `TextInput`, `NumberInput` and `SearchInput` apply `domAttrs` to the `<input>` itself.
- Pull-down-to-refresh on the `Navigator` and the Escape key on a cancelable `Dialog` work as
  before.
### 8. Remove `WindowedSelect` Imports

The desktop `Select` now windows a large option list itself, with react-window 2, so Hoist no
longer depends on react-windowed-select. Apps that set `enableWindowed` need no change. The menu
windows once the list has 100 or more options, as before.

**Find affected code:**

```bash
grep -rn "WindowedSelect\|react-windowed-select" client-app/src/
```

An app that rendered the kit's `WindowedSelect` or `reactWindowedSelect` directly should use
`select({enableWindowed: true})` instead, or add react-windowed-select to its own `package.json`.
Remove any `react-windowed-select` entry from the app's `resolutions` or `overrides`.
## Verification Checklist

After completing all steps:

- [ ] `pnpm install` / `yarn install` / `npm install` completes without errors.
- [ ] `pnpm lint` / `yarn lint` / `npm run lint` passes.
- [ ] `pnpm typecheck` / `npx tsc --noEmit` passes.
- [ ] The application builds and loads without console errors.
- [ ] No code passes `formatConfig` to a number formatter or renderer.
- [ ] The CSS codemod report has been reviewed - hook migrations, removed variables, and warnings.
- [ ] No CSS variable overrides remain on `:root`, `html`, or bare `body`.
- [ ] The application loads in development mode without the unitless size variable warning.
- [ ] Custom colors, spacing, and typography render correctly in both light and dark themes (and on
  mobile, if applicable).
- [ ] Form validation styling looks as intended if you override any `-border-color` (Step 3 note).
- [ ] No references to retired CSS variable names remain:
  ```bash
  # Should return nothing
  grep -rnE -- '--xh-[a-z0-9-]+-px\b|--xh-(pad|tbar)(-|\b)' src
  ```
- [ ] No code passes `timePickerProps` to a `dateInput`, and `dayPickerProps` keys use
      react-day-picker 10 names.
- [ ] Nothing imports `datePicker` or `DatePicker` from `@xh/hoist/kit/blueprint`.
- [ ] No mobile SCSS targets Onsen class names or CSS variables, no mobile input or button passes
      `modifier`, and nothing imports from `@xh/hoist/kit/onsen`.
- [ ] Mobile screens with inputs, tabs, dialogs, toasts and menus look as they did on v89.
- [ ] No code imports `WindowedSelect` or `reactWindowedSelect` from `@xh/hoist/kit/react-select`.

## Renamed Variables

Beyond the renames below, two rules cover every other retired name:

- **Every `-px` variable** is replaced by its base name, which now holds a length:
  `--xh-font-size-px` → `--xh-font-size`, `--xh-scrollbar-size-px` → `--xh-scrollbar-size`.
- **`--xh-tbar-*`** is now **`--xh-toolbar-*`**, and **`-lr-pad`** is now **`-padding-inline`**:
  `--xh-grid-cell-lr-pad` → `--xh-grid-cell-padding-inline`.

| v89 | v90 |
|---|---|
| `--xh-appbar-color` | `--xh-appbar-text-color` |
| `--xh-appbar-title-color` | `--xh-appbar-title-text-color` |
| `--xh-date-range-picker-accent` | `--xh-date-range-picker-accent-color` |
| `--xh-font-size-large-em` | `--xh-font-size-large-relative` |
| `--xh-font-size-small-em` | `--xh-font-size-small-relative` |
| `--xh-form-field-info-color` | `--xh-form-field-info-text-color` |
| `--xh-form-field-invalid-color` | `--xh-form-field-invalid-text-color` |
| `--xh-form-field-label-color` | `--xh-form-field-label-text-color` |
| `--xh-form-field-msg-font-size` | `--xh-form-field-message-font-size` |
| `--xh-form-field-msg-line-height` | `--xh-form-field-message-line-height` |
| `--xh-form-field-msg-margin` | `--xh-form-field-message-margin` |
| `--xh-form-field-msg-text-transform` | `--xh-form-field-message-text-transform` |
| `--xh-form-field-warning-color` | `--xh-form-field-warning-text-color` |
| `--xh-grid-bg-hover` | `--xh-grid-row-hover-bg` |
| `--xh-grid-bg-odd` | `--xh-grid-odd-row-bg` |
| `--xh-grid-cell-change-bg-highlight` | `--xh-grid-cell-changed-bg` |
| `--xh-grid-cell-focus-border-color` | `--xh-grid-cell-focused-border-color` |
| `--xh-grid-selected-row-bg` | `--xh-grid-row-selected-bg` |
| `--xh-grid-selected-row-text-color` | `--xh-grid-row-selected-text-color` |
| `--xh-grid-tree-group-color-level-0` | `--xh-grid-tree-group-level-0-bg` |
| `--xh-grid-tree-icon-px` | `--xh-grid-tree-icon-size` |
| `--xh-loading-indicator-color` | `--xh-loading-indicator-text-color` |
| `--xh-mobile-input-font-size` | `--xh-input-font-size` |
| `--xh-mobile-input-height-px` | `--xh-input-height` |
| `--xh-mobile-input-label-font-size` | `--xh-input-label-font-size` |
| `--xh-pad` | `--xh-spacing` |
| `--xh-pad-double` | `--xh-spacing-double` |
| `--xh-pad-half` | `--xh-spacing-half` |
| `--xh-pad-safe-all` | `--xh-safe-area-inset` |
| `--xh-pad-safe-bottom` | `--xh-safe-area-inset-bottom` |
| `--xh-pad-safe-left` | `--xh-safe-area-inset-left` |
| `--xh-pad-safe-right` | `--xh-safe-area-inset-right` |
| `--xh-pad-safe-top` | `--xh-safe-area-inset-top` |
| `--xh-scrollbar-thumb` | `--xh-scrollbar-thumb-color` |
| `--xh-segmented-control-pad` | `--xh-segmented-control-padding` |
| `--xh-tbar-item-pad` | `--xh-toolbar-item-spacing` |
| `--xh-title-pad` | `--xh-title-padding` |
| `--xh-zone-grid-cell-lr-pad-px` | `--xh-zone-grid-cell-padding-inline` |
| `--xh-zone-grid-delimiter-color` | `--xh-zone-grid-delimiter-text-color` |
| `--xh-zone-grid-label-color` | `--xh-zone-grid-label-text-color` |

`--xh-grid-tree-group-color-level-1` through `-9` follow the same pattern as level 0.

**Removed** - none of these had any effect:

| Variable | Note |
|---|---|
| `--xh-chart-bg` | Charts take their background from the Highcharts theme. |
| `--xh-tab-border-width` | Never applied. |
| `--xh-toolbar-button-bg` | Never applied. |

## Old Hook Name Mismatches

Nine v89 unprefixed hooks were named differently from the variable they configured. The codemod
handles these; for reference, their v90 variables are:

| v89 unprefixed hook | v90 variable |
|---|---|
| `--form-field-info-border-color` | `--xh-form-field-info-border-color` (see Step 3 note) |
| `--form-field-invalid-border-color` | `--xh-form-field-invalid-border-color` (see Step 3 note) |
| `--form-field-warning-border-color` | `--xh-form-field-warning-border-color` (see Step 3 note) |
| `--grid-cell-bg-highlight` | `--xh-grid-cell-changed-bg` |
| `--grid-header-cell-lr-pad` | `--xh-grid-header-padding-inline` |
| `--input-placeholder-color` | `--xh-input-placeholder-text-color` |
| `--popover-backdrop` | `--xh-popover-backdrop-bg` |
| `--popover-shadow` | `--xh-popover-box-shadow` |
| `--zone-grid-cell-pad-px` | `--xh-zone-grid-cell-padding-inline` |

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) - canonical example of a Hoist app.
- [`styles/README.md`](../../styles/README.md) - CSS variable system documentation, including
  naming conventions.
- [`codemod-css-vars.mjs`](../codemod/v90/codemod-css-vars.mjs) - the CSS variable migration codemod.
