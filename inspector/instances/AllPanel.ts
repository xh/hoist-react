/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {a, div, filler, p, span} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {InspectorModel} from '@xh/hoist/inspector/InspectorModel';
import {popover} from '@xh/hoist/kit/blueprint';
import type {InstancesModel} from './InstancesModel';

/** The All tab - every live instance, subject to the quick filters. */
export const allPanel = hoistCmp.factory<InstancesModel>({
    displayName: 'AllPanel',
    render({model}) {
        // Parent grid popups (context/column menus) into the Inspector window.
        const popupParent = useContextModel(InspectorModel).windowContainer;
        return panel({
            item: grid({
                model: model.instancesGridModel,
                agOptions: {suppressGroupChangesColumnVisibility: true, popupParent}
            }),
            bbar: instanceGridBar()
        });
    }
});

const instanceGridBar = hoistCmp.factory<InstancesModel>(({model}) => {
    const {instancesGridModel, selectedSyncRun} = model;
    return toolbar({
        items: [
            buttonGroupInput({
                bind: 'instQuickFilters',
                enableMulti: true,
                outlined: true,
                items: [
                    button({
                        text: 'Grouped',
                        value: 'showInGroups'
                    }),
                    button({
                        text: 'Anon',
                        value: 'showAnon',
                        tooltip: 'Show instances without an xhName'
                    }),
                    button({
                        text: 'xhImpl',
                        value: 'showXhImpl',
                        tooltip:
                            'Show instances created as part of internal Hoist model/component implementations'
                    })
                ]
            }),
            popover({
                omit: !selectedSyncRun,
                interactionKind: 'hover',
                item: span(Icon.filter(), ` registered @ sync run ${selectedSyncRun}`),
                content: div({
                    className: 'xh-pad',
                    style: {width: '300px'},
                    items: [
                        p('Triggered by your selection in the Memory grid.'),
                        p(
                            'Focuses this grid on instances created around the same time, in-between batched updates to stats.'
                        ),
                        p(
                            'Useful for isolating clusters of models created together as part of an interaction or handler.'
                        ),
                        p(
                            a({
                                item: '(click to clear)',
                                onClick: () => model.statsModel.gridModel.clearSelection()
                            })
                        )
                    ]
                })
            }),
            filler(),
            gridCountLabel({unit: 'instance', gridModel: instancesGridModel}),
            '-',
            storeFilterField({
                gridModel: instancesGridModel,
                bind: 'instancesStoreFilter',
                matchMode: 'any'
            })
        ]
    });
});
