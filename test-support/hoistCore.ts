/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type PlainObject, XH} from '@xh/hoist/core';
import {cloneDeep, isArray, isPlainObject, pick, pickBy} from 'lodash';
import {http, HttpResponse, type HttpHandler, matchRequestUrl} from 'msw';
import {setupServer} from 'msw/node';

/*
 * A small, in-memory stand-in for hoist-core, served to Hoist's real client code via MSW.
 *
 * Tests run Hoist's actual services (FetchService, ConfigService, PrefService, etc.) and let them
 * make real `fetch` calls. MSW intercepts those calls and answers from the handlers below, each of
 * which mirrors one hoist-core endpoint and renders payloads in the exact shapes hoist-core does.
 * The hoist-core source for each shape is named in a comment so the fake can be checked when the
 * server contract changes.
 *
 * The fake models shapes, status codes, and the `clientUsername` session check. It deliberately
 * does not re-implement server business rules. Tests serve other endpoints, such as an app's own,
 * with `hoistCore.route()`. `server.use()` adds raw MSW handlers for one test.
 *
 * hoist-core accepts any HTTP method on these endpoints. Each handler here accepts only the method
 * the client uses, so a test fails if the client changes how it calls the server.
 */

/** URL prefix for Hoist server calls - `XH.baseUrl`, from the `xhBaseUrl` build constant. */
export const BASE_URL = XH.baseUrl;

/** A request served by the fake, recorded so tests can assert what the client sent. */
export interface RecordedRequest {
    method: string;
    /**
     * Path relative to `XH.baseUrl`, e.g. `'xh/getPrefs'`. A request outside `XH.baseUrl`, such as
     * one to an external API, records its full URL without the query string.
     */
    path: string;
    query: PlainObject;
    /** Parsed `application/x-www-form-urlencoded` body, if any. */
    form: PlainObject;
    /** Parsed JSON body, if any. */
    json: any;
    headers: Record<string, string>;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** A request served by a `hoistCore.route()`, with its `:name` path parameters. */
export interface RouteRequest extends RecordedRequest {
    params: Record<string, string>;
}

/**
 * Serves a route. Return a `Response`, a value to send as JSON, or nothing for the empty 204 that
 * hoist-core sends for an endpoint with no result.
 */
export type RouteFn = (req: RouteRequest) => unknown;

/** A user preference as rendered to the client by hoist-core `PrefService`. */
export interface PrefEntry {
    type: 'string' | 'int' | 'long' | 'double' | 'bool' | 'json';
    value: any;
    defaultValue: any;
    /** True if the user has their own value, false if `value` is the default. */
    isSet: boolean;
}

export interface HoistError {
    name?: string;
    message?: string;
    cause?: string;
    isRoutine?: boolean;
    traceId?: string;
}

/**
 * Render an exception exactly as hoist-core does (`ThrowableSerializer` via `ExceptionHandler`):
 * a JSON body of `{name, message, cause, isRoutine, traceId}` with falsy keys omitted - so
 * `isRoutine: false` is never sent.
 */
export function hoistError(status: number, error: HoistError = {}): Response {
    const body = pickBy({name: 'RuntimeException', ...error}, v => !!v);
    return HttpResponse.json(body, {status});
}

/**
 * An auth-filter rejection as hoist-core `BaseAuthenticationService.allowRequest` sends it - a
 * bare status with an empty body and no content type.
 *
 * @param statusText - reason phrase for the status line. Tomcat sends none, so the default is
 *      empty. Pass one to model a proxy that adds it, as nginx does.
 */
export function authFailure(status: 401 | 403 | 500, statusText: string = ''): Response {
    return new HttpResponse(null, {status, statusText});
}

/**
 * An empty success response, as hoist-core `BaseController.renderSuccess` sends it - a 204 that
 * still carries a JSON content type.
 */
export function noContent(): Response {
    return new HttpResponse(null, {
        status: 204,
        headers: {'Content-Type': 'application/json; charset=UTF-8'}
    });
}

/** Full URL path for a Hoist server endpoint, for use in per-test `server.use()` handlers. */
export function xhUrl(path: string): string {
    return BASE_URL + path;
}

/**
 * The fake hoist-core server for unit tests. Use the `hoistCore` instance.
 * @mcpHint fake hoist-core server for unit tests
 */
export class FakeHoistCore {
    /** Authenticated user, as rendered by hoist-core `HoistUser.formatForJSON`. */
    user: PlainObject;
    roles: string[];

