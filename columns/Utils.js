/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {defaults, castArray} from 'lodash';

const globalVals = {};

/**
 * Create a factory for use in a file to create multiple
 * column factory's with a shared set of defaults.

 * @param fileVals, defaults for file
 * @return Function to create specific column factory
 */
export function fileColFactory(fileVals = {}) {
    return function(colVals = {}) {
        return function(instanceVals = {}) {
            // Do additional pre-processing here
            const colProps = defaults(instanceVals, colVals, fileVals, globalVals);

            colProps.headerClass = castArray(colProps.headerClass);
            colProps.cellClass = castArray(colProps.cellClass);
            if (colProps.align === 'center') {
                colProps.headerClass.push('xh-center-justify');
                colProps.cellClass.push('xh-align-center');
                delete colProps.align;
            }

            if (colProps.align === 'right') {
                colProps.headerClass.push('xh-right-justify');
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
            // Do additional post-processing here
            return colProps;
        };
    };
}