/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {startCase, defaults} from 'lodash';
import {ExportFormat} from './ExportFormat';


/**
 * Definition of display and other meta-data for a grid column.
 */
export class Column {

    /**
     * Create a new column.
     *
     * Note that this is not a typical entry point for applications looking
     * to create a new column. Applications should typically use a columnFactory
     * which will include appropriate defaults.  See column() for the generic uses.
     */
    constructor({
        field,
        xhId,
        headerName,
        align,
        width,
        minWidth,
        flex,
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
        this.xhId = xhId || field;
        this.headerName = headerName || startCase(this.xhId);

        this.align = align;
        this.width = width;
        this.minWidth = minWidth;
        this.flex = flex;

        this.renderer = renderer;
        this.elementRenderer = elementRenderer;

        this.chooserName = chooserName || headerName;
        this.chooserGroup = chooserGroup;
        this.chooserDescription = chooserDescription;
        this.excludeFromChooser = !!excludeFromChooser;

        this.exportName = exportName || headerName;
        this.exportValue = exportValue;
        this.exportFormat = exportFormat || ExportFormat.DEFAULT;
        this.excludeFromExport = excludeFromExport !== undefined ? excludeFromExport : !field;

        this.agOptions = agOptions;
    }

    /**
     * Produce a Column definition appropriate for AG Grid.
     */
    getAgSpec() {

        const ret = {
            field: this.field,
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

        const {renderer, elementRenderer} = this;
        if (elementRenderer) {
            ret.cellRendererFramework = class extends Component {
                render() {return elementRenderer(this.props)}
                refresh() {return false}
            };
        } else if (renderer) {
            ret.valueFormatter = renderer;
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