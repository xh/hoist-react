# Version Compatibility

Hoist applications are built on a pairing of **hoist-react** (client) and **hoist-core** (server).
These two libraries evolve together but are versioned independently. hoist-core does not guarantee
backward-compatible APIs across major versions, so running a mismatched pairing can cause failures
that are difficult to diagnose — error messages typically don't indicate a version mismatch.

This document provides a single reference for which hoist-core versions are required, recommended,
or tested with each hoist-react release.

## Maintaining This Document

Update this document whenever a new hoist-react major version is released or a new hoist-core
dependency is introduced. Use the following checklist:

1. Add a new row to the [Compatibility Matrix](#compatibility-matrix) with the new hoist-react
   version
2. Set **Min Core Required** if the release introduces a hard dependency on a new core version
   (check the CHANGELOG for "Requires hoist-core" entries)
3. Set **Recommended Core** if the release has features that benefit from a newer core version but
   don't strictly require it
4. Set **Max Core Tested** to the highest hoist-core version verified at the time of release
5. Update the [Reverse Lookup](#reverse-lookup-hoist-core--hoist-react) table if the new core
   version introduces breaking changes for older hoist-react versions
6. Link to upgrade notes if available

**Template row:**

```markdown
| XX.0 | -- | | YY.x | [Upgrade notes](./upgrade-notes/vXX-upgrade-notes.md) |
```

## Reading the Matrix

The compatibility matrix uses three requirement levels:

| Level | Meaning |
|---|---|
| **Min Core Required** | Hard minimum — the app won't function below this hoist-core version. hoist-core does not guarantee backward-compatible APIs, so this is a real constraint. |
| **Recommended Core** | Features available only with this core version or higher, but not a hard gate for basic operation. |
| **Max Core Tested** | The highest hoist-core version verified with this hoist-react release. Running a newer core is untested and could introduce incompatibilities. |

**Conventions:**
- `--` in Min Core Required means "unchanged from the previous version — scan down the table to
  find the last explicitly stated minimum."
- Max Core Tested represents the known-good ceiling. Developers running a core version above this
  should upgrade hoist-react to the version tested with that core.

## Compatibility Matrix

### v56+ (Active Support)

Verified against both hoist-react and hoist-core changelogs.

| hoist-react | Min Core Required | Recommended Core | Max Core Tested | Notes | Upgrade |
|---|---|---|---|---|---|
| 82.0 | -- | 36.3 | 36.3 | Admin Metrics tab | [Notes](./upgrade-notes/v82-upgrade-notes.md) |
| 81.0 | 36.1 | | 36.2 | Efficient identity init | [Notes](./upgrade-notes/v81-upgrade-notes.md) |
| 80.0 | -- | | 36.0 | | [Notes](./upgrade-notes/v80-upgrade-notes.md) |
| 79.0 | -- | 35.0 | 35.0 | `clientAppCode` tracking, log file deletion | [Notes](./upgrade-notes/v79-upgrade-notes.md) |
| 78.0 | -- | | 34.x | | [Notes](./upgrade-notes/v78-upgrade-notes.md) |
| 77.x | -- | | 33.x | Highcharts v12 (client-only) | |
| 76.0 | -- | 32.0 | 32.0 | View visibility editing, basic view state | |
| 75.0 | -- | | 31.x | WebSockets enabled by default | |
| 74.x | -- | | 31.x | ViewManager improvements | |
| 73.0 | 31.0 | | 31.0 | Consolidated Admin Clients tab, TrackLog properties | |
| 72.1 | -- | 28.1 | 28.1 | JSON Search in Admin Console | |
| 72.0 | -- | | 28.0 | Mobile Navigator rebuild | |
| 71.0 | 27.0 | | 27.0 | ViewManager, cluster state monitoring | |
| 70.0 | -- | | 26.x | ViewManager, persistence improvements | |
| 69.0 | 24.0 | | 24.0 | Activity tracking batch upload, memory monitoring | |
| 68.0 | 22.0 | | 22.0 | Consolidated Alert Banner polling | |
| 67.0 | 21.0 | | 21.0 | CachedValue (replaces ReplicatedValue) | |
| 66.x | -- | | 20.x | HoistAuthModel introduction | |
| 65.0 | -- | | 20.x | hoist-dev-utils >= 9 | |
| 64.0 | 20.0 | | 20.0 | Multi-instance clustering, AG Grid 31 | |
| 63.0 | 19.0 | | 19.0 | Activity/client error tracking APIs, Blueprint 5 | |
| 62.0 | -- | | 18.x | hoist-dev-utils >= 8 | |
| 61.0 | -- | 18.4 | 18.4 | Config override display in Admin Console | |
| 60.0 | 18.0 | | 18.0 | Role Management system | |
| 59.0 | -- | 17.2 | 17.2 | JDBC connection pool monitoring | |
| 58.0 | -- | 16.4 | 16.4 | `forceReload` version check, `TrackOptions.logData` | |
| 57.0 | -- | 16.3 | 16.3 | Alert banner presets, HOIST_IMPERSONATOR role | |
| 56.0 | 16.0 | | 16.0 | AG Grid 29, local prefs migration | |

### Pre-v56 (Historical / Best Effort)

Derived from changelog entries. Core version requirements may be approximate.

| hoist-react | Min Core Required | Recommended Core | Max Core Tested | Notes |
|---|---|---|---|---|
| 53.0 | 14.4 | | 14.4 | HOIST_ADMIN_READER role |
| 50.0 | 14.0 | | 14.0 | Excel export with FieldType |
| 48.0 | -- | 13.2 | 13.2 | Admin log file metadata |
| 44.0 | 10.0 | | 10.0 | JsonBlobService APIs, Alert Banner endpoints |
| 36.1 | 8.3 | | 8.3 | JsonBlobService, Admin Activity/Error tracking |
| 35.0 | 8.0 | | 8.0 | Admin Activity Tracking tab |
| 26.0 | ~6.1 | | 6.1 | WebSocket support |
| 15.0 | 5.0 | | 5.0 | Role loading, authentication changes |
| 5.0 | 3.0 | | 3.0 | Multi-environment config unwinding |

## Reverse Lookup: hoist-core → hoist-react

Since hoist-core does not guarantee backward compatibility with older hoist-react versions,
upgrading core without upgrading react can break things — not just miss features. Use this table
to find the minimum hoist-react version for a given core release.

| hoist-core | Min hoist-react | Notes |
|---|---|---|
| 36.3 | 82.0 recommended | Admin Metrics tab |
| 36.1 | 81.0 | Efficient identity init |
| 35.0 | 79.0 recommended | clientAppCode, log file deletion |
| 32.0 | 76.0 recommended | View state, visibility editing |
| 31.0 | 73.0 | Consolidated Admin Clients tab, TrackLog properties |
| 28.1 | 72.1 recommended | JSON Search in Admin Console |
| 27.0 | 71.0 | ViewManager, cluster state monitoring |
| 24.0 | 69.0 | Activity tracking batch upload |
| 22.0 | 68.0 | Consolidated Alert Banner polling |
| 21.0 | 67.0 | CachedValue |
| 20.0 | 64.0 | Multi-instance clustering |
| 19.0 | 63.0 | Activity/client error tracking APIs |
| 18.0 | 60.0 | Role Management system |
| 16.0 | 56.0 | AG Grid 29, local prefs migration |
| 14.4 | 53.0 | HOIST_ADMIN_READER role |
| 14.0 | 50.0 | Excel export with FieldType |
| 10.0 | 44.0 | JsonBlobService APIs |
| 8.0 | 35.0 | Admin Activity Tracking tab |

## Version Eras

A brief orientation to the major epochs of hoist-react / hoist-core development:

- **Modern Era (v64+, core v20+):** Multi-instance clustering, ViewManager, Java 17, AG Grid v31+,
  HoistAuthModel, Blueprint 5→6. Active support with upgrade notes for each major version.
- **Middle Era (v44–v63, core v10–v19):** JsonBlobService, Role Management system, AG Grid
  maturation (v28→v29), DashCanvas, Persistence API, TypeScript migration.
- **Early Era (v5–v43, core v3–v9):** Foundational authentication, WebSocket support, Activity
  Tracking, initial AG Grid and Blueprint integration.

## Common Pitfalls

### Running hoist-core below the required minimum

Error messages from a version mismatch typically don't indicate the root cause. Symptoms range from
missing API endpoints (404 errors) to subtle data format incompatibilities. Always check this
matrix before investigating other causes.

### Confusing "required" vs "recommended"

A **required** core version is a hard gate — the app will not function without it. A
**recommended** core version unlocks specific features but the app will run without it. Check the
CHANGELOG or upgrade notes for details on what each recommended version enables.

### Forgetting hoist-dev-utils compatibility

Some hoist-react upgrades also require a corresponding hoist-dev-utils upgrade (e.g. v62 requires
hoist-dev-utils >= v8, v65 requires >= v9). These are build-time dependencies, so failures appear
during `yarn start` or `yarn build` rather than at runtime.

### Upgrading hoist-core without upgrading hoist-react

hoist-core does not guarantee backward-compatible APIs with older hoist-react versions. Upgrading
core can break things, not just miss features. Always consult the [Reverse Lookup](#reverse-lookup-hoist-core--hoist-react) table and plan to upgrade both
libraries together.

## References

- [hoist-react CHANGELOG](../CHANGELOG.md) — version history and release notes
- [hoist-core CHANGELOG](https://github.com/xh/hoist-core/blob/develop/CHANGELOG.md) — server-side
  version history
- [hoist-dev-utils CHANGELOG](https://github.com/xh/hoist-dev-utils/blob/develop/CHANGELOG.md) —
  build tooling version history
- [Upgrade Notes](./upgrade-notes/) — step-by-step guides for major version upgrades
