# AppContainer Package

## Overview

The `/appcontainer/` package is the framework's application shell — it orchestrates the app
lifecycle, modal dialogs, toast notifications, alert banners, theming, routing, and environment
detection. Every Hoist app renders within an `AppContainer`, and all of the features described
here are accessed through `XH` singleton convenience methods.

`AppContainerModel` is the root coordinator, created automatically when the app calls
`XH.renderApp()`. It manages sub-models that provide the UI services described below, while
desktop and mobile platform packages provide corresponding views that render these shared models
with platform-appropriate components.

## Architecture

```
/appcontainer/
├── AppContainerModel.ts      # Root coordinator — owns all sub-models below
│
│   # Dialogs & Notifications
├── MessageModel.ts           # Single modal dialog instance
├── MessageSourceModel.ts     # Manages message dialog stack (XH.message, alert, confirm, prompt)
├── ToastModel.ts             # Single toast notification instance
├── ToastSourceModel.ts       # Manages toast display (XH.toast and variants)
├── BannerModel.ts            # Single banner instance
├── BannerSourceModel.ts      # Manages banner display (XH.showBanner / hideBanner)
├── ExceptionDialogModel.ts   # Exception display dialog (XH.handleException)
│
│   # App Dialogs
├── AboutDialogModel.ts       # "About this app" dialog (XH.showAboutDialog)
├── ChangelogDialogModel.ts   # Release notes dialog (XH.showChangelog)
├── FeedbackDialogModel.ts    # User feedback dialog (XH.showFeedbackDialog)
├── OptionsDialogModel.ts     # App options/preferences dialog (XH.showOptionsDialog)
├── AppOption.ts              # Single option entry within OptionsDialog
├── ImpersonationBarModel.ts  # Admin impersonation bar (XH.showImpersonationBar)
│
│   # App Lifecycle & Environment
├── AppStateModel.ts          # App state machine (PRE_AUTH → RUNNING, etc.)
├── PageStateModel.ts         # Browser page visibility tracking
├── RouterModel.ts            # Client-side routing (Router5 wrapper)
├── login/
│   └── LoginPanelModel.ts    # Username/password login (rare — most apps use SSO)
│
│   # Theme & Display
├── ThemeModel.ts             # Light/dark/system theme management
├── SizingModeModel.ts        # UI density: compact/standard/large
├── ViewportSizeModel.ts      # Browser viewport dimensions and orientation
└── UserAgentModel.ts         # Device detection (phone/tablet/desktop)
```

**Sub-model ownership:** `AppContainerModel` creates and `@managed`-destroys all sub-models. They
are not intended for direct construction by applications — interact with them through the `XH`
convenience methods documented below.

## Messages

The message system provides modal dialogs for alerts, confirmations, and user prompts. All
methods return a `Promise` that resolves when the user responds, making them ideal for inline
`await` in async workflows.

### `XH.message(config)`

The generic modal dialog API — all other message methods delegate to it. Returns
`Promise<boolean>` that resolves to `true` on confirm, `false` on cancel.

```typescript
const result = await XH.message({
    title: 'Export Complete',
    icon: Icon.download(),
    message: 'Your report has been exported.',
    confirmProps: {text: 'Open File', icon: Icon.openExternal()},
    cancelProps: {text: 'Dismiss'}
});
if (result) openExportedFile();
```

By default, the confirm button receives auto-focus. To focus the cancel button instead (e.g.
for risky operations), set `cancelProps: {..., autoFocus: true}`.

### `XH.alert(config)`

An acknowledge-only dialog with a default "OK" button and no cancel. Returns `Promise<boolean>`
that resolves to `true` when the user acknowledges.

```typescript
await XH.alert({
    title: 'Invoice Amount Mismatch',
    message: `Invoice ${invoice.number} created, but amount differs from expected. Please review.`
});
```

### `XH.confirm(config)`

A confirmation dialog with "OK" and "Cancel" buttons, a warning icon, and "Please confirm..."
title (all overridable). Returns `Promise<boolean>` — `true` on confirm, `false` on cancel.

