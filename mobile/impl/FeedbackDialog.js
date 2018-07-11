/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';

import {FeedbackDialogModel} from './FeedbackDialogModel';

/**
 * A simple dialog component to collect user feedback from directly within the application.
 * @see FeedbackService
 *
 * @private
 */
@HoistComponent()
export class FeedbackDialog extends Component {

    localModel = new FeedbackDialogModel();

    render() {
        return null;
    }
}
export const feedbackDialog = elemFactory(FeedbackDialog);
