/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {div, frame} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, useLocalModel, uses, elem, XH} from '@xh/hoist/core';
import {splitLayoutProps, useOnUnmount} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isNil} from 'lodash';
import './AgGrid.scss';
import {RowKeyNavSupport} from './impl/RowKeyNavSupport';
import {AgGridModel} from './AgGridModel';
import {AgGridReact} from '@xh/hoist/kit/ag-grid';

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
export const [AgGrid, agGrid] = hoistCmp.withFactory({
    displayName: 'AgGrid',
    className: 'xh-ag-grid',
    model: uses(AgGridModel),

    render({model, key, className, onGridReady, ...props}) {

        if (!AgGridReact) {
            console.error(
                'ag-Grid has not been imported in to this application. Please import and ' +
                'register modules in Bootstrap.js. See the XH Toolbox app for an example.'
            );
            return div({
                className: 'xh-text-color-accent xh-pad',
                item: 'ag-Grid library not available.'
            });
        }

        const [layoutProps, agGridProps] = splitLayoutProps(props),
            {sizingMode, showHover, rowBorders, stripeRows, cellBorders, showCellFocus} = model,
            {darkTheme, isDesktop} = XH;

        const impl = useLocalModel(() => new LocalModel(model, agGridProps));
        impl.onGridReady = onGridReady;

        useOnUnmount(() => {
            if (model) model.handleGridUnmount();
        });

        return frame({
            className: classNames(
                className,
                darkTheme ? 'ag-theme-balham-dark' : 'ag-theme-balham',
                `xh-ag-grid--${sizingMode}`,
                rowBorders ? 'xh-ag-grid--row-borders' : 'xh-ag-grid--no-row-borders',
                stripeRows ? 'xh-ag-grid--stripe-rows' : 'xh-ag-grid--no-stripe-rows',
                cellBorders ? 'xh-ag-grid--cell-borders' : 'xh-ag-grid--no-cell-borders',
                showCellFocus ? 'xh-ag-grid--show-cell-focus' : 'xh-ag-grid--no-cell-focus',
                isDesktop && showHover ? 'xh-ag-grid--show-hover' : 'xh-ag-grid--no-hover'
            ),
            ...layoutProps,
            item: elem(AgGridReact, {
                // Default some ag-grid props, but allow overriding.
                getRowHeight: impl.getRowHeight,
                navigateToNextCell: impl.navigateToNextCell,

                // Pass others on directly.
                ...agGridProps,

                // These handlers are overridden, but also delegate to props passed
                onGridReady: impl.noteGridReady
            })
        });
    }
});

/**
 * Row heights (in pixels) enumerated here and available for global override if required
 * by stomping on these values directly. To override for individual grids, supply a custom
 * `getRowHeight` function as a direct prop to this component, or via `Grid.agOptions`.
 */
AgGrid.ROW_HEIGHTS = {large: 32, standard: 28, compact: 24, tiny: 18};
AgGrid.ROW_HEIGHTS_MOBILE = {large: 38, standard: 34, compact: 30, tiny: 26};
AgGrid.getRowHeightForSizingMode = (mode) => (XH.isMobileApp ? AgGrid.ROW_HEIGHTS_MOBILE : AgGrid.ROW_HEIGHTS)[mode];

/**
 * Header heights (in pixels)
 */
AgGrid.HEADER_HEIGHTS = {large: 36, standard: 32, compact: 28, tiny: 22};
AgGrid.HEADER_HEIGHTS_MOBILE = {large: 42, standard: 38, compact: 34, tiny: 30};
AgGrid.getHeaderHeightForSizingMode = (mode) => (XH.isMobileApp ? AgGrid.HEADER_HEIGHTS_MOBILE : AgGrid.HEADER_HEIGHTS)[mode];

class LocalModel extends HoistModel {

    model;
    onGridReady;

    constructor(model, agGridProps) {
        super();
        this.model = model;
        this.rowKeyNavSupport = XH.isDesktop ? new RowKeyNavSupport(model) : null;

        // manage header height if was not explicitly provided to component
        if (isNil(agGridProps.headerHeight)) {
            this.addReaction({
                track: () => [model.agApi, model.sizingMode, model.hideHeaders],
                run: ([api, sizingMode, hideHeaders]) => {
                    api?.setHeaderHeight(
                        hideHeaders ? 0 : AgGrid.getHeaderHeightForSizingMode(sizingMode)
                    );
                }
            });
        }
    }

    noteGridReady = (agParams) => {
        this.model.handleGridReady(agParams);
        if (this.onGridReady) {
            this.onGridReady(agParams);
        }
    };

    navigateToNextCell = (agParams) => {
        if (this.rowKeyNavSupport) {
            return this.rowKeyNavSupport.navigateToNextCell(agParams);
        }
    };

    getRowHeight = () => AgGrid.getRowHeightForSizingMode(this.model.sizingMode);
}
