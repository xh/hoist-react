# Services Package

## Overview

The `/svc/` package contains Hoist's built-in singleton services - classes that provide app-wide
functionality like HTTP requests, configuration, user preferences, and activity tracking. Services
are instantiated once during app initialization and accessed globally via the `XH` singleton.

Services extend `HoistService` (from `/core/`) and follow these principles:
- **Singleton lifecycle** - One instance per app, lives for app lifetime
- **Global access** - Available as `XH.serviceName` (e.g., `XH.fetchService`)
- **Async initialization** - Can perform startup work in `initAsync()`
- **MobX integration** - Full support for observable state and reactions

## Architecture

```
HoistBase
└── HoistService (singleton services)
    ├── FetchService        - HTTP requests
    ├── ConfigService       - Server configuration
    ├── PrefService         - User preferences
    ├── IdentityService     - Current user info
    ├── EnvironmentService  - App environment metadata
    ├── TrackService        - Activity tracking
    ├── WebSocketService    - Bidirectional messaging
    └── ... (18 built-in services total)
```

### Service Installation

Services are installed during app startup via `XH.installServicesAsync()`. Hoist's core services
are installed automatically; applications add custom services in `AppModel.initAsync()`:

```typescript
class AppModel extends HoistAppModel {
    override async initAsync() {
        // Install custom services - all initialize concurrently
        await XH.installServicesAsync(TradeService, PortfolioService);

        // Chain calls for ordered initialization (when services depend on earlier ones)
        await XH.installServicesAsync(ReportService);  // Can now use Trade/Portfolio services
    }
}
```

### Service Access

```typescript
// Preferred: Use XH convenience methods where they exist
XH.fetchJson({url: 'api/data'});
XH.getConf('featureEnabled');
XH.getPref('gridPageSize');
XH.track('User exported data');
XH.getUser().roles;
XH.getEnv('appEnvironment');

// Full service access also available (for less common methods or properties)
XH.configService.list;               // No alias - use service directly
XH.identityService.isImpersonating;  // No alias - use service directly
XH.prefService.pushAsync('key', v);  // No alias - use service directly
```

**XH Convenience Methods:**

| Method | Delegates To |
|--------|--------------|
| `XH.fetch()` | `fetchService.fetch()` |
| `XH.fetchJson()` | `fetchService.fetchJson()` |
| `XH.postJson()` | `fetchService.postJson()` |
| `XH.getConf()` | `configService.get()` |
| `XH.getPref()` | `prefService.get()` |
| `XH.setPref()` | `prefService.set()` |
| `XH.track()` | `trackService.track()` |
| `XH.getEnv()` | `environmentService.get()` |
| `XH.getUser()` | `identityService.user` |
| `XH.getUsername()` | `identityService.username` |

## Built-in Services

### Core Data Access

#### FetchService
**File**: `FetchService.ts` | **Access**: `XH.fetchService` or `XH.fetch()`, `XH.fetchJson()`, etc.

Managed HTTP requests with enhancements over the native Fetch API.

**Key Features:**
- Automatic correlation IDs for request tracking
- Configurable timeouts (default 30 seconds)
- Auto-abort of duplicate requests via `autoAbortKey`
- Request/response interceptors
- Rich exception handling with HTTP status and server details

```typescript
// Basic JSON request
const users = await XH.fetchJson({url: 'api/users'});

// POST with body
await XH.postJson({url: 'api/users', body: {name: 'John', role: 'admin'}});

// With timeout and abort key (cancels previous request with same key)
const results = await XH.fetchJson({
    url: 'api/search',
    params: {query: searchTerm},
    timeout: 60000,
    autoAbortKey: 'search'
});

// Pass loadSpec for consistent tracking in doLoadAsync()
override async doLoadAsync(loadSpec: LoadSpec) {
    const data = await XH.fetchJson({url: 'api/data', loadSpec});
}
```

**Configuration Options:**

| Option | Type | Description |
|--------|------|-------------|
| `url` | string | Request URL (relative URLs appended to `XH.baseUrl`) |
| `body` | any | Request body |
| `params` | object | Query string parameters |
| `headers` | object | Additional headers |
| `timeout` | number | Timeout in ms (default 30000) |
| `autoAbortKey` | string | Cancel previous requests with same key |
| `loadSpec` | LoadSpec | Metadata for tracking |

