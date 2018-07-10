/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {ToastManager} from '@xh/hoist/toast';
import {fmtDate} from '@xh/hoist/format';
import {orderBy, uniq, isString, isFunction} from 'lodash';
import download from 'downloadjs';


/**
 * Cell formats used in excel exports.
 * Can be applied to columns via the 'exportFormat' prop.
 */
export const exportFormats = {
    DEFAULT:            'General',

    // Numbers
    NUM:                '0',
    NUM_1DP:            '0.0',
    NUM_2DP:            '0.00',
    NUM_4DP:            '0.0000',

    NUM_DELIMITED:      '#,##0',
    NUM_DELIMITED_1DP:  '#,##0.0',
    NUM_DELIMITED_2DP:  '#,##0.00',
    NUM_DELIMITED_4DP:  '#,##0.0000',

    LEDGER:             '#,##0_);(#,##0)',
    LEDGER_1DP:         '#,##0.0_);(#,##0.0)',
    LEDGER_2DP:         '#,##0.00_);(#,##0.00)',
    LEDGER_4DP:         '#,##0.0000_);(#,##0.0000)',

    LEDGER_COLOR:       '#,##0_);[Red](#,##0)',
    LEDGER_COLOR_1DP:   '#,##0.0_);[Red](#,##0.0)',
    LEDGER_COLOR_2DP:   '#,##0.00_);[Red](#,##0.00)',
    LEDGER_COLOR_4DP:   '#,##0.0000_);[Red](#,##0.0000)',

    // Rounding suffixes - these can be appended to the patterns above to round numbers
    THOUSANDS:          ',"k"',
    MILLIONS:           ',,"m"',
    BILLIONS:           ',,,"b"',

    // Percent
    PCT:                '0%',
    PCT_1DP:            '0.0%',
    PCT_2DP:            '0.00%',
    PCT_4DP:            '0.0000%',

    // Dates
    DATE_FMT:           'yyyy-mm-dd',
    DATETIME_FMT:       'yyyy-mm-dd h:mm AM/PM'
};

/**
 * Exports a grid to either Excel or CSV.
 *
 * Columns can install the following properties to manage how they are exported:
 *
 *      {string} exportName - specified title to appear at top of grid
 *      {string|function} exportValue - modifies the value used in export
 *              If string, can be used to point to a different field on the record
 *              If function, can be used to transform the value
 *      {exportFormat} - Excel export format pattern.
 */
export function exportToFile(gridModel, filename, filetype) {
    const {store, sortBy, columns} = gridModel,
        colIds = sortBy.map(it => it.colId),
        sorts = sortBy.map(it => it.sort),
        records = orderBy(store.records, colIds, sorts),
        meta = getColumnMetadata(columns),
        rows = [];

    if (records.length === 0) {
        ToastManager.show({message: 'No data found to export', intent: 'danger'});
        return;
    }

    rows.push(getHeaderRow(columns, filetype));
    records.forEach(record => {
        rows.push(getRecordRow(record, columns));
    });

    XH.fetch({
        url: 'hoistImpl/export',
        params: {
            filename: filename,
            filetype: filetype,
            rows: JSON.stringify(rows),
            meta: JSON.stringify(meta)
        }
    }).then(response => {
        return response.status === 204 ? null : response.blob();
    }).then(blob => {
        download(blob, filename);
        ToastManager.show({message: 'Export complete', intent: 'success'});
    });
}

//-----------------------
// Implementation
//-----------------------
function getColumnMetadata(columns) {
    return columns.map(column => {
        const {field, exportFormat} = column;

        let type = null;
        if (exportFormat === exportFormats.DATE_FMT) type = 'date';
        if (exportFormat === exportFormats.DATETIME_FMT) type = 'datetime';

        return {field, type, format: exportFormat};
    });
}

function getHeaderRow(columns, filetype) {
    const headers = columns.map(it => it.exportName);
    if (filetype === 'excelTable' && uniq(headers).length !== headers.length) {
        console.warn('Excel tables require unique headers on each column. Consider using the "exportName" property to ensure unique headers.');
    }
    return {data: headers, depth: 0};
}

function getRecordRow(record, columns) {
    const data = columns.map(column => {
        return getCellData(record, column);
    });
    return {data, depth: 0};
}

function getCellData(record, column) {
    const {field, exportValue, exportFormat} = column;

    // Modify value using exportValue
    let value = record[field];
    if (isString(exportValue) && record[exportValue] !== null) {
        // If exportValue points to a different field
        value = record[exportValue];
    } else if (isFunction(exportValue)) {
        // If export value is a function that transforms the value
        value = exportValue(value);
    }

    if (value === null) return null;

    // Enforce date formats expected by server
    if (exportFormat === exportFormats.DATE_FMT) value = fmtDate(value);
    if (exportFormat === exportFormats.DATETIME_FMT) value = fmtDate(value, 'YYYY-MM-DD HH:mm:ss');

    return value.toString();
}