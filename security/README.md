# Security

This package provides OAuth 2.0 client abstractions for authenticating Hoist applications with
external identity providers. It supports two providers: **Auth0** (via `AuthZeroClient`) and
**Microsoft Entra ID** (via `MsalClient`), both extending a shared `BaseOAuthClient` base class.

For the full authentication flow — including `HoistAuthModel`, server-side token validation,
`IdentityService`, and role-based access — see the [Authentication](../docs/authentication.md)
concept doc. This package README focuses on the OAuth client classes themselves and their
configuration.

In practice, most OAuth client config (client IDs, domains, authorities, audiences) is not
hard-coded. The app's `HoistAuthModel` calls `loadConfigAsync()` to fetch settings from the
server's `xh/authConfig` endpoint — a whitelisted endpoint available before authentication — and
spreads those values into the client constructor. This keeps sensitive and environment-specific
settings server-managed. See the Authentication concept doc for the full pattern.

## Architecture

```
security/
├── BaseOAuthClient.ts       # Abstract base with shared OAuth lifecycle, token refresh, re-login
├── Token.ts                 # JWT token wrapper with expiry checking and decoded payload
├── Types.ts                 # AccessTokenSpec, TokenMap type definitions
├── authzero/
│   └── AuthZeroClient.ts    # Auth0 implementation using @auth0/auth0-spa-js
└── msal/
    └── MsalClient.ts        # Microsoft Entra ID implementation using @azure/msal-browser
```

### Class Hierarchy

```
HoistBase
  └── BaseOAuthClient<Config, TokenSpec>    # Abstract: init, login, token lifecycle
        ├── AuthZeroClient                  # Auth0 (domain, audience)
        └── MsalClient                     # MSAL (authority, domainHint, SSO)
```

## BaseOAuthClient

The abstract `BaseOAuthClient` manages the core OAuth lifecycle:

1. **Initialization** (`initAsync`) — Attempts silent token load, falls back to interactive login
2. **Login** (`loginAsync`) — Redirect or popup flow based on `loginMethod` config
3. **Token acquisition** — `getIdTokenAsync()`, `getAccessTokenAsync(key)`, `getAllTokensAsync()`
4. **Auto-refresh** — Optional background timer that keeps tokens fresh via provider cache
5. **Re-login** — Optional interactive re-login (popup) when tokens expire and refresh fails
6. **Logout** (`logoutAsync`) — Clears state and delegates to provider logout
7. **Redirect state** — Captures and restores URL routing state across redirect flows

### BaseOAuthClientConfig

| Config | Type | Description |
|--------|------|-------------|
| `clientId` | `string` | Client ID (GUID) of your app registered with the OAuth provider. **Required** |
| `redirectUrl` | `string` | Where auth responses are received. Default `'APP_BASE_URL'` (auto-resolved) |
| `postLogoutRedirectUrl` | `string` | Where to go after logout. Default `'APP_BASE_URL'` |
| `loginMethodDesktop` | `'REDIRECT' \| 'POPUP'` | Login method on desktop. Default `'REDIRECT'` |
| `loginMethodMobile` | `'REDIRECT' \| 'POPUP'` | Login method on mobile. Default `'REDIRECT'` |
| `autoRefreshSecs` | `number` | Background token refresh interval. Default `-1` (disabled). Should be significantly shorter than minimum token lifetime |
| `idScopes` | `string[]` | Additional scopes beyond the always-requested `['openid', 'email']` |
| `accessTokens` | `Record<string, AccessTokenSpec>` | Named specs for access tokens to load for back-end resources |
| `reloginEnabled` | `boolean` | Allow interactive popup re-login on token expiration. Default `false` |
| `reloginTimeoutSecs` | `number` | Max time for interactive re-login. Default `60` |

## Auth0 Client

`AuthZeroClient` wraps the `@auth0/auth0-spa-js` library. Its init flow:

1. Check if returning from redirect → complete callback, restore URL state
2. Check if already authenticated → attempt silent token load
3. Fall back to interactive login (redirect or popup)

### AuthZeroClientConfig (extends BaseOAuthClientConfig)

