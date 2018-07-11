/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';

/**
 * Default display of application suspension.
 *
 * This display can be overridden by applications.
 * @see HoistApp.suspendedDialogClass
 *
 * @private
 */
@HoistComponent()
export class SuspendedDialog extends Component {
    
    render() {
        return null;
    }
}