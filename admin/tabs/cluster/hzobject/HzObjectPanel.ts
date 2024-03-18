/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, hframe, placeholder, span} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp, uses} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {HzObjectModel} from './HzObjectModel';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';

export const hzObjectPanel = hoistCmp.factory({
    model: creates(HzObjectModel),

    render({model}) {
        return panel({
            mask: 'onLoad',
            tbar: [
                span({
                    item: 'Hazelcast Distributed Objects',
                    className: 'xh-bold'
                }),
                filler(),
                gridCountLabel({unit: 'objects'}),
                '-',
                button({
                    icon: Icon.reset(),
                    text: 'Clear All Hibernate Caches',
                    tooltip: 'Clear the Hibernate caches using the native Hibernate API',
                    onClick: () => model.clearHibernateCachesAsync()
                }),
                storeFilterField({matchMode: 'any'}),
                exportButton()
            ],
            item: hframe(grid(), detailsPanel())
        });
    }
});

const detailsPanel = hoistCmp.factory({
    model: uses(HzObjectModel),
    render({model}) {
        const data = model.gridModel.selectedRecord?.raw;
        return panel({
            title: data ? `Stats: ${data.name}` : 'Stats',
            icon: Icon.info(),
            compactHeader: true,
            modelConfig: {
                side: 'right',
                defaultSize: 450
            },
            item: data
                ? panel({
                      item: jsonInput({
                          readonly: true,
                          width: '100%',
                          height: '100%',
                          showFullscreenButton: false,
                          editorProps: {lineNumbers: false},
                          value: model.fmtStats(data)
                      })
                  })
                : placeholder(Icon.grip(), 'Select an object.')
        });
    }
});
