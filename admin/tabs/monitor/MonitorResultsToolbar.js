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
import {filler} from 'hoist/layout';
import {Icon} from 'hoist/icon';

@hoistComponent()
class MonitorResultsToolbar extends Component {
    render() {
        const model = this.model,
            {passed, lastRun} = model;
        return toolbar({
            style: {flex: 'none'},
            items: [
                button({icon: Icon.refresh(), text: 'Run All Now', onClick: this.onSubmitClick}),
                label(`${passed} Passed`),
                filler(),
                label(lastRun)
            ]
        });
    }
}

export const monitorResultsToolbar = elemFactory(MonitorResultsToolbar);