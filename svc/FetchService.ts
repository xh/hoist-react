/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {
    Awaitable,
    Exception,
    HoistService,
    LoadSpec,
    PlainObject,
    TrackOptions,
    XH
} from '@xh/hoist/core';
import {PromiseTimeoutSpec} from '@xh/hoist/promise';
import {isLocalDate, SECONDS} from '@xh/hoist/utils/datetime';
import {apiDeprecated, warnIf} from '@xh/hoist/utils/js';
import {StatusCodes} from 'http-status-codes';
import {isDate, isFunction, isNil, isObject, isString, omit, omitBy} from 'lodash';
import {IStringifyOptions, stringify} from 'qs';
import ShortUniqueId from 'short-unique-id';

/**
 * Service for making managed HTTP requests, both to the app's own Hoist server and to remote APIs.
 *
 * Wrapper around the standard Fetch API with some enhancements to streamline the process for
 * the most common use-cases. The Fetch API will be called with CORS enabled, credentials
 * included, and redirects followed.
 *
 * Set {@link autoGenCorrelationIds} on this service to enable auto-generation of UUID
 * Correlation IDs for requests issued by this service. Can also be set on a per-request basis
 * via {@link FetchOptions.correlationId}.
 *
 * Custom headers can be set on a request via {@link FetchOptions.headers}. Default headers for all
 * requests can be set / customized using {@link addDefaultHeaders}.
 *
 * Also see the {@link https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API | Fetch API Docs}.
 *
 * Note that the convenience methods `fetchJson`, `postJson`, `putJson` all accept the same options
 * as the main entry point `fetch`, as they delegate to fetch after setting additional defaults.
 */
export class FetchService extends HoistService {
    static instance: FetchService;

    NO_JSON_RESPONSES = [StatusCodes.NO_CONTENT, StatusCodes.RESET_CONTENT];

    private idGenerator = new ShortUniqueId({length: 16});
    private autoAborters = {};
    private _defaultHeaders: DefaultHeaders[] = [];
    private _interceptors: FetchInterceptor[] = [];
    //-----------------------------------
    // Public properties, Getters/Setters
    //------------------------------------
    /**
     * Should hoist auto-generate a Correlation ID for a request when not otherwise specified?
     * Set to `true` or a dynamic per-request function to enable.  Default false.
     */
    autoGenCorrelationIds: boolean | ((opts: FetchOptions) => boolean) = false;

    /**
     * Method for generating Correlation ID's. Defaults to a 16 character random string with
     * an extremely low probability of collisions.  Applications may customize
     * to improve readability or provide a stronger uniqueness guarantee.
     */
    genCorrelationId: () => string = () => this.idGenerator.rnd();

    /** Request header name to be used for Correlation ID tracking. */
    correlationIdHeaderKey: string = 'X-Correlation-ID';

    /** Default timeout to be used for all requests made via this service */
    defaultTimeout: PromiseTimeoutSpec = 30 * SECONDS;

    /** Default headers to be sent with all subsequent requests. */
    get defaultHeaders(): DefaultHeaders[] {
        return this._defaultHeaders;
    }

    /**
     * Promise handlers to be executed before fufilling or rejecting returned Promise.
     *
     * Use the `onRejected` handler for apps requiring common handling for particular exceptions.
     * Useful for recognizing 401s (i.e. session end), or wrapping, logging, or enhancing exceptions.
     * The simplest onRejected handler will simply rethrow the passed exception, or a wrapped version of it.
     * Such handlers may also return `never()` to prevent further processing of the request -- this
     * is useful, i.e. if the handler is going to redirect the entire app, or otherwise end normal
     * app processing.  Rejected handlers may also be able to retry and return valid results via
     * another call to fetch.
     *
     * Use the `onFulfilled` hander for enhancing, tracking, or even rejecting "successful" returns.
     * For example, a handler of this form could be used to transform a 200 response returned by
     * an API with an "error" flag into a proper client-side exception.
     */
    addInterceptor(handler: FetchInterceptor) {
        this._interceptors.push(handler);
    }

    /**
     * Add default headers to be sent with all subsequent requests.
     * @param headers - to be sent with all fetch requests, or a function to generate.
     */
    addDefaultHeaders(headers: DefaultHeaders) {
        this._defaultHeaders.push(headers);
    }

