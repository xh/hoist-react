# ViewManager Package

## Overview

The `/cmp/viewmanager/` package provides a system for saving, loading, and managing named bundles
of component state. This enables users to create, share, and switch between different configurations
of complex UI components like grids, dashboards, or filter sets.

**Key features:**
- Save and restore component state as named "views"
- Support for private, shared, and global views
- Auto-save capability for owned views
- Pinned views for quick access
- Persistence via JsonBlob backend storage

The cross-platform `ViewManagerModel` lives here in `/cmp/` with the intent of supporting both
desktop and mobile UI components. Currently, only the desktop implementation exists
(`/desktop/cmp/viewmanager/`), which renders the controls for selecting, saving, and managing views.

## Architecture

```
ViewManagerModel
├── type: string                  # Discriminator for view type (e.g., 'portfolioGridView')
├── view: View                    # Currently active view
├── views: ViewInfo[]             # Available saved views
├── autoSave: boolean             # User's auto-save preference
├── userPinned: Record            # User's pin preferences
└── Methods:
    ├── selectViewAsync()         # Switch to a view
    ├── saveAsync()               # Save pending changes
    ├── saveAsAsync()             # Create new view
    ├── resetAsync()              # Discard pending changes
    └── deleteViewsAsync()        # Remove views

View
├── info: ViewInfo               # Metadata (null for default)
├── value: Partial<T>            # Persisted component state
├── name, group, description     # Display properties
├── isDefault, isGlobal, isShared, isOwned
└── token: string                # Unique identifier

ViewInfo
├── token, type, name            # Identity
├── owner, isShared, isGlobal    # Ownership/visibility
├── dateCreated, lastUpdated     # Timestamps
└── isPinned, isUserPinned       # Quick-access state
```

## ViewManagerModel

The central model for managing views.

### Creating a ViewManagerModel

ViewManagerModels are created via an async factory (`createAsync`) that loads available views from
the server before returning. Create all VMMs your app needs within `AppModel.initAsync()` - this
ensures they have loaded their available state as early as possible, so the first components and
models that are constructed can be initialized correctly with the persisted state they need.

For apps with multiple VMMs, consider delegating creation to a dedicated method or even an
app-level service to keep `initAsync()` organized.

```typescript
import {ViewManagerModel} from '@xh/hoist/cmp/viewmanager';

class AppModel extends HoistAppModel {
    @managed portfolioGridViewManager: ViewManagerModel;

    override async initAsync() {
        this.portfolioGridViewManager = await ViewManagerModel.createAsync({
            type: 'portfolioGridView',
            typeDisplayName: 'view',
            enableGlobal: true,
            enableSharing: true
        });
    }
}
```

Use specific property names to store references to the created models. Generally match the `type` -
avoid overly generic names like `viewManager`. Apps commonly have multiple VMMs for different parts of the UI, and clear naming keeps them distinct.

### Configuration

| Property | Type | Description |
|----------|------|-------------|
| `type` | `string` | Unique discriminator for this class of views (required) |
| `typeDisplayName` | `string` | User-facing name (e.g., "view", "dashboard"). Defaults to `type`. |
| `instance` | `string` | For multiple managers of same type in one app |
| `enableDefault` | `boolean` | Allow selecting in-code default state |
| `enableAutoSave` | `boolean` | Allow auto-save for owned views |
| `enableGlobal` | `boolean` | Enable global (admin-managed) views |
| `enableSharing` | `boolean` | Allow sharing personal views |
| `manageGlobal` | `boolean` | Can user create/edit global views? (default false) |
| `preserveUnsavedChanges` | `boolean` | Preserve pending changes across refresh |
| `defaultDisplayName` | `string` | Label for in-code default option |
| `globalDisplayName` | `string` | Label for global views |
| `initialViewSpec` | `(views) => ViewInfo` | Function to select initial view |

### Binding Components

Components connect to ViewManagerModel via their `persistWith` config:

```typescript
class PortfolioGridModel extends HoistModel {
    @managed gridModel: GridModel;

    constructor() {
        super();
        this.gridModel = new GridModel({
            columns: [...],
            persistWith: {
                viewManagerModel: XH.appModel.portfolioGridViewManager,
                path: 'gridState'
            }
        });
    }
}
```

Multiple components can bind to the same ViewManagerModel. Hoist components that support
`persistWith` use a preconfigured default path, so you only need to set `path` explicitly when
persisting multiple instances of the same type of model within a single VMM:

