/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {observable, setter, action} from 'hoist/mobx';
import {errorTrackingService} from 'hoist';

/**
 * User Errors to be displayed to the user for feedback and troubleshooting.
 */
export class ErrorDialogModel {

    /** A non-null value here will cause an exception to be displayed modally */
    @observable exception = null

    /** Are we showing the full details of the error above? */
    @setter @observable detailsVisible = true;

    /** Message the user would like to transmit with the error report. */
    @setter @observable msg = '';

    /**
     * Options to be used for the display of the error.
     *
     * See ExceptionHandlerService.handleException() for the form of these options.
     */
    options = null;

    @action
    showException(exception, options) {
        this.exception = exception;
        this.options = options;
        this.detailsVisible = false;
        this.msg = '';
    }

    @action
    sendReport() {
        errorTrackingService
            .submitAsync({exception: this.exception, msg: this.msg})
            .then(() => this.close());
    }


    @action
    close() {
        this.exception = null;
        this.options = null;
        this.detailsVisible = false;
        this.msg = '';
    }
}