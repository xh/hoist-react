import {chart} from '@xh/hoist/cmp/chart';
import {grid} from '@xh/hoist/cmp/grid';
import {hoistCmp, uses} from '@xh/hoist/core';
import {InspectorModel} from '@xh/hoist/desktop/appcontainer/inspector/InspectorModel';
import {panel} from '@xh/hoist/desktop/cmp/panel';

export const statsPanel = hoistCmp.factory({
    model: uses(() => InspectorModel),

    /** @param {InspectorModel} model */
    render({model}) {
        return panel({
            items: [
                panel({
                    item: chart({
                        model: model.statsChartModel
                    })
                }),
                panel({
                    model: {
                        side: 'bottom',
                        defaultSize: 150
                    },
                    item: grid({
                        model: model.statsGridModel
                    })
                })

            ]
        });
    }
});
