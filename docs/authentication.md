# Authentication

Hoist apps authenticate users during startup, before the main application loads. Most enterprise
apps use OAuth (via MSAL/Entra ID or Auth0) — users authenticate externally, and Hoist resolves
their identity against its server-side user database. Form-based login (username + password) is
also supported for simpler deployments.

## Authentication Flow

Authentication occurs during the `AUTHENTICATING` phase of the
[app initialization sequence](./lifecycle-app.md):

```
PRE_AUTH → AUTHENTICATING → INITIALIZING_HOIST → INITIALIZING_APP → RUNNING
```

The framework creates an instance of the app's `AuthModel` (specified in `AppSpec.authModelClass`)
and calls its `completeAuthAsync()` method. This method must:

1. Return an `IdentityInfo` object if the user is authenticated
2. Return `null` if the user is not authenticated
3. Throw on technical failure

If `completeAuthAsync()` returns `null` and `AppSpec.enableLoginForm` is `true`, the app
transitions to `LOGIN_REQUIRED` and displays a login form. If `enableLoginForm` is `false`,
startup fails with an authentication error.

```
completeAuthAsync()
  ├── returns IdentityInfo → completeInitAsync() → INITIALIZING_HOIST → ...
  ├── returns null + enableLoginForm → LOGIN_REQUIRED (show login form)
  ├── returns null + !enableLoginForm → LOAD_FAILED
  └── throws → LOAD_FAILED
```

## HoistAuthModel

`HoistAuthModel` is the base class that apps extend to implement authentication. Its key methods:

| Method | Purpose |
|--------|---------|
| `completeAuthAsync()` | Main entry point — authenticate user, return `IdentityInfo` or `null` |
| `loadConfigAsync()` | Fetch auth config from server (whitelisted pre-auth endpoint) |
| `getAuthStatusFromServerAsync()` | Check if user is known to the Hoist server |
| `loginWithCredentialsAsync()` | Process form-based login submission |
| `logoutAsync()` | Clear server session, override to also clear OAuth state |
| `createUser()` | Create a client-side `HoistUser` from raw server data |

The base `completeAuthAsync()` simply calls `getAuthStatusFromServerAsync()`, which is adequate
only for transparent SSO (e.g. NTLM). Any OAuth-based app must override this method.

### `loadConfigAsync()`

This method calls the server's `xh/authConfig` endpoint, which is specifically whitelisted to
allow access before the user is authenticated. Use it to bootstrap OAuth client configuration —
client IDs, authorities, domains — from server-side configs rather than hardcoding them:

```typescript
const config = await this.loadConfigAsync();
// config: {clientId, authority, domainHint, ...}
```

The server-side `BaseAuthenticationService.getClientConfig()` method determines what config
values are returned. This allows sensitive settings to be managed centrally.

### `getAuthStatusFromServerAsync()`

After OAuth authentication completes on the client, this method calls the Hoist server's
`xh/authStatus` endpoint to resolve the user's identity. The server validates the token and
returns the user's `IdentityInfo` (username, display name, roles). This is the bridge between
the external OAuth provider and Hoist's own user/role system.

## OAuth Clients

Hoist provides two OAuth client implementations in the [`/security/`](../security/README.md)
package. Both extend `BaseOAuthClient`, which handles token lifecycle, automatic refresh, and
re-login support.

### MSAL (Entra ID / Azure AD)

`MsalClient` (`security/msal/MsalClient.ts`) integrates with Microsoft's MSAL library for
Entra ID authentication. This is the primary choice for enterprise environments using Microsoft
identity.

**Key config options (`MsalClientConfig`):**

| Property | Description |
|----------|-------------|
| `clientId` | App registration GUID in Azure |
| `authority` | Tenant URL: `https://login.microsoftonline.com/[tenantId]` |
| `domainHint` | Hint for the tenant domain (speeds up login) |
| `enableSsoSilent` | Try reusing credentials from other apps in the same domain. Default `true`. |
| `autoRefreshSecs` | Timer interval for proactive token refresh. Default `-1` (disabled). |
| `reloginEnabled` | Allow popup re-login if tokens expire during use. Default `false`. |
| `accessTokens` | Map of named access token specs (scopes, loginScopes) |
| `initRefreshTokenExpirationOffsetSecs` | Front-load refresh token renewal on init. Default `-1`. |
| `enableTelemetry` | Capture MSAL performance events. Default `true`. |
| `msalLogLevel` | MSAL library log level. Default `LogLevel.Warning`. |
| `msalClientOptions` | Deep-merged overrides for the underlying MSAL `Configuration`. |

