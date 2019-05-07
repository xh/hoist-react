/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {omit} from 'lodash';
import {HoistComponent, elemFactory, LayoutSupport, XH} from '@xh/hoist/core';
import {box} from '@xh/hoist/cmp/layout';

import {agGridReact, AgGridModel} from './index';
import './AgGrid.scss';

/**
 * Minimal wrapper for AgGridReact, supporting direct use of the ag-Grid component with limited
 * enhancements for consistent Hoist themes/styling, layout support, keyboard navigation, and a
 * backing model for convenient access to the ag-Grid APIs and other utility methods.
 *
 * All {@link https://www.ag-grid.com/javascript-grid-properties/ ag-Grid Grid Properties}
 * can be passed as props directly to this component. Pass an {@see AgGridModel} via the `model`
 * prop to control additional Hoist customizations.
 *
 * This component complements and contrasts with the primary Hoist `Grid` class, which provides a
 * significantly more managed and opinionated wrapper around ag-Grid and a number of Hoist-specific
 * extensions and customizations. That fully managed component is expected to cover the majority of
 * use cases within Hoist apps and is recommended as the primary grid class within the toolkit.
 *
 * This wrapper is provided for advanced usages of grid that wish to leverage features of the
 * underlying component not yet supported by the Hoist layer - most notably pivoting - where the
 * managed option would conflict with or complicate access to those features.
 */
@HoistComponent
@LayoutSupport
export class AgGrid extends Component {
    baseClassName = 'xh-ag-grid';
    modelClass = AgGridModel;

    static get ROW_HEIGHT() {return XH.isMobile ? 34 : 28}
    static get COMPACT_ROW_HEIGHT() {return XH.isMobile ? 30 : 24}

    render() {
        const layoutProps = this.getLayoutProps(),
            agGridProps = omit(this.getNonLayoutProps(), ['model', 'key']);

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
                // Default some ag-grid props, but allow overriding.
                getRowHeight: this.getRowHeight,
                navigateToNextCell: this.navigateToNextCell,

                // Pass others on directly.
                ...agGridProps,

                // Always specify an onGridReady handler to wire the model to the ag APIs, but note
                // the implementation will also call any onGridReady passed via props.
                onGridReady: this.onGridReady
            })
        });
    }

    onGridReady = (agParams) => {
        this.model.init(agParams);
        if (this.props.onGridReady) {
            this.props.onGridReady(agParams);
        }
    };

    getRowHeight = () => {
        return this.model.compact ? AgGrid.COMPACT_ROW_HEIGHT : AgGrid.ROW_HEIGHT;
    };

    navigateToNextCell = (agParams) => {
        if (XH.isMobile) return;

        const {nextCellDef, previousCellDef, event} = agParams,
            {agApi} = this.model,
            shiftKey = event.shiftKey,
            prevIndex = previousCellDef ? previousCellDef.rowIndex : null,
            nextIndex = nextCellDef ? nextCellDef.rowIndex : null,
            prevNode = prevIndex != null ? agApi.getDisplayedRowAtIndex(prevIndex) : null,
            nextNode = nextIndex != null ? agApi.getDisplayedRowAtIndex(nextIndex) : null,
            prevNodeIsParent = prevNode && prevNode.allChildrenCount,
            KEY_UP = 38, KEY_DOWN = 40, KEY_LEFT = 37, KEY_RIGHT = 39;

        switch (agParams.key) {
            case KEY_DOWN:
            case KEY_UP:
                if (nextNode) {
                    if (!shiftKey || !prevNode.isSelected()) {
                        // 0) Simple move of selection
                        nextNode.setSelected(true, true);
                    } else {
                        // 1) Extend or shrink multi-selection.
                        if (!nextNode.isSelected()) {
                            nextNode.setSelected(true, false);
                        } else {
                            prevNode.setSelected(false, false);
                        }
                    }
                }
                return nextCellDef;
            case KEY_LEFT:
                if (prevNodeIsParent && prevNode.expanded) prevNode.setExpanded(false);
                return nextCellDef;
            case KEY_RIGHT:
                if (prevNodeIsParent && !prevNode.expanded) prevNode.setExpanded(true);
                return nextCellDef;
            default:
        }
    };
}

export const agGrid = elemFactory(AgGrid);