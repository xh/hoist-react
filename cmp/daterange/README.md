# Date Range Package

## Overview

The `/cmp/daterange/` package provides `DateRangePickerModel`, a model for selecting a period of
time and reading it back as concrete dates and filters. Its desktop UI, `DateRangePicker` in
`/desktop/cmp/daterange/`, is a compact toolbar control: one trigger button showing the applied
period and its dates, opening a popover with a tab for each way of choosing a period.

**Key features:**
- One value that can express a preset (MTD, Prev 30 Days, ...), a relative lookback, a calendar
  month or year, or a custom range of dates
- Resolution against a live anchor day, so a persisted "month to date" stays month to date - and
  rolls over at midnight without app involvement
- A comparable prior range for every selection, for period-over-period comparisons
- Stepping back and forth through periods without a selection losing what it is
- Ready-made `FieldFilterSpec`s for filtering a Store, Cube View, or server query
- Built-in presets, app-defined presets, and a business-day mode for single-day navigation
- Plain JSON value that persists through `persistWith`, including ViewManager views

The model is cross-platform. Only the desktop component exists today.

This guide covers how the pieces fit together and how the selection resolves. For the full list
of configuration keys and component props with their defaults, see the JSDoc on
`DateRangePickerConfig` and `DateRangePickerProps` - the source of truth, and what IDE hover and
the Hoist symbol tools surface.

## Architecture

```
DateRangePickerModel
├── value: DateRangeSelection          # The applied period, always normalized
├── anchorDay: DateRangeAnchorDay      # How the anchor date is determined - live by default
├── anchorDate, today, minDate, maxDate  # The dates selections resolve against
├── businessDayMode, isBusinessDay     # Single-day handling
├── presets: DateRangePreset[]         # Offered on the Presets tab
├── tabs: DateRangePickerTab[]         # Offered in the popover
├── currentRange: LocalDateRange       # Resolved {start, end}
├── priorRange: LocalDateRange         # The comparable preceding range, or null
├── currentRangeFilter, priorRangeFilter  # FieldFilterSpec[] on `filterField`
├── label, rangeLabel, displayName     # Display strings
└── Methods:
    ├── setValue()                     # Apply a selection or preset token
    ├── stepRange()                    # Previous / next period
    ├── resolve(), parseValue()        # Work with selections other than the applied one
    └── setAnchorDay(), setMaxDate(), setPresets(), setTabs(), ...

DateRangeSelection (plain JSON, discriminated on `kind`)
├── {kind: 'preset', token, offset?}
├── {kind: 'relative', count, unit, snap, offset?}
├── {kind: 'month', year, month}
├── {kind: 'year', year}
└── {kind: 'custom', start, end}       # 'YYYY-MM-DD' strings

DateRangeContext                       # What selections resolve against
├── anchorDate, today, minDate, maxDate
├── isBusinessDay(date), businessDayMode
└── presets: Record<token, DateRangePreset>
```

Resolution is pure: `resolveDateRange(selection, context)` returns `{current, prior}`. The model
holds the context as observable state and exposes the resolved ranges as derived values, so they
update when the value, the anchor date, or the bounds change.

## DateRangePickerModel

### Basic Usage

Construct the model within an app model, render the picker bound to it, and read the resolved
range or filters wherever the app queries.

```typescript
import {DateRangePickerModel} from '@xh/hoist/cmp/daterange';
import {dateRangePicker} from '@xh/hoist/desktop/cmp/daterange';

class ReportModel extends HoistModel {
    @managed gridModel = new GridModel({...});
    @managed periodModel = new DateRangePickerModel({
        filterField: 'tradeDate',
        initialValue: 'mtd',
        persistWith: {localStorageKey: 'reportPeriod'}
    });

    constructor() {
        super();
        makeObservable(this);
        this.addReaction({
            track: () => this.periodModel.currentRangeFilter,
            run: filter => this.gridModel.store.setFilter(filter),
            fireImmediately: true
        });
    }
}

// In the component - the picker finds the model via context lookup.
toolbar(dateRangePicker({showStepButtons: true}), filler(), ...)
```