**Init flow** — MSAL tries multiple strategies in order:

```
1. Handle redirect return (completing a redirect-based login)
2. Silent token load (happy path — cached account, valid tokens)
3. SSO silent (reuse credentials from another app/tab, uses hidden iframe)
4. Interactive login (redirect or popup — requires user action)
```

Each step is tried in order; the first to succeed provides tokens. If all silent methods fail,
the user is redirected to Microsoft's login page (or a popup is shown).

### Auth0

`AuthZeroClient` (`security/authzero/AuthZeroClient.ts`) integrates with Auth0, supporting
login via Google, GitHub, Microsoft, or Auth0's own user database.

**Key config options (`AuthZeroClientConfig`):**

| Property | Description |
|----------|-------------|
| `clientId` | App GUID registered with Auth0 |
| `domain` | Auth0 domain for your tenant |
| `audience` | API identifier (required for JWT access tokens) |
| `authZeroClientOptions` | Deep-merged overrides for the underlying `Auth0ClientOptions`. |

**Init flow** — Auth0 tries:

```
1. Handle redirect callback (returning from redirect-based login)
2. Silent token load (already authenticated, refresh via cache)
3. Interactive login (redirect or popup)
```

### Shared BaseOAuthClient Features

Both clients inherit from `BaseOAuthClient`, which provides:

- **Login method selection** — `loginMethodDesktop` / `loginMethodMobile` (`'REDIRECT'` or
  `'POPUP'`, default `'REDIRECT'`)
- **Token auto-refresh** — `autoRefreshSecs` controls a timer that proactively refreshes tokens
  before they expire, keeping them fresh without user interaction
- **Re-login support** — `reloginEnabled` allows automatic popup-based re-authentication when
  tokens expire during use
- **ID and access tokens** — The `id` token identifies the user; named `accessTokens` provide
  scoped access to backend APIs
- **Redirect state preservation** — URL-based routing state is captured before redirect and
  restored after return
- **Fetch mode** — Access tokens can be `'eager'` (loaded on init) or `'lazy'` (loaded on first
  request)

## Implementing an AuthModel

The standard pattern for an OAuth-based `AuthModel`:

```typescript
import {HoistAuthModel, managed, XH} from '@xh/hoist/core';
import {AuthZeroClient, AuthZeroClientConfig} from '@xh/hoist/security/authzero/AuthZeroClient';

export class AuthModel extends HoistAuthModel {
    @managed client: AuthZeroClient;

    override async completeAuthAsync() {
        // 1. Load config from server (clientId, domain, etc.)
        const config = await this.loadConfigAsync();

        // 2. Create and initialize the OAuth client
        this.client = new AuthZeroClient({
            idScopes: ['profile'],
            ...config as AuthZeroClientConfig
        });
        await this.client.initAsync();

        // 3. Install fetch headers — attach token to all Hoist server requests
        XH.fetchService.addDefaultHeaders(async opts => {
            if (opts.url.startsWith('http')) return null;  // Skip external URLs
            const idToken = await this.client.getIdTokenAsync();
            return idToken ? {Authorization: `Bearer ${idToken.value}`} : null;
        });

        // 4. Resolve Hoist user from server
        return this.getAuthStatusFromServerAsync();
    }

    override async logoutAsync() {
        await super.logoutAsync();       // Clear server session
        await this.client?.logoutAsync(); // Clear OAuth session
    }
}
```

### Key Steps Explained

**Step 1: Load config** — `loadConfigAsync()` fetches OAuth settings from the server. This avoids
hardcoding client IDs and allows different configurations per environment.

**Step 2: Init the client** — The OAuth client attempts silent authentication first, falling back
to interactive login if needed. This call may redirect the browser or show a popup.

**Step 3: Install fetch headers** — `FetchService.addDefaultHeaders()` accepts a function that
returns headers for every subsequent fetch request. The function is called fresh for each request,
ensuring tokens are always current. This is the bridge that makes all `XH.fetchJson()` calls
carry the authentication token.

**Step 4: Resolve the Hoist user** — After OAuth succeeds, `getAuthStatusFromServerAsync()` calls
the Hoist server to look up the user by their token. The server validates the token, matches it to
a Hoist user record, and returns identity info with roles.

### MSAL Variant

