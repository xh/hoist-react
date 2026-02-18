# Format Package

## Overview

The `/format/` package provides number, date, and miscellaneous formatting functions used
throughout Hoist applications. Given Hoist's focus on financial and enterprise applications,
number formatting is especially rich — supporting ledger-style accounting format, sign-based
color coding, automatic precision scaling, and labeled units (thousands, millions, billions).

The package exports two categories of tools for each data type:

- **Formatter functions** (e.g. `fmtNumber`) — take a value and options, return formatted output.
  Use these for ad-hoc, inline formatting in component render methods and business logic.

- **Renderer factories** (e.g. `numberRenderer`) — take options only and return a pre-configured
  function suitable for use as a grid column `renderer`. Use these when defining reusable column
  specs and other declarative configurations.

## Architecture

```
/format/
├── FormatNumber.ts   # Number formatting: fmtNumber, fmtPercent, fmtMillions, etc.
├── FormatDate.ts     # Date formatting: fmtDate, fmtDateTime, fmtCompactDate, etc.
├── FormatMisc.ts     # Utilities: fmtSpan, fmtJson, capitalizeWords
├── FormatUtils.ts    # createRenderer() — the renderer factory utility
└── impl/
    └── Utils.ts      # Internal helpers (saveOriginal)
```

## Formatters vs Renderers

This is a key distinction for working with the format package.

### Formatter Functions

Formatter functions take a **value** and optional **options**, returning formatted output directly.
Use them in render methods, tooltips, and anywhere you have a value in hand:

```typescript
import {fmtNumber, fmtPercent, fmtDate} from '@xh/hoist/format';

// Inline formatting in a component
span(fmtNumber(totalRevenue, {precision: 0, prefix: '$'}))

// In a tooltip or label
const label = `Change: ${fmtPercent(pctChange, {precision: 0, colorSpec: true, withSignGlyph: true})}`;

// Date formatting
const dateStr = fmtDate(trade.settleDate);
```

### Renderer Factories

Renderer factories take **options only** and return a pre-configured function `(value) => formattedOutput`.
This curried pattern is designed for grid column `renderer` props and other declarative configs
where the formatting options are known at definition time but the value arrives later:

```typescript
import {numberRenderer, dateRenderer, percentRenderer} from '@xh/hoist/format';

// In a grid column definition — renderer is called per-row with each cell value
const columns = [
    {field: 'tradeDate', renderer: dateRenderer()},
    {field: 'quantity',  renderer: numberRenderer({precision: 0, ledger: true})},
    {field: 'price',     renderer: numberRenderer({precision: 2})},
    {field: 'pnl',       renderer: numberRenderer({precision: 0, ledger: true, colorSpec: true})},
    {field: 'change',    renderer: percentRenderer({precision: 1, colorSpec: true, withSignGlyph: true})}
];
```

Every formatter function has a corresponding renderer factory:

| Formatter | Renderer Factory |
|-----------|-----------------|
| `fmtNumber` | `numberRenderer` |
| `fmtThousands` | `thousandsRenderer` |
| `fmtMillions` | `millionsRenderer` |
| `fmtBillions` | `billionsRenderer` |
| `fmtQuantity` | `quantityRenderer` |
| `fmtPrice` | `priceRenderer` |
| `fmtPercent` | `percentRenderer` |
| `fmtDate` | `dateRenderer` |
| `fmtDateTime` | `dateTimeRenderer` |
| `fmtDateTimeSec` | `dateTimeSecRenderer` |
| `fmtTime` | `timeRenderer` |
| `fmtCompactDate` | `compactDateRenderer` |

Renderer factories are created via the `createRenderer()` utility, which simply curries the
corresponding formatter:

```typescript
// createRenderer(fmtNumber) produces:
//   (opts?) => (value) => fmtNumber(value, opts)
export const numberRenderer = createRenderer(fmtNumber);
```

## Number Formatting

Number formatting is the most heavily used part of this package. The core function `fmtNumber`
powers all number formatters, with convenience wrappers for common financial use cases.

### `fmtNumber(v, opts?)`

The primary number formatting function. All other number formatters delegate to it.

