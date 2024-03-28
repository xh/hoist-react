/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {Exception} from './Exception';
import {fragment, span} from '@xh/hoist/cmp/layout';
import {logError, logWarn, stripTags} from '@xh/hoist/utils/js';
import {Icon} from '@xh/hoist/icon';
import {forOwn, has, isArray, isNil, isObject, omitBy, pick, set} from 'lodash';
import {HoistException, PlainObject, XH} from '../';

export interface ExceptionHandlerOptions {
    /** Text (ideally user-friendly) describing the error. */
    message?: string;

    /** Title for an alert dialog, if shown. */
    title?: string;

    /**
     * Configure modal alert and logging to indicate that this is an unexpected error. Default
     * true for most exceptions, false for those marked as `isRoutine`.
     */
    showAsError?: boolean;

    /**
     * Send the exception to the server to be stored for review in the Hoist Admin Console?
     * Default true when `showAsError` is true, excepting 'isAutoRefresh' fetch exceptions.
     */
    logOnServer?: boolean;

    /**
     * Display an alert dialog to the user.
     * Default true, excepting 'isAutoRefresh' and 'isFetchAborted' exceptions.
     */
    showAlert?: boolean;

    /**
     * If `showAlert`, which type of alert to display. Defaults to ExceptionHandler.ALERT_TYPE.
     */
    alertType?: 'dialog' | 'toast';

    /**
     * Force user to fully refresh the app in order to dismiss - default false, excepting
     * session-related exceptions.
     */
    requireReload?: boolean;

    /**
     * A list of parameters that should be hidden from the exception log and alert.
     */
    hideParams?: string[];
}

export interface ExceptionHandlerLoggingOptions {
    /** Exception to be logged. */
    exception: HoistException;

    /** True if the user was shown a modal alert. */
    userAlerted: boolean;

    /**
     * Optional user-provided message detailing what they did to trigger the error, or any other
     * details the user chooses to provide.
     */
    userMessage?: string;
}

/**
 * Provides Centralized Exception Handling for Hoist Application.
 * Manages the logging and display of exceptions.
 */
export class ExceptionHandler {
    /**
     * Property paths within error details JSON to replace with '******'
     */
    static REDACT_PATHS: string[] = ['fetchOptions.headers.Authorization'];

    /**
     * Default type of alert to use to display exceptions with `showAlert`.
     */
    static ALERT_TYPE: 'dialog' | 'toast' = 'dialog';

    /**
     * Default props provided to toast, when alert type is 'toast'
     */
    static TOAST_PROPS: object = {
        timeout: 10000
    };

    /**
     * Called by Hoist internally to handle exceptions, with built-in support for parsing certain
     * Hoist-specific exception options, displaying an appropriate error dialog to users, and
     * logging back to the server for stateful error tracking in the Admin Console.
     *
     * Typical application entry points to this method are the {@link XH.handleException} alias and
     * {@link Promise.catchDefault}.
     *
     * This handler provides the most value with HoistExceptions created by {@link Exception.create}.
     * Hoist automatically creates such exceptions in most instances, most notably in FetchService,
     * which generates de-serialized versions of server exceptions. See {@link XH.exception} for a
     * convenient way to create these enhanced exceptions in application code.
     *
     * This handler will respect an `isRoutine` flag set on HoistExceptions that can be thrown in
     * the course of "normal" app operation and do not represent unexpected errors. When true, this
     * handler will apply defaults that avoid overly alarming the user and skip server-side logging.
     *
     * @param exception - thrown object, will be coerced into a HoistException by Exception.create().
     * @param options - provides further control over how the exception is shown and/or logged.
     */
    handleException(exception: unknown, options?: ExceptionHandlerOptions) {
        if (XH.pageState == 'terminated' || XH.pageState == 'frozen') return;

        const {e, opts} = this.parseArgs(exception, options);

        const {showAlert, alertType, logOnServer, title, message, showAsError} = opts;

        this.logException(e, opts);
        if (showAlert) {
            const {exceptionDialogModel} = XH.appContainerModel;
            if (alertType === 'toast') {
                XH.toast({
                    message: fragment(
                        span({className: 'xh-toast__title', item: title, omit: !title}),
                        span({className: 'xh-toast__body', item: message})
                    ),
                    actionButtonProps: {
                        icon: Icon.search(),
                        onClick: () => exceptionDialogModel.show(e, opts)
                    },
                    intent: showAsError ? 'danger' : 'primary',
                    ...ExceptionHandler.TOAST_PROPS
                });
            } else {
                exceptionDialogModel.show(e, opts);
            }
        }
        if (logOnServer) {
            this.logOnServerAsync({exception: e, userAlerted: showAlert});
        }
    }

