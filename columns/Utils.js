/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {ExportFormat} from './ExportFormat';
import {castArray, defaults, isNumber, omit, startCase} from 'lodash';

// Configs specific to / added by Hoist as extensions to ag-Grid's column API.
// Listed here so they can be deliberately omitted when outputting a colDef for ag-Grid itself.
const hoistColConfigs = [
    'align', 'elementRenderer', 'fixedWidth', 'flex',
    'chooserDescription', 'chooserGroup', 'chooserName', 'excludeFromChooser',
    'exportName', 'exportValue', 'exportFormat',
    'agColDef', 'xhId'
];

/**
 * Creates a factory for use within a Column definition file to create multiple column factories
 * with a shared set of defaults.
 *
 * @param {Object} [fileVals] - default properties to apply.
 * @return {function} - function to create a specific column factory.
 */
export function fileColFactory(fileVals = {}) {
    return function(colVals = {}) {
        return function(instanceVals = {}) {
            const ret = defaults(instanceVals, colVals, fileVals);

            ret.xhId = ret.xhId || ret.field;
            ret.colId = ret.xhId;

            ret.headerClass = castArray(ret.headerClass);
            ret.cellClass = castArray(ret.cellClass);

            if (ret.align === 'center') {
                ret.headerClass.push('xh-column-header-align-center');
                ret.cellClass.push('xh-align-center');
            }

            if (ret.align === 'right') {
                ret.headerClass.push('xh-column-header-align-right');
                ret.cellClass.push('xh-align-right');
            }

            if (isNumber(ret.flex)) {
                ret.width = ret.flex * 1000;
            }

            if (isNumber(ret.fixedWidth)) {
                ret.width = ret.fixedWidth;
                ret.maxWidth = ret.fixedWidth;
                ret.minWidth = ret.fixedWidth;
            }

            const {elementRenderer} = ret;
            if (elementRenderer) {
                ret.cellRendererFramework = class extends Component {
                    render()    {return elementRenderer(this.props)}
                    refresh()   {return false}
                };
            }

            // Default chooserName from headerName or field (sampleField -> Sample Field)
            ret.chooserName = ret.chooserName || ret.headerName || startCase(ret.field);

            // Default exportName from headerName or field
            ret.exportName = ret.exportName || ret.headerName || startCase(ret.field);

            // Use default exportFormat if not defined
            ret.exportFormat = ret.exportFormat || ExportFormat.DEFAULT;

            // Install fn to produce definition w/o custom Hoist configs for use by ag-grid,
            // which will complain about unknown config keys.
            ret.agColDef = () => omit(ret, hoistColConfigs);

            return ret;
        };
    };
}