```typescript
const vmModel = XH.appModel.portfolioGridViewManager;

// Different model types use their own default paths ('grid', 'filterChooser', etc.)
this.gridModel = new GridModel({
    persistWith: {viewManagerModel: vmModel}           // path defaults to 'grid'
});
this.filterChooserModel = new FilterChooserModel({
    persistWith: {viewManagerModel: vmModel}           // path defaults to 'filterChooser'
});

// Two grids in the same view - need explicit paths to distinguish
this.portfolioGridModel = new GridModel({
    persistWith: {viewManagerModel: vmModel, path: 'portfolioGrid'}
});
this.ordersGridModel = new GridModel({
    persistWith: {viewManagerModel: vmModel, path: 'ordersGrid'}
});
```

### Working with Views

Most applications interact with ViewManagerModel indirectly - via `persistWith` bindings and the
built-in ViewManager UI component. The API below is available for building custom extensions or
programmatic view management, but is not commonly needed.

```typescript
const vmModel = XH.appModel.portfolioGridViewManager;

// Get current view
vmModel.view;           // View instance
vmModel.view.name;      // "My Portfolio View"
vmModel.view.isOwned;   // true

// Check for pending changes
vmModel.isValueDirty;   // Has unsaved changes?
vmModel.isViewSavable;  // Can current view be saved?

// Switch views
await vmModel.selectViewAsync('tokenXYZ');
await vmModel.selectViewAsync(viewInfo);

// Save current changes
await vmModel.saveAsync();

// Create new view
await vmModel.saveAsAsync({
    name: 'My New View',
    description: 'Custom grid layout',
    group: 'Reports',
    isShared: false,
    isGlobal: false,
    value: vmModel.getValue()
});

// Discard pending changes
await vmModel.resetAsync();

// Delete views
await vmModel.deleteViewsAsync([viewInfo1, viewInfo2]);
```

### Sharing and Visibility

Views support three ownership/visibility levels. Any or all of the sharing modes can be disabled
via configuration.

**Private views** (`isOwned: true, isShared: false`) - Owned by a user, visible only to them.
This is the default when a user creates a new view.

**Shared views** (`isOwned: true, isShared: true`) - Owned by a user who has opted to make them
discoverable by other users. Other users can find and select shared views via the management
dialog, but shared views do not appear on other users' menus by default - users must explicitly
pin them for quick access. Only the owner can edit a shared view. Requires `enableSharing: true`.

**Global views** (`isGlobal: true, owner: null`) - Not owned by any user and visible to all.
Global views are typically curated by administrators and represent canonical/standard
configurations. They appear pinned on all users' menus by default (users can unpin them).
Only users with `manageGlobal: true` can create or edit global views - apps typically gate
this on a role. Requires `enableGlobal: true`.

```typescript
const vmModel = await ViewManagerModel.createAsync({
    type: 'portfolioGridView',
    enableGlobal: true,
    enableSharing: true,
    manageGlobal: () => XH.getUser().hasRole('MANAGE_GRID_VIEWS'),
    globalDisplayName: 'Acme Corp'  // Customizable label (default "global")
});

// Access views by category
vmModel.ownedViews;     // Views owned by current user
vmModel.sharedViews;    // Views shared *with* current user (not owned by them)
vmModel.globalViews;    // Global views
vmModel.pinnedViews;    // All views in user's pinned list
vmModel.views;          // All available views
```

### Pinning

Pinning controls which views appear directly in the ViewManager menu for quick access. Views
that are not pinned can still be selected via the management dialog.

Default pinning behavior depends on the view type:
- **Global views** - pinned by default for all users
- **Owned views** - pinned by default for the owner
- **Shared views** (from other users) - *not* pinned by default, must be explicitly pinned

Users can override the default pinning for any view:

```typescript
// Pin/unpin a view
vmModel.userPin(viewInfo);
vmModel.userUnpin(viewInfo);

// Check pin state
viewInfo.isPinned;       // Effective pinned state (user preference or default)
viewInfo.isUserPinned;   // User's explicit preference, or null if using default
```

### Auto-Save

When enabled, changes to owned views are automatically saved after a debounce period:

```typescript
// User preference for auto-save (opt-in per user)
vmModel.autoSave;           // boolean
vmModel.autoSave = true;

// Check if current view can be auto-saved
vmModel.isViewAutoSavable;  // Owned + autoSave enabled + not impersonating
vmModel.autoSaveUnavailableReason;  // Explanation if not available
```

Auto-save only applies to the user's own views - global and shared views from other users
cannot be auto-saved.

### TaskObservers

For masking UI during view operations:

