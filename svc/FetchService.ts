/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    Awaitable,
    CallContext,
    CallContextLike,
    HoistService,
    LoadSpec,
    LoadSpecConfig,
    PlainObject,
    TrackOptions,
    XH,
    formatTraceparent,
    Span,
    SpanConfig
} from '@xh/hoist/core';
import {Exception, HoistException, TimeoutException} from '@xh/hoist/exception';
import {PromiseTimeoutSpec} from '@xh/hoist/promise';
import {isLocalDate, SECONDS} from '@xh/hoist/utils/datetime';
import {apiDeprecated, warnIf} from '@xh/hoist/utils/js';
import {StatusCodes} from 'http-status-codes';
import {isDate, isFunction, isNil, isObject, isString, noop, omit, omitBy, truncate} from 'lodash';
import {IStringifyOptions, stringify} from 'qs';
import ShortUniqueId from 'short-unique-id';
import {NdjsonResultImpl} from './impl/NdjsonResultImpl';
import {StringInterner} from './impl/StringInterner';

export interface FetchServiceDefaults {
    autoGenCorrelationIds?: boolean | ((opts: FetchOptions) => boolean);
    correlationIdHeaderKey?: string;
    genCorrelationId?: () => string;
}

/**
 * Service for making managed HTTP requests, both to the app's own Hoist server and to remote APIs.
 *
 * Typically accessed via `XH.fetchService` or the matching convenience aliases on `XH`
 * (`XH.fetchJson()`, `XH.postJson()`, etc.), which delegate here.
 *
 * Wraps the standard Fetch API with CORS enabled, credentials included, and redirects followed.
 * Provides JSON convenience methods (`fetchJson`, `postJson`, `putJson`, `patchJson`,
 * `deleteJson`, `getJson`) that handle serialization and content-type headers automatically,
 * plus `fetchNdjson` for consuming streamed NDJSON responses incrementally.
 *
 * Key features:
 * - Configurable timeouts (default 30s) via {@link FetchOptions.timeout}
 * - Auto-abort of duplicate in-flight requests via {@link FetchOptions.autoAbortKey}
 * - Optional correlation IDs for request tracking (see `defaults.autoGenCorrelationIds`)
 * - Request/response interceptors via {@link addInterceptor}
 * - Default headers for all requests via {@link addDefaultHeaders}
 * - Rich exception handling with HTTP status, server messages, and trace IDs
 *
 * All convenience methods accept the same {@link FetchOptions} as the main `fetch()` entry point.
 *
 * @see FetchOptions
 */
export class FetchService extends HoistService {
    static instance: FetchService;

    /** App-level defaults for FetchService. Instance options take precedence. */
    static defaults: FetchServiceDefaults = {
        autoGenCorrelationIds: false,
        correlationIdHeaderKey: 'X-Correlation-ID',
        genCorrelationId: () => FetchService.defaultIdGenerator.rnd()
    };

    NO_JSON_RESPONSES = [StatusCodes.NO_CONTENT, StatusCodes.RESET_CONTENT];

    /**
     * Regex applied during failed response handling to determine if contentType indicates JSON.
     * Matches `application/json` as well as variants such as `application/problem+json`
     */
    JSON_CONTENT_TYPE_RE = /application\/[^+]*[+]?(json);?.*/i;

    private autoAborters = {};
    private _defaultHeaders: DefaultHeaders[] = [];
    private _interceptors: FetchInterceptor[] = [];
    private interners: Map<string, StringInterner> = new Map();

    /** Default timeout to be used for all requests made via this service */
    defaultTimeout: PromiseTimeoutSpec = 30 * SECONDS;

    /** Default headers to be sent with all subsequent requests. */
    get defaultHeaders(): DefaultHeaders[] {
        return this._defaultHeaders;
    }

    /**
     * Promise handlers to be executed before fulfilling or rejecting returned Promise.
     *
     * Use the `onRejected` handler for apps requiring common handling for particular exceptions.
     * Useful for recognizing 401s (i.e., session end), or wrapping, logging, or enhancing exceptions.
     * The simplest onRejected handler will simply rethrow the passed exception, or a wrapped version of it.
     * Such handlers may also return `never()` to prevent further processing of the request -- this
     * is useful, i.e., if the handler is going to redirect the entire app, or otherwise end normal
     * app processing.  Rejected handlers may also be able to retry and return valid results via
     * another call to fetch.
     *
     * Use the `onFulfilled` handler for enhancing, tracking, or even rejecting "successful" returns.
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
     * @param opts - request options.
     * @param ctx - optional {@link CallContextLike} supplying parent span and load context.
     * @returns Promise which resolves to a Response or JSON.
     */
    async fetch(opts: FetchOptions, ctx?: CallContextLike): Promise<any> {
        return this.fetchInternalAsync(opts, ctx);
    }

