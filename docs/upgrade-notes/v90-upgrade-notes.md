# Hoist React v90 Upgrade Notes

> **From:** v89.x → v90.0.0 | **Released:** 2026-11-02 | **Difficulty:** 🟢 LOW

## Overview

Hoist React v90 is a light upgrade. Its required steps apply only to apps that use the
affected APIs.

- **Number `formatConfig` (required if used)** - v90 removes `NumberFormatOptions.formatConfig`
  with numbro. A few number edge cases also changed, such as negative ties - see Step 1.
- **`DateInput` picker props (required if used)** - the desktop `DateInput` calendar is now
  react-day-picker 10, so `dayPickerProps` takes v10 props, and `timePickerProps` is gone. Apps
  that rendered Blueprint's `datePicker` from the kit need another calendar - see Step 2.
- **Mobile styling (required if an app styled Onsen class names)** - mobile components no longer
  render Onsen UI elements. App SCSS that targeted Onsen's class names or CSS variables, and any
  use of the `modifier` prop, needs updating - see Step 3.
- **`WindowedSelect` kit exports (required if used)** - v90 removes the `WindowedSelect` and
  `reactWindowedSelect` exports from `@xh/hoist/kit/react-select` along with the
  react-windowed-select library. The `enableWindowed` prop of `Select` works as before - see
  Step 4.
- **Column `renderer` reads (required if used)** - The built-in number and date column specs set
  `textRenderer`, not `renderer`. Code that calls `col.renderer(...)` on such a column now throws.
  Read `col.resolvedRenderer` instead - see Step 5.
- **Panel splitter CSS (required if an app styled splitters)** - desktop panel splitters are now
  a 1px line with their own `--xh-panel-splitter-*` variables. App overrides of
  `--xh-resizable-*` variables no longer reach them - see Step 6.
- **Renderer import paths (required if used)** - the `*Renderer` factories moved out of
  `@xh/hoist/format/FormatNumber` and `@xh/hoist/format/FormatDate`. Import them from
  `@xh/hoist/format` - see Step 7.
- **Removed libraries (required if an app imports them)** - Hoist no longer depends on several
  libraries, such as `semver` and `store2`. An app that imports one must declare it in its own
  `package.json` - see Step 8.
- **router5 8 (required if an app declares router5)** - Hoist moves to router5 8. An app that
  declares its own `router5` must match that version, or drop the dependency and type its routes
  with `HoistRoute` - see Step 9.

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v89.x.
- [ ] **hoist-core** at >= 40.5.0 (unchanged floor). **hoist-core 44.0 is recommended.** The new
  Purge Connections buttons in the Admin Console Connection Pool Monitor call an endpoint that
  older cores lack, so they fail there. See [Version Compatibility](../version-compatibility.md).

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

### 2. Update `DateInput` Picker Props

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

### 3. Update Mobile Styling That Targeted Onsen UI

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

### 4. Remove `WindowedSelect` Imports

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

### 5. Review Columns Built on the Number and Date Specs

The `number`, `date`, `dateTime`, `dateTimeSec`, `time`, `compactDate` and `localDate` column specs
now set a `Column.textRenderer` in place of a `renderer`. A text renderer returns the cell's display
text, and ag-Grid writes it into a plain cell with no React component. Grids built on these specs
get plain cells with no change. A `renderer` set on top of a spec still wins, so
`{...number, renderer: myRenderer}` works as before. One side effect remains: app code that reads
`renderer` from one of these specs, or from a `Column` built on one, finds none. Read
`col.resolvedRenderer`, which returns whichever of the two the column has.

**Find code that reads a column's renderer:**

```bash
# Matches `col.renderer` and `const {renderer} = col`
grep -rnE "\.renderer\b|\{[^}]*\brenderer\b[^}]*\}\s*=" client-app/src/
```

**Other formatted columns can be plain too.** Switch them to the `numberTextRenderer`,
`dateTextRenderer` and sibling factories in `@xh/hoist/format` as you touch them. Each takes the
options of its renderer counterpart, less those that need markup. The compiler rejects those options.

Before:

```typescript
{field: 'pnl', renderer: numberRenderer({precision: 0, ledger: true, colorSpec: true})}
```

After:

```typescript
{field: 'pnl', textRenderer: numberTextRenderer({precision: 0, ledger: true, colorSpec: true})}
```

A text renderer cell shows the same text, sign colors and alignment as the renderer cell it
replaces.
These differences remain:

- `colorSpec` classes such as `xh-pos-val` sit on the cell, not on an inner span.
- A `label` is plain text, with no `xh-units-label` span to style. Keep the renderer if the label
  needs its own style.
