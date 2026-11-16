// Headless runner: open gallery pages in the local Chrome, wait for every adapter to finish,
// print timings + console errors as JSON, and save screenshots.
//
//   node scripts/shoot.mjs [--chart navRebase,candles] [--theme dark,light] [--libs highcharts]
//                          [--out shots] [--hover] [--points 250000] [--headful]
//
// --hover moves the real mouse across each chart and reports the mean time to the next
// painted frame (a proxy for crosshair/tooltip latency).
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import puppeteer from 'puppeteer-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
    args = Object.fromEntries(
        process.argv.slice(2).reduce((acc, a, i, arr) => {
            if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
            return acc;
        }, [])
    ),
    charts = (args.chart || 'navRebase,candles,perfDrawdown,stress,corrHeatmap,returnsHist,flowsSankey').split(','),
    themes = (args.theme || 'dark').split(','),
    out = resolve(root, args.out || 'shots'),
    chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

mkdirSync(out, {recursive: true});
const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: !args.headful,
    args: ['--allow-file-access-from-files', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync'],
    defaultViewport: {width: 1680, height: 760, deviceScaleFactor: 1}
});
const all = [];
for (const theme of themes) {
    for (const chart of charts) {
        const page = await browser.newPage(),
            errors = [];
        page.on('console', m => ['error', 'warning'].includes(m.type()) && errors.push(`${m.type()}: ${m.text()}`.slice(0, 300)));
        page.on('pageerror', e => errors.push('pageerror: ' + e.message));
        const q = new URLSearchParams({chart, theme});
        if (args.libs) q.set('libs', args.libs);
        if (args.points) q.set('points', args.points);
        if (args.perf) q.set('perf', args.perf);
        await page.goto(pathToFileURL(join(root, 'gallery.html')).href + '?' + q, {waitUntil: 'load'});
        await page.waitForFunction('window.__results && window.__results.done', {timeout: 180000});
        const results = await page.evaluate('window.__results');
        if (args.hover) {
            for (const lib of Object.keys(results.libs)) {
                const box = await (await page.$('#host-' + lib))?.boundingBox();
                if (!box || results.libs[lib].gap) continue;
                const times = [];
                for (let i = 0; i < 24; i++) {
                    const x = box.x + box.width * (0.12 + (0.76 * i) / 23),
                        y = box.y + box.height * 0.45,
                        t0 = Date.now();
                    await page.mouse.move(x, y);
                    await page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
                    times.push(Date.now() - t0);
                }
                times.sort((a, b) => a - b);
                results.libs[lib].hoverMedianMs = times[Math.floor(times.length / 2)];
                results.libs[lib].hoverP90Ms = times[Math.floor(times.length * 0.9)];
                await page.mouse.move(0, 0);
            }
        }
        const file = join(out, `${chart}-${theme}${args.libs ? '-' + args.libs.replace(/,/g, '_') : ''}.png`);
        await new Promise(r => setTimeout(r, 400));
        await page.screenshot({path: file});
        all.push({chart, theme, results: results.libs, errors: errors.slice(0, 12), screenshot: relative(process.cwd(), file)});
        await page.close();
    }
}
await browser.close();
const json = JSON.stringify(all, null, 2);
if (args.json) writeFileSync(resolve(root, args.json), json);
console.log(json);
