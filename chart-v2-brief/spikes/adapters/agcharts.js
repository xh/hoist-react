/* eslint-disable */
// AG Charts Enterprise 14 adapter: maps a shared CS spec to native AgCharts options.
// Uses the standard AgCharts.create() API for every chart. AgCharts.createFinancialChart() was
// evaluated for the candlestick spec but rejects extra `series` and `legend` options, so it
// cannot carry the SMA overlays - see notes/spike-agcharts.md.
CS.adapters = CS.adapters || {};

(function () {
    const {AgCharts} = agCharts,
        PANE_GAP = 4; // percent of plot height between stacked panes

    //------------------
    // Theme + formats
    //------------------
    function themeOptions(t) {
        return {
            baseTheme: t.name === 'dark' ? 'ag-default-dark' : 'ag-default',
            palette: {
                fills: t.series,
                strokes: t.series,
                up: {fill: t.up, stroke: t.up},
                down: {fill: t.down, stroke: t.down}
            },
            params: {
                backgroundColor: t.bg,
                foregroundColor: t.text,
                textColor: t.text,
                subtleTextColor: t.textMuted,
                accentColor: t.accent,
                fontFamily: t.fontFamily,
                fontSize: t.fontSize,
                gridLineColor: t.grid,
                axisLineColor: t.border,
                borderColor: t.border,
                tooltipBackgroundColor: t.tooltipBg,
                tooltipTextColor: t.text,
                crosshairLabelBackgroundColor: t.border,
                crosshairLabelTextColor: t.text
            },
            overrides: {common: {title: {fontSize: 13, fontWeight: 600}}}
        };
    }

    const fmtFn = f => v => CS.fmt.apply(v, f || {});

    // Animation off: financial UIs rarely want it, and it would run past the harness timings.
    const baseOptions = (spec, el, theme) => ({
        container: el,
        theme: themeOptions(theme),
        title: {text: spec.title},
        animation: {enabled: false}
    });

    function handleFor(chart, notes) {
        return {
            instance: chart,
            notes,
            ready: chart.waitForUpdate(),
            destroy: () => chart.destroy()
        };
    }

    //------------------
    // Time series
    //------------------
    const MONTHS = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
    ];

    // Axis tick labels, in UTC (AG formats dates in browser local time, with no UTC switch). Ordinal-
    // time ticks fall on arbitrary data points rather than period starts, so a 'year' tick at
    // 18-Nov-2019 is labelled 'Nov 2019' here instead of AG's misleading '2019'.
    function axisDate(ms, unit) {
        const d = new Date(ms),
            mon = MONTHS[d.getUTCMonth()];
        if (unit === 'year' || unit === 'month') return `${mon} ${d.getUTCFullYear()}`;
        if (unit === 'day' || unit === 'week') return `${d.getUTCDate()} ${mon}`;
        return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    }

    // Spec range-selector token -> AG range button value (a fn of the full data extent).
    const rangeButton = token => ({
        label: token,
        value: ({start, end}) => CS.rangeWindow(token, +start, +end)
    });

    // Stacked panes: AG has no documented pane API. Its own Financial Chart preset stacks the
    // volume axis with the undocumented axis option `layoutConstraints` - we use the same.
    // Only start / center / end alignment exists, so at most 3 panes can be placed.
    function paneConstraints(panes) {
        if (panes.length < 2) return {};
        const usable = 100 - PANE_GAP * (panes.length - 1),
            aligns = panes.length === 2 ? ['start', 'end'] : ['start', 'center', 'end'];
        return Object.fromEntries(
            panes.map((p, i) => [
                p.id,
                {
                    stacked: false,
                    unit: 'percent',
                    align: aligns[i],
                    width: usable * (p.size ?? 1 / panes.length)
                }
            ])
        );
    }

    function lowerBound(xs, v) {
        let lo = 0,
            hi = xs.length - 1;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            xs[mid] < v ? (lo = mid + 1) : (hi = mid);
        }
        return lo;
    }

    // Row-shaped data (AG Charts takes an array of objects) plus per-series raw value arrays.
    function buildRows(spec) {
        const src = CS.data.get(spec.source, spec.sourceOptions);
        if (src.columnar) {
            const {t} = src,
                ids = spec.series.map(s => s.id),
                cols = spec.series.map(
                    s => src.series[src.fields.findIndex(f => f.name === s.field) - 1]
                ),
                rows = new Array(t.length);
            for (let i = 0; i < t.length; i++) {
                const r = {x: t[i]};
                for (let j = 0; j < ids.length; j++) r[ids[j]] = cols[j][i];
                rows[i] = r;
            }
            return {xs: t, rows, raw: {}};
        }
        const xs = src.rows.map(r => r[spec.timeField]),
            rows = xs.map(x => ({x})),
            raw = {};
        spec.series.forEach(s => {
            if (s.fields) {
                Object.entries(s.fields).forEach(([k, f]) =>
                    src.rows.forEach((r, i) => (rows[i][`${s.id}_${k}`] = r[f]))
                );
            } else {
                raw[s.id] = CS.transforms.seriesXY(spec, s).y;
                raw[s.id].forEach((v, i) => (rows[i][s.id] = v));
            }
            if (s.colorBy === 'direction') {
                // Up/down by bar direction (close vs open) when the source has OHLC, else vs prior value.
                src.rows.forEach(
                    (r, i) =>
                        (rows[i][s.id + '_up'] =
                            r.open != null
                                ? r.close >= r.open
                                : i === 0 || raw[s.id][i] >= raw[s.id][i - 1])
                );
            }
        });
        return {xs, rows, raw};
    }

    function seriesOptions(s, src, color, theme) {
        const base = {
                id: s.id,
                xKey: 'x',
                yKeyAxis: s.axis,
                xName: 'Date',
                highlight: {unhighlightedSeries: {opacity: 1}}
            },
            stroke = s.color === 'negative' ? theme.negative : color;
        switch (s.type) {
            case 'candlestick':
            case 'ohlc': {
                const keys = Object.fromEntries(
                        Object.entries(s.fields).flatMap(([k, f]) => [
                            [k + 'Key', `${s.id}_${k}`],
                            [k + 'Name', CS.data.field(src, f).label]
                        ])
                    ),
                    up = {fill: theme.up, stroke: theme.up},
                    down = {fill: theme.down, stroke: theme.down};
                return {...base, ...keys, type: s.type, yName: s.name, item: {up, down}};
            }
            case 'column':
                return {
                    ...base,
                    type: 'bar',
                    yKey: s.id,
                    yName: s.name,
                    fill: color,
                    itemStyler:
                        s.colorBy === 'direction'
                            ? ({datum}) => ({
                                  fill: datum[s.id + '_up'] ? theme.up : theme.down,
                                  fillOpacity: 0.7
                              })
                            : undefined
                };
            case 'area':
                return {
                    ...base,
                    type: 'area',
                    yKey: s.id,
                    yName: s.name,
                    stroke,
                    fill: stroke,
                    fillOpacity: 0.22,
                    strokeWidth: s.lineWidth ?? 1.5,
                    marker: {enabled: false}
                };
            default:
                return {
                    ...base,
                    type: 'line',
                    yKey: s.id,
                    yName: s.name,
                    stroke,
                    strokeWidth: s.lineWidth ?? 1.5,
                    marker: {enabled: false}
                };
        }
    }

    function timeSeries(spec, el, theme) {
        const {xs, rows, raw} = buildRows(spec),
            src = CS.data.get(spec.source, spec.sourceOptions),
            intraday = src.columnar && src.pointInterval < 864e5,
            seriesFmt = Object.fromEntries(
                spec.series.map(s => [s.id, spec.axes.find(a => a.id === s.axis)?.format])
            ),
            constraints = paneConstraints(spec.panes),
            multiPane = spec.panes.length > 1,
            crosshair = !!spec.crosshair?.enabled,
            compare = spec.compare?.mode === 'percent',
            large = xs.length > 50000,
            colors = [...theme.series],
            notes = [];

        // Events + bands as x-axis cross lines (they span every pane).
        const crossLines = [
            ...(spec.bands || []).map(b => ({
                type: 'range',
                range: [
                    xs[lowerBound(xs, CS.parseDate(b.from))],
                    xs[lowerBound(xs, CS.parseDate(b.to))]
                ],
                fill: theme.accent,
                fillOpacity: 0.15,
                strokeWidth: 0,
                label: {text: b.label, placement: 'inside-bottom', color: theme.textMuted}
            })),
            ...(spec.events || []).map(e => ({
                type: 'line',
                value: xs[lowerBound(xs, CS.parseDate(e.date))], // ordinal-time needs an existing x value
                stroke: theme.textMuted,
                lineDash: [4, 3],
                label: {text: e.label, placement: 'top', color: theme.text}
            }))
        ];

        const axes = {
            x: {
                type: spec.calendar === 'trading' ? 'ordinal-time' : 'time',
                position: 'bottom',
                ...(spec.calendar === 'trading' ? {} : {nice: false}), // ordinal-time rejects `nice`
                crossLines,
                crosshair: {
                    enabled: crosshair,
                    label: {formatter: ({value}) => CS.fmt.date(+value, {intraday})}
                },
                label: {autoRotate: false}
            }
        };
        spec.axes.forEach(a => {
            const fmt = fmtFn(a.format);
            axes[a.id] = {
                type: 'number',
                position: a.side || 'left',
                min: a.min,
                max: a.max,
                label: {formatter: ({value}) => fmt(value)},
                crosshair: {enabled: crosshair, label: {formatter: ({value}) => fmt(value)}},
                // `nice` pads stacked pane axes far beyond the data (and ignores `max`), so turn it
                // off and ask for denser ticks instead.
                ...(multiPane
                    ? {
                          nice: false,
                          interval: {minSpacing: 20, maxSpacing: 60},
                          layoutConstraints: constraints[a.pane]
                      }
                    : {}),
                // Zoom auto-scaling shares ONE y ratio across all y axes, so lower panes opt out
                // via the undocumented `ignoreZoom`.
                ...(multiPane && a.pane !== spec.panes[0].id ? {ignoreZoom: true} : {})
            };
        });

        const opts = {
            ...baseOptions(spec, el, theme),
            data: rows,
            series: spec.series.map(s => ({
                ...seriesOptions(s, src, s.type === 'candlestick' ? null : colors.shift(), theme),
                showInMiniChart: spec.axes.find(a => a.id === s.axis)?.pane === spec.panes[0].id
            })),
            axes,
            legend: {enabled: !!spec.legend, position: spec.legend?.position || 'top'},
            tooltip: {mode: spec.tooltip?.mode === 'shared' ? 'shared' : 'single'},
            // One global formatter: tooltip numbers use the series' axis format, dates use Hoist fmt.
            formatter: p => {
                if (p.type === 'date')
                    return p.source === 'axis-label'
                        ? axisDate(+p.value, p.unit)
                        : CS.fmt.date(+p.value, {intraday});
                if (p.type === 'number' && p.source === 'tooltip')
                    return fmtFn(seriesFmt[p.seriesId])(p.value);
            },
            zoom: {
                enabled: true,
                anchorPointX: 'pointer',
                enableSelecting: true,
                minVisibleItems: 5
            },
            navigator: {enabled: !!spec.navigator, miniChart: {enabled: !!spec.navigator}}
        };

        if (spec.rangeSelector) {
            opts.ranges = {
                enabled: true,
                position: 'top-left',
                buttons: spec.rangeSelector.buttons.map(rangeButton)
            };
            const [start, end] = CS.rangeWindow(
                spec.rangeSelector.selected,
                xs[0],
                xs[xs.length - 1]
            );
            opts.initialState = {zoom: {rangeX: {start, end}}};
        }

        // Rebase to % change from the first visible point. AG has no compare/percent mode, so the
        // data is recomputed in the chart `zoom` listener (wheel, drag, navigator, range buttons).
        let chart, baseIdx;
        const rebase = startMs => {
            const idx = lowerBound(xs, startMs);
            if (idx === baseIdx) return null;
            baseIdx = idx;
            return rows.map((r, i) => {
                const out = {...r};
                for (const id in raw) out[id] = raw[id][i] / raw[id][idx] - 1;
                return out;
            });
        };
        if (compare) {
            opts.data = rebase(opts.initialState?.zoom.rangeX.start ?? xs[0]);
            opts.listeners = {
                zoom: e => {
                    const data = e.source !== 'data-update' && rebase(+e.rangeX.start);
                    if (data) chart.updateDelta({data});
                }
            };
        }

        chart = AgCharts.create(opts);

        const native = [
            'ordinal-time' === axes.x.type && 'ordinal-time axis (no weekend/holiday gaps)',
            spec.navigator && 'navigator',
            spec.rangeSelector && 'range buttons',
            'wheel/drag zoom',
            crosshair && 'crosshair',
            'shared tooltip'
        ];
        notes.push('Native: ' + native.filter(Boolean).join(', ') + '.');
        if (compare)
            notes.push(
                'Rebasing is custom: zoom event -> recompute % change from first visible point -> chart.updateDelta({data}).'
            );
        if (spec.rangeSelector)
            notes.push(
                'Range buttons show no selected state; the initial range is set via initialState.zoom.rangeX.'
            );
        if (multiPane)
            notes.push(
                "Panes: one chart, y axes stacked with UNDOCUMENTED layoutConstraints + ignoreZoom (as AG's own Financial Chart does). Max 3 panes." +
                    (spec.crosshair?.syncGroup
                        ? ' syncGroup not needed (native sync.groupId exists for multi-chart).'
                        : '')
            );
        if (spec.events || spec.bands)
            notes.push(
                'Events and bands: native x-axis crossLines (line + range), spanning all panes.'
            );
        if (spec.series.some(s => s.colorBy === 'direction'))
            notes.push(
                'Volume up/down colors: itemStyler callback reading a precomputed direction flag. createFinancialChart() rejects extra series (no SMA), so not used.'
            );
        if (large)
            notes.push(
                'Large data: no option needed - AG applies M4 aggregation itself. Columnar source copied to row objects (~20 ms for 250k).'
            );
        notes.push(
            'Axis dates: custom UTC formatter - AG formats dates in local time only' +
                (axes.x.type === 'ordinal-time'
                    ? ', and ordinal-time ticks are not period-aligned.'
                    : '.')
        );
        return {chart, notes};
    }

    //------------------
    // Breadth
    //------------------
    // Linear sRGB interpolation over evenly spaced hex stops. AG's own colorScale blend drifts
    // through green between a warm grey midpoint and blue, so we hand it dense pre-mixed stops.
    function divergingScale(colors, min, max) {
        const rgb = colors.map(c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)));
        return v => {
            const f = Math.max(0, Math.min(1, (v - min) / (max - min))) * (rgb.length - 1),
                i = Math.min(rgb.length - 2, Math.floor(f)),
                c = rgb[i].map((x, k) => Math.round(x + (rgb[i + 1][k] - x) * (f - i)));
            return {
                hex: '#' + c.map(x => x.toString(16).padStart(2, '0')).join(''),
                lum: (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255
            };
        };
    }

    function heatmap(spec, el, theme) {
        const src = CS.data.get(spec.source),
            {min, max} = spec.colorScale,
            scale = divergingScale(theme.diverging, min, max), // spec mid assumed centred, as in the theme
            fmt = fmtFn(spec.value.format),
            vKey = spec.value.field,
            cats = src.categories || [...new Set(src.rows.map(r => r[spec.x.field]))],
            rows = [...src.rows].sort(
                (a, b) =>
                    cats.indexOf(a[spec.x.field]) - cats.indexOf(b[spec.x.field]) ||
                    cats.indexOf(a[spec.y.field]) - cats.indexOf(b[spec.y.field])
            );
        const chart = AgCharts.create({
            ...baseOptions(spec, el, theme),
            data: rows,
            series: [
                {
                    type: 'heatmap',
                    xKey: spec.x.field,
                    yKey: spec.y.field,
                    colorKey: vKey,
                    colorName: CS.data.field(src, vKey).label,
                    colorScale: {
                        domain: [min, max],
                        fills: Array.from({length: 21}, (_, i) => ({
                            color: scale(min + ((max - min) * i) / 20).hex,
                            stop: min + ((max - min) * i) / 20
                        }))
                    },
                    label: {
                        enabled: !!spec.cellLabels,
                        formatter: ({datum}) => fmt(datum[vKey]),
                        itemStyler: ({datum}) => ({
                            color: scale(datum[vKey]).lum < 0.5 ? '#ffffff' : '#1a1a1a'
                        })
                    },
                    stroke: theme.bg,
                    strokeWidth: 1
                }
            ],
            axes: {
                x: {type: 'category', position: 'bottom', label: {rotation: -45}},
                y: {type: 'category', position: 'left'} // first category renders at the top
            },
            formatter: p => (p.type === 'number' ? fmt(p.value) : undefined),
            gradientLegend: {enabled: !!spec.legend, position: spec.legend?.position || 'right'}
        });
        return handleFor(chart, [
            'Native heatmap series + gradient legend. Category order = data order, so rows are sorted to source.categories.',
            'Custom: AG blends colorScale stops through green (warm-grey mid to blue), so 21 sRGB-mixed stops are passed.',
            'Custom: cell label contrast via label.itemStyler (no auto-contrast for heatmap labels).'
        ]);
    }

    function distribution(spec, el, theme) {
        const src = CS.data.get(spec.source),
            values = CS.transforms[spec.transform](src.rows.map(r => r[spec.field])).filter(
                v => v != null
            ),
            bins = CS.transforms.histogram(values, spec.bins),
            curve = spec.overlay
                ? CS.transforms.normalCurve(values, bins).map(([x, y]) => ({x, y}))
                : [],
            fmt = fmtFn(spec.xFormat),
            markers = (spec.markers || []).map(m => ({
                m,
                q: CS.transforms.quantile(values, m.quantile)
            }));
        const chart = AgCharts.create({
            ...baseOptions(spec, el, theme),
            series: [
                {
                    type: 'histogram',
                    data: values.map(v => ({v})),
                    xKey: 'v',
                    xName: CS.data.field(src, spec.field).label + ' return',
                    yName: 'Days',
                    bins: bins.map(b => [b.x0, b.x1]),
                    fill: theme.series[0],
                    fillOpacity: 0.8,
                    stroke: theme.bg
                },
                ...(spec.overlay
                    ? [
                          {
                              type: 'line',
                              data: curve,
                              xKey: 'x',
                              yKey: 'y',
                              yName: spec.overlay.name,
                              stroke: theme.series[1],
                              strokeWidth: 2,
                              marker: {enabled: false}
                          }
                      ]
                    : [])
            ],
            axes: {
                x: {
                    type: 'number',
                    position: 'bottom',
                    label: {formatter: ({value}) => fmt(value)},
                    crossLines: markers.map(({m, q}) => ({
                        type: 'line',
                        value: q,
                        stroke: theme.down,
                        lineDash: [5, 3],
                        label: {text: `${m.label}: ${fmt(q)}`, placement: 'top', color: theme.down}
                    }))
                },
                y: {type: 'number', position: 'left'}
            },
            formatter: p =>
                p.property === 'x' && p.type === 'number'
                    ? fmt(p.value)
                    : p.type === 'number'
                      ? CS.fmt.number(p.value, {precision: 0})
                      : undefined,
            legend: {enabled: !!spec.legend, position: spec.legend?.position || 'top'}
        });
        return handleFor(chart, [
            `Native histogram series with explicit bins (${bins.length}) from CS.transforms.histogram; native binCount is documented as approximate.`,
            'Normal fit: plain line series with its own data on the same number axes.',
            'VaR marker: native x-axis crossLine at the 5% quantile (quantile computed in CS.transforms).'
        ]);
    }

    function flow(spec, el, theme) {
        const src = CS.data.get(spec.source),
            fmt = fmtFn(spec.valueFormat);
        const chart = AgCharts.create({
            ...baseOptions(spec, el, theme),
            data: src.rows,
            series: [
                {
                    type: 'sankey',
                    fromKey: spec.fromField,
                    toKey: spec.toField,
                    sizeKey: spec.valueField,
                    sizeName: CS.data.field(src, spec.valueField).label,
                    fills: theme.series,
                    strokes: theme.series,
                    link: {fillOpacity: 0.35},
                    label: {color: theme.text}
                }
            ],
            formatter: p => (p.type === 'number' ? fmt(p.value) : undefined)
        });
        return handleFor(chart, [
            'Native sankey series (fromKey/toKey/sizeKey) - no custom code.',
            'Nodes in each column render in reverse data order (AG layout); no node sort option used.'
        ]);
    }

    //------------------
    // Entry points
    //------------------
    function render(spec, el, theme) {
        if (spec.kind === 'heatmap') return heatmap(spec, el, theme);
        if (spec.kind === 'distribution') return distribution(spec, el, theme);
        if (spec.kind === 'flow')
            return spec.type === 'sankey'
                ? flow(spec, el, theme)
                : {gap: `Flow type ${spec.type} not mapped`};
        if (spec.kind !== 'timeSeries') return {gap: `Unknown kind ${spec.kind}`};
        const {chart, notes} = timeSeries(spec, el, theme);
        return handleFor(chart, notes);
    }

    // Programmatic zoom via the Chart State API; resolves once AG reports the update is drawn.
    async function zoomTo(handle, min, max) {
        const chart = handle.instance;
        await chart.setState({version: agCharts.VERSION, zoom: {rangeX: {start: min, end: max}}}); // version is required
        await chart.waitForUpdate();
    }

    CS.adapters.agcharts = {
        key: 'agcharts',
        label: 'AG Charts Enterprise',
        version: () => agCharts.VERSION,
        render,
        zoomTo
    };
})();