#### ConfigService
**File**: `ConfigService.ts` | **Access**: `XH.configService` or `XH.getConf()`

Provides access to soft-configuration values from the server. Configs are defined server-side and
must have `clientVisible: true` to be sent to the client.

```typescript
// Get config value with optional default
const timeout = XH.getConf('sessionTimeout', 30);
const features = XH.getConf('enabledFeatures', []);

// Check available keys (no alias - access service directly)
XH.configService.list;
```

**Note:** Configs are loaded once at startup and not auto-refreshed. App refresh required for updates.

#### PrefService
**File**: `PrefService.ts` | **Access**: `XH.prefService` or `XH.getPref()`, `XH.setPref()`

Read and write user-specific preference values persisted on the server.

```typescript
// Get preference with optional default
const pageSize = XH.getPref('gridPageSize', 50);

// Set preference (auto-saved with debounce)
XH.setPref('gridPageSize', 100);

// Immediate save - no alias, access service directly
await XH.prefService.pushAsync('criticalPref', value);
```

Preferences are type-validated against server-defined types: `string`, `int`, `long`, `double`,
`bool`, `json`.

### User & Environment

#### IdentityService
**File**: `IdentityService.ts` | **Access**: `XH.identityService` or `XH.getUser()`

Provides authenticated user information and impersonation support.

```typescript
// Current acting user (apparent user when impersonating)
XH.getUsername();
XH.getUser().email;
XH.getUser().roles;  // string[]

// Actual authenticated user (differs during impersonation) - no alias
XH.identityService.authUsername;
XH.identityService.isImpersonating;

// Impersonation (requires HOIST_IMPERSONATOR role) - no alias
await XH.identityService.impersonateAsync('targetUser');
await XH.identityService.endImpersonateAsync();
```

#### EnvironmentService
**File**: `EnvironmentService.ts` | **Access**: `XH.environmentService` or `XH.getEnv()`

Provides app environment metadata and polls for server version changes.

```typescript
// Environment info - use XH.getEnv() alias
XH.getEnv('appEnvironment');  // 'Production' | 'Development' | 'Staging' | etc.

// Helper methods and observable properties - access service directly
XH.environmentService.isProduction();
XH.environmentService.isTest();
XH.environmentService.serverVersion;  // Polled - can change without app refresh
XH.environmentService.serverBuild;
```

**Version Change Handling:** When server version changes, the service can prompt users to reload
or force an immediate reload based on `xhEnvPollConfig.onVersionChange` setting.

### Activity & Monitoring

#### TrackService
**File**: `TrackService.ts` | **Access**: `XH.trackService` or `XH.track()`

Activity tracking for audit trails and analytics, viewable in the Admin Console.

```typescript
// Simple tracking
XH.track('User exported report');

// Detailed tracking
XH.track({
    message: 'Portfolio loaded',
    category: 'Data',
    data: {portfolioId: 123, recordCount: 5000},
    elapsed: loadTime
});
```

**TrackOptions:**

| Option | Type | Description |
|--------|------|-------------|
| `message` | string | What happened (required) |
| `category` | string | Activity category (e.g., 'Export', 'Grid') |
| `severity` | string | 'DEBUG' \| 'INFO' \| 'WARN' \| 'ERROR' |
| `data` | any | Structured data about activity |
| `elapsed` | number | Operation duration in ms |
| `oncePerSession` | boolean | Only send first occurrence per session |

##### Server-Side Filtering: `xhActivityTrackingConfig`

The client always sends all tracked entries to the server. The server then decides what to persist
based on the `xhActivityTrackingConfig` soft config (editable in the Admin Console). Key properties:

| Property | Default | Description |
|----------|---------|-------------|
| `levels` | `[{username: '*', category: '*', severity: 'INFO'}]` | Rules controlling which entries are persisted |
| `maxDataLength` | `2000` | Max chars of JSON data per entry; oversized data is dropped with a warning |
| `logData` | `false` | Whether to log primitive data values server-side |
| `clientHealthReport` | `{intervalMins: -1}` | Config for periodic health report submissions; `-1` disables |
| `maxRows` | `{default: 10000, options: [...]}` | Row limits for the Admin Console activity viewer |

