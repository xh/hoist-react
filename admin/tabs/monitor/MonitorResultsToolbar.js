/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistCmp} from '@xh/hoist/core';
import {hbox, filler} from '@xh/hoist/cmp/layout';
import {label} from '@xh/hoist/cmp/layout';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {Icon} from '@xh/hoist/icon';

export const monitorResultsToolbar = hoistCmp.factory(
    ({model}) => {
        const {passed, warned, failed} = model;

        return toolbar(
            button({
                icon: Icon.refresh(),
                text: 'Run all now',
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
            filler(),
            relativeTimestamp({bind: 'lastRun', options: {emptyResult: 'No results available!'}})
        );
    }
);