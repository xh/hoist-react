# Sparkline Package

> **Status: DRAFT** - This document is awaiting review by an XH developer. Content may be
> incomplete or inaccurate. Do not remove this banner until a human reviewer approves the doc.

## Overview

`Sparkline` is a small inline chart of a trend, with no axes, labels or legend: the line beside a
key figure, or the trend cell in each row of a grid. It draws plain SVG with no charting library
and takes no model. The props and their defaults are documented in `Sparkline.ts`.

A sparkline shows only the shape of a series, but it is cheap enough to render in every row of a
grid. It has a fixed scope, listed under [Scope](#scope). For anything outside that scope, use a
`Chart` or the AG Grid sparkline, as described in
[Sparkline, Chart or AG Grid Sparkline](#sparkline-chart-or-ag-grid-sparkline).

## Scope

`Sparkline` draws one series as a static shape. It is small by design, and the items under "Out
of scope" are not planned. A need for one of them is a need for a `Chart` or the AG Grid
sparkline.

In scope:

- One series of numbers, drawn as a `line`, an `area` or a `bar` series.
- Points spaced evenly by index. A gap in the data leaves its space empty.
- Color by `intent` or by trend, dots on the first, last, lowest and highest values, and a
  `baseline`.
- A fixed scale through `min` and `max`, so that the rows of a grid compare.
- One tooltip for the whole sparkline.

Out of scope:

- A tooltip or highlight for each point, or any other response to the pointer.
- An x-axis, or points at uneven intervals, such as dates with gaps between them.
- More than one series, a legend, axis labels or data labels.
- Zoom, animation, or click handlers on points.

## Sparkline, Chart or AG Grid Sparkline

| Need | Use |
|------|-----|
| A trend beside a figure, such as in a `StatCard` | `Sparkline` |
| A trend in each row of a grid, styled with Hoist CSS variables | `Sparkline` |
| A tooltip for each point, or a time axis, in a grid cell | AG Grid sparkline |
| Exact values, axes, a legend or more than one series | `Chart` - see the [Chart section](../README.md#chart-chart) |

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
sparkline({data, colorByTrend: true, markers: ['last']})

// Daily P&L as bars, with losses below a zero line in the negative value color
sparkline({data: dailyPnl, type: 'bar', colorNegative: true, baseline: 0})
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

## Styling

Set the `--xh-sparkline-*` variables on `body.xh-app` to change the default size, line width and
colors. The full set is in the `Sparklines` block of [`styles/vars.scss`](../../styles/vars.scss).
Every shape draws in the CSS `color` of the component, so a class that sets `color` gives one
sparkline a color of its own.

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
- **`intent` wins over `colorByTrend`.** Set one or the other.
- **Bars grow from zero by default.** The scale takes zero in, so a bar series far from zero draws
  bars of almost equal height. Set `baseline` or `min` to change that.
- **The accessible name does not format numbers.** It reads, for example, "Trend: 12 points, from
  101 to 118". Pass an `aria-label` through `domAttrs` to name the metric and round its values.

## Related Packages

- [`/cmp/`](../README.md) - `Chart`, `StatCard` and the component catalog
- [`/cmp/grid/`](../grid/README.md) - column renderers
