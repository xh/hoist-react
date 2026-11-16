/* eslint-disable */
// Gallery harness: renders one shared spec with every adapter, side by side, and times it.
//
// Adapter contract (adapters/*.js register on CS.adapters):
//   key, label, version(): string
//   render(spec, el, theme): handle | Promise<handle>
//       handle = {destroy(), instance?, notes?: string[], gap?: string, ready?: Promise}
//       Return {gap: 'reason'} (and render nothing) when the library cannot do the chart.
//   zoomTo(handle, min, max): Promise   - optional, used by the stress test. Resolves once drawn.
window.CS = window.CS || {};
CS.adapters = CS.adapters || {};

(function () {
    const params = new URLSearchParams(location.search),
        LIBS = ['highcharts', 'agcharts', 'echarts'],
        nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const state = {
        chart: params.get('chart') || 'navRebase',
        theme: params.get('theme') || 'dark',
        libs: (params.get('libs') || LIBS.join(',')).split(',').filter(l => LIBS.includes(l)),
        embed: params.has('embed'),
        points: +(params.get('points') || 0),
        handles: {}
    };
    window.__results = {chart: state.chart, theme: state.theme, libs: {}, done: false};

    function el(tag, attrs = {}, ...kids) {
        const e = document.createElement(tag);
        Object.entries(attrs).forEach(([k, v]) =>
            k === 'class'
                ? (e.className = v)
                : k.startsWith('on')
                  ? (e[k] = v)
                  : e.setAttribute(k, v)
        );
        kids.flat().forEach(
            k => k != null && e.append(k.nodeType ? k : document.createTextNode(k))
        );
        return e;
    }

    function getSpec() {
        const spec = JSON.parse(JSON.stringify(CS.specs[state.chart]));
        if (state.chart === 'stress' && state.points) spec.sourceOptions.points = state.points;
        // ?perf=gpu asks for the library's full-fidelity GPU path (Highcharts Boost) instead of
        // its default large-data path.
        if (spec.performance && params.get('perf')) spec.performance.mode = params.get('perf');
        return spec;
    }

    function buildChrome() {
        document.documentElement.dataset.theme = state.theme;
        document.body.className = state.embed ? 'embed' : '';
        const root = document.getElementById('root');
        root.innerHTML = '';
        if (!state.embed) {
            const tabs = el(
                'nav',
                {class: 'tabs'},
                CS.chartList.map(c =>
                    el(
                        'button',
                        {
                            class: c.id === state.chart ? 'tab active' : 'tab',
                            onclick: () => go({chart: c.id})
                        },
                        c.label
                    )
                )
            );
            const tools = el(
                'div',
                {class: 'tools'},
                el(
                    'button',
                    {
                        class: 'tab',
                        onclick: () => go({theme: state.theme === 'dark' ? 'light' : 'dark'})
                    },
                    state.theme === 'dark' ? 'Light theme' : 'Dark theme'
                ),
                el(
                    'button',
                    {
                        class: 'tab',
                        onclick: () => document.getElementById('specJson').classList.toggle('open')
                    },
                    'Show spec JSON'
                )
            );
            root.append(
                el(
                    'header',
                    {class: 'bar'},
                    el('div', {class: 'brand'}, 'Hoist Chart V2 - spikes'),
                    tabs,
                    tools
                )
            );
            root.append(
                el(
                    'pre',
                    {id: 'specJson', class: 'spec-json'},
                    JSON.stringify(CS.specs[state.chart], null, 2)
                )
            );
        }
        const grid = el('main', {class: 'cols cols-' + state.libs.length});
        state.libs.forEach(lib => {
            const a = CS.adapters[lib];
            grid.append(
                el(
                    'section',
                    {class: 'card', id: 'card-' + lib},
                    el(
                        'div',
                        {class: 'card-head'},
                        el('span', {class: 'lib'}, a ? a.label : lib),
                        el('span', {class: 'ver'}, a ? a.version() : ''),
                        el('span', {class: 'timing', id: 'timing-' + lib})
                    ),
                    el('div', {class: 'host', id: 'host-' + lib}),
                    el('ul', {class: 'notes', id: 'notes-' + lib})
                )
            );
        });
        root.append(grid);
    }

    function go(patch) {
        const p = new URLSearchParams(location.search);
        Object.entries(patch).forEach(([k, v]) => p.set(k, v));
        location.search = p.toString();
    }

    function setTiming(lib, text) {
        const t = document.getElementById('timing-' + lib);
        if (t) t.textContent = text;
    }
    function setNotes(lib, notes = []) {
        const ul = document.getElementById('notes-' + lib);
        if (!ul) return;
        ul.innerHTML = '';
        notes.forEach(n => ul.append(el('li', {}, n)));
    }

    async function renderOne(lib) {
        const a = CS.adapters[lib],
            host = document.getElementById('host-' + lib),
            res = {lib, version: a?.version()};
        window.__results.libs[lib] = res;
        if (!a) {
            host.append(el('div', {class: 'gap'}, 'Adapter not loaded'));
            return;
        }
        const theme = CS.themes[state.theme],
            spec = getSpec();
        // Warm the data cache so data generation is not counted as render time.
        if (spec.source) CS.data.get(spec.source, spec.sourceOptions);
        try {
            const t0 = performance.now(),
                handle = await a.render(spec, host, theme);
            if (handle?.ready) await handle.ready;
            await nextFrame();
            const renderMs = performance.now() - t0;
            state.handles[lib] = handle;
            if (handle?.gap) {
                host.innerHTML = '';
                host.append(el('div', {class: 'gap'}, el('strong', {}, 'Gap: '), handle.gap));
                res.gap = handle.gap;
                setTiming(lib, 'gap');
            } else {
                res.renderMs = Math.round(renderMs);
                setTiming(lib, `render ${res.renderMs} ms`);
            }
            res.notes = handle?.notes || [];
            setNotes(lib, res.notes);
            if (state.chart === 'stress' && !handle?.gap && a.zoomTo)
                await measureZoom(lib, a, handle, spec, res);
        } catch (e) {
            console.error(lib, e);
            res.error = String(e?.stack || e);
            host.append(el('div', {class: 'gap error'}, 'Error: ' + e.message));
            setTiming(lib, 'error');
        }
    }

    async function measureZoom(lib, a, handle, spec, res) {
        const src = CS.data.get(spec.source, spec.sourceOptions),
            min = src.t[0],
            max = src.t[src.t.length - 1],
            span = max - min,
            runs = [];
        // Zoom into a 5% window at three positions, then back out to the full range.
        for (const f of [0.9, 0.5, 0.1]) {
            const t0 = performance.now();
            await a.zoomTo(handle, min + span * f, min + span * (f + 0.05));
            await nextFrame();
            runs.push(performance.now() - t0);
        }
        const t1 = performance.now();
        await a.zoomTo(handle, min, max);
        await nextFrame();
        res.zoomInMs = Math.round(runs.reduce((x, y) => x + y, 0) / runs.length);
        res.zoomOutMs = Math.round(performance.now() - t1);
        setTiming(
            lib,
            `render ${res.renderMs} ms | zoom ${res.zoomInMs} ms | reset ${res.zoomOutMs} ms`
        );
    }

    async function run() {
        buildChrome();
        // Render libraries one at a time so timings do not interfere.
        for (const lib of state.libs) await renderOne(lib);
        window.__results.done = true;
    }

    CS.harness = {state, run, nextFrame};
    window.addEventListener('DOMContentLoaded', run);
})();