- Ledger alignment is a hidden `::after` on the cell. The cell text no longer ends in a hidden `)`.

Keep the renderer where a cell needs an element, such as an icon or nested layout. Also keep it for
`withSignGlyph`, `labelCls`, or a `colorSpec` with inline styles. A `tooltip` option does not need
the renderer. Move it to `Column.tooltip`, for example `tooltip: v => fmtNumberTooltip(v)`.

### 6. Move Panel Splitter Style Overrides

Desktop panel splitters are now a 1px line with a hover accent and a hover collapse button. They
no longer read the `--xh-resizable-*` CSS variables. Those variables still style the splitters in
`DashContainer` and `SplitTreeMap`, so leave any override in place if the app wants to style
those.

**Find affected code:**

```bash
grep -rn "xh-resizable-" client-app/src/
```

Map each override that targeted panel splitters to its new variable:

| Old variable | New variable |
|--------------|--------------|
| `--xh-resizable-border-color` | `--xh-panel-splitter-line-color` |
| `--xh-resizable-button-bg` | `--xh-panel-splitter-button-bg` |
| `--xh-resizable-button-icon-color` | `--xh-panel-splitter-button-icon-color` |
| `--xh-resizable-border-width` | None. The line is always 1px. |
| `--xh-resizable-size` | None. Use `--xh-panel-splitter-hit-size` to change the grab area. |
| `--xh-resizable-bg` | None. The splitter has no bar. |

Other new variables are `--xh-panel-splitter-accent-color`,
`--xh-panel-splitter-accent-active-color`, `--xh-panel-splitter-snap-color`,
`--xh-panel-splitter-hover-delay`, `--xh-panel-splitter-button-border-color`, and
`--xh-panel-collapsed-strip-*` for the strip.

App SCSS that targeted `.xh-resizable-splitter` should target `.xh-panel-splitter`. The
`.xh-resizable-dragger` and `.xh-resizable-collapser-btn` classes are gone.

**Header collapse button:** `showHeaderCollapseButton` now defaults to `false` on an expanded
panel when its splitter shows a collapse button. A collapsed header still shows its chevron. To
keep the header button on expanded panels, set `showHeaderCollapseButton: true`.

```typescript
// Before (v89) - header button shown by default
panel({modelConfig: {side: 'left', defaultSize: 250}})

// After (v90) - opt in to keep the header button when expanded
panel({modelConfig: {side: 'left', defaultSize: 250, showHeaderCollapseButton: true}})
```

To keep the header button on every panel, set the default once at app startup, for example in
your `AppModel` constructor:

```typescript
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';

PanelModel.defaults.showHeaderCollapseButton = true;
```

### 7. Import Renderer Factories from `@xh/hoist/format`

The number and date renderer factories now live in their own files, next to the new text renderer
factories. The `@xh/hoist/format` package still exports all of them, so apps that import from it
need no change. An import of a renderer from `@xh/hoist/format/FormatNumber` or
`@xh/hoist/format/FormatDate` fails to compile. The `fmt*` functions and option types such as
`NumberFormatOptions` still import from those paths.

The moved factories:

| Old file | Factories |
|---|---|
| `FormatNumber` | `numberRenderer`, `thousandsRenderer`, `millionsRenderer`, `billionsRenderer`, `quantityRenderer`, `priceRenderer`, `percentRenderer` |
| `FormatDate` | `dateRenderer`, `dateTimeRenderer`, `dateTimeSecRenderer`, `timeRenderer`, `compactDateRenderer` |

**Find affected code:**

```bash
grep -rnE "@xh/hoist/format/Format(Number|Date)['\"]" client-app/src/
```

Check each match for a name that ends in `Renderer`.

Before:

```typescript
import {fmtNumber, numberRenderer} from '@xh/hoist/format/FormatNumber';
```

After:

```typescript
import {fmtNumber, numberRenderer} from '@xh/hoist/format';
```

### 8. Declare Removed Libraries Your App Imports

Hoist v90 drops the libraries below from its dependencies. An app could import any of them
without declaring it, because Hoist installed them. Those imports now fail to resolve. For each
library that an app imports, either add it to the app's `package.json` or switch to the Hoist API
in the table.

