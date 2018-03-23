/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory, hoistComponent} from 'hoist/core';
import {button} from 'hoist/kit/blueprint';
import {label, toolbar} from 'hoist/cmp';
import {hbox, filler} from 'hoist/layout';
import {relativeTimestamp} from 'hoist/cmp/form';
import {Icon} from 'hoist/icon';

@hoistComponent()
class MonitorResultsToolbar extends Component {
    render() {
        const model = this.model,
            {passed, warned, failed, forceRunAllMonitors, lastRun} = model;

        return toolbar({
            items: [
                button({icon: Icon.refresh(), text: 'Run All Now', onClick: forceRunAllMonitors}),
                hbox({
                    cls: !failed ? 'hidden' : '',
                    items: [
                        Icon.error({prefix: 'far', style: {color: 'var(--xh-red)'}}),
                        label(`${failed} failed`)
                    ]
                }),
                hbox({
                    cls: !warned ? 'hidden' : '',
                    items: [
                        Icon.warning({prefix: 'far', style: {color: 'var(--xh-orange)'}}),
                        label(`${warned} warned`)
                    ]
                }),
                hbox({
                    cls: !passed ? 'hidden' : '',
                    items: [
                        Icon.check({prefix: 'far', style: {color: 'var(--xh-green)'}}),
                        label(`${passed} passed`)
                    ]
                }),
                filler(),
                relativeTimestamp({timeStamp: lastRun, options: {emptyString: 'No results available!'}})
            ]
        });
    }
}

export const monitorResultsToolbar = elemFactory(MonitorResultsToolbar);