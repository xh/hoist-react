/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {isString} from 'lodash';

import {hoistModel} from 'hoist/core';
import {BaseService} from './BaseService';

export class ExceptionHandlerService extends BaseService {

    /**
     *  Main Entry point. Called by framework constructs to handle an exception.
     *
     *  Typical application entry points to this method are via the 'catchDefault' option
     *  on AjaxService.request() and Promise.catchDefault()
     *
     * @param exception - Error object or String
     * @param options (optional), includes:
     *      message {String} - optional introductory text to describe the error
     *      title {String} - optional title for modal alert
     *      alertKey {String} - optional key for modal alert, when specified only one modal will be allowed to be
     *                  created with that key. If one is already created, it will be replaced with a new instance.
     *      logOnServer {Boolean} - default true, send the exception to the server to be stored in DB for analysis.
     *      showAlert {Boolean} - display a modal alert - default true, excepting 'isAutoRefresh' request exceptions.
     *      showAsError {Boolean} - display to user/log as "error" - default true.  If true, error details and
     *                  reporting affordances will be shown. Apps should set to false for "expected" exceptions.
     *      requireReload {Boolean} - present button to fully refresh the app - default false, excepting session
     *                          expired exceptions.
     */
    handleException(exception, options) {
        if (isString(exception)) {
            exception = {message: exception};
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

    // --------------------------------
    // Template methods for override
    // --------------------------------
    /**
     *  Log the processed exception.
     *  The default implementation simply logs to the console.
     *
     * @param exception, exception to be handled.
     * @param options, see handleException().  These options will already be parsed and defaults applied.
     */
    logException(exception, options) {
        return (options.showAsError) ?
            console.error(options.message, exception) :
            console.log(options.message, exception);
    }

    /**
     * Show visual alert for the processed exception.
     * This method will be called if showAlert = true.
     *
     * @param exception, exception to be handled.
     * @param options, see handleException().  These options will already be parsed and defaults applied.
     */
    alertException(exception, options) {
        hoistModel.errorDialogModel.showException(exception, options);
    }

    /**
     * Parse exception options described in handleException(), applying defaults and conventions as necessary.
     *
     * @param exception, exception to be handled.
     * @param options, see handleException().
     */
    parseOptions(exception, options) {
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

    logErrorOnServer(exception) {
        XH.errorTrackingService.submitAsync({exception});
    }

    sessionExpired(exception) {
        return exception && exception.httpStatus === 401;
    }
}
