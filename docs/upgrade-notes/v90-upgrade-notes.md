# Hoist React v90 Upgrade Notes

> **From:** v89.x → v90.0.0 | **Released:** TBD | **Difficulty:** 🟢 LOW

## Overview

Hoist React v90 is a light upgrade. Its two required steps apply only to apps that use the
affected API.

- **Number `formatConfig` (required if used)** - v90 removes `NumberFormatOptions.formatConfig`
  with numbro. A few number edge cases also changed, such as negative ties - see Step 1.
- **Column `renderer` reads (required if used)** - The built-in number and date column specs set
  `formatter`, not `renderer`. Code that calls `col.renderer(...)` on such a column now throws.
  Fall back to `col.formatter` - see Step 2.

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

### 2. Review Columns Built on the Number and Date Specs

The `number`, `date`, `dateTime`, `dateTimeSec`, `time`, `compactDate` and `localDate` column specs
now set a `Column.formatter` in place of a `renderer`. A formatter returns the cell's display text,
and ag-Grid writes it into a plain cell with no React component. Grids built on these specs get
plain cells with no change. A `renderer` set on top of a spec still wins, so
`{...number, renderer: myRenderer}` works as before. Two side effects remain:

- App code that reads `renderer` from one of these specs, or from a `Column` built on one, finds
  none. Fall back to the formatter, as in `col.renderer ?? col.formatter`.
- Client-side exports (`GridModel.localExport` and the `exportLocal` menu item) write the display
  text of a formatter column, where they wrote the raw value. An Excel file still gets a number
  as a raw number. Copy still sends the value, and `GridModel.exportAsync` still sends it with its
  Excel format.

**Find code that reads a column's renderer:**

```bash
# Matches `col.renderer` and `const {renderer} = col`
grep -rnE "\.renderer\b|\{[^}]*\brenderer\b[^}]*\}\s*=" client-app/src/
```

**Other formatted columns can be plain too.** Switch them to the `numberFormatter`, `dateFormatter`
and sibling factories in `@xh/hoist/format` as you touch them. Each takes the options of its
renderer counterpart, less those that need markup. The compiler rejects those options.

Before:

```typescript
{field: 'pnl', renderer: numberRenderer({precision: 0, ledger: true, colorSpec: true})}
```

After:

```typescript
{field: 'pnl', formatter: numberFormatter({precision: 0, ledger: true, colorSpec: true})}
```

A formatter cell shows the same text, sign colors and alignment as the renderer cell it replaces.
These differences remain:

- `colorSpec` classes such as `xh-pos-val` sit on the cell, not on an inner span.
- A `label` is plain text, with no `xh-units-label` span to style. Keep the renderer if the label
  needs its own style.
- Ledger alignment is a hidden `::after` on the cell. The cell text no longer ends in a hidden `)`.

Keep the renderer where a cell needs an element, such as an icon or nested layout. Also keep it for
`withSignGlyph`, `labelCls`, or a `colorSpec` with inline styles. A `tooltip` option does not need
the renderer. Move it to `Column.tooltip`, for example `tooltip: v => fmtNumberTooltip(v)`.

## Verification Checklist

After completing all steps:

- [ ] `pnpm install` / `yarn install` / `npm install` completes without errors.
- [ ] `pnpm lint` / `yarn lint` / `npm run lint` passes.
- [ ] `pnpm typecheck` / `npx tsc --noEmit` passes.
- [ ] The application builds and loads without console errors.
- [ ] No code passes `formatConfig` to a number formatter or renderer.
- [ ] Code that reads `Column.renderer` handles columns built on the number and date specs.
- [ ] Styles on `xh-units-label` or on sign color classes inside grid cells still apply.

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) - canonical example of a Hoist app.
