# Hoist React v90 Upgrade Notes

> **From:** v89.x → v90.0.0 | **Released:** TBD | **Difficulty:** 🟢 LOW

## Overview

Hoist React v90 is a light upgrade. Its two required steps apply only to apps that use the
affected APIs.

- **Number `formatConfig` (required if used)** - v90 removes `NumberFormatOptions.formatConfig`
  with numbro. A few number edge cases also changed, such as negative ties - see Step 1.
- **`DateInput` picker props (required if used)** - the desktop `DateInput` calendar is now
  react-day-picker 10, so `dayPickerProps` takes v10 props, and `timePickerProps` is gone. Apps
  that rendered Blueprint's `datePicker` from the kit need another calendar - see Step 2.

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

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) - canonical example of a Hoist app.