    /**
     * Send an HTTP request and decode the response as JSON.
     * @returns the decoded JSON object, or null if the response has status in {@link NO_JSON_RESPONSES}.
     */
    async fetchJson(opts: FetchOptions, ctx?: CallContextLike): Promise<any> {
        return this.fetchInternalAsync({asJson: true, ...opts}, ctx);
    }

    /**
     * Send a GET request and decode the response as JSON.
     * @returns the decoded JSON object, or null if the response status is in {@link NO_JSON_RESPONSES}.
     */
    async getJson(opts: FetchOptions, ctx?: CallContextLike): Promise<any> {
        return this.fetchInternalAsync({asJson: true, method: 'GET', ...opts}, ctx);
    }

    /**
     * Send an HTTP request and decode the response body incrementally as NDJSON - newline
     * delimited JSON, aka JSON Lines / JSONL. Returns an {@link NdjsonResult} whose `lines`
     * generator yields chunks (arrays) of parsed records as they arrive off the network. No
     * more than one network chunk of raw text is buffered, making this suitable for consuming
     * very large or long-running streamed responses.
     *
     * The natural source for {@link Store.loadDataAsync} - e.g.
     * `store.loadDataAsync(XH.fetchNdjson({url}).lines)` - or iterate `lines` directly via
     * `for await` for non-Store streaming.
     *
     * Set {@link NdjsonFetchOptions.firstLineIsMeta} to treat the first record in the stream as
     * out-of-band metadata, delivered via the result's `meta` promise rather than `lines`. The
     * promise resolves as soon as the record arrives - before `lines` is consumed - so callers
     * can use it to decide how to process the balance of the stream.
     *
     * Tracing spans and `track` cover the full lifetime of the stream, through complete
     * consumption. Note that `timeout` covers the request phase only - no timeout applies while
     * the stream is being read.
     *
     * A stream truncated by a server-side failure surfaces as a 'Fetch Stream Failed' exception -
     * hoist-core's `renderNdjson` guarantees such a stream ends with an unparseable line.
     */
    fetchNdjson(opts: NdjsonFetchOptions, ctx?: CallContextLike): NdjsonResult {
        opts = this.withCorrelationId(opts);

        let runner = this.runner(ctx);

        // Configure special track and spanning across the async consumption.
        const spanConfig = this.createSpanConfig(opts),
            {track} = opts;
        if (spanConfig) {
            runner = runner.span(spanConfig);
        }
        if (track) {
            const trackOptions: TrackOptions = isString(track) ? {message: track} : track;
            runner = runner.track({...trackOptions, correlationId: opts.correlationId as string});
        }

        // The runner will manage the lifecycle, but we won't await it here -- return
        // the result straight away. Also stifle telemetry exception. Stream already produces them.
        let ret: NdjsonResultImpl;
        runner
            .run(async innerCtx => {
                ret = new NdjsonResultImpl(
                    this.fetchInternalAsync(opts, innerCtx, true),
                    opts,
                    this.getInterner(opts.internStrings),
                    (cause, response) =>
                        cause?.name === 'AbortError'
                            ? this.abortedException(opts, innerCtx, cause)
                            : this.streamFailedException(opts, innerCtx, response, cause)
                );
                await ret.whenCompleteAsync();
            })
            .catch(noop);
        return ret;
    }

    /**
     * Send a POST request with a JSON body and decode the response as JSON.
     * @returns the decoded JSON object, or null if the response status is in {@link NO_JSON_RESPONSES}.
     */
    async postJson(opts: FetchOptions, ctx?: CallContextLike): Promise<any> {
        return this.sendJsonInternalAsync({method: 'POST', ...opts}, ctx);
    }

    /**
     * Send a PUT request with a JSON body and decode the response as JSON.
     * @returns the decoded JSON object, or null if the response status is in {@link NO_JSON_RESPONSES}.
     */
    async putJson(opts: FetchOptions, ctx?: CallContextLike): Promise<any> {
        return this.sendJsonInternalAsync({method: 'PUT', ...opts}, ctx);
    }