    //--------------------
    // Main Entry Points
    //--------------------
    /**
     * Send a request via the underlying fetch API.
     *
     * This is the main entry point for this API, and can be used to satisfy all
     * requests.  Other shortcut variants will delegate to this method, after setting
     * default options and pre-processing content.
     *
     *  Set `asJson` to true return a parsed JSON result, rather than the raw Response.
     *  Note that shortcut variant of this method (e.g. `fetchJson`, `postJson`) will set this
     *  flag for you.
     *
     * @returns Promise which resolves to a Response or JSON.
     */
    async fetch(opts: FetchOptions): Promise<any> {
        return this.fetchInternalAsync(opts);
    }

    /**
     * Send an HTTP request and decode the response as JSON.
     * @returns the decoded JSON object, or null if the response has status in {@link NO_JSON_RESPONSES}.
     */
    async fetchJson(opts: FetchOptions): Promise<any> {
        return this.fetchInternalAsync({asJson: true, ...opts});
    }

    /**
     * Send a GET request and decode the response as JSON.
     * @returns the decoded JSON object, or null if the response status is in {@link NO_JSON_RESPONSES}.
     */
    async getJson(opts: FetchOptions): Promise<any> {
        return this.fetchInternalAsync({asJson: true, method: 'GET', ...opts});
    }

    /**
     * Send a POST request with a JSON body and decode the response as JSON.
     * @returns the decoded JSON object, or null if the response status is in {@link NO_JSON_RESPONSES}.
     */
    async postJson(opts: FetchOptions): Promise<any> {
        return this.sendJsonInternalAsync({method: 'POST', ...opts});
    }

    /**
     * Send a PUT request with a JSON body and decode the response as JSON.
     * @returns the decoded JSON object, or null if the response status is in {@link NO_JSON_RESPONSES}.
     */
    async putJson(opts: FetchOptions): Promise<any> {
        return this.sendJsonInternalAsync({method: 'PUT', ...opts});
    }

    /**
     * Send a PATCH request with a JSON body and decode the response as JSON.
     * @returns the decoded JSON object, or null if the response status is in {@link NO_JSON_RESPONSES}.
     */
    async patchJson(opts: FetchOptions): Promise<any> {
        return this.sendJsonInternalAsync({method: 'PATCH', ...opts});
    }

    /**
     * Send a DELETE request with optional JSON body and decode the optional response as JSON.
     * @returns the decoded JSON object, or null if the response status is in {@link NO_JSON_RESPONSES}.
     */
    async deleteJson(opts: FetchOptions): Promise<any> {
        return this.sendJsonInternalAsync({method: 'DELETE', ...opts});
    }

    /**
     * Manually abort any pending request for a given autoAbortKey.
     * @returns false if no request pending for the given key.
     */
    abort(autoAbortKey: string): boolean {
        const {autoAborters} = this,
            aborter = autoAborters[autoAbortKey];

        if (!aborter) return false;

        aborter.abort();
        delete autoAborters[autoAbortKey];
        return true;
    }

    //-------------
    // Deprecations
    //-------------
    /**
     * Set the timeout (default 30 seconds) to be used for all requests made via this service that
     * do not themselves spec a custom timeout.
     * @deprecated modify `defaultTimeout` directly instead.
     */
    setDefaultTimeout(timeout: PromiseTimeoutSpec) {
        apiDeprecated('setDefaultTimeout', {
            v: '68',
            msg: 'Modify `defaultTimeout` directly instead.'
        });
        this.defaultTimeout = timeout;
    }

    /**
     * Set default headers to be sent with all subsequent requests.
     * @param headers - to be sent with all fetch requests, or a function to generate.
     * @deprecated use addDefaultHeaders instead.
     */
    setDefaultHeaders(headers: DefaultHeaders) {
        apiDeprecated('setDefaultHeaders', {v: '66', msg: 'Use addDefaultHeaders instead'});
        this.addDefaultHeaders(headers);
    }

