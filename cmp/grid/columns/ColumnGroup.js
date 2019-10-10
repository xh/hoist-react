/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {withDefault, throwIf} from '@xh/hoist/utils/js';
import {startCase, isEmpty, castArray, clone, isFunction, isString} from 'lodash';

/**
 * Cross-platform definition and API for a standardized Grid column group.
 * Provided to GridModels as plain configuration objects.
 * @alias HoistColumnGroup
 */
export class ColumnGroup {
    /**
     * @param {Object} c - ColumnGroup configuration.
     * @param {string} [c.groupId] - unique identifier for the ColumnGroup within its grid.
     * @param {ColumnGroup~headerNameFn|string} [c.headerName] - display text for column group header.
     * @param {(string|string[])} [c.headerClass] - additional css classes to add to the column group header.
     * @param {Object[]} c.children - Column or ColumnGroup configurations for children of this group.
     * @param {Object} [c.agOptions] - "escape hatch" object to pass directly to Ag-Grid for
     *      desktop implementations. Note these options may be used / overwritten by the framework
     *      itself, and are not all guaranteed to be compatible with its usages of Ag-Grid.
     *      @see {@link https://www.ag-grid.com/javascript-grid-column-properties/|AG-Grid docs}
     * @param {...*} [rest] - additional properties to store on the column
     * @param {GridModel} gridModel - the model which owns this column.
     */
    constructor({
        children,
        groupId,
        headerName,
        headerClass,
        agOptions,
        ...rest
    }, gridModel) {
        throwIf(isEmpty(children), 'Must specify children for a ColumnGroup');
        throwIf(isEmpty(groupId) && !isString(headerName), 'Must specify groupId or a string headerName for a ColumnGroup');

        Object.assign(this, rest);

        this.groupId = withDefault(groupId, headerName);

        this.headerName = withDefault(headerName, startCase(this.groupId));
        this.headerClass = castArray(headerClass);

        this.children = children.map(c => gridModel.buildColumn(c));

        this.gridModel = gridModel;
        this.agOptions = agOptions ? clone(agOptions) : {};
    }

    getAgSpec() {
        const {headerName, gridModel} = this;
        return {
            groupId: this.groupId,
            headerValueGetter: (agParams) => isFunction(headerName) ? headerName({columnGroup: this, gridModel, agParams}) : headerName,
            headerClass: this.headerClass,
            headerGroupComponentParams: {gridModel, xhColumnGroup: this},
            children: this.children.map(it => it.getAgSpec()),
            marryChildren: true, // enforce 'sealed' column groups
            ...this.agOptions
        };
    }
}

/**
 * @callback ColumnGroup~headerNameFn - function to generate a ColumnGroup header name.
 *      Note that using function for the header name will ignore any ag-Grid functionality for decorating
 *      the header name, the return value of the function will be used as-is.
 *      The function should be treated like an autorun - any subsequent changes observable
 *      properties referenced during the previous execution of the function will trigger a re-render
 *      of the column group header.
 * @param {ColumnGroup} columnGroup - column group for the header name being generated.
 * @param {GridModel} gridModel - gridModel for the grid.
 * @param {Object} [agParams] - the ag-Grid header value getter params. Not present when called
 *      during ColumnHeaderGroup rendering.
 * @return {string} - the header name to render in the ColumnGroup header
 */
