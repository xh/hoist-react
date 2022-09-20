import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {hoistCmp, uses} from '@xh/hoist/core';
import {InspectorModel} from '@xh/hoist/desktop/appcontainer/inspector/InspectorModel';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';

export const modelInstancePanel = hoistCmp.factory({
    model: uses(() => InspectorModel),

    /** @param {InspectorModel} model */
    render({model}) {
        return panel({
            item: grid({
                flex: 1,
                model: model.modelInstanceGridModel,
                agOptions: {
                    suppressRowGroupHidesColumns: true,
                    suppressMakeColumnVisibleAfterUnGroup: true
                }
            }),
            bbar: toolbar({
                compact: true,
                items: [
                    switchInput({
                        bind: 'groupModelInstancesByClass',
                        label: 'Group by Class'
                    }),
                    filler(),
                    gridCountLabel({unit: 'model'}),
                    '-',
                    storeFilterField()
                ]
            })
        });
    }
});
