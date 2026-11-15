# Sparkline

## Overview

`Sparkline` is a small inline chart of a trend, with no axes, labels or legend. Use it for the
line beside a key figure, or for a trend cell in each row of a grid.

- Draws a `line`, an `area` or a `bar` series from a plain array of numbers.
- Renders plain SVG with no charting library. A plain line is four DOM elements, which keeps it
  light enough for a cell in every row of a grid.
- Colors the series by `intent`, by the direction of its trend, or with any CSS color.
- Marks the last, lowest and highest values, and draws a reference line at a `baseline`.
- Tolerates partial data. A gap, a single value or an empty series never throws.

Use `Chart` (`@xh/hoist/cmp/chart`) when a reader must take exact values from the chart. A
sparkline shows shape and direction only.

## Common Usage Patterns

### A Basic Sparkline

```typescript
import {sparkline} from '@xh/hoist/cmp/sparkline';

sparkline({values: [101, 103, 102, 106, 109, 107, 113, 118]})
```

With only `values`, the component draws a line in a neutral color at 80 by 24 pixels. It renders
inline, like a `Badge`, and has no outer margin.

```typescript
// Green if the series ends above its start, red if below, with a dot on the last value.
sparkline({values, colorByTrend: true, showLast: true})

// A filled line in the primary intent color.
sparkline({values, type: 'area', intent: 'primary'})

// Daily P&L as bars, with losses below a zero line in the negative value color.
sparkline({values: dailyPnl, type: 'bar', colorNegative: true, baseline: 0})
```

### Sizing

The default size comes from the `--xh-sparkline-width` and `--xh-sparkline-height` CSS variables.
Pass layout props to size one sparkline:

```typescript
sparkline({values, width: 120, height: 32})

// Stretch to the container. The line keeps its thickness and the dots stay round.
sparkline({values, width: '100%', height: 40})
hbox(span('Volume'), sparkline({values, flex: 1}))
```

### In a StatCard

Pass a sparkline as the `detail` of a `StatCard` to draw the trend under the figure. Set
`width: '100%'` so that it spans the card.

```typescript
import {sparkline} from '@xh/hoist/cmp/sparkline';
import {statCard} from '@xh/hoist/cmp/statcard';
import {fmtNumber} from '@xh/hoist/format';

statCard({
    title: 'Orders',
    value: fmtNumber(orders, {precision: 0}),
    detail: sparkline({
        values: ordersByDay,
        type: 'area',
        width: '100%',
        label: 'Orders per day, last 30 days'
    })
})
```

For a small trend on the value line, pass it as `subValue` at its default size:

```typescript
statCard({
    title: 'Revenue',
    value: fmtMillions(revenue, {precision: 1, label: true}),
    subValue: sparkline({values: revenueByMonth, colorByTrend: true, showLast: true})
})
```

### In a Grid Column

Return a sparkline from the `renderer` of a column. In this example the `history` field of each
record holds an array of numbers.

```typescript
import {sparkline} from '@xh/hoist/cmp/sparkline';

columns: [
    {field: 'symbol'},
    {
        field: 'history',
        headerName: 'Trend',
        width: 110,
        autosizable: false,
        sortable: false,
        excludeFromExport: true,
        renderer: values => sparkline({values, width: '100%', colorByTrend: true})
    }
]
```

- **`renderer`, not `textRenderer`** - a sparkline is a React element, so the column needs a
  `renderer`.
- **`rendererIsComplex`** - leave it off when the renderer reads only the column's own field, as
  above. Set it to `true` when the renderer reads other fields of the record, such as a baseline.
- **Width** - give the column a `width` and set `autosizable: false`. A sparkline at
  `width: '100%'` fills the column, so it has no width of its own to autosize to.
- **Height** - the default height of 24 pixels fits a row in the `standard` and `large` sizing
  modes. Pass a smaller `height`, such as 14, for a `compact` or `tiny` grid.
- **Sort and export** - an array has no useful sort order or export value. Turn them off, or set
  the `sortValue` and `exportValue` of the column to a number, such as the last value.

### One Scale for Several Sparklines

Each sparkline scales to its own lowest and highest value by default, so two sparklines with
different ranges look the same height. Set `min` and `max` to draw several on one scale:

