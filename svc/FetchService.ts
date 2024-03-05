/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {
    HoistService,
    XH,
    Exception,
    PlainObject,
    FetchResponse,
    LoadSpec,
    Awaitable
} from '@xh/hoist/core';
import {isLocalDate, SECONDS, ONE_MINUTE, olderThan} from '@xh/hoist/utils/datetime';
import {StatusCodes} from 'http-status-codes';
import {isDate, isFunction, isNil, omitBy} from 'lodash';
import {IStringifyOptions, stringify} from 'qs';
import {never, PromiseTimeoutSpec} from '@xh/hoist/promise';

/**
 * Service for making managed HTTP requests, both to the app's own Hoist server and to remote APIs.
 *
 * Wrapper around the standard Fetch API with some enhancements to streamline the process for
 * the most common use-cases. The Fetch API will be called with CORS enabled, credentials
 * included, and redirects followed.
 *
 * Custom headers can be provided to fetch as a plain object. App-wide default headers can be set
 * using `setDefaultHeaders()`.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API|Fetch API Docs}
 *
 * Note that the convenience methods `fetchJson`, `postJson`, `putJson` all accept the same options
 * as the main entry point `fetch`, as they delegate to fetch after setting additional defaults.
 *
 * Note: For non-SSO apps, FetchService will automatically trigger a reload of the app if a
 * 401 is encountered from a local (relative) request.  This default behavior is designed to allow
 * more seamless re-establishment of timed out authentication sessions, but can be turned off
 * via config if needed.
 */
export class FetchService extends HoistService {
    static instance: FetchService;

    NO_JSON_RESPONSES = [StatusCodes.NO_CONTENT, StatusCodes.RESET_CONTENT];

    private autoAborters = {};
    defaultHeaders = {};
    defaultTimeout = (30 * SECONDS) as any;

    override async initAsync() {
        // pre-flight to allows clean recognition when we have no server.
        try {
            await this.fetch({url: 'ping'});
        } catch (e) {
            if (e.isServerUnavailable) {
                const {baseUrl} = XH,
                    pingURL = baseUrl.startsWith('http')
                        ? `${baseUrl}ping`
                        : `${window.location.origin}${baseUrl}ping`;

                throw XH.exception({
                    name: 'UI Server Unavailable',
                    detail: e.message,
                    message:
                        'Client cannot reach UI server.  Please check UI server at the ' +
                        `following location: ${pingURL}`
                });
            }

            throw e;
        }
    }

    /**
     * Set default headers to be sent with all subsequent requests.
     * @param headers - to be sent with all fetch requests, or a function to generate.
     */
    setDefaultHeaders(headers: PlainObject | ((arg: FetchOptions) => PlainObject)) {
        this.defaultHeaders = headers;
    }

    /**
     * Set the timeout (default 30 seconds) to be used for all requests made via this service that
     * do not themselves spec a custom timeout.
     */
    setDefaultTimeout(timeout: PromiseTimeoutSpec) {
        this.defaultTimeout = timeout;
    }

    /**
     * Send a request via the underlying fetch API.
     * @returns Promise which resolves to a Fetch Response.
     */
    fetch(opts: FetchOptions): Promise<FetchResponse> {
        opts = this.withDefaults(opts);
        return this.managedFetchAsync(opts);
    }

    /**
     * Send an HTTP request and decode the response as JSON.
     * @returns the decoded JSON object, or null if the response has status in {@link NO_JSON_RESPONSES}.
     */
    fetchJson(opts: FetchOptions): Promise<any> {
        opts = this.withDefaults(opts, {Accept: 'application/json'});
        return this.managedFetchAsync(opts, async r => {
            if (this.NO_JSON_RESPONSES.includes(r.status)) return null;

            return r.json().catchWhen('SyntaxError', e => {
                throw Exception.fetchJsonParseError(opts, e);
            });
        });
    }

    /**
     * Send a GET request and decode the response as JSON.
     * @returns the decoded JSON object, or null if the response status is in {@link NO_JSON_RESPONSES}.
     */
    getJson(opts: FetchOptions): Promise<any> {
        return this.fetchJson({method: 'GET', ...opts});
    }