```typescript
// Link to mask during view switches
mask({bind: vmModel.selectTask})

// Link to mask during saves
mask({bind: vmModel.saveTask})

// Check any loading state
vmModel.isLoading;
```

## View

A named bundle of persisted state.

### View Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Display name |
| `description` | `string` | Optional description |
| `group` | `string` | Optional grouping category |
| `token` | `string` | Unique identifier (null for default) |
| `value` | `Partial<T>` | Persisted component state |
| `isDefault` | `boolean` | Is this the in-code default? |
| `isOwned` | `boolean` | Owned by current user? |
| `isShared` | `boolean` | Shared with other users? |
| `isGlobal` | `boolean` | Global (admin-managed)? |
| `lastUpdated` | `number` | Last update timestamp |

### Default View

The "default" view is a special view that represents the in-code initial state of all bound
components. Unlike saved views, it is not persisted as data anywhere - it is derived from the
code-defined defaults of the bound models (e.g., a GridModel's initial column configuration).
It has no `token` and no `info`.

The default view is enabled via `enableDefault: true` (the default) and appears as an option in
the ViewManager menu, labeled with `defaultDisplayName` (default "Default") + `typeDisplayName`.

```typescript
vmModel.view.isDefault;  // true when on the in-code default
vmModel.view.token;      // null for the default view
```

**Disabling the default view** (`enableDefault: false`) is useful when you want all users to
always work from a saved view definition. This means the default view configuration can be
updated by saving a new version - no software release is required. When the default view is
disabled, you **must** provide an `initialViewSpec` function, and at least one global view
should exist to provide an initial selection for new users:

```typescript
const vmModel = await ViewManagerModel.createAsync({
    type: 'portfolioGridView',
    enableDefault: false,
    initialViewSpec: views => {
        return views.find(v => v.isGlobal && v.name === 'Standard') ??
               views.find(v => v.isGlobal) ??
               views[0];
    }
});
```

## ViewInfo

Metadata about a saved view (excluding the actual value).

### ViewInfo Properties

| Property | Type | Description |
|----------|------|-------------|
| `token` | `string` | Unique identifier |
| `type` | `string` | View type discriminator |
| `name` | `string` | Display name |
| `description` | `string` | Optional description |
| `owner` | `string` | Username of owner (null for global) |
| `group` | `string` | Optional grouping category |
| `isGlobal` | `boolean` | Global (no owner)? |
| `isShared` | `boolean` | Shared by owner? |
| `isOwned` | `boolean` | Owned by current user? |
| `isEditable` | `boolean` | Can current user edit? |
| `isPinned` | `boolean` | In user's pinned list? |
| `dateCreated` | `number` | Creation timestamp |
| `lastUpdated` | `number` | Last update timestamp |
| `lastUpdatedBy` | `string` | Username of last updater |

## Common Patterns

### Initialize in AppModel

```typescript
class AppModel extends HoistAppModel {
    @managed portfolioGridViewManager: ViewManagerModel;
    @managed portfolioDashViewManager: ViewManagerModel;

    override async initAsync() {
        // Initialize all view managers during app startup
        [this.portfolioGridViewManager, this.portfolioDashViewManager] = await Promise.all([
            ViewManagerModel.createAsync({
                type: 'portfolioGridView',
                manageGlobal: () => XH.getUser().hasRole('MANAGE_GRID_VIEWS'),
            }),
            ViewManagerModel.createAsync({
                type: 'portfolioDashboard',
                typeDisplayName: 'dashboard',
                enableSharing: false,
                manageGlobal: () => XH.getUser().hasRole('MANAGE_DASHBOARDS')
            })
        ]);
    }
}
```

### Bind Grid State

```typescript
class PortfolioGridModel extends HoistModel {
    @managed gridModel: GridModel;

    constructor() {
        super();
        this.gridModel = new GridModel({
            columns: [...],
            sortBy: 'symbol',
            persistWith: {
                viewManagerModel: XH.appModel.portfolioGridViewManager,
                path: 'grid',
                persistSort: true,
                persistGrouping: true,
                persistFilter: true,
                persistColumns: {hidden: true, width: true, order: true}
            }
        });
    }
}
```

### React to View Changes

```typescript
class MyModelClass extends HoistModel {
    @computed
    get showGlobalViewBanner(): boolean {
        return this.portfolioGridViewManager.view?.isGlobal;
    }
}
```

## Related Packages

- `/core/` - PersistenceProvider, ViewManagerProvider interfaces
- `/svc/JsonBlobService` - Backend storage for views
- `/desktop/cmp/viewmanager/` - Desktop ViewManager UI component