| Config | Type | Description |
|--------|------|-------------|
| `domain` | `string` | Auth0 domain for your tenant. **Required** |
| `audience` | `string` | API audience identifier. Pass this for single-audience apps to get both ID and access tokens in one request, and to avoid issues with third-party cookie blocking |
| `authZeroClientOptions` | `Partial<Auth0ClientOptions>` | Additional options deep-merged into the Auth0Client constructor config |

### AuthZeroTokenSpec (extends AccessTokenSpec)

| Field | Type | Description |
|-------|------|-------------|
| `audience` | `string` | API identifier for the access token. **Required** — ensures issued token is a JWT (not an opaque string) |
| `scopes` | `string[]` | Scopes for this access token |
| `fetchMode` | `'eager' \| 'lazy'` | When to load: `'eager'` (default) loads on init; `'lazy'` defers until first request |

### Auth0 Usage Example

```typescript
import {AuthZeroClient} from '@xh/hoist/security/authzero/AuthZeroClient';

const oAuthClient = new AuthZeroClient({
    clientId: 'your-client-id-guid',
    domain: 'your-tenant.auth0.com',
    audience: 'https://api.your-app.com',
    autoRefreshSecs: 300,
    accessTokens: {
        api: {
            audience: 'https://api.your-app.com',
            scopes: ['read:data', 'write:data']
        }
    }
});
```

## MSAL Client

`MsalClient` wraps the `@azure/msal-browser` library for Microsoft Entra ID (Azure AD). Its init
flow is more complex due to MSAL's account model and SSO support:

1. Handle redirect return (if coming back from redirect)
2. Find "selected" account in cache → attempt silent token load
3. Try SSO silent (reuse credentials from other apps/tabs in same domain)
4. Fall back to interactive login

### MsalClientConfig (extends BaseOAuthClientConfig)

| Config | Type | Description |
|--------|------|-------------|
| `authority` | `string` | Tenant authority URL: `https://login.microsoftonline.com/[tenantId]`. **Required** |
| `domainHint` | `string` | Hint for the tenant/domain the user should use to sign in |
| `enableSsoSilent` | `boolean` | Try `ssoSilent()` to reuse credentials from other tabs. Requires iframes and third-party cookies. Default `true` |
| `enableTelemetry` | `boolean` | Capture MSAL performance events as `MsalClientTelemetry`. Default `true` |
| `initRefreshTokenExpirationOffsetSecs` | `number` | Minimum remaining lifetime to enforce on tokens at app init. Forces fresh tokens when near expiry. Default `-1` (disabled). Max `86400` (24 hours) |
| `msalLogLevel` | `LogLevel` | MSAL internal logging level. Default `LogLevel.Warning` |
| `msalClientOptions` | `Partial<Configuration>` | Additional options deep-merged into the MSAL client constructor config |

### MsalTokenSpec (extends AccessTokenSpec)

| Field | Type | Description |
|-------|------|-------------|
| `scopes` | `string[]` | Scopes for this access token |
| `fetchMode` | `'eager' \| 'lazy'` | When to load the token |
| `loginScopes` | `string[]` | Additional scopes requested during interactive/SSO login |
| `extraScopesToConsent` | `string[]` | Scopes added to login for consent prompting |

### MSAL Usage Example

```typescript
import {MsalClient} from '@xh/hoist/security/msal/MsalClient';

const oAuthClient = new MsalClient({
    clientId: 'your-client-id-guid',
    authority: 'https://login.microsoftonline.com/your-tenant-id',
    domainHint: 'your-company.com',
    autoRefreshSecs: 300,
    accessTokens: {
        graph: {
            scopes: ['User.Read'],
            fetchMode: 'eager'
        },
        externalApi: {
            scopes: ['api://external-api-id/.default'],
            fetchMode: 'lazy'
        }
    }
});
```

## Selected Username

`BaseOAuthClient` exposes `getSelectedUsername()` and `setSelectedUsername()` to persist the last
authenticated OAuth username in localStorage. This facilitates more efficient re-login via SSO or
account selection. The value is set automatically on successful authentication and cleared on
logout. Note this is the OAuth-level username and is not necessarily the Hoist application username.

