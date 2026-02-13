# Hoist React v81 Upgrade Notes

> **From:** v80.x → v81.0.2 | **Released:** 2026-02-12 | **Difficulty:** 🟢 LOW

## Overview

Hoist React v81 introduces a new `Card` component (requiring a rename of the Blueprint `Card`
export), a Panel CSS class rename, and a signature change to `HoistAuthModel.completeAuthAsync`.

The most significant app-level impacts are:

- **Panel CSS class rename** — `xh-panel__content` → `xh-panel__inner`
- **`HoistAuthModel.completeAuthAsync` return type change** — `boolean` → `IdentityInfo`
- **Blueprint `Card` → `BpCard` rename** — `card` factory → `bpCard`
- **Requires hoist-core >= v36.1**

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v80.x
- [ ] hoist-core upgraded to >= v36.1

## Upgrade Steps

### 1. Update `hoistCoreVersion` in `gradle.properties`

Hoist React v81 **requires** hoist-core >= v36.1. This version is set in your project's
`gradle.properties` file and referenced by `build.gradle` as
`implementation "io.xh:hoist-core:$hoistCoreVersion"`.

**Find your current version:**
```bash
grep "hoistCoreVersion" gradle.properties
```

**File:** `gradle.properties`

Before:
```properties
hoistCoreVersion=36.0.0
```

After:
```properties
hoistCoreVersion=36.1.0
```

Ensure you are using v36.1.0 or later. Hoist React v81 will not function correctly with older
versions of hoist-core.

### 2. Update `package.json`

Bump hoist-react to v81.

**File:** `package.json`

Before:
```json
"@xh/hoist": "~80.0.0"
```

After:
```json
"@xh/hoist": "~81.0.2"
```

### 3. Update Panel CSS Class References

The CSS class on Panel's outer structural wrapper has been renamed from `xh-panel__content` to
`xh-panel__inner`. The `xh-panel__content` class is now used on the new inner frame wrapping
content items (the target of the new `contentBoxProps`).

**Find affected files:**
```bash
grep -r "xh-panel__content" client-app/src/
```

Before:
```scss
.xh-panel__content {
  padding: 10px;
}
```

After:
```scss
.xh-panel__inner {
  padding: 10px;
}
```

Review each usage carefully — if you were targeting the wrapper around a Panel's content items,
the new `xh-panel__content` class (or `Panel.contentBoxProps`) may be more appropriate than
`xh-panel__inner`.

### 4. Update `HoistAuthModel.completeAuthAsync` Return Type

`HoistAuthModel.completeAuthAsync` now returns `Promise<IdentityInfo>` instead of
`Promise<boolean>`. Similarly, `getAuthStatusFromServerAsync` and `loginWithCredentialsAsync`
return `IdentityInfo` (or `null` if not authenticated) instead of `boolean`.

**Find affected files:**
```bash
grep -r "completeAuthAsync" client-app/src/
```

If your app overrides `completeAuthAsync`, update its return type:

Before:
```typescript
override async completeAuthAsync(): Promise<boolean> {
    const authenticated = await this.myAuthProvider.checkAuth();
    return authenticated;
}
```

After:
```typescript
override async completeAuthAsync(): Promise<IdentityInfo> {
    const result = await this.myAuthProvider.checkAuth();
    if (!result) return null;
    return this.getAuthStatusFromServerAsync();
}
```

The key change: return `IdentityInfo` (from `getAuthStatusFromServerAsync()`) on success, or
`null` on failure — instead of `true`/`false`.

For apps using OAuth clients (`MsalClient`, `AuthZeroClient`), those classes have been updated
internally to return `IdentityInfo`. Check your `AuthModel` for any intermediate handling of
the boolean return value.

### 5. Rename Blueprint `Card` to `BpCard`

The Blueprint `Card` component export has been renamed to `BpCard` (and `card` factory to
`bpCard`) to avoid collision with the new Hoist `Card` component.

**Find affected files:**
```bash
grep -r "import.*Card.*blueprint\|from.*kit/blueprint.*Card\|\bcard(" client-app/src/
```

Before:
```typescript
import {Card, card} from '@xh/hoist/kit/blueprint';

// In component
card({elevation: 2, items: [...]})
```

After:
```typescript
import {BpCard, bpCard} from '@xh/hoist/kit/blueprint';

// In component
bpCard({elevation: 2, items: [...]})
```

Note: If your app does not directly use Blueprint's `Card` component, no change is needed.

## Verification Checklist

After completing all steps:

- [ ] `hoistCoreVersion` in `gradle.properties` is >= 36.1.0
- [ ] `yarn install` completes without errors
- [ ] `yarn lint` passes (or only pre-existing warnings remain)
- [ ] `npx tsc --noEmit` passes
- [ ] Application loads without console errors
- [ ] Authentication works (login/logout) — verify the auth model changes
- [ ] Panels render correctly — check any custom CSS targeting panel structure
- [ ] No old patterns remain: `grep -r "xh-panel__content\b" client-app/src/` (check intentional
  uses of the new `xh-panel__content` class vs. leftover references to the old meaning)
- [ ] Blueprint Card usages compile (if applicable)

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) — canonical example of a Hoist app
