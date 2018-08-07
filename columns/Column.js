/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {startCase, defaults, defaultTo} from 'lodash';
import {ExportFormat} from './ExportFormat';
import {withDefault} from '@xh/hoist/utils/JsUtils';

/**
 * Definition of display and other meta-data for a grid column.
 */
export class Column {

    /**
     * Create a new column.
     *
     * Note that this is not a typical entry point for applications looking
     * to create a new column. Applications should typically use a columnFactory
     * which will include appropriate defaults.  See baseCol() for the generic uses.
     */
    constructor({
        field,
        colId,
        headerName,
        align,
        width,
        minWidth,
        flex,
        resizable,
        format,
        renderer,
        elementRenderer,
        chooserName,
        chooserGroup,
        chooserDescription,
        excludeFromChooser,
        exportName,
        exportValue,
        exportFormat,
        excludeFromExport,
        agOptions
    }) {

        this.field = field;
        this.colId = withDefault(colId, field);
        this.headerName = withDefault(headerName, startCase(this.colId));

        this.align = align;
        this.width = width;
        this.minWidth = minWidth;
        this.flex = flex;
        this.resizable = !!withDefault(resizable, true);

        this.renderer = renderer;
        this.elementRenderer = elementRenderer;

        this.chooserName = withDefault(chooserName, headerName);
        this.chooserGroup = chooserGroup;
        this.chooserDescription = chooserDescription;
        this.excludeFromChooser = !!excludeFromChooser;

        this.exportName = withDefault(exportName, headerName);
        this.exportValue = exportValue;
        this.exportFormat = withDefault(exportFormat, ExportFormat.DEFAULT);
        this.excludeFromExport = withDefault(excludeFromExport, !field);

        this.agOptions = agOptions;
    }

    /**
     * Produce a Column definition appropriate for AG Grid.
     */
    getAgSpec() {

        const ret = {
            field: this.field,
            colId: this.colId,
            headerName: this.headerName,
            ...this.agOptions
        };

        if (this.align === 'center') {
            ret.headerClass = ['xh-column-header-align-center'];
            ret.cellClass = ['xh-align-center'];
        } else if (this.align === 'right') {
            ret.headerClass = ['xh-column-header-align-right'];
            ret.cellClass = ['xh-align-right'];
        }

        if (this.flex) {
            ret.suppressResize = true;
            ret.width = Number.MAX_SAFE_INTEGER;
            ret.minWidth = this.minWidth;
        } else {
            ret.suppressSizeToFit = true;
            ret.width = this.width || 0;
        }

        if (!this.resizable) {
            ret.suppressResize = true;
        }

        const {renderer, elementRenderer} = this;
        if (renderer) {
            ret.cellRenderer = (params) => renderer(params.value, params.data);
        } else if (elementRenderer) {
            ret.cellRendererFramework = class extends Component {
                render() {return elementRenderer(this.props)}
                refresh() {return false}
            };
        }
        
        return ret;
    }
}


/**
 * Create a function for use to create a specific Column instance.
 */
export function colFactory(config) {
    return function(instanceVals = {}) {
        return new Column(defaults(instanceVals, config));
    };
}