```typescript
fmtNumber(1234567)           // "1,234,567"
fmtNumber(0.0456)            // "0.0456"
fmtNumber(1234.5, {
    precision: 2,
    prefix: '$'
})                            // "$1,234.50"
```

### NumberFormatOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `precision` | `0-12 \| 'auto'` | `'auto'` | Decimal places. `'auto'` adjusts based on value magnitude |
| `zeroPad` | `boolean \| 0-12` | `true` when precision is fixed | Pad with trailing zeros. A number specifies minimum zeros without padding to full precision |
| `withCommas` | `boolean` | `true` | Include thousands separators |
| `omitFourDigitComma` | `boolean` | `false` | Skip comma for exactly 4-digit whole numbers (e.g. 1500 vs 1,500) |
| `ledger` | `boolean` | `false` | Wrap negative values in parentheses instead of showing minus sign |
| `forceLedgerAlign` | `boolean` | `true` | Add invisible placeholder after positive ledger values so digits align vertically in columns |
| `colorSpec` | `boolean \| ColorSpec` | `false` | Color output by sign. `true` for default red/green/grey classes |
| `withPlusSign` | `boolean` | `false` | Prepend `+` to positive values |
| `withSignGlyph` | `boolean` | `false` | Prepend ▴/▾ arrow glyphs by sign |
| `prefix` | `string` | `null` | String to prepend (e.g. `'$'`), placed between sign and digits |
| `label` | `string \| boolean` | `null` | String to append. `true` uses the formatter's default (e.g. `'m'` for `fmtMillions`) |
| `labelCls` | `string` | `'xh-units-label'` | CSS class for label `<span>` |
| `tooltip` | `boolean \| (v) => string` | `null` | `true` for auto-tooltip showing full-precision original value |
| `strictZero` | `boolean` | `true` | If false, values that round to zero at the given precision display as zero (using `zeroDisplay` if set) |
| `nullDisplay` | `ReactNode` | `''` | Display value for null/undefined input |
| `zeroDisplay` | `ReactNode` | `null` | Display value for zero input |
| `asHtml` | `boolean` | `false` | Return HTML string instead of React element |

### Auto-Precision

When `precision` is `'auto'` (the default), `fmtNumber` selects precision based on value magnitude:

| Value Range | Precision |
|-------------|-----------|
| 0 | 2 |
| < 0.01 | 6 |
| < 100 | 4 |
| < 10,000 | 2 |
| >= 10,000 | 0 |

This provides sensible defaults for display, but many application column specs set an explicit
precision based on business requirements and to ensure consistent alignment within a column.

### Ledger Format

Ledger format is standard in financial applications — negative values are wrapped in parentheses
rather than prefixed with a minus sign. This is one of the most commonly used options in Hoist apps.

```typescript
fmtNumber(-1234.56, {precision: 2, ledger: true})   // "(1,234.56)"
fmtNumber(1234.56,  {precision: 2, ledger: true})    // "1,234.56 "  (with alignment placeholder)
```

The `forceLedgerAlign` option (default `true`) adds an invisible `)` placeholder after positive
values so that digits in a column of mixed positive/negative numbers align vertically. Set it to
`false` when formatting standalone values outside of a columnar context.

Real-world example — a currency column with ledger formatting:

```typescript
import {numberRenderer} from '@xh/hoist/format';
import {ExcelFormat} from '@xh/hoist/cmp/grid';

const ccyValueCol: ColumnSpec = {
    align: 'right',
    excelFormat: ExcelFormat.LEDGER_2DP,
    renderer: numberRenderer({
        precision: 2,
        ledger: true,
        forceLedgerAlign: false,
        nullDisplay: '-'
    }),
    width: 120
};
```

### ColorSpec

The `colorSpec` option applies CSS classes or inline styles based on the sign of the value.
Set to `true` for Hoist's default color classes, or provide a `ColorSpec` object with custom
classes or `CSSProperties`:

```typescript
interface ColorSpec {
    pos?: string | CSSProperties;      // Applied to positive values
    neg?: string | CSSProperties;      // Applied to negative values
    neutral?: string | CSSProperties;  // Applied to zero values
}
```

Default classes (when `colorSpec: true`): `xh-pos-val`, `xh-neg-val`, `xh-neutral-val`.

