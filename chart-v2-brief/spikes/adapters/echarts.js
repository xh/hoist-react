/* eslint-disable */
// Apache ECharts adapter: maps the shared, library-neutral chart spec to an ECharts option.
// Classic script, no modules. Registers CS.adapters.echarts.
CS.adapters = CS.adapters || {};

(function () {
    const E = window.echarts,
        T = CS.transforms,
        F = CS.fmt,
        DAY = 864e5,
        // Trading calendar strategy: 'category' (ordinal axis, default) or 'breaks' (time axis
        // with one ECharts 6 axis break per weekend/holiday). Switch with ?ecTrading=breaks.
        TRADING_AXIS = new URLSearchParams(location.search).get('ecTrading') || 'category',
        registered = new Set();

    //------------------------------------------------------------------------------------------
    // Theme: one registered ECharts theme per Hoist token set.
    //------------------------------------------------------------------------------------------
    function themeName(th) {
        const name = 'hoist-' + th.name;
        if (registered.has(name)) return name;
        const axis = {
            axisLine: {lineStyle: {color: th.border}},
            axisTick: {lineStyle: {color: th.border}},
            axisLabel: {color: th.textMuted},
            splitLine: {lineStyle: {color: th.grid}},
            nameTextStyle: {color: th.textMuted}
        };
        E.registerTheme(name, {
            darkMode: th.name === 'dark',
            color: th.series,
            backgroundColor: th.bg,
            textStyle: {fontFamily: th.fontFamily, fontSize: th.fontSize, color: th.text},
            title: {textStyle: {color: th.text, fontSize: 12, fontWeight: 600}},
            legend: {
                textStyle: {color: th.text},
                inactiveColor: th.textMuted,
                pageTextStyle: {color: th.textMuted}
            },
            tooltip: {
                backgroundColor: th.tooltipBg,
                borderColor: th.border,
                textStyle: {color: th.text, fontSize: th.fontSize}
            },
            axisPointer: {
                lineStyle: {color: th.textMuted},
                crossStyle: {color: th.textMuted},
                label: {backgroundColor: th.border, color: th.text}
            },
            categoryAxis: {...axis, splitLine: {show: false}},
            valueAxis: axis,
            timeAxis: axis,
            dataZoom: {
                borderColor: th.border,
                fillerColor: th.navigatorMask,
                textStyle: {color: th.textMuted},
                handleStyle: {color: th.bg, borderColor: th.accent},
                moveHandleStyle: {color: th.accent, opacity: 0.4},
                dataBackground: {
                    lineStyle: {color: th.textMuted, width: 1},
                    areaStyle: {color: th.textMuted, opacity: 0.12}
                },
                selectedDataBackground: {
                    lineStyle: {color: th.accent},
                    areaStyle: {color: th.accent, opacity: 0.2}
                }
            },
            visualMap: {textStyle: {color: th.text}},
            candlestick: {
                itemStyle: {
                    color: th.up,
                    color0: th.down,
                    borderColor: th.up,
                    borderColor0: th.down
                }
            }
        });
        registered.add(name);
        return name;
    }

    //------------------------------------------------------------------------------------------
    // Plumbing
    //------------------------------------------------------------------------------------------
    /** Resolve on the next 'finished' event (all progressive work and animation done). */
    function finished(chart) {
        return new Promise(resolve => {
            const done = () => (chart.off('finished', done), resolve());
            chart.on('finished', done);
            setTimeout(done, 15000);
        });
    }

    function mount(el, th, option, notes, onDestroy) {
        const chart = E.init(el, themeName(th)),
            ready = finished(chart);
        chart.setOption({animation: false, useUTC: true, ...option});
        const ro = new ResizeObserver(() => chart.resize());
        ro.observe(el);
        return {
            instance: chart,
            notes,
            ready,
            destroy() {
                ro.disconnect();
                onDestroy?.();
                chart.dispose();
            }
        };
    }

    const title = spec => ({text: spec.title, left: 8, top: 6}),
        legendAt = (pos, extra) => ({
            type: 'scroll',
            ...(pos === 'right'
                ? {right: 8, top: 'middle', orient: 'vertical'}
                : {left: 8, top: 26}),
            ...extra
        }),
        lowerBound = (xs, v) => {
            let lo = 0,
                hi = xs.length;
            while (lo < hi) {
                const mid = (lo + hi) >> 1;
                xs[mid] < v ? (lo = mid + 1) : (hi = mid);
            }
            return lo;
        },
        uniq = arr => [...new Set(arr)],
        muted = (th, s) => `<span style="color:${th.textMuted}">${s}</span>`;

    //------------------------------------------------------------------------------------------
    // Time series: panes -> grids, shared dataZoom, linked axisPointer.
    //------------------------------------------------------------------------------------------
    function renderTimeSeries(spec, el, th) {
        const src = CS.data.get(spec.source, spec.sourceOptions),
            xs = src.columnar ? src.t : src.rows.map(r => r[spec.timeField]),
            n = xs.length,
            last = n - 1,
            panes = spec.panes,
            paneIdx = id => panes.findIndex(p => p.id === id),
            axisById = Object.fromEntries(spec.axes.map(a => [a.id, a])),
            specById = Object.fromEntries(spec.series.map(s => [s.id, s])),
            useCat = spec.calendar === 'trading' && TRADING_AXIS === 'category',
            big = n * spec.series.length > 50000,
            intraday = n > 1 && xs[1] - xs[0] < DAY,
            hasBars = spec.series.some(s => s.type === 'column' || s.type === 'candlestick'),
            ohlc = spec.series.find(s => s.fields),
            rs = spec.rangeSelector,
            raw = {},
            notes = [];

        // x values in axis units: ordinal index on a category axis, epoch ms on a time axis.
        const xv = i => (useCat ? i : xs[i]),
            toAxis = (ms, isEnd) => {
                if (!useCat) return ms;
                const i = lowerBound(xs, ms);
                return Math.min(last, isEnd && xs[i] !== ms ? i - 1 : i);
            },
            initWin = rs?.selected
                ? CS.rangeWindow(rs.selected, xs[0], xs[last])
                : [xs[0], xs[last]],
            initStart = lowerBound(xs, initWin[0]);

        // Compare: rebase to the first visible point (re-applied on every datazoom event).
        const rebased = (ys, i0) => {
            let b = i0;
            while (b < n && ys[b] == null) b++;
            return T.rebase(ys, b).map((y, i) => [xv(i), y]);
        };

        // ---- series ----
        const series = spec.series.map(s => {
            const ax = axisById[s.axis],
                pi = paneIdx(ax.pane),
                base = {id: s.id, name: s.name, xAxisIndex: pi, yAxisIndex: spec.axes.indexOf(ax)};
            if (s.color) base.color = th[s.color] || s.color;
            if (s.type === 'candlestick') {
                const f = s.fields;
                return {
                    ...base,
                    type: 'candlestick',
                    barMaxWidth: 10,
                    encode: {x: 0, y: [1, 2, 3, 4]},
                    data: src.rows.map((r, i) => [
                        xv(i),
                        r[f.open],
                        r[f.close],
                        r[f.low],
                        r[f.high]
                    ])
                };
            }
            const line = {
                ...base,
                type: 'line',
                showSymbol: false,
                lineStyle: {width: s.lineWidth || 1.5},
                areaStyle: s.type === 'area' ? {opacity: 0.25} : undefined,
                sampling: big ? 'lttb' : undefined,
                emphasis: {disabled: true}
            };
            if (src.columnar)
                return {...line, datasetIndex: 0, encode: {x: spec.timeField, y: s.field}};
            const ys = T.seriesXY(spec, s).y;
            if (s.type === 'column') {
                const dir = i =>
                    (
                        ohlc
                            ? src.rows[i][ohlc.fields.close] >= src.rows[i][ohlc.fields.open]
                            : ys[i] >= (ys[i - 1] ?? ys[i])
                    )
                        ? 1
                        : -1;
                return {
                    ...base,
                    type: 'bar',
                    barMaxWidth: 8,
                    data: ys.map((y, i) =>
                        s.colorBy === 'direction' ? [xv(i), y, dir(i)] : [xv(i), y]
                    )
                };
            }
            if (spec.compare?.mode === 'percent') {
                raw[s.id] = ys;
                return {...line, data: rebased(ys, initStart)};
            }
            return {...line, data: ys.map((y, i) => [xv(i), y])};
        });

        // Up/down volume colors: piecewise visualMap on the direction dimension.
        const visualMap = [];
        series.forEach((s, k) => {
            if (specById[s.id].colorBy !== 'direction') return;
            visualMap.push({
                type: 'piecewise',
                show: false,
                seriesIndex: k,
                dimension: 2,
                pieces: [
                    {value: 1, color: th.up},
                    {value: -1, color: th.down}
                ]
            });
        });

        // Events and bands: markLine / markArea on an empty carrier series per pane, so they
        // survive hiding a real series via the legend.
        const evts = spec.events || [],
            bands = spec.bands || [];
        if (evts.length || bands.length) {
            panes.forEach((p, pi) => {
                const lbl = pi === 0;
                series.push({
                    id: '_marks' + pi,
                    type: 'line',
                    data: [],
                    silent: true,
                    xAxisIndex: pi,
                    yAxisIndex: spec.axes.findIndex(a => a.pane === p.id),
                    tooltip: {show: false},
                    markLine: {
                        symbol: 'none',
                        silent: true,
                        lineStyle: {color: th.textMuted, type: 'dashed', width: 1},
                        label: {show: lbl, formatter: '{b}', position: 'end', color: th.textMuted},
                        data: evts.map(e => ({name: e.label, xAxis: toAxis(CS.parseDate(e.date))}))
                    },
                    markArea: {
                        silent: true,
                        itemStyle: {color: th.navigatorMask},
                        label: {show: lbl, color: th.textMuted, position: 'insideTop'},
                        data: bands.map(b => [
                            {name: b.label, xAxis: toAxis(CS.parseDate(b.from))},
                            {xAxis: toAxis(CS.parseDate(b.to), true)}
                        ])
                    }
                });
            });
        }

        // ---- x axes: one per pane; labels only on the bottom pane ----
        const UNITS = [
                ['week', 7, x => Math.floor((x / DAY + 3) / 7), x => F.date(x).slice(0, 6)],
                ['month', 30.4, (x, d) => d.getUTCFullYear() * 12 + d.getUTCMonth(), monthLbl],
                [
                    'quarter',
                    91.3,
                    (x, d) => d.getUTCFullYear() * 4 + Math.floor(d.getUTCMonth() / 3),
                    monthLbl
                ],
                [
                    'half',
                    182.6,
                    (x, d) => d.getUTCFullYear() * 2 + Math.floor(d.getUTCMonth() / 6),
                    monthLbl
                ],
                [
                    'year',
                    365,
                    (x, d) => d.getUTCFullYear(),
                    x => String(new Date(x).getUTCFullYear())
                ],
                [
                    '2 years',
                    730,
                    (x, d) => Math.floor(d.getUTCFullYear() / 2),
                    x => String(new Date(x).getUTCFullYear())
                ]
            ],
            pickUnit = (i0, i1) => {
                const days = (xs[i1] - xs[i0]) / DAY,
                    maxLabels = Math.max(3, el.clientWidth / 90);
                return UNITS.find(u => days / u[1] <= maxLabels) || UNITS[UNITS.length - 1];
            },
            // Category axis: show a label only where the calendar period rolls over.
            catLabels = u => ({
                interval: i =>
                    i > 0 && u[2](xs[i], new Date(xs[i])) !== u[2](xs[i - 1], new Date(xs[i - 1])),
                formatter: v => u[3](+v)
            });
        function monthLbl(x) {
            return F.date(x).slice(3);
        }
        let unit = useCat ? pickUnit(initStart, last) : null;

        const xAxis = panes.map((p, pi) => {
            const bottom = pi === panes.length - 1,
                ax = {
                    type: useCat ? 'category' : 'time',
                    gridIndex: pi,
                    boundaryGap: useCat ? hasBars : undefined,
                    axisLine: {onZero: false},
                    axisTick: {show: bottom},
                    axisLabel: {show: bottom, hideOverlap: true},
                    splitLine: {show: false},
                    axisPointer: {
                        label: {
                            show: bottom,
                            formatter: q =>
                                F.date(useCat ? (xs[q.value] ?? +q.value) : q.value, {intraday})
                        }
                    }
                };
            if (useCat) {
                ax.data = xs;
                Object.assign(ax.axisLabel, catLabels(unit));
                ax.axisTick.interval = ax.axisLabel.interval;
            } else {
                ax.axisLabel.formatter = {
                    year: '{yyyy}',
                    month: '{MMM}',
                    day: '{d} {MMM}',
                    hour: '{HH}:{mm}',
                    minute: '{HH}:{mm}'
                };
            }
            if (!useCat && spec.calendar === 'trading') {
                // One zero-width break per non-trading gap (weekends, holidays).
                ax.breaks = [];
                for (let i = 1; i < n; i++)
                    if (xs[i] - xs[i - 1] > 1.5 * DAY)
                        ax.breaks.push({start: xs[i - 1] + DAY / 2, end: xs[i] - DAY / 2, gap: 0});
                ax.breakArea = {show: false};
                // Break edges become ticks; suppress their labels and keep the date ones.
                ax.axisLabel.formatter = (v, i, extra) => (extra?.break ? '' : F.date(v).slice(3));
            }
            return ax;
        });

        const yAxis = spec.axes.map(a => ({
            type: 'value',
            gridIndex: paneIdx(a.pane),
            position: a.side || 'left',
            scale: !spec.series.some(
                s => s.axis === a.id && (s.type === 'column' || s.type === 'area')
            ),
            min: a.min,
            max: a.max,
            splitNumber: 4,
            axisLabel: {formatter: v => F.apply(v, a.format)},
            axisPointer: {label: {formatter: q => F.apply(q.value, a.format)}}
        }));

        // ---- layout: stacked grids sized by pane.size ----
        const layout = h => {
            const top = evts.length ? 76 : 58,
                bottom = (spec.navigator ? 46 : 0) + 26,
                gap = 26,
                avail = h - top - bottom - gap * (panes.length - 1);
            let y = top;
            return panes.map(p => {
                const g = {
                    left: 24,
                    right: 64,
                    top: y,
                    height: avail * (p.size ?? 1 / panes.length),
                    outerBoundsMode: 'none'
                };
                y += g.height + gap;
                return g;
            });
        };

        const allX = panes.map((_, i) => i),
            win = {startValue: toAxis(initWin[0]), endValue: toAxis(initWin[1], true)},
            dataZoom = [{type: 'inside', xAxisIndex: allX, ...win}];
        if (spec.navigator) {
            dataZoom.push({
                type: 'slider',
                xAxisIndex: allX,
                bottom: 8,
                height: 32,
                ...win,
                labelFormatter: (v, s) => F.date(useCat ? xs[v] : v, {intraday})
            });
        }

        // ---- tooltip ----
        const fieldIdx = f => src.fields.findIndex(x => x.name === f) - 1;
        function tooltip(params) {
            const list = [].concat(params).filter(p => !String(p.seriesId).startsWith('_marks'));
            if (!list.length) return '';
            let html = `<b>${F.date(xs[list[0].dataIndex], {intraday})}</b>`;
            list.forEach(p => {
                const s = specById[p.seriesId],
                    a = axisById[s.axis],
                    i = p.dataIndex;
                let v;
                if (s.fields) {
                    const r = src.rows[i];
                    v = ['open', 'high', 'low', 'close']
                        .map(k => `${k[0].toUpperCase()} ${F.apply(r[s.fields[k]], a.format)}`)
                        .join('  ');
                } else {
                    v = F.apply(
                        src.columnar ? src.series[fieldIdx(s.field)][i] : p.value[1],
                        a.format
                    );
                    if (raw[s.id]) v += ' ' + muted(th, F.number(raw[s.id][i]));
                }
                html += `<br>${p.marker}${p.seriesName}: <b>${v}</b>`;
            });
            return html;
        }

        const option = {
            title: title(spec),
            legend: legendAt(spec.legend?.position, {data: spec.series.map(s => s.name)}),
            grid: layout(el.clientHeight),
            xAxis,
            yAxis,
            series,
            visualMap,
            dataZoom,
            axisPointer: {link: [{xAxisIndex: 'all'}]},
            tooltip: {
                trigger: spec.tooltip?.mode === 'shared' ? 'axis' : 'item',
                confine: true,
                axisPointer: {type: spec.crosshair?.enabled ? 'cross' : 'line'},
                formatter: tooltip
            }
        };
        if (src.columnar) {
            // Zero-copy columnar dataset: typed arrays keyed by field name.
            const cols = {[spec.timeField]: src.t};
            src.series.forEach((ys, k) => (cols[src.fields[k + 1].name] = ys));
            option.dataset = {source: cols};
        }

        // ---- range selector (custom HTML) ----
        let buttons = null,
            fromButton = false;
        const handle = mount(el, th, option, notes, () => buttons?.remove()),
            chart = handle.instance;
        if (rs) {
            buttons = rangeButtons(el, rs, th, tok => {
                const w = CS.rangeWindow(tok, xs[0], xs[last]);
                fromButton = true;
                setActive(tok);
                chart.dispatchAction({
                    type: 'dataZoom',
                    startValue: toAxis(w[0]),
                    endValue: toAxis(w[1], true)
                });
            });
            setActive(rs.selected);
        }
        function setActive(tok) {
            buttons?.querySelectorAll('button').forEach(b => {
                const on = b.textContent === tok;
                b.style.color = on ? th.accent : th.textMuted;
                b.style.borderColor = on ? th.accent : th.border;
            });
        }

        // ---- on zoom: rebase compare series, re-pick category label unit, clear range button ----
        chart.on('datazoom', () => {
            // No public getter for the settled window in axis units; this is the documented-in-source path.
            const [lo, hi] = chart.getModel().getComponent('dataZoom', 0).getValueRange(),
                i0 = useCat ? Math.round(lo) : lowerBound(xs, lo),
                i1 = useCat ? Math.round(hi) : Math.min(last, lowerBound(xs, hi)),
                patch = {};
            if (Object.keys(raw).length)
                patch.series = Object.keys(raw).map(id => ({id, data: rebased(raw[id], i0)}));
            const u = useCat && pickUnit(i0, i1);
            if (u && u !== unit) {
                unit = u;
                patch.xAxis = panes.map(() => {
                    const l = catLabels(u);
                    return {axisLabel: l, axisTick: {interval: l.interval}};
                });
            }
            if (patch.series || patch.xAxis) chart.setOption(patch);
            if (!fromButton) setActive(null);
            fromButton = false;
        });

        new ResizeObserver(() => chart.setOption({grid: layout(el.clientHeight)})).observe(el);

        // Cross-chart crosshair / zoom sync.
        const group = spec.crosshair?.syncGroup;
        if (group) {
            chart.group = group;
            E.connect(group);
        }

        handle.zoomTo = (min, max) => {
            const p = finished(chart);
            chart.dispatchAction({
                type: 'dataZoom',
                startValue: toAxis(min),
                endValue: toAxis(max, true)
            });
            return p;
        };

        // ---- notes ----
        notes.push(
            useCat
                ? 'Trading calendar: category (ordinal) x axis; custom label/tick interval fn picks month/quarter/year rollovers.'
                : spec.calendar === 'trading'
                  ? `Trading calendar: time axis with ${xAxis[0].breaks.length} ECharts 6 axis breaks (gap 0).`
                  : 'Continuous time axis (native time ticks).'
        );
        if (panes.length > 1)
            notes.push(
                `${panes.length} grids, one dataZoom over all x axes, axisPointer.link spans panes (native).`
            );
        if (spec.navigator)
            notes.push('Navigator: native dataZoom slider + inside zoom (wheel/drag).');
        if (rs)
            notes.push(
                'Range selector: custom HTML buttons -> dispatchAction dataZoom (no native one).'
            );
        if (Object.keys(raw).length)
            notes.push(
                'Compare %: no native mode; custom rebase on every datazoom event via setOption.'
            );
        if (visualMap.length)
            notes.push('Up/down volume colors: piecewise visualMap on a direction dimension.');
        if (evts.length || bands.length)
            notes.push('Events/bands: markLine/markArea on an empty carrier series per pane.');
        if (big)
            notes.push(
                `Large data: zero-copy typed-array dataset, sampling: 'lttb' (line series has no large/progressive mode).`
            );
        if (group)
            notes.push(
                `echarts.connect('${group}') wired for cross-chart sync (single chart here).`
            );
        return handle;
    }

    function rangeButtons(el, rs, th, onPick) {
        const bar = document.createElement('div');
        bar.style.cssText = `position:absolute;top:5px;right:8px;z-index:2;display:flex;gap:3px;font:11px ${th.fontFamily}`;
        rs.buttons.forEach(tok => {
            const b = document.createElement('button');
            b.textContent = tok;
            b.style.cssText = `font:inherit;padding:1px 6px;cursor:pointer;border-radius:3px;border:1px solid ${th.border};background:${th.bg};color:${th.textMuted}`;
            b.onclick = () => onPick(tok);
            bar.append(b);
        });
        el.append(bar);
        return bar;
    }

    //------------------------------------------------------------------------------------------
    // Breadth charts
    //------------------------------------------------------------------------------------------
    function renderHeatmap(spec, el, th) {
        const src = CS.data.get(spec.source),
            xCats = src.categories || uniq(src.rows.map(r => r[spec.x.field])),
            yCats = src.categories || uniq(src.rows.map(r => r[spec.y.field])),
            cs = spec.colorScale,
            fv = v => F.apply(v, spec.value.format),
            // Pick a readable label color per cell from the interpolated scale color.
            labelColor = v => {
                const [r, g, b] = E.color.parse(
                    E.color.lerp((v - cs.min) / (cs.max - cs.min), th.diverging)
                );
                return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#1b1f22' : '#ffffff';
            },
            data = src.rows.map(r => {
                const v = r[spec.value.field];
                return {
                    value: [xCats.indexOf(r[spec.x.field]), yCats.indexOf(r[spec.y.field]), v],
                    label: {color: labelColor(v)}
                };
            }),
            right = spec.legend?.position === 'right',
            notes = [
                'Native heatmap series + continuous visualMap with theme.diverging stops.',
                'Cell label colors computed per cell with echarts.color.lerp/parse (no auto-contrast option).'
            ];
        if (cs.mid != null && cs.mid !== (cs.min + cs.max) / 2)
            notes.push(
                'colorScale.mid off-center: not honoured (visualMap stops are evenly spaced).'
            );
        return mount(
            el,
            th,
            {
                title: title(spec),
                grid: {left: 12, right: right ? 110 : 12, top: 40, bottom: right ? 12 : 60},
                xAxis: {
                    type: 'category',
                    data: xCats,
                    axisLabel: {interval: 0, rotate: 45},
                    splitArea: {show: false}
                },
                yAxis: {type: 'category', data: yCats, inverse: true, axisLabel: {interval: 0}},
                visualMap: {
                    type: 'continuous',
                    min: cs.min,
                    max: cs.max,
                    calculable: true,
                    inRange: {color: th.diverging},
                    formatter: fv,
                    itemHeight: 220,
                    ...(right
                        ? {right: 8, top: 'middle', orient: 'vertical'}
                        : {left: 'center', bottom: 4, orient: 'horizontal'})
                },
                tooltip: {
                    trigger: 'item',
                    formatter: p =>
                        `${yCats[p.value[1]]} / ${xCats[p.value[0]]}: <b>${fv(p.value[2])}</b>`
                },
                series: [
                    {
                        type: 'heatmap',
                        data,
                        label: {
                            show: !!spec.cellLabels,
                            fontSize: 10,
                            formatter: p => fv(p.value[2])
                        },
                        itemStyle: {borderColor: th.bg, borderWidth: 1}
                    }
                ]
            },
            notes
        );
    }

    function renderDistribution(spec, el, th) {
        const src = CS.data.get(spec.source),
            meta = CS.data.field(src, spec.field),
            base = src.rows.map(r => r[spec.field]),
            vals = (spec.transform ? T[spec.transform](base) : base).filter(v => v != null),
            bins = T.histogram(vals, spec.bins),
            fx = v => F.apply(v, spec.xFormat),
            markers = (spec.markers || []).map(m => ({
                q: T.quantile(vals, m.quantile),
                label: m.label
            })),
            series = [
                {
                    type: 'custom',
                    name: `${meta.label} ${spec.transform || ''}`.trim(),
                    // Bars from x0 to x1 on a value axis: custom series (no native histogram since ecStat moved out).
                    renderItem: (params, api) => {
                        const p0 = api.coord([api.value(0), api.value(2)]),
                            p1 = api.coord([api.value(1), 0]);
                        return {
                            type: 'rect',
                            shape: {
                                x: p0[0],
                                y: p0[1],
                                width: Math.max(1, p1[0] - p0[0] - 1),
                                height: p1[1] - p0[1]
                            },
                            style: api.style()
                        };
                    },
                    encode: {x: [0, 1], y: 2},
                    data: bins.map(b => [b.x0, b.x1, b.count]),
                    markLine: {
                        symbol: 'none',
                        silent: true,
                        lineStyle: {color: th.down, type: 'dashed', width: 1.5},
                        label: {
                            formatter: p => `${p.name} ${fx(p.value)}`,
                            color: th.down,
                            position: 'end'
                        },
                        data: markers.map(m => ({name: m.label, xAxis: m.q}))
                    }
                }
            ];
        if (spec.overlay?.fn === 'normal') {
            series.push({
                type: 'line',
                name: spec.overlay.name,
                data: T.normalCurve(vals, bins),
                smooth: true,
                showSymbol: false,
                lineStyle: {width: 2}
            });
        }
        return mount(
            el,
            th,
            {
                title: title(spec),
                legend: legendAt(spec.legend?.position),
                grid: {left: 12, right: 16, top: 72, bottom: 12, outerBoundsMode: 'same'},
                xAxis: {
                    type: 'value',
                    min: bins[0].x0,
                    max: bins[bins.length - 1].x1,
                    axisLabel: {formatter: fx},
                    splitLine: {show: false}
                },
                yAxis: {
                    type: 'value',
                    name: 'Days',
                    nameLocation: 'middle',
                    nameGap: 32,
                    axisLine: {onZero: false}
                },
                tooltip: {
                    trigger: 'item',
                    formatter: p =>
                        p.seriesType === 'custom'
                            ? `${fx(p.value[0])} to ${fx(p.value[1])}: <b>${p.value[2]}</b> days`
                            : `${p.seriesName} ${fx(p.value[0])}: <b>${F.number(p.value[1], {precision: 1})}</b>`
                },
                series
            },
            [
                'Histogram: custom series drawing x0..x1 rects; bins from shared transform (ECharts dropped native histogram with ecStat).',
                'Normal fit: line from shared normalCurve transform.',
                'VaR: markLine at the shared quantile transform value.'
            ]
        );
    }

    function renderFlow(spec, el, th) {
        if (spec.type !== 'sankey') return {gap: `Flow type '${spec.type}' not mapped`};
        const src = CS.data.get(spec.source),
            fv = v => F.apply(v, spec.valueFormat),
            names = uniq(src.rows.flatMap(r => [r[spec.fromField], r[spec.toField]]));
        return mount(
            el,
            th,
            {
                title: title(spec),
                tooltip: {
                    trigger: 'item',
                    formatter: p =>
                        p.dataType === 'edge'
                            ? `${p.data.source} -> ${p.data.target}: <b>${fv(p.value)}</b>`
                            : `${p.name}: <b>${fv(p.value)}</b>`
                },
                series: [
                    {
                        type: 'sankey',
                        left: 12,
                        right: 150,
                        top: 40,
                        bottom: 12,
                        nodeGap: 10,
                        nodeWidth: 14,
                        emphasis: {focus: 'adjacency'},
                        label: {color: th.text, formatter: p => `${p.name}  ${fv(p.value)}`},
                        lineStyle: {color: 'gradient', opacity: 0.35, curveness: 0.5},
                        data: names.map((name, i) => ({
                            name,
                            itemStyle: {color: th.series[i % th.series.length]}
                        })),
                        links: src.rows.map(r => ({
                            source: r[spec.fromField],
                            target: r[spec.toField],
                            value: r[spec.valueField]
                        }))
                    }
                ]
            },
            [
                'Native sankey series; nodes derived from unique from/to values.',
                'Gradient link colors and adjacency focus are native.'
            ]
        );
    }

    //------------------------------------------------------------------------------------------
    const renderers = {
        timeSeries: renderTimeSeries,
        heatmap: renderHeatmap,
        distribution: renderDistribution,
        flow: renderFlow
    };

    CS.adapters.echarts = {
        key: 'echarts',
        label: 'Apache ECharts',
        version: () => E.version,
        render(spec, el, th) {
            const fn = renderers[spec.kind];
            return fn ? fn(spec, el, th) : {gap: `No mapping for kind '${spec.kind}'`};
        },
        zoomTo: (handle, min, max) => handle.zoomTo(min, max)
    };
})();