    /**
     * Send a PATCH request with a JSON body and decode the response as JSON.
     * @returns the decoded JSON object, or null if the response status is in {@link NO_JSON_RESPONSES}.
     */
    async patchJson(opts: FetchOptions, ctx?: CallContextLike): Promise<any> {
        return this.sendJsonInternalAsync({method: 'PATCH', ...opts}, ctx);
    }

    /**
     * Send a DELETE request with optional JSON body and decode the optional response as JSON.
     * @returns the decoded JSON object, or null if the response status is in {@link NO_JSON_RESPONSES}.
     */
    async deleteJson(opts: FetchOptions, ctx?: CallContextLike): Promise<any> {
        return this.sendJsonInternalAsync({method: 'DELETE', ...opts}, ctx);
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

    /**
     * Clear string-interning caches maintained for {@link FetchOptions.internStrings} - all of
     * them, or just the cache for a single key.
     *
     * Interned strings referenced by live records remain retained by those records - this
     * releases only the cache's own references. Useful after tearing down large views whose
     * datasets will not be refetched, where the cache would otherwise continue to retain the
     * last response's distinct values.
     *
     * @param key - specific {@link StringInternSpec.key} to clear, or omit to clear all.
     */
    clearInternCaches(key?: string) {
        key ? this.interners.delete(key) : this.interners.clear();
    }

    /**
     * Snapshot of string-interning stats for each active {@link FetchOptions.internStrings}
     * key, covering the most recently completed response per key: total string values
     * processed, distinct values retained (with % of processed - lower = more duplication
     * removed), and values carried over from the prior generation (with % of retained -
     * higher = more stability across refreshes).
     *
     * Convenient from the console via `console.table(XH.fetchService.getInternStats())`.
     */
    getInternStats(): PlainObject[] {
        return Array.from(this.interners.values()).map(it => it.stats);
    }

    //-----------------------
    // Implementation
    //-----------------------
    private static readonly defaultIdGenerator = new ShortUniqueId({length: 16});

    /**
     * @param forStreaming - true when called by fetchNdjson, which applies its own span and
     *      track across the full stream lifetime - suppresses both here.
     */
    private async fetchInternalAsync(
        opts: FetchOptions,
        ctx?: CallContextLike,
        forStreaming: boolean = false
    ): Promise<any> {
        // Default to deprecated context
        ctx ??= {span: opts.span, loadSpec: opts.loadSpec as LoadSpec};
        apiDeprecated('FetchOptions.span', {
            v: 'v88',
            test: opts.span,
            source: this,
            msg: 'Pass a CallContextLike as the second argument instead.'
        });
        apiDeprecated('FetchOptions.loadSpec', {
            v: 'v88',
            test: opts.loadSpec,
            source: this,
            msg: 'Pass a CallContextLike as the second argument instead.'
        });
        opts = omit(opts, 'span', 'loadSpec');

        let spanConfig = forStreaming ? null : this.createSpanConfig(opts),
            runner = spanConfig ? this.runner(ctx).span(spanConfig) : this.runner(ctx),
            ret = runner.run(ctx => {
                opts = this.withCorrelationId(opts);
                opts = this.withTraceId(opts, ctx.span);
                return this.withResolvedHeadersAsync(opts, ctx.span).then(opts =>
                    this.managedFetchAsync(opts, ctx)
                );
            });

        // 2) Apply tracking
        if (opts.track && !forStreaming) {
            const {correlationId, track} = opts;
            const trackOptions: TrackOptions = isString(track) ? {message: track} : track;
            warnIf(
                trackOptions.correlationId || trackOptions.loadSpec,
                'Neither Correlation ID nor LoadSpec should be set in `FetchOptions.track`. Use `FetchOptions` top-level properties instead.'
            );
            ret = ret.track({
                ...trackOptions,
                correlationId: correlationId as string,
                loadSpec: ctx.loadSpec
            });
        }

        // 3) Apply interceptors - run after span has ended and exported.
        for (const interceptor of this._interceptors) {
            ret = ret.then(
                value => interceptor.onFulfilled(opts, value),
                cause => interceptor.onRejected(opts, cause)
            );
        }

        return ret;
    }

    private sendJsonInternalAsync(opts: FetchOptions, ctx?: CallContextLike) {
        return this.fetchInternalAsync(
            {
                asJson: true,
                ...opts,
                body: JSON.stringify(opts.body),
                headers: {
                    'Content-Type': 'application/json',
                    ...opts.headers
                }
            },
            ctx
        );
    }

    // Resolve convenience options for Correlation ID to server-ready string
    private withCorrelationId(opts: FetchOptions): FetchOptions {
        const cid = opts.correlationId,
            autoCid = FetchService.defaults.autoGenCorrelationIds;

        if (isString(cid)) return opts;
        if (cid === false || cid === null) return omit(opts, 'correlationId');
        if (cid === true || autoCid === true || (isFunction(autoCid) && autoCid(opts))) {
            return {...opts, correlationId: FetchService.defaults.genCorrelationId()};
        }
        return opts;
    }

    private withTraceId(opts: FetchOptions, span: Span): FetchOptions {
        return span ? {...opts, traceId: span.traceId} : opts;
    }

    private async withResolvedHeadersAsync(opts: FetchOptions, span: Span): Promise<FetchOptions> {
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
            ...(span
                ? {traceparent: formatTraceparent(span.traceId, span.spanId, span.sampled)}
                : {}),
            ...opts.headers
        };

        const {correlationIdHeaderKey} = FetchService.defaults;
        if (opts.correlationId) {
            if (headers[correlationIdHeaderKey]) {
                this.logWarn(
                    `Header ${correlationIdHeaderKey} value already set within FetchOptions.`
                );
            } else {
                headers[correlationIdHeaderKey] = opts.correlationId;
            }
        }

        return {...opts, method, headers};
    }

