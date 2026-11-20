// Computed styles of every element under body, at rest, on the given routes in both themes, compared
// between the baseline (3001) and the change (3000). Both clients are driven side by side and each
// route is compared as it is read, so memory stays flat. Elements are keyed by document order, so
// run it only where markup is unchanged apart from class names.
// Usage: node restcheck.cjs <app> <route,route,...|all>   (SHOW=n prints the first n differences)
const {chromium} = require('playwright');
const {PROPS} = require('./props.cjs');
const [APP, ROUTES] = process.argv.slice(2);
const SHOW = +process.env.SHOW || 30;

async function open(b, B) {
    const page = await b.newPage({viewport: {width: 1600, height: 1000}});
    await page.goto(B + '/app/');
    await page.evaluate(() => fetch('/api/xh/login', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({username: 'agent@xh.io', password: 'localDevOnly'})}));
    await page.goto(`${B}/${APP}/`);
    await page.waitForFunction(() => window.XH?.appIsRunning, null, {timeout: 120000});
    await page.addStyleTag({content: '*,*::before,*::after{transition:none!important;animation:none!important}'});
    return page;
}

function read(page, route) {
    return page.evaluate(async ([r, props]) => {
        XH.navigate(r);
        await new Promise(res => setTimeout(res, 2500));
        const els = [...document.querySelectorAll('body, body *')].filter(e => !e.closest('.xh-version-bar, .ag-center-cols-viewport, .highcharts-container'));
        return els.map(e => { const cs = getComputedStyle(e), o = [e.tagName]; for (const p of props) o.push(cs.getPropertyValue(p)); return o; });
    }, [route, PROPS]);
}

(async () => {
    const b = await chromium.launch();
    const before = await open(b, 'http://localhost:3001'), after = await open(b, 'http://localhost:3000');
    const routes = ROUTES === 'all' ? await after.evaluate(() => {
        const out = [];
        const walk = (n, pre) => n.children.forEach(c => { const nm = pre ? pre + '.' + c.name : c.name; if (!c.children.length) out.push(nm); walk(c, nm); });
        walk(XH.router.rootNode, '');
        return out.filter(r => !/recordId|docRef/.test(r));
    }) : ROUTES.split(',');
    const skip = new Set((process.env.SKIP || '').split(',').filter(Boolean));
    const todo = routes.filter(r => !skip.has(r));
    let n = 0, total = 0;
    for (const theme of (process.env.THEMES || 'light,dark').split(',')) {
        for (const p of [before, after]) await p.evaluate(t => XH.setTheme(t, false), theme);
        for (const route of todo) {
            await Promise.all([before, after].map(p => p.mouse.move(0, 999)));
            let [x, y] = await Promise.all([read(before, route), read(after, route)]);
            const k = `${theme} ${route}`;
            if (x.length !== y.length) {
                // An earlier route can leave elements behind in one client. Reload both and re-read.
                await Promise.all([before, after].map(async p => {
                    await p.reload();
                    await p.waitForFunction(() => window.XH?.appIsRunning, null, {timeout: 120000});
                    await p.addStyleTag({content: '*,*::before,*::after{transition:none!important;animation:none!important}'});
                    await p.evaluate(t => XH.setTheme(t, false), theme);
                }));
                [x, y] = await Promise.all([read(before, route), read(after, route)]);
            }
            if (x.length !== y.length) { console.log(k, 'element count', x.length, '->', y.length); continue; }
            x.forEach((e, i) => {
                total++;
                for (let j = 1; j < e.length; j++)
                    if (e[j] !== y[i][j]) { n++; if (n <= SHOW) console.log(k, '#' + i, e[0], PROPS[j - 1], e[j], '->', y[i][j]); }
            });
        }
    }
    await b.close();
    console.log(total, 'elements compared,', n, 'property differences,', todo.length, 'routes per theme');
})();
