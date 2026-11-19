// Record computed styles of open popovers and tooltips, light and dark. Compare two runs with
// stylediff.cjs.
//
// Usage: node popups.cjs <outDir> [scenarioRegex]   (BASE env var picks the server)
//
// Each scenario opens one popover or dialog in Toolbox and records every element in the open popover
// panels, their backdrops, the open target and any dialog overlay. Toolbox shows no intent or compact tooltip, so the tooltip
// scenario clones the open tooltip once per variant and gives each clone the modifier classes under
// both names (`bp6-intent-danger xh-tooltip--intent-danger`), so each build styles the clone as it
// would style its own markup.
const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');
const {PROPS} = require('./props.cjs');

const [outDir, only] = process.argv.slice(2);
const BASE = process.env.BASE || 'http://localhost:3000';

const click = sel => async page => {
    await page.locator(sel).first().click({force: true});
};
const SCENARIOS = [
    {name: 'picker', route: 'default.forms.picker', open: click('.xh-picker__trigger:not(:disabled):visible')},
    {name: 'iconPicker', route: 'default.forms.iconPicker', open: click('.xh-icon-picker__trigger')},
    {name: 'groupingChooser', route: 'default.grids.groupingChooser', open: click('.xh-grouping-chooser .xh-popover__target-wrapper button, .xh-grouping-chooser-button')},
    {name: 'dateRange', route: 'default.components.dateRangePicker', open: click('.xh-date-range-picker .xh-popover__target-wrapper button, .xh-date-range-picker__trigger')},
    {name: 'menuButton', route: 'default.layout.toolbars', open: page => page.getByRole('button', {name: 'Menu Button'}).first().click()},
    ...[
        ['alert', () => void XH.alert({title: 'Alert', message: 'Something happened.'})],
        ['confirm', () => void XH.confirm({title: 'Confirm', message: 'Proceed?', confirmProps: {text: 'Yes', intent: 'danger'}})],
        ['prompt', () => void XH.prompt({title: 'Prompt', message: 'Name?'})],
        ['exception', () => void XH.handleException(new Error('Test failure'), {showAsError: true})]
    ].map(([name, fn]) => ({
        name,
        route: 'default.home',
        open: async page => {
            await page.evaluate(fn);
            await page.waitForSelector('.xh-dialog');
        }
    })),
    {
        name: 'toasts',
        route: 'default.home',
        open: async page => {
            await page.evaluate(() => {
                const t = (position, intent, extra) =>
                    XH.toast({message: `${intent ?? 'none'} ${position}`, position, intent, timeout: 60000, ...extra});
                t('top', 'success');
                t('top-left', 'primary');
                t('top-right', 'warning');
                t('bottom', null);
                t('bottom-left', 'danger', {actionButtonProps: {text: 'Undo'}});
                t('bottom-right', 'primary', {actionButtonProps: {text: 'View'}});
            });
            await page.waitForSelector('.xh-toast');
        }
    },
    {
        name: 'tooltip',
        route: 'default.home',
        open: async page => {
            await page.locator('.xh-appbar button[aria-label=Refresh]').hover();
            await page.waitForSelector('.xh-tooltip', {timeout: 5000});
            await page.evaluate(() => {
                const tip = document.querySelector('.xh-tooltip').closest('.xh-popover__floating');
                const variants = {
                    primary: 'bp6-intent-primary xh-tooltip--intent-primary',
                    danger: 'bp6-intent-danger xh-tooltip--intent-danger',
                    compact: 'bp6-compact xh-tooltip--compact',
                    compactSuccess: 'bp6-compact xh-tooltip--compact bp6-intent-success xh-tooltip--intent-success'
                };
                for (const [name, cls] of Object.entries(variants)) {
                    const clone = tip.cloneNode(true);
                    clone.firstElementChild.className += ' ' + cls;
                    clone.setAttribute('data-variant', name);
                    tip.parentElement.appendChild(clone);
                }
            });
        }
    }
];

function collect(props) {
    const pick = (el, pseudo) => {
        const cs = getComputedStyle(el, pseudo);
        if (pseudo && (cs.content === 'none' || cs.content === 'normal')) return null;
        const o = {};
        for (const p of props) o[p] = cs.getPropertyValue(p);
        return o;
    };
    const out = {};
    const roots = [
        ...document.querySelectorAll('.xh-popover__floating, .xh-popover__layer > :not(.xh-popover__floating), .xh-popover__target-wrapper--open, .xh-dialog__overlay, .xh-overlay, .xh-toast-container')
    ];
    roots.forEach((root, i) => {
        const walk = (node, p, depth) => {
            out[`${i}:${p}`] = pick(node, null);
            for (const ps of ['::before', '::after']) {
                const s = pick(node, ps);
                if (s) out[`${i}:${p}${ps}`] = s;
            }
            if (depth < 12) [...node.children].forEach((c, j) => walk(c, `${p}>${j}:${c.tagName}`, depth + 1));
        };
        walk(root, root.tagName, 0);
    });
    return out;
}

(async () => {
    fs.mkdirSync(outDir, {recursive: true});
    const browser = await chromium.launch();
    for (const theme of ['light', 'dark']) {
        // One page per theme, reloaded between scenarios: a fresh context per scenario costs a
        // login and a cold app start each time.
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
        for (const sc of SCENARIOS.filter(s => !only || new RegExp(only).test(s.name))) {
            await page.goto(`${BASE}/app/`);
            await page.waitForFunction(() => window.XH?.appIsRunning, null, {timeout: 120000});
            await page.evaluate(t => XH.setTheme(t, false), theme);
            await page.addStyleTag({content: '*,*::before,*::after{transition:none!important;animation:none!important}'});
            await page.evaluate(r => XH.navigate(r), sc.route);
            await page.waitForLoadState('networkidle', {timeout: 15000}).catch(() => {});
            await page.waitForTimeout(1000);
            const id = `${sc.name}__${theme}`;
            try {
                await sc.open(page);
                await page.waitForSelector('.xh-popover__floating, .xh-dialog, .xh-toast', {timeout: 5000});
                await page.waitForTimeout(500);
                const rest = await page.evaluate(collect, PROPS);
                fs.writeFileSync(path.join(outDir, id + '.json'), JSON.stringify({rest: {all: [rest]}, states: {}}));
                await page.screenshot({path: path.join(outDir, id + '.png')});
                console.log(id, Object.keys(rest).length, 'elements');
            } catch (e) {
                console.log(id, 'ERROR', e.message.split('\n')[0].slice(0, 160));
            }
        }
        await ctx.close();
    }
    await browser.close();
})();