```typescript
// Default color classes — green for positive, red for negative
numberRenderer({precision: 0, ledger: true, colorSpec: true})

// Custom: use intent classes for specific semantic meaning
fmtNumber(overdueAmount, {prefix: '$', colorSpec: {pos: 'xh-intent-danger'}})

// Custom: inline CSS styles instead of classes
fmtNumber(value, {colorSpec: {pos: {color: '#00aa00'}, neg: {color: '#cc0000'}}})
```

ColorSpec is commonly combined with `ledger`, `withPlusSign`, or `withSignGlyph` for financial
P&L columns:

```typescript
// P&L column — Toolbox portfolio example
const pnlCol: ColumnSpec = {
    field: {name: 'pnl', type: 'number'},
    headerName: 'P&L',
    align: 'right',
    width: 130,
    absSort: true,
    tooltip: val => fmtNumberTooltip(val, {ledger: true}),
    renderer: numberRenderer({
        precision: 0,
        ledger: true,
        colorSpec: true
    })
};
```

### zeroPad

Controls trailing zero behavior. Can be `true`, `false`, or a number specifying a minimum
number of decimal places to pad to (without extending all the way to full `precision`):

```typescript
// precision: 4, zeroPad: true  → "1.2000"
// precision: 4, zeroPad: 2     → "1.20" (but "1.234" stays "1.234")
// precision: 4, zeroPad: false → "1.2"
```

When `precision` is a fixed number, `zeroPad` defaults to `true`. When `precision` is `'auto'`,
`zeroPad` defaults to `false`.

### Convenience Number Formatters

These wrap `fmtNumber` with pre-applied scaling and defaults for common financial use cases:

#### `fmtThousands(v, opts?)` / `fmtMillions(v, opts?)` / `fmtBillions(v, opts?)`

Divide value by the corresponding scale factor before formatting. When `label: true`, auto-appends
`'k'`, `'m'`, or `'b'` respectively.

```typescript
fmtMillions(2500000, {precision: 1, label: true})   // "2.5m"
fmtThousands(45000, {precision: 0, label: true})     // "45k"
fmtBillions(1200000000, {precision: 2, label: true}) // "1.20b"
```

Real-world example — market value column from Toolbox:

```typescript
import {millionsRenderer, fmtNumberTooltip} from '@xh/hoist/format';

const mktValCol: ColumnSpec = {
    field: {name: 'mktVal', type: 'number'},
    headerName: 'Mkt Value (m)',
    align: 'right',
    width: 130,
    absSort: true,
    tooltip: val => fmtNumberTooltip(val, {ledger: true}),
    renderer: millionsRenderer({precision: 3, ledger: true})
};
```

#### `fmtQuantity(v, opts?)`

Automatically scales to millions or billions based on the magnitude of the value. Applied defaults
include `ledger: true` and `label: true`.

```typescript
fmtQuantity(500000)       // "500,000"
fmtQuantity(2500000)      // "2.50m"
fmtQuantity(1200000000)   // "1.20b"
```

Supports `useMillions` and `useBillions` options (both default `true`) to control which scale
thresholds are active.

#### `fmtPrice(v, opts?)`

Formats a market price with intelligent precision — 2 decimal places for values under 1000,
0 for larger values.

```typescript
fmtPrice(42.5)     // "42.50"
fmtPrice(1500)     // "1,500"
```

#### `fmtPercent(v, opts?)`

Multiplies value by 100 and appends `%`. This matches Excel's percentage formatting — pass the
raw decimal ratio, not a pre-multiplied value.

```typescript
fmtPercent(0.456)                            // "45.60%"
fmtPercent(0.456, {precision: 0})            // "46%"
fmtPercent(-0.032, {
    precision: 1,
    colorSpec: true,
    withSignGlyph: true
})                                            // "▾3.2%" (in red)
```

Real-world example — a delta column with color and sign glyphs:

```typescript
import {percentRenderer} from '@xh/hoist/format';

{
    field: {name: 'deltaPeriod', type: 'number'},
    renderer: percentRenderer({
        precision: 0,
        colorSpec: true,
        withSignGlyph: true,
        nullDisplay: '-'
    })
}
```

#### `fmtNumberTooltip(v, opts?)`

