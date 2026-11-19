// Forced states on every element matching a selector, keyed by route and index.
// Usage: node statecheck.cjs '<selector>' route[,route...]
const [SEL, ROUTES] = process.argv.slice(2);
const {chromium} = require('playwright');
const {PROPS} = require('./props.cjs');
(async () => {
    const out = {};
    const b = await chromium.launch();
    for (const B of ['http://localhost:3001', 'http://localhost:3000']) {
        const page = await b.newPage({viewport: {width: 1600, height: 1000}});
        await page.goto(B + '/app/');
        await page.evaluate(() => fetch('/api/xh/login', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({username: 'agent@xh.io', password: 'localDevOnly'})}));
        await page.goto(B + '/app/');
        await page.waitForFunction(() => window.XH?.appIsRunning, null, {timeout: 120000});
        await page.addStyleTag({content: '*,*::before,*::after{transition:none!important}'});
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
        for (const theme of ['light', 'dark']) {
            await page.evaluate(t => XH.setTheme(t, false), theme);
            for (const route of ROUTES.split(',')) {
                await page.evaluate(r => XH.navigate(r), route);
                await page.waitForTimeout(2500);
                const {root} = await cdp.send('DOM.getDocument', {depth: 0});
                const {nodeIds} = await cdp.send('DOM.querySelectorAll', {nodeId: root.nodeId, selector: SEL});
                for (const [i, nodeId] of nodeIds.entries()) {
                    for (const st of (process.env.REST ? [[]] : [[], ['hover'], ['active'], ['focus']])) {
                        await cdp.send('CSS.forcePseudoState', {nodeId, forcedPseudoClasses: st});
                        const v = await page.evaluate(([i, props, sel]) => {
                            const el = document.querySelectorAll(sel)[i];
                            const cs = getComputedStyle(el), o = {tag: el.tagName};
                            for (const p of props) o[p] = cs.getPropertyValue(p);
                            return o;
                        }, [i, PROPS, SEL]);
                        ((out[`${theme} ${route} #${i} ${st.join('+') || 'rest'}`] ??= {})[B] = v);
                    }
                    await cdp.send('CSS.forcePseudoState', {nodeId, forcedPseudoClasses: []});
                }
            }
        }
        await page.close();
    }
    await b.close();
    let n = 0;
    for (const [k, v] of Object.entries(out)) {
        const [a, c] = Object.values(v);
        if (!a || !c) { console.log('missing', k); continue; }
        for (const p in a) if (a[p] !== c[p]) { n++; if (n < (+process.env.SHOW || 25)) console.log(k, p, a[p], '->', c[p]); }
    }
    console.log(Object.keys(out).length, 'element states compared,', n, 'property differences');
})();
