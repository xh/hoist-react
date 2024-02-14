/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {a, div, filler, hframe, hspacer, p, span} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {InstancesModel} from '@xh/hoist/inspector/instances/InstancesModel';
import {popover} from '@xh/hoist/kit/blueprint';

export const instancesPanel = hoistCmp.factory({
    model: creates(InstancesModel),

    render({model}) {
        const {instancesPanelModel, selectedSyncRun} = model,
            headerItems = [];

        if (selectedSyncRun) {
            headerItems.push(
                popover({
                    interactionKind: 'hover',
                    target: span(Icon.filter(), ` registered @ sync run ${selectedSyncRun}`),
                    content: div({
                        className: 'xh-pad',
                        style: {width: '300px'},
                        items: [
                            p('Triggered by your selection in the Stats grid.'),
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
                hspacer()
            );
        }

        return panel({
            item: hframe(
                panel({
                    title: `Models · Services · Stores`,
                    headerItems,
                    icon: Icon.cube(),
                    compactHeader: true,
                    item: grid({
                        model: model.instancesGridModel,
                        agOptions: {
                            suppressRowGroupHidesColumns: true,
                            suppressMakeColumnVisibleAfterUnGroup: true
                        }
                    }),
                    bbar: instanceGridBar(),
                    model: instancesPanelModel
                }),
                panel({
                    title: 'Properties',
                    icon: Icon.fileText(),
                    compactHeader: true,
                    item: grid({model: model.propertiesGridModel}),
                    bbar: propertiesGridBar()
                })
            )
        });
    }
});

const instanceGridBar = hoistCmp.factory<InstancesModel>(({model}) => {
    const {instancesGridModel} = model;
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
                        text: 'xhImpl',
                        value: 'showXhImpl',
                        tooltip:
                            'Show instances created as part of internal Hoist model/component implementations'
                    })
                ]
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

const propertiesGridBar = hoistCmp.factory<InstancesModel>(({model}) => {
    const {propertiesGridModel} = model;
    return toolbar({
        items: [
            buttonGroupInput({
                bind: 'propQuickFilters',
                enableMulti: true,
                outlined: true,
                items: [
                    button({
                        text: 'Own only',
                        value: 'ownPropsOnly',
                        tooltip:
                            'Show only properties held directly by the instance, not its prototype / superclass'
                    }),
                    button({
                        icon: Icon.eye(),
                        text: 'only',
                        value: 'observablePropsOnly',
                        tooltip: 'Show only Observable properties (including getters)'
                    }),
                    button({
                        text: '_ props',
                        value: 'showUnderscoreProps',
                        tooltip: 'Include properties that begin with an underscore'
                    })
                ]
            }),
            '-',
            button({
                text: 'Load getters',
                icon: Icon.ellipsisHorizontal(),
                outlined: true,
                onClick: () => model.loadAllCurrentGetters()
            }),
            filler(),
            gridCountLabel({unit: 'props', gridModel: propertiesGridModel}),
            '-',
            storeFilterField({gridModel: propertiesGridModel, matchMode: 'any'})
        ]
    });
});
