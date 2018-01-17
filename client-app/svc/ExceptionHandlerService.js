/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {BaseService} from './BaseService';
import {isString} from 'lodash';

export class ExceptionHandlerService extends BaseService {

    /**
     *  Main Entry point. Called by framework constructs to handle an exception.
     *
     *  Typical application entry points to this method are via the 'catchDefault' option
     *  on AjaxService.request() and Promise.catchDefault()
     *
     * @param e - Error object or String
     * @param options (optional), includes:
     *      message {String} - optional introductory text to describe the error
     *      title {String} - optional title for modal alert
     *      alertKey {String} - optional key for modal alert, when specified only one modal will be allowed to be
     *                  created with that key. If one is already created, it will be replaced with a new instance.
     *      showAlert {Boolean} - display a modal alert - default true, excepting 'isAutoRefresh' request exceptions.
     *      showAsError {Boolean} - display to user/log as "error" - default true.  If true, error details and
     *                  reporting affordances will be shown. Apps should set to false for "expected" exceptions.
     *      requireReload {Boolean} - present button to fully refresh the app - default false, excepting session
     *                          expired exceptions.
     */
    handleException(e, options) {
        if (isString(e)) {
            e = {message: e};
        }
        options = this.parseOptions(e, options);

        this.logException(e, options);
        if (options.showAlert) {
            this.alertException(e, options);
        }
    }

    // --------------------------------
    // Template methods for override
    // --------------------------------
    /**
     *  Log the processed exception.
     *  The default implementation simply logs to the console.
     *
     * @param e, exception to be handled.
     * @param options, see handleException().  These options will already be parsed and defaults applied.
     */
    logException(e, options) {
        return (options.showAsError) ?
            console.error(options.message, e) :
            console.log(options.message, e);
    }

    /**
     * Show visual alert for the processed exception.
     * This method will be called if showAlert = true.
     *
     * @param e, exception to be handled.
     * @param options, see handleException().  These options will already be parsed and defaults applied.
     */
    alertException(e, options) {
        alert(options.message);
    }

    /**
     * Parse exception options described in handleException(), applying defaults and conventions as necessary.
     *
     * @param e, exception to be handled.
     * @param options, see handleException().
     */
    parseOptions(e, options) {
        const ret = Object.assign({}, options),
            isAutoRefresh = e.requestOptions && e.requestOptions.isAutoRefresh;

        ret.showAlert = ret.showAlert != null ? ret.showAlert : !isAutoRefresh;
        ret.showAsError = ret.showAsError != null ? ret.showAsError : true;
        ret.requireReload = !!ret.requireReload;

        ret.title = ret.title || (ret.showAsError ? 'Error' : 'Message');
        ret.message = ret.message || e.message || e.name || 'An unknown error occurred.';

        if (this.sessionExpired(e)) {
            ret.title = 'Authentication Error';
            ret.message = 'Your session has expired. Please login.';
            ret.requireReload = true;
        }

        return ret;
    }

    sessionExpired(e) {
        return e && e.httpStatus === 401;
    }
}
