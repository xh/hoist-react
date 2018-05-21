/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Exception} from '@xh/hoist/exception';
import {XH} from '@xh/hoist/core';

/**
 * Centralized Exception Handler for Hoist Application.
 * Manages the logging and display of exceptions.
 */
export class ExceptionHandler {

    /**
     * Called by framework constructs to handle an exception.
     *
     * Typical application entry points to this method are via the XH.handleException() alias and
     * Promise.catchDefault().
     *
     * @param {(Error|Object|string)} exception - Error or thrown object - if not an Error, an
     *      Exception will be created via Exception.create().
     * @param {Object} [options]
     * @param {string} [options.message] - introductory text to describe the error.
     * @param {string} [options.title] - title for a modal alert dialog, if shown.
     * @param {string} [options.alertKey] - key for modal alert - when specified, only one dialog
     *      will be allowed to be created with that key. If one is already created, it will be
     *      replaced with a new instance. Avoids a repeated failure creating a stack of popups.
     * @param {boolean} [options.logOnServer] - send the exception to the server to be stored in DB
     *      for review in the system admin app. Default true.
     * @param {boolean} [options.showAlert] - display an alert dialog to the user. Default true,
     *      excepting 'isAutoRefresh' request exceptions.
     * @param {boolean} [options.showAsError] - display to user/log as "error" - default true.
     *      If true, error details and reporting options will be shown. Apps should set to false
     *      for "expected" exceptions.
     * @param {boolean} [options.requireReload] - force user to fully refresh the app in order to
     *      dismiss - default false, excepting session expired exceptions.
     */
    static handleException(exception, options) {
        if (!(exception instanceof Error)) {
            exception = Exception.create(exception);
        }

        options = this.parseOptions(exception, options);

        this.logException(exception, options);

        if (options.showAlert) {
            this.alertException(exception, options);
        }
        if (options.logOnServer) {
            this.logErrorOnServer(exception);
        }
    }


    //--------------------------------
    // Implementation
    //--------------------------------
    static logException(exception, options) {
        return (options.showAsError) ?
            console.error(options.message, exception) :
            console.log(options.message, exception);
    }

    static alertException(exception, options) {
        XH.showException(exception, options);
    }

    static parseOptions(exception, options) {
        const ret = Object.assign({}, options),
            isAutoRefresh = exception.requestOptions && exception.requestOptions.isAutoRefresh;

        ret.showAsError = ret.showAsError != null ? ret.showAsError : true;
        ret.logOnServer = ret.logOnServer != null ? ret.logOnServer : ret.showAsError;
        ret.showAlert = ret.showAlert != null ? ret.showAlert : !isAutoRefresh;
        ret.requireReload = !!ret.requireReload;

        ret.title = ret.title || (ret.showAsError ? 'Error' : 'Message');
        ret.message = ret.message || exception.message || exception.name || 'An unknown error occurred.';

        if (this.sessionExpired(exception)) {
            ret.title = 'Authentication Error';
            ret.message = 'Your session has expired. Please login.';
            ret.requireReload = true;
        }

        return ret;
    }

    static logErrorOnServer(exception) {
        const errorTrackingService = XH.errorTrackingService;
        if (errorTrackingService.isReady) {
            errorTrackingService.submitAsync({exception});
        }
    }

    static sessionExpired(exception) {
        return exception && exception.httpStatus === 401;
    }
}
