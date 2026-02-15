# Authorization

> **Status: DRAFT** — This document is awaiting review by the XH team. Content may be incomplete or inaccurate.

Hoist provides a role-based authorization system for controlling what users can do within an
application. Roles are managed via a database-backed system with a full Admin Console editor,
supporting role inheritance and directory group integration. A lightweight "gates" feature,
driven by soft configs, offers a complementary mechanism for quick feature gating without defining
formal roles. Together, these tools give teams a flexible, layered approach to authorization that
works for everything from coarse app-level access checks to fine-grained feature visibility.

This doc focuses on the client-side perspective — how applications check roles and gates, gate
features, and integrate with the Admin Console. The underlying server-side role management
(hoist-core) is covered where relevant but not exhaustively documented here.

For *authentication* (how users prove who they are), see [Authentication](./authentication.md).
Authorization picks up where authentication leaves off: once the user's identity is established
and their roles loaded, authorization determines what they can access.

## Roles

### How Roles Work

Roles are string identifiers (e.g. `APP_USER`, `TRADE_EXECUTOR`, `MANAGE_REPORTS`) assigned to
users via the Hoist Admin Console. When a user authenticates, the server resolves their complete
set of effective roles — including any inherited through role-to-role assignments — and delivers
them to the client as part of the user's `IdentityInfo`. The client-side `HoistUser` object then
exposes these roles for checking throughout the application.

The core API for role checking is straightforward:

```typescript
const user = XH.getUser();

// Check a single role
if (user.hasRole('TRADE_EXECUTOR')) {
    await this.executeTrade(trade);
}

// Check multiple roles with boolean logic
const canManage = user.hasRole('MANAGE_REPORTS') || user.isHoistAdmin;
```

### The HoistUser Interface

`HoistUser` is the client-side representation of the authenticated user, created by
`HoistAuthModel.createUser()` during authentication. It provides the following role-related
properties and methods:

