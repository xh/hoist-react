/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {filler, label, span, strong} from '@xh/hoist/cmp/layout';
import {hoistCmp, XH} from '@xh/hoist/core';
import {numberInput, switchInput, textInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {fmtTimeZone} from '@xh/hoist/utils/impl';
import {clock} from '@xh/hoist/cmp/clock';

export const logViewerToolbar = hoistCmp.factory(
    ({model}) => {
        const envSvc = XH.environmentService,
            zone = envSvc.get('serverTimeZone'),
            offset = envSvc.get('serverTimeZoneOffset');

        return toolbar(
            label('Start line:'),
            numberInput({
                bind: 'startLine',
                min: 1,
                width: 80,
                disabled: model.tail
            }),
            label('Max lines:'),
            numberInput({
                bind: 'maxLines',
                min: 1,
                width: 80
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
            }),
            filler(),
            span({
                style: {whitespace: 'nowrap'},
                items: ['Server TZ: ', strong(fmtTimeZone(zone, offset))],
                omit: !zone  // zone env support requires hoist-core 7.1+
            }),
            '-',
            span({
                style: {whitespace: 'nowrap'},
                items: ['Server Time: ', strong(clock({timezone: zone, format: 'HH:mm:ss'}))],
                omit: !zone  // zone env support requires hoist-core 7.1+
            })
        );
    }
);

