import {chart} from '@xh/hoist/cmp/chart';
import {grid} from '@xh/hoist/cmp/grid';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {InspectorModel} from '@xh/hoist/desktop/appcontainer/inspector/InspectorModel';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';

export const statsPanel = hoistCmp.factory({
    model: uses(() => InspectorModel),

    /** @param {InspectorModel} model */
    render({model}) {
        return panel({
            model: {
                side: 'left',
                defaultSize: 500,
                persistWith: {...model.persistWith, path: 'statsPanel'}
            },
            items: [
                panel(grid({model: model.statsGridModel})),
                panel({
                    item: chart({model: model.statsChartModel}),
                    model: {
                        side: 'bottom',
                        defaultSize: 200
                    }
                })
            ],
            bbar: toolbar({
                compact: true,
                items: [
                    button({
                        text: 'Reset stats',
                        icon: Icon.reset(),
                        onClick: () => XH.inspectorService.clearStats()
                    })
                ]
            })
        });
    }
});
