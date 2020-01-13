/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp, HoistModel, XH, uses, useLocalModel} from '@xh/hoist/core';
import {frame} from '@xh/hoist/cmp/layout';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {useOnUnmount} from '@xh/hoist/utils/react';
import {ContextKeyNavSupport} from './impl/ContextKeyNavSupport';
import {RowKeyNavSupport} from './impl/RowKeyNavSupport';

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
export const AG_ROW_HEIGHTS = {mobile: 34, desktop: 28};
export const AG_COMPACT_ROW_HEIGHTS = {mobile: 30, desktop: 24};

export const [AgGrid, agGrid] = hoistCmp.withFactory({
    displayName: 'AgGrid',
    className: 'xh-ag-grid',
    model: uses(AgGridModel),

    render({model, key, className, onGridReady, onCellContextMenu, ...props}) {
        const [layoutProps, agGridProps] = splitLayoutProps(props),
            {compact, showHover, rowBorders, stripeRows, cellBorders, showCellFocus} = model,
            {darkTheme, isMobile} = XH;

        const impl = useLocalModel(() => new LocalModel(model));
        impl.onGridReady = onGridReady;
        impl.onCellContextMenu = onCellContextMenu;

        useOnUnmount(() => {
            if (model) model.handleGridUnmount();
        });

        return frame({
            className: classNames(
                className,
                darkTheme ? 'ag-theme-balham-dark' : 'ag-theme-balham',
                compact ? 'xh-ag-grid--compact' : 'xh-ag-grid--standard',
                rowBorders ? 'xh-ag-grid--row-borders' : 'xh-ag-grid--no-row-borders',
                stripeRows ? 'xh-ag-grid--stripe-rows' : 'xh-ag-grid--no-stripe-rows',
                cellBorders ? 'xh-ag-grid--cell-borders' : 'xh-ag-grid--no-cell-borders',
                showCellFocus ? 'xh-ag-grid--show-cell-focus' : 'xh-ag-grid--no-cell-focus',
                !isMobile && showHover ? 'xh-ag-grid--show-hover' : 'xh-ag-grid--no-hover'
            ),
            ...layoutProps,
            item: agGridReact({
                // Default some ag-grid props, but allow overriding.
                getRowHeight: impl.getRowHeight,
                navigateToNextCell: impl.navigateToNextCell,

                // Pass others on directly.
                ...agGridProps,

                // These handlers are overriden, but also delegate to props passed
                onGridReady: impl.noteGridReady,
                onCellContextMenu: impl.noteCellContextMenu
            })
        });
    }
});

@HoistModel
class LocalModel {

    model;
    onGridReady;
    onCellContextMenu;

    constructor(model) {
        this.model = model;
        this.contextKeyNavSupport = !XH.isMobile ? new ContextKeyNavSupport(model) :  null;
        this.rowKeyNavSupport = !XH.isMobile ? new RowKeyNavSupport(model) :  null;
    }

    noteGridReady = (agParams) => {
        this.model.handleGridReady(agParams);
        if (this.onGridReady) {
            this.onGridReady(agParams);
        }
    };

    noteCellContextMenu = (agParams) => {
        if (this.onCellContextMenu) {
            this.onCellContextMenu(agParams);
        }
        if (this.contextKeyNavSupport) {
            this.contextKeyNavSupport.addContextMenuKeyNavigation();
        }
    };

    navigateToNextCell = (agParams) => {
        if (this.rowKeyNavSupport) {
            return this.rowKeyNavSupport.navigateToNextCell(agParams);
        }
    }

    getRowHeight = () => {
        const heights = this.model.compact ? AG_COMPACT_ROW_HEIGHTS : AG_ROW_HEIGHTS;
        return XH.isMobile ? heights.mobile : heights.desktop;
    };
}