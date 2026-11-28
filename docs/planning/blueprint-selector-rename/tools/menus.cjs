// Record computed styles of open menus, light and dark, at rest and with forced :hover / :active /
// :focus on each item. Compare two runs with stylediff.cjs.
//
// Usage: node menus.cjs <outDir>       (BASE env var picks the server, default http://localhost:3000)
//
// Opens the Toolbox Panels menu button with its submenu, the Toolbar menu with headings, and the
// Panels context menu with its submenu. Toolbox renders no primary or warning intent, no
// active item and no item label, so the script clones a plain item for each such state and gives it
// the modifier classes under both names (`bp6-intent-primary xh-menu-item--intent-primary`), so
// each build styles the clone as it would style its own markup.
const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');
const {PROPS} = require('./props.cjs');

const [outDir] = process.argv.slice(2);
const BASE = process.env.BASE || 'http://localhost:3000';
const STATES = [['hover'], ['active'], ['focus']];

const VARIANTS = {
    primary: 'bp6-intent-primary xh-menu-item--intent-primary',
    warning: 'bp6-intent-warning xh-menu-item--intent-warning',
    active: 'bp6-active xh-menu-item--active',
    activeDanger: 'bp6-active xh-menu-item--active bp6-intent-danger xh-menu-item--intent-danger',
    disabledPrimary:
        'bp6-disabled xh-menu-item--disabled bp6-intent-primary xh-menu-item--intent-primary',
    label: null
};

// Runs in the page: add the synthetic variants to the first open menu list.
function addVariants(variants) {
    const list = document.querySelector('.xh-popover__floating [role=menu]');
    const plain = [...list.querySelectorAll(':scope > li > [role=menuitem]')].find(
        a => !a.className.match(/intent|disabled|active/) && !a.getAttribute('aria-haspopup')
    );
    for (const [name, cls] of Object.entries(variants)) {
        const li = plain.parentElement.cloneNode(true);
        const a = li.firstElementChild;
        if (cls) a.className += ' ' + cls;
        else {
            const span = document.createElement('span');
            span.className = 'xh-menu-item__label bp6-menu-item-label';
            span.textContent = 'Ctrl+L';
            a.insertBefore(span, a.querySelector('.xh-menu-item__submenu-icon'));
        }
        a.querySelector('.xh-menu-item__text').textContent = name;
        a.setAttribute('data-variant', name);
        list.appendChild(li);
    }
}

// Runs in the page: styles of every element in each open popover, keyed by popover index and path.
function collect({props, only}) {
    const pick = (el, pseudo) => {
        const cs = getComputedStyle(el, pseudo);
        if (pseudo && (cs.content === 'none' || cs.content === 'normal')) return null;
        const o = {};
        for (const p of props) o[p] = cs.getPropertyValue(p);
        return o;
    };
    const out = {};
    const roots = [
        ...document.querySelectorAll('.xh-context-menu-root'),
        ...[...document.querySelectorAll('.xh-popover__floating')].filter(
            el => !el.closest('.xh-context-menu-root')
        )
    ];
    roots.forEach((root, i) => {
        const walk = (node, p) => {
            if (only && !node.contains(only) && !only.contains(node)) return;
            out[`${i}:${p}`] = pick(node, null);
            for (const ps of ['::before', '::after']) {
                const s = pick(node, ps);
                if (s) out[`${i}:${p}${ps}`] = s;
            }
            [...node.children].forEach((c, j) => walk(c, `${p}>${j}:${c.tagName}`));
        };
        walk(root, root.tagName);
    });
    return out;
}

async function openMenus(page, scenario) {
    if (scenario === 'panels') {
        await page.getByRole('button', {name: 'Menu Button'}).first().click();
        await page.waitForSelector('[role=menu]');
        await page.evaluate(addVariants, VARIANTS);
        await page.getByRole('menuitem', {name: 'Menu Item 5'}).hover();
        await page.waitForFunction(() => document.querySelectorAll('[role=menu]').length > 1);
    } else if (scenario === 'toolbars') {
        await page.getByRole('button', {name: 'Menu Button'}).first().click();
        await page.waitForSelector('[role=menu]');
    } else if (scenario === 'context') {
        await page.getByText('Reading on a screen').click({button: 'right'});
        await page.waitForSelector('.xh-context-menu [role=menu]');
        await page.getByRole('menuitem', {name: 'Text Size Presets'}).hover();
        await page.waitForFunction(() => document.querySelectorAll('[role=menu]').length > 1);
    }
    await page.waitForTimeout(500);
}

const SCENARIOS = {
    panels: 'default.layout.intro',
    toolbars: 'default.layout.toolbars',
    context: 'default.layout.intro'
};

(async () => {
    fs.mkdirSync(outDir, {recursive: true});
    const browser = await chromium.launch();
    for (const theme of ['light', 'dark']) {
        for (const [scenario, route] of Object.entries(SCENARIOS)) {
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
            await page.goto(`${BASE}/app/`);
            await page.waitForFunction(() => window.XH?.appIsRunning, null, {timeout: 120000});
            await page.evaluate(t => XH.setTheme(t, false), theme);
            await page.addStyleTag({content: '*,*::before,*::after{transition:none!important;animation:none!important}'});
            await page.evaluate(r => XH.navigate(r), route);
            await page.waitForLoadState('networkidle').catch(() => {});
            await page.waitForTimeout(1500);
            const id = `${scenario}__${theme}`;
            try {
                await openMenus(page, scenario);
                const rest = await page.evaluate(collect, {props: PROPS});
                const states = {};
                const cdp = await ctx.newCDPSession(page);
                await cdp.send('DOM.enable');
                await cdp.send('CSS.enable');
                const {root} = await cdp.send('DOM.getDocument', {depth: -1, pierce: true});
                const {nodeIds} = await cdp.send('DOM.querySelectorAll', {nodeId: root.nodeId, selector: '[role=menuitem]'});
                for (const [k, nodeId] of nodeIds.entries()) {
                    for (const st of STATES) {
                        await cdp.send('CSS.forcePseudoState', {nodeId, forcedPseudoClasses: st});
                        states[`item${k} @${st}`] = await page.evaluate(
                            ([k, props]) => {
                                const el = document.querySelectorAll('[role=menuitem]')[k];
                                const cs = n => {
                                    const s = getComputedStyle(n), o = {};
                                    for (const p of props) o[p] = s.getPropertyValue(p);
                                    return o;
                                };
                                const o = {item: cs(el)};
                                [...el.querySelectorAll('*')].forEach((c, j) => (o[`d${j}`] = cs(c)));
                                o['::before'] = (() => {
                                    const s = getComputedStyle(el, '::before');
                                    return s.content === 'none' ? null : {bg: s.backgroundColor, content: s.content};
                                })();
                                return o;
                            },
                            [k, PROPS]
                        );
                    }
                    await cdp.send('CSS.forcePseudoState', {nodeId, forcedPseudoClasses: []});
                }
                fs.writeFileSync(path.join(outDir, id + '.json'), JSON.stringify({rest: {all: [rest]}, states}));
                await page.screenshot({path: path.join(outDir, id + '.png')});
                console.log(id, Object.keys(rest).length, 'elements,', nodeIds.length, 'items');
            } catch (e) {
                console.log(id, 'ERROR', e.message.slice(0, 200));
            }
            await ctx.close();
        }
    }
    await browser.close();
})();