The `levels` array is the most important setting. Each rule specifies a `username`, `category`, and
`severity` — entries matching a rule at or above its severity are persisted. The default config drops
all `DEBUG` entries. To enable them:

```json
{
    "levels": [
        {"username": "*", "category": "*", "severity": "DEBUG"}
    ],
    "maxDataLength": 2000,
    "logData": false,
    "clientHealthReport": {"intervalMins": -1}
}
```

Rules can also target specific users or categories:

```json
{
    "levels": [
        {"username": "jsmith", "category": "*", "severity": "DEBUG"},
        {"username": "*", "category": "Data", "severity": "DEBUG"}
    ]
}
```

Rules are evaluated in order — the first match wins. Entries that don't match any rule default to an
INFO threshold, so the example above enables DEBUG+ persistence for user `jsmith` and the `Data`
category while all other entries continue to require INFO or above.

#### ClientHealthService
**File**: `ClientHealthService.ts` | **Access**: `XH.clientHealthService`

Gathers and reports client health metrics (memory, connection, WebSocket status).

```typescript
// Get current health snapshot
const report = XH.clientHealthService.getReport();
// {general: {...}, memory: {...}, connection: {...}, webSockets: {...}}

// Register custom data source for health reports
XH.clientHealthService.addSource('myFeature', () => ({
    activeCount: myModel.activeItems.length,
    cacheSize: myModel.cache.size
}));
```

#### InspectorService
**File**: `InspectorService.ts` | **Access**: `XH.inspectorService`

Developer tool for monitoring HoistModel, HoistService, and Store instances at runtime.

```typescript
// Toggle Inspector UI
XH.inspectorService.toggleActive();

// View active instances
XH.inspectorService.activeInstances;  // InspectorInstanceData[]
```

### Communication

#### WebSocketService
**File**: `WebSocketService.ts` | **Access**: `XH.webSocketService`

Maintains bidirectional WebSocket connection for server-push messaging.

```typescript
// Subscribe to topic
const subscription = XH.webSocketService.subscribe('priceUpdates', (message) => {
    console.log('Price update:', message.data);
});

// Clean up when done
subscription.destroy();
// Or save to @managed property for auto-cleanup on model destroy

// Send message to server
XH.webSocketService.sendMessage({topic: 'clientEvent', data: {action: 'click'}});

// Check connection status
XH.webSocketService.connected;
XH.webSocketService.channelKey;  // Unique channel assigned by server
```

**Built-in Topics:**
- `xhHeartbeat` - Connection health monitoring
- `xhRegistrationSuccess` - Server registration response
- `xhForceAppSuspend` - Server-initiated app suspension
- `xhRequestClientHealthReport` - Server requests health snapshot

#### AlertBannerService
**File**: `AlertBannerService.ts` | **Access**: `XH.alertBannerService`

Displays app-wide alert banners configured via the Admin Console. Automatically polls for updates
via `EnvironmentService`.

### Grid Support

#### GridExportService
**File**: `GridExportService.ts` | **Access**: `XH.gridExportService`

Exports grid data to Excel or CSV format.

```typescript
await XH.gridExportService.exportAsync(gridModel, {
    filename: 'users-export',
    type: 'excel',           // 'excel' | 'excelTable' | 'csv'
    columns: 'VISIBLE'       // 'VISIBLE' | 'ALL' | string[]
});
```

**Features:**
- Server-side export via multipart streaming
- Per-cell Excel formatting via column `excelFormat` property
- Respects tree hierarchy and grouped rows
- Custom export values via column `exportValue` property

#### GridAutosizeService
**File**: `GridAutosizeService.ts` | **Access**: `XH.gridAutosizeService`

Calculates optimal column widths based on content (more sophisticated than native ag-Grid).

```typescript
await XH.gridAutosizeService.autosizeAsync(gridModel, ['name', 'status'], {
    fillMode: 'right',  // 'none' | 'all' | 'left' | 'right'
    includeCollapsedChildren: false
});
```

