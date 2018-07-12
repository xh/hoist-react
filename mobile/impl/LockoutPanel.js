/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {PropTypes as PT} from 'prop-types';

/**
 * Panel for display to prevent user access to all content.
 */
@HoistComponent()
export class LockoutPanel extends Component {

    static propTypes = {
        message: PT.node
    }

    render() {
        return null;
    }
}

export const lockoutPanel = elemFactory(LockoutPanel);