The value and its derived ranges stay live whether or not a picker is mounted. A locked dashboard
widget, for example, can hide its picker but still query by period.

### Configuration

`DateRangePickerConfig` shapes what the picker offers and how it resolves. The keys most apps
touch:

- `tabs` and `presets` select which of the four tabs appear and which presets the Presets tab
  lists, in order. Presets may be built-in tokens, app-defined `DateRangePreset` objects, or both.
- `anchorDay`, `minDate`, and `maxDate` set the dates everything resolves against - see Anchor
  Day and Bounds below.
- `filterField` names the field for `currentRangeFilter` and `priorRangeFilter`.
- `initialValue` is the starting selection, given as a selection object or a preset token, and
  the fallback for missing or invalid persisted state. It defaults to the first configured preset,
  or a rolling 30 days when there are none.
- `persistWith` persists the value - see Persistence below.

`businessDayMode`, `commitOnChange`, `dateFormat`, and `isBusinessDay` round out the config. All
but the last can be defaulted app-wide via `DateRangePickerModel.defaults`, as can `anchorDay`.

### The Selection Value

`value` is always a normalized `DateRangeSelection`. Set it with `setValue()`, which accepts a
selection object or a bare preset token and ignores (with a logged warning) anything that fails
validation: an unknown preset, an out-of-range count, year, or offset, or a malformed date.

| Kind | Shape | Resolves to |
|------|-------|-------------|
| `preset` | `{kind: 'preset', token: 'mtd'}` | Whatever the preset's resolver returns for the current context |
| `relative` | `{kind: 'relative', count: 6, unit: 'months', snap: false}` | A window of `count` units ending on the anchor date |
| `month` | `{kind: 'month', year: 2026, month: 8}` | The calendar month, clamped to `maxDate` if it falls inside |
| `year` | `{kind: 'year', year: 2026}` | The calendar year, clamped likewise |
| `custom` | `{kind: 'custom', start: '2026-08-10', end: '2026-08-20'}` | Exactly those dates |

Preset and relative selections re-resolve as the anchor date moves, and carry an optional
`offset` when stepped back from their natural range - see Stepping. Month and year selections
name a fixed period, though one containing `maxDate` is clamped to it. Custom selections name
fixed dates. All are plain JSON, so the value round-trips through persistence without custom
serialization.

### Presets

Built-in presets live in `dateRangePresets`, keyed by token. Offer any subset in any order via
the `presets` config.

| Token | Resolves to | Label |
|-------|-------------|-------|
| `anchorDay` | The anchor date itself | `Today` when the anchor is the current day, else `As Of` |
| `prevDay` | The day before the anchor - the previous business day in `businessDayMode` | `Prev Day` |
| `wtd`, `mtd`, `qtd`, `ytd` | Start of the unit containing the anchor, through the anchor | `MTD`, ... |
| `prev7Days`, `prev30Days`, `prev90Days` | Rolling window ending on the anchor | `Prev 7 Days`, ... |
| `prev3Months`, `prev6Months`, `prev12Months` | Rolling window ending on the anchor | `Prev 3 Months`, ... |
| `prevWeek`, `prevMonth`, `prevQuarter`, `prevYear` | The full unit before the one containing the anchor | The period: `Aug 2026`, `Q2 2026`, `2025` |
| `all` | `minDate` (or unbounded) through `maxDate` | `All` |

`DEFAULT_DATE_RANGE_PRESETS` is `anchorDay`, `mtd`, `qtd`, `ytd`, `prev7Days`, `prev30Days`,
`prev90Days`, `prev12Months`, `prevMonth`, and `prevYear`.

