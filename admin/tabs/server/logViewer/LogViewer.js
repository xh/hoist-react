/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {clock} from '@xh/hoist/cmp/clock';
import {grid} from '@xh/hoist/cmp/grid';
import {hframe, label, strong} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {numberInput, switchInput, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {fmtTimeZone} from '@xh/hoist/utils/impl';
import {logDisplay} from './LogDisplay';
import './LogViewer.scss';
import {LogViewerModel} from './LogViewerModel';

export const logViewer = hoistCmp.factory({
    model: creates(LogViewerModel),

    /** @param {LogViewerModel} model */
    render({model}) {
        const {filesGridModel} = model;

        return hframe({
            className: 'xh-log-viewer',
            ref: model.viewRef,
            items: [
                panel({
                    title: 'Available Server Logs',
                    icon: Icon.fileText(),
                    compactHeader: true,
                    model: {
                        side: 'left',
                        defaultSize: 380
                    },
                    item: grid(),
                    bbar: [
                        storeFilterField({flex: 1}),
                        recordActionBar({
                            selModel: filesGridModel.selModel,
                            gridModel: filesGridModel,
                            actions: [
                                {...model.downloadFileAction, text: null},
                                {...model.deleteFileAction, text: null}
                            ]
                        })
                    ]
                }),
                panel({
                    tbar: tbar(),
                    item: logDisplay(),
                    bbar: bbar(),
                    mask: 'onLoad'
                })
            ]
        });
    }
});

const bbar = hoistCmp.factory(
    () => {
        const zone = XH.getEnv('serverTimeZone'),
            offset = XH.getEnv('serverTimeZoneOffset');

        return toolbar({
            items: [
                'Server Time:',
                strong(clock({timezone: zone, format: 'HH:mm:ss'})),
                label(' ['),
                fmtTimeZone(zone, offset),
                ']'
            ],
            omit: !zone  // zone env support requires hoist-core 7.1+
        });
    }
);

const tbar = hoistCmp.factory(
    ({model}) => {
        return toolbar(
            label('Start line:'),
            numberInput({
                bind: 'startLine',
                min: 1,
                width: 80,
                disabled: model.tail,
                displayWithCommas: true
            }),
            label('Max lines:'),
            numberInput({
                bind: 'maxLines',
                min: 1,
                width: 80,
                displayWithCommas: true
            }),
            '-',
            textInput({
                bind: 'pattern',
                placeholder: 'Search...',
                enableClear: true,
                width: 150
            }),
            '-',
            switchInput({
                bind: 'tail',
                label: 'Tail mode',
                labelSide: 'left'
            })
        );
    }
);