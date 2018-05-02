/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {isEmpty} from 'lodash';
import {XH, HoistModel} from 'hoist/core';
import {action, observable, setter} from 'hoist/mobx';

@HoistModel()
export class FeedbackDialogModel {

    @observable isOpen = false;
    @setter @observable feedback = null;
    
    submitFeedback() {
        if (isEmpty(this.feedback)) {
            this.close();
            return;
        }

        XH.feedbackService.submitAsync({msg: this.feedback})
            .then(() => {this.close()})
            .linkTo(XH.appLoadModel)
            .catchDefault();
    }

    @action
    open() {
        this.isOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
        this.feedback = null;
    }
}