/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {errorMessage} from '@xh/hoist/cmp/error';
import {grid} from '@xh/hoist/cmp/grid';
import type {HoistProps, LayoutProps, TestSupportProps} from '@xh/hoist/core';
import {hoistCmp, uses} from '@xh/hoist/core';
import type {GridOptions} from '@xh/hoist/kit/ag-grid';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {CubeGridModel} from './CubeGridModel';

export interface CubeGridProps<M extends CubeGridModel = CubeGridModel>
    extends HoistProps<M>, LayoutProps, TestSupportProps {
    /**
     * Options for ag-Grid's API.
     *
     * This constitutes an 'escape hatch' for applications that need to get to the underlying
     * ag-Grid API. It should be used with care. Settings made here might be overwritten and/or
     * interfere with the implementation of this component and its use of the ag-Grid API.
     *
     * Note that changes to these options after the component's initial render will be ignored.
     */
    agOptions?: GridOptions;
}

/**
 * A CubeGrid is a specialized version of the Grid component, bound to a Cube View.
 *
 * It displays group rows down a tree column with the app's columns and, when the view's query
 * pivots, pivot paths across nested column groups with optional docked summaries. See
 * {@link CubeGridModel} for its configuration.
 *
 * While the view declines its data - see {@link ViewResult.exception} - an {@link ErrorMessage}
 * renders in place of the grid.
 */
export const [CubeGrid, cubeGrid] = hoistCmp.withFactory<CubeGridProps>({
    displayName: 'CubeGrid',
    model: uses(CubeGridModel),
    className: 'xh-cube-grid',

    render({model, className, testId, ...props}, ref) {
        const [layoutProps] = splitLayoutProps(props),
            {exception} = model.view.result;

        if (exception)
            return errorMessage({...layoutProps, className, testId, ref, error: exception});

        return grid({
            ...layoutProps,
            className,
            testId,
            ref,
            model: model.gridModel,
            agOptions: props.agOptions
        });
    }
});
