import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {div, filler, hframe, span} from '@xh/hoist/cmp/layout';
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
        const {propertiesPanelModel} = model,
            {collapsed} = propertiesPanelModel;

        return panel({
            item: hframe(
                panel({
                    flex: 1,
                    item: grid({
                        model: model.instancesGridModel,
                        agOptions: {
                            suppressRowGroupHidesColumns: true,
                            suppressMakeColumnVisibleAfterUnGroup: true
                        }
                    }),
                    bbar: instanceGridBar()
                }),
                panel({
                    title: collapsed ? 'Properties' : null,
                    icon: collapsed ? Icon.fileText() : null,
                    compactHeader: true,
                    model: propertiesPanelModel,
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
            compact: true,
            items: [
                switchInput({
                    bind: 'showInGroups',
                    label: 'Grouped'
                }),
                '-',
                switchInput({
                    bind: 'showXhImpl',
                    label: 'xhImpl'
                }),
                popover({
                    target: Icon.info(),
                    interactionKind: 'hover',
                    content: div({
                        className: 'xh-pad',
                        item: span('Enable to show instances created as part of internal Hoist model/component implementations.')
                    })
                }),
                filler(),
                gridCountLabel({unit: 'instance', gridModel: modelInstanceGridModel}),
                '-',
                storeFilterField({gridModel: modelInstanceGridModel, matchMode: 'any'})
            ]
        });
    }
);

const propertiesGridBar = hoistCmp.factory(
    /** @param {InstancesModel} */
    ({model}) => {
        const {propertiesGridModel} = model;
        return toolbar({
            compact: true,
            items: [
                switchInput({
                    bind: 'ownPropsOnly',
                    label: 'Own props only',
                    labelSide: 'right'
                }),
                '-',
                switchInput({
                    bind: 'observablePropsOnly',
                    label: 'Observables only',
                    labelSide: 'right'
                }),
                '-',
                switchInput({
                    bind: 'showUnderscoreProps',
                    label: '_props',
                    labelSide: 'right'
                }),
                '-',
                button({
                    text: 'Load all getters',
                    onClick: () => model.loadAllCurrentGetters()
                }),
                filler(),
                gridCountLabel({unit: 'properties', gridModel: propertiesGridModel}),
                '-',
                storeFilterField({gridModel: propertiesGridModel, matchMode: 'any'})
            ]
        });
    }
);
