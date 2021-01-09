/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {checkVersion} from '@xh/hoist/utils/js/VersionUtils';

export let Highcharts = null;

const MIN_VERSION = '8.1.1';
const MAX_VERSION = '8.*.*';

/**
 * Expose application versions of Highcharts to Hoist.
 * Typically called in the Bootstrap.js. of the application.
 */
export function installHighcharts(HighchartsImpl) {
    const {version} = HighchartsImpl;
    if (!checkVersion(version, MIN_VERSION, MAX_VERSION)) {
        console.error(
            `This version of Hoist requires a Highcharts version between ${MIN_VERSION} and ` +
            `${MAX_VERSION}. Version ${version} detected. Highcharts will be unavailable.`
        );
        return;
    }

    HighchartsImpl.setOptions({
        global: {
            useUTC: false
        },
        lang: {
            thousandsSep: ','
        }
    });
    Highcharts = HighchartsImpl;
}