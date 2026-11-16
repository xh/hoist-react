// Copy the UMD (classic-script) builds of each library into ./vendor so every page
// works when opened straight from the file system - no bundler, no dev server.
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'),
    nm = join(root, 'node_modules'),
    out = join(root, 'vendor');

const files = {
    highcharts: [
        'highstock.js',
        'highcharts-more.js',
        'modules/heatmap.js',
        'modules/coloraxis.js',
        'modules/histogram-bellcurve.js',
        'modules/sankey.js',
        'modules/networkgraph.js',
        'modules/treemap.js',
        'modules/boost.js',
        'modules/annotations.js',
        'modules/drag-panes.js',
        'modules/price-indicator.js',
        'modules/exporting.js',
        'indicators/indicators-all.js'
    ],
    'ag-charts-enterprise': ['dist/umd/ag-charts-enterprise.min.js'],
    echarts: ['dist/echarts.min.js']
};

const versions = {};
for (const [pkg, list] of Object.entries(files)) {
    versions[pkg] = JSON.parse(readFileSync(join(nm, pkg, 'package.json'), 'utf8')).version;
    for (const f of list) {
        const dest = join(out, pkg, f);
        mkdirSync(dirname(dest), {recursive: true});
        copyFileSync(join(nm, pkg, f), dest);
    }
}
writeFileSync(join(out, 'versions.js'), `window.CS = window.CS || {}; CS.versions = ${JSON.stringify(versions)};\n`);
console.log('Vendored', versions);
