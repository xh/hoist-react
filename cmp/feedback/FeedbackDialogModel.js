/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, setter} from 'hoist/mobx';

export class FeedbackDialogModel {

    @setter @observable isOpen = false;
    @setter feedback = null;
    
    submitFeedback() {
        this.close();
    }

    close() {
        this.setIsOpen(false);
    }

}