MSAL-based apps follow the same pattern:

```typescript
export class AuthModel extends HoistAuthModel {
    @managed client: MsalClient;

    override async completeAuthAsync() {
        const config = await this.loadConfigAsync() as MsalClientConfig;

        this.client = new MsalClient({...config});
        await this.client.initAsync();

        // Install ID token as bearer auth for all relative requests back to the
        // Hoist server. Fully qualified URLs (starting with 'http') are skipped —
        // those go to external APIs and manage their own auth headers.
        XH.fetchService.addDefaultHeaders(async opts => {
            if (opts.url.startsWith('http')) return {};
            const idToken = await this.client.getIdTokenAsync();
            return idToken ? {Authorization: `Bearer ${idToken.value}`} : {};
        });

        return this.getAuthStatusFromServerAsync();
    }
}
```

When calling external business APIs that require a separate access token with different scopes,
fetch the token directly from the OAuth client using a named access token spec:

```typescript
class ApiService extends HoistService {
    async fetchDealsAsync() {
        const token = await XH.authModel.client.getAccessTokenAsync('dealsApi');
        return XH.fetchJson({
            url: 'https://deals-api.example.com/v1/deals',
            headers: {Authorization: `Bearer ${token.value}`}
        });
    }
}
```

The `'dealsApi'` key corresponds to a named entry in the `accessTokens` map on `MsalClientConfig`,
which specifies the scopes required for that token:

```typescript
this.client = new MsalClient({
    ...config,
    accessTokens: {
        dealsApi: {scopes: ['api://deals-api/.default']}
    }
});
```

Each entry produces a separately scoped access token that can be fetched by name via
`getAccessTokenAsync()`. Tokens default to `fetchMode: 'eager'` (loaded on init, will be available
as soon as oauth flow complete); set `fetchMode: 'lazy'` for tokens that may not be needed in every
session to avoid incurring extra init overhead requesting and refreshing that token.

## Token Management

### ID Tokens vs Access Tokens

- **ID tokens** — Identify the user. Always present. Used to authenticate with the Hoist server
  via the `Authorization` header (or a custom header key if required).
- **Access tokens** — Authorize access to specific backend APIs. Optional. Configured via the
  `accessTokens` config on the OAuth client with named specs and scopes.

Both are JWTs wrapped in a `Token` class (`security/Token.ts`) that provides expiry checking
via `expiresWithin()` and decoded payload access.

### Automatic Refresh

When `autoRefreshSecs` is configured, `BaseOAuthClient` creates a `Timer` that periodically
refreshes all tokens. The timer runs every 2 seconds and checks if enough time has elapsed since
the last refresh attempt. Tokens approaching expiry are force-refreshed (bypassing cache).

### Re-Login on Expiration

When `reloginEnabled` is `true`, token requests that fail with provider-specific "interaction
required" errors trigger an automatic popup-based re-login. This is rate-limited (at most once
per minute) and has a configurable timeout (`reloginTimeoutSecs`, default 60s). A single shared
re-login task ensures multiple concurrent token requests don't each trigger separate popups.

## Identity and Access Control

After authentication, `IdentityService` provides access to the resolved user:

| Property | Description |
|----------|-------------|
| `user` | Current acting user (apparent user if impersonating) |
| `authUser` | Actual authenticated user (always the real person) |
| `username` | Shortcut for `user.username` |
| `isImpersonating` | `true` if an admin is impersonating another user |

### HoistUser

The `HoistUser` object provides:

- `username`, `displayName`, `email`
- `roles` — array of role strings
- `hasRole(role)` — check for a specific role
- `isHoistAdmin`, `isHoistAdminReader`, `isHoistRoleManager` — convenience flags
- `hasGate(gate)` — check a config-based access gate

### Access Control via `checkAccess`

`AppSpec.checkAccess` determines whether the authenticated user can access the application. It
runs during `INITIALIZING_HOIST`, after `IdentityService` installs the user. It can be:

- A role string: `checkAccess: 'APP_USER'` — user must have this role
- A function: `checkAccess: (user) => user.hasRole('APP_USER') || user.isHoistAdmin`
- The function can return `{hasAccess: boolean, message: string}` for custom lockout messages

If access is denied, the app transitions to `ACCESS_DENIED` and displays the lockout panel.

### Impersonation

Administrators with the `HOIST_IMPERSONATOR` role (and the `xhEnableImpersonation` config set to
`true`) can impersonate other users. A built-in `ImpersonationBar` is shown automatically in
`AppContainer` and can be toggled with the **Shift+I** global hotkey.

