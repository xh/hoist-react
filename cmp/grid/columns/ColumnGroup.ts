/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {HAlign, PlainObject, Some, Thunkable} from '@xh/hoist/core';
import {genDisplayName} from '@xh/hoist/data';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {clone, isEmpty, isFunction, isString} from 'lodash';
import {GridModel} from '../GridModel';
import {ColumnHeaderClassFn, ColumnHeaderNameFn} from '../Types';
import {Column, ColumnSpec, getAgHeaderClassFn} from './Column';

import type {ColGroupDef} from '@xh/hoist/kit/ag-grid';

export interface ColumnGroupSpec {
    /** Column or ColumnGroup configs for children of this group.*/
    children: Array<ColumnGroupSpec | ColumnSpec>;
    /** Unique identifier for the ColumnGroup within its grid. */
    groupId?: string;
    /** Display text for column group header. */
    headerName?: string | ColumnHeaderNameFn;
    /** CSS classes to add to the header. */
    headerClass?: Some<string> | ColumnHeaderClassFn;
    /** Horizontal alignment of header contents. */
    headerAlign?: HAlign;

    /**
     * "Escape hatch" object to pass directly to Ag-Grid for desktop implementations. Note
     * these options may be used / overwritten by the framework itself, and are not all
     * guaranteed to be compatible with its usages of Ag-Grid.
     * See {@link https://www.ag-grid.com/javascript-grid-column-properties/|AG-Grid docs}
     */
    agOptions?: PlainObject;

    /** True to skip this column when adding to grid. */
    omit?: Thunkable<boolean>;
}

/**
 * Cross-platform definition and API for a standardized Grid column group.
 * Provided to GridModels as plain configuration objects.
 */
export class ColumnGroup {
    readonly children: Array<ColumnGroup | Column>;
    readonly gridModel: GridModel;
    readonly groupId: string;
    readonly headerName: string | ColumnHeaderNameFn;
    readonly headerClass: Some<string> | ColumnHeaderClassFn;
    readonly headerAlign: HAlign;

    /**
     * "Escape hatch" object to pass directly to Ag-Grid for desktop implementations. Note
     * these options may be used / overwritten by the framework itself, and are not all
     * guaranteed to be compatible with its usages of Ag-Grid.
     * See {@link https://www.ag-grid.com/javascript-grid-column-properties/|AG-Grid docs}
     */
    agOptions?: PlainObject;

    /**
     * Not for application use. ColumnGroups are created internally by Hoist.
     *
     * Applications specify column groups by providing ColumnGroupSpec objects to the
     * GridModel API.
     *
     * @internal
     */
    constructor(
        config: ColumnGroupSpec,
        gridModel: GridModel,
        children: Array<Column | ColumnGroup>
    ) {
        const {
            children: childrenSpecs,
            groupId,
            headerName,
            headerClass,
            headerAlign,
            agOptions,
            ...rest
        } = config;

        throwIf(isEmpty(children), 'Must specify children for a ColumnGroup');
        throwIf(
            isEmpty(groupId) && !isString(headerName),
            'Must specify groupId or a string headerName for a ColumnGroup'
        );

        Object.assign(this, rest);

        this.groupId = withDefault(groupId, headerName) as string;
        this.headerName = withDefault(headerName, genDisplayName(this.groupId));
        this.headerClass = headerClass;
        this.headerAlign = headerAlign;
        this.children = children;
        this.gridModel = gridModel;
        this.agOptions = agOptions ? clone(agOptions) : {};
    }

    getAgSpec(): ColGroupDef {
        const {headerName, gridModel} = this;
        return {
            groupId: this.groupId,
            headerValueGetter: agParams =>
                isFunction(headerName)
                    ? headerName({columnGroup: this, gridModel, agParams})
                    : headerName,
            headerClass: getAgHeaderClassFn(this),
            headerGroupComponentParams: {gridModel, xhColumnGroup: this},
            children: this.children.map(it => it.getAgSpec()),
            marryChildren: gridModel.lockColumnGroups,
            ...this.agOptions
        };
    }
}
