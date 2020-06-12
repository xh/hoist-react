/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {Exception, stringifyErrorSafely} from '@xh/hoist/exception';
import {stripTags} from '@xh/hoist/utils/js';
import {XH} from './XH';

/**
 * Provides Centralized Exception Handling for Hoist Application.
 * Manages the logging and display of exceptions.
 */
export class ExceptionHandler {

    /**
     * Called by Hoist internally to handle exceptions, with built-in support for parsing certain
     * Hoist-specific exception options, displaying an appropriate error dialog to users, and
     * logging back to the server for stateful error tracking in the Admin Console.
     *
     * Typical application entry points to this method are the {@see XH.handleException} alias and
     * {@see Promise.catchDefault}.
     *
     * This handler provides the most value with Exceptions created by {@see Exception.create}.
     * Hoist automatically creates such exceptions in most instances, most notably in FetchService,
     * which generates de-serialized versions of server exceptions. {@see XH.exception} for a
     * convenient way to create these enhanced exceptions in application code.
     *
     * This handler will respect an `isRoutine` flag set on Exceptions that can be thrown in the
     * course of "normal" app operation and do not represent unexpected errors. When true, this
     * handler will apply defaults that avoid overly alarming the user and skip server-side logging.
     *
     * @param {(Error|Object|string)} exception - Error or thrown object - if not an Error, an
     *      Exception will be created via `Exception.create()`.
     * @param {Object} [options] - controls on how the exception should be shown and/or logged.
     * @param {string} [options.message] - text (ideally user-friendly) describing the error.
     * @param {string} [options.title] - title for an alert dialog, if shown.
     * @param {boolean} [options.showAsError] - configure modal alert and logging to indicate that
     *      this is an unexpected error. Default true for most exceptions, false for those marked
     *      as `isRoutine`.
     * @param {boolean} [options.logOnServer] - send the exception to the server to be stored for
     *      review in the Hoist Admin Console. Default true when `showAsError` is true, excepting
     *      'isAutoRefresh' fetch exceptions.
     * @param {boolean} [options.showAlert] - display an alert dialog to the user. Default true,
     *      excepting 'isAutoRefresh' and 'isFetchAborted' exceptions.
     * @param {boolean} [options.requireReload] - force user to fully refresh the app in order to
     *      dismiss - default false, excepting session-related exceptions.
     * @param {string[]} [options.hideParams] - A list of parameters that should be hidden from
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
     * This method will swallow any exceptions thrown in the course of its own execution, failing
     * silently to avoid masking or compounding the actual exception to be handled.
     *
     * (Note the App version is POSTed to ensure we capture the version of the client the user is
     * actually running when the exception was generated.)
     *
     * @param {Object} [options] - an options object
     * @param {string} [options.exception] - an instance of the Javascript Error object.
     *      Not strictly required, but hard to see when it would be omitted.
     * @param {boolean} [options.userAlerted] - true if the user was shown a modal alert.
     * @param {string} [options.userMessage] - a user-provided message, if any, detailing what they
     *      did to trigger the error, or any other details the user chooses to provide.
     * @returns {boolean} - true if message was successfully sent to server.
     */
    async logOnServerAsync({exception, userAlerted, userMessage}) {
        try {
            const error = exception ? stringifyErrorSafely(exception) : null,
                username = XH.getUsername();

            if (!username) {
                console.warn('Error report cannot be submitted to UI server - user unknown');
                return false;
            }

            await XH.fetchJson({
                url: 'xh/submitError',
                params: {
                    error,
                    msg: userMessage ? stripTags(userMessage) : '',
                    appVersion: XH.getEnv('clientVersion'),
                    userAlerted,
                    clientUsername: username
                }
            });
            return true;
        } catch (e) {
            console.error('Exception while submitting error report to UI server', e);
            return false;
        }
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    hideParams(exception, options) {
        const {fetchOptions} = exception,
            {hideParams} = options;

        if (!fetchOptions?.params) return;

        // body will just be stringfied params -- currently hide all for simplicity.
        fetchOptions.body = '******';

        hideParams.forEach(it => {
            fetchOptions.params[it] = '******';
        });
    }

    logException(exception, options) {
        return options.showAsError ?
            console.error(options.message, exception) :
            console.debug(options.message);
    }

    parseOptions(e, options) {
        const ret = {...options},
            isAutoRefresh = e.fetchOptions?.loadSpec?.isAutoRefresh ?? false,
            isRoutine = e.isRoutine ?? false,
            isFetchAborted = e.isFetchAborted ?? false;

        ret.showAsError = ret.showAsError ?? !isRoutine;
        ret.logOnServer = ret.logOnServer ?? (ret.showAsError && !isAutoRefresh);
        ret.showAlert = ret.showAlert ?? (!isAutoRefresh && !isFetchAborted);
        ret.requireReload = ret.requireReload ?? false;

        ret.title = ret.title || (ret.showAsError ? 'Error' : 'Alert');
        ret.message = ret.message || e.message || e.name || 'An unknown error occurred.';

        if (this.sessionMismatch(e)) {
            ret.title = 'Session Mismatch';
            ret.message = 'Your session may no longer be active, or no longer matches with the server. Please refresh.';
            ret.requireReload = true;
        }

        if (this.sessionExpired(e)) {
            ret.title = 'Authentication Error';
            ret.message = 'Your session has expired. Please login.';
            ret.requireReload = true;
        }

        return ret;
    }

    sessionMismatch(exception) {
        return exception.name === 'SessionMismatchException';
    }

    // Detect an expired server session for special messaging, but only for requests back to the
    // app's own server on a relative URL (to avoid triggering w/auth failures on remote CORS URLs).
    sessionExpired(exception) {
        const {httpStatus, fetchOptions} = exception,
            relativeRequest = !fetchOptions?.url?.startsWith('http');

        return relativeRequest && httpStatus === 401;
    }

    cleanStack(exception) {
        // statuses of 0, 4XX, 5XX are server errors, so the javascript stack
        // is irrelevant and potentially misleading
        if (/^[045]/.test(exception.httpStatus)) delete exception.stack;
    }
}
