# Application Lifecycle: Initialization

Every Hoist React application starts from an entry point file that calls `XH.renderApp()`. This
document explains how an app goes from a file in the `apps/` folder to a fully running application,
covering the entry point system, `AppSpec` configuration, and the initialization sequence.

> This is Part 1 of the Lifecycle documentation, covering **application initialization**.
> Part 2 — [Models, Services, and Load/Refresh](./lifecycle-models-and-services.md) — covers
> the runtime lifecycles of models and services (`onLinked`, `doLoadAsync`, `initAsync`, etc.).

## The `apps/` Folder — Entry Points and Bundles

Each file in a project's `client-app/src/apps/` directory defines an entry point for a Webpack
bundle. The build system (`hoist-dev-utils`) reads this folder to determine what bundles to build —
**one file = one independently deployable application bundle**.

Common entry point files include:

| File | Purpose |
|------|---------|
| `app.ts` | Main desktop application |
| `admin.ts` | Hoist Admin Console |
| `mobile.ts` | Mobile variant of the application |

A project can define as many entry points as needed. Toolbox, for example, includes `app.ts`,
`admin.ts`, `mobile.ts`, `contact.ts`, `portfolio.ts`, `fileManager.ts`, `news.ts`, `recalls.ts`,
and `todo.ts` — each producing a standalone application bundle.

## `XH.renderApp()`

Every entry point file calls `XH.renderApp()` to start a Hoist application. This method accepts a
config object matching the `AppSpec` class shape.

### A Typical Entry Point

```typescript
import '../Bootstrap';

import {XH} from '@xh/hoist/core';
import {AppContainer} from '@xh/hoist/desktop/appcontainer';
import {AppComponent} from '../desktop/AppComponent';
import {AppModel} from '../desktop/AppModel';
import {AuthModel} from '../core/AuthModel';

XH.renderApp({
    clientAppCode: 'app',
    clientAppName: 'Toolbox',
    componentClass: AppComponent,
    modelClass: AppModel,
    containerClass: AppContainer,
    authModelClass: AuthModel,
    isMobileApp: false,
    enableLogout: true,
    checkAccess: () => true
});
```

The five required properties — `componentClass`, `modelClass`, `containerClass`, `isMobileApp`, and
`checkAccess` — define the root component and model, the platform container, and the access control
rule. The remaining properties are optional and default to sensible values.

### AppSpec Properties

| Property | Required | Description |
|----------|----------|-------------|
| `componentClass` | Yes | Root `hoistCmp` for the application. Despite the name, functional components are expected. |
| `modelClass` | Yes | Root `HoistAppModel` class (reference to class, not an instance). |
| `containerClass` | Yes | Platform container — import from `@xh/hoist/desktop/appcontainer` or `@xh/hoist/mobile/appcontainer`. Nearly all apps use the default `AppContainer` shipped with Hoist. |
| `isMobileApp` | Yes | `true` for mobile apps, `false` for desktop. |
| `checkAccess` | Yes | A role string (e.g. `'ACCESS_APP'`) or a function `(user) => boolean \| {hasAccess, message}`. |
| `clientAppCode` | No | Short code identifying this client app. Defaults to the Webpack `appCode`. |
| `clientAppName` | No | Display name for this client app. Defaults to the Webpack `appName`. |
| `authModelClass` | No | Custom `HoistAuthModel` subclass for OAuth or other auth flows. Defaults to `HoistAuthModel` (suitable only for transparent SSO like NTLM). |
| `enableLoginForm` | No | `true` to show a login form when not authenticated. Default `false` — most apps use OAuth/SSO. |
| `enableLogout` | No | `true` to show logout options. Default `false`. |
| `loginMessage` | No | Custom message displayed on the login form. |
| `lockoutMessage` | No | Custom message shown when a user is denied access. |
| `lockoutPanel` | No | Custom component to display when user is denied access. |
| `disableWebSockets` | No | `true` to disable built-in WebSocket support. Default `false`. |
| `enableXssProtection` | No | `true` to enable field-level XSS protection across all Stores. Default `false`. |
| `showBrowserContextMenu` | No | `true` to allow the native browser context menu. Default `false`. |
| `trackAppLoad` | No | `true` (default) to log a track statement with init timing after app load. |

See `core/AppSpec.ts` for the full class definition with detailed doc comments.

## What Happens When `renderApp()` Is Called

`XH.renderApp()` delegates to `AppContainerModel.renderApp()`, which executes the following:

### 1. Clear the Preload Spinner

The static `preflight.js` script (included in the HTML page) displays a loading spinner while
JavaScript bundles download. `renderApp()` hides this spinner and removes the preload error handler.

### 2. Create the AppSpec

If the config object is not already an `AppSpec` instance, one is created from the provided config.
This validates that all required properties are present.

### 3. Render the Container

A React root is created on the `#xh-root` DOM element and the `containerClass` (typically
`AppContainer`) is rendered with the `AppContainerModel` as its model.

```typescript
// From AppContainerModel.renderApp()
const root = createRoot(document.getElementById('xh-root'));
const rootView = createElement(appSpec.containerClass, {model: this});
root.render(rootView);
```

