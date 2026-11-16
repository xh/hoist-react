// Measure minified + gzipped bundle cost of each library for two feature profiles, using
// esbuild with tree-shaking on the libraries' ESM entry points. Run: node scripts/bundle-size.mjs
import {execFileSync} from 'node:child_process';
import {mkdirSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'),
    tmp = join(root, '.bundle-tmp');
mkdirSync(tmp, {recursive: true});

const hc = m => `import 'highcharts/esm/${m}.src.js';`,
    ecTs = ['LineChart', 'BarChart', 'CandlestickChart'],
    ecTsC = ['GridComponent', 'DataZoomComponent', 'TooltipComponent', 'AxisPointerComponent', 'LegendComponent', 'MarkLineComponent', 'MarkAreaComponent', 'MarkPointComponent', 'VisualMapComponent', 'TitleComponent', 'DatasetComponent'],
    ec = (charts, comps) => `import * as echarts from 'echarts/core';
import {${charts.join(',')}} from 'echarts/charts';
import {${comps.join(',')}} from 'echarts/components';
import {CanvasRenderer} from 'echarts/renderers';
echarts.use([${[...charts, ...comps, 'CanvasRenderer'].join(',')}]);
window.x = echarts;`,
    ag = (ent, comm) => `import {AgCharts, ModuleRegistry, ${[...ent, ...comm].join(',')}} from 'ag-charts-enterprise';

ModuleRegistry.registerModules([${[...ent, ...comm].join(',')}]);
window.x = AgCharts;`;

const profiles = {
    'highcharts / time series': `import Highcharts from 'highcharts/esm/highstock.src.js';${['modules/boost', 'modules/annotations', 'indicators/indicators'].map(hc).join('')} window.x = Highcharts;`,
    'highcharts / full spike': `import Highcharts from 'highcharts/esm/highstock.src.js';${['modules/boost', 'modules/annotations', 'indicators/indicators', 'modules/coloraxis', 'modules/heatmap', 'modules/histogram-bellcurve', 'modules/sankey'].map(hc).join('')} window.x = Highcharts;`,
    'echarts / time series': ec(ecTs, ecTsC),
    'echarts / full spike': ec([...ecTs, 'HeatmapChart', 'SankeyChart'], ecTsC),
    'echarts / everything': `import * as echarts from 'echarts'; window.x = echarts;`,
    'agcharts / time series': ag(
        ['FinancialChartModule', 'NavigatorModule', 'ZoomModule', 'CrosshairModule', 'SyncModule', 'CandlestickSeriesModule', 'OrdinalTimeAxisModule', 'AnnotationsModule', 'RangesModule'],
        ['LineSeriesModule', 'AreaSeriesModule', 'BarSeriesModule', 'NumberAxisModule', 'TimeAxisModule', 'LegendModule']
    ),
    'agcharts / full spike': ag(
        ['FinancialChartModule', 'NavigatorModule', 'ZoomModule', 'CrosshairModule', 'SyncModule', 'CandlestickSeriesModule', 'OrdinalTimeAxisModule', 'AnnotationsModule', 'RangesModule', 'HeatmapSeriesModule', 'SankeySeriesModule', 'GradientLegendModule'],
        ['LineSeriesModule', 'AreaSeriesModule', 'BarSeriesModule', 'HistogramSeriesModule', 'NumberAxisModule', 'TimeAxisModule', 'CategoryAxisModule', 'LegendModule']
    ),
    'agcharts / time series, no financial/annotations': ag(
        ['NavigatorModule', 'ZoomModule', 'CrosshairModule', 'SyncModule', 'CandlestickSeriesModule', 'OrdinalTimeAxisModule'],
        ['LineSeriesModule', 'AreaSeriesModule', 'BarSeriesModule', 'NumberAxisModule', 'TimeAxisModule', 'LegendModule']
    ),
    'agcharts / everything': `import {AgCharts, ModuleRegistry, AllEnterpriseModule} from 'ag-charts-enterprise'; ModuleRegistry.registerModules([AllEnterpriseModule]); window.x = AgCharts;`
};

const rows = [];
for (const [name, src] of Object.entries(profiles)) {
    const entry = join(tmp, name.replace(/\W+/g, '_') + '.mjs'),
        out = entry.replace('.mjs', '.out.js');
    writeFileSync(entry, src);
    try {
        execFileSync('npx', ['--yes', 'esbuild@0.28.2', entry, '--bundle', '--minify', '--format=iife', '--log-level=error', `--outfile=${out}`], {cwd: root, stdio: ['ignore', 'ignore', 'pipe']});
        const buf = readFileSync(out);
        rows.push({profile: name, minKB: Math.round(statSync(out).size / 1024), gzipKB: Math.round(gzipSync(buf, {level: 9}).length / 1024)});
    } catch (e) {
        rows.push({profile: name, error: String(e.stderr || e).slice(0, 300)});
    }
}
rmSync(tmp, {recursive: true, force: true});
console.table(rows);
writeFileSync(join(root, 'bundle-sizes.json'), JSON.stringify(rows, null, 2));
