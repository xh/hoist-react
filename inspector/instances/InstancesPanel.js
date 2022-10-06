import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {div, filler, fragment, hframe, span} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {InstancesModel} from '@xh/hoist/inspector/instances/InstancesModel';
import {popover} from '@xh/hoist/kit/blueprint';


export const instancesPanel = hoistCmp.factory({
    model: creates(InstancesModel),

    /** @param {InstancesModel} model */
    render({model}) {
        const {instancesPanelModel} = model;

        return panel({
            item: hframe(
                panel({
                    title: 'Model + Service Instances',
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
                switchInput({
                    bind: 'showInGroups',
                    label: 'Grouped'
                }),
                '-',
                switchInput({
                    bind: 'showXhImpl',
                    label: popover({
                        target: span('xhImpl ', Icon.info()),
                        interactionKind: 'hover',
                        content: div({
                            className: 'xh-popup--framed',
                            item: span('Enable to show instances created as part of internal Hoist model/component implementations.')
                        })
                    })
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
                switchInput({
                    bind: 'ownPropsOnly',
                    label: 'Own only',
                    labelSide: 'right'
                }),
                '-',
                switchInput({
                    bind: 'observablePropsOnly',
                    label: fragment(Icon.eye(), ' only'),
                    labelSide: 'right'
                }),
                '-',
                switchInput({
                    bind: 'showUnderscoreProps',
                    label: '_ props',
                    labelSide: 'right'
                }),
                '-',
                button({
                    text: 'Load getters',
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
