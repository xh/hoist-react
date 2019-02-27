/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Exception} from '@xh/hoist/exception';
import {XH} from './XH';
import {stringifyErrorSafely} from '@xh/hoist/exception';
import {stripTags, withDefault} from '@xh/hoist/utils/js';

/**
 * Provides Centralized Exception Handling for Hoist Application.
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
     * @param {Array} [options.hideParams] - A list of parameters that should be hidden from
     *      the exception log and alert.
     */
    handleException(exception, options) {
        if (!(exception instanceof Error)) {
            exception = Exception.create(exception);
        }

        options = this.parseOptions(exception, options);

        if (options.hideParams) {
            this.hideParams(exception, options);
        }

        this.cleanStack(exception);

        this.logException(exception, options);

        if (options.showAlert) {
            XH.appContainerModel.exceptionDialogModel.show(exception, options);
        }
        
        if (options.logOnServer) {
            this.logOnServerAsync({exception, userAlerted: options.showAlert});
        }
    }


    /**
     * Create a server-side exception entry. Client metadata will be set automatically.
     *
     * @param {Object} [options] - an options object:
     * @param {string} [options.exception] - an instance of the Javascript Error object.  Not strictly required, but hard to see when it would be omitted.
     * @param {boolean} [options.userAlerted] - flag to track whether the user was shown an alert detailing the error (optional)
     * @param {string} [options.userMessage] - the message the user has written when deliberately sending in the error (optional)
     *
     * Note: App version is POSTed to reflect the version the client is running (vs the version on the server)
     */
    async logOnServerAsync({exception, userAlerted, userMessage}) {
        // Fail somewhat silently to avoid letting problems here mask/confuse the underlying problem.
        try {
            const error = exception ? stringifyErrorSafely(exception) : null,
                username = XH.getUsername();

            if (!username) {
                console.warn('Error report cannot be submitted to server - user unknown');
                return;
            }

            await XH.fetchJson({
                url: 'xh/submitError',
                params: {
                    error,
                    msg: userMessage ? stripTags(userMessage) : '',
                    appVersion: XH.getEnv('appVersion'),
                    userAlerted,
                    clientUsername: username
                }
            });
        } catch (e) {
            console.error('Failed sending error to server:', e);
        }
    }
    
    //--------------------------------
    // Implementation
    //--------------------------------
    hideParams(exception, options) {
        const {fetchOptions} = exception,
            {hideParams} = options;

        if (!fetchOptions || !fetchOptions.params) return;

        // body will just be stringfied params -- currently hide all for simplicity.
        fetchOptions.body = '******';

        hideParams.forEach(it => {
            fetchOptions.params[it] = '******';
        });
    }

    logException(exception, options) {
        return (options.showAsError) ?
            console.error(options.message, exception) :
            console.log(options.message);
    }

    parseOptions(exception, options) {
        const ret = Object.assign({}, options),
            {fetchOptions} = exception,
            isAutoRefresh = fetchOptions && fetchOptions.loadSpec && fetchOptions.loadSpec.isAutoRefresh;

        ret.requireReload = !!ret.requireReload;

        if (exception.name == 'Fetch Aborted') {
            ret.showAsError = withDefault(ret.showAsError, false);
            ret.logOnServer = withDefault(ret.logOnServer, false);
            ret.showAlert = withDefault(ret.showAlert, false);
        } else {
            ret.showAsError = withDefault(ret.showAsError, true);
            ret.logOnServer = withDefault(ret.logOnServer, ret.showAsError);
            ret.showAlert = withDefault(ret.showAlert, !isAutoRefresh);
        }

        ret.title = ret.title || (ret.showAsError ? 'Error' : 'Message');
        ret.message = ret.message || exception.message || exception.name || 'An unknown error occurred.';

        if (this.sessionExpired(exception)) {
            ret.title = 'Authentication Error';
            ret.message = 'Your session has expired. Please login.';
            ret.requireReload = true;
        }

        return ret;
    }

    sessionExpired(exception) {
        return exception && exception.httpStatus === 401;
    }

    cleanStack(exception) {
        // statuses of 0, 4XX, 5XX are server errors, so the javascript stack
        // is irrelevant and potentially misleading
        if (/^[045]/.test(exception.httpStatus)) delete exception.stack;
    }
}
