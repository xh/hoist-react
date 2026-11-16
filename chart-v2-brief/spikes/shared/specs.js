/* eslint-disable */
// The shared, library-neutral chart specs. Pure JSON - no functions - so a human, a saved
// report or an LLM agent can author any of them. Each adapter maps a spec to its library's
// native config. This is a prototype of the persisted state in findings/09-proposed-api.md.
window.CS = window.CS || {};

CS.specs = {
    // (1) Multi-series NAV, navigator, range selector, rebased to % change from range start.
    navRebase: {
        kind: 'timeSeries',
        title: 'Flagship Fund vs. benchmarks',
        source: 'navs',
        timeField: 'date',
        calendar: 'trading',
        navigator: true,
        rangeSelector: {
            buttons: ['1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'All'],
            selected: '3Y'
        },
        compare: {mode: 'percent', base: 'visibleStart'},
        legend: {position: 'top'},
        tooltip: {mode: 'shared'},
        crosshair: {enabled: true},
        panes: [{id: 'main'}],
        axes: [
            {
                id: 'y1',
                pane: 'main',
                side: 'right',
                format: {type: 'percent', precision: 1, signed: true}
            }
        ],
        series: [
            {
                id: 'fund',
                field: 'FUND',
                name: 'Flagship Fund',
                type: 'line',
                axis: 'y1',
                lineWidth: 2.5
            },
            {id: 'spx', field: 'SPX', name: 'S&P 500 TR', type: 'line', axis: 'y1'},
            {id: 'msci', field: 'MSCIW', name: 'MSCI World', type: 'line', axis: 'y1'},
            {id: 'b6040', field: 'B6040', name: '60/40 Blend', type: 'line', axis: 'y1'}
        ]
    },

    // (2) Candlestick with a volume pane and moving-average overlays.
    candles: {
        kind: 'timeSeries',
        title: 'XYZ Corp - daily',
        source: 'ohlc',
        timeField: 'date',
        calendar: 'trading',
        navigator: true,
        rangeSelector: {buttons: ['1M', '3M', '6M', '1Y', 'All'], selected: '6M'},
        legend: {position: 'top'},
        tooltip: {mode: 'shared'},
        crosshair: {enabled: true},
        panes: [
            {id: 'price', size: 0.72},
            {id: 'volume', size: 0.28}
        ],
        axes: [
            {id: 'px', pane: 'price', side: 'right', format: {type: 'number', precision: 2}},
            {
                id: 'vol',
                pane: 'volume',
                side: 'right',
                format: {type: 'number', precision: 0, compact: true}
            }
        ],
        series: [
            {
                id: 'xyz',
                name: 'XYZ',
                type: 'candlestick',
                fields: {open: 'open', high: 'high', low: 'low', close: 'close'},
                axis: 'px'
            },
            {
                id: 'sma20',
                name: 'SMA 20',
                type: 'line',
                derive: {fn: 'sma', field: 'close', period: 20},
                axis: 'px'
            },
            {
                id: 'sma50',
                name: 'SMA 50',
                type: 'line',
                derive: {fn: 'sma', field: 'close', period: 50},
                axis: 'px'
            },
            {
                id: 'volume',
                name: 'Volume',
                type: 'column',
                field: 'volume',
                axis: 'vol',
                colorBy: 'direction'
            }
        ]
    },

    // (3) Two stacked panes - cumulative return over drawdown - sharing one time axis and crosshair.
    perfDrawdown: {
        kind: 'timeSeries',
        title: 'Flagship Fund - cumulative return and drawdown',
        source: 'navs',
        timeField: 'date',
        calendar: 'trading',
        navigator: false,
        rangeSelector: {buttons: ['1Y', '3Y', '5Y', 'All'], selected: 'All'},
        legend: {position: 'top'},
        tooltip: {mode: 'shared'},
        crosshair: {enabled: true, syncGroup: 'perf'},
        panes: [
            {id: 'ret', size: 0.62},
            {id: 'dd', size: 0.38}
        ],
        axes: [
            {id: 'cum', pane: 'ret', side: 'right', format: {type: 'percent', precision: 0}},
            {
                id: 'ddAxis',
                pane: 'dd',
                side: 'right',
                max: 0,
                format: {type: 'percent', precision: 0}
            }
        ],
        series: [
            {
                id: 'cum',
                name: 'Fund cumulative return',
                field: 'FUND',
                transform: 'cumReturn',
                type: 'area',
                axis: 'cum'
            },
            {
                id: 'cumSpx',
                name: 'S&P 500 TR',
                field: 'SPX',
                transform: 'cumReturn',
                type: 'line',
                axis: 'cum'
            },
            {
                id: 'dd',
                name: 'Fund drawdown',
                field: 'FUND',
                transform: 'drawdown',
                type: 'area',
                axis: 'ddAxis',
                color: 'negative'
            }
        ],
        events: [
            {date: '2020-03-23', label: 'COVID low'},
            {date: '2022-10-12', label: '2022 low'}
        ],
        bands: [{from: '2020-02-20', to: '2020-03-23', label: 'Crash', axis: 'time'}]
    },

    // (4) Stress test: 4 series x 250k one-minute points (1M points total).
    stress: {
        kind: 'timeSeries',
        title: 'Stress test - 4 series x 250,000 points',
        source: 'stress',
        sourceOptions: {seriesCount: 4, points: 250000},
        timeField: 't',
        calendar: 'continuous',
        navigator: true,
        legend: {position: 'top'},
        tooltip: {mode: 'shared'},
        crosshair: {enabled: true},
        performance: {mode: 'auto'},
        panes: [{id: 'main'}],
        axes: [{id: 'y1', pane: 'main', side: 'right', format: {type: 'number', precision: 2}}],
        series: [
            {id: 's1', field: 's1', name: 'Series 1', type: 'line', axis: 'y1'},
            {id: 's2', field: 's2', name: 'Series 2', type: 'line', axis: 'y1'},
            {id: 's3', field: 's3', name: 'Series 3', type: 'line', axis: 'y1'},
            {id: 's4', field: 's4', name: 'Series 4', type: 'line', axis: 'y1'}
        ]
    },

    // (5) Correlation heatmap with a diverging scale.
    corrHeatmap: {
        kind: 'heatmap',
        title: 'Cross-asset correlation (3Y daily)',
        source: 'corr',
        x: {field: 'x'},
        y: {field: 'y'},
        value: {field: 'value', format: {type: 'number', precision: 2}},
        colorScale: {type: 'diverging', min: -1, mid: 0, max: 1},
        cellLabels: true,
        legend: {position: 'right'}
    },

    // (6) Returns distribution histogram with a fitted normal curve and VaR marker.
    returnsHist: {
        kind: 'distribution',
        title: 'Flagship Fund - daily return distribution',
        source: 'navs',
        field: 'FUND',
        transform: 'returns',
        bins: {count: 60},
        overlay: {fn: 'normal', name: 'Normal fit'},
        markers: [{quantile: 0.05, label: 'VaR 95%'}],
        xFormat: {type: 'percent', precision: 1},
        legend: {position: 'top'}
    },

    // (7) Far end of the spectrum: sankey of capital allocation.
    flowsSankey: {
        kind: 'flow',
        type: 'sankey',
        title: 'Capital allocation by strategy and region ($mm)',
        source: 'flows',
        fromField: 'from',
        toField: 'to',
        valueField: 'value',
        valueFormat: {type: 'number', precision: 0}
    }
};

CS.chartList = [
    {id: 'navRebase', label: '1 - NAV, navigator, rebasing', group: 'Time series'},
    {id: 'candles', label: '2 - Candlestick + volume + SMA', group: 'Time series'},
    {id: 'perfDrawdown', label: '3 - Return over drawdown', group: 'Time series'},
    {id: 'stress', label: '4 - Stress: 1M points', group: 'Time series'},
    {id: 'corrHeatmap', label: '5 - Correlation heatmap', group: 'Breadth'},
    {id: 'returnsHist', label: '6 - Returns histogram', group: 'Breadth'},
    {id: 'flowsSankey', label: '7 - Sankey', group: 'Breadth'}
];

/** Parse a spec date string ('2020-03-23') to UTC ms. */
CS.parseDate = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));

/** Resolve a range-selector token to a [min, max] window ending at `max`. */
CS.rangeWindow = (token, min, max) => {
    const d = new Date(max),
        y = d.getUTCFullYear(),
        m = d.getUTCMonth(),
        day = d.getUTCDate();
    const back = {
        '1M': Date.UTC(y, m - 1, day),
        '3M': Date.UTC(y, m - 3, day),
        '6M': Date.UTC(y, m - 6, day),
        YTD: Date.UTC(y, 0, 1),
        '1Y': Date.UTC(y - 1, m, day),
        '3Y': Date.UTC(y - 3, m, day),
        '5Y': Date.UTC(y - 5, m, day),
        All: min
    }[token];
    return [Math.max(min, back ?? min), max];
};