Labels say "Prev" rather than "Last" because the anchor date need not be today: "Prev 7 Days" is
true whatever the anchor is, where "Last 7 Days" quietly claims the window ends now. Only
`anchorDay` reads differently by context, and when it reads `As Of` the picker shows its date
wherever the label would otherwise stand alone.

An app-defined preset is a `DateRangePreset`: a unique `token`, a `label` (string or function of
the context), an optional longer `name` for its row in the picker, a `resolve` function, an
optional `resolvePrior`, and an optional `shiftedLabel` for the preset once stepped back (see
Stepping). The default prior is the preceding range of equal length in days.

```typescript
const FISCAL_YTD: DateRangePreset = {
    token: 'fytd',
    label: 'FYTD',
    name: 'Fiscal Year to Date',
    resolve: ({anchorDate}) => ({start: fiscalYearStart(anchorDate), end: anchorDate}),
    resolvePrior: ({start, end}) => ({
        start: start.subtract(1, 'years'),
        end: end.subtract(1, 'years')
    })
};

new DateRangePickerModel({presets: [FISCAL_YTD, 'qtd', 'ytd', 'prev90Days']});
```

### Relative Lookbacks

A relative selection is `count` units ending on the anchor date. Units are `days`, `weeks`,
`months`, `quarters`, and `years`.

- **Rolling** (`snap: false`, the default) is exactly `count` units back from the anchor: 3 months
  ending Sep 2 starts Jun 3.
- **Calendar** (`snap: true`) aligns to unit boundaries and counts the current partial unit as one:
  3 calendar months ending Sep 2 starts Jul 1. Snap does not apply to days and is normalized to
  `false` for that unit.

### Prior Ranges

`priorRange` is the comparable range immediately before `currentRange`, for period-over-period
comparison. It is `null` when the current range is unbounded.

| Selection | Prior range |
|-----------|-------------|
| Period-to-date presets (`mtd`, `ytd`, ...) | The same span one unit earlier: MTD on the 12th compares against the 1st through 12th of last month |
| Previous-unit presets (`prevMonth`, ...) | The unit before that |
| Lookbacks in weeks, months, quarters, or years | The same span `count` units earlier, matching the equivalent presets |
| Lookbacks in days, and `custom` | The preceding window of equal length in days |
| Single days in `businessDayMode` | The previous business day |
| `month`, `year` | The previous month or year, clamped the same way if the current one is |

The same logic drives stepping, so the prior period is always one step back. An app that wants
the prior MTD as the *selected* value can set `{kind: 'preset', token: 'mtd', offset: -1}`.

### Filters

With `filterField` configured, `currentRangeFilter` and `priorRangeFilter` return
`FieldFilterSpec[]`: a `>=` filter for a bounded start and a `<=` filter for a bounded end. An
unbounded edge produces no filter, so the `all` preset with no `minDate` yields a single `<=`
filter. Pass the array anywhere a `FilterLike` is accepted, or send it to the server as part of a
query body. `getRangeFilter(range, field)` builds filters for any range and field.

### Stepping

`stepRange(steps)` moves the applied range by one period per step: `-1` for the previous period,
`1` for the next. No selection changes kind:

- **Preset and relative** selections adjust their `offset`, stepping through their own prior-range
  logic - a lookback in months steps by months, MTD steps to the prior MTD, a single day steps by
  business day in `businessDayMode`. The offset is zero or negative, since the natural range
  already ends on the anchor date, and is omitted from the value when zero. A stepped selection
  is still live: `mtd` at offset `-1` becomes the new prior MTD when the month turns.
- **Month and year** selections step by calendar unit.
- **Custom** selections step by their length in days, or by business day when a single day in
  `businessDayMode`.

Steps clamp to `minDate` and `maxDate`. `canStepBack` and `canStepForward` drive the component's
step buttons, and the trigger's left and right arrow keys.

