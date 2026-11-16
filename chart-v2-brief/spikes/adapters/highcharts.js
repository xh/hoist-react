/* eslint-disable */
// Highcharts adapter: shared chart spec -> Highcharts Stock 13 config.
// Time series use Highcharts.stockChart (navigator, rangeSelector, ordinal axis, compare,
// indicators, flags, boost). Breadth charts use Highcharts.chart.
CS.adapters = CS.adapters || {};

(function () {
    const H = window.Highcharts,
        fmt = (v, f) => CS.fmt.apply(v, f || {}),
        tokenColor = (c, theme) => (c && theme[c]) || c;

    // ---------- theme: Hoist tokens -> Highcharts options ----------
    function themeOptions(theme) {
        const axis = {
            gridLineColor: theme.grid,
            lineColor: theme.border,
            tickColor: theme.border,
            labels: {style: {color: theme.textMuted, fontSize: '10px'}},
            title: {style: {color: theme.text}}
        };
        return {
            // Highcharts 13 palette: drives the CSS variables most default colors resolve to.
            palette: {
                colorScheme: theme.name,
                colors: theme.series,
                [theme.name]: {
                    backgroundColor: theme.bg,
                    neutralColor: theme.text,
                    highlightColor: theme.accent,
                    positiveColor: theme.up,
                    negativeColor: theme.down
                }
            },
            // Plain hex series colors, so series.color is a real value in callbacks and exports.
            colors: theme.series,
            chart: {
                backgroundColor: theme.bg,
                style: {fontFamily: theme.fontFamily, fontSize: theme.fontSize + 'px'},
                spacing: [8, 8, 8, 8]
            },
            title: {align: 'left', style: {color: theme.text, fontSize: '13px', fontWeight: '600'}},
            credits: {enabled: false},
            accessibility: {enabled: false},
            xAxis: axis,
            yAxis: H.merge(axis, {gridLineWidth: 1}),
            legend: {
                itemStyle: {color: theme.text, fontWeight: 'normal', fontSize: '11px'},
                itemHoverStyle: {color: theme.accent},
                itemHiddenStyle: {color: theme.textMuted}
            },
            tooltip: {
                backgroundColor: theme.tooltipBg,
                borderColor: theme.border,
                style: {color: theme.text, fontSize: '11px'}
            },
            // Initial series animation off so render timings and screenshots show the final frame.
            plotOptions: {
                series: {
                    animation: false,
                    dataLabels: {
                        style: {color: theme.text, textOutline: 'none', fontWeight: 'normal'}
                    }
                }
            },
            navigator: {
                maskFill: theme.navigatorMask,
                outlineColor: theme.border,
                handles: {backgroundColor: theme.altBg, borderColor: theme.textMuted},
                series: {color: theme.accent, lineColor: theme.accent, fillOpacity: 0.12},
                xAxis: {gridLineColor: theme.grid, labels: {style: {color: theme.textMuted}}}
            },
            scrollbar: {enabled: false},
            rangeSelector: {
                buttonTheme: {
                    fill: 'transparent',
                    stroke: theme.border,
                    'stroke-width': 1,
                    r: 3,
                    style: {color: theme.text, fontWeight: 'normal'},
                    states: {
                        hover: {fill: theme.altBg, style: {color: theme.accent}},
                        select: {
                            fill: 'transparent',
                            stroke: theme.accent,
                            style: {color: theme.accent, fontWeight: 'normal'}
                        },
                        disabled: {style: {color: theme.textMuted}}
                    }
                },
                inputBoxBorderColor: theme.border,
                inputStyle: {backgroundColor: theme.altBg, color: theme.text},
                labelStyle: {color: theme.textMuted}
            }
        };
    }

    function legendOptions(legend) {
        if (!legend) return {enabled: false};
        return legend.position === 'right'
            ? {enabled: true, align: 'right', verticalAlign: 'middle', layout: 'vertical'}
            : {
                  enabled: true,
                  align: legend.position === 'left' ? 'left' : 'center',
                  verticalAlign: legend.position === 'bottom' ? 'bottom' : 'top'
              };
    }

    function handleFor(chart, notes) {
        return {instance: chart, notes, destroy: () => chart.destroy()};
    }

    // ---------- time series ----------
    /** Range token ('3M', '1Y', 'YTD', 'All') -> native rangeSelector button. */
    function rangeButton(token) {
        if (token === 'YTD') return {type: 'ytd', text: token};
        if (token === 'All') return {type: 'all', text: token};
        return {
            type: token.endsWith('Y') ? 'year' : 'month',
            count: +token.slice(0, -1),
            text: token
        };
    }

    /** Source -> one chart-level DataTable. Rows become columns; derived series add columns. */
    function buildColumns(spec) {
        const src = CS.data.get(spec.source, spec.sourceOptions),
            columns = {};
        if (src.columnar) {
            columns[spec.timeField] = src.t;
            src.fields
                .filter(f => f.name !== spec.timeField)
                .forEach((f, i) => (columns[f.name] = src.series[i]));
        } else {
            src.fields.forEach(f => (columns[f.name] = src.rows.map(r => r[f.name])));
        }
        return {src, columns};
    }

    function paneLayout(panes, gapPct = 3) {
        let top = 0;
        return Object.fromEntries(
            panes.map((p, i) => {
                const size = (p.size ?? 1 / panes.length) * 100,
                    gap = i > 0 ? gapPct : 0,
                    out = [p.id, {top: top + gap + '%', height: size - gap + '%'}];
                top += size;
                return out;
            })
        );
    }

    function timeSeries(spec, el, theme) {
        const {src, columns} = buildColumns(spec),
            notes = [],
            layout = paneLayout(spec.panes),
            lastPane = spec.panes[spec.panes.length - 1].id,
            compare = spec.compare?.mode === 'percent',
            axisFmt = Object.fromEntries(spec.axes.map(a => [a.id, a.format])),
            // Series opt out of rebasing with excludeFromCompare (e.g. drawdown already in %).
            compared = s => compare && !s.excludeFromCompare,
            comparedAxes = new Set(spec.series.filter(compared).map(s => s.axis)),
            xs = columns[spec.timeField],
            intraday = xs[1] - xs[0] < CS.data.DAY,
            // Large data: 'auto' -> Stock dataGrouping (library downsampling); 'gpu' -> boost (WebGL, raw points).
            large = !!spec.performance && xs.length > 50000,
            boost = large && spec.performance.mode === 'gpu',
            group = large && !boost;

        const yAxis = spec.axes.map(a => ({
            id: a.id,
            ...layout[a.pane],
            opposite: a.side !== 'left',
            offset: 0,
            min: a.min,
            max: a.max,
            tickPixelInterval: 48,
            // Compare values arrive in percent units (5 = 5%), our formats expect fractions.
            labels: {
                align: 'left',
                x: 4,
                formatter: ctx =>
                    fmt(
                        comparedAxes.has(a.id) && a.format?.type === 'percent'
                            ? ctx.value / 100
                            : ctx.value,
                        a.format
                    )
            },
            // drag-panes module: user can resize stacked panes by dragging the boundary.
            resize: {
                enabled: spec.panes.length > 1 && a.pane !== lastPane,
                lineColor: theme.border,
                lineWidth: 1
            }
        }));

        const series = spec.series.map(s => {
            const base = {
                id: s.id,
                name: s.name,
                yAxis: s.axis,
                color: tokenColor(s.color, theme),
                lineWidth: s.lineWidth ?? 1.5
            };
            if (s.derive) {
                // Prefer a native technical indicator linked to the series that carries the input field.
                const parent = spec.series.find(
                    p =>
                        p.field === s.derive.field ||
                        (p.fields && Object.values(p.fields).includes(s.derive.field))
                );
                if (H.seriesTypes[s.derive.fn] && parent) {
                    const index = parent.fields
                        ? Object.values(parent.fields).indexOf(s.derive.field)
                        : 0;
                    return {
                        ...base,
                        type: s.derive.fn,
                        linkedTo: parent.id,
                        params: {period: s.derive.period, index},
                        showInLegend: true
                    };
                }
            }
            const mapping = {x: spec.timeField};
            if (s.fields) Object.assign(mapping, s.fields);
            else if (s.derive || s.transform) {
                columns['__' + s.id] = CS.transforms.seriesXY(spec, s).y;
                mapping.y = '__' + s.id;
            } else mapping.y = s.field;
            if (s.colorBy === 'direction') {
                const ohlc = spec.series.find(p => p.fields?.open && p.fields?.close).fields;
                columns['__' + s.id + 'Color'] = src.rows.map(r =>
                    r[ohlc.close] >= r[ohlc.open] ? theme.up : theme.down
                );
                mapping.color = '__' + s.id + 'Color';
            }
            return {
                ...base,
                type: s.type,
                // Boosted points lose their y values on hover when fed from a DataTable (13.1.1), so
                // boost gets plain y arrays on a regular interval instead.
                ...(!boost
                    ? {dataMapping: mapping}
                    : src.pointInterval
                      ? {
                            data: Array.from(columns[mapping.y]),
                            pointStart: src.pointStart,
                            pointInterval: src.pointInterval
                        }
                      : {data: xs.map((x, i) => [x, columns[mapping.y][i]])}),
                compare: compared(s) ? 'percent' : undefined,
                compareStart: compared(s) && spec.compare.base === 'visibleStart',
                ...(s.type === 'area' ? {fillOpacity: 0.18, threshold: 0} : {}),
                ...(s.type === 'candlestick'
                    ? {
                          color: theme.down,
                          lineColor: theme.down,
                          upColor: theme.up,
                          upLineColor: theme.up,
                          lineWidth: 1
                      }
                    : {}),
                ...(s.type === 'column' ? {borderWidth: 0, groupPadding: 0, pointPadding: 0.1} : {})
            };
        });

        if (spec.events?.length) {
            series.push({
                type: 'flags',
                name: 'Events',
                yAxis: spec.axes[0].id,
                showInLegend: false,
                shape: 'flag',
                color: theme.border,
                fillColor: theme.tooltipBg,
                style: {color: theme.text, fontWeight: 'normal'},
                y: -24,
                data: spec.events.map(e => ({
                    x: CS.parseDate(e.date),
                    title: e.label,
                    text: e.label
                }))
            });
        }

        const rs = spec.rangeSelector,
            plotBands = (spec.bands || [])
                .filter(b => b.axis === 'time')
                .map(b => ({
                    from: CS.parseDate(b.from),
                    to: CS.parseDate(b.to),
                    color: theme.navigatorMask,
                    label: {
                        text: b.label,
                        align: 'left',
                        textAlign: 'left',
                        x: 2,
                        y: 12,
                        style: {color: theme.textMuted, width: 'none', textOverflow: 'clip'}
                    }
                }));

        const options = H.merge(themeOptions(theme), {
            title: {text: spec.title},
            dataTable: boost ? undefined : {columns},
            legend: H.merge(legendOptions(spec.legend), {margin: 6, padding: 4}),
            navigator: {
                enabled: !!spec.navigator,
                height: 36,
                series: {type: 'line', dataGrouping: {enabled: group}}
            },
            rangeSelector: rs
                ? {
                      enabled: true,
                      buttons: rs.buttons.map(rangeButton),
                      selected: rs.buttons.indexOf(rs.selected),
                      buttonPosition: {x: 0}
                  }
                : {enabled: false},
            xAxis: {
                ordinal: spec.calendar === 'trading', // ordinal axis: no weekend/holiday gaps, still a datetime axis
                crosshair: spec.crosshair?.enabled
                    ? {color: theme.textMuted, dashStyle: 'Dash', width: 1}
                    : false,
                plotBands
            },
            yAxis,
            tooltip: {
                split: spec.tooltip?.mode !== 'shared',
                shared: spec.tooltip?.mode === 'shared',
                formatter() {
                    const rows = this.points
                        .filter(p => p.series.type !== 'flags')
                        .map(p => {
                            const f = axisFmt[p.series.yAxis.options.id],
                                val =
                                    p.open != null
                                        ? ['open', 'high', 'low', 'close']
                                              .map(k => k[0].toUpperCase() + ' ' + fmt(p[k], f))
                                              .join('  ')
                                        : fmt(
                                              p.series.options.compare && p.change != null
                                                  ? p.change / 100
                                                  : p.y,
                                              f
                                          );
                            return `<span style="color:${p.color}">\u25CF</span> ${p.series.name}: <b>${val}</b>`;
                        });
                    return [
                        `<span style="color:${theme.textMuted}">${CS.fmt.date(this.x, {intraday})}</span>`,
                        ...rows
                    ].join('<br/>');
                }
            },
            plotOptions: {
                series: {
                    // Stock groups (averages) dense data by default. Keep raw points unless the spec asks for performance.
                    dataGrouping: {enabled: group},
                    marker: {enabled: false},
                    states: {inactive: {enabled: false}},
                    boostThreshold: boost ? 1 : 0
                }
            },
            // usePreallocated: true draws every series from the first series' buffer (13.1.1), so leave it off.
            boost: {enabled: boost, useGPUTranslations: true, seriesThreshold: 1},
            series
        });

        const chart = H.stockChart(el, options),
            native = [];
        if (spec.calendar === 'trading') native.push('ordinal axis (trading calendar)');
        if (spec.panes.length > 1) native.push('stacked yAxis panes with drag-to-resize');
        if (compare) native.push('compare:percent + compareStart (re-bases on zoom/range)');
        if (spec.navigator) native.push('navigator');
        if (rs) native.push('rangeSelector');
        if (series.some(s => s.linkedTo)) native.push('SMA indicators');
        if (spec.events) native.push('flags');
        if (plotBands.length) native.push('plotBands');
        if (group)
            native.push(
                'dataGrouping (library downsampling, average per group; performance.mode "gpu" switches to boost)'
            );
        if (boost) native.push('boost (WebGL, all raw points)');
        notes.push('Native: ' + native.join(', ') + '.');
        if (spec.crosshair?.syncGroup)
            notes.push(
                `crosshair.syncGroup '${spec.crosshair.syncGroup}' not wired: no native cross-chart sync. Panes in one chart already share the crosshair.`
            );
        if (spec.series.some(s => s.colorBy === 'direction'))
            notes.push(
                'Volume up/down colors: precomputed color column (no native colorBy-direction for a separate volume series).'
            );
        notes.push(
            `Data fed as ${boost ? 'plain y arrays (boost)' : 'one chart-level DataTable (v13) with per-series dataMapping'}; formatter callbacks for Hoist formats.`
        );
        return handleFor(chart, notes);
    }

    // ---------- heatmap ----------
    function heatmap(spec, el, theme) {
        const src = CS.data.get(spec.source),
            cats = src.categories || [...new Set(src.rows.map(r => r[spec.x.field]))],
            idx = Object.fromEntries(cats.map((c, i) => [c, i])),
            cs = spec.colorScale,
            div = theme.diverging,
            midPos = (cs.mid - cs.min) / (cs.max - cs.min),
            stops = div.map((c, i) => {
                const h = (div.length - 1) / 2;
                return [i <= h ? (midPos * i) / h : midPos + ((1 - midPos) * (i - h)) / h, c];
            }),
            vf = spec.value.format;
        const chart = H.chart(
            el,
            H.merge(themeOptions(theme), {
                chart: {type: 'heatmap'},
                title: {text: spec.title},
                xAxis: {categories: cats, gridLineWidth: 0, lineWidth: 0, labels: {rotation: -45}},
                yAxis: {categories: cats, title: null, reversed: true, gridLineWidth: 0},
                colorAxis: {
                    min: cs.min,
                    max: cs.max,
                    stops,
                    labels: {style: {color: theme.textMuted}, formatter: ctx => fmt(ctx.value, vf)}
                },
                legend: H.merge(legendOptions(spec.legend), {symbolHeight: 260}),
                tooltip: {
                    formatter: (_, ctx) =>
                        `${cats[ctx.point.y]} / ${cats[ctx.point.x]}: <b>${fmt(ctx.point.value, vf)}</b>`
                },
                series: [
                    {
                        name: spec.value.field,
                        borderWidth: 1,
                        borderColor: theme.bg,
                        data: src.rows.map(r => [
                            idx[r[spec.x.field]],
                            idx[r[spec.y.field]],
                            r[spec.value.field]
                        ]),
                        dataLabels: {
                            enabled: !!spec.cellLabels,
                            color: 'contrast',
                            style: {fontSize: '10px', textOutline: 'none', fontWeight: 'normal'},
                            formatter: (_, p) => fmt(p.value, vf)
                        }
                    }
                ]
            })
        );
        return handleFor(chart, [
            'Native heatmap + colorAxis; diverging stops placed from colorScale min/mid/max.',
            'Cell labels: native dataLabels with color "contrast"; formatter callback for Hoist number format.',
            'Category order from source.categories; y axis reversed for matrix reading order.'
        ]);
    }

    // ---------- distribution: native histogram + bellcurve ----------
    function distribution(spec, el, theme) {
        const src = CS.data.get(spec.source),
            raw = src.rows.map(r => r[spec.field]),
            values = (spec.transform ? CS.transforms[spec.transform](raw) : raw).filter(
                v => v != null
            ),
            xf = spec.xFormat,
            markers = (spec.markers || []).map(m => {
                const v = CS.transforms.quantile(values, m.quantile);
                return {
                    value: v,
                    color: theme.negative,
                    width: 1.5,
                    dashStyle: 'Dash',
                    zIndex: 5,
                    label: {
                        text: `${m.label}: ${fmt(v, xf)}`,
                        rotation: 0,
                        y: 14,
                        x: -4,
                        align: 'right',
                        style: {color: theme.negative}
                    }
                };
            });
        const chart = H.chart(
            el,
            H.merge(themeOptions(theme), {
                title: {text: spec.title},
                legend: legendOptions(spec.legend),
                xAxis: [
                    {
                        labels: {formatter: ctx => fmt(ctx.value, xf)},
                        plotLines: markers,
                        crosshair: false
                    }
                ],
                yAxis: [
                    {title: {text: 'Days'}, opposite: false},
                    {visible: false, min: 0}
                ],
                tooltip: {
                    formatter: (_, ctx) =>
                        ctx.series.type === 'histogram'
                            ? `${fmt(ctx.point.x, xf)} to ${fmt(ctx.point.x2, xf)}: <b>${ctx.point.y}</b> days`
                            : `${ctx.series.name} at ${fmt(ctx.point.x, xf)}`
                },
                chart: {
                    events: {
                        // bellcurve plots a density on its own axis. Scale that axis so the
                        // curve sits in count units over the histogram (density * n * binWidth).
                        load() {
                            const hist = this.series.find(s => s.type === 'histogram');
                            this.yAxis[1].update({
                                max: this.yAxis[0].max / (values.length * hist.binWidth)
                            });
                        }
                    }
                },
                series: [
                    {
                        type: 'scatter',
                        id: 'raw',
                        data: values,
                        visible: false,
                        showInLegend: false,
                        enableMouseTracking: false
                    },
                    {
                        type: 'histogram',
                        name: 'Daily returns',
                        baseSeries: 'raw',
                        binsNumber: spec.bins.count,
                        color: theme.series[0],
                        borderWidth: 0,
                        pointPadding: 0,
                        groupPadding: 0
                    },
                    spec.overlay?.fn === 'normal' && {
                        type: 'bellcurve',
                        name: spec.overlay.name,
                        baseSeries: 'raw',
                        yAxis: 1,
                        intervals: 4,
                        pointsInInterval: 25,
                        color: theme.series[1],
                        lineWidth: 2,
                        fillOpacity: 0, // bellcurve is an areaspline
                        marker: {enabled: false},
                        zIndex: 3
                    }
                ].filter(Boolean)
            })
        );
        return handleFor(chart, [
            'Native histogram (binsNumber) and bellcurve series, both computed from a hidden base series.',
            'bellcurve is a density on a second axis; a load-event hook rescales it to count units (custom).',
            'VaR line: native xAxis plotLine; the quantile itself comes from CS.transforms (no native quantile).'
        ]);
    }

    // ---------- flow: sankey ----------
    function flow(spec, el, theme) {
        if (spec.type !== 'sankey') return {gap: `flow type '${spec.type}' not mapped`};
        const src = CS.data.get(spec.source),
            vf = spec.valueFormat,
            columns = {from: [], to: [], weight: []};
        src.rows.forEach(r => {
            columns.from.push(r[spec.fromField]);
            columns.to.push(r[spec.toField]);
            columns.weight.push(r[spec.valueField]);
        });
        const chart = H.chart(
            el,
            H.merge(themeOptions(theme), {
                title: {text: spec.title},
                tooltip: {
                    formatter: (_, ctx) =>
                        ctx.point.isNode
                            ? `${ctx.point.name}: <b>${fmt(ctx.point.sum, vf)}</b>`
                            : `${ctx.point.from} → ${ctx.point.to}: <b>${fmt(ctx.point.weight, vf)}</b>`
                },
                series: [
                    {
                        type: 'sankey',
                        name: spec.title,
                        dataTable: {columns},
                        linkOpacity: 0.35,
                        nodeWidth: 14,
                        nodePadding: 14,
                        borderWidth: 0,
                        dataLabels: {
                            style: {
                                color: theme.text,
                                textOutline: 'none',
                                fontWeight: 'normal',
                                fontSize: '11px'
                            },
                            nodeFormatter() {
                                return `${this.point.name} ${fmt(this.point.sum, vf)}`;
                            }
                        }
                    }
                ]
            })
        );
        return handleFor(chart, [
            'Native sankey (modules/sankey); nodes inferred from links, colored from the Hoist palette.',
            'Links fed as a series-level DataTable (v13) with from/to/weight columns.',
            'Formatter callbacks used for Hoist number format in labels and tooltip.'
        ]);
    }

    // ---------- registration ----------
    function render(spec, el, theme) {
        const fn = {timeSeries, heatmap, distribution, flow}[spec.kind];
        return fn ? fn(spec, el, theme) : {gap: `kind '${spec.kind}' not mapped`};
    }

    function zoomTo(handle, min, max) {
        handle.instance.xAxis[0].setExtremes(min, max, true, false);
        return Promise.resolve();
    }

    CS.adapters.highcharts = {
        key: 'highcharts',
        label: 'Highcharts Stock',
        version: () => H.version,
        render,
        zoomTo
    };
})();