    /** When set, the server reports the session as impersonating `user` on behalf of this user. */
    authUser: PlainObject;
    authUserRoles: string[];

    /** False to answer `xh/authStatus` with a 401, as for a user with no session. */
    authenticated: boolean;

    /** Client-visible soft configs, keyed by name. */
    configs: PlainObject;

    /** User preferences, keyed by name. */
    prefs: Record<string, PrefEntry>;

    /** Payload for `xh/environment`. */
    environment: PlainObject;

    /** Every request the fake has served in this test - the kit's setup clears it before each. */
    requests: RecordedRequest[] = [];

    /** @internal - called with a message when a route throws. The kit's setup fails the test. */
    onProblem: (msg: string) => void = null;

    private routes: Route[] = [];
    private testRouteCount = 0;
    // Requests the client has sent and not yet received a response for - see trackFetch().
    private inFlight = new Map<number, string>();

    constructor() {
        this.reset();
    }

    /** Restore the default server state and clear the request log. */
    reset() {
        this.user = {
            username: 'jdoe',
            email: 'jdoe@example.com',
            displayName: 'Jane Doe',
            active: true
        };
        this.roles = ['APP_USER'];
        this.authUser = null;
        this.authUserRoles = null;
        this.authenticated = true;
        this.configs = defaultConfigs();
        this.prefs = defaultPrefs();
        this.environment = defaultEnvironment();
        this.clearRequests();
    }

    clearRequests() {
        this.requests = [];
    }

    /** Requests served for one endpoint, e.g. `requestsTo('xh/setPrefs')`. */
    requestsTo(path: string): RecordedRequest[] {
        return this.requests.filter(it => it.path === path);
    }

    /**
     * Serve an endpoint of the app's own server, or override a built-in one.
     *
     * A route added in a setup file or in `beforeAll()` lasts for the rest of the file, across
     * the reset after each test. A route added in `beforeEach()` or in a test lasts for that test.
     * The latest route that matches a request serves it, so a test can override a file's route.
     * Requests are recorded, for `requestsTo()`.
     *
     * @param method - HTTP method, or `'*'` for any.
     * @param path - path relative to `XH.baseUrl`, as passed to `XH.fetchJson()`, or an absolute
     *      URL for an external API. `:name` segments match any value, read from `req.params`.
     * @param fn - serves the request.
     */
    route(method: HttpMethod | '*', path: string, fn: RouteFn) {
        const url = /^[a-z][a-z\d+.-]*:\/\//i.test(path) ? path : xhUrl(path);
        this.routes.push({method, url, fn});
    }

    /** @internal - marks the routes added so far as lasting past the test about to run. */
    startTest() {
        this.testRouteCount = this.routes.length;
    }

    /** @internal - removes the routes added during the test that just ran. */
    endTest() {
        this.routes.length = this.testRouteCount;
        // The kit's teardown has already reported any request still open - not again next test.
        this.inFlight.clear();
    }

    /**
     * Wait until the fake has answered every request it received, and the client has handled
     * those answers - including any requests that the handling starts in turn.
     *
     * Use it after an action that starts a request without returning its promise, such as a model
     * method that saves in the background, before asserting on `requests` or on the result. The
     * kit's setup also calls it when each test ends, so such a request cannot land in the next
     * test's log.
     *
     * Waits on real time, even while the test fakes timers.
     *
     * @param timeout - ms to wait before rejecting with the requests still open.
     */
    async settleAsync(timeout: number = 2000): Promise<void> {
        const {inFlight} = this,
            deadline = realNow() + timeout;
        // Yield a macrotask, so the client can start a request it has queued.
        await realWait(0);
        while (inFlight.size) {
            if (realNow() > deadline) {
                const open = [...inFlight.values()].join(', ');
                throw new Error(`Requests still open after ${timeout}ms: ${open}.`);
            }
            await realWait(5);
            // Once all are answered, let the client handle them - which may start more.
            if (!inFlight.size) await realWait(0);
        }
    }

