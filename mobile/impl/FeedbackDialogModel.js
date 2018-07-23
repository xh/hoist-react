/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {isEmpty} from 'lodash';
import {XH, HoistModel} from '@xh/hoist/core';
import {action, observable, setter} from '@xh/hoist/mobx';

/** Model for a FeedbackDialog, managing its open/close state and feedback string.
 *
 * @private
 */
@HoistModel()
export class FeedbackDialogModel {

    @setter @observable feedback = null;
    
    submitFeedback() {
        if (isEmpty(this.feedback)) {
            this.close();
            return;
        }

        XH.feedbackService.submitAsync({message: this.feedback})
            .then(() => {
                XH.toast({message: 'Your feedback was submitted'});
                this.close();
            })
            .linkTo(XH.appLoadModel)
            .catchDefault();
    }


    @action
    close() {
        XH.feedbackIsOpen = false;
        this.feedback = null;
    }
}