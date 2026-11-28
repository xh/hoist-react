// Record computed styles of a component's elements on every route, light and dark, at rest and in
// forced :hover / :active / :focus states. Compare two runs with stylediff.cjs.
//
// Usage: node styles.cjs <outDir> <selector> [routeFilter]
//   selector - elements to record, e.g. '.xh-button, .xh-button-group'. Each element's descendants
//              and its ::before / ::after are recorded too. States are forced on each element
//              matching the first selector in the list, once per distinct context signature.
const {chromium} = require('playwright');
const fs = require('fs');

const [outDir, selector, routeFilter] = process.argv.slice(2);
const path = require('path');
const filter = routeFilter ? new RegExp(routeFilter) : null;
const stateSelector = selector.split(',')[0].trim();
const BASE = process.env.BASE || 'http://localhost:3000';
const STATES = [['hover'], ['active'], ['hover', 'active'], ['focus']];
const SKIP = /recordId|docRef/;

const {PROPS} = require('./props.cjs');

// Runs in the page: tag targets and return styles. At rest, each target's subtree is grouped under
// its context signature, since document order shifts with data. A forced state is keyed by signature.
function collect({selector, props, only}) {
    const clean = c => (c || '').toString().replace(/\bbp6-\S+/g, '').replace(/\s+/g, ' ').trim();
    const sigOf = el =>
        [el, el.parentElement, el.parentElement?.parentElement]
            .map(e => clean(e?.className?.baseVal ?? e?.className))
            .join(' | ') + (el.disabled ? ' :disabled' : '');
    const pick = (el, pseudo) => {
        const cs = getComputedStyle(el, pseudo);
        if (pseudo && (cs.content === 'none' || cs.content === 'normal')) return null;
        const o = {};
        for (const p of props) o[p] = cs.getPropertyValue(p);
        return o;
    };
    const out = {};
    const targets = [...document.querySelectorAll(selector)].filter(
        el => !el.closest('.xh-version-bar')
    );
    targets.forEach((el, i) => {
        const key = `t${i}`;
        el.setAttribute('data-sk', key);
        if (only && only !== key) return;
        const sub = {};
        const walk = (node, path, depth) => {
            sub[path] = pick(node, null);
            for (const ps of ['::before', '::after']) {
                const s = pick(node, ps);
                if (s) sub[path + ps] = s;
            }
            if (depth < 4)
                [...node.children].forEach((c, j) => walk(c, `${path}>${j}:${c.tagName}`, depth + 1));
        };
        walk(el, el.tagName, 0);
        if (only) Object.assign(out, sub);
        else (out[sigOf(el)] ??= []).push(sub);
    });
    return out;
}

function signatures(stateSelector) {
    const clean = c => (c || '').toString().replace(/\bbp6-\S+/g, '').replace(/\s+/g, ' ').trim();
    const seen = new Set(), out = [];
    document.querySelectorAll(`${stateSelector}[data-sk]`).forEach(el => {
        const sig = [el, el.parentElement, el.parentElement?.parentElement]
            .map(e => clean(e?.className?.baseVal ?? e?.className))
            .join(' | ') + (el.disabled ? ' :disabled' : '');
        if (seen.has(sig)) return;
        seen.add(sig);
        out.push({key: el.getAttribute('data-sk'), sig});
    });
    return out;
}

async function settle(page) {
    await page.waitForLoadState('networkidle', {timeout: 15000}).catch(() => {});
    await page
        .waitForFunction(() => !document.querySelector('.xh-mask, .xh-loading-indicator'), null, {
            timeout: 10000
        })
        .catch(() => {});
    await page.waitForTimeout(1000);
}

async function runJob(browser, app, theme, summary) {
    const ctx = await browser.newContext({viewport: {width: 1600, height: 1000}});
    const page = await ctx.newPage();
    await page.goto(`${BASE}/app/`);
    await page.evaluate(() =>
        fetch('/api/xh/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: new URLSearchParams({username: 'agent@xh.io', password: 'localDevOnly'})
        })
    );
    await page.goto(`${BASE}/${app}/`);
    await page.waitForFunction(() => window.XH?.appIsRunning, null, {timeout: 120000});
    await page.evaluate(t => XH.setTheme(t, false), theme);
    await page.addStyleTag({content: '*,*::before,*::after{transition:none!important;animation:none!important}'});
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    let routes = await page.evaluate(() => {
        const out = [];
        const walk = (n, pre) => {
            for (const c of n.children) {
                const nm = pre ? pre + '.' + c.name : c.name;
                if (!c.children.length) out.push(nm);
                walk(c, nm);
            }
        };
        walk(XH.router.rootNode, '');
        return out;
    });
    routes = routes.filter(r => !SKIP.test(r) && (!filter || filter.test(`${app}/${r}`)));
    for (const route of routes) {
        const id = `${app}/${route}/${theme}`;
        try {
            await page.evaluate(r => XH.navigate(r), route);
            await settle(page);
            await page.mouse.move(0, 999);
            const rest = await page.evaluate(collect, {selector, props: PROPS});
            const states = {};
            const sigs = await page.evaluate(signatures, stateSelector);
            const {root} = await cdp.send('DOM.getDocument', {depth: 0});
            for (const {key, sig} of sigs) {
                const {nodeId} = await cdp.send('DOM.querySelector', {
                    nodeId: root.nodeId,
                    selector: `[data-sk="${key}"]`
                });
                if (!nodeId) continue;
                for (const st of STATES) {
                    await cdp.send('CSS.forcePseudoState', {nodeId, forcedPseudoClasses: st});
                    const s = await page.evaluate(collect, {selector, props: PROPS, only: key});
                    states[`${sig} @${st.join('+')}`] = s;
                }
                await cdp.send('CSS.forcePseudoState', {nodeId, forcedPseudoClasses: []});
            }
            write(id, {rest, states});
        } catch (e) {
            write(id, {error: e.message.slice(0, 200)});
            summary.errors.push(`${id}: ${e.message.slice(0, 200)}`);
        }
        summary.count++;
    }
    await ctx.close();
}

function write(id, data) {
    fs.writeFileSync(path.join(outDir, id.replace(/\//g, '__') + '.json'), JSON.stringify(data));
}

(async () => {
    fs.mkdirSync(outDir, {recursive: true});
    const browser = await chromium.launch();
    const summary = {count: 0, errors: []};
    const jobs = [];
    for (const app of ['app', 'admin'])
        for (const theme of ['light', 'dark']) jobs.push(runJob(browser, app, theme, summary));
    await Promise.all(jobs);
    await browser.close();
    console.log(`${summary.count} route/themes, ${summary.errors.length} errors`);
    summary.errors.slice(0, 5).forEach(e => console.log(e));
})();