    /**
     * @internal - wraps `fetch` to count each request as open from the client's call until the
     * call settles, aborts included. Called by setup.ts after MSW patches `fetch` - counting from
     * the call, not from MSW's interception, keeps a request from slipping past `settleAsync()`.
     */
    trackFetch() {
        const {inFlight} = this,
            fetch = globalThis.fetch;
        let nextId = 0;
        globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
            const id = nextId++;
            inFlight.set(id, fetchLabel(input, init));
            return fetch(input, init).finally(() => inFlight.delete(id));
        }) as typeof fetch;
    }

    /** Username the client must report as `clientUsername` - the apparent user. */
    get username(): string {
        return this.user.username;
    }

    get handlers(): HttpHandler[] {
        return [
            // Routes added with route(). The predicate claims only requests that a route matches,
            // so any other request stays unhandled and fails the test - a handler that returned
            // nothing would instead let MSW pass the request through to the real network.
            http.all(
                ({request}) => !!this.findRoute(request),
                ({request}) => this.serveRoute(request)
            ),

            // XhController.authConfig - BaseAuthenticationService.clientConfig default.
            this.get('xh/authConfig', () => HttpResponse.json({})),

            // XhController.authStatus
            this.get('xh/authStatus', () =>
                this.authenticated
                    ? HttpResponse.json({authenticated: true, identity: this.identity})
                    : authFailure(401)
            ),

            // XhController.logout - `success` is false unless the app supports interactive login,
            // so this models the default of an SSO app (BaseAuthenticationService.logout).
            this.get('xh/logout', () => HttpResponse.json({success: false})),

            // XhController.environment - EnvironmentService.getEnvironment.
            this.get('xh/environment', () => HttpResponse.json(this.environment)),

            // XhController.environmentPoll
            this.get('xh/environmentPoll', () =>
                HttpResponse.json(
                    pick(this.environment, [
                        'appCode',
                        'appVersion',
                        'appBuild',
                        'instanceName',
                        'alertBanner',
                        'pollConfig'
                    ])
                )
            ),

            // XhController.getConfig - ConfigService.getClientConfig.
            this.get('xh/getConfig', () => HttpResponse.json(this.configs)),

            // XhController.getPrefs - PrefService.getClientConfig.
            this.post('xh/getPrefs', req => this.checkUser(req) ?? HttpResponse.json(this.prefs)),

            // XhController.setPrefs - JSON map of key -> new value. Keys are saved in order, so an
            // invalid key fails the request after saving the keys before it, as on the server.
            this.post('xh/setPrefs', req => {
                const err = this.checkUser(req);
                if (err) return err;
                for (const [key, value] of Object.entries(req.json)) {
                    const pref = this.prefs[key];
                    // PrefService.getDefaultPreference throws for an unknown key.
                    if (!pref) return hoistError(500, {message: `Preference not found: ${key}`});
                    if ((isPlainObject(value) || isArray(value)) && pref.type !== 'json') {
                        return hoistError(500, {message: `Unexpected type for preference: ${key}`});
                    }
                    pref.value = savedPrefValue(pref, value);
                    pref.isSet = true;
                }
                return HttpResponse.json({preferences: this.prefEntries(Object.keys(req.json))});
            }),

            // XhController.unsetPrefs - JSON array of keys to revert to their defaults. Unknown
            // keys are ignored, and left out of the response.
            this.post('xh/unsetPrefs', req => {
                const err = this.checkUser(req);
                if (err) return err;
                const keys: string[] = req.json;
                keys.forEach(key => {
                    const pref = this.prefs[key];
                    if (!pref) return;
                    pref.value = cloneDeep(pref.defaultValue);
                    pref.isSet = false;
                });
                return HttpResponse.json({preferences: this.prefEntries(keys)});
            }),

            // XhController.clearUserState - resets all of the user's prefs. The server also clears
            // the user's ViewManager state, which this fake does not model.
            this.post('xh/clearUserState', req => {
                const err = this.checkUser(req);
                if (err) return err;
                Object.values(this.prefs).forEach(pref => {
                    pref.value = cloneDeep(pref.defaultValue);
                    pref.isSet = false;
                });
                return noContent();
            }),

            // XhController.track, recordMetrics, submitSpans - accepted, nothing returned.
            ...['xh/track', 'xh/recordMetrics', 'xh/submitSpans'].map(path =>
                this.post(path, req => this.checkUser(req) ?? noContent())
            )
        ];
    }

    //------------------------
    // Implementation
    //------------------------
    private get identity(): PlainObject {
        // IdentityService.getClientConfig - two shapes, depending on impersonation.
        return this.authUser
            ? {
                  apparentUser: this.user,
                  apparentUserRoles: this.roles,
                  authUser: this.authUser,
                  authUserRoles: this.authUserRoles
              }
            : {user: this.user, roles: this.roles};
    }

    // PrefService.getLimitedClientConfig - entries for the given keys that exist.
    private prefEntries(keys: string[]): Record<string, PrefEntry> {
        return pick(this.prefs, keys);
    }

    // XhController.ensureClientUsernameMatchesSession - required for user-state endpoints. Reads
    // Grails `params`, which merge the query string and a form-encoded body.
    private checkUser(req: RecordedRequest): Response {
        const clientUsername = req.query.clientUsername ?? req.form.clientUsername;
        if (clientUsername === this.username) return null;
        return hoistError(400, {
            name: 'SessionMismatchException',
            message: clientUsername
                ? 'The reported clientUsername does not match current session user.'
                : 'Unable to confirm match between client and session user.',
            isRoutine: true
        });
    }

    private findRoute(request: Request): {route: Route; params: Record<string, string>} {
        const url = new URL(request.url);
        for (let i = this.routes.length - 1; i >= 0; i--) {
            const route = this.routes[i];
            if (route.method !== '*' && route.method !== request.method) continue;
            const {matches, params} = matchRequestUrl(url, route.url, window.location.href);
            if (matches) return {route, params: params as Record<string, string>};
        }
        return null;
    }

    private async serveRoute(request: Request): Promise<Response> {
        const {route, params} = this.findRoute(request),
            req = await recordRequest(routePath(new URL(request.url)), request);
        this.requests.push(req);
        try {
            const ret = await route.fn({...req, params});
            if (ret instanceof Response) return ret;
            return ret === undefined ? noContent() : HttpResponse.json(ret);
        } catch (e) {
            this.onProblem?.(`Route for ${req.method} ${req.path} threw: ${e}`);
            return hoistError(500, {message: String(e?.message ?? e)});
        }
    }

    private get(path: string, fn: (req: RecordedRequest) => Response) {
        return http.get(xhUrl(path), ({request}) => this.serve(path, request, fn));
    }

    private post(path: string, fn: (req: RecordedRequest) => Response) {
        return http.post(xhUrl(path), ({request}) => this.serve(path, request, fn));
    }

    private async serve(path: string, request: Request, fn: (req: RecordedRequest) => Response) {
        const req = await recordRequest(path, request);
        this.requests.push(req);
        return fn(req);
    }
}

