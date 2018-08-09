/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {startCase} from 'lodash';
import {ExportFormat} from './ExportFormat';
import {withDefault, withDefaultTrue, withDefaultFalse, throwIf, warnIf} from '@xh/hoist/utils/JsUtils';

/**
 * Definition of display and other meta-data for a grid column.
 */
export class Column {

    static DEFAULT_WIDTH = 60;
    static FLEX_COL_MIN_WIDTH = 30;

    /**
     * Create a new column.
     */
    constructor({
        field,
        colId,
        headerName,
        hide,
        align,
        width,
        minWidth,
        maxWidth,
        flex,
        resizable,
        movable,
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
        throwIf(!this.colId, 'Must specify colId or field in Column.');

        this.headerName = withDefault(headerName, startCase(this.colId));
        this.hide = withDefaultFalse(hide);
        this.align = align;

        warnIf(
            flex && width,
            `Column ${this.colId} should not be specified with both flex = true && width.  Width will be ignored.`,
        );
        this.flex = withDefaultFalse(flex);
        this.width = this.flex ? null : width || Column.DEFAULT_WIDTH;

        // Prevent flex col from becoming hidden inadvertently.  Can be avoided by setting minWidth to null or 0.
        this.minWidth = withDefault(minWidth, this.flex ? Column.FLEX_COL_MIN_WIDTH : null);
        this.maxWidth = maxWidth;

        this.resizable = withDefaultTrue(resizable);
        this.movable = withDefaultTrue(movable);

        this.renderer = renderer;
        this.elementRenderer = elementRenderer;

        this.chooserName = chooserName || this.headerName || this.colId;
        this.chooserGroup = chooserGroup;
        this.chooserDescription = chooserDescription;
        this.excludeFromChooser = withDefaultFalse(excludeFromChooser, false);

        this.exportName = exportName || this.headerName || this.colId;
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
            hide: this.hide,
            minWidth: this.minWidth,
            maxWidth: this.maxWidth,
            suppressResize: !this.resizable,
            suppressMovable: !this.movable,
            ...this.agOptions
        };

        const {align} = this;
        if (align === 'center' || align === 'right') {
            ret.headerClass = ret.headerClass || [];
            ret.cellClass = ret.cellClass || [];
            ret.headerClass.push('xh-column-header-align-'+align);
            ret.cellClass.push('xh-align-'+align);
        }

        if (this.flex) {
            ret.suppressResize = true;
            ret.width = Number.MAX_SAFE_INTEGER;
        } else {
            ret.suppressSizeToFit = true;
            ret.width = this.width;
        }

        const {renderer, elementRenderer} = this;
        if (renderer) {
            ret.cellRenderer = (params) => {
                const metaData = {colId: params.column.colId};
                return renderer(params.value, params.data, metaData);
            };
        } else if (elementRenderer) {
            ret.cellRendererFramework = class extends Component {
                render() {return elementRenderer(this.props)}
                refresh() {return false}
            };
        }
        
        return ret;
    }
}