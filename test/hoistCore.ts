/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PlainObject} from '@xh/hoist/core';
import {cloneDeep, mapValues, pick, pickBy} from 'lodash';
import {http, HttpResponse, type HttpHandler} from 'msw';
import {setupServer} from 'msw/node';

/**
 * A small, in-memory stand-in for hoist-core, served to Hoist's real client code via MSW.
 *
 * Tests run Hoist's actual services (FetchService, ConfigService, PrefService, etc.) and let them
 * make real `fetch` calls. MSW intercepts those calls and answers from the handlers below, each of
 * which mirrors one hoist-core endpoint and renders payloads in the exact shapes hoist-core does.
 * The hoist-core source for each shape is named in a comment so the fake can be checked when the
 * server contract changes.
 *
 * The fake models shapes, status codes, and the `clientUsername` session check. It deliberately
 * does not re-implement server business rules. Tests that need other endpoints or failure modes
 * add per-test handlers with `server.use()`, which are cleared after each test.
 */

/** URL prefix for Hoist server calls - the `xhBaseUrl` defined in vitest.config.mts. */
export const BASE_URL = '/api/';

/** A request served by the fake, recorded so tests can assert what the client sent. */
export interface RecordedRequest {
    method: string;
    /** Path relative to `XH.baseUrl`, e.g. `'xh/getPrefs'`. */
    path: string;
    query: PlainObject;
    /** Parsed `application/x-www-form-urlencoded` body, if any. */
    form: PlainObject;
    /** Parsed JSON body, if any. */
    json: any;
    headers: Record<string, string>;
}

/** A user preference as rendered to the client by hoist-core `PrefService`. */
export interface PrefEntry {
    type: 'string' | 'int' | 'long' | 'double' | 'bool' | 'json';
    value: any;
    defaultValue: any;
    isSet?: boolean;
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
 */
export function authFailure(status: 401 | 403 | 500): Response {
    const statusText = {401: 'Unauthorized', 403: 'Forbidden', 500: 'Internal Server Error'};
    return new HttpResponse(null, {status, statusText: statusText[status]});
}

/** Full URL path for a Hoist server endpoint, for use in per-test `server.use()` handlers. */
export function xhUrl(path: string): string {
    return BASE_URL + path;
}

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

    /** Every request the fake has served since the last `clearRequests()`. */
    requests: RecordedRequest[] = [];

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

    /** Username the client must report as `clientUsername` - the apparent user. */
    get username(): string {
        return this.user.username;
    }

    get handlers(): HttpHandler[] {
        return [
            // XhController.authConfig - BaseAuthenticationService.clientConfig default.
            this.get('xh/authConfig', () => HttpResponse.json({})),

            // XhController.authStatus
            this.get('xh/authStatus', () =>
                this.authenticated
                    ? HttpResponse.json({authenticated: true, identity: this.identity})
                    : authFailure(401)
            ),

            // XhController.logout
            this.get('xh/logout', () => HttpResponse.json({success: true})),

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

            // XhController.setPrefs - JSON map of key -> new value.
            this.post('xh/setPrefs', req => {
                const err = this.checkUser(req);
                if (err) return err;
                const updated = mapValues(req.json, (value, key) => {
                    const pref = this.prefs[key];
                    pref.value = value;
                    pref.isSet = true;
                    return pref;
                });
                return HttpResponse.json({preferences: updated});
            }),

            // XhController.unsetPrefs - JSON array of keys to revert to their defaults.
            this.post('xh/unsetPrefs', req => {
                const err = this.checkUser(req);
                if (err) return err;
                const updated = {};
                req.json.forEach((key: string) => {
                    const pref = this.prefs[key];
                    pref.value = pref.defaultValue;
                    pref.isSet = false;
                    updated[key] = pref;
                });
                return HttpResponse.json({preferences: updated});
            }),

            // XhController.clearUserState - resets all of the user's prefs.
            this.post('xh/clearUserState', req => {
                const err = this.checkUser(req);
                if (err) return err;
                Object.values(this.prefs).forEach(pref => {
                    pref.value = pref.defaultValue;
                    pref.isSet = false;
                });
                return new HttpResponse(null, {status: 204});
            }),

            // XhController.track, recordMetrics, submitSpans - accepted, nothing returned.
            ...['xh/track', 'xh/recordMetrics', 'xh/submitSpans'].map(path =>
                this.post(path, req => this.checkUser(req) ?? new HttpResponse(null, {status: 204}))
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

    // BaseController.ensureClientUsernameMatchesSession - required for user-state endpoints.
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

/** The MSW server that routes Hoist's `fetch` calls to `hoistCore`. Started in test/setup.ts. */
export const server = setupServer(...hoistCore.handlers);

//------------------------
// Default server state
//------------------------
// Client-visible configs that hoist-core creates by default (see its BootStrap /
// ensureRequiredConfigsCreated), with their default values.
function defaultConfigs(): PlainObject {
    return {
        xhActivityTrackingConfig: {
            enabled: true,
            logData: false,
            maxDataLength: 2000,
            maxElapsedMins: 5,
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

// EnvironmentService.getEnvironment. `appVersion` and `appBuild` match the build constants in
// vitest.config.mts - a mismatch fails app init, as it would in a real app. Polling, websockets,
// and the alert banner are off, so a test sees no background requests it did not ask for.
function defaultEnvironment(): PlainObject {
    return {
        appCode: 'testApp',
        appName: 'Test App',
        appVersion: '1.0.0',
        appBuild: 'test',
        appEnvironment: 'Development',
        grailsVersion: '7.2.2',
        hoistCoreVersion: '42.1.0',
        javaVersion: '25.0.1',
        serverTimeZone: 'America/New_York',
        serverTimeZoneOffset: -14400000,
        appTimeZone: 'America/New_York',
        appTimeZoneOffset: -14400000,
        webSocketsEnabled: false,
        instanceName: 'inst-1',
        alertBanner: {active: false},
        pollConfig: {interval: -1, onVersionChange: 'promptReload'}
    };
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