/** The fake hoist-core instance shared by all tests in a file. */
export const hoistCore = new FakeHoistCore();

/** The MSW server that routes Hoist's `fetch` calls to `hoistCore`. Started in setup.ts. */
export const server = setupServer(...hoistCore.handlers);

// The clock functions as loaded - Vitest's fake timers replace the globals, not these references.
const realSetTimeout = globalThis.setTimeout,
    realNow = Date.now;

function realWait(ms: number): Promise<void> {
    return new Promise(resolve => realSetTimeout(resolve, ms));
}

//------------------------
// Default server state
//------------------------
// Client-visible configs that hoist-core creates by default (see its BootStrap /
// ensureRequiredConfigsCreated), with their default values. Configs with a typed class on the
// server are always sent with every declared key, so tests should change keys within them rather
// than replace them. `xhAppTimeZone` defaults to 'UTC' on the server. It is set here as a typical
// app sets it, to the head office zone - which matches the browser zone the Vitest config pins.
function defaultConfigs(): PlainObject {
    return {
        xhActivityTrackingConfig: {
            enabled: true,
            logData: false,
            maxDataLength: 2000,
            maxElapsedMins: 2,
            maxElapsedMinsByCategory: {},
            maxEntriesPerMin: 1000,
            levels: [{username: '*', category: '*', severity: 'INFO'}],
            clientHealthReport: {intervalMins: -1},
            maxRows: {limit: 25000, options: [1000, 5000, 10000, 25000], default: 10000}
        },
        xhAlertBannerConfig: {enabled: true},
        xhAppInstances: [],
        xhAppTimeZone: 'America/New_York',
        xhAutoRefreshIntervals: {app: -1},
        xhChangelogConfig: {
            enabled: true,
            excludedVersions: [],
            excludedCategories: [],
            limitToRoles: []
        },
        xhEmailSupport: 'none',
        xhEnableImpersonation: false,
        xhEnableLogViewer: true,
        xhEnableMonitoring: true,
        xhExportConfig: {streamingCellThreshold: 100000, toastCellThreshold: 3000},
        xhFlags: {},
        xhIdleConfig: {timeout: 120, appTimeouts: {}},
        xhMemoryMonitoringConfig: {
            enabled: true,
            snapshotInterval: 60,
            maxSnapshots: 1440,
            heapDumpDir: null,
            preservePastInstances: true,
            maxPastInstances: 10,
            writeToLog: true
        },
        xhTraceConfig: {
            enabled: false,
            sampleRate: 1.0,
            sampleRules: [],
            otlpEnabled: false,
            otlpConfig: {},
            jdbcTracingEnabled: false
        }
    };
}