```typescript
// Basic confirmation
const confirmed = await XH.confirm({
    message: 'This will permanently delete the selected records.'
});
if (!confirmed) return;

// Custom button text and intent for a destructive action
const confirmed = await XH.confirm({
    message: fragment(
        p('This will mark the selected invoice as sent.'),
        p('This action cannot be undone.')
    ),
    confirmProps: {
        text: 'Yes, mark as sent',
        icon: Icon.envelope(),
        intent: 'success'
    }
});
```

#### Extra Confirmation for Dangerous Operations

For high-risk actions, `extraConfirmText` requires the user to type a specific string before the
confirm button becomes active:

```typescript
const confirmed = await XH.confirm({
    title: 'Delete Environment',
    message: `This will permanently destroy the "${envName}" environment and all associated data.`,
    extraConfirmText: envName,    // User must type the environment name
    confirmProps: {text: 'Delete', intent: 'danger'}
});
```

### `XH.prompt(config)`

An input collection dialog with a default `TextInput`, "OK" and "Cancel" buttons. Returns
`Promise<value | false>` — the input value on confirm, `false` on cancel.

The default TextInput comes pre-configured with `autoFocus`, `selectOnFocus`, and
enter-to-confirm (desktop only). Custom inputs must set their own props.

```typescript
// Simple text prompt
const name = await XH.prompt({
    title: 'Rename Portfolio',
    message: 'Enter a new name:',
    input: {initialValue: portfolio.name}
});
if (name) await renameAsync(name);

// Prompt with validation rules
const value = await XH.prompt({
    title: 'Set Target Price',
    input: {
        initialValue: currentPrice,
        rules: [{check: (v) => v > 0, message: 'Must be positive'}]
    }
});

// Custom input — dateInput instead of text
const newDate = await XH.prompt<LocalDate>({
    title: 'Set Release Date',
    icon: Icon.calendar(),
    message: fragment(
        p('Enter a new release date below.'),
        p('All entries on or before this date will be visible to clients.')
    ),
    input: {
        item: dateInput({valueType: 'localDate', showActionsBar: true}),
        initialValue: currentReleaseDate
    },
    confirmProps: {text: 'Save Changes', intent: 'success', icon: Icon.check()}
});
```

### `messageKey` for Deduplication

Use `messageKey` to prevent duplicate dialogs from stacking when messages may be triggered
recursively or by timers. A new message with the same key replaces the existing one:

```typescript
XH.alert({
    messageKey: 'connectionWarning',
    message: 'Connection interrupted — retrying...'
});
```

### MessageSpec Reference

| Config | Type | Description |
|--------|------|-------------|
| `message` | `ReactNode` | Dialog body content |
| `title` | `string` | Dialog title |
| `icon` | `ReactElement` | Icon displayed beside the title |
| `className` | `string` | CSS class for the dialog |
| `messageKey` | `string` | Unique key for deduplication — new messages with the same key replace existing ones |
| `confirmProps` | `object` | Button props for primary confirm button. Must have `text` or `icon` to display |
| `cancelProps` | `object` | Button props for cancel button. Must have `text` or `icon` to display |
| `cancelAlign` | `'left' \| 'right'` | Cancel button placement. `'left'` places it on the opposite side from confirm |
| `input` | `MessageSpecInput` | Input config for prompt dialogs (see below) |
| `extraConfirmText` | `string` | Text the user must type to enable the confirm button |
| `extraConfirmLabel` | `ReactNode` | Custom label for the extra-confirm field (defaults to `"Enter '...' to confirm:"`) |
| `onConfirm` | `() => void` | Callback fired on confirm (in addition to Promise resolution) |
| `onCancel` | `() => void` | Callback fired on cancel (in addition to Promise resolution) |
| `dismissable` | `boolean` | Whether Escape or clicking outside closes the dialog. Defaults to `true` when cancel button is present |
| `cancelOnDismiss` | `boolean` | Whether dismissing executes the cancel action (vs resolving to `null`). Default `true` |

