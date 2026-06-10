# Hoist React v84 Upgrade Notes

> **From:** v83.x → v84.0.0 | **Released:** 2026-04-15 | **Difficulty:** 🟢 LOW

## Overview

Hoist React v84 is a major release paired with hoist-core v38. The headline additions are
FontAwesome v7, an icon-based `Spinner` replacement, client-side span sampling for `TraceService`,
and a new typed `defaults` mechanism for `hoistCmp` components.

The most significant app-level impacts are:

- **`hoist-core >= 38.0` required** — paired major release
- **`getClassName()` removed** — unlikely to affect apps (no known usage), but check imports
- **FontAwesome v7** — visual tweaks to icons; no app changes expected

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v83.x
- [ ] **hoist-core** upgraded to >= v38.0 (**required** — paired major release)

## Upgrade Steps

### 1. Update `hoistCoreVersion` in `gradle.properties`

Hoist React v84 **requires** hoist-core >= v38.0.

**File:** `gradle.properties`

Before:
```properties
hoistCoreVersion=37.0.2
```

After:
```properties
hoistCoreVersion=38.0.0
```

### 2. Update `package.json`

Bump hoist-react to v84.

**File:** `package.json`

Before:
```json
"@xh/hoist": "~83.1.0"
```

After:
```json
"@xh/hoist": "~84.0.0"
```

Then run `yarn install` or `npm install` to update dependencies.

### 3. Remove `getClassName` Import (if applicable)

The `getClassName()` utility has been removed from `@xh/hoist/utils/react`. This function had no
remaining usages in the framework, and no known app usages. If your app imported it directly, use
the `className` spec field on `hoistCmp.factory()` / `hoistCmp.withFactory()` instead — it handles
base class merging automatically.

**Find affected files:**
```bash
grep -rE "getClassName.*from '@xh/hoist" client-app/src/
```

Note: apps that define their own local `getClassName` helpers (not imported from `@xh/hoist`) are
not affected.

### 4. Review FontAwesome v7 Icon Changes (visual only)

FontAwesome has been updated from v6 to v7. All previously supported icons remain available. The
upgrade brings subtle visual tweaks and performance optimizations — no API changes are required.

Review any areas of your app where precise icon sizing or spacing is critical, as minor visual
adjustments to individual glyphs are possible across major FA versions.

If your app depends on `@fortawesome/free-brands-svg-icons` (for brand icons like GitHub, Slack,
etc.), consider updating it to v7 as well to keep icon versions consistent:

```json
"@fortawesome/free-brands-svg-icons": "^7.2.0"
```

### 5. Migrate Deprecated Static Properties to `static defaults` (if not done in v83)

If you have not yet migrated from the deprecated ad-hoc static properties on `GridModel`,
`ChartModel`, `ExceptionHandler`, and `FetchService`, do so now. These were deprecated in v83 and
are scheduled for removal in v85. See the
[v83 upgrade notes](./v83-upgrade-notes.md#3-migrate-deprecated-static-properties-to-static-defaults-recommended)
for detailed before/after examples.

**Find affected files:**
```bash
grep -rE "GridModel\.(DEFAULT_AUTOSIZE_MODE|DEFAULT_RESTORE_DEFAULTS_WARNING|defaultContextMenu)|ChartModel\.defaultContextMenu|ExceptionHandler\.(REDACT_PATHS|ALERT_TYPE|TOAST_PROPS)|FetchService\.(autoGenCorrelationIds|genCorrelationId|correlationIdHeaderKey)" client-app/src/
```

### 6. Migrate Deprecated Filter Utilities (if not done in v83)

If you have not yet migrated from the deprecated standalone filter utilities (`withFilterByField`,
`withFilterByKey`, `replaceFilterByKey`, `withFilterByTypes`), do so now. These were deprecated
in v82 and are scheduled for removal in v85. See the
[v82 upgrade notes](./v82-upgrade-notes.md#5-migrate-deprecated-filter-utilities) for detailed
before/after examples.

**Find affected files:**
```bash
grep -rE "withFilterByField|withFilterByKey|replaceFilterByKey|withFilterByTypes" client-app/src/
```

## Verification Checklist

After completing all steps:

- [ ] `hoistCoreVersion` in `gradle.properties` is >= 38.0.0
- [ ] `yarn install` / `npm install` completes without errors
- [ ] `yarn lint` / `npm run lint` passes (or only pre-existing warnings remain)
- [ ] `npx tsc --noEmit` passes
- [ ] Application loads without console errors
- [ ] No `getClassName` imports from hoist-react remain:
  `grep -rE "getClassName.*from '@xh/hoist" client-app/src/`
- [ ] Icons render correctly throughout the app (spot-check grids, toolbars, menus)
- [ ] Spinner renders correctly on loading screens
- [ ] No deprecated static property warnings in console:
  `grep -rE "DEFAULT_AUTOSIZE_MODE|DEFAULT_RESTORE_DEFAULTS_WARNING|defaultContextMenu|REDACT_PATHS|ALERT_TYPE|TOAST_PROPS" client-app/src/`
- [ ] No deprecated filter utilities remain:
  `grep -rE "withFilterByField|withFilterByKey|replaceFilterByKey|withFilterByTypes" client-app/src/`

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) — canonical example of a Hoist app
