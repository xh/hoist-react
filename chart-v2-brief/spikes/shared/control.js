/* eslint-disable */
// Control surface spike: one config model, two drivers.
//
// The chart spec is the single source of truth. Two drivers change it through the SAME small
// action API (the shape proposed for TimeSeriesChartModel in findings/09):
//   - the user, through the form controls on the right
//   - an agent, through JSON tool calls (findings/11), validated with path-prefixed errors
// Every change re-renders the chart and shows the resulting JSON and an action log.
window.CS = window.CS || {};

(function () {
    const params = new URLSearchParams(location.search),
        SERIES_TYPES = ['line', 'area', 'step', 'column'],
        TRANSFORMS = ['none', 'cumReturn', 'drawdown', 'returns', 'rollingVol'],
        RANGES = ['1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'All'],
        MAX_SERIES = 8,
        PERCENT_TRANSFORMS = ['cumReturn', 'drawdown', 'returns', 'rollingVol'];

    const ui = {
        lib: params.get('lib') || 'highcharts',
        theme: params.get('theme') || 'dark',
        embed: params.has('embed'),
        handle: null,
        log: [],
        lastError: null
    };

    // ---------------------------------------------------------------- the config model
    const initialSpec = () => ({
        kind: 'timeSeries',
        title: 'Flagship Fund vs. benchmarks',
        source: 'navs',
        timeField: 'date',
        calendar: 'trading',
        navigator: true,
        rangeSelector: {buttons: RANGES, selected: '3Y'},
        compare: {mode: 'percent', base: 'visibleStart'},
        legend: {position: 'top'},
        tooltip: {mode: 'shared'},
        crosshair: {enabled: true},
        panes: [{id: 'main', size: 1}],
        axes: [],
        series: [
            {
                id: 'fund',
                field: 'FUND',
                name: 'Flagship Fund',
                type: 'line',
                pane: 'main',
                lineWidth: 2.5
            },
            {id: 'spx', field: 'SPX', name: 'S&P 500 TR', type: 'line', pane: 'main'},
            {id: 'msci', field: 'MSCIW', name: 'MSCI World', type: 'line', pane: 'main'},
            {
                id: 'b6040',
                field: 'B6040',
                name: '60/40 Blend',
                type: 'line',
                pane: 'main',
                hidden: true
            }
        ]
    });
    let spec = initialSpec();

    const clone = o => JSON.parse(JSON.stringify(o));
    const source = () => CS.data.get(spec.source);
    const numericFields = () =>
        source().fields.filter(f => f.type === 'number' || f.type === 'int');

    /**
     * Derive the render-ready spec: one value axis per pane, format chosen from what the pane
     * shows, transformed series excluded from rebasing. Hidden series are dropped here. A real
     * model keeps them and toggles visibility in place.
     */
    function normalize(s) {
        const out = clone(s),
            rebased = out.compare?.mode === 'percent';
        out.axes = out.panes.map(p => {
            const members = out.series.filter(x => x.pane === p.id && !x.hidden),
                allPct =
                    members.length &&
                    members.every(
                        x => (rebased && !x.transform) || PERCENT_TRANSFORMS.includes(x.transform)
                    );
            return {
                id: p.id + '-y',
                pane: p.id,
                side: 'right',
                format: allPct
                    ? {type: 'percent', precision: 1, signed: rebased}
                    : {type: 'number', precision: 2}
            };
        });
        out.series = out.series
            .filter(x => !x.hidden)
            .map(x => {
                const r = {...x, axis: x.pane + '-y'};
                if (x.transform) {
                    r.transform =
                        x.transform === 'rollingVol' ? {fn: 'rollingVol', period: 63} : x.transform;
                    r.excludeFromCompare = true;
                    if (x.transform === 'drawdown' && !x.color) r.color = 'negative';
                }
                delete r.pane;
                delete r.hidden;
                return r;
            });
        const total = out.panes.reduce((a, p) => a + (p.size || 1), 0);
        out.panes = out.panes.map(p => ({...p, size: (p.size || 1) / total}));
        return out;
    }

    /** Validate a candidate spec. Returns [{path, msg}] - the shape an agent gets back to retry. */
    function validate(s) {
        const errs = [],
            fields = source().fields,
            numeric = numericFields().map(f => f.name),
            paneIds = (s.panes || []).map(p => p.id),
            seen = new Set();
        if (s.kind !== 'timeSeries') errs.push({path: 'kind', msg: `must be 'timeSeries'`});
        if (!fields.find(f => f.name === s.timeField && f.type === 'date'))
            errs.push({
                path: 'timeField',
                msg: `'${s.timeField}' is not a date field of source '${s.source}'`
            });
        if (!paneIds.length) errs.push({path: 'panes', msg: 'at least one pane is required'});
        if (new Set(paneIds).size !== paneIds.length)
            errs.push({path: 'panes', msg: 'pane ids must be unique'});
        if ((s.series || []).length > MAX_SERIES)
            errs.push({path: 'series', msg: `at most ${MAX_SERIES} series`});
        (s.series || []).forEach((x, i) => {
            const p = `series[${i}]`;
            if (!/^[A-Za-z][\w-]{0,31}$/.test(x.id || ''))
                errs.push({
                    path: `${p}.id`,
                    msg: 'required, letters/digits/-/_ only, max 32 chars'
                });
            else if (seen.has(x.id)) errs.push({path: `${p}.id`, msg: `duplicate id '${x.id}'`});
            seen.add(x.id);
            if (!numeric.includes(x.field))
                errs.push({
                    path: `${p}.field`,
                    msg: `'${x.field}' is not a numeric field of source '${s.source}'. Available: ${numeric.join(', ')}`
                });
            if (x.type && !SERIES_TYPES.includes(x.type))
                errs.push({path: `${p}.type`, msg: `must be one of ${SERIES_TYPES.join(', ')}`});
            if (!paneIds.includes(x.pane))
                errs.push({
                    path: `${p}.pane`,
                    msg: `unknown pane '${x.pane}'. Panes: ${paneIds.join(', ')}`
                });
            if (x.transform && !TRANSFORMS.includes(x.transform))
                errs.push({path: `${p}.transform`, msg: `must be one of ${TRANSFORMS.join(', ')}`});
        });
        if (s.compare && !['none', 'percent'].includes(s.compare.mode))
            errs.push({path: 'compare.mode', msg: `must be 'none' or 'percent'`});
        if (s.rangeSelector?.selected && !RANGES.includes(s.rangeSelector.selected))
            errs.push({path: 'rangeSelector.selected', msg: `must be one of ${RANGES.join(', ')}`});
        return errs;
    }

    /** Apply a change through validation; log who did it. Throws a readable error on failure. */
    function commit(next, driver, action) {
        const errs = validate(next);
        if (errs.length) {
            const message =
                'Invalid change - nothing was applied. Fix and retry:\n' +
                errs.map(e => `- ${e.path}: ${e.msg}`).join('\n');
            ui.log.unshift({driver, action, ok: false, message});
            ui.lastError = message;
            refresh(false);
            throw new Error(message);
        }
        spec = next;
        ui.lastError = null;
        ui.log.unshift({driver, action, ok: true});
        refresh(true);
    }

    // ---------------------------------------------------------------- the action API (both drivers)
    const actions = {
        setCompare(mode, driver = 'user') {
            const n = clone(spec);
            n.compare = {mode, base: 'visibleStart'};
            commit(n, driver, `setCompare('${mode}')`);
        },
        setRange(preset, driver = 'user') {
            const n = clone(spec);
            n.rangeSelector.selected = preset;
            commit(n, driver, `setRange('${preset}')`);
        },
        setNavigator(on, driver = 'user') {
            const n = clone(spec);
            n.navigator = on;
            commit(n, driver, `setNavigator(${on})`);
        },
        setLegend(on, driver = 'user') {
            const n = clone(spec);
            n.legend = on ? {position: 'top'} : {enabled: false};
            commit(n, driver, `setLegend(${on})`);
        },
        setCalendar(cal, driver = 'user') {
            const n = clone(spec);
            n.calendar = cal;
            commit(n, driver, `setCalendar('${cal}')`);
        },
        updateSeries(id, changes, driver = 'user') {
            const n = clone(spec),
                s = n.series.find(x => x.id === id);
            if (!s)
                return commit(
                    {...n, series: [...n.series, {id, field: null, pane: null}]},
                    driver,
                    `updateSeries('${id}')`
                );
            Object.entries(changes).forEach(([k, v]) =>
                v === 'none' || v == null ? delete s[k] : (s[k] = v)
            );
            commit(n, driver, `updateSeries('${id}', ${JSON.stringify(changes)})`);
        },
        addSeries(series, driver = 'user') {
            const n = clone(spec);
            n.series.push({type: 'line', pane: n.panes[0].id, ...series});
            commit(n, driver, `addSeries(${JSON.stringify(series)})`);
        },
        removeSeries(id, driver = 'user') {
            const n = clone(spec);
            n.series = n.series.filter(x => x.id !== id);
            commit(n, driver, `removeSeries('${id}')`);
        },
        addPane(pane, driver = 'user') {
            const n = clone(spec);
            n.panes.push({size: 0.5, ...pane});
            commit(n, driver, `addPane(${JSON.stringify(pane)})`);
        },
        removePane(id, driver = 'user') {
            const n = clone(spec),
                first = n.panes.find(p => p.id !== id);
            n.panes = n.panes.filter(p => p.id !== id);
            n.series.forEach(s => s.pane === id && first && (s.pane = first.id));
            commit(n, driver, `removePane('${id}')`);
        },
        reset(driver = 'user') {
            commit(initialSpec(), driver, 'reset()');
        }
    };

    // ---------------------------------------------------------------- agent driver: tool calls
    // Each tool maps 1:1 onto the action API. Errors return as text for the model to retry.
    const tools = {
        update_chart: ({compare, range, navigator, legend, calendar}) => {
            if (compare != null) actions.setCompare(compare, 'agent');
            if (range != null) actions.setRange(range, 'agent');
            if (navigator != null) actions.setNavigator(navigator, 'agent');
            if (legend != null) actions.setLegend(legend, 'agent');
            if (calendar != null) actions.setCalendar(calendar, 'agent');
        },
        add_series: ({series}) => actions.addSeries(series, 'agent'),
        update_series: ({id, changes}) => actions.updateSeries(id, changes, 'agent'),
        remove_series: ({id}) => actions.removeSeries(id, 'agent'),
        add_pane: ({pane}) => actions.addPane(pane, 'agent'),
        remove_pane: ({id}) => actions.removePane(id, 'agent'),
        describe_chart: () => ({
            spec: clone(spec),
            source: {name: spec.source, fields: source().fields}
        })
    };

    function runTool(call) {
        const fn = tools[call.tool];
        if (!fn)
            return {
                ok: false,
                result: `Unknown tool '${call.tool}'. Tools: ${Object.keys(tools).join(', ')}`
            };
        try {
            const r = fn(call.args || {});
            return {ok: true, result: r ?? 'Applied.'};
        } catch (e) {
            return {ok: false, result: e.message};
        }
    }

    const cannedCalls = [
        {
            label: 'Add a drawdown pane for the fund',
            calls: [
                {tool: 'add_pane', args: {pane: {id: 'risk', size: 0.45}}},
                {
                    tool: 'add_series',
                    args: {
                        series: {
                            id: 'fundDd',
                            field: 'FUND',
                            name: 'Fund drawdown',
                            type: 'area',
                            transform: 'drawdown',
                            pane: 'risk'
                        }
                    }
                }
            ]
        },
        {
            label: 'Show raw NAV, last 1Y',
            calls: [{tool: 'update_chart', args: {compare: 'none', range: '1Y'}}]
        },
        {
            label: 'Fund vs. S&P only, as areas',
            calls: [
                {tool: 'update_series', args: {id: 'msci', changes: {hidden: true}}},
                {tool: 'update_series', args: {id: 'b6040', changes: {hidden: true}}},
                {tool: 'update_series', args: {id: 'fund', changes: {type: 'area'}}}
            ]
        },
        {
            label: 'Bad call: a field that does not exist',
            calls: [
                {tool: 'add_series', args: {series: {id: 'ndx', field: 'NASDAQ', pane: 'main'}}}
            ]
        }
    ];

    // ---------------------------------------------------------------- rendering
    const h = (tag, attrs = {}, ...kids) => {
        const e = document.createElement(tag);
        Object.entries(attrs).forEach(([k, v]) => {
            if (k === 'class') e.className = v;
            else if (k.startsWith('on')) e[k] = v;
            else if (v === true) e.setAttribute(k, '');
            else if (v !== false && v != null) e.setAttribute(k, v);
        });
        kids.flat().forEach(
            k => k != null && e.append(k.nodeType ? k : document.createTextNode(k))
        );
        return e;
    };
    const select = (value, options, onchange, attrs = {}) =>
        h(
            'select',
            {...attrs, onchange: e => onchange(e.target.value)},
            options.map(o => h('option', {value: o, selected: o === value}, o))
        );
    const toggle = (checked, label, onchange) =>
        h(
            'label',
            {class: 'ck'},
            h('input', {type: 'checkbox', checked, onchange: e => onchange(e.target.checked)}),
            label
        );

    function guard(fn) {
        return (...a) => {
            try {
                fn(...a);
            } catch (e) {
                /* error already logged and shown */
            }
        };
    }

    function controls() {
        const paneIds = spec.panes.map(p => p.id),
            used = new Set(spec.series.map(s => s.field + (s.transform || ''))),
            addable = numericFields().filter(f => !used.has(f.name));
        return h(
            'aside',
            {class: 'ctl'},
            h('h3', {}, 'Chart'),
            h(
                'div',
                {class: 'row'},
                h('span', {}, 'Rebase'),
                select(
                    spec.compare?.mode || 'none',
                    ['percent', 'none'],
                    guard(v => actions.setCompare(v))
                )
            ),
            h(
                'div',
                {class: 'row'},
                h('span', {}, 'Range'),
                select(
                    spec.rangeSelector.selected,
                    RANGES,
                    guard(v => actions.setRange(v))
                )
            ),
            h(
                'div',
                {class: 'row'},
                h('span', {}, 'Calendar'),
                select(
                    spec.calendar,
                    ['trading', 'continuous'],
                    guard(v => actions.setCalendar(v))
                )
            ),
            h(
                'div',
                {class: 'row'},
                toggle(
                    spec.navigator,
                    'Navigator',
                    guard(v => actions.setNavigator(v))
                ),
                toggle(
                    spec.legend?.enabled !== false,
                    'Legend',
                    guard(v => actions.setLegend(v))
                )
            ),
            h('h3', {}, 'Series'),
            h(
                'table',
                {class: 'series'},
                h(
                    'thead',
                    {},
                    h(
                        'tr',
                        {},
                        h('th', {}, ''),
                        h('th', {}, 'Series'),
                        h('th', {}, 'Type'),
                        h('th', {}, 'Pane'),
                        h('th', {}, 'Transform'),
                        h('th', {}, '')
                    )
                ),
                h(
                    'tbody',
                    {},
                    spec.series.map(s =>
                        h(
                            'tr',
                            {class: s.hidden ? 'off' : ''},
                            h(
                                'td',
                                {},
                                h('input', {
                                    type: 'checkbox',
                                    title: 'Visible',
                                    checked: !s.hidden,
                                    onchange: guard(e =>
                                        actions.updateSeries(s.id, {
                                            hidden: !e.target.checked || null
                                        })
                                    )
                                })
                            ),
                            h('td', {class: 'nm', title: s.field}, s.name || s.field),
                            h(
                                'td',
                                {},
                                select(
                                    s.type || 'line',
                                    SERIES_TYPES,
                                    guard(v => actions.updateSeries(s.id, {type: v}))
                                )
                            ),
                            h(
                                'td',
                                {},
                                select(
                                    s.pane,
                                    paneIds,
                                    guard(v => actions.updateSeries(s.id, {pane: v}))
                                )
                            ),
                            h(
                                'td',
                                {},
                                select(
                                    s.transform || 'none',
                                    TRANSFORMS,
                                    guard(v => actions.updateSeries(s.id, {transform: v}))
                                )
                            ),
                            h(
                                'td',
                                {},
                                h(
                                    'button',
                                    {
                                        class: 'x',
                                        title: 'Remove series',
                                        onclick: guard(() => actions.removeSeries(s.id))
                                    },
                                    '×'
                                )
                            )
                        )
                    )
                )
            ),
            h(
                'div',
                {class: 'row'},
                select(
                    '',
                    ['Add series...', ...numericFields().map(f => f.label)],
                    guard(label => {
                        const f = numericFields().find(x => x.label === label);
                        if (f)
                            actions.addSeries({
                                id: f.name.toLowerCase() + '_' + spec.series.length,
                                field: f.name,
                                name: f.label
                            });
                    }),
                    {class: 'grow'}
                ),
                h(
                    'button',
                    {onclick: guard(() => actions.addPane({id: 'pane' + (spec.panes.length + 1)}))},
                    'Add pane'
                )
            ),
            spec.panes.length > 1
                ? h(
                      'div',
                      {class: 'row panes'},
                      spec.panes
                          .slice(1)
                          .map(p =>
                              h(
                                  'button',
                                  {onclick: guard(() => actions.removePane(p.id))},
                                  `Remove pane '${p.id}'`
                              )
                          )
                  )
                : null,
            h('h3', {}, 'Agent tool calls'),
            h(
                'p',
                {class: 'hint'},
                'Same actions, driven by JSON. Click to run, or edit and run your own.'
            ),
            cannedCalls.map(c =>
                h('button', {class: 'agent', onclick: () => runAgent(c.calls)}, c.label)
            ),
            h(
                'textarea',
                {id: 'agentInput', spellcheck: 'false', rows: 5},
                JSON.stringify(cannedCalls[0].calls[1], null, 1)
            ),
            h(
                'div',
                {class: 'row'},
                h(
                    'button',
                    {
                        onclick: () => {
                            let calls;
                            try {
                                calls = JSON.parse(document.getElementById('agentInput').value);
                            } catch (e) {
                                ui.log.unshift({
                                    driver: 'agent',
                                    action: 'parse',
                                    ok: false,
                                    message: 'Invalid JSON: ' + e.message
                                });
                                return refresh(false);
                            }
                            runAgent([].concat(calls));
                        }
                    },
                    'Run tool call'
                ),
                h('button', {onclick: guard(() => actions.reset())}, 'Reset')
            )
        );
    }

    function runAgent(calls) {
        const results = calls.map(c => ({call: c, ...runTool(c)}));
        ui.agentResults = results;
        refresh(false);
    }

    function sidePanels() {
        return h(
            'section',
            {class: 'json'},
            h(
                'div',
                {class: 'jcol'},
                h(
                    'div',
                    {class: 'jhead'},
                    h('strong', {}, 'Spec JSON'),
                    h('span', {class: 'muted'}, ' - persisted, agent-readable')
                ),
                h('pre', {class: 'spec'}, JSON.stringify(spec, null, 2))
            ),
            h(
                'div',
                {class: 'jcol'},
                ui.agentResults
                    ? h(
                          'div',
                          {class: 'results'},
                          h('div', {class: 'jhead'}, h('strong', {}, 'Last tool results')),
                          ui.agentResults.map(r =>
                              h(
                                  'pre',
                                  {class: r.ok ? 'ok' : 'bad'},
                                  `${r.call.tool} -> ${typeof r.result === 'string' ? r.result : JSON.stringify(r.result).slice(0, 300)}`
                              )
                          )
                      )
                    : null,
                h(
                    'div',
                    {class: 'jhead'},
                    h('strong', {}, 'Action log'),
                    h('span', {class: 'muted'}, ' - newest first')
                ),
                h(
                    'ol',
                    {class: 'log'},
                    ui.log
                        .slice(0, 12)
                        .map(l =>
                            h(
                                'li',
                                {class: l.ok ? '' : 'bad'},
                                h('span', {class: 'drv drv-' + l.driver}, l.driver),
                                ' ',
                                l.ok ? l.action : l.message || l.action
                            )
                        )
                )
            )
        );
    }

    // Coalesce bursts of actions (one agent turn can make several calls) into one render, and
    // never let two renders overlap.
    let renderTimer = null,
        rendering = Promise.resolve();
    function renderChart() {
        clearTimeout(renderTimer);
        renderTimer = setTimeout(() => (rendering = rendering.then(doRender)), 30);
    }
    async function doRender() {
        const host = document.getElementById('chartHost');
        try {
            ui.handle?.destroy?.();
        } catch (e) {
            console.warn('destroy failed', e);
        }
        ui.handle = null;
        host.innerHTML = '';
        const a = CS.adapters[ui.lib];
        try {
            ui.handle = await a.render(normalize(spec), host, CS.themes[ui.theme]);
            if (ui.handle?.ready) await ui.handle.ready;
            if (ui.handle?.gap) host.append(h('div', {class: 'gap'}, ui.handle.gap));
        } catch (e) {
            console.error(e);
            host.append(h('div', {class: 'gap error'}, 'Render error: ' + e.message));
        }
    }

    function refresh(rerenderChart) {
        document
            .getElementById('controls')
            .replaceWith(Object.assign(controls(), {id: 'controls'}));
        document.getElementById('side').replaceWith(Object.assign(sidePanels(), {id: 'side'}));
        if (rerenderChart) renderChart();
    }

    function build() {
        document.documentElement.dataset.theme = ui.theme;
        document.body.className = ui.embed ? 'embed' : '';
        const go = patch => {
            const p = new URLSearchParams(location.search);
            Object.entries(patch).forEach(([k, v]) => p.set(k, v));
            location.search = p.toString();
        };
        const app = document.getElementById('app');
        app.append(
            h(
                'header',
                {class: 'bar'},
                h('div', {class: 'brand'}, 'Chart V2 - control surface'),
                h(
                    'span',
                    {class: 'muted'},
                    'One config model, two drivers: the form and agent tool calls.'
                ),
                h(
                    'div',
                    {class: 'tools'},
                    h('span', {class: 'muted'}, 'Renderer'),
                    select(ui.lib, Object.keys(CS.adapters), v => go({lib: v})),
                    h(
                        'button',
                        {
                            class: 'tab',
                            onclick: () => go({theme: ui.theme === 'dark' ? 'light' : 'dark'})
                        },
                        ui.theme === 'dark' ? 'Light theme' : 'Dark theme'
                    )
                )
            ),
            h(
                'main',
                {class: 'ctl-layout'},
                h('div', {class: 'ctl-chart'}, h('div', {id: 'chartHost', class: 'host'})),
                Object.assign(controls(), {id: 'controls'}),
                Object.assign(sidePanels(), {id: 'side'})
            )
        );
        renderChart();
    }

    CS.control = {actions, tools, runTool, validate, normalize, getSpec: () => clone(spec)};
    window.addEventListener('DOMContentLoaded', build);
})();
