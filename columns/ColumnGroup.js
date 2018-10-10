/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {withDefault, throwIf} from '@xh/hoist/utils/js';
import {startCase, isEmpty, castArray, clone} from 'lodash';

/**
 * Cross-platform definition and API for a standardized Grid column group.
 * Provided to GridModels as plain configuration objects.
 * @alias HoistColumnGroup
 */
export class ColumnGroup {
    /**
     * @param {Object} c - ColumnGroup configuration.
     * @param {string} [c.groupId] - unique identifier for the ColumnGroup within its grid.
     * @param {string} [c.headerName] - display text for grid header.
     * @param {(string|string[])} [c.headerClass] - additional css classes to add to the column group header.
     * @param {Object[]} c.children - Column or ColumnGroup configurations for children of this group.
     * @param {GridModel} [c.gridModel] - the model which owns this column.
     * @param {Object} [c.agOptions] - "escape hatch" object to pass directly to Ag-Grid for
     *      desktop implementations. Note these options may be used / overwritten by the framework
     *      itself, and are not all guaranteed to be compatible with its usages of Ag-Grid.
     *      @see {@link https://www.ag-grid.com/javascript-grid-column-properties/|AG-Grid docs}
     * @param {...*} [rest] - additional properties to store on the column
     */
    constructor({
        children,
        groupId,
        headerName,
        headerClass,
        gridModel,
        agOptions,
        ...rest
    }) {
        throwIf(isEmpty(children), 'Must specify children for a ColumnGroup');

        Object.assign(this, rest);

        this.groupId = withDefault(groupId, headerName);
        throwIf(!this.groupId, 'Must specify groupId or headerName for a ColumnGroup.');

        this.headerName = withDefault(headerName, startCase(this.groupId));
        this.headerClass = castArray(headerClass);

        this.children = children.map(c => gridModel.buildColumn(c));

        this.agOptions = agOptions ? clone(agOptions) : {};
    }

    getAgSpec() {
        return {
            groupId: this.groupId,
            headerName: this.headerName,
            headerClass: this.headerClass,
            children: this.children.map(it => it.getAgSpec()),
            marryChildren: true, // enforce 'sealed' column groups
            ...this.agOptions
        };
    }
}