When impersonation is active, the app reloads and runs as the target user — their roles, prefs,
and settings are all in effect. `IdentityService` tracks both identities:

| Property | During Impersonation | Normal |
|----------|---------------------|--------|
| `user` | The impersonated user | The authenticated user |
| `authUser` | The actual admin | The authenticated user |
| `isImpersonating` | `true` | `false` |

The `authUser` is always the real person at the keyboard. Application code can use this to
restrict sensitive operations during impersonation:

```typescript
const canExecuteTrades = !XH.identityService.isImpersonating
    && XH.getUser().hasRole('TRADE_EXECUTOR');
```

**Use responsibly** — the built-in "Important Reminders" alert in the `ImpersonationBar` warns
that:

- All actions are attributed to the impersonated user, as if they had performed them
- User settings — including grid customizations, dashboard layouts, and query controls — are saved
  to the impersonated user's profile, and many save automatically without an explicit step
- Impersonation sessions are tracked and logged (who, when started, when stopped)

## Form-Based Login

For apps without OAuth (or as a fallback), Hoist supports username/password login via a built-in
`LoginPanel`. Enable it with `AppSpec.enableLoginForm: true`.

The flow:
1. `completeAuthAsync()` returns `null` — user is not yet authenticated
2. App enters `LOGIN_REQUIRED` state and displays the login form
3. User submits credentials → `loginWithCredentialsAsync()` posts to `xh/login`
4. If successful, `completeInitAsync()` continues the normal initialization sequence

Some apps conditionally enable form-based login based on server config — checking whether OAuth
is configured and falling back to the login form if not:

```typescript
override async completeAuthAsync() {
    const config = await this.loadConfigAsync();
    if (!config.useOAuth) {
        XH.appSpec.enableLoginForm = true;
        return this.getAuthStatusFromServerAsync();
    }
    // ... OAuth path
}
```

## Common Pitfalls

### Forgetting to Install Fetch Headers

After initializing the OAuth client, you must install default headers on `FetchService` so that
subsequent requests carry the authentication token. Without this, all server calls after
authentication will fail:

```typescript
// ❌ Don't: OAuth client initialized, but no headers installed
await this.client.initAsync();
return this.getAuthStatusFromServerAsync();  // 401 — no token sent

// ✅ Do: install headers before resolving the user
await this.client.initAsync();
XH.fetchService.addDefaultHeaders(async () => ({
    Authorization: `Bearer ${(await this.client.getIdTokenAsync()).value}`
}));
return this.getAuthStatusFromServerAsync();
```

### Calling `super.logoutAsync()` Before Client Logout

When overriding `logoutAsync()`, call `super.logoutAsync()` first to clear the server session,
then log out from the OAuth provider. This order ensures the server-side session is invalidated
even if the OAuth logout fails:

```typescript
override async logoutAsync() {
    await super.logoutAsync();       // Clear server session first
    await this.client?.logoutAsync(); // Then clear OAuth session
}
```

### Hardcoding OAuth Config

OAuth settings (client IDs, authorities, domains) should come from the server via
`loadConfigAsync()`, not from client-side constants. This allows different settings per
environment (dev/staging/production) and keeps sensitive configuration server-managed.

## Key Source Files

| File | Contents |
|------|----------|
| `core/HoistAuthModel.ts` | Base auth model — `completeAuthAsync()`, `loadConfigAsync()`, `loginWithCredentialsAsync()` |
| `security/BaseOAuthClient.ts` | Shared OAuth client base — token lifecycle, refresh timer, re-login |
| `security/msal/MsalClient.ts` | MSAL/Entra ID implementation — silent, SSO, redirect, popup flows |
| `security/authzero/AuthZeroClient.ts` | Auth0 implementation — redirect, silent, popup flows |
| `security/Token.ts` | JWT token wrapper — `expiresWithin()`, decoded payload |
| `security/Types.ts` | `AccessTokenSpec`, `TokenMap` type definitions |
| `svc/IdentityService.ts` | User identity, roles, impersonation |
| `appcontainer/login/LoginPanelModel.ts` | Form-based login UI model |
| `core/AppSpec.ts` | `authModelClass`, `enableLoginForm`, `enableLogout`, `checkAccess` |
| `appcontainer/AppContainerModel.ts` | Auth state transitions, `completeInitAsync()` |