    //-----------------------
    // Implementation
    //-----------------------
    private async fetchInternalAsync(opts: FetchOptions): Promise<any> {
        opts = this.withCorrelationId(opts);
        opts = await this.withDefaultHeadersAsync(opts);
        let ret = this.managedFetchAsync(opts);

        // Apply tracking
        const {correlationId, loadSpec, track} = opts;
        if (track) {
            const trackOptions = isString(track) ? {message: track} : track;
            warnIf(
                trackOptions.correlationId || trackOptions.loadSpec,
                'Neither Correlation ID nor LoadSpec should be set in `FetchOptions.track`. Use `FetchOptions` top-level properties instead.'
            );
            ret = ret.track({...trackOptions, correlationId: correlationId as string, loadSpec});
        }

        // Apply interceptors
        for (const interceptor of this._interceptors) {
            ret = ret.then(
                value => interceptor.onFulfilled(opts, value),
                cause => interceptor.onRejected(opts, cause)
            );
        }

        return ret;
    }

    private sendJsonInternalAsync(opts: FetchOptions) {
        return this.fetchInternalAsync({
            asJson: true,
            ...opts,
            body: JSON.stringify(opts.body),
            headers: {
                'Content-Type': 'application/json',
                ...opts.headers
            }
        });
    }

    // Resolve convenience options for Correlation ID to server-ready string
    private withCorrelationId(opts: FetchOptions): FetchOptions {
        const cid = opts.correlationId,
            autoCid = this.autoGenCorrelationIds;

        if (isString(cid)) return opts;
        if (cid === false || cid === null) return omit(opts, 'correlationId');
        if (cid === true || autoCid === true || (isFunction(autoCid) && autoCid(opts))) {
            return {...opts, correlationId: this.genCorrelationId()};
        }
        return opts;
    }

    private async withDefaultHeadersAsync(opts: FetchOptions): Promise<FetchOptions> {
        const method = opts.method ?? (opts.params ? 'POST' : 'GET'),
            isPost = method === 'POST';

        const defaultHeaders = {};
        for (const h of this.defaultHeaders) {
            Object.assign(defaultHeaders, isFunction(h) ? await h(opts) : h);
        }

        const headers = {
            'Content-Type': isPost ? 'application/x-www-form-urlencoded' : 'text/plain',
            ...defaultHeaders,
            ...(opts.asJson ? {Accept: 'application/json'} : {}),
            ...opts.headers
        };

        const {correlationIdHeaderKey} = this;
        if (opts.correlationId) {
            if (headers[correlationIdHeaderKey]) {
                console.warn(
                    `Header ${correlationIdHeaderKey} value already set within FetchOptions.`
                );
            } else {
                headers[correlationIdHeaderKey] = opts.correlationId;
            }
        }

        return {...opts, method, headers};
    }

    private async managedFetchAsync(opts: FetchOptions): Promise<any> {
        // Prepare auto-aborter
        const {autoAborters, defaultTimeout} = this,
            {autoAbortKey, timeout = defaultTimeout} = opts,
            aborter = new AbortController();

        // autoAbortKey handling.  Abort anything running under this key, and mark this run
        if (autoAbortKey) {
            autoAborters[autoAbortKey]?.abort();
            autoAborters[autoAbortKey] = aborter;
        }

        try {
            return await this.abortableFetchAsync(opts, aborter)
                .then(opts.asJson ? r => this.parseJsonAsync(opts, r) : null)
                .timeout(timeout);
        } catch (e) {
            if (e.isTimeout) {
                aborter.abort();
                const msg =
                    isObject(timeout) && 'message' in timeout
                        ? timeout.message
                        : // Exception.timeout() message already includes interval - add URL here.
                          e.message + ` loading '${opts.url}'`;
                throw Exception.fetchTimeout(opts, e, msg);
            }

            if (!e.isHoistException) {
                // Just two other cases where we expect this to *throw* -- Typically we get a fail status
                throw e.name === 'AbortError'
                    ? Exception.fetchAborted(opts, e)
                    : Exception.serverUnavailable(opts, e);
            }
            throw e;
        } finally {
            if (autoAborters[autoAbortKey] === aborter) {
                delete autoAborters[autoAbortKey];
            }
        }
    }

