/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {ExcelFormat} from '@xh/hoist/cmp/grid';
import {HoistService, XH} from '@xh/hoist/core';
import {FieldType} from '@xh/hoist/data';
import {fmtDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {isLocalDate, SECONDS} from '@xh/hoist/utils/datetime';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import download from 'downloadjs';
import {StatusCodes} from 'http-status-codes';
import {
    castArray,
    countBy,
    isArray,
    isEmpty,
    isFunction,
    isNil,
    isString,
    pickBy,
    sortBy,
    compact,
    findIndex,
    keys, isBoolean, isDate, isNumber
} from 'lodash';
import {span, a} from '@xh/hoist/cmp/layout';
import {wait} from '@xh/hoist/promise';
import {GridModel, Column} from '@xh/hoist/cmp/grid';
import {StoreRecord} from '@xh/hoist/data';

const {AUTO, BOOL, DATE, INT, LOCAL_DATE, NUMBER, STRING, PWD} = FieldType;

/**
 * Exports Grid data to either Excel or CSV via Hoist's server-side export capabilities.
 * @see Column API for options to control exported values and formats.
 */
export class GridExportService extends HoistService {
    xhImpl = true;

    /**
     * Export a GridModel to a file. Typically called via `GridModel.exportAsync()`.
     */
    async exportAsync(
        gridModel: GridModel,
        {
            filename = 'export',
            type = 'excelTable',
            columns = 'VISIBLE',
            timeout = 30 * SECONDS
        }: ExportOptions = {}
    ) {
        throwIf(!gridModel,
            'GridModel required for export');
        throwIf(!isString(filename) && !isFunction(filename),
            'Export filename must be either a string or a closure');
        throwIf(!['excel', 'excelTable', 'csv'].includes(type),
            `Invalid export type "${type}". Must be either "excel", "excelTable" or "csv"`);
        throwIf(!(isFunction(columns) || isArray(columns) || ['ALL', 'VISIBLE'].includes(columns)),
            'Invalid columns config - must be "ALL", "VISIBLE", an array of colIds, or a function'
        );

        if (isFunction(filename)) filename = filename(gridModel);

        const config = XH.configService.get('xhExportConfig', {}),
            exportColumns = this.getExportableColumns(gridModel, columns),
            summaryRecord = gridModel.store.summaryRecord,
            records = gridModel.store.rootRecords,
            meta = this.getColumnMetadata(exportColumns);

        if (records.length === 0) {
            XH.warningToast('No data found to export.');
            return;
        }

        // If the grid includes a summary row, add it to the export payload as a root-level node.
        const rows = gridModel.showSummary && summaryRecord ?
            [
                this.getHeaderRow(exportColumns, type, gridModel),
                this.getRecordRow(gridModel, summaryRecord, exportColumns, type, 0),
                ...this.getRecordRowsRecursive(gridModel, records, exportColumns, type, 1)
            ] :
            [
                this.getHeaderRow(exportColumns, type, gridModel),
                ...this.getRecordRowsRecursive(gridModel, records, exportColumns, type, 0)
            ];

        // Show separate 'started' toasts for larger (i.e. slower) exports.
        let startToast = null,
            cellCount = rows.length * exportColumns.length;

        if (cellCount > withDefault(config.streamingCellThreshold, 100000)) {
            startToast = XH.toast({
                message: 'Your export is being prepared. Due to its size, formatting will be removed.',
                icon: Icon.download(),
                intent: 'warning',
                timeout: null
            });
        } else if (cellCount > withDefault(config.toastCellThreshold, 3000)) {
            startToast = XH.toast({
                message: 'Your export is being prepared and will download when complete...',
                icon: Icon.download(),
                timeout: null
            });
        }

        // Toast will be dismissed when export completes, but commit to showing for at least 2s to
        // avoid an annoying flash if download is ready immediately.
        const dismissStartToast = startToast ?
            this.minWait(2 * SECONDS, () => startToast.dismiss()) :
            () => null;

        // POST the data as a file (using multipart/form-data) to work around size limits when using application/x-www-form-urlencoded.
        // This allows the data to be split into multiple parts and streamed, allowing for larger excel exports.
        // The content of the "file" is a JSON encoded string, which will be streamed and decoded on the server.
        // Note: It may be necessary to set maxFileSize and maxRequestSize in application.groovy to facilitate very large exports.
        const formData = new FormData(),
            params = {filename, type, meta, rows};

        formData.append('params', JSON.stringify(params));

        try {
            const response = await XH.fetch({
                url: 'xh/export',
                method: 'POST',
                body: formData,
                // Note: We must explicitly unset Content-Type headers to allow the browser to set its own multipart/form-data boundary.
                // See https://stanko.github.io/uploading-files-using-fetch-multipart-form-data/ for further explanation.
                headers: {
                    'Content-Type': null
                },
                timeout
            });

            const blob = response.status === StatusCodes.NO_CONTENT ? null : await response.blob(),
                fileExt = this.getFileExtension(type),
                contentType = this.getContentType(type);

            download(blob, `${filename}${fileExt}`, contentType);
            await dismissStartToast();
            XH.successToast('Export complete.');
        } catch (e) {
            XH.exceptionHandler.handleException(e, {showAlert: false});
            await dismissStartToast();
            this.showFailToast(e);
        }
    }

    /**
     * Get the exportable value for a given cell.
     *
     * This method is used internally by this service, but also made available
     * publicly for use by grid clipboard functionality.
     *
     * @param [c.node] - rendered ag-Grid row, if available.  Necessary for exporting agGrid aggregates.
     * @param [c.forExcel] - for posting to server-side excel export, default false.
     * @return value suitable for export to excel, csv, or clipboard.
     */
    getExportableValueForCell(
        {gridModel, record, column, node, forExcel = false}:
            {gridModel: GridModel, record: StoreRecord, column: Column, node?: any, forExcel?: boolean}
    ): any {
        const {field, exportValue, getValueFn, defaultGetValueFn} = column,
            aggData = node && gridModel.treeMode && !isEmpty(record.children) ? node.aggData : null,
            hasCustomGetValueFn = getValueFn !== defaultGetValueFn;

        // 0) Main processing
        let value = getValueFn({record, field, column, gridModel});
        // Modify value using exportValue
        if (isString(exportValue) && record.data[exportValue] !== null) {
            // If exportValue points to a different field
            value = record.data[exportValue];
        } else if (isFunction(exportValue)) {
            // If export value is a function that transforms the value
            value = exportValue(value, {record, column, gridModel});
        } else if (aggData && !isNil(aggData[field])) {
            // If we found aggregate data calculated by agGrid
            value = aggData[field];
        }

        if (isNil(value)) return null;

        // 1) Support per-cell excelFormat and data types
        let {excelFormat} = column,
            cellHasExcelFormat = isFunction(excelFormat);

        if (cellHasExcelFormat) {
            excelFormat = excelFormat(value, {record, column, gridModel}) ?? ExcelFormat.DEFAULT;
        }

        const exportFieldType = this.getExportFieldType(column);

        let cellSpecificType = null;
        if (exportFieldType === AUTO || isFunction(exportValue) || hasCustomGetValueFn) {
            cellSpecificType = this.getCellSpecificType(value, exportFieldType);
        }

        // 2) Dates: Provide the date data string expected by the server endpoint
        // Also functions as a consistent human-friendly date format for CSV and clipboard
        if (exportFieldType === DATE || cellSpecificType === DATE) {
            value = fmtDate(value, 'YYYY-MM-DD HH:mm:ss');
        }

        value = value.toString();

        // Send format and/or type with the cell in an object only if it varies within the column
        if (!forExcel || (!cellSpecificType && !cellHasExcelFormat)) return value;

        const ret: any = {value};
        if (cellHasExcelFormat) ret.format = excelFormat;
        if (cellSpecificType) ret.type = cellSpecificType;
        return ret;
    }
    //-----------------------
    // Implementation
    //-----------------------
    private showFailToast(e) {
        const failToast = XH.dangerToast({
            message: span(
                'Export failed ',
                a({
                    item: '(show details...)',
                    onClick: () => {
                        failToast?.dismiss();
                        XH.exceptionHandler.showException(e);
                    }
                })
            ),
            timeout: null
        });
    }

    private getExportableColumns(gridModel, columns) {
        if (isFunction(columns)) {
            return compact(
                columns(gridModel).map(it => gridModel.getColumn(it))
            );
        }

        const toExport = castArray(columns),
            includeAll = toExport.includes('ALL'),
            includeViz = toExport.includes('VISIBLE');

        return sortBy(gridModel.getLeafColumns(), ({colId}) => {
            const index = findIndex(gridModel.columnState, {colId});
            return index !== -1 ? index : toExport.indexOf(colId);
        }).filter(col => {
            const {colId, excludeFromExport} = col;
            return (
                toExport.includes(colId) ||
                (!excludeFromExport &&
                    (includeAll || (includeViz && gridModel.isColumnVisible(colId)))
                )
            );
        });
    }

    // Extract fieldtype from store for the column's export field (which may differ via exportValue)
    // Default to 'AUTO' (for non-store fields like 'id')
    private getExportFieldType(column) {
        const {field, exportValue, gridModel} = column,
            typeField = isString(exportValue) ? exportValue : field;

        return gridModel.store.getField(typeField)?.type ?? AUTO;
    }

    private getColumnMetadata(columns) {
        return columns.map(column => {
            let {field, excelWidth, excelFormat} = column,
                type = this.getExportFieldType(column);

            // Set default excelFormat for dates and localDates on the client
            if (isNil(excelFormat) || excelFormat === ExcelFormat.DEFAULT) {
                switch (type) {
                    case LOCAL_DATE:
                        excelFormat = ExcelFormat.DATE_FMT;
                        break;
                    case DATE:
                        excelFormat = ExcelFormat.DATETIME_FMT;
                        break;
                    default:
                        excelFormat = ExcelFormat.DEFAULT;
                }
            }

            // If using the function form to support per-cell formats, replace with
            // ExcelFormat.DEFAULT as a placeholder at the column level. The cell-level data for
            // this column will be shipped with the calculated formats.
            if (isFunction(excelFormat)) excelFormat = ExcelFormat.DEFAULT;

            return {field, type, format: excelFormat, width: excelWidth};
        });
    }

    private getHeaderRow(columns, type, gridModel) {
        const headers = columns.map(it => {
            let ret = isFunction(it.exportName) ?
                it.exportName({column: it, gridModel}) :
                it.exportName;

            if (!isString(ret)) {
                console.warn(
                    'Tried to export column ' + it.colId + ' with an invalid "exportName", ' +
                    'probably caused by setting "headerName" to a React element. Please specify an ' +
                    'appropriate "exportName". Defaulting to ' + it.colId
                );
                ret = it.colId;
            }
            return ret;
        });

        // Excel does not like duplicate (case-insensitive) header names in tables and will prompt
        // the user to "repair" the file when opened if present.
        const headerCounts = countBy(headers.map(it => it.toLowerCase())),
            dupeHeaders = keys(pickBy(headerCounts, it => it > 1));
        if (type === 'excelTable' && !isEmpty(dupeHeaders)) {
            console.warn('Excel tables require unique headers on each column. Consider using the "exportName" property to ensure unique headers. Duplicate headers: ', dupeHeaders);
        }
        return {data: headers, depth: 0};
    }

    private getRecordRowsRecursive(gridModel, records, columns, type, depth) {
        const {sortBy, treeMode, agApi} = gridModel,
            ret = [];

        records = [...records];

        // Sort using comparator functions we pass to ag-Grid - imitating rendered data
        [...sortBy].reverse().forEach(it => {
            const column = gridModel.getColumn(it.colId);
            if (!column) return;

            const {field, getValueFn} = column,
                compFn = column.getAgSpec().comparator.bind(column),
                direction = it.sort === 'desc' ? -1 : 1;

            records.sort((a, b) => {
                const valueA = getValueFn({record: a, field, column, gridModel}),
                    valueB = getValueFn({record: b, field, column, gridModel}),
                    agNodeA = agApi?.getRowNode(a.agId),
                    agNodeB = agApi?.getRowNode(b.agId);

                return compFn(valueA, valueB, agNodeA, agNodeB) * direction;
            });
        });

        records.forEach(record => {
            ret.push(this.getRecordRow(gridModel, record, columns, type, depth));
            if (treeMode && record.children.length) {
                const childRows = this.getRecordRowsRecursive(gridModel, record.children, columns, type, depth + 1);
                childRows.forEach(r => ret.push(r));
            }
        });

        return ret;
    }

    private getRecordRow(gridModel, record, columns, type, depth) {
        const node = gridModel.agApi?.getRowNode(record.agId),
            forExcel = type !== 'csv',
            data = columns.map(column => {
                return this.getExportableValueForCell({gridModel, record, column, node, forExcel});
            });
        return {data, depth};
    }

    private getContentType(type) {
        switch (type) {
            case 'excelTable':
            case 'excel':
                return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            case 'csv':
                return 'text/csv';
        }
    }

    private getFileExtension(type) {
        switch (type) {
            case 'excelTable':
            case 'excel':
                return '.xlsx';
            case 'csv':
                return '.csv';
        }
    }

    // Return an async function that will block until a minimum time has passed.
    private minWait(time, fn) {
        const minDelay = wait(time);
        return async () => {
            await minDelay;
            fn();
        };
    }

    // Return a value's data type if different from the type specified
    private getCellSpecificType(v, colType) {
        const ifTypeNot = (allowedTypes, retType) => allowedTypes.includes(colType) ? null : retType;

        if (isBoolean(v))   return ifTypeNot([BOOL], BOOL);
        if (isNumber(v))    return ifTypeNot([NUMBER, INT], NUMBER);
        if (isLocalDate(v)) return ifTypeNot([LOCAL_DATE], LOCAL_DATE);
        if (isDate(v))      return ifTypeNot([DATE], DATE);
        if (isString(v))    return ifTypeNot([PWD, STRING, AUTO], AUTO);

        return null;
    }
}

export interface ExportOptions {

    /**
     * Name for export file, or closure to generate.
     * Do not include the file extension - that will be appended based on the specified type.
     */
    filename?: string|((g: GridModel) => string);

    /** Type of export. */
    type?: 'excel'|'excelTable'|'csv';

    /**
     *  Columns to include in export. Supports tokens 'VISIBLE' (default - all currently visible cols),
     *  'ALL', or specific column IDs to include (can be used in conjunction with VISIBLE to export
     *  all visible and enumerated columns). Also supports a function returning column IDs to include.
     */
    columns?: 'VISIBLE'|'ALL'|string[]|((g: GridModel) => string[])

    /** Timeout (in ms) for export request - defaults to 30 seconds. */
    timeout?: number;
}