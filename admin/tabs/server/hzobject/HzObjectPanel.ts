/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, hframe, placeholder, span} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp, uses} from '@xh/hoist/core';
import {exportButton} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {HzObjectModel} from './HzObjectModel';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';
import {fmtJson} from '@xh/hoist/format';

export const hzObjectPanel = hoistCmp.factory({
    model: creates(HzObjectModel),

    render() {
        return panel({
            mask: 'onLoad',
            tbar: [
                span({
                    item: 'Distributed Objects',
                    className: 'xh-bold'
                }),
                filler(),
                gridCountLabel({unit: 'objects'}),
                '-',
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
        const data = model.gridModel.selectedRecord?.data;
        return panel({
            title: data ? `Stats - ${data.name}` : 'Stats',
            compactHeader: true,
            modelConfig: {
                side: 'right',
                defaultSize: 350,
                collapsible: true,
                resizable: false
            },
            item: data
                ? panel({
                      flex: 1,
                      className: 'xh-border-left',
                      items: jsonInput({
                          readonly: true,
                          width: '100%',
                          height: '100%',
                          value: fmtJson(JSON.stringify(data.stats)),
                          showFullscreenButton: false
                      })
                  })
                : placeholder('Select an object')
        });
    }
});