    private async abortableFetchAsync(
        opts: FetchOptions,
        aborter: AbortController
    ): Promise<Response> {
        // 1) Prepare URL
        let {url, method, headers, body, params} = opts,
            isRelativeUrl = !url.startsWith('/') && !url.includes('//');
        if (isRelativeUrl) {
            url = XH.baseUrl + url;
        }

        // 2) Prepare options for fetch API
        const fetchOpts: RequestInit = {
            signal: aborter.signal,
            credentials: 'include',
            redirect: 'follow',
            headers: new Headers(omitBy(headers, isNil)),
            method,
            body,
            ...opts.fetchOpts
        };

        // 3) Preprocess and apply params
        if (params) {
            const qsOpts: IStringifyOptions<true> = {
                arrayFormat: 'repeat',
                allowDots: true,
                filter: this.qsFilterFn,
                ...opts.qsOpts
            };
            const paramsString = stringify(params, qsOpts);

            if (
                ['POST', 'PUT'].includes(method) &&
                headers['Content-Type'] !== 'application/json'
            ) {
                // Fall back to an 'application/x-www-form-urlencoded' POST/PUT body if not sending json.
                fetchOpts.body = paramsString;
            } else {
                url += '?' + paramsString;
            }
        }

        // 4) Await underlying fetch and post-process response.
        const ret = await fetch(url, fetchOpts);

        if (!ret.ok) throw Exception.fetchError(opts, ret, await this.safeResponseTextAsync(ret));

        return ret;
    }

    private async parseJsonAsync(opts: FetchOptions, r: Response): Promise<any> {
        if (this.NO_JSON_RESPONSES.includes(r.status)) return null;
        return r.json().catchWhen('SyntaxError', e => {
            throw Exception.fetchJsonParseError(opts, e);
        });
    }

    private async safeResponseTextAsync(response: Response) {
        try {
            return await response.text();
        } catch (ignore) {
            return null;
        }
    }

    private qsFilterFn = (prefix, value) => {
        if (isDate(value)) return value.getTime();
        if (isLocalDate(value)) return value.isoString;
        return value;
    };
}

/** Headers to be applied to all requests.  Specified as object, or dynamic function to create. */
export type DefaultHeaders = PlainObject | ((opts: FetchOptions) => Awaitable<PlainObject>);

/** Handlers to be executed before fufilling or rejecting any exception to caller. */
export interface FetchInterceptor {
    onFulfilled: (opts: FetchOptions, value: any) => Promise<any>;
    onRejected: (opts: FetchOptions, cause: unknown) => Promise<any>;
}

/**
 * Standard options to pass through to fetch, with some additions.
 * See MDN for available options - {@link https://developer.mozilla.org/en-US/docs/Web/API/Request}.
 */
export interface FetchOptions {
    /** URL for the request. Relative urls will be appended to XH.baseUrl. */
    url: string;

    /**
     * Data to send in the request body (for POSTs/PUTs of JSON).
     * When using `fetch`, provide a string. Otherwise, provide a JSON Serializable object
     */
    body?: any;

    /**
     * Unique identifier for this request, used for tracking and logging. If `false`, no
     * `correlationId` will be set. If `true`, one will be auto-generated.
     */
    correlationId?: string | boolean;

    /**
     * Parameters to encode and append as a query string, or send with the request body
     * (for POSTs/PUTs sending form-url-encoded).
     */
    params?: PlainObject;

    /**
     * HTTP Request method to use for the request. If not specified, the method will be set to POST
     * if there are params, otherwise GET.
     */
    method?: string;

    /**
     * Headers to send with this request. A Content-Type header will be set if not provided by
     * the caller directly or via one of the xxxJson convenience methods.
     */
    headers?: PlainObject;

    /**
     * MS to wait for response before rejecting with a timeout exception. Defaults to 30 seconds,
     * but may be specified as null to specify no timeout.
     */
    timeout?: PromiseTimeoutSpec;

    /**
     * Optional metadata about the underlying request. Passed through for downstream processing by
     * utils such as {@link ExceptionHandler}.
     */
    loadSpec?: LoadSpec;

    /**
     * Options to pass to the underlying fetch request.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
     */
    fetchOpts?: PlainObject;

    /**
     * Options for qs, the library used to encode query strings.
     */
    qsOpts?: Partial<IStringifyOptions>;

    /**
     * If set, any pending requests made with the same autoAbortKey will be immediately
     * aborted in favor of the new request.
     */
    autoAbortKey?: string;

    /**
     * True to decode the HTTP response as JSON. Default false.
     */
    asJson?: boolean;

    /**
     * If set, the request will be tracked via Hoist activity tracking. (Do not set `correlationId`
     * here - use the top-level `correlationId` property instead.)
     */
    track?: string | TrackOptions;
}
