# Sparkline Package

> **Status: DRAFT** - This document is awaiting review by an XH developer. Content may be
> incomplete or inaccurate. Do not remove this banner until a human reviewer approves the doc.

## Overview

`Sparkline` is a small inline chart of a trend, with no axes, labels or legend: the line beside a
key figure, or the trend cell in each row of a grid. It draws plain SVG with no charting library
and takes no model. The props and their defaults are documented in `Sparkline.ts`.

A sparkline shows only the shape of a series, but it is cheap enough to render in every row of a
grid. It has a fixed scope, listed under [Scope](#scope), which also sets it apart from `Chart`.
For a grid cell that needs more, see
[Sparkline or AG Grid Sparkline](#sparkline-or-ag-grid-sparkline).

## Scope

`Sparkline` answers one question at a glance: which way did this number move, and how steadily?
The reader takes in its shape, not its values. That limit is deliberate, and it is what keeps a
sparkline cheap enough for every row of a grid.

`Chart` is Hoist's full charting component. It wraps Highcharts and is driven by a `ChartModel`,
with axes, legends, many series and chart types, and a tooltip for each point. If the reader must
read a value off the chart, compare series, or interact with points, use a `Chart`. See the
[Chart section](../README.md#chart-chart) of the components README.

`Sparkline` will not grow toward `Chart`. The items under "Out of scope" are not planned. When a
need goes past the "In scope" list, switch to a `Chart` or the AG Grid sparkline. Do not add a
prop to `Sparkline`.

| | `Sparkline` | `Chart` |
|-|-------------|---------|
| Purpose | The shape of one trend, at a glance | Values a reader studies and compares |
| Rendering | Plain SVG, no library | Highcharts |
| State | Props only, no model | A `ChartModel` |
| Size | Inline, as small as a grid cell | A panel or a large area |
| Pointer | One tooltip for the whole sparkline | Per-point tooltips, zoom and more, through Highcharts |

In scope:

- One series of numbers, drawn as a `line`, an `area` or a `bar` series.
- Points spaced evenly by index. A gap in the data leaves its space empty.
- Color by `intent`, by trend or by the sign of each part, chosen with `colorBy`. Dots on the
  first, last, lowest and highest values, and a `baseline`.
- With `colorBy: 'sign'`, the parts of a series above and below zero or the `baseline` in the
  positive and negative colors, with an area filled to that line, for a series of profit and loss.
- A fixed scale through `min` and `max`, so that the rows of a grid compare.
- One tooltip for the whole sparkline, as text or an element. See [Tooltip](#tooltip).

Out of scope, with what to use instead:

- A tooltip or highlight for each point. Use a `Chart`, or the AG Grid sparkline in a grid cell.
- Any response to the pointer beyond the one tooltip, such as zoom or click handlers on points.
  Use a `Chart`.
- An x-axis, or points at uneven intervals, such as dates with gaps between them. Use a `Chart`,
  or the AG Grid sparkline's time axis in a grid cell.
- More than one series, a legend, axis labels or data labels. Use a `Chart`.
- Animation. Use a `Chart`.

## Sparkline or AG Grid Sparkline

Both draw a trend in a grid cell. [Scope](#scope) covers when a need calls for a `Chart` instead.

| Need in a grid cell | Use |
|---------------------|-----|
| A trend styled with Hoist CSS variables, with no extra dependencies | `Sparkline` |
| A tooltip for each point, or a time axis | AG Grid sparkline |

AG Grid has its own sparkline, the `agSparklineCellRenderer`. It renders in a grid cell only, and
it needs AG Grid Enterprise and the `ag-charts-community` package. The app registers
`SparklinesModule.with(AgChartsCommunityModule)` from `ag-grid-enterprise`, then sets the renderer
on a column through `agOptions`. It draws each cell with AG Charts, and it takes its colors from an
AG Charts theme, not from Hoist CSS variables.

```typescript
{
    field: {name: 'closingPrices', type: 'json'},
    sortable: false,
    autosizable: false,
    width: 100,
    agOptions: {
        cellRenderer: 'agSparklineCellRenderer',
        cellRendererParams: {
            // Data as [date, price] pairs, placed on a time axis, with a tooltip for each point
            sparklineOptions: {
                axis: {type: 'time'},
                tooltip: {
                    renderer: ({xValue, yValue}) => ({
                        title: fmtDate(xValue),
                        content: fmtNumber(yValue)
                    })
                }
            }
        }
    }
}
```

## Usage

```typescript
import {sparkline} from '@xh/hoist/cmp/sparkline';

// A line in a neutral color, at the default size of 80 by 24 pixels
sparkline({data: [101, 103, 102, 106, 109, 107, 113, 118]})

// Green if the series ends above its start, red if below, with a dot on the last value
sparkline({data, colorBy: 'trend', markers: ['last']})

// Daily P&L as bars, gains above a zero line and losses below it, in the value colors
sparkline({data: dailyPnl, type: 'bar', colorBy: 'sign', baseline: 0})

// Running P&L as an area filled to zero, split into the same colors where it crosses
sparkline({data: runningPnl, type: 'area', colorBy: 'sign', baseline: 0})
```

The component renders inline with no outer margin. With `width: '100%'` or `flex: 1` it
stretches to its container, and the line keeps its thickness.

### In a StatCard

Pass a sparkline as the `detail` of a `StatCard`, at the width of the card:

```typescript
statCard({
    title: 'Orders',
    value: fmtNumber(orders, {precision: 0}),
    detail: sparkline({data: ordersByDay, type: 'area', width: '100%'})
})
```

### In a Grid Column

Return a sparkline from the `renderer` of a column. Set the same `min` and `max` on every row, so
that the reader can compare the rows. By default each sparkline scales to its own range.

```typescript
{
    field: 'returns',
    headerName: 'Daily Returns',
    width: 110,
    autosizable: false,
    sortable: false,
    excludeFromExport: true,
    renderer: data => sparkline({data, width: '100%', type: 'bar', min: -5, max: 5, baseline: 0})
}
```

- The column needs a `renderer`, not a `textRenderer`, because a sparkline is an element.
- Give the column a `width` and set `autosizable: false`. A sparkline at `width: '100%'` has no
  width of its own to autosize to.
- An array has no useful sort order or export value. Turn both off, or give the column a
  `sortValue` and an `exportValue` function that returns a number, such as the last value.
- The default height fits a `standard` or `large` grid. Pass a smaller `height`, such as 14, in
  a `compact` or `tiny` grid.

### Tooltip

Set `tooltip` to text, an element, or a function that builds either from the data. The tooltip
covers the whole sparkline, not one point.

```typescript
sparkline({data, tooltip: 'Daily orders, last 30 days'})
```

In a grid column, pass a function. It gets only the data, so close over the row for anything
else:

```typescript
renderer: (data, {record}) =>
    sparkline({
        data,
        width: '100%',
        tooltip: d =>
            div(
                strong(record.data.symbol),
                div(`${fmtNumber(first(d))} to ${fmtNumber(last(d))}`)
            )
    })
```

On desktop the tooltip shows in a Hoist `Tooltip`. No tooltip mounts until the user first rests
the pointer on a sparkline, and a function runs only from then on. A sparkline with a tooltip
renders the same DOM as one without until then, so a tooltip on a grid column costs nothing in rows
the user does not hover.

## Styling

Set the `--xh-sparkline-*` variables on `body.xh-app` to change the default size, line width and
colors. The full set is in the `Sparklines` block of [`styles/vars.scss`](../../styles/vars.scss).
Every shape draws in the CSS `color` of the component, so a class that sets `color` gives one
sparkline a color of its own. Set `--xh-sparkline-area-color` to fill an area in a color other
than its line's. It then ignores `intent` and `colorBy`, which still color the line.

```scss
body.xh-app {
  --xh-sparkline-width: 100px;
  --xh-sparkline-line-width: 1px;
  --xh-sparkline-color: var(--xh-intent-primary);
}
```

## Common Pitfalls

- **The data is not observed.** Pass a new array to redraw. A change to an array in place does
  not redraw the sparkline.
- **Bars grow from zero by default.** The scale takes zero in, so a bar series far from zero draws
  bars of almost equal height. Set `baseline` or `min` to change that.
- **The tooltip shows on desktop only.** Mobile has no hover, so a sparkline there shows no
  tooltip, as with the `StatCard` info tooltip.
- **The accessible name does not format numbers.** It reads, for example, "Trend: 12 points, from
  101 to 118". Pass an `aria-label` through `domAttrs` to name the metric and round its values.

## Related Packages

- [`/cmp/`](../README.md) - `Chart`, `StatCard` and the component catalog
- [`/cmp/grid/`](../grid/README.md) - column renderers