### 4. AppContainer Mounts and Triggers `initAsync()`

When the container component mounts, it calls `AppContainerModel.initAsync()`, which drives the
application through a series of states:

```
PRE_AUTH → AUTHENTICATING → INITIALIZING_HOIST → INITIALIZING_APP → RUNNING
```

Each state transition is observable, and the `AppContainer` component renders appropriate UI for
each state — a loading mask during initialization, a login panel if required, a lockout panel if
access is denied, or the full application once running.

### The Initialization Sequence in Detail

**PRE_AUTH** — Entry state. CSS classes are added to `document.body` to enable platform-specific
styling (e.g. `xh-app`, `xh-standard` or `xh-mobile`). Mobile-specific viewport configuration is
applied. `FetchService` is installed (required by all subsequent server communication).

**AUTHENTICATING** — The `AuthModel` is instantiated and `completeAuthAsync()` is called. For
OAuth-based apps, this typically resolves immediately if the user is already authenticated via SSO.
If the user is not authenticated and `enableLoginForm` is `true`, the app transitions to
`LOGIN_REQUIRED` instead.

**INITIALIZING_HOIST** — Core Hoist services are installed in a specific order:
1. `IdentityService` — installs user identity and checks `checkAccess`. If access is denied, the
   app transitions to `ACCESS_DENIED` and stops.
2. `LocalStorageService`, `SessionStorageService`
3. `EnvironmentService`, `ConfigService`, `PrefService`, `JsonBlobService`
4. `TrackService`
5. Remaining services: `AlertBannerService`, `AutoRefreshService`, `ChangelogService`,
   `ClientHealthService`, `IdleService`, `InspectorService`, `GridAutosizeService`,
   `GridExportService`, `WebSocketService`
6. Internal AppContainerModel sub-models are initialized (theme, sizing, refresh context, etc.)

**INITIALIZING_APP** — The application's `HoistAppModel` is instantiated (from the `modelClass`
provided in the AppSpec) and its `initAsync()` method is called. This is where applications
perform their own startup logic — loading initial data, configuring routing, etc.

**RUNNING** — The app is fully initialized. The `AppContainer` renders the application's root
`componentClass` within the standard app chrome (impersonation bar, version bar, load mask,
exception dialog, etc.).

### Terminal States

| State | Trigger |
|-------|---------|
| `LOGIN_REQUIRED` | User not authenticated and `enableLoginForm: true` |
| `ACCESS_DENIED` | `checkAccess` returned `false` / user lacks required role |
| `LOAD_FAILED` | An exception during initialization |
| `SUSPENDED` | App suspended due to idle timeout, forced server update, or auth expiration |

See `core/types/AppState.ts` for the full state enumeration.

## `XH.renderAdminApp()`

`renderAdminApp()` is a convenience wrapper for projects that include the Hoist Admin Console. It
calls `renderApp()` with defaults appropriate for the admin app:

- `clientAppCode: 'admin'`
- `clientAppName: '${appName} Admin'`
- `isMobileApp: false`
- `checkAccess: 'HOIST_ADMIN_READER'`

A typical admin entry point:

```typescript
import '../Bootstrap';

import {XH} from '@xh/hoist/core';
import {AppComponent} from '@xh/hoist/admin/AppComponent';
import {AppModel} from '../admin/AppModel';
import {AppContainer} from '@xh/hoist/desktop/appcontainer';
import {AuthModel} from '../core/AuthModel';

XH.renderAdminApp({
    componentClass: AppComponent,
    modelClass: AppModel,
    containerClass: AppContainer,
    authModelClass: AuthModel,
    enableLogout: true
});
```

Note that `componentClass`, `containerClass`, and `modelClass` are still required — Hoist does not
default these to avoid importing admin-only code into non-admin bundles.

## The Bootstrap File

Every entry point begins with `import '../Bootstrap'`. This `Bootstrap.ts` file (located at
`client-app/src/Bootstrap.ts`) runs setup code that must execute before `renderApp()`:

- **AG Grid and Highcharts registration** — Imports and registers the AG Grid modules and
  Highcharts chart modules used by the application, including any enterprise license keys.
- **Service declarations** — Uses TypeScript interface merging to declare the application's custom
  services on `XHApi`, enabling typed access via `XH.myService`.
- **User type extensions** — Extends the `HoistUser` interface with app-specific properties.

This import must come first (or at least before `XH.renderApp()`) to ensure all registrations and
type augmentations are in place before the framework initializes.

## Key Source Files

| File | Contents |
|------|----------|
| `core/AppSpec.ts` | `AppSpec` class definition with all property docs |
| `core/XH.ts` | `renderApp()` and `renderAdminApp()` methods (lines ~410-432) |
| `appcontainer/AppContainerModel.ts` | `renderApp()` implementation, `initAsync()`, `completeInitAsync()` |
| `core/types/AppState.ts` | `AppState` enumeration |
| `desktop/appcontainer/AppContainer.ts` | Desktop `AppContainer` component |
| `mobile/appcontainer/AppContainer.ts` | Mobile `AppContainer` component |