### Persistence

#### JsonBlobService
**File**: `JsonBlobService.ts` | **Access**: `XH.jsonBlobService`

Persists small unstructured JSON objects to the database.

```typescript
// Create blob
const blob = await XH.jsonBlobService.createAsync({
    type: 'savedFilter',
    name: 'My Filter',
    value: {field: 'status', op: '=', value: 'active'}
});

// Retrieve by token
const blob = await XH.jsonBlobService.getAsync(token);

// List by type
const filters = await XH.jsonBlobService.listAsync({type: 'savedFilter'});

// Update
await XH.jsonBlobService.updateAsync(token, {value: newFilterValue});

// Soft delete
await XH.jsonBlobService.archiveAsync(token);
```

**Use Case:** Lightweight persistence for saved filters, UI layouts, sketches - data that doesn't
warrant full domain objects.

#### LocalStorageService / SessionStorageService
**Files**: `storage/LocalStorageService.ts`, `storage/SessionStorageService.ts`

Simple key/value access to browser storage, auto-namespaced by app and user.

```typescript
// Local storage (persists across sessions)
XH.localStorageService.set('lastTab', 'portfolio');
XH.localStorageService.get('lastTab', 'overview');

// Session storage (cleared when tab closes)
XH.sessionStorageService.set('tempState', {step: 2});
```

### App Lifecycle

#### IdleService
**File**: `IdleService.ts` | **Access**: `XH.idleService`

Suspends the application after a period of inactivity to reduce server load.

**Configuration** (via `xhIdleConfig` soft config):
- `timeout` - Global timeout in minutes
- `appTimeouts` - Per-app timeout overrides

#### AutoRefreshService
**File**: `AutoRefreshService.ts` | **Access**: `XH.autoRefreshService`

Triggers automatic app-wide refresh at configurable intervals.

```typescript
XH.autoRefreshService.enabled;   // Current state (config + user preference)
XH.autoRefreshService.interval;  // Interval in seconds
```

**Configuration:**
- `xhAutoRefreshIntervals` soft config - Interval per app
- `xhAutoRefreshEnabled` user preference - User opt-in/out

#### ChangelogService
**File**: `ChangelogService.ts` | **Access**: `XH.changelogService`

Displays application changelog/release notes to users.

```typescript
XH.changelogService.versions;              // Parsed changelog entries
XH.changelogService.currentVersionIsUnread; // Has user seen current version?
XH.changelogService.markLatestAsRead();
```

## Configuration Keys Reference

Services are configured via soft configs (managed in Admin Console):

| Key | Service | Purpose |
|-----|---------|---------|
| `xhAutoRefreshIntervals` | AutoRefreshService | Refresh interval per app (seconds) |
| `xhChangelogConfig` | ChangelogService | Changelog display options |
| `xhIdleConfig` | IdleService | Idle timeout configuration |
| `xhInspectorConfig` | InspectorService | Inspector visibility/role restrictions |
| `xhExportConfig` | GridExportService | Export thresholds for UI feedback |
| `xhActivityTrackingConfig` | TrackService | Severity-level filtering, data limits, health report interval |
| `xhEnableImpersonation` | IdentityService | Enable/disable impersonation |
| `xhEnvPollConfig` | EnvironmentService | Poll interval and version change behavior |

## User Preference Keys Reference

| Key | Service | Purpose |
|-----|---------|---------|
| `xhAutoRefreshEnabled` | AutoRefreshService | User's auto-refresh preference |
| `xhLastReadChangelog` | ChangelogService | Track latest read version |
| `xhIdleDetectionDisabled` | IdleService | Disable idle suspension for user |

## Creating Custom Services

See `/core/README.md` for the full guide on creating services. Quick example:

