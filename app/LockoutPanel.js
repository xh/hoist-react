/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from 'hoist/core';
import {box, viewport} from 'hoist/cmp/layout';
import {PropTypes as PT} from 'prop-types';

import './LockoutPanel.scss';

/**
 * Panel for display to prevent user access to all content.
 */
@HoistComponent()
export class LockoutPanel extends Component {

    static propTypes = {
        message: PT.string
    }

    render() {
        const msg = this.props.message || 'Access Denied';

        return viewport({
            alignItems: 'center',
            justifyContent: 'center',
            item: box({
                cls: 'xh-lockout-panel',
                item: msg
            })
        });
    }
}
export const lockoutPanel = elemFactory(LockoutPanel);