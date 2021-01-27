/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {filler, hbox, label} from '@xh/hoist/cmp/layout';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {isEmpty} from 'lodash';

export const monitorResultsToolbar = hoistCmp.factory(
    ({model}) => {
        const {passed, warned, failed, inactive, results} = model;

        return toolbar(
            button({
                icon: Icon.refresh(),
                text: 'Run all now',
                disabled: isEmpty(results),
                onClick: () => model.forceRunAllMonitors()
            }),
            hbox({
                className: !failed ? 'hidden' : '',
                items: [
                    Icon.error({prefix: 'fas', className: 'xh-red'}),
                    label(`${failed} failed`)
                ]
            }),
            hbox({
                className: !warned ? 'hidden' : '',
                items: [
                    Icon.warning({prefix: 'fas', className: 'xh-orange'}),
                    label(`${warned} warned`)
                ]
            }),
            hbox({
                className: !passed ? 'hidden' : '',
                items: [
                    Icon.checkCircle({prefix: 'fas', className: 'xh-green'}),
                    label(`${passed} passed`)
                ]
            }),
            hbox({
                className: !inactive ? 'hidden' : '',
                items: [
                    Icon.disabled({prefix: 'fas', className: 'xh-gray'}),
                    label(`${inactive} inactive`)
                ]
            }),
            filler(),
            relativeTimestamp({bind: 'lastRun'})
        );
    }
);
