/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {frame, placeholder} from '@xh/hoist/cmp/layout';
import {
    createElement,
    hoistCmp,
    HoistModel,
    HoistProps,
    LayoutProps,
    lookup,
    TestSupportProps,
    useLocalModel,
    uses,
    XH
} from '@xh/hoist/core';
import {AgGridReact, GridOptions} from '@xh/hoist/kit/ag-grid';
import {logError} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isNil} from 'lodash';
import './AgGrid.scss';
import {RefAttributes} from 'react';
import {AgGridModel} from './AgGridModel';

export interface AgGridProps
    extends HoistProps<AgGridModel>,
        GridOptions,
        LayoutProps,
        TestSupportProps,
        RefAttributes<HTMLDivElement> {}

/**
 * Minimal wrapper for AgGridReact, supporting direct use of the ag-Grid component with limited
 * enhancements for consistent Hoist themes/styling, layout support, and a
 * backing model for convenient access to the ag-Grid APIs and other utility methods.
 *
 * All ag-Grid Grid Properties can be passed as props directly to this component.
 * See {@link https://www.ag-grid.com/javascript-grid-properties/}.  Pass an {@link AgGridModel}
 * via the `model` prop to control additional Hoist customizations.
 *
 * This component complements and contrasts with the primary Hoist `Grid` class, which provides a
 * significantly more managed and opinionated use of ag-Grid and a number of Hoist-specific
 * extensions and customizations. That fully managed component is expected to cover the majority of
 * use cases within Hoist apps and is recommended as the primary grid class within the toolkit.
 *
 * This wrapper is provided for advanced usages of grid that wish to leverage features of the
 * underlying component not yet supported by the Hoist layer - most notably pivoting - where the
 * managed option would conflict with or complicate access to those features.
 *
 * Note that this component uses the ag-Grid `getRowHeight` prop to provide the grid with row
 * heights.  As of 4/2023, this may cause scrolling to be slow in large data sets, and
 * applications may wish to set this prop to `null` and use either a fixed `rowWidth` property, or
 * an explicit per-row setting instead. See GridModel for a more efficient, data aware approach.
 */
export const [AgGrid, agGrid] = hoistCmp.withFactory<AgGridProps>({
    displayName: 'AgGrid',
    className: 'xh-ag-grid',
    model: uses(AgGridModel),

    render({model, className, testId, ...props}, ref) {
        if (!AgGridReact) {
            logError(
                'AG Grid not imported/licensed by this app - import and register modules in Bootstrap.ts. See the XH Toolbox app for an example.',
                AgGrid
            );
            return placeholder('ag-Grid library not available.');
        }

        const [layoutProps, agGridProps] = splitLayoutProps(props),
            {
                sizingMode,
                showHover,
                rowBorders,
                stripeRows,
                cellBorders,
                showCellFocus,
                hideHeaders
            } = model,
            {darkTheme, isDesktop} = XH;

        const impl = useLocalModel(AgGridLocalModel);

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
                isDesktop && showHover ? 'xh-ag-grid--show-hover' : 'xh-ag-grid--no-hover',
                hideHeaders ? 'xh-ag-grid--hide-headers' : null
            ),
            ...layoutProps,
            testId,
            item: createElement(AgGridReact, {
                ...AgGrid['DEFAULT_PROPS'],
                // Default some ag-grid props, but allow overriding.
                reactiveCustomComponents: true, // will be default in ag-grid v32
                getRowHeight: impl.getRowHeight,
                // Pass others on directly.
                ...agGridProps,

                // These handlers are overridden, but also delegate to props passed
                onGridReady: impl.noteGridReady
            })
        });
    }
});

(function (AgGrid: any) {
    /**
     * Row heights (in pixels) enumerated here and available for global override if required
     * by stomping on these values directly. To override for individual grids, supply a custom
     * `getRowHeight` function as a direct prop to this component, or via `Grid.agOptions`.
     */
    AgGrid.ROW_HEIGHTS = {large: 32, standard: 28, compact: 24, tiny: 18};
    AgGrid.ROW_HEIGHTS_MOBILE = {large: 38, standard: 34, compact: 30, tiny: 26};
    AgGrid.getRowHeightForSizingMode = mode =>
        (XH.isMobileApp ? AgGrid.ROW_HEIGHTS_MOBILE : AgGrid.ROW_HEIGHTS)[mode];

    /**
     * Full-width group row heights (in pixels). To override for individual grids, use
     * `GridModel.groupRowHeight`. Group rows that do not use the full width of the row will take the
     * same height as the data rows.
     */
    AgGrid.GROUP_ROW_HEIGHTS = {large: 28, standard: 24, compact: 22, tiny: 18};
    AgGrid.GROUP_ROW_HEIGHTS_MOBILE = {large: 38, standard: 34, compact: 30, tiny: 26};
    AgGrid.getGroupRowHeightForSizingMode = mode =>
        (XH.isMobileApp ? AgGrid.GROUP_ROW_HEIGHTS_MOBILE : AgGrid.GROUP_ROW_HEIGHTS)[mode];

    /**
     * Header heights (in pixels)
     */
    AgGrid.HEADER_HEIGHTS = {large: 28, standard: 24, compact: 22, tiny: 20};
    AgGrid.HEADER_HEIGHTS_MOBILE = {large: 42, standard: 38, compact: 34, tiny: 30};
    AgGrid.getHeaderHeightForSizingMode = mode =>
        (XH.isMobileApp ? AgGrid.HEADER_HEIGHTS_MOBILE : AgGrid.HEADER_HEIGHTS)[mode];

    /**
     * Default props to apply to all instances of the AgGrid Component in this application.
     *
     * Note that these settings will be overridden by any values provided by the application
     * to any particular grid instance.
     */
    AgGrid.DEFAULT_PROPS = {};
})(AgGrid);

class AgGridLocalModel extends HoistModel {
    override xhImpl = true;

    @lookup(AgGridModel) model: AgGridModel;

    get headerHeight() {
        const {hideHeaders, sizingMode} = this.model,
            AgGridCmp = AgGrid as any;

        return hideHeaders ? 0 : AgGridCmp.getHeaderHeightForSizingMode(sizingMode);
    }

    override onLinked() {
        const {model} = this;

        // manage header height if was not explicitly provided to component
        if (isNil(this.componentProps.headerHeight)) {
            this.addReaction({
                track: () => [model.agApi, this.headerHeight],
                run: ([api, headerHeight]) => api?.updateGridOptions({headerHeight})
            });
        }
    }

    getRowHeight = ({node}) => {
        const {sizingMode} = this.model,
            {groupDisplayType} = this.componentProps,
            AgGridCmp = AgGrid as any;
        return node.group && groupDisplayType === 'groupRows'
            ? AgGridCmp.getGroupRowHeightForSizingMode(sizingMode)
            : AgGridCmp.getRowHeightForSizingMode(sizingMode);
    };

    noteGridReady = agParams => {
        this.model.handleGridReady(agParams);
        this.componentProps.onGridReady?.(agParams);
    };

    override destroy() {
        this.model?.handleGridUnmount();
        super.destroy();
    }
}