**MessageSpecInput** (for `XH.prompt()` config):

| Config | Type | Description |
|--------|------|-------------|
| `item` | `ReactElement` | Custom HoistInput element. Defaults to a platform-appropriate `TextInput` |
| `rules` | `RuleLike[]` | Validation rules applied to the input value |
| `initialValue` | `any` | Starting value for the input |

## Toasts

Toasts are non-modal notifications that appear briefly and auto-dismiss. They are ideal for
confirming successful operations without interrupting the user's workflow.

### `XH.toast(config | string)`

The generic toast API. Accepts a string shorthand or full config object. Returns a `ToastModel`
with a `dismiss()` method for programmatic dismissal.

```typescript
// String shorthand
XH.toast('Saved');

// Full config
XH.toast({
    message: 'Document uploaded successfully',
    icon: Icon.upload(),
    intent: 'success',
    timeout: 5000
});
```

### Convenience Variants

| Method | Intent | Icon | Use For |
|--------|--------|------|---------|
| `XH.successToast()` | `success` | Checkmark | Confirming a completed action |
| `XH.warningToast()` | `warning` | Warning triangle | Non-critical issues |
| `XH.dangerToast()` | `danger` | Error icon | Serious problems shown non-modally |

All variants accept the same `ToastSpec | string` argument as `XH.toast()`:

```typescript
// After a successful operation
XH.successToast('Release date updated successfully');

// With full config
XH.successToast({message: 'Lock request deleted.', icon: Icon.delete()});

// Warning with extended timeout
XH.warningToast({message: 'Rate sheet expires in 2 hours', timeout: 8000});
```

### Programmatic Dismissal

`XH.toast()` and its variants return a `ToastModel` — call `dismiss()` to remove it early:

```typescript
const toast = XH.toast({message: 'Uploading...', timeout: null});  // null = no auto-dismiss
try {
    await uploadAsync();
    toast.dismiss();
    XH.successToast('Upload complete');
} catch (e) {
    toast.dismiss();
    XH.handleException(e);
}
```

### Toast with Action Button

```typescript
XH.toast({
    message: 'Record archived',
    intent: 'primary',
    actionButtonProps: {
        text: 'Undo',
        onClick: () => restoreRecordAsync()
    }
});
```

### ToastSpec Reference

| Config | Type | Description |
|--------|------|-------------|
| `message` | `ReactNode` | Toast content (required) |
| `icon` | `ReactElement` | Icon displayed in the toast |
| `intent` | `Intent` | Visual intent: `'primary'`, `'success'`, `'warning'`, `'danger'`. Default `'primary'` |
| `timeout` | `number \| null` | Auto-dismiss time in ms. Default `3000`. `null` for persistent toast |
| `actionButtonProps` | `object` | Button props for an action button within the toast |
| `position` | `string` | Display position, e.g. `'bottom-right'` (default), `'top'`. Desktop only |
| `containerRef` | `HTMLElement` | Position relative to this element instead of the document. Desktop only |

## Banners

Banners display persistent, app-wide messages across the top of the viewport. They are
unique by `category` — showing a new banner with an existing category replaces the previous one.

```typescript
XH.showBanner({
    category: 'maintenance',
    message: 'Scheduled maintenance tonight at 10pm EST',
    icon: Icon.warning({size: 'lg'}),
    intent: 'warning',
    actionButtonProps: {
        text: 'Details',
        onClick: () => showMaintenanceDetails()
    }
});

// Remove a banner by category
XH.hideBanner('maintenance');
```

`AlertBannerService` automatically manages admin-configured banners (configured via the Admin
Console), displaying them without application code.

### BannerSpec Reference

