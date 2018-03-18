/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {hoistComponentFactory} from 'hoist/core';
import {box, viewport} from 'hoist/layout';
import './LockoutPanel.scss';

export const lockoutPanel = hoistComponentFactory((props) => {
    const msg = props.message || 'Access Denied';

    return viewport({
        alignItems: 'center',
        justifyContent: 'center',
        item: box({
            cls: 'xh-lockout-panel',
            item: msg
        })
    });
});