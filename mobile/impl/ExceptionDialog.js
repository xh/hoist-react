/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';

import {ExceptionDialogModel} from './ExceptionDialogModel';

/**
 * Dialog for display of exceptions, with support for viewing a detailed stacktrace
 * and an option to force the reload of the application (in the case of a fatal exception).
 *
 * @private
 */
@HoistComponent()
export class ExceptionDialog extends Component {

    localModel = new ExceptionDialogModel();

    render() {
        return null;
    }
}
export const exceptionDialog = elemFactory(ExceptionDialog);

