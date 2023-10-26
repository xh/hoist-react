/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import '@xh/hoist/mobile/register';
import {BoxProps, hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import {fragment} from '@xh/hoist/cmp/layout';
import {GridOptions} from '@xh/hoist/kit/ag-grid';
import {grid} from '@xh/hoist/cmp/grid';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {MultiZoneGridModel} from './MultiZoneGridModel';
import {multiZoneMapper} from './impl/MultiZoneMapper';

export interface MultiZoneGridProps extends HoistProps<MultiZoneGridModel>, BoxProps {
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
 * A MultiZoneGrid is a specialized version of the Grid component.
 *
 * It displays its data with multi-line full-width rows, each broken into four zones for
 * top/bottom and left/right - (tl, tr, bl, br). Zone mappings determine which of the
 * available fields should be extracted from the record and rendered into each zone.
 */
export const [MultiZoneGrid, multiZoneGrid] = hoistCmp.withFactory<MultiZoneGridProps>({
    displayName: 'MultiZoneGrid',
    model: uses(MultiZoneGridModel),
    className: 'xh-multi-zone-grid',

    render({model, className, ...props}, ref) {
        const [layoutProps] = splitLayoutProps(props);
        return fragment(
            grid({
                ...layoutProps,
                className,
                ref,
                model: model.gridModel,
                agOptions: props.agOptions
            }),
            multiZoneMapper()
        );
    }
});
