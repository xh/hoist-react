/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    AccountInfo,
    BrowserAuthError,
    createStandardPublicClientApplication,
    InteractionRequiredAuthError,
    IPublicClientApplication,
    LogLevel
} from '@azure/msal-browser';
import {MsalClient, MsalClientConfig} from '@xh/hoist/security/msal';
import {initTestAppAsync} from '@xh/hoist/test';
import {MINUTES, SECONDS} from '@xh/hoist/utils/datetime';
import {afterEach, beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

// Replace only the factory for MSAL's client - MsalClient's decisions depend on MSAL's real error
// classes, which are kept.
vi.mock('@azure/msal-browser', async importOriginal => ({
    ...(await importOriginal<typeof import('@azure/msal-browser')>()),
    createStandardPublicClientApplication: vi.fn()
}));

/**
 * How MsalClient signs a user in to Entra ID on app load: the order in which it tries a returning
 * redirect, a cached account, `ssoSilent` and an interactive login, and what it asks MSAL for.
 * These paths only run against a real tenant, so a regression otherwise surfaces as users who are
 * prompted to log in on every visit, or cannot log in at all.
 */
describe('MsalClient', () => {
    beforeAll(async () => {
        // An app runs its OAuth client during boot, with its AppSpec already in place.
        await initTestAppAsync();
    });

    afterEach(() => {
        localStorage.clear();
        window.history.replaceState(null, '', '/');
    });

    describe('defaults', () => {
        // BUG: security/msal/MsalClient.ts:129 - the constructor applying the documented defaults
        // (enableSsoSilent, enableTelemetry, msalLogLevel) was deleted in the TC39 decorator
        // migration (e213e2ce9), so ssoSilent is never tried unless an app enables it explicitly.
        it.fails('tries ssoSilent when no account is cached', async () => {
            const msal = fakeMsal(),
                // Popup login, so the test does not wait on a redirect if ssoSilent is skipped.
                client = createClient({loginMethodDesktop: 'POPUP'});
            msal.ssoSilent.mockResolvedValue({account: JDOE});

            await client.initAsync();

            expect(msal.ssoSilent).toHaveBeenCalledOnce();
            expect(client.lastAuthMethod).toBe('ssoSilent');
        });

        // BUG: security/msal/MsalClient.ts:129 - as above, for enableTelemetry and msalLogLevel.
        it.fails('enables telemetry and warning-level MSAL logging', async () => {
            fakeMsal({accounts: [JDOE]});
            const client = createClient();

            await client.initAsync();

            const config = vi.mocked(createStandardPublicClientApplication).mock.lastCall[0];
            expect(config.system.loggerOptions.logLevel).toBe(LogLevel.Warning);
            expect(config.telemetry?.client).toBeDefined();
            expect(client.telemetry).not.toBeNull();
        });
    });

    describe('initAsync', () => {
        it('returns to the page that started a login redirect', async () => {
            // First load - no cached account or SSO session, so the client redirects to the
            // provider, then waits for the browser to leave the page...
            vi.useFakeTimers();
            const msal = fakeMsal();
            window.history.replaceState(null, '', '/app/trades?id=42');
            void createClient().initAsync();
            await vi.waitFor(() => expect(msal.acquireTokenRedirect).toHaveBeenCalled());

            const [request] = msal.acquireTokenRedirect.mock.lastCall;
            expect(request.redirectUri).toBe(`${window.location.origin}/app/`);

            // ...which sends the browser back to the redirect URI to load the app again.
            window.history.replaceState(null, '', '/app/');
            msal.handleRedirectPromise.mockResolvedValue({account: JDOE, state: request.state});
            const client = createClient();
            await client.initAsync();

            expect(window.location.pathname + window.location.search).toBe('/app/trades?id=42');
            expect(client.lastAuthMethod).toBe('loginRedirect');
            expect(client.getSelectedUsername()).toBe(JDOE.username);
        });

        it('loads tokens silently for the cached account of the last selected user', async () => {
            const msal = fakeMsal({accounts: [ASMITH, JDOE]}),
                client = createClient();
            client.setSelectedUsername(JDOE.username);

            await client.initAsync();

            expect(client.lastAuthMethod).toBe('acquireSilent');
            expect(msal.acquireTokenSilent.mock.lastCall[0].account).toBe(JDOE);
            expect(msal.ssoSilent).not.toHaveBeenCalled();
            expect(msal.acquireTokenRedirect).not.toHaveBeenCalled();
        });

        it('skips ssoSilent when the cached account needs interaction', async () => {
            // ssoSilent cannot satisfy an interaction requirement, and would only add a slow
            // hidden-iframe round trip before the login the user needs.
            const msal = fakeMsal({accounts: [JDOE]}),
                client = createClient({enableSsoSilent: true, loginMethodDesktop: 'POPUP'});
            msal.acquireTokenSilent.mockRejectedValueOnce(
                new InteractionRequiredAuthError('interaction_required', 'cid')
            );

            await client.initAsync();

            expect(msal.ssoSilent).not.toHaveBeenCalled();
            expect(msal.acquireTokenPopup).toHaveBeenCalledOnce();
            expect(client.lastAuthMethod).toBe('loginPopup');
        });

        it('falls back to ssoSilent when a silent token load fails for another reason', async () => {
            const msal = fakeMsal({accounts: [JDOE]}),
                client = createClient({enableSsoSilent: true, loginMethodDesktop: 'POPUP'});
            msal.acquireTokenSilent.mockRejectedValueOnce(
                new BrowserAuthError('monitor_window_timeout', 'cid')
            );
            msal.ssoSilent.mockResolvedValue({account: JDOE});

            await client.initAsync();

            expect(msal.ssoSilent).toHaveBeenCalledOnce();
            expect(msal.acquireTokenPopup).not.toHaveBeenCalled();
            expect(client.lastAuthMethod).toBe('ssoSilent');
        });

        it('reports a blocked login popup as an Azure Login Error', async () => {
            const msal = fakeMsal(),
                client = createClient({loginMethodDesktop: 'POPUP'});
            msal.acquireTokenPopup.mockRejectedValue(
                new BrowserAuthError('popup_window_error', 'cid')
            );

            await expect(client.initAsync()).rejects.toMatchObject({name: 'Azure Login Error'});
        });
    });

    describe('requests', () => {
        it('asks to log in with the ID scopes and every access token loginScope', async () => {
            const msal = fakeMsal(),
                client = createClient({
                    loginMethodDesktop: 'POPUP',
                    idScopes: ['profile'],
                    accessTokens: {
                        graph: {scopes: ['User.Read'], loginScopes: ['User.Read']},
                        trades: {
                            scopes: ['api://trades/.default'],
                            loginScopes: ['api://trades/.default', 'User.Read'],
                            extraScopesToConsent: ['api://reports/.default']
                        }
                    }
                });

            await client.initAsync();

            const [request] = msal.acquireTokenPopup.mock.lastCall;
            expect(request.scopes).toEqual([
                'openid',
                'email',
                'profile',
                'User.Read',
                'api://trades/.default'
            ]);
            expect(request.extraScopesToConsent).toEqual(['api://reports/.default']);
        });

        it('forces a refresh at init only, when initRefreshTokenExpirationOffsetSecs is set', async () => {
            const msal = fakeMsal({accounts: [JDOE]}),
                client = createClient({initRefreshTokenExpirationOffsetSecs: 8 * 60 * 60});

            await client.initAsync();
            expect(msal.acquireTokenSilent.mock.lastCall[0]).toMatchObject({
                forceRefresh: true,
                refreshTokenExpirationOffsetSeconds: 8 * 60 * 60
            });

            await client.getIdTokenAsync();
            const [request] = msal.acquireTokenSilent.mock.lastCall;
            expect(request.forceRefresh).toBe(false);
            expect(request.refreshTokenExpirationOffsetSeconds).toBeUndefined();
        });
    });
});

const JDOE = account('jdoe@example.com'),
    ASMITH = account('asmith@example.com');

function account(username: string): AccountInfo {
    return {
        homeAccountId: `${username}.tenant`,
        localAccountId: username,
        environment: 'login.microsoftonline.com',
        tenantId: 'tenant',
        username
    };
}

function createClient(config: Partial<MsalClientConfig> = {}): MsalClient {
    const ret = new MsalClient({
        clientId: 'test-client-id',
        authority: 'https://login.microsoftonline.com/tenant',
        ...config
    });
    onTestFinished(() => ret.destroy());
    return ret;
}

/**
 * Install a fake MSAL client with the given cached accounts. Silent token requests succeed, while
 * `ssoSilent` finds no session to reuse, as for a user signed in to no other app.
 */
function fakeMsal({accounts = []}: {accounts?: AccountInfo[]} = {}) {
    const ret = {
        handleRedirectPromise: vi.fn(async () => null),
        getAllAccounts: vi.fn(() => accounts),
        acquireTokenSilent: vi.fn(async (_req: PlainRequest) => ({
            idToken: jwt(60 * MINUTES),
            accessToken: jwt(60 * MINUTES)
        })),
        ssoSilent: vi.fn(async (_req: PlainRequest): Promise<{account: AccountInfo}> => {
            throw new InteractionRequiredAuthError('login_required', 'cid');
        }),
        acquireTokenPopup: vi.fn(async (_req: PlainRequest) => ({account: JDOE})),
        acquireTokenRedirect: vi.fn(async (_req: PlainRequest) => {}),
        logoutRedirect: vi.fn(async () => {}),
        logoutPopup: vi.fn(async () => {}),
        addPerformanceCallback: vi.fn(() => 'perf-callback'),
        removePerformanceCallback: vi.fn(() => true)
    };
    vi.mocked(createStandardPublicClientApplication).mockResolvedValue(
        ret as unknown as IPublicClientApplication
    );
    return ret;
}

type PlainRequest = Record<string, any>;

/** An unsigned JWT that expires the given number of ms from now. */
function jwt(expiresInMs: number): string {
    const encode = (obj: object) =>
            btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'),
        exp = Math.floor((Date.now() + expiresInMs) / SECONDS);
    return `${encode({alg: 'none'})}.${encode({sub: 'jdoe', exp})}.sig`;
}