Renders a minimally formatted, full-precision number for use in tooltips. Supports only the
`ledger` option. Returns an HTML string (`asHtml: true`).

```typescript
// Commonly used for grid column tooltips alongside a scaled/rounded renderer
tooltip: val => fmtNumberTooltip(val, {ledger: true}),
renderer: millionsRenderer({precision: 3, ledger: true})
```

### `parseNumber(value)`

Parses shorthand number strings with k/m/b suffixes back to numeric values. Useful for inputs
that accept shorthand entry:

```typescript
parseNumber('1.5k')    // 1500
parseNumber('2.5m')    // 2500000
parseNumber('0.5b')    // 500000000
parseNumber('1,234')   // 1234
```

## Date Formatting

Hoist defaults to the unambiguous `YYYY-MM-DD` date format (ISO 8601). XH recommends this format
for most applications — it sorts naturally, avoids confusion between month/day ordering conventions,
and is internationally understood. **Avoid** the US-centric `MM/DD/YYYY` format, which is
ambiguous and easily misread in international or multi-region contexts.

### Format Constants

| Constant | Value | Example Output |
|----------|-------|----------------|
| `DATE_FMT` | `'YYYY-MM-DD'` | 2026-02-08 |
| `DATETIME_FMT` | `'YYYY-MM-DD h:mma'` | 2026-02-08 3:45pm |
| `DATETIMESEC_FMT` | `'YYYY-MM-DD h:mm:ssa'` | 2026-02-08 3:45:30pm |
| `TIME_FMT` | `'h:mma'` | 3:45pm |
| `MONTH_DAY_FMT` | `'MMM D'` | Feb 8 |

### Core Date Formatters

| Function | Default Format | Description |
|----------|---------------|-------------|
| `fmtDate(v, opts?)` | `'YYYY-MM-DD'` | Standard date |
| `fmtDateTime(v, opts?)` | `'YYYY-MM-DD h:mma'` | Date with time |
| `fmtDateTimeSec(v, opts?)` | `'YYYY-MM-DD h:mm:ssa'` | Date with time and seconds |
| `fmtTime(v, opts?)` | `'h:mma'` | Time only |
| `fmtCompactDate(v, opts?)` | _(varies)_ | Adaptive format based on distance from today |

All accept `Date`, MomentJS, `LocalDate`, string, or numeric timestamp inputs.

### DateFormatOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fmt` | `string` | _(varies by function)_ | MomentJS format string |
| `nullDisplay` | `ReactNode` | `''` | Display value for null input |
| `tooltip` | `(v) => string` | `null` | Tooltip generator function |
| `asHtml` | `boolean` | `false` | Return HTML string instead of React element |

Options can be passed as a string shorthand for `fmt`:

```typescript
fmtDate(date, 'MM/DD/YYYY')              // shorthand
fmtDate(date, {fmt: 'MM/DD/YYYY'})       // equivalent
```

### `fmtCompactDate(v, opts?)`

Intelligently selects a format based on how far the date is from today, showing more detail for
recent dates and falling back to the full date for older ones. This is a good choice for columns
or displays where space is limited and recency matters more than a consistent format.

The formatter classifies dates into three buckets:

| Distance | Default Format | Example (if today is 2026-02-08) |
|----------|---------------|----------------------------------|
| Same day | `'h:mma'` for Date/Moment, `'MMM D'` for LocalDate | `3:45pm` |
| Within `distantThreshold` months (default 6) | `'MMM D'` | `Jan 15` |
| Beyond `distantThreshold` months | `'YYYY-MM-DD'` | `2025-03-22` |

**CompactDateFormatOptions:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sameDayFmt` | `string` | `'h:mma'` / `'MMM D'` | Format for today. Defaults differ for Date vs LocalDate |
| `nearFmt` | `string` | `'MMM D'` | Format for dates within the threshold |
| `distantFmt` | `string` | `'YYYY-MM-DD'` | Format for dates beyond the threshold |
| `distantThreshold` | `number` | `6` | Number of months (before and after today) to consider "near" |

```typescript
import {fmtCompactDate, compactDateRenderer} from '@xh/hoist/format';