    /**
     * Show an exception in an error dialog, without logging the error to the server or console.
     * Intended to be used for the deferred / user-initiated showing of exceptions that have
     * already been appropriately logged. Applications should typically prefer `handleException`.
     *
     * @param exception - thrown object, will be coerced into a HoistException by Exception.create().
     * @param options - provides further control over how the exception is shown and/or logged.
     */
    showException(exception: unknown, options?: ExceptionHandlerOptions) {
        if (XH.pageState == 'terminated' || XH.pageState == 'frozen') return;

        const {e, opts} = this.parseArgs(exception, options);
        XH.appContainerModel.exceptionDialogModel.show(e, opts);
    }

    /**
     * Show an exception in full detail, with ability to report and copy to clipboard.
     * Intended to be used for the deferred / user-initiated showing of exceptions that have
     * already been appropriately logged. Apps should typically prefer {@link handleException}.
     *
     * @param exception - thrown object, will be coerced into a {@link HoistException}.
     * @param options - provides further control over how the exception is shown.
     */
    showExceptionDetails(exception: unknown, options?: ExceptionHandlerOptions) {
        if (XH.pageState == 'terminated' || XH.pageState == 'frozen') return;

        const {e, opts} = this.parseArgs(exception, options);
        XH.appContainerModel.exceptionDialogModel.showDetails(e, opts);
    }

    /**
     * Create a server-side exception entry. Client metadata will be set automatically.
     *
     * This method will swallow any exceptions thrown in the course of its own execution, failing
     * silently to avoid masking or compounding the actual exception to be handled.
     *
     * Note the App version is POSTed to ensure we capture the version of the client the user is
     * actually running when the exception was generated.
     *
     * @returns true if message was successfully sent to server.
     */
    async logOnServerAsync(options: ExceptionHandlerLoggingOptions): Promise<boolean> {
        const {exception, userAlerted, userMessage} = options;
        try {
            const error = this.stringifyErrorSafely(exception),
                username = XH.getUsername();

            if (!username) {
                logWarn('Error report cannot be submitted to UI server - user unknown', this);
                return false;
            }

            await XH.fetchService.postJson({
                url: 'xh/submitError',
                body: {
                    error,
                    msg: userMessage ? stripTags(userMessage) : '',
                    appVersion: XH.getEnv('clientVersion'),
                    url: window.location.href,
                    userAlerted,
                    clientUsername: username
                }
            });
            return true;
        } catch (e) {
            logError(['Exception while submitting error report to UI server', e], this);
            return false;
        }
    }

