# Hoist React v90 Upgrade Notes

> **From:** v89.x → v90.0.0 | **Released:** TBD | **Difficulty:** 🟢 LOW

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
- **MCP tooling packages (required if an app runs the Hoist MCP server or CLIs)** - the packages
  behind `hoist-mcp`, `hoist-docs` and `hoist-ts` are now optional peer dependencies. Apps that
  use the tools add them as devDependencies - see Step 5.

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

### 5. Install the MCP Tooling Packages If the App Uses the Tools

The Hoist MCP server and the `hoist-docs` and `hoist-ts` CLIs run on six packages that only they
import: `tsx`, `@modelcontextprotocol/sdk`, `zod`, `ts-morph`, `minisearch` and `commander`.
Through v89 these were regular dependencies of `@xh/hoist`, so every app installed them, with
ts-morph's own copy of TypeScript and tsx's esbuild binaries - about 85 packages and 55 MB per
install. v90 declares them as optional peer dependencies, so an app installs them only when it
adds them.

**Apps that run the tools** - those with a `hoist-react` entry in `.mcp.json`, or whose agents
call `npx hoist-docs` or `npx hoist-ts` - add them as devDependencies:

```bash
pnpm add -D tsx @modelcontextprotocol/sdk zod ts-morph minisearch commander
```

Take the latest versions that fit the optional peer ranges in the `package.json` of `@xh/hoist`.
A bin run without them exits with a message naming the missing packages and this command, so a
forgotten install shows up on the first `hoist-ping` or CLI call rather than failing silently.

**Apps that do not run the tools** need no change. Their next install drops the packages.

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
- [ ] If the app runs the Hoist MCP server or CLIs, `npx hoist-docs ping` reports the library and
      its doc count rather than missing packages.

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) - canonical example of a Hoist app.