// Assuming today is 2026-02-08:
fmtCompactDate(new Date('2026-02-08T15:45:00'))  // "3:45pm"    (same day → time only)
fmtCompactDate(new Date('2026-01-15T10:00:00'))  // "Jan 15"    (last month → month + day)
fmtCompactDate(new Date('2025-03-22T10:00:00'))  // "2025-03-22" (11 months ago → full date)

// LocalDate same-day defaults to 'MMM D' since there is no time component
fmtCompactDate(LocalDate.today())                // "Feb 8"

// Use as a column renderer for activity/event timestamps
{field: 'lastActivity', renderer: compactDateRenderer()}

// Custom thresholds — e.g. show full date after only 2 months
{field: 'updatedDate', renderer: compactDateRenderer({distantThreshold: 2})}
```

### Timestamp Utilities

#### `withFormattedTimestamps(obj, config?)`

Creates a copy of a plain object with timestamp values replaced by formatted strings. Identifies
timestamp properties by key suffix matching (default: keys ending in `'time'`, `'date'`, or
`'timestamp'`). Used primarily by the Hoist Admin Console; useful for formatting debug data.

#### `timestampReplacer(config?)`

Returns a replacer function for `JSON.stringify()` that formats timestamps inline.

## Miscellaneous Formatting

### `fmtSpan(v, opts?)`

Wraps a value in a styled `<span>`:

```typescript
fmtSpan('Active', {className: 'status-active', style: {fontWeight: 'bold'}})
```

Options: `className`, `style`, `title`, `leadSpc`, `trailSpc`, `asHtml`.

### `fmtJson(v, opts?)`

Pretty-prints a JSON string or object with configurable indentation:

```typescript
fmtJson({a: 1, b: 2})           // Formatted with 2-space indent (default)
fmtJson(jsonString, {space: 4}) // 4-space indent
```

### `capitalizeWords(str)`

Capitalizes the first letter of each space-separated word.

## Common Patterns

### Defining Reusable Column Specs

The most common pattern across Hoist applications is defining shared column specs in a central
module, pairing renderers with matching `ExcelFormat` values for consistent display and export:

```typescript
import {numberRenderer, percentRenderer, dateRenderer} from '@xh/hoist/format';
import {ExcelFormat} from '@xh/hoist/cmp/grid';

// Shared column definitions
export const hoursCol: ColumnSpec = {
    field: {name: 'hours', type: 'number'},
    excelFormat: ExcelFormat.NUM_2DP,
    renderer: numberRenderer({precision: 2, nullDisplay: '-'})
};

export const dueDateCol: ColumnSpec = {
    field: {name: 'dueDate', type: 'localDate'},
    headerName: 'Due',
    renderer: dateRenderer()
};
```

### Building App-Specific Formatters

Applications often wrap `fmtNumber` in app-specific functions that add domain conventions
(currency prefixes, custom scaling thresholds, masking):

```typescript
// App-specific money formatter with scaling
import {fmtNumber, NumberFormatOptions} from '@xh/hoist/format';

export function fmtMoney(v: number, opts: NumberFormatOptions = {}) {
    if (v == null) v = 0;
    return v >= 1000000
        ? fmtNumber(v / 1000, {precision: 0, prefix: '$', ...opts, label: 'k'})
        : fmtNumber(v, {precision: 0, prefix: '$', ...opts});
}

// Use in components
span(fmtMoney(summary.openAmount))
```

### Currency with Unit Labels

Financial apps frequently display values with dynamic currency labels:

```typescript
// Currency amount with dynamic code label
import {fmtNumber} from '@xh/hoist/format';

fmtNumber(amount, {
    precision: 0,
    label: currency.code,     // e.g. 'USD', 'EUR'
    ledger: true
})
```

### Custom Date Formats in Columns

```typescript
// Day-of-week column using custom MomentJS format string
const dayOfWeekCol: ColumnSpec = {
    colId: 'trade_date_day',
    field: {name: 'trade_date', type: 'localDate'},
    displayName: 'Day of Week',
    renderer: dateRenderer({fmt: 'dddd'})
};
```

## Related Packages

- [`/cmp/grid/`](../cmp/grid/README.md) - GridModel columns use renderers extensively
- [`/data/`](../data/README.md) - Field types determine appropriate formatters
- [`/core/`](../core/README.md) - HoistModel, hoistCmp for component integration
