/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {uniqBy, startCase, padEnd} from 'lodash';

const KEY_DELIMITER = '--',
    PROP_DELIMITER = '_',
    PREFIX = 'xh-export',
    TYPE = 'type',
    ALIGN = 'align',
    COLOR = 'color',
    PRECISION = 'precision',
    LEDGER = 'ledger';

/**
 * Generates an ag-grid cell class that can be interpreted by getAgExcelStyles.
 * Columns with exportCls: false are excluded from the export.
 *
 * @param {string} [opts.type] - either [string\number|boolean]
 * @param {string} [opts.align] - either [left|right|center]
 * @param {string} [opts.color] - font color in hexadecimal format
 * @param {number} [opts.precision] - desired number of decimal places.
 * @param {boolean} [opts.ledger] - set to true to use ledger format.
 */
export function generateExportCls({
    type = null,
    align = null,
    color = null,
    precision = 0,
    ledger = false
} = {}) {
    const parts = [PREFIX];

    if (type) parts.push(createPair(TYPE, type));
    if (align) parts.push(createPair(ALIGN, align));
    if (color) parts.push(createPair(COLOR, color.replace(/\W/g, '')));

    if (type === 'number') {
        if (precision != null) parts.push(createPair(PRECISION, precision));
        if (ledger) parts.push(createPair(LEDGER, true));
    }

    return parts.join(KEY_DELIMITER);
}

/**
 * Generates ag-grid excelStyles based on columns' exportCls
 * @param {Object[]} columns
 */
export function getAgExcelStyles(columns) {
    const styles = [getHeaderStyle()];

    columns.forEach(it => {
        const {exportCls} = it;
        if (exportCls) styles.push(parseExportCls(exportCls));
    });

    return uniqBy(styles, 'id');
}

//---------------
// Implementation
//---------------
function createPair(key, value) {
    return [key, value].join(PROP_DELIMITER);
}

function parseExportCls(exportCls) {
    const [prefix, ...rest] = exportCls.split(KEY_DELIMITER);
    if (prefix !== PREFIX) return;

    // Collect opts
    const opts = {};
    rest.forEach(it => {
        const [key, value] = it.split(PROP_DELIMITER);
        opts[key] = value;
    });

    // Build excel style definition
    const {type, align, color, precision, ledger} = opts,
        ret = {id: exportCls};

    if (type) ret.dataType = type;
    if (align) ret.alignment = {horizontal: startCase(align)};
    if (color) ret.font = {color: `#${color}`};

    if (type === 'number') {
        let format = '#,##0',
            dp = parseInt(precision);

        if (dp) {
            format += '.';
            format = padEnd(format, 6 + dp, '0');
        }

        if (ledger) {
            format = `${format}_);[Red](${format})`;
        }

        ret.numberFormat = {format};
    }

    return ret;
}

function getHeaderStyle() {
    return {
        id: 'header',
        font: {size: 14},
        interior: {
            color: '#CCCCCC',
            pattern: 'Solid'
        },
        borders: {
            borderBottom: {
                color: '#666666',
                lineStyle: 'Continuous',
                weight: 1
            },
            borderLeft: {
                color: '#666666',
                lineStyle: 'None',
                weight: 1
            },
            borderRight: {
                color: '#666666',
                lineStyle: 'None',
                weight: 1
            },
            borderTop: {
                color: '#666666',
                lineStyle: 'None',
                weight: 1
            }
        }
    };
}