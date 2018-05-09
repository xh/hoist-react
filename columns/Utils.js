/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {defaults, castArray, isNumber, omit} from 'lodash';

const globalVals = {};
const hoistColProps = ['align', 'elementRenderer', 'flex', 'fixedWidth'];

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
            const colProps = defaults(instanceVals, colVals, fileVals, globalVals);

            colProps.headerClass = castArray(colProps.headerClass);
            colProps.cellClass = castArray(colProps.cellClass);
            if (colProps.align === 'center') {
                colProps.headerClass.push('xh-column-header-align-center');
                colProps.cellClass.push('xh-align-center');
            }

            if (colProps.align === 'right') {
                colProps.headerClass.push('xh-column-header-align-right');
                colProps.cellClass.push('xh-align-right');
            }

            if (isNumber(colProps.flex)) {
                colProps.width = colProps.flex * 1000;
            }

            if (isNumber(colProps.fixedWidth)) {
                colProps.width = colProps.fixedWidth;
                colProps.maxWidth = colProps.fixedWidth;
                colProps.minWidth = colProps.fixedWidth;
            }

            if (colProps.elementRenderer) {
                const {elementRenderer} = colProps;
                colProps.cellRendererFramework = RendererComponent;
            }

            return omit(colProps, hoistColProps);
        };
    };
}


class RendererComponent extends Component {

    render() {
        return elementRenderer(this.props);
    }

    refresh() {
        return false;
    }
}