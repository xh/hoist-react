/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory, HoistComponent} from 'hoist/core';
import {button} from 'hoist/kit/blueprint';
import {label, toolbar} from 'hoist/cmp';
import {hbox, filler} from 'hoist/layout';
import {relativeTimestamp} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

@HoistComponent()
class MonitorResultsToolbar extends Component {
    render() {
        const {passed, warned, failed, forceRunAllMonitors, lastRun} = this.model;

        return toolbar({
            items: [
                button({
                    icon: Icon.refresh(),
                    text: 'Run all now',
                    onClick: forceRunAllMonitors
                }),
                hbox({
                    cls: !failed ? 'hidden' : '',
                    items: [
                        Icon.error({prefix: 'fas', cls: 'xh-red'}),
                        label(`${failed} failed`)
                    ]
                }),
                hbox({
                    cls: !warned ? 'hidden' : '',
                    items: [
                        Icon.warning({prefix: 'fas', cls: 'xh-orange'}),
                        label(`${warned} warned`)
                    ]
                }),
                hbox({
                    cls: !passed ? 'hidden' : '',
                    items: [
                        Icon.checkCircle({prefix: 'fas', cls: 'xh-green'}),
                        label(`${passed} passed`)
                    ]
                }),
                filler(),
                relativeTimestamp({timestamp: lastRun, options: {emptyResult: 'No results available!'}})
            ]
        });
    }
}

export const monitorResultsToolbar = elemFactory(MonitorResultsToolbar);