# Hoist React v73 Upgrade Notes

> **From:** v72.x → v73.0.1 | **Released:** 2025-05-19 | **Difficulty:** 🟢 LOW

## Overview

Hoist React v73 is primarily focused on Admin Console improvements and developer experience
enhancements. It introduces a consolidated "Clients" tab in the Admin Console, significant upgrades
to Activity Tracking, and a new runtime check that warns when `makeObservable(this)` is missing
from model constructors.

The most significant app-level impacts are:

- **Requires `hoist-core >= 31`** — new server-side APIs support the consolidated Admin Clients tab
  and new `TrackLog` properties.
- **`makeObservable(this)` now enforced** — a new dev-mode runtime check warns when `@bindable` or
  `@observable` properties are not properly initialized. Previously `@bindable` silently worked
  without `makeObservable(this)`, but this is no longer the case.
- **Admin `AppModel.initAsync` super call required** — apps with a custom admin `AppModel` must
  call `super.initAsync()` in their override.
- **ESLint 9 + hoist-dev-utils 11** — recommended (not required) tooling upgrade that changes the
  ESLint config file format.

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v72.x
- [ ] **hoist-core** is upgraded to `>= 31.0`
- [ ] **Node.js** version meets project requirements

## Upgrade Steps

### 1. Update `package.json`

Bump hoist-react and update the MSAL dependency.

**File:** `package.json`

Before:
```json
"@xh/hoist": "~72.5.0",
```

After:
```json
"@xh/hoist": "~73.0.1",
```

The `@azure/msal-browser` dependency is updated from `~4.8.0` to `~4.12.0` within hoist-react
itself. If your app pins this dependency directly, update it as well.

Run `yarn install` / `npm install` after updating.

### 2. Upgrade ESLint to v9 + hoist-dev-utils to v11 (Recommended)

This step is **recommended but not required**. hoist-react v73 itself upgraded its lint tooling
and we strongly recommend apps take the same changes.

**File:** `package.json` — update `devDependencies`:

Before:
```json
"@xh/hoist-dev-utils": "10.x",
"eslint": "8.x",
"eslint-config-prettier": "9.x",
"typescript": "~5.1.6"
```

After:
```json
"@xh/hoist-dev-utils": "11.x",
"eslint": "9.x",
"eslint-config-prettier": "10.x",
"typescript": "~5.8.3"
```

**File:** `package.json` — update lint scripts:

Before:
```json
"lint:all": "yarn lint:js && yarn lint:styles",
"lint:js": "eslint --ext .js,.jsx,.ts,.tsx .",
```

After:
```json
"lint:all": "yarn lint:code && yarn lint:styles",
"lint:code": "eslint .",
```

ESLint 9 uses a new "flat config" format. Delete your old `.eslintrc` (or `.eslintrc.json`) file
and create a new `eslint.config.js`:

**Delete:** `.eslintrc`

**Create:** `eslint.config.js`

```javascript
const {defineConfig, globalIgnores} = require('eslint/config'),
    xhEslintConfig = require('@xh/eslint-config'),
    prettier = require('eslint-config-prettier');

module.exports = defineConfig([
    {
        extends: [xhEslintConfig, prettier]
    },
    globalIgnores(['build/**/*', '.yarn/**/*', 'node_modules/**/*'])
]);
```

Also delete `.eslintignore` if present — ESLint 9 uses the `globalIgnores` call in the config file
instead.

**Find affected files:**
```bash
ls client-app/.eslintrc* client-app/.eslintignore 2>/dev/null
```

See the
[Toolbox eslint.config.js](https://github.com/xh/toolbox/blob/6cf3297a/client-app/eslint.config.js)
for a working example.

### 3. Add `makeObservable(this)` to Model Constructors

v73 introduces a dev-mode runtime check on `HoistBase` that warns when `@bindable` or `@observable`
properties are declared but `makeObservable(this)` was never called. Previously, `@bindable` had its
own internal observable mechanism that worked without `makeObservable(this)`, but this is no longer
the case — `@bindable` now relies on `makeObservable` to create the backing observable on the
instance.

**Find affected files:**
```bash
grep -r "@bindable" client-app/src/ -l
```

For each model class that uses `@bindable` or `@observable`, ensure the constructor calls
`makeObservable(this)`:

Before:
```typescript
class MyModel extends HoistModel {
    @bindable selectedId: string = null;

    // No constructor, or constructor without makeObservable
}
```

After:
```typescript
import {makeObservable} from '@xh/hoist/mobx';

class MyModel extends HoistModel {
    @bindable selectedId: string = null;

    constructor() {
        super();
        makeObservable(this);
    }
}
```

If the class already has a constructor calling `makeObservable(this)`, no change is needed. The new
runtime check will log an error to the console in development mode if this call is missing — watch
for messages like:

> Observable properties [selectedId] not initialized properly. Ensure you call
> makeObservable(this) in your constructor

### 4. Call `super.initAsync()` in Admin AppModel

If your app has a custom `AppModel` for the admin console that extends
`@xh/hoist/admin/AppModel` and overrides `initAsync()`, you must call `super.initAsync()` within
that override. The superclass now initializes a `ViewManagerModel` for the Activity Tracking tab.

**Find affected files:**
```bash
grep -r "extends.*AppModel" client-app/src/admin/ -l
```

Ensure the override calls super:

```typescript
override async initAsync() {
    await super.initAsync();
    // ... your custom init code
}
```

See the
[Toolbox admin AppModel](https://github.com/xh/toolbox/blob/6cf3297a/client-app/src/admin/AppModel.ts#L43)
for a working example.

### 5. Review `GridFilterModel.commitOnChange` Default

The default for `GridFilterModel.commitOnChange` changed from `true` to `false`. This means grid
column header filters will now require the user to click an "Apply" button rather than filtering
immediately on each change.

If your app relied on the previous `true` default, set it explicitly:

```typescript
new GridModel({
    filterModel: {commitOnChange: true}
});
```

**Find affected files:**
```bash
grep -r "filterModel" client-app/src/ -l
```

### 6. Configure OAuth `reloginEnabled` (Recommended)

v73 adds a `reloginEnabled` config to `BaseOAuthClient` (both `MsalClient` and `AuthZeroClient`).
When enabled, the client will attempt an interactive popup login mid-session if its refresh token
expires or is invalidated. This is strongly recommended for all OAuth apps.

**Find affected files:**
```bash
grep -r "MsalClient\|AuthZeroClient" client-app/src/ -l
```

```typescript
new MsalClient({
    clientId: '...',
    // ... existing config
    reloginEnabled: true   // Add this
});
```

## Verification Checklist

After completing all steps:

- [ ] `yarn install` / `npm install` completes without errors
- [ ] `yarn lint` / `npm run lint` passes (or only pre-existing warnings remain)
- [ ] `npx tsc --noEmit` passes
- [ ] Application loads without console errors
- [ ] No `makeObservable` warnings in the browser console
- [ ] Grids render and function correctly (sorting, filtering, grouping)
- [ ] Grid column header filters work as expected (note `commitOnChange` default change)
- [ ] Admin Console loads and the new "Clients" tab is visible
- [ ] Admin Console "Activity" tab functions correctly with new features
- [ ] OAuth login and token refresh work correctly (if applicable)
- [ ] No deprecated patterns remain: `grep -r "lint:js" client-app/package.json`

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) — canonical example of a Hoist app
