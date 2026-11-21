// Explain which rules set given properties on an element.
// Usage: node why.cjs <app> <route> <theme> <cssSelector> <prop,prop> [forcedStates]
const {chromium} = require('playwright');
const [app, route, theme, selector, propList, forced] = process.argv.slice(2);
const props = propList.split(',');
(async () => {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({viewport: {width: 1600, height: 1000}});
    const page = await ctx.newPage();
    await page.goto((process.env.BASE || 'http://localhost:3000') + '/app/');
    await page.evaluate(() =>
        fetch('/api/xh/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: new URLSearchParams({username: 'agent@xh.io', password: 'localDevOnly'})
        })
    );
    await page.goto(`${process.env.BASE || 'http://localhost:3000'}/${app}/`);
    await page.waitForFunction(() => window.XH?.appIsRunning, null, {timeout: 120000});
    await page.evaluate(t => XH.setTheme(t, false), theme);
    await page.evaluate(r => XH.navigate(r), route);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const {root} = await cdp.send('DOM.getDocument', {depth: 0});
    const {nodeIds} = await cdp.send('DOM.querySelectorAll', {nodeId: root.nodeId, selector});
    console.log(`${nodeIds.length} matches; explaining the first`);
    const nodeId = nodeIds[0];
    if (forced) await cdp.send('CSS.forcePseudoState', {nodeId, forcedPseudoClasses: forced.split('+')});
    const {outerHTML} = await cdp.send('DOM.getOuterHTML', {nodeId});
    console.log(outerHTML.slice(0, 300));
    const m = await cdp.send('CSS.getMatchedStylesForNode', {nodeId});
    for (const {rule, matchingSelectors} of m.matchedCSSRules.reverse()) {
        const decls = rule.style.cssProperties.filter(p => props.includes(p.name) && !p.disabled);
        if (!decls.length) continue;
        const sels = matchingSelectors.map(i => rule.selectorList.selectors[i]);
        const spec = sels.map(s => s.specificity ? `(${s.specificity.a},${s.specificity.b},${s.specificity.c})` : '');
        console.log(`\n${sels.map((s, i) => `${s.text} ${spec[i]}`).join('\n')}`);
        for (const d of decls) console.log(`    ${d.name}: ${d.value}${d.important ? ' !important' : ''}`);
    }
    await browser.close();
})();
