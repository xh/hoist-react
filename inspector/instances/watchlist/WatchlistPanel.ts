/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {vframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, useContextModel, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {InspectorModel} from '@xh/hoist/inspector/InspectorModel';
import {WatchlistModel} from '@xh/hoist/inspector/instances/watchlist/WatchlistModel';
import {isEmpty} from 'lodash';

/**
 * Starred instances (top) and properties (bottom), split by a resizable divider. Selecting a
 * watched instance drives the detail tabs, as in the All tab. See {@link WatchlistModel}.
 *
 * @internal
 */
export const watchlistPanel = hoistCmp.factory({
    displayName: 'WatchlistPanel',
    model: uses(WatchlistModel, {fromContext: false}),

    render({model}) {
        // Parent grid popups (context/column menus) into the Inspector window.
        const popupParent = useContextModel(InspectorModel).windowContainer,
            {instancesGridModel, propsModel} = model;

        return vframe(
            panel({
                title: 'Instances',
                icon: Icon.cube(),
                compactHeader: true,
                headerItems: [
                    clearButton({
                        tooltip: 'Clear watched instances',
                        disabled: isEmpty(model.instanceKeys),
                        onClick: () => model.clearInstances()
                    })
                ],
                item: grid({model: instancesGridModel, agOptions: {popupParent}})
            }),
            panel({
                title: 'Properties',
                icon: Icon.fileText(),
                compactHeader: true,
                headerItems: [
                    clearButton({
                        tooltip: 'Clear watched properties',
                        disabled: isEmpty(model.props),
                        onClick: () => model.clearProps()
                    })
                ],
                modelConfig: {
                    side: 'bottom',
                    defaultSize: '50%',
                    collapsible: false,
                    persistWith: {...model.persistWith, path: 'watchlistPropsPanel'},
                    xhImpl: true
                },
                item: grid({model: propsModel.gridModel, agOptions: {popupParent}})
            })
        );
    }
});

const clearButton = hoistCmp.factory(({tooltip, disabled, onClick}) =>
    button({icon: Icon.reset(), minimal: true, tooltip, disabled, onClick})
);
