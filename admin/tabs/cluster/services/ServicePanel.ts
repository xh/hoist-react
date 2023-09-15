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
import {ServiceModel} from './ServiceModel';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';

export const servicePanel = hoistCmp.factory({
    model: creates(ServiceModel),

    render() {
        return panel({
            mask: 'onLoad',
            tbar: [
                span({
                    item: 'Hoist + Application Services',
                    className: 'xh-bold'
                }),
                filler(),
                gridCountLabel({unit: 'service'}),
                '-',
                storeFilterField({matchMode: 'any'}),
                exportButton()
            ],
            item: hframe(
                grid({
                    flex: 1,
                    agOptions: {
                        groupRowRendererParams: {
                            innerRenderer: params => params.value + ' Services'
                        }
                    }
                }),
                detailsPanel()
            )
        });
    }
});

const detailsPanel = hoistCmp.factory({
    model: uses(ServiceModel),
    render({model}) {
        const data = model.gridModel.selectedRecord?.data;
        return panel({
            title: data ? `Stats - ${data.name}` : 'Stats',
            icon: Icon.info(),
            compactHeader: true,
            modelConfig: {
                side: 'right',
                defaultSize: 450
            },
            item: data
                ? panel({
                      items: jsonInput({
                          readonly: true,
                          width: '100%',
                          height: '100%',
                          enableSearch: true,
                          showFullscreenButton: false,
                          editorProps: {lineNumbers: false},
                          value: model.fmtStats(data.stats)
                      })
                  })
                : placeholder(Icon.info(), 'Select a service.')
        });
    }
});
