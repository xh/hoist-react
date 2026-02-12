# External Integrations

**Analysis Date:** 2026-02-11

## APIs & External Services

**Authentication:**
- Auth0 - OAuth/SSO authentication provider
  - SDK/Client: `@auth0/auth0-spa-js` ~2.9.1
  - Implementation: `security/authzero/AuthZeroClient.ts`
  - Auth: Configured via `AuthZeroClientConfig` (domain, clientId, audience)
  - Supports: Login redirect, popup, silent token refresh, logout

- Microsoft Azure AD (MSAL) - OAuth/SSO authentication provider
  - SDK/Client: `@azure/msal-browser` ~4.26.2
  - Implementation: `security/msal/MsalClient.ts`
  - Auth: Configured via `MsalClientConfig` (authority, clientId, domainHint)
  - Supports: Login redirect, popup, SSO silent, token caching, telemetry
  - Requires: 3rd party cookies for iframe-based flows

**HTTP Communication:**
- Application-defined REST APIs
  - Client: `FetchService` (`svc/FetchService.ts`)
  - Built on: Native Fetch API
  - Features: CORS, credentials, auto-retry, correlation IDs, interceptors
  - Default timeout: 30 seconds
  - Integration: Works with Hoist Core backend or any REST API

**Real-time Communication:**
- WebSocket connections
  - Service: `WebSocketService` (`svc/WebSocketService.ts`)
  - Protocol: WebSocket
  - Use case: Server push notifications, real-time updates

## Data Storage

**Databases:**
- Not applicable - hoist-react is client-side only
  - Backend: Hoist Core (Grails) handles database access
  - Client data flow: REST API → FetchService → Store/Model

**File Storage:**
- Local filesystem (downloads)
  - Library: `downloadjs` ~1.4.7
  - Client-side file creation and download
- File uploads
  - Library: `react-dropzone` ~10.2.2
  - Upload handling: Application-defined endpoints

**Caching:**
- Browser LocalStorage
  - Wrapper: `store2` ~2.14.3
  - Service: `LocalStorageService` (`svc/storage/LocalStorageService.ts`)
  - Use: User preferences, view state, authentication tokens

- Browser SessionStorage
  - Service: `SessionStorageService` (`svc/storage/SessionStorageService.ts`)
  - Use: Session-scoped data

- OAuth token caching
  - Auth0: Uses `localstorage` cache location
  - MSAL: Uses `localStorage` for cross-tab token sharing

## Authentication & Identity

**Auth Provider:**
- Pluggable OAuth (Auth0 or Azure MSAL)
  - Implementation: `security/authzero/AuthZeroClient.ts` or `security/msal/MsalClient.ts`
  - Base: `security/BaseOAuthClient.ts`
  - Flow: Redirect or popup-based login
  - Tokens: ID tokens and access tokens with refresh
  - Storage: LocalStorage for token cache

**Token Management:**
- JWT parsing: `jwt-decode` ~4.0.0
- Token class: `security/Token.ts`
- Automatic refresh: Built into OAuth clients
- Correlation IDs: Optional via `FetchService.correlationIdHeaderKey`

## Monitoring & Observability

**Error Tracking:**
- Application-defined (framework provides exception handling)
  - Core: `exception/Exception.ts`, `exception/HoistException.ts`
  - Reporting: Via application services

**Logs:**
- Browser console
  - Utils: `utils/js` logging functions
  - Service logs: Each `HoistService` has logging methods
  - MSAL telemetry: Optional via `MsalClient.enableTelemetry()`

**Health Monitoring:**
- `ClientHealthService` (`svc/ClientHealthService.ts`)
  - Collects: Client metrics, MSAL telemetry
  - Reporting: To Hoist Core backend

**Activity Tracking:**
- `TrackService` (`svc/TrackService.ts`)
  - Tracks: User interactions, page views, custom events
  - Backend: Sends to Hoist Core `/track` endpoint

## CI/CD & Deployment

**Hosting:**
- Application-defined
  - Built as: NPM package `@xh/hoist`
  - Consumed by: Hoist applications via Yarn/NPM
  - Apps bundle: Via Webpack with hoist-react as dependency

**CI Pipeline:**
- Git hooks via Husky 9.x
  - Pre-commit: Lint-staged (Prettier + ESLint + Stylelint)
  - Location: `.husky/` directory

## Environment Configuration

**Required env vars:**
- None in hoist-react framework itself
- Apps provide:
  - OAuth config (Auth0 domain/clientId or MSAL authority/clientId)
  - Backend API base URL
  - Feature flags

**Secrets location:**
- Application-level `.env` files (not in framework)
- OAuth client secrets managed by provider (server-side only for confidential clients)

## Webhooks & Callbacks

**Incoming:**
- OAuth redirect callbacks
  - Auth0: Handled via `AuthZeroClient.handleRedirectCallback()`
  - MSAL: Handled via `MsalClient.handleRedirectPromise()`
  - URL pattern: Application-defined redirect URI

**Outgoing:**
- None (client-side framework)

## Third-Party UI Integrations

**Component Libraries:**
- Blueprint.js - Desktop UI components
  - Integration: `kit/blueprint/` wrapper
  - Initialization: `FocusStyleManager`, transition config

- ag-Grid - Enterprise data grid
  - Integration: `kit/ag-grid/index.ts`
  - Runtime install: Apps call `installAgGrid()` with licensed version
  - Required version: 34.2.0 to 34.*.*

- FontAwesome Pro - Icon library
  - Integration: `icon/` components, `kit/blueprint/` imports
  - Icon library: Dynamically loaded via `@fortawesome/fontawesome-svg-core`

- Highcharts - Charting library
  - Integration: `kit/highcharts/index.ts`
  - Used by: Chart components

- OnsenUI - Mobile UI components
  - Integration: `kit/onsen/` wrapper
  - Theme: `kit/onsen/theme.scss`

- Swiper - Carousel/slider
  - Integration: `kit/swiper/` wrapper
  - Styles: `kit/swiper/styles.scss`

**Developer Tools:**
- `InspectorService` (`svc/InspectorService.ts`)
  - Runtime debugging and state inspection

---

*Integration audit: 2026-02-11*
