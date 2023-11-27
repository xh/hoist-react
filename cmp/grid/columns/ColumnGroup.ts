/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {HAlign, PlainObject, Some, Thunkable, XH} from '@xh/hoist/core';
import {genDisplayName} from '@xh/hoist/data';

import type {ColGroupDef} from '@xh/hoist/kit/ag-grid';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {clone, isEmpty, isFunction, isString, keysIn} from 'lodash';
import {ReactNode} from 'react';
import {GridModel} from '../GridModel';
import {ColumnHeaderClassFn, ColumnHeaderNameFn} from '../Types';
import {Column, ColumnSpec, getAgHeaderClassFn} from './Column';

export interface ColumnGroupSpec {
    /** Column or ColumnGroup configs for children of this group.*/
    children: Array<ColumnGroupSpec | ColumnSpec>;
    /** Unique identifier for the ColumnGroup within its grid. */
    groupId?: string;
    /** Display text for column group header. */
    headerName?: ReactNode | ColumnHeaderNameFn;
    /** CSS classes to add to the header. */
    headerClass?: Some<string> | ColumnHeaderClassFn;
    /** Horizontal alignment of header contents. */
    headerAlign?: HAlign;
    /** True to render borders on column group edges. */
    borders?: boolean;

    /**
     * "Escape hatch" object to pass directly to Ag-Grid for desktop implementations. Note
     * these options may be used / overwritten by the framework itself, and are not all
     * guaranteed to be compatible with its usages of Ag-Grid.
     * See {@link https://www.ag-grid.com/javascript-grid-column-properties/|AG-Grid docs}
     */
    agOptions?: PlainObject;

    /** True to skip this column when adding to grid. */
    omit?: Thunkable<boolean>;

    appData?: PlainObject;
}

/**
 * Cross-platform definition and API for a standardized Grid column group.
 * Provided to GridModels as plain configuration objects.
 */
export class ColumnGroup {
    readonly children: Array<ColumnGroup | Column>;
    readonly gridModel: GridModel;
    readonly groupId: string;
    readonly headerName: ReactNode | ColumnHeaderNameFn;
    readonly headerClass: Some<string> | ColumnHeaderClassFn;
    readonly headerAlign: HAlign;
    readonly borders: boolean;

    /**
     * "Escape hatch" object to pass directly to Ag-Grid for desktop implementations. Note
     * these options may be used / overwritten by the framework itself, and are not all
     * guaranteed to be compatible with its usages of Ag-Grid.
     * See {@link https://www.ag-grid.com/javascript-grid-column-properties/|AG-Grid docs}
     */
    agOptions?: PlainObject;

    appData: PlainObject;

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
            borders,
            appData,
            ...rest
        } = config;

        throwIf(isEmpty(children), 'Must specify children for a ColumnGroup');
        throwIf(
            isEmpty(groupId) && !isString(headerName),
            'Must specify groupId or a string headerName for a ColumnGroup'
        );

        this.groupId = withDefault(groupId, headerName) as string;
        this.headerName = withDefault(headerName, genDisplayName(this.groupId));
        this.headerClass = headerClass;
        this.headerAlign = headerAlign;
        this.borders = withDefault(borders, true);
        this.children = children;
        this.gridModel = gridModel;
        this.agOptions = agOptions ? clone(agOptions) : {};
        this.appData = appData ? clone(appData) : {};

        if (!isEmpty(rest)) {
            const keys = keysIn(rest);
            throw XH.exception(
                `Column group '${this.groupId}' configured with unsupported key(s) '${keys}'. Custom config data must be nested within the 'appData' property.`
            );
        }
    }

    getAgSpec(): ColGroupDef {
        const {headerName, gridModel} = this;
        return {
            groupId: this.groupId,
            headerValueGetter: agParams => {
                // headerValueGetter should always return a string
                // for display in draggable shadow box, aGrid Tool panel.
                // Hoist ColumnHeader will handle display of Element values in the header.
                const ret = isFunction(headerName)
                    ? headerName({columnGroup: this, gridModel, agParams})
                    : headerName;
                return isString(ret) ? ret : genDisplayName(this.groupId);
            },
            headerClass: getAgHeaderClassFn(this),
            headerGroupComponentParams: {gridModel, xhColumnGroup: this},
            children: this.children.map(it => it.getAgSpec()),
            marryChildren: gridModel.lockColumnGroups,
            ...this.agOptions
        };
    }

    getLeafColumns(): Column[] {
        return this.children.flatMap(child =>
            child instanceof Column ? child : child.getLeafColumns()
        );
    }
}
