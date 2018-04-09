/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {defaults, castArray} from 'lodash';

const globalVals = {};

/**
 * Creates a factory for use within a Column definition file to create multiple column factories
 * with a shared set of defaults.
 *
 * @param {Object} fileVals - defaults to apply.
 * @return {function} - function to create a specific column factory.
 */
export function fileColFactory(fileVals = {}) {
    return function(colVals = {}) {
        return function(instanceVals = {}) {
            const colProps = defaults(instanceVals, colVals, fileVals, globalVals);

            colProps.headerClass = castArray(colProps.headerClass);
            colProps.cellClass = castArray(colProps.cellClass);
            if (colProps.align === 'center') {
                colProps.headerClass.push('xh-column-header-align-center');
                colProps.cellClass.push('xh-align-center');
                delete colProps.align;
            }

            if (colProps.align === 'right') {
                colProps.headerClass.push('xh-column-header-align-right');
                colProps.cellClass.push('xh-align-right');
                delete colProps.align;
            }

            if (colProps.flex) {
                colProps.width = colProps.flex * 1000;
                delete colProps.flex;
            }

            if (colProps.fixedWidth) {
                colProps.width = colProps.fixedWidth;
                colProps.maxWidth = colProps.fixedWidth;
                colProps.minWidth = colProps.fixedWidth;
                delete colProps.fixedWidth;
            }

            if (colProps.resizable === false) {
                colProps.suppressResize = true;
            }

            return colProps;
        };
    };
}