    /**
     * Serialize an error object safely for submission to server, or user display.
     * This method will avoid circular references and will trim the depth of the object.
     */
    stringifyErrorSafely(exception: HoistException): string {
        try {
            // 1) Create basic structure.
            // Raw Error does not have 'own' properties, so be explicit about core name/message/stack
            // Protect against long or circular cause chains.
            // Order here intentional for serialization
            let ret: PlainObject = {
                name: exception.name,
                message: exception.message
            };
            Object.assign(ret, exception);
            ret.stack = exception.stack?.split(/\n/g);
            if (ret.cause) {
                ret.cause = pick(ret.cause, ['name', 'message']);
            }

            ret = omitBy(ret, isNil);

            // 2) Deep clone/protect against circularity/monstrosity
            ret = this.cloneAndTrim(ret);

            // 3) Additional ad-hoc cleanups
            // Remove noisy grails exception wrapper info
            // Remove verbose loadSpec from fetchOptions
            const {serverDetails} = ret;
            if (serverDetails?.className === 'GrailsCompressingFilter') {
                delete serverDetails.className;
                delete serverDetails.lineNumber;
            }

            const {fetchOptions} = ret;
            if (fetchOptions?.loadSpec) {
                fetchOptions.loadType = fetchOptions.loadSpec.typeDisplay;
                fetchOptions.loadNumber = fetchOptions.loadSpec.loadNumber;
                delete fetchOptions.loadSpec;
            }

            // 4) Redact specified values
            ExceptionHandler.REDACT_PATHS.forEach(path => {
                if (has(ret, path)) set(ret, path, '******');
            });

            // 5) Stringify and cleanse
            return stripTags(JSON.stringify(ret, null, 4));
        } catch (e) {
            const message = 'Failed to serialize error';
            logError([message, exception, e], this);
            return JSON.stringify({message}, null, 4);
        }
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    private parseArgs(
        exception: unknown,
        options: ExceptionHandlerOptions
    ): {e: HoistException; opts: ExceptionHandlerOptions} {
        const e = Exception.create(exception),
            opts = this.parseOptions(e, options);

        if (opts.hideParams) {
            this.hideParams(e, opts);
        }

        this.cleanStack(e);

        return {e, opts};
    }

    private hideParams(e: HoistException, opts: ExceptionHandlerOptions) {
        const {fetchOptions} = e,
            {hideParams} = opts;

        if (!fetchOptions?.params) return;

        // body will just be stringified params -- currently hide all for simplicity.
        fetchOptions.body = '******';

        hideParams.forEach(it => {
            fetchOptions.params[it] = '******';
        });
    }

    private logException(e: HoistException, opts: ExceptionHandlerOptions) {
        return opts.showAsError ? console.error(opts.message, e) : console.debug(opts.message);
    }

    private parseOptions(
        e: HoistException,
        opts: ExceptionHandlerOptions
    ): ExceptionHandlerOptions {
        const ret = {...opts},
            isAutoRefresh = e.fetchOptions?.loadSpec?.isAutoRefresh ?? false,
            isRoutine = e.isRoutine ?? false,
            isFetchAborted = e.isFetchAborted ?? false;

        ret.showAsError = ret.showAsError ?? !isRoutine;
        ret.logOnServer = ret.logOnServer ?? (ret.showAsError && !isAutoRefresh);
        ret.showAlert = ret.showAlert ?? (!isAutoRefresh && !isFetchAborted);
        ret.requireReload = ret.requireReload ?? !!e.requireReload;
        ret.alertType = ret.alertType ?? ExceptionHandler.ALERT_TYPE;

        ret.title = ret.title || (ret.showAsError ? 'Error' : 'Alert');
        ret.message = ret.message || e.message || e.name || 'An unknown error occurred.';

        if (this.sessionMismatch(e)) {
            ret.title = 'Session Mismatch';
            ret.message =
                'Your session may no longer be active, or no longer matches with the server. Please refresh.';
            ret.requireReload = true;
        }

        if (this.sessionExpired(e)) {
            ret.title = 'Authentication Error';
            ret.message = 'Your session has expired. Please login.';
            ret.showAsError = false;
            ret.requireReload = true;
        }

        return ret;
    }

    private sessionMismatch(e: HoistException): boolean {
        return e.name === 'SessionMismatchException';
    }

    // Detect an expired server session for special messaging, but only for requests back to the
    // app's own server on a relative URL (to avoid triggering w/auth failures on remote CORS URLs).
    private sessionExpired(e: HoistException): boolean {
        if (XH.appSpec.isSSO) return false;
        const {httpStatus, fetchOptions} = e,
            relativeRequest = !fetchOptions?.url?.startsWith('http');

        return relativeRequest && httpStatus === 401;
    }

    private cleanStack(e: HoistException) {
        // statuses of 0, 4XX, 5XX are server errors, so the javascript stack
        // is irrelevant and potentially misleading
        if (/^[045]/.test(e.httpStatus)) delete e.stack;
    }

    private cloneAndTrim(obj, depth = 5) {
        // Create a depth-constrained, deep copy of an object for safe-use in stringify
        //   - Skip private _XXXX properties.
        //   - Don't touch objects that implement toJSON()
        if (depth < 1) return null;

        const ret = {};
        forOwn(obj, (val, key) => {
            if (key.startsWith('_')) return;
            if (val && !val.toJSON) {
                if (isObject(val)) {
                    val = depth > 1 ? this.cloneAndTrim(val, depth - 1) : '{...}';
                }
                if (isArray(val)) {
                    val = depth > 1 ? val.map(it => this.cloneAndTrim(it, depth - 1)) : '[...]';
                }
            }
            ret[key] = val;
        });

        return ret;
    }
}
