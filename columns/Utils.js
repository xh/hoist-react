/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {defaults, castArray} from 'lodash';
import './Columns.css';

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

            instanceVals.headerClass = castArray(instanceVals.headerClass);
            instanceVals.cellClass = castArray(instanceVals.cellClass);
            if (instanceVals.align === 'center') {
                instanceVals.headerClass.push('xh-center-justify');
                instanceVals.cellClass.push('xh-align-center');
                delete instanceVals.align;
            }

            if (instanceVals.align === 'right') {
                instanceVals.headerClass.push('xh-right-justify');
                instanceVals.cellClass.push('xh-align-right');
                delete instanceVals.align;
            }

            if (instanceVals.fixedWidth) {
                instanceVals.width = instanceVals.fixedWidth;
                instanceVals.maxWidth = instanceVals.fixedWidth;
                instanceVals.minWidth = instanceVals.fixedWidth;
                delete instanceVals.fixedWidth;
            }
            // Do additional pre-processing here
            return defaults(instanceVals, colVals, fileVals, globalVals);
            // Do additional post-processing here
        };
    };
}