Once stepped, the trigger's dates locate the range, so the label describes only its shape: a
rolling window reads as its length (`7 Days`, `3 Months`), a previous-unit preset as the period it
now covers (`Jul 2026`), and a to-date preset as its name with the offset (`MTD −1`) - its length
is set by the calendar, not the selection, so a length alone would mislead. App-defined presets
control this via `shiftedLabel`; the default appends the offset.

### Anchor Day and Bounds

`anchorDay` determines the date that relative and to-date selections resolve against, exposed as
`anchorDate`. It is live by default: the model re-evaluates it every few seconds, and everything
derived from it - ranges, labels, filters, step enablement - follows the day over as midnight
passes, with no app code.

| `anchorDay` | Anchor date |
|-------------|-------------|
| `'localDay'` (default) | The current day in the browser's time zone, kept current |
| `'appDay'` | The current day in the app's time zone (`LocalDate.currentAppDay()`), kept current |
| A `LocalDate` | That day, pinned. Never moves, never snapped |
| `() => LocalDate` | Re-evaluated every few seconds and whenever observables it reads change. Must be pure and cheap |

The function form covers as-of dates with their own rule. A desk whose day rolls to the next
business day at an evening cutoff, for example:

```typescript
anchorDay: () => {
    const now = moment(),
        day = LocalDate.today(),
        afterCutoff = now.hour() >= 18;
    let ret = afterCutoff ? day.nextDay() : day;
    while (!ret.isWeekday) ret = ret.nextDay();
    return ret;
}
```

The `anchorDay` preset labels itself `Today` only when the anchor date is the current day (per
`today`, in the app or browser zone to match the mode). Otherwise it reads `As Of`, and the trigger
shows the date. So on the Friday evening above the picker reads `As Of | 2026-09-07` until Monday
morning, when it reads `Today`.

**`businessDayMode`** is for users who think in calendar-length windows but stand on business
days. It has two effects and no others: a live `anchorDay` (`'localDay'` or `'appDay'`) snaps back
to the most recent business day per `isBusinessDay`, and single-day selections step by business
day. Seven days is still seven days, and a month is still a month. A pinned or computed
`anchorDay` is honored verbatim - a month-end that falls on a Sunday stays the 31st.

Nothing beyond `maxDate` is selectable: later months and days are disabled in the popover, and
month and year selections spanning `maxDate` are clamped to it, which is how the current year
reads as YTD. `maxDate` defaults to `anchorDate`. Set it later to allow future dates, or set
`minDate` to bound the past.

### Persistence

Pass `persistWith` to persist the value under `dateRangePicker.value` by default. Set `path` to
disambiguate multiple pickers sharing one provider, or `persistValue: false` to skip persistence
while keeping the options for future aspects.

```typescript
new DateRangePickerModel({
    persistWith: {viewManagerModel: this.viewManagerModel, path: 'detailPeriod'}
});
```

A persisted value that is missing or fails validation - a preset since removed, for example -
falls back to `defaultValue` rather than carrying a previous value over.

### Labels

| Property | Example | Use |
|----------|---------|-----|
| `label` | `MTD`, `Prev 6 Months`, `Aug 2026`, `Custom` | The trigger |
| `rangeLabel` | `2026-08-01 ▸ 2026-09-02` | The trigger's dates, per `dateFormat`. A single day reads as one date. |
| `displayName` | `MTD`, `August 2026`, the dates for a custom range or `As Of` | Panel titles - the label, with months spelled out and unnamed periods as their dates |

## DateRangePicker

The desktop component. It finds its `DateRangePickerModel` via context lookup or an explicit
`model` prop, and supports Hoist layout props. `DateRangePickerProps` is small: `showStepButtons`
adds previous and next buttons wired to `stepRange()`, `styleButtonAsInput` (default true) matches
the trigger to `GroupingChooser`'s input styling or renders an outlined button, `intent` re-keys
the popover's selection accent, and `buttonProps`, `footerNote`, `popoverPosition`, and
`showRange` tune the rest.

### Tabs and Committing

