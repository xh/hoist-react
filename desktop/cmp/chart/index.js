/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import Highcharts from 'highcharts/highstock';

Highcharts.setOptions({
    global: {
        useUTC: false
    },
    lang: {
        thousandsSep: ','
    }
});

export * from './ChartModel';
export * from './Chart';