| Library | Hoist alternative |
|---|---|
| `numbro` | `fmtNumber` and its options - see Step 1 |
| `date-fns`, `@blueprintjs/datetime` | `dayPicker` from `@xh/hoist/kit/react-day-picker` - see Step 2 |
| `onsenui`, `react-onsenui` | Hoist's mobile components - see Step 3 |
| `react-windowed-select` | `select({enableWindowed: true})` - see Step 4 |
| `semver` | `checkVersion`, `checkMinVersion` and `checkMaxVersion` from `@xh/hoist/utils/js` |
| `ua-parser-js` | `XH.isPhone`, `XH.isTablet` and `XH.isDesktop` |
| `store2` | `XH.localStorageService` and `XH.sessionStorageService` |
| `short-unique-id` | `genRandomId()` from `@xh/hoist/utils/js`, or `XH.genId()` |
| `lodash-inflection` | `pluralize`, `singularize` and `ordinalize` from `@xh/hoist/utils/js` |
| `http-status-codes` | None |

**Find affected code:**

```bash
grep -rnE "from '(numbro|date-fns|@blueprintjs/datetime|onsenui|react-onsenui|react-windowed-select|semver|ua-parser-js|store2|short-unique-id|lodash-inflection|http-status-codes)['/]" client-app/src/
```

Skip any match for a library that the app's `package.json` already declares.

### 9. Align Your App's router5 Dependency

Hoist v90 updates router5 and router5-plugin-browser from 7.0 to 8.0. An app that declares its own
`router5` at 7.x installs a second copy of the library beside Hoist's.

Most apps declare router5 only to import its `Route` type for `getRoutes()`. Import `HoistRoute`
from `@xh/hoist/core` instead. It is router5's `Route` plus Hoist's `omit` key, and it is the type
that `HoistAppModel.getRoutes()` returns. Then remove `router5` from the app's `package.json`.

Before:

```typescript
import type {Route} from 'router5';

override getRoutes(): Route[] {
```

After:

```typescript
import type {HoistRoute} from '@xh/hoist/core';

override getRoutes(): HoistRoute[] {
```

If the app still imports from router5 for anything else, update its own dependency to `~8.0.1`.
router5 8 moved its type files from `types/` to `dist/`, so an import from `router5/types/...` no
longer resolves. Import those types from `router5` itself.

**Find affected code:**

```bash
grep -n '"router5' client-app/package.json
grep -rnE "from 'router5(-plugin-browser)?['/]" client-app/src/
```

**Review deep links with `@`, `=` or `|` in a path parameter.** router5 8 percent-encodes path
parameter values. Values that contain `/`, `&`, `?` or `#` now work, where router5 7 threw an error.
But router5 8 does not match a URL from router5 7 whose path parameter holds a bare `@` or `=`, or
an encoded `|`. A bookmark to `/app/users/jane@example.com`, for example, no longer finds its route.
This applies to path parameters only. See [Route Parameters](../routing.md#route-parameters)
for a server limit on `/` in path parameters.

## Verification Checklist

After completing all steps:

- [ ] `pnpm install` / `yarn install` / `npm install` completes without errors.
- [ ] `pnpm lint` / `yarn lint` / `npm run lint` passes.
- [ ] `pnpm typecheck` / `npx tsc --noEmit` passes.
- [ ] The application builds and loads without console errors.
- [ ] No code passes `formatConfig` to a number formatter or renderer.
- [ ] No code passes `timePickerProps` to a `dateInput`, and `dayPickerProps` keys use
      react-day-picker 10 names.
- [ ] Nothing imports `datePicker` or `DatePicker` from `@xh/hoist/kit/blueprint`.
- [ ] No mobile SCSS targets Onsen class names or CSS variables, no mobile input or button passes
      `modifier`, and nothing imports from `@xh/hoist/kit/onsen`.
- [ ] Mobile screens with inputs, tabs, dialogs, toasts and menus look as they did on v89.
- [ ] No code imports `WindowedSelect` or `reactWindowedSelect` from `@xh/hoist/kit/react-select`.
- [ ] Code that reads `Column.renderer` handles columns built on the number and date specs.
- [ ] Styles on `xh-units-label` or on sign color classes inside grid cells still apply.
- [ ] No app SCSS styles panel splitters with `--xh-resizable-*` variables or
      `.xh-resizable-splitter`.
- [ ] Nothing imports a `*Renderer` factory from `@xh/hoist/format/FormatNumber` or
      `@xh/hoist/format/FormatDate`.
- [ ] The app's `package.json` declares every library that the app imports.
- [ ] The app's `package.json` declares no `router5` dependency, or declares `~8.0.1`, and
      `getRoutes()` returns `HoistRoute[]`.
- [ ] Deep links that carry `@`, `=` or `|` in a path parameter still open the right route.

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) - canonical example of a Hoist app.
