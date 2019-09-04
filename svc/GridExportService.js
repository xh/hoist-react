/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {XH, HoistService} from '@xh/hoist/core';
import {ExportFormat} from '@xh/hoist/cmp/grid';
import {fmtDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {throwIf} from '@xh/hoist/utils/js';
import download from 'downloadjs';
import {castArray, isArray, isFunction, isNil, isString, uniq} from 'lodash';

/**
 * Exports Grid data to either Excel or CSV via Hoist's server-side export capabilities.
 * @see HoistColumn API for options to control exported values and formats.
 */
@HoistService
export class GridExportService {

    /**
     * Export a GridModel to a file. Typically called via `GridModel.exportAsync()`.
     *
     * @param {GridModel} gridModel - GridModel to export.
     * @param {Object} [options] - Export options.
     * @param {(string|function)} [options.filename] - name for export file, or closure to generate.
     *      Do not include the file extension - that will be appended based on the specified type.
     * @param {string} [options.type] - type of export - one of ['excel', 'excelTable', 'csv'].
     * @param {(string|string[])} [options.columns] - columns to include in export. Supports tokens
     *      'VISIBLE' (default - all currently visible cols), 'ALL' (all columns), or specific
     *      colIds to include (can be used in conjunction with VISIBLE to export all visible and
     *      enumerated columns).
     */
    async exportAsync(gridModel, {
        filename = 'export',
        type = 'excelTable',
        columns = 'VISIBLE'
    } = {}) {
        throwIf(!gridModel, 'GridModel required for export');
        throwIf(!isString(filename) && !isFunction(filename), 'Export filename must be either a string or a closure');
        throwIf(!['excel', 'excelTable', 'csv'].includes(type), `Invalid export type "${type}". Must be either "excel", "excelTable" or "csv"`);
        throwIf(!isArray(columns) && !['ALL', 'VISIBLE'].includes(columns), 'Invalid columns config - must be "ALL", "VISIBLE" or an array of colIds');

        if (isFunction(filename)) filename = filename(gridModel);

        const exportColumns = this.getExportableColumns(gridModel, columns),
            records = gridModel.store.rootRecords,
            meta = this.getColumnMetadata(exportColumns),
            rows = [];

        if (records.length === 0) {
            XH.toast({message: 'No data found to export', intent: 'danger', icon: Icon.warning()});
            return;
        }

        rows.push(this.getHeaderRow(exportColumns, type));
        rows.push(...this.getRecordRowsRecursive(gridModel, records, exportColumns, 0));

        // Show separate 'started' and 'complete' toasts for larger (i.e. slower) exports.
        // We use cell count as a heuristic for speed - this may need to be tweaked.
        if (rows.length * exportColumns.length > 3000) {
            XH.toast({
                message: 'Your export is being prepared and will download when complete...',
                intent: 'primary',
                icon: Icon.download()
            });
        }

        // POST the data as a file (using multipart/form-data) to work around size limits when using application/x-www-form-urlencoded.
        // This allows the data to be split into multiple parts and streamed, allowing for larger excel exports.
        // The content of the "file" is a JSON encoded string, which will be streamed and decoded on the server.
        // Note: It may be necessary to set maxFileSize and maxRequestSize in application.groovy to facilitate very large exports.
        const formData = new FormData(),
            params = {filename, type, meta, rows};

        formData.append('params', JSON.stringify(params));
        const response = await XH.fetch({
            url: 'xh/export',
            method: 'POST',
            body: formData,
            // Note: We must explicitly unset Content-Type headers to allow the browser to set it's own multipart/form-data boundary.
            // See https://stanko.github.io/uploading-files-using-fetch-multipart-form-data/ for further explanation.
            headers: {
                'Content-Type': null
            }
        });

        const blob = response.status === 204 ? null : await response.blob(),
            fileExt = this.getFileExtension(type),
            contentType = this.getContentType(type);

        download(blob, `${filename}${fileExt}`, contentType);
        XH.toast({
            message: 'Export complete',
            intent: 'success'
        });
    }

    //-----------------------
    // Implementation
    //-----------------------
    getExportableColumns(gridModel, columns) {
        const toExport = castArray(columns),
            includeAll = toExport.includes('ALL'),
            includeViz = toExport.includes('VISIBLE');

        return gridModel
            .getLeafColumns()
            .filter(col => {
                const {colId, excludeFromExport} = col;
                return (
                    !excludeFromExport &&
                    (
                        includeAll ||
                        toExport.includes(colId) ||
                        (includeViz && gridModel.isColumnVisible(colId))
                    )
                );
            });
    }

    getColumnMetadata(columns) {
        return columns.map(column => {
            const {field, exportWidth: width} = column;
            let {exportFormat} = column, type = null;

            // If using the function form to support per-cell formats, replace with
            // ExportFormat.DEFAULT as a placeholder at the column level. The cell-level data for
            // this column will be shipped with the calculated formats.
            if (isFunction(exportFormat)) exportFormat = ExportFormat.DEFAULT;

            if (exportFormat === ExportFormat.DATE_FMT) type = 'date';
            if (exportFormat === ExportFormat.DATETIME_FMT) type = 'datetime';
            if (exportFormat === ExportFormat.LONG_TEXT) type = 'longText';

            return {field, type, format: exportFormat, width};
        });
    }

    getHeaderRow(columns, type) {
        const headers = columns.map(it => it.exportName);
        if (type === 'excelTable' && uniq(headers).length !== headers.length) {
            console.warn('Excel tables require unique headers on each column. Consider using the "exportName" property to ensure unique headers.');
        }
        return {data: headers, depth: 0};
    }

    getRecordRowsRecursive(gridModel, records, columns, depth) {
        const {sortBy, treeMode} = gridModel,
            ret = [];

        records = [...records];

        [...sortBy].reverse().forEach(it => {
            const compFn = it.comparator.bind(it),
                direction = it.sort === 'desc' ? -1 : 1;
            records.sort((a, b) => compFn(a[it.colId], b[it.colId]) * direction);
        });

        records.forEach(record => {
            ret.push(this.getRecordRow(gridModel, record, columns, depth));
            if (treeMode && record.children.length) {
                ret.push(...this.getRecordRowsRecursive(gridModel, record.children, columns, depth + 1));
            }
        });

        return ret;
    }

    getRecordRow(gridModel, record, columns, depth) {
        const data = columns.map(it => this.getCellData(gridModel, record, it));
        return {data, depth};
    }

    getCellData(gridModel, record, column) {
        const {field, exportValue} = column;

        // Modify value using exportValue
        let value = record[field];
        if (isString(exportValue) && record[exportValue] !== null) {
            // If exportValue points to a different field
            value = record[exportValue];
        } else if (isFunction(exportValue)) {
            // If export value is a function that transforms the value
            value = exportValue(value);
        }

        if (isNil(value)) return null;

        // Get cell-level format if function form provided
        let {exportFormat} = column,
            cellHasExportFormat = isFunction(exportFormat);

        if (cellHasExportFormat) {
            exportFormat = exportFormat(value, {record, column, gridModel});
        }

        // Enforce date formats expected by server
        if (exportFormat === ExportFormat.DATE_FMT) value = fmtDate(value);
        if (exportFormat === ExportFormat.DATETIME_FMT) value = fmtDate(value, 'YYYY-MM-DD HH:mm:ss');

        value = value.toString();
        return cellHasExportFormat ? {value, format: exportFormat} : value;
    }

    getContentType(type) {
        switch (type) {
            case 'excelTable':
            case 'excel':
                return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            case 'csv':
                return 'text/csv';
        }
    }

    getFileExtension(type) {
        switch (type) {
            case 'excelTable':
            case 'excel':
                return '.xlsx';
            case 'csv':
                return '.csv';
        }
    }
}
