/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {dialog} from 'hoist/kit/blueprint';
import {hoistComponent, elemFactory} from 'hoist/core';
import {Icon} from 'hoist/icon';

import {FeedbackDialogModel} from './FeedbackDialogModel';

@hoistComponent()
export class FeedbackDialog extends Component {

    localModel = new FeedbackDialogModel();

    render() {
        const model = this.model;
        return dialog({
            title: 'Submit Feedback',
            icon: Icon.comment(),
            isOpen: model.isOpen,
            item: 'PUT FEEDBACK HERE'
        });
    }

}
export const feedbackDialog = elemFactory(FeedbackDialog);