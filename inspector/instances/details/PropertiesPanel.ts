/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {hoistCmp, useContextModel, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {InspectorModel} from '@xh/hoist/inspector/InspectorModel';
import {PropertiesModel} from '@xh/hoist/inspector/instances/details/PropertiesModel';

/**
 * Properties of the selected instances, with quick filters. See {@link PropertiesModel}.
 *
 * @internal
 */
export const propertiesPanel = hoistCmp.factory({
    displayName: 'PropertiesPanel',
    model: uses(PropertiesModel, {fromContext: false}),

    render({model}) {
        const popupParent = useContextModel(InspectorModel).windowContainer;
        return panel({
            item: grid({model: model.gridModel, agOptions: {popupParent}}),
            bbar: bbar()
        });
    }
});

const bbar = hoistCmp.factory<PropertiesModel>(({model}) => {
    const {gridModel} = model;
    return toolbar({
        items: [
            buttonGroupInput({
                bind: 'quickFilters',
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
                    }),
                    button({
                        text: 'Getters',
                        value: 'autoLoadGetters',
                        tooltip:
                            'Evaluate all getters automatically. Off by default as getters can be expensive or have side effects - click (...) to evaluate one on demand.'
                    })
                ]
            }),
            filler(),
            gridCountLabel({unit: 'props', gridModel}),
            '-',
            storeFilterField({gridModel, matchMode: 'any'})
        ]
    });
});