    /**
     * Send a POST request with a JSON body and decode the response as JSON.
     * @returns the decoded JSON object, or null if the response status is in {@link NO_JSON_RESPONSES}.
     */
    postJson(opts: FetchOptions): Promise<any> {
        return this.sendJsonInternalAsync({method: 'POST', ...opts});
    }

    /**
     * Send a PUT request with a JSON body and decode the response as JSON.
     * @returns the decoded JSON object, or null if the response status is in {@link NO_JSON_RESPONSES}.
     */
    putJson(opts: FetchOptions): Promise<any> {
        return this.sendJsonInternalAsync({method: 'PUT', ...opts});
    }

    /**
     * Send a PATCH request with a JSON body and decode the response as JSON.
     * @returns the decoded JSON object, or null if the response status is in {@link NO_JSON_RESPONSES}.
     */
    patchJson(opts: FetchOptions): Promise<any> {
        return this.sendJsonInternalAsync({method: 'PATCH', ...opts});
    }

    /**
     * Send a DELETE request with optional JSON body and decode the optional response as JSON.
     * @returns the decoded JSON object, or null if the response status is in {@link NO_JSON_RESPONSES}.
     */
    deleteJson(opts: FetchOptions): Promise<any> {
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

    //-----------------------
    // Implementation
    //-----------------------
    private withDefaults(opts: FetchOptions, extraHeaders: PlainObject = null): FetchOptions {
        const {defaultHeaders} = this,
            method = opts.method ?? opts.params ? 'POST' : 'GET',
            isPost = method === 'POST';

        return {
            ...opts,
            method,
            headers: {
                'Content-Type': isPost ? 'application/x-www-form-urlencoded' : 'text/plain',
                ...(isFunction(defaultHeaders) ? defaultHeaders(opts) : defaultHeaders),
                ...extraHeaders,
                ...opts.headers
            }
        };
    }

    private async managedFetchAsync(
        opts: FetchOptions,
        postProcess: (r: FetchResponse) => Awaitable<FetchResponse> = null
    ): Promise<FetchResponse> {
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
            return await this.fetchInternalAsync(opts, aborter).then(postProcess).timeout(timeout);
        } catch (e) {
            if (e.isTimeout) {
                aborter.abort();
                const msg =
                    timeout?.message ??
                    `Timed out loading '${opts.url}' - no response after ${e.interval}ms.`;
                throw Exception.fetchTimeout(opts, e, msg);
            }

            if (e.isHoistException) throw e;

            // Just two other cases where we expect this to *throw* -- Typically we get a fail status
            throw e.name === 'AbortError'
                ? Exception.fetchAborted(opts, e)
                : Exception.serverUnavailable(opts, e);
        } finally {
            if (autoAborters[autoAbortKey] === aborter) {
                delete autoAborters[autoAbortKey];
            }
        }
    }

    private async fetchInternalAsync(
        opts: FetchOptions,
        aborter: AbortController
    ): Promise<FetchResponse> {
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
            const qsOpts: IStringifyOptions = {
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
        const ret = (await fetch(url, fetchOpts)) as FetchResponse;

        if (!ret.ok) {
            ret.responseText = await this.safeResponseTextAsync(ret);
            const e = Exception.fetchError(opts, ret);
            if (!XH.appSpec.isSSO && isRelativeUrl && e.httpStatus === 401) {
                await this.maybeReloadForAuthAsync();
            }
            throw e;
        }

        return ret;
    }

    private async maybeReloadForAuthAsync() {
        const {appState, configService, localStorageService} = XH;

        // Don't interfere with initialization, avoid tight loops, and provide kill switch
        if (
            appState === 'RUNNING' &&
            configService.get('xhReloadOnFailedAuth', true) &&
            !localStorageService.isFake &&
            olderThan(localStorageService.get('xhLastFailedAuthReload', null), ONE_MINUTE)
        ) {
            localStorageService.set('xhLastFailedAuthReload', Date.now());
            XH.reloadApp();
            await never();
        }
    }

    private async sendJsonInternalAsync(opts: FetchOptions) {
        return this.fetchJson({
            ...opts,
            body: JSON.stringify(opts.body),
            headers: {
                'Content-Type': 'application/json',
                ...opts.headers
            }
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
}
