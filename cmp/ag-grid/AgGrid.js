/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {div, frame} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, useLocalModel, uses, elem, XH, lookup} from '@xh/hoist/core';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {throwIf} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {isNil} from 'lodash';
import './AgGrid.scss';
import {AgGridModel} from './AgGridModel';
import {AgGridReact} from '@xh/hoist/kit/ag-grid';

/**
 * Minimal wrapper for AgGridReact, supporting direct use of the ag-Grid component with limited
 * enhancements for consistent Hoist themes/styling, layout support, and a
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

    render({model, key, className, ...props}, ref) {

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

        const impl = useLocalModel(LocalModel);

        return frame({
            ref,
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
 * Full-width group row heights (in pixels). To override for individual grids, use
 * `GridModel.groupRowHeight`. Group rows that do not use the full width of the row will take the
 * same height as the data rows.
 */
AgGrid.GROUP_ROW_HEIGHTS = {large: 28, standard: 24, compact: 22, tiny: 18};
AgGrid.GROUP_ROW_HEIGHTS_MOBILE = {large: 38, standard: 34, compact: 30, tiny: 26};
AgGrid.getGroupRowHeightForSizingMode = (mode) => (XH.isMobileApp ? AgGrid.GROUP_ROW_HEIGHTS_MOBILE : AgGrid.GROUP_ROW_HEIGHTS)[mode];

/**
 * Header heights (in pixels)
 */
AgGrid.HEADER_HEIGHTS = {large: 28, standard: 24, compact: 22, tiny: 20};
AgGrid.HEADER_HEIGHTS_MOBILE = {large: 42, standard: 38, compact: 34, tiny: 30};
AgGrid.getHeaderHeightForSizingMode = (mode) => (XH.isMobileApp ? AgGrid.HEADER_HEIGHTS_MOBILE : AgGrid.HEADER_HEIGHTS)[mode];

class LocalModel extends HoistModel {

    @lookup(AgGridModel) model;

    get headerHeight() {
        const {hideHeaders, sizingMode} = this.model;
        return hideHeaders ? 0 : AgGrid.getHeaderHeightForSizingMode(sizingMode);
    }

    onLinked() {
        const {model} = this;

        throwIf(model.agApi,
            'Attempted to mount a grid on a GridModel that is already in use. ' +
            'Ensure that you are not binding your grid to the wrong model via context.'
        );

        // manage header height if was not explicitly provided to component
        if (isNil(this.componentProps.headerHeight)) {
            this.addReaction({
                track: () => [model.agApi, this.headerHeight],
                run: ([api, headerHeight]) => api?.setHeaderHeight(headerHeight)
            });
        }
    }

    noteGridReady = (agParams) => {
        this.model.handleGridReady(agParams);
        this.componentProps.onGridReady?.(agParams);
    };

    getRowHeight = () => {
        return AgGrid.getRowHeightForSizingMode(this.model.sizingMode);
    }

    destroy() {
        this.model?.handleGridUnmount();
        super.destroy();
    }
}