| Config | Type | Description |
|--------|------|-------------|
| `message` | `ReactNode` | Banner content |
| `icon` | `ReactElement` | Icon displayed in the banner |
| `intent` | `Intent` | Visual intent. Default `'primary'` |
| `category` | `string` | Unique key — new banners with the same category replace existing ones. Default `'default'` |
| `className` | `string` | CSS class for the banner |
| `sortOrder` | `number` | Display order (lower values appear first) |
| `enableClose` | `boolean` | Show close button. Default `true` |
| `onClose` | `(model) => void` | Callback when user clicks close (not called for programmatic `hideBanner()`) |
| `onClick` | `(model) => void` | Callback when user clicks the banner body |
| `actionButtonProps` | `object` | Button props for an action button within the banner |

## Exception Handling

`XH.handleException()` is the centralized entry point for logging, reporting, and displaying
errors. It is typically called in `catch` blocks or via `Promise.catchDefault()`, which
delegates to it.

```typescript
try {
    await XH.postJson({url: 'api/trades', body: tradeData});
    XH.successToast('Trade submitted');
} catch (e) {
    XH.handleException(e);
}
```

### Options

| Config | Type | Description |
|--------|------|-------------|
| `message` | `string` | Custom error message to display to the user |
| `title` | `string` | Alert dialog title |
| `alertType` | `'dialog' \| 'toast'` | How to display the error. Default `'dialog'` |
| `showAlert` | `boolean` | Display an alert to the user at all. Default `true` (except for auto-refresh and aborted fetch exceptions) |
| `showAsError` | `boolean` | Treat as an unexpected error (affects styling and logging). Default `true` for most exceptions |
| `logOnServer` | `boolean` | Send the exception to the server for Admin Console review. Default `true` when `showAsError` is `true` |
| `requireReload` | `boolean` | Force a reload button instead of a dismiss button — for unrecoverable errors |
| `hideParams` | `string[]` | Parameters to redact from the exception log and alert |

```typescript
// Show as toast instead of modal dialog
XH.handleException(e, {alertType: 'toast'});

// Silent server-side logging only — no user alert
XH.handleException(e, {showAlert: false});

// Custom message for a specific operation
XH.handleException(e, {
    title: 'Error accepting lock request',
    alertType: 'dialog'
});
```

The exception dialog includes a "Report" button that lets users send error details (with an
optional message) to the server for admin review.

## App Options Dialog

The options dialog provides a standard UI for user-configurable preferences. Applications
define available options by implementing `HoistAppModel.getAppOptions()`:

```typescript
class AppModel extends HoistAppModel {
    override getAppOptions(): AppOptionSpec[] {
        return [
            themeAppOption(),        // Built-in: light/dark/system
            sizingModeAppOption(),   // Built-in: compact/standard/large
            autoRefreshAppOption(),  // Built-in: enable/disable auto-refresh
            {
                name: 'loadInactiveLoans',
                prefName: 'loadInactiveLoans',
                formField: {
                    label: 'Inactive Loans',
                    info: 'Default to loading inactive loans (more data, slower).',
                    item: switchInput()
                }
            }
        ];
    }
}
```

Each option can be backed by a preference (`prefName`) or use custom `valueGetter`/`valueSetter`
functions for more complex handling. Return an empty array to disable the options menu item.

`XH.showOptionsDialog()` opens the dialog. Set `reloadRequired: true` on options that need an
app reload to take effect — the dialog handles this automatically.

## Theme

Hoist supports light, dark, and system-matching themes, persisted via the `xhTheme` preference.

```typescript
XH.setTheme('dark');       // Set directly: 'light' | 'dark' | 'system'
XH.toggleTheme();          // Toggle between light and dark
XH.darkTheme;              // Observable boolean — true when dark theme is active
```

`setTheme('system')` listens for OS preference changes and updates automatically.

Theme is applied by adding `xh-dark` and `bp6-dark` CSS classes to the document body.

## Sizing Mode

The sizing mode controls UI density — useful for users who prefer larger touch targets or more
compact information density. Managed via the `xhSizingMode` JSON preference (per-platform):

```typescript
XH.sizingMode;              // Current mode: 'compact' | 'standard' | 'large'
XH.setSizingMode('large');  // Change mode (persisted per-platform)
```

