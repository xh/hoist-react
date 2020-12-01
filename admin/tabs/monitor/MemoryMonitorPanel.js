import {MemoryMonitorModel} from '@xh/hoist/admin/tabs/monitor/MemoryMonitorModel';
import {chart} from '@xh/hoist/cmp/chart';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, placeholder} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';

export const memoryMonitorPanel = hoistCmp.factory({
    model: creates(MemoryMonitorModel),

    render({model}) {
        if (model.minVersionWarning) {
            return placeholder(model.minVersionWarning);
        }

        return panel({
            tbar: [
                button({
                    text: 'Request GC',
                    icon: Icon.trash(),
                    onClick: () => model.requestGcAsync()
                }),
                filler(),
                gridCountLabel({unit: 'snapshot'})
            ],
            items: [
                grid(),
                panel({
                    model: {
                        side: 'bottom',
                        defaultSize: 400
                    },
                    item: chart()
                })
            ],
            mask: 'onLoad'
        });
    }
});
