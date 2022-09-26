import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, hframe} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {ModelsModel} from '@xh/hoist/desktop/appcontainer/inspector/models/ModelsModel';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';


export const modelsPanel = hoistCmp.factory({
    model: creates(ModelsModel),

    /** @param {ModelsModel} model */
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
    /** @param {ModelsModel} */
    ({model}) => {
        const {modelInstanceGridModel} = model;
        return toolbar({
            compact: true,
            items: [
                switchInput({
                    bind: 'groupModelInstancesByClass',
                    label: 'Group by class'
                }),
                filler(),
                gridCountLabel({unit: 'model', gridModel: modelInstanceGridModel}),
                '-',
                storeFilterField({gridModel: modelInstanceGridModel, matchMode: 'any'})
            ]
        });
    }
);

const propertiesGridBar = hoistCmp.factory(
    /** @param {ModelsModel} */
    ({model}) => {
        const {propertiesGridModel} = model;
        return toolbar({
            compact: true,
            items: [
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
                filler(),
                gridCountLabel({unit: 'properties', gridModel: propertiesGridModel}),
                '-',
                storeFilterField({gridModel: propertiesGridModel, matchMode: 'any'})
            ]
        });
    }
);
