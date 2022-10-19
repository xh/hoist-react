/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {filler, hbox, label} from '@xh/hoist/cmp/layout';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {isEmpty} from 'lodash';
import {MonitorResultsModel} from './MonitorResultsModel';
import {getApp} from '@xh/hoist/admin/AppModel';


export const monitorResultsToolbar = hoistCmp.factory<MonitorResultsModel>(
    ({model}) => {
        const {passed, warned, failed, inactive, results} = model,
            getClassName = (hide) => {
                return `xh-monitor-result-count ${hide ? 'xh-monitor-result-count--hidden' : ''}`;
            };

        return toolbar(
            button({
                icon: Icon.refresh(),
                text: 'Run all now',
                disabled: isEmpty(results),
                omit: getApp().readonly,
                onClick: () => model.forceRunAllMonitorsAsync()
            }),
            hbox({
                className: getClassName(!failed),
                items: [
                    toolbarSep(),
                    Icon.error({prefix: 'fas', className: 'xh-red'}),
                    label(`${failed} failed`)
                ]
            }),
            hbox({
                className: getClassName(!warned),
                items: [
                    toolbarSep(),
                    Icon.warning({prefix: 'fas', className: 'xh-orange'}),
                    label(`${warned} warned`)
                ]
            }),
            hbox({
                className: getClassName(!passed),
                items: [
                    toolbarSep(),
                    Icon.checkCircle({prefix: 'fas', className: 'xh-green'}),
                    label(`${passed} passed`)
                ]
            }),
            hbox({
                className: getClassName(!inactive),
                items: [
                    toolbarSep(),
                    Icon.disabled({prefix: 'fas', className: 'xh-gray'}),
                    label(`${inactive} inactive`)
                ]
            }),
            filler(),
            relativeTimestamp({bind: 'lastRun'})
        );
    }
);
