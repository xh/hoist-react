/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {box, filler, vframe, viewport} from '@xh/hoist/cmp/layout';
import {PropTypes as PT} from 'prop-types';

import './LockoutPanel.scss';
import {impersonationBar} from './impl';

/**
 * Panel for display to prevent user access to all content.
 */
@HoistComponent()
export class LockoutPanel extends Component {

    static propTypes = {
        message: PT.node
    }

    render() {
        const msg = this.props.message || 'Access Denied';

        return viewport({
            baseCls: 'xh-lockout-panel',
            item: vframe(
                impersonationBar(),
                filler(),
                box({
                    cls: 'xh-lockout-panel-body',
                    item: msg
                }),
                filler()
            )
        });
    }
}

export const lockoutPanel = elemFactory(LockoutPanel);