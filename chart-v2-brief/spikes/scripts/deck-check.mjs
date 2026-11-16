// Screenshot every slide of ../index.html in one theme, and report console errors.
//   node scripts/deck-check.mjs <outDir> [dark|light] [width] [height]
import {mkdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import puppeteer from 'puppeteer-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..'),
    [out, theme = 'dark', w = '1600', h = '960'] = process.argv.slice(2);
mkdirSync(out, {recursive: true});
const b = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--allow-file-access-from-files'],
    defaultViewport: {width: +w, height: +h}
});
const p = await b.newPage(),
    errs = [];
p.on('console', m => m.type() === 'error' && !m.text().includes('*') && errs.push(m.text().slice(0, 200)));
p.on('pageerror', e => errs.push('pageerror ' + e.message));
await p.evaluateOnNewDocument(t => localStorage.setItem('xh-chart-v2-theme', t), theme);
const url = pathToFileURL(join(root, 'index.html')).href;
await p.goto(url + '#1');
const n = await p.evaluate(() => document.querySelectorAll('.slide').length);
for (let i = 1; i <= n; i++) {
    await p.goto(url + '#' + i);
    await new Promise(r => setTimeout(r, i === 1 || [7, 9, 13].includes(i) ? 3500 : 600));
    await p.screenshot({path: join(out, `slide-${String(i).padStart(2, '0')}-${theme}.png`)});
}
console.log(JSON.stringify({slides: n, errs}, null, 1));
await b.close();
