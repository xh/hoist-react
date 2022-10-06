import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, hframe} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {InstancesModel} from '@xh/hoist/inspector/instances/InstancesModel';


export const instancesPanel = hoistCmp.factory({
    model: creates(InstancesModel),

    /** @param {InstancesModel} model */
    render({model}) {
        const {instancesPanelModel} = model;

        return panel({
            item: hframe(
                panel({
                    title: 'Models · Services · Stores',
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

const instanceGridBar = hoistCmp.factory(
    /** @param {InstancesModel} */
    ({model}) => {
        const {modelInstanceGridModel} = model;
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
                            tooltip: 'Show instances created as part of internal Hoist model/component implementations'
                        })
                    ]
                }),
                filler(),
                gridCountLabel({unit: 'instance', gridModel: modelInstanceGridModel}),
                '-',
                storeFilterField({
                    gridModel: modelInstanceGridModel,
                    bind: 'instancesStoreFilter',
                    matchMode: 'any'
                })
            ]
        });
    }
);

const propertiesGridBar = hoistCmp.factory(
    /** @param {InstancesModel} */
    ({model}) => {
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
                            tooltip: 'Show only properties held directly by the instance, not its prototype / superclass'
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
                    outlined: true,
                    onClick: () => model.loadAllCurrentGetters()
                }),
                filler(),
                gridCountLabel({unit: 'props', gridModel: propertiesGridModel}),
                '-',
                storeFilterField({gridModel: propertiesGridModel, matchMode: 'any'})
            ]
        });
    }
);
