import puppeteer from 'puppeteer-core';
import {mkdirSync} from 'node:fs';

const out = process.argv[2],
    lib = process.argv[3] || 'highcharts',
    theme = process.argv[4] || 'dark';
mkdirSync(out, {recursive: true});
const b = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--allow-file-access-from-files'],
    defaultViewport: {width: 1500, height: 900}
});
const p = await b.newPage(),
    errs = [];
p.on('console', m => ['error', 'warning'].includes(m.type()) && errs.push(m.text().slice(0, 200)));
p.on('pageerror', e => errs.push('pageerror ' + e.message));
await p.goto(new URL(`../control.html?lib=${lib}&theme=${theme}`, import.meta.url).href);
await new Promise(r => setTimeout(r, 1500));
await p.screenshot({path: `${out}/0-initial-${lib}.png`});
const n = (await p.$$('button.agent')).length;
for (let i = 0; i < n; i++) {
    const bs = await p.$$('button.agent');
    await bs[i].click();
    await new Promise(r => setTimeout(r, 1200));
    await p.screenshot({path: `${out}/${i + 1}-agent-${lib}.png`});
}
console.log(JSON.stringify({errs, spec: await p.evaluate(() => CS.control.getSpec())}, null, 1).slice(0, 3000));
await b.close();