    private async managedFetchAsync(opts: FetchOptions, callCtx: CallContext): Promise<any> {
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
            return await this.abortableFetchAsync(opts, aborter, callCtx)
                .then(r => (opts.asJson ? this.parseJsonAsync(opts, r, callCtx) : r))
                .timeout(timeout);
        } catch (e) {
            if (e.isTimeout) {
                aborter.abort();
                const msg =
                    isObject(timeout) && 'message' in timeout
                        ? timeout.message
                        : // Exception.timeout() message already includes interval - add URL here.
                          e.message + ` loading '${opts.url}'`;
                throw this.timeoutException(opts, callCtx, e, msg);
            }

            if (!e.isHoistException) {
                // Just two other cases where we expect this to *throw* -- Typically we get a fail status
                throw e.name === 'AbortError'
                    ? this.abortedException(opts, callCtx, e)
                    : this.serverUnavailableException(opts, callCtx, e);
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
        aborter: AbortController,
        callCtx: CallContext
    ): Promise<Response> {
        // 1) Prepare URL
        let {url, method, headers, body, params} = opts;
        url = this.resolveUrl(url);

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
        callCtx.span?.setHttpStatus(ret.status);

        if (!ret.ok) {
            throw this.exceptionFromResponse(
                opts,
                callCtx,
                ret,
                await this.safeResponseTextAsync(ret)
            );
        }

        return ret;
    }

    private async parseJsonAsync(
        opts: FetchOptions,
        r: Response,
        callCtx: CallContext
    ): Promise<any> {
        if (this.NO_JSON_RESPONSES.includes(r.status)) return null;
        const ret = await r.json().catchWhen('SyntaxError', e => {
            throw this.jsonParseException(opts, callCtx, e);
        });

        const interner = this.getInterner(opts.internStrings);
        interner?.intern(ret);
        interner?.commit();
        return ret;
    }

    private async safeResponseTextAsync(response: Response) {
        try {
            return await response.text();
        } catch (ignore) {
            return null;
        }
    }

    private createSpanConfig(opts: FetchOptions): SpanConfig {
        if (!XH.traceService.enabled) return null;

        const method = opts.method ?? (opts.params ? 'POST' : 'GET'),
            fullUrl = this.buildFullUrl(opts.url),
            tags: PlainObject = {
                'xh.source': 'hoist',
                'http.request.method': method,
                'url.full': fullUrl
            };

        // Per OTel HTTP semconv, populate server.address (and server.port if non-default).
        try {
            const {hostname, port, protocol} = new URL(fullUrl, window.location.origin);
            if (hostname) tags['server.address'] = hostname;
            if (port) {
                tags['server.port'] = parseInt(port, 10);
            } else if (protocol === 'http:') {
                tags['server.port'] = 80;
            } else if (protocol === 'https:') {
                tags['server.port'] = 443;
            }
        } catch {}

        return {
            name: method,
            kind: 'client',
            tags
        };
    }

    /** Prefix relative URLs with {@link XH.baseUrl}; leave absolute/root-relative URLs as-is. */
    private resolveUrl(url: string): string {
        if (!url) return '';
        const isRelative = !url.startsWith('/') && !url.includes('//');
        return isRelative ? XH.baseUrl + url : url;
    }

    private buildFullUrl(url: string): string {
        const raw = this.resolveUrl(url);
        if (!raw) return '';

        try {
            const parsed = new URL(raw, window.location.origin);
            // Redact values of query params that commonly carry secrets.
            const sensitive =
                /^(token|access_token|id_token|password|pwd|secret|api[_-]?key|auth|session|sig|signature)$/i;
            for (const key of Array.from(parsed.searchParams.keys())) {
                if (sensitive.test(key)) parsed.searchParams.set(key, 'REDACTED');
            }
            return parsed.toString();
        } catch {
            return raw;
        }
    }

    private qsFilterFn = (_prefix: string, value: any) => {
        if (isDate(value)) return value.getTime();
        if (isLocalDate(value)) return value.isoString;
        return value;
    };

    //---------------------
    // Exception Handling
    //--------------------
    /**
     * Create an Error to throw when a fetch call returns a !ok response.
     * @param fetchOptions - original options passed to FetchService.
     * @param response - return value of native fetch.
     * @param responseText - optional additional details from the server.
     */
    private exceptionFromResponse(
        fetchOptions: FetchOptions,
        callContext: CallContext,
        response: Response,
        responseText: string = null
    ): FetchException {
        const {headers, status, statusText} = response,
            defaults = {
                name: 'HTTP Error ' + (status || ''),
                message: statusText,
                httpStatus: status,
                serverDetails: responseText,
                fetchOptions,
                callContext
            };

        if (status === 401) {
            return this.createException({
                ...defaults,
                name: 'Unauthorized',
                message: 'Your session may have timed out and you may need to log in again.'
            });
        }

        // Attempt to decode server-provided exception if returned as JSON.
        try {
            if (headers.get('Content-Type')?.match(this.JSON_CONTENT_TYPE_RE)) {
                const parsedResp = this.safeParseJson(responseText);
                return this.createException({
                    ...defaults,
                    name: parsedResp?.name ?? defaults.name,
                    message: this.extractMessage(parsedResp, responseText, statusText),
                    isRoutine: parsedResp?.isRoutine ?? false,
                    serverDetails: parsedResp ?? responseText
                });
            }
        } catch (ignored) {}

        // Fall back to raw defaults
        return this.createException(defaults);
    }

    /**
     * Get or create the {@link StringInterner} for the given spec's key, or null if interning
     * was not requested. Interners are retained per key with the latest spec adopted on each
     * call - see {@link clearInternCaches} to reset.
     */
    private getInterner(spec: StringInternSpec): StringInterner {
        if (!spec) return null;
        const {interners} = this;
        let ret = interners.get(spec.key);
        if (!ret) {
            ret = new StringInterner(spec);
            interners.set(spec.key, ret);
        } else {
            ret.spec = spec;
        }
        return ret;
    }

    /**
     * Create an Error to throw when a fetchJson call encounters a SyntaxError.
     * @param fetchOptions - original options passed to FetchService.
     * @param cause - object thrown by native {@link response.json}.
     */
    private jsonParseException(
        fetchOptions: FetchOptions,
        callContext: CallContext,
        cause: any
    ): FetchException {
        return this.createException({
            name: 'JSON Parsing Error',
            message:
                'Error parsing the response body as JSON. The server may have returned an invalid ' +
                'or empty response. Use "XH.fetch()" to process the response manually.',
            fetchOptions,
            callContext,
            cause
        });
    }

    /**
     * Create an Error to throw when a fetch call is aborted.
     * @param fetchOptions - original options passed to FetchService.
     * @param cause - object thrown by native fetch
     */
    private abortedException(
        fetchOptions: FetchOptions,
        callContext: CallContextLike,
        cause: any
    ): FetchException {
        return this.createException({
            name: 'Fetch Aborted',
            message: `Fetch request aborted, url: "${fetchOptions.url}"`,
            isRoutine: true,
            isFetchAborted: true,
            fetchOptions,
            callContext,
            cause
        });
    }

    /**
     * Create an Error to throw when a fetch call times out.
     * @param fetchOptions - original options the app passed when calling FetchService.
     * @param cause - underlying timeout exception
     * @param message - optional custom message
     *
     * @returns an exception that is both a TimeoutException, and a FetchException, with the
     *      underlying TimeoutException as its cause.
     */
    private timeoutException(
        fetchOptions: FetchOptions,
        callContext: CallContext,
        cause: TimeoutException,
        message: string
    ): FetchException & TimeoutException {
        return this.createException({
            name: 'Fetch Timeout',
            message,
            isFetchTimeout: true,
            isTimeout: true,
            interval: cause.interval,
            fetchOptions,
            callContext,
            cause
        }) as FetchException & TimeoutException;
    }

    /**
     * Create an Error to throw when a fetch call fails while reading or parsing its streamed
     * response body.
     * @param fetchOptions - original options passed to FetchService.
     * @param response - response whose body was being streamed.
     * @param cause - underlying error raised while reading or parsing the stream.
     */
    private streamFailedException(
        fetchOptions: FetchOptions,
        callContext: CallContextLike,
        response: Response,
        cause: any
    ): FetchException {
        return this.createException({
            name: 'Fetch Stream Failed',
            message: `Failure while reading streamed response, url: "${fetchOptions.url}" - ${cause.message}`,
            httpStatus: response.status,
            fetchOptions,
            callContext,
            cause
        });
    }

    /**
     * Create an Error for when the server called by fetch does not respond
     * @param fetchOptions - original options the app passed to FetchService.fetch
     * @param cause - object thrown by native fetch
     */
    private serverUnavailableException(
        fetchOptions: FetchOptions,
        callContext: CallContext,
        cause: any
    ): FetchException {
        const protocolPattern = /^[a-z]+:\/\//i,
            originPattern = /^[a-z]+:\/\/[^/]+/i,
            match = fetchOptions.url.match(originPattern),
            origin = match
                ? match[0]
                : protocolPattern.test(XH.baseUrl)
                  ? XH.baseUrl
                  : window.location.origin;

        return this.createException({
            name: 'Server Unavailable',
            message: `Unable to contact the server at ${origin}`,
            isServerUnavailable: true,
            fetchOptions,
            callContext,
            cause
        });
    }

    private createException(attributes: PlainObject) {
        const {fetchOptions} = attributes;
        // Prefer the header actually sent, falling back to the option if pre-resolution.
        const correlationId: string =
            fetchOptions?.headers?.[FetchService.defaults.correlationIdHeaderKey] ??
            (isString(fetchOptions?.correlationId) ? fetchOptions.correlationId : null);
        const traceId: string = fetchOptions?.traceId ?? null;

        return Exception.create({
            isFetchAborted: false,
            httpStatus: 0, // native fetch doesn't put status on its Error
            serverDetails: null,
            stack: null, // server-sourced exceptions do not include, neither should client, not relevant
            correlationId,
            traceId,
            ...attributes
        }) as FetchException;
    }

    private safeParseJson(txt: string): PlainObject {
        try {
            return JSON.parse(txt);
        } catch (ignored) {
            return null;
        }
    }

    private extractMessage(
        parsedResp: PlainObject,
        responseText: string,
        statusText: string
    ): string {
        let ret: string;
        if (parsedResp) {
            // From parsed response, including cause if provided (e.g. ExternalHttpException)
            ret = parsedResp.message;
            if (isString(parsedResp.cause)) {
                const cause = truncate(parsedResp.cause, {length: 255});
                ret = ret ? `${ret} (Caused by: ${cause})` : cause;
            }
        } else {
            // Use raw text if not JSON parseable
            ret = truncate(responseText?.trim(), {length: 255});
        }

        // Fallback to statusText if we have nothing else.
        return ret || statusText;
    }
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
     *
     * @deprecated Pass a {@link CallContextLike} as the second argument to the fetch method instead.
     */
    loadSpec?: LoadSpec | LoadSpecConfig;

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
     * If set, intern string values in array-based JSON and NDJSON responses to reduce retained
     * memory on large tabular datasets - each distinct string value is stored once and shared
     * across all rows, rather than duplicated per row as produced by JSON parsing.
     *
     * Applies to string values at the root level of each object within an array response (or
     * each NDJSON record). A single plain-object response is treated as a root record and
     * processed likewise. Nested values are not processed, with the exception of recursion
     * into child records via `childrenKey`. No-op for response payloads of any other shape.
     *
     * Interned values are also optionally shared across successive responses with the same `key` -
     * e.g. a polling refresh of the same grid - with cache retention per each key's
     * {@link StringInternSpec.retainMode}, by default bounded to the values present in the most
     * recent complete response.
     */
    internStrings?: StringInternSpec;

    /**
     * True to decode the HTTP response as JSON. Default false.
     */
    asJson?: boolean;

    /**
     * If set, the request will be tracked via Hoist activity tracking. (Do not set `correlationId`
     * here - use the top-level `correlationId` property instead.)
     */
    track?: string | TrackOptions;

    /**
     * Parent span for this fetch request. Use to nest fetch calls under a business-level span.
     *
     * @deprecated Pass a {@link CallContextLike} as the second argument to the fetch method instead.
     */
    span?: Span;

    /**
     * Distributed trace ID for this request. Set automatically by FetchService
     * @internal
     */
    traceId?: string;
}

/** Options for {@link FetchService.fetchNdjson}. */
export interface NdjsonFetchOptions extends FetchOptions {
    /**
     * True to treat the first record in the stream as metadata, delivered via
     * {@link NdjsonResult.meta} rather than yielded with the data records. Default false.
     */
    firstLineIsMeta?: boolean;
}

/** Streamed result returned by {@link FetchService.fetchNdjson}. */
export interface NdjsonResult {
    /** Parsed data records, yielded in chunks (arrays) as they arrive off the network. */
    lines: AsyncGenerator<PlainObject[]>;