Preset and month/year picks apply on click and close the popover. Relative and custom picks are
drafts until Apply, and Cancel, Escape, or a click outside discards them. With `commitOnChange`,
drafts apply as they change and Apply and Cancel are omitted.

A model configured with one tab renders without the rail, and its popover shrinks to fit.

### The Trigger

A trigger sized by its content never truncates. A stretched trigger (`flex: 1`, or an explicit
`width`) measures itself and drops the dates when it is too narrow to show them, leaving the
period label alone. Whenever the dates are not shown, a custom range - and the anchor day when it
reads `As Of` - shows its dates in place of the uninformative label. The full label and dates
remain available in the trigger's tooltip. With the trigger focused, the left and right arrow keys
step the period.

### Styling

Block classes are `xh-date-range-picker` (the control: trigger and step buttons) and
`xh-date-range-picker-popover`. The picker's own colors and key sizes come from
`--xh-date-range-picker-*` variables, declared in the `Date Range Picker` block of
`styles/vars.scss`, each with an unprefixed override hook. The ones an app is most likely to set:

```scss
body.xh-app {
  --date-range-picker-popover-width: 720px;                 // default 640px
  --date-range-picker-accent: var(--xh-intent-success);     // selection accent, default primary
  --date-range-picker-date-font-family: var(--xh-font-family);  // default the mono font
}
```

## Common Patterns

### Compare Against the Prior Period

```typescript
get stats() {
    const {currentRangeFilter, priorRangeFilter, priorRange} = this.periodModel;
    return {
        current: this.sumMatching(currentRangeFilter),
        prior: priorRange ? this.sumMatching(priorRangeFilter) : null
    };
}
```

### Query the Server by Period

```typescript
@computed
get query() {
    const {start, end} = this.periodModel.currentRange;
    return {startDay: start, endDay: end, ...otherParams};
}
```

Keep unbounded presets such as `all` out of the configured `presets` if the endpoint requires
both dates, or handle a `null` edge in the query.

### A Month Picker

```typescript
new DateRangePickerModel({
    tabs: ['monthYear'],
    initialValue: {kind: 'month', year: 2026, month: 1}
});
```

### A Business-Day Desk

```typescript
new DateRangePickerModel({
    anchorDay: 'appDay',
    businessDayMode: true,
    isBusinessDay: d => d.isWeekday && !XH.holidayService.isHoliday(d),
    presets: ['anchorDay', 'prevDay', 'wtd', 'mtd', 'qtd', 'ytd', 'prevMonth']
});
```

On a Saturday this resolves everything as of Friday, and the step buttons walk `anchorDay` from
Friday to Thursday and back.

## Common Pitfalls

- **`filterField` is required for filters.** The filter getters throw without it. Use
  `currentRange` directly when the app builds its own query.
- **Invalid values are ignored, not thrown.** `setValue()` logs a warning and keeps the current
  value. Check `validateValue()` first when the input is untrusted.
- **Presets are per model.** A persisted preset token that is not in the model's `presets` fails
  validation and falls back to the default. Keep the configured list stable across versions, or
  accept that users will see the default after a change.
- **`all` can be unbounded.** Without `minDate`, its start is `null`, `priorRange` is `null`, and
  `currentRangeFilter` has one entry.
- **A computed `anchorDay` runs often.** It is re-evaluated every few seconds. Keep it to clock
  reads and observable reads - derive anything expensive once, store it on an observable, and read
  that.

## Related Packages

- [`/data/`](../../data/README.md) - `FieldFilterSpec` and applying filters to Stores
- [`/cmp/viewmanager/`](../viewmanager/README.md) - persisting the value within saved views
- [`/cmp/grouping/`](../grouping/GroupingChooserModel.ts) and [`/cmp/filter/`](../filter/FilterChooserModel.ts) -
  sibling chooser models with the same popover-and-model pattern
- [`/utils/`](../../utils/README.md) - `LocalDate` and `Timer`
