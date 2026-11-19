// Computed styles of every element under body, at rest, on the given routes in both themes, compared
// between the baseline (3001) and the change (3000). Elements are keyed by document order, so run it
// only where markup is unchanged apart from class names. Usage: node restcheck.cjs app route,route...
const {chromium} = require('playwright');
const {PROPS} = require('./props.cjs');
const [APP, ROUTES] = process.argv.slice(2);
(async () => {
    const b = await chromium.launch();
    const out = {};
    for (const B of ['http://localhost:3001', 'http://localhost:3000']) {
        const page = await b.newPage({viewport: {width: 1600, height: 1000}});
        await page.goto(B + '/app/');
        await page.evaluate(() => fetch('/api/xh/login', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({username: 'agent@xh.io', password: 'localDevOnly'})}));
        await page.goto(`${B}/${APP}/`);
        await page.waitForFunction(() => window.XH?.appIsRunning, null, {timeout: 120000});
        await page.addStyleTag({content: '*,*::before,*::after{transition:none!important;animation:none!important}'});
        for (const theme of ['light', 'dark']) {
            await page.evaluate(t => XH.setTheme(t, false), theme);
            for (const route of ROUTES.split(',')) {
                await page.evaluate(r => XH.navigate(r), route);
                await page.waitForTimeout(2500);
                await page.mouse.move(0, 999);
                out[`${theme} ${route}`] ??= {};
                out[`${theme} ${route}`][B] = await page.evaluate(props => {
                    const els = [...document.querySelectorAll('body, body *')].filter(e => !e.closest('.xh-version-bar, .ag-center-cols-viewport, .highcharts-container'));
                    return els.map(e => { const cs = getComputedStyle(e), o = {tag: e.tagName}; for (const p of props) o[p] = cs.getPropertyValue(p); return o; });
                }, PROPS);
            }
        }
        await page.close();
    }
    await b.close();
    let n = 0, total = 0;
    for (const [k, v] of Object.entries(out)) {
        const [a, c] = Object.values(v);
        if (a.length !== c.length) { console.log(k, 'element count', a.length, c.length); continue; }
        a.forEach((x, i) => { total++; for (const p in x) if (x[p] !== c[i][p]) { n++; if (n < (+process.env.SHOW || 30)) console.log(k, '#' + i, x.tag, p, x[p], '->', c[i][p]); } });
    }
    console.log(total, 'elements compared,', n, 'property differences');
})();