    /**
     * Leading metadata record - null unless requested via
     * {@link NdjsonFetchOptions.firstLineIsMeta}. Resolves as soon as the record arrives,
     * without requiring `lines` to be consumed - null if the stream was empty.
     */
    meta: Promise<PlainObject> | null;
}

/**
 * Spec for string-value interning of a fetch response.
 * @see FetchOptions.internStrings
 */
export interface StringInternSpec {
    /**
     * Identifies the logical dataset. Successive responses fetched with the same key share
     * interned values across fetches, with cache retention bounded to the latest response.
     * Cleared via {@link FetchService.clearInternCaches}.
     */
    key: string;

    /**
     * Property of each record containing nested child records to recurse into, for tree data -
     * typically 'children'. Match to the consuming Store's `loadTreeDataFrom` config. Default
     * null - no recursion.
     */
    childrenKey?: string;

    /**
     * How long interned values are held for reuse by later responses with the same key.
     * Default 'nextCall'.
     *
     * - 'nextCall' (default) - hold the values in each committed response for reuse by the next.
     *   Values not re-seen are evicted, bounding the cache to the latest response - the right
     *   mode for polling/refresh of a comparable dataset.
     * - 'always' - hold every value ever committed, until {@link FetchService.clearInternCaches}.
     *   Useful when successive responses cover different slices of a dataset (e.g. paging, or
     *   alternating filters), where 'nextCall' would evict values about to recur.
     * - 'never' - intern within each response only. Appropriate for large one-shot datasets that
     *   will not be refetched, where a retained cache would pin the last response's distinct
     *   values for no future benefit.
     *
     * May be varied across calls sharing a key without resetting the cache - the mode governs
     * only how each completing response's values are installed for reuse.
     */
    retainMode?: 'never' | 'nextCall' | 'always';
}

/**
 * Exception thrown to indicate an HTTP error resulting from a call to FetchService.
 */
export interface FetchException extends HoistException {
    /** Http Status code associated with exception. 0 if no response received. */
    httpStatus: number;

    /** Rich object or string containing details about the exception as sent by server. */
    serverDetails: string | PlainObject;

    /** Options of underlying fetch call. */
    fetchOptions: FetchOptions;

    /** CallContext (parent span / load context) in effect when the fetch was issued. */
    callContext: CallContext;

    /** Distributed trace ID associated with the failed request, if tracing was enabled. */
    traceId: string;

    /**
     * True if exception resulted from the fetch being aborted by fetchService, or the application.
     * @see FetchService.abort
     * @see FetchOptions.autoAbortKey
     */
    isFetchAborted: boolean;
}
