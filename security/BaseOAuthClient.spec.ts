/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {
    AccessTokenSpec,
    BaseOAuthClient,
    BaseOAuthClientConfig,
    Token,
    TokenMap
} from '@xh/hoist/security';
import {MINUTES, SECONDS} from '@xh/hoist/utils/datetime';
import {afterEach, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * The provider-neutral half of Hoist's OAuth support, driven through a minimal provider. Every
 * OAuth app gets its tokens through this class, and its failure modes - a stale cached ID token,
 * a storm of relogin popups, a deep link lost to the login redirect - only show up in production.
 */
describe('BaseOAuthClient', () => {
    afterEach(() => {
        localStorage.clear();
        window.history.replaceState(null, '', '/');
    });

    describe('getIdTokenAsync', () => {
        it('reloads without the provider cache when the cached token is about to expire', async () => {
            // MSAL and Auth0 can both return expired ID tokens from their caches.
            const client = createClient();
            client.fetchIdToken
                .mockResolvedValueOnce(token(30 * SECONDS))
                .mockResolvedValueOnce(token(60 * MINUTES));

            const ret = await client.getIdTokenAsync();

            expect(client.fetchIdToken.mock.calls).toEqual([[true], [false]]);
            expect(ret.expiresWithin(MINUTES)).toBe(false);
        });
    });

    describe('getAllTokensAsync', () => {
        it('loads eager access tokens, reporting a failed one without blocking the rest', async () => {
            const handleException = vi.spyOn(XH, 'handleException').mockImplementation(() => {}),
                client = createClient({
                    accessTokens: {
                        trades: {scopes: ['api://trades/read']},
                        reports: {scopes: ['api://reports/read'], fetchMode: 'lazy'},
                        risk: {scopes: ['api://risk/read']}
                    }
                });
            client.fetchAccessToken.mockImplementation(async spec => {
                if (spec.scopes[0] === 'api://risk/read') throw new Error('Consent required');
                return token(60 * MINUTES);
            });

            const tokens = await client.getAllTokensAsync({eagerOnly: true});

            expect(Object.keys(tokens).sort()).toEqual(['id', 'trades']);
            expect(handleException).toHaveBeenCalledOnce();
            expect(handleException.mock.lastCall[0]).toMatchObject({message: 'Consent required'});
            const requested = client.fetchAccessToken.mock.calls.map(([spec]) => spec.scopes[0]);
            expect(requested).not.toContain('api://reports/read');
        });
    });

    describe('relogin', () => {
        it('shares one popup login among concurrent requests, then retries them', async () => {
            vi.useFakeTimers();
            const client = createClient({reloginEnabled: true});
            let loggedIn = false;
            client.loginPopup.mockImplementation(async () => {
                loggedIn = true;
            });
            client.fetchIdToken.mockImplementation(async () => {
                if (!loggedIn) throw new InteractionRequiredError();
                return token(60 * MINUTES);
            });

            const tokens = await Promise.all([
                client.getIdTokenAsync(),
                client.getIdTokenAsync(),
                client.getIdTokenAsync()
            ]);

            expect(client.loginPopup).toHaveBeenCalledOnce();
            tokens.forEach(it => expect(it).toBeInstanceOf(Token));
        });

        it('throws Auth Expired when a request still needs interaction after relogin', async () => {
            vi.useFakeTimers();
            const client = createClient({reloginEnabled: true});
            client.fetchIdToken.mockRejectedValue(new InteractionRequiredError());

            await expect(client.getIdTokenAsync()).rejects.toMatchObject({name: 'Auth Expired'});
            expect(client.loginPopup).toHaveBeenCalledOnce();
        });

        it('gives up on a relogin popup left open past reloginTimeoutSecs', async () => {
            // Requests wait on the relogin - they must not pile up behind an abandoned popup.
            vi.useFakeTimers();
            const client = createClient({reloginEnabled: true, reloginTimeoutSecs: 60});
            client.fetchIdToken.mockRejectedValue(new InteractionRequiredError());
            client.loginPopup.mockReturnValue(new Promise(() => {}));

            const result = expect(client.getIdTokenAsync()).rejects.toMatchObject({
                name: 'Auth Expired'
            });
            await vi.advanceTimersByTimeAsync(60 * SECONDS);
            await result;
        });

        it('does not prompt again within a minute of the last relogin', async () => {
            vi.useFakeTimers();
            const client = createClient({reloginEnabled: true});
            client.fetchIdToken.mockRejectedValue(new InteractionRequiredError());

            await expect(client.getIdTokenAsync()).rejects.toThrow();
            await expect(client.getIdTokenAsync()).rejects.toMatchObject({name: 'Auth Expired'});
            expect(client.loginPopup).toHaveBeenCalledOnce();

            await vi.advanceTimersByTimeAsync(61 * SECONDS);
            await expect(client.getIdTokenAsync()).rejects.toThrow();
            expect(client.loginPopup).toHaveBeenCalledTimes(2);
        });

        it('never prompts when relogin is disabled', async () => {
            const client = createClient();
            client.fetchIdToken.mockRejectedValue(new InteractionRequiredError());

            await expect(client.getIdTokenAsync()).rejects.toMatchObject({name: 'Auth Expired'});
            expect(client.loginPopup).not.toHaveBeenCalled();
        });
    });

    describe('redirect state', () => {
        it('restores the path and query of the page that started a login redirect', () => {
            const client = createClient();
            window.history.replaceState(null, '', '/app/trades?id=42');
            const key = client.captureRedirectState();

            window.history.replaceState(null, '', '/app/');
            client.restoreRedirectState(key);

            expect(window.location.pathname + window.location.search).toBe('/app/trades?id=42');
        });

        it('prunes states saved more than five minutes ago', () => {
            vi.useFakeTimers({toFake: ['Date']});
            const client = createClient(),
                staleKey = client.captureRedirectState();

            vi.advanceTimersByTime(6 * MINUTES);
            const freshKey = client.captureRedirectState();

            const saved = JSON.parse(localStorage.getItem('xhOAuthState'));
            expect(saved.map(it => it.key)).toEqual([freshKey]);
            expect(() => client.restoreRedirectState(staleKey)).toThrow();
        });
    });

    describe('logoutAsync', () => {
        // Regression: v82.0.0 (7a5aeddcd) - logout left the selected username in local storage.
        it('clears the selected username', async () => {
            const client = createClient();
            client.setSelectedUsername('jdoe@example.com');

            await client.logoutAsync();

            expect(client.getSelectedUsername()).toBeNull();
            expect(localStorage.getItem('xhOAuthSelectedUsername')).toBeNull();
            expect(client.logout).toHaveBeenCalledOnce();
        });
    });

    describe('redirectUrl', () => {
        it.each([
            ['/app/trades/42', '/app/'],
            ['/', '/']
        ])('resolves the APP_BASE_URL default on %s to %s', (path, basePath) => {
            // Must exactly match a redirect URI registered with the OAuth provider.
            window.history.replaceState(null, '', path);
            expect(createClient().redirectUrl).toBe(window.location.origin + basePath);
        });
    });
});

//------------------
// Test provider
//------------------
type TestConfig = BaseOAuthClientConfig<AccessTokenSpec>;

class InteractionRequiredError extends Error {}

/** A minimal OAuth provider, its template methods mocked to script provider behavior. */
class TestOAuthClient extends BaseOAuthClient<TestConfig, AccessTokenSpec> {
    fetchIdToken = vi.fn(async (_useCache: boolean) => token(60 * MINUTES));
    fetchAccessToken = vi.fn(async (_spec: AccessTokenSpec, _useCache: boolean) =>
        token(60 * MINUTES)
    );
    loginPopup = vi.fn(async () => {});
    logout = vi.fn(async () => {});

    // Expose protected helpers used by provider implementations.
    override get redirectUrl(): string {
        return super.redirectUrl;
    }

    override captureRedirectState(): string {
        return super.captureRedirectState();
    }

    override restoreRedirectState(key: string) {
        super.restoreRedirectState(key);
    }

    protected override async doInitAsync(): Promise<TokenMap> {
        return this.fetchAllTokensAsync({eagerOnly: true});
    }

    protected override doLoginPopupAsync(): Promise<void> {
        return this.loginPopup();
    }

    protected override async doLoginRedirectAsync(): Promise<void> {}

    protected override fetchIdTokenAsync(useCache: boolean): Promise<Token> {
        return this.fetchIdToken(useCache);
    }

    protected override fetchAccessTokenAsync(
        spec: AccessTokenSpec,
        useCache: boolean
    ): Promise<Token> {
        return this.fetchAccessToken(spec, useCache);
    }

    protected override doLogoutAsync(): Promise<void> {
        return this.logout();
    }

    protected override interactiveLoginNeeded(e: unknown): boolean {
        return e instanceof InteractionRequiredError;
    }
}

function createClient(config: Partial<TestConfig> = {}): TestOAuthClient {
    const ret = new TestOAuthClient({clientId: 'test-client-id', ...config});
    onTestFinished(() => ret.destroy());
    return ret;
}

/** A Token for an unsigned JWT that expires the given number of ms from now. */
function token(expiresInMs: number): Token {
    const encode = (obj: object) =>
            btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'),
        exp = Math.floor((Date.now() + expiresInMs) / SECONDS);
    return new Token(`${encode({alg: 'none'})}.${encode({sub: 'jdoe', exp})}.sig`);
}
