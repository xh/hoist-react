# Authorization

Hoist provides a role-based authorization system for controlling what users can do within an
application. On the client, roles are simple string identifiers available on the `HoistUser` object —
the client-side API is intentionally minimal and completely agnostic to how roles are sourced.

On the server, roles can come from any system of record — Hoist Core's built-in database-backed role
management module (the most common choice), external directory groups, JWT token claims, a
pre-existing authorization API, or custom server-side logic. A lightweight "gates" feature, driven by
soft configs, offers a complementary mechanism for quick feature gating without defining formal roles.
Together, these tools give teams a flexible, layered approach to authorization that works for
everything from coarse app-level access checks to fine-grained feature visibility.

This doc focuses on the client-side perspective — how applications check roles and gates, gate
features, and integrate with the Admin Console. The underlying server-side role management is covered where relevant but not exhaustively
documented here — see the
[hoist-core authorization docs](https://github.com/xh/hoist-core/blob/develop/docs/authorization.md)
for the full server-side perspective.

For *authentication* (how users prove who they are), see [Authentication](./authentication.md).
Authorization picks up where authentication leaves off: once the user's identity is established
and their roles loaded, authorization determines what they can access.

## The Client-Side Role API

### How Roles Work on the Client

Roles on the client are a flat array of strings. When a user authenticates, the server resolves
their complete set of effective roles — regardless of where those roles are sourced — and delivers
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

`hasRole()` performs a simple array inclusion check — the role string must match exactly
(case-sensitive). There is no wildcard or pattern matching. The client does not know or care
*where* the role strings came from — it simply checks whether they are present.

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

### Built-in Hoist Roles

Hoist defines several built-in roles that control access to framework-level features:

| Role | Purpose |
|------|---------|
| `HOIST_ADMIN` | Full Admin Console access. Required for editing configs, preferences, alert banners, and other admin operations. |
| `HOIST_ADMIN_READER` | Read-only Admin Console access. This is the default `checkAccess` role for the admin app — users with this role can view admin data but cannot make changes. Also controls visibility of the "Admin" menu item in `AppMenuButton`. |
| `HOIST_ROLE_MANAGER` | Permission to create, edit, and delete roles in the Admin Console's role management UI. Users without this role see the role list as read-only. |
| `HOIST_IMPERSONATOR` | Permission to impersonate other users (also requires the `xhEnableImpersonation` config to be `true`). See [Authentication — Impersonation](./authentication.md#impersonation). |

These roles are used by the framework itself. Applications should define their own roles for
business-level authorization (see [Best Practices](#best-practices-for-role-design) below).

**`HOIST_ADMIN` does not grant application-level permissions.** It controls access to the Admin
Console only — it does not automatically include other roles or confer blanket access to business
features. Avoid using it as a proxy for "can do anything." Keeping `HOIST_ADMIN` scoped to its
intended purpose allows technical staff to retain Admin Console access for monitoring and
troubleshooting in production, without granting them the ability to take business actions that
should be reserved for authorized business users.

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

## Checking Roles in Application Code

### Use a Typed Role Helper

Applications with a non-trivial set of roles — which is most applications — should strongly
consider centralizing role names in a typed helper. This improves safety and discoverability
while preventing silent bugs from typos in role strings:

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

The examples below use `XH.getUser().hasRole()` directly for clarity, but in practice the
typed helper is the recommended approach.

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

## Where Roles Come From

The client-side API is deliberately decoupled from how roles are sourced. `HoistUser.roles` is
simply a `string[]` delivered by the server during authentication — how the server populates that
array is a server-side concern. Common sources include:

- **Hoist Core's built-in role management module** — A database-backed system with a full Admin
  Console editor, role inheritance, and directory group integration. This is the most common choice
  for Hoist applications and is covered in detail in the [next section](#hoist-core-role-management).
- **External directory / LDAP groups** — The server maps directory group memberships to application
  role strings.
- **JWT token claims** — Roles are embedded in the authentication token by an identity provider and
  extracted by the server during authentication.
- **A pre-existing authorization API** — The server calls an external service to resolve
  permissions.
- **Custom server-side logic** — Any combination of the above.

Regardless of the source, the server delivers roles through the same `IdentityInfo` response,
and the client-side `hasRole()` API works identically.

## Hoist Core Role Management

Hoist Core provides an opt-in, database-backed role management system with a full Admin Console
editor. This is the most common way to manage roles in Hoist applications, but it is not
required — applications can source roles from any system of record as described above.

When enabled, this system provides database-backed role storage with a full CRUD editor,
role-to-role inheritance, directory group integration (e.g. Active Directory / LDAP), and a
visual role graph showing inheritance relationships.

The role module is enabled server-side by configuring hoist-core to use its `DefaultRoleService`.
When enabled, roles are stored in the application's database and managed through the Admin Console
under the **User Data > Roles** tab.

The Roles tab is always present in the Admin Console navigation but checks the server-side module
config on load. If `DefaultRoleService` is not enabled, the tab displays a
"Default Role Module not enabled" message rather than the role editor — no app-level configuration
is needed to handle this.

### Role Structure

Each role has the following properties:

| Property | Description |
|----------|-------------|
| `name` | Unique identifier, typically `UPPER_SNAKE_CASE` (e.g. `EDIT_INVOICES`) |
| `category` | Optional grouping label for organizing roles in the UI (supports nested categories with `\` separator, e.g. `Reports\Admin`) |
| `notes` | Free-text description of the role's purpose |
| `members` | Direct assignments — users, directory groups, and/or other roles |

### Member Types

Roles can be assigned members of three types:

| Type | Description |
|------|-------------|
| **Users** | Individual usernames directly assigned to the role |
| **Directory Groups** | External directory groups (e.g. Active Directory / LDAP groups) whose members automatically receive the role. Availability depends on server-side configuration. |
| **Roles** | Other roles whose members *inherit* this role. This is how role inheritance works — if role `ADMIN` is assigned as a member of role `VIEW_REPORTS`, then all users with `ADMIN` also effectively have `VIEW_REPORTS`. |

### Role Inheritance

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

### Required Permissions

- **Viewing roles:** Requires `HOIST_ADMIN_READER` (read-only Admin Console access)
- **Managing roles:** Requires `HOIST_ROLE_MANAGER` (creating, editing, deleting roles and
  their assignments)

Users without `HOIST_ROLE_MANAGER` see the role management UI in read-only mode — they can
browse roles and view members but cannot make changes.

## Gates

Gates are a lightweight, config-driven alternative to roles for controlling access to specific
features. Rather than formal role definitions, a gate is simply an `AppConfig` (soft config)
whose value is a comma-separated string of usernames. `HoistUser.hasGate()` reads this config
and checks whether the current user appears in the list:

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
- You want to toggle access for individual users without adjusting role memberships, group
  entitlements, or other external authorization systems — but only for features where formal
  RBAC is intentionally not desired. Gates are not an end-run around a closely managed role
  model; they're for cases where lightweight, ad-hoc user lists are the right tool

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

## Best Practices for Role Design

The patterns below are recommendations, not technical requirements. Hoist's role system is
flexible and does not enforce any particular naming or organizational scheme. That said, the
following two-tier approach — drawn from standard RBAC (Role-Based Access Control) practice —
has proven effective across multiple applications and scales well as role sets grow.

> **RBAC terminology:** In standard Role-Based Access Control, **permissions** are atomic
> operations a user can perform, while **roles** are organizational groupings that aggregate
> permissions and are assigned to users. Hoist's role system can model both tiers using the same
> underlying mechanism (role-to-role inheritance), distinguished by naming convention and usage
> rules.

### Permission Roles: What the Code Checks

Define granular, `UPPER_SNAKE_CASE` permission roles in `VERB_NOUN` form to represent specific
things a user can *do* in the application. These are the only roles that appear in application
code — in `hasRole()` checks, in the typed role helper, and in `checkAccess`:

```
VIEW_POSITIONS        — can view portfolio positions
EXECUTE_TRADES        — can submit new trades
APPROVE_TRADES        — can approve pending trades
MANAGE_COUNTERPARTIES — can add/edit counterparty records
VIEW_AUDIT_LOG        — can view the application audit trail
```

These permission roles should be:

- **Granular and atomic** — each role maps closely to a specific application behavior or UI
  control. A developer should be able to verify what the role does without needing to understand
  how business units are organized.
- **Easy to reason about in code reviews** — when you see `hasRole('APPROVE_TRADES')`, it should
  be immediately clear what the check controls.
- **Minimally interdependent** — avoid excessive inheritance between permission roles, as it makes
  them harder to reason about. An exception is clear hierarchical cases — e.g., `EDIT_REPORTS`
  inheriting `VIEW_REPORTS` is intuitive and safe.

### Functional Roles: How Users Are Assigned

On top of the permission layer, define a second tier of roles that represent *what people are*
or *what jobs they do*. We recommend using `Sentence Case` for these to visually distinguish
them from permission roles:

```
Portfolio Manager    — inherits VIEW_POSITIONS, EXECUTE_TRADES, EXPORT_DATA
Risk Analyst         — inherits VIEW_POSITIONS, VIEW_RISK_REPORTS, APPROVE_TRADES
Operations           — inherits VIEW_POSITIONS, SETTLE_TRADES, MANAGE_COUNTERPARTIES
Compliance Officer   — inherits VIEW_POSITIONS, VIEW_RISK_REPORTS, EXPORT_DATA, VIEW_AUDIT_LOG
```

Functional roles are purely an organizational layer — they inherit the permission roles needed
for a given job function, and they are the roles to which end users (and directory groups) are
actually assigned. **Application code should never check functional roles directly.** The code
checks only the underlying permission roles; the mapping from business role to permissions is a
management decision managed through the Admin Console.

This separation has several benefits:

- **Developers don't answer business questions.** The code doesn't need to know whether a
  Portfolio Manager is allowed to approve trades — it just checks `hasRole('APPROVE_TRADES')`.
  Whether that permission is granted to Portfolio Managers, Risk Analysts, or both is configured
  in the role data by the business, not hardcoded in the application.
- **The role structure stays auditable.** Business stakeholders can review functional roles and
  their permission grants without reading code. The Admin Console's role graph makes these
  relationships visible.
- **Role changes don't require code changes.** When the business decides that a new job function
  needs a particular permission, an admin adds the inheritance at runtime.

### Naming Conventions

Follow the casing conventions above consistently:

```
EDIT_TIME_ENTRIES     permission role (not: viewReports, edit_time, TimeEntryEditor)
Risk Analyst          functional role (not: RISK_ANALYST, riskAnalyst)
```

### Use Categories to Organize

The Admin Console's role editor supports categories (specified per role) to organize large role
sets. Categories can be nested using the `\` separator:

```
Category: "Invoices"              → EDIT_INVOICES, CREATE_INVOICES, VIEW_INVOICES
Category: "Reports"               → VIEW_REPORTS, EXPORT_DATA
Category: "Functional Roles"      → Document Manager, Risk Analyst, Operations Manager
```

## Common Pitfalls

### Client-Side Checks Are Not Security

Role checks in client-side code control UI visibility and navigation, but they are **not** a
security boundary. A determined user can bypass client-side checks. Always enforce authorization
on the server as well — Hoist Core provides server-side role checking for controller endpoints.
Client-side checks are for UX (showing/hiding features), not for security enforcement.

### Hardcoding Role Names as Strings

Scattering raw role-name strings throughout the codebase makes them hard to find and refactor.
Centralize role names in a typed helper (see [Use a Typed Role Helper](#use-a-typed-role-helper)):

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

Do not use gates as a substitute for proper role management — they lack audit trails, directory
group integration, and inheritance. Conversely, do not create formal roles for one-off feature
toggles that are better served by a gate.

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
