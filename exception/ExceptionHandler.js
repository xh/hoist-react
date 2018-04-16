/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Exception} from  'hoist/exception';
import {XH} from 'hoist/core';

/**
 * Centralized Exception Handler for Hoist Application.
 *
 * Manages the logging and display of exceptions.
 */
export class ExceptionHandler {

    /**
     *  Main Entry point. Called by framework constructs to handle an exception.
     *
     *  Typical application entry points to this method are via the XH.handleException() alias and
     *  Promise.catchDefault()
     *
     * @param exception - {Error | String | Object} - Error or thrown object.  If not an Error, an Exception will be
     *      created via Exception.create().
     * @param options (optional), includes:
     *      message {String} - optional introductory text to describe the error
     *      title {String} - optional title for modal alert
     *      alertKey {String} - optional key for modal alert, when specified only one modal will be allowed to be
     *              created with that key. If one is already created, it will be replaced with a new instance.
     *      logOnServer {Boolean} - default true, send the exception to the server to be stored in DB for analysis.
     *      showAlert {Boolean} - display a modal alert - default true, excepting 'isAutoRefresh' request exceptions.
     *      showAsError {Boolean} - display to user/log as "error" - default true.  If true, error details and
     *              reporting affordances will be shown. Apps should set to false for "expected" exceptions.
     *      requireReload {Boolean} - force user to fully refresh the app in order to dismiss - default false, excepting
     *              session expired exceptions.
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
        XH.hoistModel.showException(exception, options);
    }

    static parseOptions(exception, options) {
        const ret = Object.assign({}, options),
            isAutoRefresh = exception.requestOptions && exception.requestOptions.isAutoRefresh;

        ret.logOnServer = ret.logOnServer != null ? ret.logOnServer : true;
        ret.showAlert = ret.showAlert != null ? ret.showAlert : !isAutoRefresh;
        ret.showAsError = ret.showAsError != null ? ret.showAsError : true;
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
