// Capture every Toolbox desktop and Admin route, light and dark.
// Usage: node capture.cjs <outDir> [routeFilter]
const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');

const outDir = process.argv[2];
const filter = process.argv[3] ? new RegExp(process.argv[3]) : null;
const BASE = 'http://localhost:3000';
const FIXED_TIME = new Date('2026-06-01T14:00:00Z');

const FREEZE_CSS = `*, *::before, *::after {
  transition: none !important; animation: none !important; caret-color: transparent !important;
}`;

async function seed(ctx) {
    await ctx.addInitScript(() => {
        let s = 42;
        Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    });
}

async function login(page) {
    await page.goto(`${BASE}/app/`);
    await page.evaluate(() =>
        fetch('/api/xh/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: new URLSearchParams({username: 'agent@xh.io', password: 'localDevOnly'})
        })
    );
}

async function settle(page) {
    await page.waitForLoadState('networkidle', {timeout: 15000}).catch(() => {});
    await page
        .waitForFunction(() => !document.querySelector('.xh-mask, .xh-loading-indicator'), null, {
            timeout: 10000
        })
        .catch(() => {});
    await page.waitForTimeout(1200);
}

async function boot(page, app, theme) {
    await page.goto(`${BASE}/${app}/`);
    await page.waitForFunction(() => window.XH?.appIsRunning, null, {timeout: 120000});
    await page.evaluate(t => XH.setTheme(t, false), theme);
    await page.addStyleTag({content: FREEZE_CSS});
    return page.evaluate(() => {
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
}

async function runJob(browser, app, theme) {
    const ctx = await browser.newContext({viewport: {width: 1600, height: 1000}});
    await seed(ctx);
    await ctx.clock.setFixedTime(FIXED_TIME);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await login(page);
    let routes = await boot(page, app, theme);
    if (filter) routes = routes.filter(r => filter.test(`${app}/${r}`));
    for (const route of routes) {
        const file = path.join(outDir, `${app}__${route}__${theme}.png`);
        try {
            await page.evaluate(r => XH.navigate(r), route);
            await settle(page);
            await page.mouse.move(0, 999);
            await page.evaluate(() =>
                document.querySelectorAll('.xh-version-bar__tabid').forEach(el => (el.textContent = 'TABID'))
            );
            await page.screenshot({path: file});
        } catch (e) {
            errors.push(`${route}: ${e.message}`);
        }
    }
    await ctx.close();
    return {app, theme, count: routes.length, errors};
}

(async () => {
    fs.mkdirSync(outDir, {recursive: true});
    const browser = await chromium.launch();
    const jobs = [];
    for (const app of ['app', 'admin'])
        for (const theme of ['light', 'dark']) jobs.push(runJob(browser, app, theme));
    const results = await Promise.all(jobs);
    for (const r of results)
        console.log(`${r.app} ${r.theme}: ${r.count} routes, ${r.errors.length} errors`, r.errors.slice(0, 5));
    await browser.close();
})();