## Access Tokens

Both clients support loading multiple named access tokens via the `accessTokens` config. Each entry
maps an arbitrary key to an `AccessTokenSpec`:

```typescript
accessTokens: {
    hoistApi: {
        scopes: ['api://hoist-server/.default'],
        fetchMode: 'eager'     // loaded at init (default)
    },
    externalService: {
        scopes: ['api://external/.default'],
        fetchMode: 'lazy'      // loaded on first getAccessTokenAsync('externalService') call
    }
}
```

Retrieve tokens at runtime via `oAuthClient.getAccessTokenAsync('hoistApi')`.

## Token Class

The `Token` class wraps a raw JWT string with convenience properties:

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `value` | `string` | Raw JWT string |
| `decoded` | `PlainObject` | JWT payload decoded via `jwtDecode` |
| `expiry` | `number` | Token expiration time in milliseconds |
| `expiresWithin(interval)` | `boolean` | `true` if the token expires within the given interval (ms) |
| `formattedExpiry` | `string` | Human-readable expiry (e.g. `'expires Feb 15 (in 2 hours)'`) |
| `equals(other)` | `boolean` | Compare token values |

## Common Pitfalls

### Missing Audience with Auth0

Auth0 returns **opaque** (non-JWT) access tokens when no `audience` is specified. Always provide
an `audience` — both in `AuthZeroClientConfig.audience` and in each `AuthZeroTokenSpec.audience` —
to receive proper JWT access tokens that can be decoded and validated.

### Popup Blockers

Both clients support popup-based login as an alternative to redirects. However, browsers commonly
block popup windows by default. If using `loginMethod: 'POPUP'`, users may need to explicitly
allow popups for the application's domain. The clients provide user-facing error messages when
popup blocking is detected.

Enterprise deployments can use Chrome's
[`PopupsAllowedForUrls`](https://chromeenterprise.google/policies/popups-allowed-for-urls/)
managed policy to allowlist the OAuth provider's login domain (e.g.
`https://login.microsoftonline.com` or `https://[*.]auth0.com`), ensuring popup-based flows work
without user intervention.

### Third-Party Cookie and Local Network Access Requirements for MSAL

MSAL's `ssoSilent` and `initRefreshTokenExpirationOffsetSecs` features rely on hidden iframes that
require third-party cookies. If your users have third-party cookies blocked, these features will
fail silently and fall back to interactive login.

Starting with Chrome 142 (October 2025), Chrome's Local Network Access restrictions can also block
MSAL's hidden iframe flows, causing `ssoSilent()` to fail with a timeout error. Enterprise
deployments should configure the
[`LocalNetworkAccessAllowedForUrls`](https://chromeenterprise.google/policies/local-network-access-allowed-for-urls/)
managed policy to allowlist the application's origin. See
[MSAL issue #8100](https://github.com/azuread/microsoft-authentication-library-for-js/issues/8100)
for details.

### MSAL Requires `blank.html` for Silent Requests

MSAL's silent token acquisition uses a hidden iframe that needs a valid redirect URI. Hoist provides
a minimal `public/blank.html` for this purpose — it is copied into your app's build output
automatically by Hoist Dev Utils. The `BaseOAuthClient.blankUrl` getter resolves this as
`${origin}/public/blank.html`. No app-level setup is required, but be aware this file must be
reachable at runtime for silent token refresh to work.

### Redirect State Loss

OAuth redirect flows navigate the user away from your app to the provider's login page. Both
clients use `captureRedirectState()`/`restoreRedirectState()` to preserve the user's URL routing
state (pathname and search params) across the redirect. This is handled automatically — but be
aware that any in-memory application state *not* in the URL will be lost on redirect.

## Related Packages

- [Authentication concept doc](../docs/authentication.md) — Full auth flow from HoistAuthModel
  through token management, identity, and impersonation
- [`/svc/`](../svc/README.md) — IdentityService provides the authenticated user's identity and
  role information
- [`/appcontainer/`](../appcontainer/README.md) — Login panel and app shell authentication UI