```typescript
import {HoistService, XH} from '@xh/hoist/core';
import {makeObservable, observable} from '@xh/hoist/mobx';

export class PortfolioService extends HoistService {
    @observable.ref portfolios: Portfolio[] = [];

    constructor() {
        super();
        makeObservable(this);
    }

    // Called during app startup
    override async initAsync() {
        await this.loadPortfoliosAsync();
    }

    async loadPortfoliosAsync() {
        const data = await XH.fetchJson({url: 'api/portfolios'});
        runInAction(() => this.portfolios = data);
    }

    getPortfolio(id: string): Portfolio {
        return this.portfolios.find(p => p.id === id);
    }
}

// Install in AppModel.initAsync()
await XH.installServicesAsync(PortfolioService);

// Access anywhere
XH.portfolioService.getPortfolio('abc123');
```

## Common Patterns

### Using FetchService in doLoadAsync

Always pass `loadSpec` to fetch calls for consistent tracking:

```typescript
override async doLoadAsync(loadSpec: LoadSpec) {
    const data = await XH.fetchJson({url: 'api/data', loadSpec});
    runInAction(() => this.data = data);
}
```

### Activity Tracking with Fetch Requests

FetchService integrates with TrackService via the `track` option. This records the request
(with timing) in the activity log, viewable in the Admin Console.

```typescript
// Simple form - just a message
const data = await XH.fetchJson({
    url: 'api/portfolios',
    track: 'Loaded portfolios'
});

// Full form - with category and additional data
const report = await XH.fetchJson({
    url: 'api/reports/generate',
    params: {reportId, format},
    track: {
        message: 'Generated report',
        category: 'Reporting',
        data: {reportId, format}
    }
});
```

The `track` option automatically captures:
- Elapsed time for the request
- Correlation ID (if enabled on the request)
- LoadSpec metadata (if provided)

### Activity Tracking with Promise.track()

For operations that aren't fetch requests, use the `Promise.track()` extension to record
activity with timing. This is implemented in `/promise/` and delegates to TrackService.

```typescript
// Track any async operation
await this.processDataAsync(records)
    .track('Processed records');

// With full options
await this.runExpensiveCalculationAsync()
    .track({
        message: 'Ran portfolio calculation',
        category: 'Calculation',
        data: {portfolioCount: portfolios.length}
    });
```

`Promise.track()` automatically:
- Records the start time when the promise begins
- Calculates elapsed time when the promise settles
- Sets severity to 'ERROR' if the promise rejects (and re-throws the error)
- Skips tracking for "routine" exceptions (e.g., user cancellations)

This is useful for tracking operations like local data processing, complex calculations,
or coordinated multi-step workflows where you want timing visibility without a fetch request.

### Debounced Search with Auto-Abort

```typescript
@bindable searchQuery = '';

constructor() {
    super();
    makeObservable(this);
    this.addReaction({
        track: () => this.searchQuery,
        run: () => this.searchAsync(),
        debounce: 300
    });
}

async searchAsync() {
    if (!this.searchQuery) {
        runInAction(() => this.results = []);
        return;
    }

    try {
        const results = await XH.fetchJson({
            url: 'api/search',
            params: {q: this.searchQuery},
            autoAbortKey: 'search'  // Cancels previous search if still pending
        });
        runInAction(() => this.results = results);
    } catch (e) {
        // Silently swallow aborted requests - a newer search has taken over
        if (e.isFetchAborted) return;
        XH.handleException(e);
    }
}
```

### WebSocket Subscriptions with Managed Cleanup

```typescript
class PriceModel extends HoistModel {
    @managed priceSubscription: WebSocketSubscription;

    override onLinked() {
        this.priceSubscription = XH.webSocketService.subscribe(
            'priceUpdates',
            (msg) => this.handlePriceUpdate(msg.data)
        );
    }

    // Subscription auto-destroyed when model destroyed via @managed
}
```

### Checking Feature Configs

```typescript
class MyModel extends HoistModel {
    get showAdvancedFeatures(): boolean {
        return XH.getConf('advancedFeaturesEnabled', false);
    }

    get maxExportRows(): number {
        return XH.getConf('exportConfig', {}).maxRows ?? 10000;
    }
}
```

## Common Pitfalls

### Not Handling Fetch Errors

`XH.fetchJson()` throws on HTTP errors. Handle exceptions appropriately:

