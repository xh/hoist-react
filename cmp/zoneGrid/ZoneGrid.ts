/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, LayoutProps, TestSupportProps, uses, XH} from '@xh/hoist/core';
import {zoneMapper as desktopZoneMapper} from '@xh/hoist/dynamics/desktop';
import {zoneMapper as mobileZoneMapper} from '@xh/hoist/dynamics/mobile';
import {GridOptions} from '@xh/hoist/kit/ag-grid';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {RefAttributes} from 'react';
import {ZoneGridModel} from './ZoneGridModel';
import './ZoneGrid.scss';

export interface ZoneGridProps
    extends HoistProps<ZoneGridModel>,
        LayoutProps,
        TestSupportProps,
        RefAttributes<HTMLDivElement> {
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
 * A ZoneGrid is a specialized version of the Grid component.
 *
 * It displays its data with multi-line full-width rows, each broken into four zones for
 * top/bottom and left/right - (tl, tr, bl, br). Zone mappings determine which of the
 * available fields should be extracted from the record and rendered into each zone.
 */
export const [ZoneGrid, zoneGrid] = hoistCmp.withFactory<ZoneGridProps>({
    displayName: 'ZoneGrid',
    model: uses(ZoneGridModel),
    className: 'xh-zone-grid',

    render({model, className, testId, ...props}, ref) {
        const {gridModel, mapperModel} = model,
            [layoutProps] = splitLayoutProps(props),
            platformZoneMapper = XH.isMobileApp ? mobileZoneMapper : desktopZoneMapper;

        return fragment(
            grid({
                ...layoutProps,
                className,
                testId,
                ref,
                model: gridModel,
                agOptions: {
                    suppressRowGroupHidesColumns: true,
                    suppressMakeColumnVisibleAfterUnGroup: true,
                    ...props.agOptions
                }
            }),
            mapperModel ? platformZoneMapper() : null
        );
    }
});