Applied via `xh-compact`, `xh-standard`, or `xh-large` CSS classes on the document body. The
primary built-in consumer is `GridModel`, which adjusts row heights and font sizes based on
sizing mode. Applications can also respond to these classes in their own stylesheets.

## Viewport & Device Detection

### Viewport Size

`ViewportSizeModel` exposes browser viewport dimensions and device orientation as observables:

```typescript
XH.viewportSize;     // {width: number, height: number}
XH.isPortrait;       // boolean
XH.isLandscape;      // boolean
```

### Device Detection

`UserAgentModel` classifies the device based on the browser user agent:

```typescript
XH.isPhone;      // boolean
XH.isTablet;     // boolean
XH.isDesktop;    // boolean
```

## About Dialog & Changelog

`XH.showAboutDialog()` displays app info (name, version, environment, user) populated by
`HoistAppModel.getAboutDialogItems()`. Values are click-to-copy.

`XH.showChangelog()` displays release notes, powered by `ChangelogService`. Requires the
`xhChangelogConfig` soft config to be set up.

## Feedback Dialog

`XH.showFeedbackDialog()` collects free-text user feedback and submits it via `TrackService`
(viewable in the Admin Console activity log):

```typescript
XH.showFeedbackDialog();                              // Empty form
XH.showFeedbackDialog({message: 'Pre-filled text'});  // With preset message
```

## Impersonation

The impersonation bar allows authorized admins (`HOIST_IMPERSONATOR` role) to act as another
user for debugging and support. `XH.showImpersonationBar()` opens the bar.

See the [Authentication concept doc](../docs/concepts/authentication.md#impersonation) for details
on identity handling during impersonation, and `IdentityService` in
[`/svc/README.md`](../svc/README.md) for the underlying API.

## Routing

`RouterModel` wraps [Router5](https://router5.js.org/) to provide observable client-side routing.
Applications define routes in `HoistAppModel.getRoutes()`:

```typescript
override getRoutes() {
    return [{
        name: 'default',
        path: '/app',
        children: [
            {name: 'dashboard', path: '/dashboard'},
            {name: 'trades', path: '/trades'},
            {name: 'loan', path: '/loan', children: [
                {name: 'details', path: '/:navId'}
            ]}
        ]
    }];
}
```

Route state is observable via `XH.routerState`. `TabContainerModel` integrates with routing
automatically when configured with `route: true` — see
[`/cmp/tab/README.md`](../cmp/tab/README.md).

## Login Panel

`LoginPanelModel` supports username/password authentication for apps that don't use SSO. Most
Hoist applications use OAuth (Auth0, MSAL) where authentication is handled externally before the
app loads, and no Hoist-provided login UI is needed. See the
[Authentication concept doc](../docs/concepts/authentication.md) for full coverage of OAuth flows,
`HoistAuthModel`, and identity management.

Enable via `AppSpec.enableLoginForm`. The login panel is shown when `XH.authModel` cannot
complete authentication automatically.

## Version Bar

The desktop version bar is a thin footer displaying the app name, environment, version, and
tab ID. It also provides quick-access icons for the About Dialog, Hoist Inspector, and Admin
Console.

Visibility is controlled by the `xhShowVersionBar` preference (`'auto'`, `'always'`, or
`'never'`). In `'auto'` mode, it shows in non-Production environments and for Hoist admin users.
Apps can disable it entirely by overriding `HoistAppModel.supportsVersionBar`.

## Related Packages

- [`/core/`](../core/README.md) - HoistModel, XH singleton, HoistAppModel
- [`/svc/`](../svc/README.md) - Built-in services (IdentityService, ChangelogService, AlertBannerService, etc.)
- [`/desktop/`](../desktop/README.md) - Desktop platform views for AppContainer sub-models
- [`/mobile/`](../mobile/README.md) - Mobile platform views for AppContainer sub-models
- [`/cmp/tab/`](../cmp/tab/README.md) - TabContainerModel routing integration
- [App Lifecycle](../docs/concepts/lifecycle-app.md) - App startup sequence and state machine
