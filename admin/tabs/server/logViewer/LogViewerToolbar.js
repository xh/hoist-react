/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {label, filler, strong, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, XH} from '@xh/hoist/core';
import {numberInput, switchInput, textInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {fmtTimeZone} from '@xh/hoist/utils/impl';
import {checkMinVersion} from '@xh/hoist/utils/js';
import {Icon} from '@xh/hoist/icon/';
import {button} from '@xh/hoist/desktop/cmp/button';

export const logViewerToolbar = hoistCmp.factory(
    ({model}) => {
        const envSvc = XH.environmentService,
            zone = envSvc.get('serverTimeZone'),
            offset = envSvc.get('serverTimeZoneOffset'),
            hasMinHoistCoreVersion = checkMinVersion(envSvc.get('hoistCoreVersion'), '9.4');

        return toolbar(
            label('Start line:'),
            numberInput({
                bind: 'startLine',
                min: 0,
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
            toolbarSep(),
            textInput({
                bind: 'pattern',
                placeholder: 'Search...',
                enableClear: true,
                width: 150
            }),
            toolbarSep(),
            switchInput({
                bind: 'tail',
                label: 'Tail mode'
            }),
            toolbarSep(),
            button({
                text: 'Download',
                icon: Icon.download(),
                disabled: !model.selectedRecord,
                onClick: () => model.downloadSelectedAsync(),
                omit: !hasMinHoistCoreVersion
            }),
            filler(),
            span({
                style: {whitespace: 'nowrap'},
                items: ['Server time zone: ', strong(fmtTimeZone(zone, offset))],
                omit: !zone  // zone env support requires hoist-core 7.1+
            })
        );
    }
);