// Prefs that hoist-core creates by default, in PrefService.getClientConfig's format.
function defaultPrefs(): Record<string, PrefEntry> {
    const pref = (type: PrefEntry['type'], defaultValue: any): PrefEntry => ({
        type,
        value: cloneDeep(defaultValue),
        defaultValue,
        isSet: false
    });
    return {
        xhAutoRefreshEnabled: pref('bool', true),
        xhIdleDetectionDisabled: pref('bool', false),
        xhLastReadChangelog: pref('string', '0.0.0'),
        xhShowVersionBar: pref('string', 'auto'),
        xhSizingMode: pref('json', {}),
        xhTheme: pref('string', 'system')
    };
}

// EnvironmentService.getEnvironment. The app's identity comes from its build constants, via `XH`,
// so the server reports the version the client was built with - a mismatch would fail app init,
// as it does in a real app. Polling, websockets, and the alert banner are off, so a test sees no
// background requests it did not ask for.
function defaultEnvironment(): PlainObject {
    return {
        appCode: XH.appCode,
        appName: XH.appName,
        appVersion: XH.appVersion,
        appBuild: XH.appBuild,
        appEnvironment: 'Development',
        grailsVersion: '7.2.2',
        hoistCoreVersion: '42.1.0',
        javaVersion: '25.0.1',
        serverTimeZone: 'UTC',
        serverTimeZoneOffset: 0,
        appTimeZone: 'America/New_York',
        appTimeZoneOffset: -14400000,
        webSocketsEnabled: false,
        instanceName: 'inst-1',
        alertBanner: {active: false},
        pollConfig: {interval: -1, onVersionChange: 'promptReload'}
    };
}

//------------------------
// Prefs
//------------------------
// PrefService saves a map or list as JSON, and any other value as its string - which
// UserPreference.externalUserValue then reads back as the pref's type.
function savedPrefValue(pref: PrefEntry, value: any): any {
    if (isPlainObject(value) || isArray(value)) return value;
    const str = String(value);
    switch (pref.type) {
        case 'int':
        case 'long':
        case 'double':
            return Number(str);
        case 'bool':
            return ['true', 'y', '1'].includes(str.trim().toLowerCase());
        case 'string':
            return str;
        default:
            return value;
    }
}

//------------------------
// Routes
//------------------------
interface Route {
    method: HttpMethod | '*';
    url: string;
    fn: RouteFn;
}

// A request's method and path, as settleAsync() names it. Never throws, so fetch() reports a bad
// input in its usual way.
function fetchLabel(input: RequestInfo | URL, init?: RequestInit): string {
    const req = input instanceof Request ? input : null,
        method = (init?.method ?? req?.method ?? 'GET').toUpperCase(),
        href = req?.url ?? String(input);
    try {
        return `${method} ${routePath(new URL(href, window.location.href))}`;
    } catch {
        return `${method} ${href}`;
    }
}

// The recorded path - relative to the base URL, or the full URL for a request outside it.
function routePath(url: URL): string {
    const base = new URL(BASE_URL, window.location.href).href,
        href = url.origin + url.pathname;
    return href.startsWith(base) ? href.slice(base.length) : href;
}

//------------------------
// Request recording
//------------------------
async function recordRequest(path: string, request: Request): Promise<RecordedRequest> {
    const url = new URL(request.url),
        contentType = request.headers.get('Content-Type') ?? '',
        body = await request.text();

    let form = {},
        json = null;
    if (body) {
        if (contentType.includes('application/x-www-form-urlencoded')) {
            form = paramsToObject(new URLSearchParams(body));
        } else if (contentType.includes('application/json')) {
            json = JSON.parse(body);
        }
    }

    const headers = {};
    request.headers.forEach((value, key) => (headers[key] = value));

    return {
        method: request.method,
        path,
        query: paramsToObject(url.searchParams),
        form,
        json,
        headers
    };
}

// Repeated keys (e.g. `ids=1&ids=2`) become arrays, as Grails' `params.list()` reads them.
function paramsToObject(params: URLSearchParams): PlainObject {
    const ret = {};
    params.forEach((value, key) => {
        const prev = ret[key];
        ret[key] = prev === undefined ? value : [prev, value].flat();
    });
    return ret;
}
