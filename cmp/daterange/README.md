# Date Range Package

## Overview

The `/cmp/daterange/` package provides `DateRangePickerModel`, a model for selecting a period of
time and reading it back as concrete dates and filters. Its desktop UI, `DateRangePicker` in
`/desktop/cmp/daterange/`, is a compact toolbar control: one trigger button showing the applied
period and its dates, opening a popover with a tab for each way of choosing a period.

**Key features:**
- One value that can express a preset (MTD, Last 30 Days, ...), a relative lookback, a calendar
  month or year, or a custom range of dates
- Resolution against an anchor date, so a persisted "month to date" stays month to date
- A comparable prior range for every selection, for period-over-period comparisons
- Ready-made `FieldFilterSpec`s for filtering a Store, Cube View, or server query
- Built-in presets, app-defined presets, and business-day-aware lookbacks
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
├── anchorDate, minDate, maxDate       # The dates selections resolve against
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
    └── setAnchorDate(), setMaxDate(), setPresets(), setTabs(), ...

DateRangeSelection (plain JSON, discriminated on `kind`)
├── {kind: 'preset', token}
├── {kind: 'relative', count, unit, snap}
├── {kind: 'month', year, month}
├── {kind: 'year', year}
└── {kind: 'custom', start, end}       # 'YYYY-MM-DD' strings

DateRangeContext                       # What selections resolve against
├── anchorDate, minDate, maxDate
├── isBusinessDay(date)
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
- `anchorDate`, `minDate`, and `maxDate` set the dates everything resolves against - see Anchor
  Date and Bounds below.
- `filterField` names the field for `currentRangeFilter` and `priorRangeFilter`.
- `initialValue` is the starting selection, given as a selection object or a preset token, and
  the fallback for missing or invalid persisted state. It defaults to the first configured preset,
  or a rolling 30 days when there are none.
- `persistWith` persists the value - see Persistence below.

`commitOnChange`, `dateFormat`, and `isBusinessDay` round out the config; the first two can be
defaulted app-wide via `DateRangePickerModel.defaults`.

### The Selection Value

`value` is always a normalized `DateRangeSelection`. Set it with `setValue()`, which accepts a
selection object or a bare preset token and ignores (with a logged warning) anything that fails
validation: an unknown preset, an out-of-range count or year, or a malformed date.

| Kind | Shape | Resolves to |
|------|-------|-------------|
| `preset` | `{kind: 'preset', token: 'mtd'}` | Whatever the preset's resolver returns for the current context |
| `relative` | `{kind: 'relative', count: 6, unit: 'months', snap: false}` | A window of `count` units ending on the anchor date |
| `month` | `{kind: 'month', year: 2026, month: 8}` | The calendar month, clamped to `maxDate` if it falls inside |
| `year` | `{kind: 'year', year: 2026}` | The calendar year, clamped likewise |
| `custom` | `{kind: 'custom', start: '2026-08-10', end: '2026-08-20'}` | Exactly those dates |

Preset and relative selections re-resolve as the anchor date moves. Month and year selections
name a fixed period, though one containing `maxDate` is clamped to it. Custom selections name
fixed dates. All are plain JSON, so the value round-trips through persistence without custom
serialization.

### Presets

Built-in presets live in `dateRangePresets`, keyed by token. Offer any subset in any order via
the `presets` config.

| Token | Resolves to |
|-------|-------------|
| `today`, `yesterday` | That single day |
| `wtd`, `mtd`, `qtd`, `ytd` | Start of the unit containing the anchor, through the anchor |
| `last7Days`, `last30Days`, `last90Days` | Rolling window ending on the anchor |
| `last3Months`, `last6Months`, `last12Months` | Rolling window ending on the anchor |
| `lastWeek`, `lastMonth`, `lastQuarter`, `lastYear` | The full unit before the one containing the anchor |
| `lastBusinessDay` | The nearest business day before the anchor |
| `priorMtd`, `priorQtd`, `priorYtd` | The same elapsed span one unit earlier |
| `all` | `minDate` (or unbounded) through `maxDate` |

`DEFAULT_DATE_RANGE_PRESETS` is `today`, `mtd`, `qtd`, `ytd`, `last7Days`, `last30Days`,
`last90Days`, `last12Months`, `lastMonth`, and `lastYear`.

Presets that name a specific period label as that period - `lastMonth` reads `Aug 2026`,
`lastYear` reads `2025` - so the trigger describes the same period the same way however it was
chosen.

