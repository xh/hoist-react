# Hoist React v75 Upgrade Notes

> **From:** v74.x → v75.0.1 | **Released:** 2025-08-11 | **Difficulty:** 🟢 LOW

## Overview

Hoist React v75 is a straightforward release that removes several previously deprecated APIs and
introduces a minor change to Cube View row data objects. Most apps will only need to search for
and remove references to the deprecated APIs listed below.

The most significant app-level impacts are:

- **Removed deprecated APIs** — `LoadSupport.isLoadSupport`, `FileChooserModel.removeAllFiles`,
  `FetchService.setDefaultHeaders`, `FetchService.setDefaultTimeout`, and
  `IdentityService.logoutAsync` have all been removed.
- **Cube View row data change** — the undocumented `_meta` and `buckets` properties on View row
  objects have been removed. Apps using the Cube/View system should verify they are not referencing
  these internal properties.

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v74.x

## Upgrade Steps

### 1. Update `package.json`

Bump hoist-react to v75.

**File:** `package.json`

Before:
```json
"@xh/hoist": "~74.1.0"
```

After:
```json
"@xh/hoist": "~75.0.0"
```

### 2. Remove Deprecated API Usage

The following APIs were deprecated in earlier releases and have now been removed. Search for any
remaining references and replace them.

**Find affected files:**
```bash
grep -rE "isLoadSupport|removeAllFiles|setDefaultHeaders|setDefaultTimeout|logoutAsync" client-app/src/
```

| Removed API | Replacement |
|---|---|
| `LoadSupport.isLoadSupport` | No direct replacement needed — this was a type-check utility rarely used by apps |
| `FileChooserModel.removeAllFiles` | Use `FileChooserModel.clear()` |
| `FetchService.setDefaultHeaders` | Set `FetchService.defaults.headers` directly |
| `FetchService.setDefaultTimeout` | Set `FetchService.defaults.timeout` directly |
| `IdentityService.logoutAsync` | Use `XH.logoutAsync()` |

### 3. Check for Cube View Row Data Changes

The undocumented `_meta` and `buckets` properties on row objects returned by Cube `View` have been
removed. Row data is now emitted as typed `ViewRowData` objects with documented properties.

**Find potentially affected files:**
```bash
grep -rE "_meta|\.buckets" client-app/src/ | grep -iE "cube|view|query|dimension"
```

If matches are found, review each usage. These were internal/undocumented properties, and there is
no one-for-one replacement — consult the `ViewRowData` class for the supported public API, or
contact XH for guidance on migrating specific patterns.

Ensure you call the developer's attention to any such usages, as these are advanced cases and will
require direct developer review. Do not attempt to auto-update such usages yourself.

### 4. Review Precisely Sized Form Inputs (Visual Check)

Hoist v75 upgrades the default Inter UI font from v3 to v4.1 (`Inter Var` → `InterVariable`). The
`--xh-font-family` CSS variable is updated automatically, so most apps will see no impact. However,
the new font version includes subtle changes to letter spacing and tabular number widths.

If your app has form inputs — especially date inputs — that are precisely sized to just fit their
contents (e.g. via explicit `width` values in CSS or inline styles), review them visually after
upgrading. Values that fit perfectly before may now be slightly clipped or overflow. Widen any
affected inputs as needed.

## Verification Checklist

After completing all steps:

- [ ] `yarn install` / `npm install` completes without errors
- [ ] `npx tsc --noEmit` passes
- [ ] Application loads without console errors
- [ ] No removed APIs remain: `grep -rE "isLoadSupport|removeAllFiles|setDefaultHeaders|setDefaultTimeout|logoutAsync" client-app/src/`
- [ ] Cube/View-based visualizations render correctly (if applicable)

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) — canonical example of a Hoist app