```typescript
const all = records.flatMap(rec => rec.data.history),
    min = Math.min(...all),
    max = Math.max(...all);

renderer: values => sparkline({values, min, max, width: '100%'})
```

A value outside a fixed scale draws at the nearer edge.

### Gaps and Partial Data

| Series | Result |
|--------|--------|
| A null, undefined or NaN entry | A gap. A line breaks there, and a bar leaves its space empty |
| One usable value | A centered dot for `line` and `area`, one bar for `bar` |
| Every value the same | A line across the middle of the box |
| An empty or missing array | An empty box of the same size |

## Properties Reference

| Property | Type | Description |
|----------|------|-------------|
| `values` | `number[]` | The series to draw, in order. Required |
| `type` | `'line' \| 'area' \| 'bar'` | Shape of the series. Default `line` |
| `intent` | `Intent` | Semantic color for the series. Default is a neutral color |
| `colorByTrend` | `boolean` | Colors the series by its last value against its first. Ignored when `intent` is set |
| `colorNegative` | `boolean` | Draws bars below zero, or below `baseline`, in the negative value color. `bar` only |
| `showLast` | `boolean` | Marks the last value with a dot. `line` and `area` only |
| `showMinMax` | `boolean` | Marks the lowest and highest values with a dot each. `line` and `area` only |
| `baseline` | `number` | Value to draw a dashed reference line at. Bars grow from it |
| `min`, `max` | `number` | Fixed bounds of the scale. Default is the range of the series |
| `label` | `string` | Accessible name. Default is a summary such as "Trend: 12 points, from 101 to 118" |
| `tooltip` | `boolean \| string` | Shows the label, or the given string, as a native tooltip. Default false |

The component also takes layout props, `className`, `testId` and `domAttrs`.

### Bars and the Scale

Bars grow from zero, and the scale always takes zero in. A series far from zero therefore draws
bars of almost equal height. Set `min` to cut the scale off, or `baseline` to grow the bars from
another value:

```typescript
// Bars from the bottom of the box, on a scale that starts at 100.
sparkline({values: [101, 106, 104, 118], type: 'bar', min: 100})

// Bars above and below the prior close.
sparkline({values: prices, type: 'bar', baseline: priorClose, colorNegative: true})
```

## Styling

Set these CSS variables to restyle all sparklines, or those under one selector. An app sets them
without the `xh-` prefix, for example `--sparkline-height: 20px`.

| Variable | Sets |
|----------|------|
| `--xh-sparkline-width`, `--xh-sparkline-height` | Default size |
| `--xh-sparkline-color` | Neutral series color |
| `--xh-sparkline-line-width` | Thickness of the line |
| `--xh-sparkline-area-opacity` | Opacity of the fill under an `area` |
| `--xh-sparkline-dot-size` | Diameter of the dots |
| `--xh-sparkline-baseline-color` | Color of the `baseline` line |
| `--xh-sparkline-positive-color`, `--xh-sparkline-negative-color` | Trend, highest and lowest value, and negative bar colors |
| `--xh-sparkline-primary-color`, `-success-color`, `-warning-color`, `-danger-color` | Intent colors |
| `--xh-sparkline-padding` | Space between the box and the plot, which keeps a dot on the edge in view |

Every shape draws in the CSS `color` of the component. To give one sparkline a color of its own,
set `color` through a class:

```typescript
sparkline({values, className: 'my-app-volume-trend'})
```

```scss
.my-app-volume-trend {
  color: var(--xh-orange);
}
```

## Accessibility

The component has the `img` role and an `aria-label`. A screen reader reads the label in place of
the chart. The default label gives the count of values with the first and the last, and does not
format numbers. Pass a `label` that names the metric and rounds its values:

```typescript
sparkline({values, label: `Revenue by month, from ${fmtMillions(first)} to ${fmtMillions(last)}`})
```

A sparkline shows color and shape only. Show the figure itself as text next to it.

## Related Packages

- `/cmp/statcard/` - StatCard, a tile for a key figure that can hold a sparkline
- [`/cmp/grid/`](../grid/README.md) - Grid columns and renderers
- `/cmp/chart/` - Chart, for full charts with axes, tooltips and legends
