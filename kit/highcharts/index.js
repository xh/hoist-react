/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import Highcharts from 'highcharts/highstock';
import highchartsExporting from 'highcharts/modules/exporting';
import highchartsOfflineExporting from 'highcharts/modules/offline-exporting';
import highchartsExportData from 'highcharts/modules/export-data';
import highchartsTree from 'highcharts/modules/treemap';
import highchartsHeatmap from 'highcharts/modules/heatmap';

Highcharts.setOptions({
    global: {
        useUTC: false
    },
    lang: {
        thousandsSep: ','
    }
});

highchartsExporting(Highcharts);
highchartsOfflineExporting(Highcharts);
highchartsExportData(Highcharts);
highchartsTree(Highcharts);
highchartsHeatmap(Highcharts);

export {Highcharts};