| Property / Method | Type | Description |
|---|---|---|
| `roles` | `string[]` | All effective roles for the user (includes inherited roles) |
| `hasRole(role)` | `(string) => boolean` | Returns `true` if the user has the specified role |
| `isHoistAdmin` | `boolean` | Convenience flag — equivalent to `hasRole('HOIST_ADMIN')` |
| `isHoistAdminReader` | `boolean` | Convenience flag — equivalent to `hasRole('HOIST_ADMIN_READER')` |
| `isHoistRoleManager` | `boolean` | Convenience flag — equivalent to `hasRole('HOIST_ROLE_MANAGER')` |
| `hasGate(gate)` | `(string) => boolean` | Check a config-driven access gate (see [Gates](#gates)) |

`hasRole()` performs a simple array inclusion check — the role string must match exactly
(case-sensitive). There is no wildcard or pattern matching.

### Built-in Hoist Roles

Hoist defines several built-in roles that control access to framework-level features:

| Role | Purpose |
|------|---------|
| `HOIST_ADMIN` | Full Admin Console access. Required for editing configs, preferences, alert banners, and other admin operations. |
| `HOIST_ADMIN_READER` | Read-only Admin Console access. This is the default `checkAccess` role for the admin app — users with this role can view admin data but cannot make changes. Also controls visibility of the "Admin" menu item in `AppMenuButton`. |
| `HOIST_ROLE_MANAGER` | Permission to create, edit, and delete roles in the Admin Console's role management UI. Users without this role see the role list as read-only. |
| `HOIST_IMPERSONATOR` | Permission to impersonate other users (also requires the `xhEnableImpersonation` config to be `true`). See [Authentication — Impersonation](./authentication.md#impersonation). |

These roles are used by the framework itself. Applications should define their own roles for
business-level authorization (see [Best Practices](#best-practices-for-role-naming) below).

### App-Level Access Control via `checkAccess`

Every Hoist application must specify a `checkAccess` config in its `AppSpec`. This determines
whether the authenticated user is allowed to use the application at all. It runs after
`IdentityService` has loaded the user's identity and roles, between the `AUTHENTICATING` and
`INITIALIZING_HOIST` phases.

`checkAccess` can be:

**A role string** — the simplest form. The user must have this role to access the app:

```typescript
XH.renderApp({
    componentClass: AppComponent,
    modelClass: AppModel,
    containerClass: AppContainer,
    isMobileApp: false,
    checkAccess: 'APP_USER'
});
```

**A function** — for more complex access logic. Receives the `HoistUser` and returns a boolean
or an object with a custom denial message:

```typescript
XH.renderApp({
    // ...
    checkAccess: (user) => {
        if (user.hasRole('APP_USER') || user.isHoistAdmin) return true;
        return {
            hasAccess: false,
            message: 'Please contact your administrator to request access.'
        };
    }
});
```

If access is denied, the app transitions to `ACCESS_DENIED` and displays a lockout panel. The
default message reads `User needs the role "ROLE_NAME" to access this application.` when using
the string form. Customize via `AppSpec.lockoutMessage` or `AppSpec.lockoutPanel` for a fully
custom component.

The built-in Admin Console uses `checkAccess: 'HOIST_ADMIN_READER'` by default, configured via
`XH.renderAdminApp()`.

### Role Management in the Admin Console

Hoist's Admin Console provides a full-featured role management UI under the **User Data > Roles**
tab. This is an opt-in feature — the role module must be enabled server-side (via hoist-core
configuration). When enabled, roles are stored in the application's database and managed entirely
through the Admin Console.

#### Role Structure

Each role has the following properties:

| Property | Description |
|----------|-------------|
| `name` | Unique identifier, typically `UPPER_SNAKE_CASE` (e.g. `EDIT_INVOICES`) |
| `category` | Optional grouping label for organizing roles in the UI (supports nested categories with `\` separator, e.g. `Reports\Admin`) |
| `notes` | Free-text description of the role's purpose |
| `members` | Direct assignments — users, directory groups, and/or other roles |

#### Member Types

Roles can be assigned members of three types:

| Type | Description |
|------|-------------|
| **Users** | Individual usernames directly assigned to the role |
| **Directory Groups** | External directory groups (e.g. Active Directory / LDAP groups) whose members automatically receive the role. Availability depends on server-side configuration. |
| **Roles** | Other roles whose members *inherit* this role. This is how role inheritance works — if role `ADMIN` is assigned as a member of role `VIEW_REPORTS`, then all users with `ADMIN` also effectively have `VIEW_REPORTS`. |

#### Role Inheritance

Role-to-role assignment creates an inheritance hierarchy. When role A includes role B as a member,
all users who have role B also receive role A. This is resolved server-side — the client receives
the fully expanded set of effective roles for the user.

The Admin Console's role detail panel shows both direct and inherited (effective) members:

- **Users tab** — All effective users, with their source (direct assignment, directory group, or
  inherited from another role)
- **Dir. Groups tab** — All effective directory groups (when directory group support is enabled)
- **Granted To tab** — Roles that grant this role to their members (i.e., roles that include
  this role as a member)
- **Inheriting From tab** — Roles that this role inherits from (i.e., roles assigned as members
  of this role)

A visual **role graph** is also provided, showing the inheritance tree for the selected role.

#### Required Permissions

- **Viewing roles:** Requires `HOIST_ADMIN_READER` (read-only Admin Console access)
- **Managing roles:** Requires `HOIST_ROLE_MANAGER` (creating, editing, deleting roles and
  their assignments)

Users without `HOIST_ROLE_MANAGER` see the role management UI in read-only mode — they can
browse roles and view members but cannot make changes.

## Checking Roles in Application Code

### Guarding Entire Features

The most common pattern is using roles to control visibility of tabs, menu items, dashboard
widgets, and other top-level features:

```typescript
class AppModel extends HoistAppModel {
    override async initAsync() {
        await XH.installServicesAsync(PortfolioService, ReportService);
    }

    get tabs(): TabConfig[] {
        return [
            {id: 'portfolio', content: portfolioPanel},
            {id: 'reports', content: reportsPanel, omit: !XH.getUser().hasRole('VIEW_REPORTS')},
            {id: 'admin', content: adminPanel, omit: !XH.getUser().hasRole('APP_ADMIN')}
        ];
    }
}
```

### Guarding Actions and Operations

Roles can control which operations are available to a user — hiding buttons, disabling menu
items, or short-circuiting service calls:

```typescript
class ReportModel extends HoistModel {
    get canExport(): boolean {
        return XH.getUser().hasRole('EXPORT_DATA');
    }

    get canManageGlobalViews(): boolean {
        return XH.getUser().hasRole('MANAGE_VIEWS');
    }

    async deleteReportAsync(report: Report) {
        if (!XH.getUser().hasRole('DELETE_REPORTS')) {
            throw XH.exception('Insufficient permissions to delete reports.');
        }
        await XH.postJson({url: 'api/reports/delete', body: {id: report.id}});
    }
}
```

### Using a Typed Role Helper

For applications with a well-defined set of roles, a typed helper function improves safety and
discoverability:

```typescript
// core/Roles.ts
import {XH} from '@xh/hoist/core';

export type AppRole =
    | 'APP_USER'
    | 'VIEW_REPORTS'
    | 'EDIT_REPORTS'
    | 'EXPORT_DATA'
    | 'APP_ADMIN';

export function hasRole(role: AppRole): boolean {
    return XH.getUser().hasRole(role);
}
```

This gives IDE autocompletion and compile-time checking for role names, preventing typos that
would silently fail at runtime:

```typescript
import {hasRole} from '../core/Roles';

// Compile-time error if 'VIEW_REPOTS' is a typo
const canViewReports = hasRole('VIEW_REPORTS');
```

### Controlling Grid Columns

Roles can determine which columns appear in a grid, hiding sensitive data from users who should
not see it:

```typescript
const gridModel = new GridModel({
    columns: [
        {field: 'name'},
        {field: 'revenue', omit: () => !hasRole('VIEW_FINANCIAL_DATA')},
        {field: 'costBasis', omit: () => !hasRole('VIEW_FINANCIAL_DATA')},
        {field: 'internalNotes', omit: () => !hasRole('VIEW_INTERNAL_DATA')}
    ]
});
```

### ViewManager Global View Management

`ViewManagerModel` accepts a `manageGlobal` config that determines whether the current user can
create and manage globally shared views (vs. only their own private views). This is commonly
gated on a role:

```typescript
const viewManagerModel = await ViewManagerModel.createAsync({
    type: 'portfolioGridView',
    manageGlobal: XH.getUser().hasRole('MANAGE_VIEWS')
});
```

## Gates

Gates are a lightweight, config-driven alternative to roles for controlling access to specific
features. Where roles require formal definition and management through the Admin Console, gates
are simply soft-configuration entries (`AppConfig` values) that list the usernames allowed to
pass.

### How Gates Work

A gate is a regular Hoist `AppConfig` (soft config) whose value is a comma-separated string of
usernames. The `HoistUser.hasGate()` method reads this config and checks whether the current
user's username appears in the list:

```typescript
// Server-side config 'betaFeatureGate' has value: 'jsmith,mjones,alee'
if (XH.getUser().hasGate('betaFeatureGate')) {
    // Show beta feature
}
```

### Gate Syntax

Gate config values support three forms:

| Syntax | Meaning | Example Config Value |
|--------|---------|---------------------|
| `username` | Individual user | `jsmith,mjones` |
| `*` | All users (wildcard) | `*` |
| `[otherGate]` | Include users from another gate | `jsmith,[powerUsers]` |

Gate names referenced via bracket syntax must contain only alphanumeric characters, underscores,
and hyphens (matching the pattern `/\[([\w-]+)\]/`).

The bracket syntax enables gate composition — a gate can reference other gates by name, creating
a simple inheritance mechanism:

```typescript
// Config 'powerUsers' = 'jsmith,mjones'
// Config 'betaFeatureGate' = 'alee,[powerUsers]'

// alee passes betaFeatureGate (direct match)
// jsmith passes betaFeatureGate (via [powerUsers] reference)
// mjones passes betaFeatureGate (via [powerUsers] reference)
```

### When to Use Gates vs. Roles

| Consideration | Roles | Gates |
|---|---|---|
| **Scope** | Application-wide, formal permissions | Per-feature, lightweight toggles |
| **Management** | Admin Console role editor with audit trail | Config editor (key/value string) |
| **Membership** | Users, directory groups, other roles | Usernames only (plus gate references) |
| **Inheritance** | Full role hierarchy | Simple gate-to-gate references |
| **Best for** | Stable permission model, org-wide access control | Feature rollouts, beta testing, debugging, temporary access |

**Use roles** when:
- The permission is part of the application's long-term access model
- You need directory group integration or role inheritance
- Multiple features share the same access boundary
- You want auditable, manageable access control

**Use gates** when:
- You need to quickly restrict a feature to specific users for testing or rollout
- The access control is temporary or experimental
- You want to toggle access without modifying the role model
- The feature gate needs to be changed by an admin without a deploy

### Gate Example

A typical use case is rolling out a new feature to a small group before enabling it for everyone:

```typescript
class AppModel extends HoistAppModel {
    get showNewDashboard(): boolean {
        return XH.getUser().hasGate('newDashboardGate');
    }
}
```

In the Admin Console, create a config entry:
- **Key:** `newDashboardGate`
- **Value type:** `string`
- **Client visible:** `true`
- **Value:** `jsmith,alee` (initially limited to two testers)

When ready for general availability, change the value to `*` — or remove the gate check entirely
and make the feature unconditionally available.

## Best Practices for Role Naming

### Use `UPPER_SNAKE_CASE`

Follow the Hoist convention for role names — `UPPER_SNAKE_CASE` with clear, descriptive names:

```
VIEW_REPORTS          (not: viewReports, view-reports, Reports_Viewer)
EDIT_TIME_ENTRIES     (not: TimeEntryEditor, edit_time)
MANAGE_EVENTS         (not: EventManager, EVENTS_MANAGE)
```

### Use Verb-First Names

Structure role names as `VERB_NOUN` to clearly communicate the action being authorized:

```
VIEW_REPORTS         — can view reports
EDIT_INVOICES        — can edit invoices
CREATE_INVOICES      — can create new invoices
DELETE_REPORTS       — can delete reports
MANAGE_EVENTS       — can manage (CRUD) events
EXPORT_DATA          — can export data
SHARE_VIEWS          — can share views with other users
```

### Use Categories to Organize

The Admin Console's role editor supports categories (specified per role) to organize large role
sets. Categories can be nested using the `\` separator:

```
Category: "Invoices"         → EDIT_INVOICES, CREATE_INVOICES, VIEW_INVOICES
Category: "Reports"          → VIEW_REPORTS, EXPORT_DATA
Category: "Admin\Access"     → APP_ADMIN, MANAGE_EVENTS
```

### Design for Granularity

Define roles at the level of granularity your application needs. Start with broader roles and add
finer-grained ones as requirements emerge:

```
// Broad: single role for basic access
ACCESS_APP

// Medium: feature-level access
VIEW_REPORTS
VIEW_INVOICES

// Fine: operation-level access
EDIT_INVOICES
DELETE_INVOICES
CREATE_INVOICES
```

Use role inheritance to compose fine-grained roles into broader ones — e.g., an `INVOICE_ADMIN`
role that includes `VIEW_INVOICES`, `EDIT_INVOICES`, `CREATE_INVOICES`, and `DELETE_INVOICES`.

## Common Pitfalls

### Client-Side Checks Are Not Security

Role checks in client-side code control UI visibility and navigation, but they are **not** a
security boundary. A determined user can bypass client-side checks. Always enforce authorization
on the server as well — Hoist Core provides server-side role checking for controller endpoints.
Client-side checks are for UX (showing/hiding features), not for security enforcement.

### Hardcoding Role Names as Strings

Scattering raw role-name strings throughout the codebase makes them difficult to find and
refactor. If a role is renamed, every `hasRole('OLD_NAME')` call must be found and updated.
Consider centralizing role names in a typed helper (see
[Using a Typed Role Helper](#using-a-typed-role-helper)) or at minimum defining constants:

```typescript
// Fragile — role name duplicated across files:
if (XH.getUser().hasRole('VIEW_REPORTS')) { ... }

// Better — centralized, discoverable, refactor-safe:
import {hasRole} from '../core/Roles';
if (hasRole('VIEW_REPORTS')) { ... }
```

### Gate Configs Must Be Client-Visible

Gate configs **must** be marked as `Client visible: true` in the Admin Console. If a gate config
is not client-visible, `XH.getConf()` will not find it and `hasGate()` will silently return
`false` — making it appear that no users pass the gate.

### Confusing Roles and Gates

Roles and gates serve different purposes. Do not use gates as a substitute for proper role
management — gates are backed by simple config strings and lack the audit trail, directory group
integration, and inheritance that roles provide. Conversely, do not create formal roles for
one-off feature toggles that are better served by a gate.

### Forgetting `checkAccess` in AppSpec

`AppSpec` requires a `checkAccess` value — it will throw during initialization if omitted. Even
applications that should be open to all authenticated users must explicitly declare this, typically
with a function returning `true`:

```typescript
XH.renderApp({
    // ...
    checkAccess: () => true  // All authenticated users can access
});
```

### Checking Roles Too Early

Role data is not available until after the `AUTHENTICATING` phase completes and `IdentityService`
installs the user. Attempting to call `XH.getUser().hasRole()` before this point (e.g., during
`HoistAuthModel.completeAuthAsync()` or in static class-level initializers that run at import
time) will fail. Role checks should happen during or after `AppModel.initAsync()`, in component
render methods, or in model constructors/`onLinked` callbacks that run after app initialization.

## Key Source Files

| File | Contents |
|------|----------|
| `core/types/Interfaces.ts` | `HoistUser` interface — `roles`, `hasRole()`, `hasGate()`, convenience flags |
| `core/HoistAuthModel.ts` | `createUser()` — constructs `HoistUser` with role checking methods; `hasGate()` implementation |
| `core/AppSpec.ts` | `checkAccess` configuration for app-level access control |
| `appcontainer/AppStateModel.ts` | `checkAccess()` execution during app initialization |
| `svc/IdentityService.ts` | Current user access, impersonation, `HOIST_IMPERSONATOR` role check |
| `admin/tabs/userData/roles/RoleModel.ts` | Admin Console role management model |
| `admin/tabs/userData/roles/Types.ts` | `HoistRole`, `RoleModuleConfig`, `RoleMemberType` type definitions |
| `admin/tabs/userData/roles/editor/RoleEditorModel.ts` | Role create/edit dialog model |
| `admin/tabs/userData/roles/graph/RoleGraphModel.ts` | Role inheritance graph visualization |
| `cmp/viewmanager/ViewManagerModel.ts` | `manageGlobal` config — role-gated view management |
