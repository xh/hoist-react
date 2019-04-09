/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory, LayoutSupport, XH} from '@xh/hoist/core';
import {box} from '@xh/hoist/cmp/layout';
import {omit} from 'lodash';

import {agGridReact, AgGridModel} from './index';
import './AgGrid.scss';

/**
 * Wrapper for AgGridReact
 */
@HoistComponent
@LayoutSupport
export class AgGrid extends Component {
    baseClassName = 'xh-ag-grid';
    modelClass = AgGridModel;

    static get ROW_HEIGHT() {return XH.isMobile ? 34 : 28}

    static get COMPACT_ROW_HEIGHT() {return XH.isMobile ? 30 : 24}

    constructor(props) {
        super(props);

        const {model} = this;
        this.addReaction({
            track: () => [model.isReady, model.compact],
            run: ([isReady]) => {
                if (!isReady) return;
                model.agApi.resetRowHeights();
            }
        });
    }

    render() {
        const layoutProps = this.getLayoutProps(),
            agGridProps = omit(this.getNonLayoutProps(), ['model', 'key']);

        // Default flex = 'auto' if no dimensions / flex specified.
        if (layoutProps.width == null && layoutProps.height == null && layoutProps.flex == null) {
            layoutProps.flex = 'auto';
        }

        const {compact, rowBorders, stripeRows, showCellFocus, showHover} = this.model,
            {darkTheme, isMobile} = XH;

        return box({
            className: this.getClassName(
                darkTheme ? 'ag-theme-balham-dark' : 'ag-theme-balham',
                compact ? 'xh-ag-grid--compact' : 'xh-ag-grid--standard',
                rowBorders ? 'xh-ag-grid--row-borders' : 'xh-ag-grid--no-row-borders',
                stripeRows ? 'xh-ag-grid--stripe-rows' : 'xh-ag-grid--no-stripe-rows',
                showCellFocus ? 'xh-ag-grid--show-cell-focus' : 'xh-ag-grid--no-cell-focus',
                !isMobile && showHover ? 'xh-ag-grid--show-hover' : 'xh-ag-grid--no-hover'
            ),
            ...layoutProps,
            item: agGridReact({
                // ag-grid props which we provide defaults for, but can be overridden
                getRowHeight: this.getRowHeight,

                ...agGridProps,

                // ag-grid props which we do not allow to be overridden
                onGridReady: this.onGridReady
            })
        });
    }

    getRowHeight = () => {
        return this.model.compact ? AgGrid.COMPACT_ROW_HEIGHT : AgGrid.ROW_HEIGHT;
    };

    onGridReady = (agParams) => {
        this.model.onGridReady(agParams);
        if (this.props.onGridReady) {
            this.props.onGridReady(agParams);
        }
    };
}

export const agGrid = elemFactory(AgGrid);