```typescript
// ❌ Wrong: Unhandled exception crashes the app
const data = await XH.fetchJson({url: 'api/data'});

// ✅ Correct: Handle in doLoadAsync with proper error handling
override async doLoadAsync(loadSpec: LoadSpec) {
    try {
        const data = await XH.fetchJson({url: 'api/data', loadSpec});
        runInAction(() => this.data = data);
    } catch (e) {
        if (loadSpec.isStale || loadSpec.isAutoRefresh) return;
        runInAction(() => this.data = []);
        XH.handleException(e, {alertType: 'toast'});
    }
}
```

### Using Native `fetch` Instead of FetchService

Hoist apps should use `FetchService` (via `XH.fetch()`, `XH.fetchJson()`, `XH.postJson()`) rather
than the browser's native `fetch` API. FetchService provides automatic correlation IDs, configurable
timeouts, request deduplication via `autoAbortKey`, integrated activity tracking, rich exception
handling with server-side details, and `loadSpec` support for stale request management. Bypassing
it means losing all of these benefits.

```typescript
// ❌ Wrong: Native fetch bypasses all FetchService enhancements
const response = await fetch('/api/data');
const data = await response.json();

// ✅ Correct: Use FetchService via XH convenience methods
const data = await XH.fetchJson({url: 'api/data'});
```

### Forgetting loadSpec in Fetch Calls

Without `loadSpec`, requests aren't tracked and can't be cancelled when loads become stale:

```typescript
// ❌ Missing loadSpec
override async doLoadAsync(loadSpec: LoadSpec) {
    const data = await XH.fetchJson({url: 'api/data'});  // No tracking
}

// ✅ Include loadSpec
override async doLoadAsync(loadSpec: LoadSpec) {
    const data = await XH.fetchJson({url: 'api/data', loadSpec});
}
```

### Using Configs for User-Specific Values

Configs are app-wide; use preferences for user-specific settings:

```typescript
// ❌ Wrong: Configs are shared across all users
XH.getConf('userTheme');

// ✅ Correct: Preferences are per-user
XH.getPref('userTheme');
```

### Not Cleaning Up WebSocket Subscriptions

Subscriptions persist until explicitly destroyed:

```typescript
// ❌ Wrong: Subscription leaks when model is destroyed
const sub = XH.webSocketService.subscribe('updates', handler);

// ✅ Correct: Use @managed for automatic cleanup
@managed subscription = XH.webSocketService.subscribe('updates', handler);

// ✅ Also correct: Manual cleanup in destroy()
override destroy() {
    this.subscription?.destroy();
    super.destroy();
}
```

### Putting UI Code in Services

Services should focus on data operations - fetching, sending, transforming, storing, and processing
data. Avoid importing components or rendering UI from services.

```typescript
// ❌ Wrong: Service imports and renders components
import {tradeConfirmationDialog} from '../desktop/cmp/trade/TradeConfirmationDialog';

class TradeService extends HoistService {
    async submitTradeAsync(trade: Trade) {
        const confirmed = await tradeConfirmationDialog({trade});  // Tight coupling to desktop
        if (confirmed) await XH.postJson({...});
    }
}

// ✅ Correct: Service handles data, caller handles UI
class TradeService extends HoistService {
    async submitTradeAsync(trade: Trade) {
        return XH.postJson({url: 'api/trades', body: trade});
    }
}

// In a Model or Component - UI concerns stay here
async onSubmitClick() {
    const confirmed = await XH.confirm({message: 'Submit this trade?'});
    if (confirmed) {
        await XH.tradeService.submitTradeAsync(this.trade);
        XH.successToast('Trade submitted');
    }
}
```

**Why this matters:**
- Services may be shared between desktop and mobile apps - component imports create platform
  dependencies
- Keeps services focused and testable
- Makes refactoring easier - UI changes don't require service changes
- Cross-platform alerts like `XH.confirm()`, `XH.toast()`, and `XH.alert()` are acceptable since
  they're provided by Hoist and work across platforms

## Related Packages

- [`/core/`](../core/README.md) - `HoistService` base class, `XH` singleton
- [`/cmp/`](../cmp/README.md) - Components that use services (Grid export button, etc.)
- `/admin/` - Admin Console for managing configs, prefs, and viewing activity
