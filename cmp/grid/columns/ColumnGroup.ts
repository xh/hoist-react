/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {PlainObject, Some} from '@xh/hoist/core';
import {genDisplayName} from '@xh/hoist/data';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {clone, isEmpty, isFunction, isString} from 'lodash';
import {ReactNode} from 'react';
import {GridModel} from '../GridModel';
import {ColumnHeaderClassFn, ColumnHeaderNameFn } from '../Types';
import {ColumnConfig, getAgHeaderClassFn} from './Column';

export interface ColumnGroupConfig {
    /** Column or ColumnGroup configs for children of this group.*/
    children: (ColumnGroupConfig|ColumnConfig)[];
    /** Unique identifier for the ColumnGroup within its grid. */
    groupId?: string;
    /** Display text for column group header. */
    headerName?: ReactNode|ColumnHeaderNameFn;
    /** CSS classes to add to the header. */
    headerClass?: Some<string>|ColumnHeaderClassFn;
    /** Horizontal alignment of header contents. */
    headerAlign?: 'left'|'right'|'center';

    /**
     * "Escape hatch" object to pass directly to Ag-Grid for desktop implementations. Note
     * these options may be used / overwritten by the framework itself, and are not all
     * guaranteed to be compatible with its usages of Ag-Grid.
     * See {@link https://www.ag-grid.com/javascript-grid-column-properties/|AG-Grid docs}
     */
    agOptions?: PlainObject;

    /** Additional data to attach to this model instance. */
    [x:string]: any;
}

/**
 * Cross-platform definition and API for a standardized Grid column group.
 * Provided to GridModels as plain configuration objects.
 */
export class ColumnGroup {

    children:  (ColumnGroupConfig|ColumnConfig)[];
    gridModel: GridModel;
    groupId: string;
    headerName: ReactNode|ColumnHeaderNameFn;
    headerClass: Some<string>|ColumnHeaderClassFn;
    headerAlign: 'left'|'right'|'center';

    /**
     * "Escape hatch" object to pass directly to Ag-Grid for desktop implementations. Note
     * these options may be used / overwritten by the framework itself, and are not all
     * guaranteed to be compatible with its usages of Ag-Grid.
     * See {@link https://www.ag-grid.com/javascript-grid-column-properties/|AG-Grid docs}
     */
    agOptions?: PlainObject;

    constructor({
        children,
        groupId,
        headerName,
        headerClass,
        headerAlign,
        agOptions,
        align,
        ...rest
    }:ColumnGroupConfig, gridModel) {
        throwIf(isEmpty(children), 'Must specify children for a ColumnGroup');
        throwIf(isEmpty(groupId) && !isString(headerName), 'Must specify groupId or a string headerName for a ColumnGroup');

        Object.assign(this, rest);

        this.groupId = withDefault(groupId, headerName) as string;
        this.headerName = withDefault(headerName, genDisplayName(this.groupId));
        this.headerClass = headerClass;
        this.headerAlign = headerAlign;
        this.children = children;
        this.gridModel = gridModel;
        this.agOptions = agOptions ? clone(agOptions) : {};
    }

    getAgSpec() {
        const {headerName, gridModel} = this;
        return {
            groupId: this.groupId,
            headerValueGetter: (agParams) => isFunction(headerName) ? headerName({columnGroup: this, gridModel, agParams}) : headerName,
            headerClass: getAgHeaderClassFn(this),
            headerGroupComponentParams: {gridModel, xhColumnGroup: this},
            children: this.children.map(it => it.getAgSpec()),
            marryChildren: gridModel.lockColumnGroups,
            ...this.agOptions
        };
    }
}