An app-defined preset is a `DateRangePreset`: a unique `token`, a `label` (string or function of
the context), an optional longer `name` for its row in the picker, a `resolve` function, and an
optional `resolvePrior`. The default prior is the preceding range of equal length in days.

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

new DateRangePickerModel({presets: [FISCAL_YTD, 'qtd', 'ytd', 'last90Days']});
```

### Relative Lookbacks

A relative selection is `count` units ending on the anchor date. Units are `days`,
`businessDays`, `weeks`, `months`, `quarters`, and `years`.

- **Rolling** (`snap: false`, the default) is exactly `count` units back from the anchor: 3 months
  ending Sep 2 starts Jun 3.
- **Calendar** (`snap: true`) aligns to unit boundaries and counts the current partial unit as one:
  3 calendar months ending Sep 2 starts Jul 1.
- **Business days** count only days that pass `isBusinessDay`. The window still ends on the anchor
  even when that is a weekend, so 2 business days ending on a Saturday spans Thursday through
  Saturday. Snap does not apply to either day unit and is normalized to `false`.

### Prior Ranges

`priorRange` is the comparable range immediately before `currentRange`, for period-over-period
comparison. It is `null` when the current range is unbounded.

| Selection | Prior range |
|-----------|-------------|
| Period-to-date presets (`mtd`, `ytd`, ...) | The same span one unit earlier: MTD on the 12th compares against the 1st through 12th of last month |
| Previous-unit presets (`lastMonth`, ...) | The unit before that |
| Lookbacks in weeks, months, quarters, or years | The same span `count` units earlier, matching the equivalent presets |
| Lookbacks in days, and `custom` | The preceding window of equal length in days |
| `businessDays` lookbacks | The preceding window with the same number of business days |
| `month`, `year` | The previous month or year, clamped the same way if the current one is |

Apps that want the prior period as the *selected* value, rather than as a comparison, can offer
the `priorMtd`, `priorQtd`, and `priorYtd` presets.

### Filters

With `filterField` configured, `currentRangeFilter` and `priorRangeFilter` return
`FieldFilterSpec[]`: a `>=` filter for a bounded start and a `<=` filter for a bounded end. An
unbounded edge produces no filter, so the `all` preset with no `minDate` yields a single `<=`
filter. Pass the array anywhere a `FilterLike` is accepted, or send it to the server as part of a
query body. `getRangeFilter(range, field)` builds filters for any range and field.

### Stepping

`stepRange(steps)` moves the applied range by its own length: `-1` for the previous period, `1`
for the next. Month and year selections keep their kind and step by calendar unit. Every other
selection becomes a `custom` selection of the shifted dates, since they are now fixed. Steps clamp
to `minDate` and `maxDate`. `canStepBack` and `canStepForward` drive the component's step buttons.

### Anchor Date and Bounds

`anchorDate` defaults to today in the browser's time zone, as of construction. Pass a function to
track an observable source, such as the as-of date of the data on display. For long-lived screens
that must roll over at midnight, update it explicitly. This example anchors to the app time zone;
pass `anchorDate: LocalDate.currentAppDay()` in the config to match from the start.

```typescript
Timer.create({
    runFn: () => model.setAnchorDate(LocalDate.currentAppDay()),
    interval: ONE_MINUTE
});
```

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
| `label` | `MTD`, `Last 6 Months`, `Aug 2026`, `Custom` | The trigger |
| `rangeLabel` | `2026-08-01 ▸ 2026-09-02` | The trigger's dates, per `dateFormat`. A single day reads as one date. |
| `displayName` | `MTD`, `August 2026`, the dates for a custom range | Panel titles - the label, with months spelled out and custom ranges as their dates |

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
period label alone. Whenever the dates are not shown, a custom range shows its dates in place of
the uninformative `Custom` label. The full label and dates remain available in the trigger's
tooltip.

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

## Related Packages

- [`/data/`](../../data/README.md) - `FieldFilterSpec` and applying filters to Stores
- [`/cmp/viewmanager/`](../viewmanager/README.md) - persisting the value within saved views
- [`/cmp/grouping/`](../grouping/GroupingChooserModel.ts) and [`/cmp/filter/`](../filter/FilterChooserModel.ts) -
  sibling chooser models with the same popover-and-model pattern
- [`/utils/`](../../utils/README.md) - `LocalDate` and `Timer`
