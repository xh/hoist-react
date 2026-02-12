# Codebase Concerns

**Analysis Date:** 2026-02-11

## Tech Debt

**Blueprint tab panel margin override:**
- Issue: Using `!important` to override Blueprint tab panel margins without investigation
- Files: `/Users/amcclain/dev/hoist-react/kit/blueprint/styles.scss:7`
- Impact: May conflict with future Blueprint updates; unclear why override is needed
- Fix approach: Investigate root cause and use proper CSS specificity or Blueprint theming

**Grid background color class placement:**
- Issue: Styling rule `.xh-grid-clear-background-color` has unclear placement with TODO comment
- Files: `/Users/amcclain/dev/hoist-react/cmp/grid/Grid.scss:288-291`
- Impact: Organizational debt making stylesheet harder to maintain
- Fix approach: Determine proper location (likely in grid theming section) and move

**ViewManager autosave error handling:**
- Issue: TODO to improve error handling when autosaving a deleted view - currently silently fails
- Files: `/Users/amcclain/dev/hoist-react/cmp/viewmanager/ViewManagerModel.ts:640-646`
- Impact: Users may lose work without notification if view is deleted while editing
- Fix approach: Implement counter to alert after n failures, or detect deleted state proactively

**Deprecated API scheduled for removal:**
- Issue: `XH.appLoadModel` getter deprecated in v80, scheduled for removal in v82
- Files: `/Users/amcclain/dev/hoist-react/CHANGELOG.md:51`, `/Users/amcclain/dev/hoist-react/core/XH.ts`
- Impact: Breaking change for applications still using old getter
- Fix approach: Update consuming applications to use `XH.appLoadObserver` before v82 release

**AppContainerModel loadModel deprecated:**
- Issue: `AppContainerModel.loadModel` renamed to `loadObserver` with no alias
- Files: `/Users/amcclain/dev/hoist-react/CHANGELOG.md:52-53`
- Impact: Internal model, but any direct app usage will break
- Fix approach: Search for usage in sample apps and update before next major release

**GridModel updateColumnState deprecation:**
- Issue: Prior method for updating column state is deprecated (details in source)
- Files: `/Users/amcclain/dev/hoist-react/cmp/grid/GridModel.ts:1285`
- Impact: Applications using old method will need migration
- Fix approach: Review GridModel for deprecated method signature and migration path

**TypeScript `any` type usage:**
- Issue: 249 occurrences of `any` type across 111 TypeScript files
- Files: Widespread including `/Users/amcclain/dev/hoist-react/data/Store.ts`, `/Users/amcclain/dev/hoist-react/cmp/grid/GridModel.ts`, `/Users/amcclain/dev/hoist-react/core/XH.ts`
- Impact: Reduced type safety, harder to catch bugs at compile time
- Fix approach: Incrementally replace with proper types, focusing on public APIs first

**TypeScript override directives:**
- Issue: 109 uses of `eslint-disable`, `@ts-ignore`, or `@ts-expect-error` across 40 files
- Files: Including `/Users/amcclain/dev/hoist-react/data/Field.ts:2`, `/Users/amcclain/dev/hoist-react/security/BaseOAuthClient.ts:1`, `/Users/amcclain/dev/hoist-react/core/XH.ts:1`
- Impact: Suppressed type errors may hide real issues
- Fix approach: Review each usage; fix underlying type issues where possible

## Known Bugs

**Safari iOS orientation change zoom:**
- Symptoms: Safari re-zooms on orientation change if user has ever zoomed during session
- Files: `/Users/amcclain/dev/hoist-react/appcontainer/AppContainerModel.ts:182-192`
- Trigger: Rotate device after user has zoomed at any point
- Workaround: Temporarily set `maximum-scale=1` on orientation change, then remove - implemented in AppContainerModel

**Grid inline editing with grouping:**
- Symptoms: Inline editable Grid with `groupDisplayType` other than `groupRows` throws error
- Files: `/Users/amcclain/dev/hoist-react/CHANGELOG.md:21` (fixed in v81.0.0-SNAPSHOT)
- Trigger: Attempt inline editing in grid with grouping mode other than `groupRows`
- Workaround: Use `groupRows` display type or avoid inline editing with grouping

**Subform validation error access:**
- Symptoms: Attempting to access validation errors on subforms throws error
- Files: `/Users/amcclain/dev/hoist-react/CHANGELOG.md:22` (fixed in v81.0.0-SNAPSHOT)
- Trigger: Access validation errors from subform fields
- Workaround: Avoid accessing subform validation state directly (fixed in current snapshot)

## Security Considerations

**Input sanitization:**
- Risk: Framework does not enforce input sanitization - apps must implement themselves
- Files: `/Users/amcclain/dev/hoist-react/SECURITY.md:14-23`
- Current mitigation: DOMPurify library available as dependency (`dompurify@~3.3.0`)
- Recommendations: Add sanitization guidance to input component docs; provide utility wrappers for common sanitization scenarios

**Authentication responsibility:**
- Risk: OAuth and authentication implementation delegated to applications
- Files: `/Users/amcclain/dev/hoist-react/security/BaseOAuthClient.ts`, `/Users/amcclain/dev/hoist-react/SECURITY.md`
- Current mitigation: Framework provides OAuth clients (MSAL, Auth0) but configuration is app-specific
- Recommendations: Expand authentication documentation with security best practices

**Environment variables and secrets:**
- Risk: No built-in protection against committing secrets in app code
- Files: N/A (framework responsibility)
- Current mitigation: None enforced by framework
- Recommendations: Add example `.gitignore` patterns in docs; consider dev-time secret scanning utility

## Performance Bottlenecks

**Large file complexity:**
- Problem: Multiple files exceed 1500 lines, indicating high complexity
- Files: `/Users/amcclain/dev/hoist-react/cmp/grid/GridModel.ts` (2016 lines), `/Users/amcclain/dev/hoist-react/icon/index.ts` (1707 lines), `/Users/amcclain/dev/hoist-react/data/Store.ts` (1262 lines), `/Users/amcclain/dev/hoist-react/cmp/grid/columns/Column.ts` (1135 lines)
- Cause: GridModel and Store are central abstractions with many features; icon/index.ts is large icon library registration
- Improvement path: Icon registry could use code splitting; GridModel could split edit/export/filter into mixins or sub-models

**Grid scroll optimization tradeoff:**
- Problem: Scroll optimization improves performance but may not recalculate row heights when rendered
- Files: `/Users/amcclain/dev/hoist-react/cmp/grid/Grid.ts:441-452`
- Cause: Preemptive row height calculation improves scrolling but skips viewport-based recalculation
- Improvement path: Document tradeoffs in GridModel API; consider making optimization smarter about when to invalidate cache

**Store performance for large datasets:**
- Problem: Store operations may be slow with very large datasets
- Files: `/Users/amcclain/dev/hoist-react/CHANGELOG.md:299` (improvements implemented)
- Cause: Observable array operations and computed values recalculating on every change
- Improvement path: Continue profiling; consider virtualization patterns for > 10k records

**Cube/View update efficiency:**
- Problem: Inefficient updating of connected cube views prior to v80.0.1
- Files: `/Users/amcclain/dev/hoist-react/CHANGELOG.md:35-38`
- Cause: Unnecessary recalculation of views when cube updates
- Improvement path: Addressed with `Cube.lastUpdated` and `View.cubeUpdated` properties in v80.0.1

## Fragile Areas

**AG Grid dependency:**
- Files: `/Users/amcclain/dev/hoist-react/cmp/grid/GridModel.ts`, `/Users/amcclain/dev/hoist-react/cmp/grid/Grid.ts`, `/Users/amcclain/dev/hoist-react/cmp/ag-grid/AgGridModel.ts`
- Why fragile: Heavily dependent on ag-grid-community v34.x behavior; past updates required workarounds (see CHANGELOG.md:1848-1853)
- Safe modification: Test thoroughly against AG Grid version changes; use `AgGrid.DEFAULT_PROPS` for global config
- Test coverage: No automated tests found for grid (test files only in node_modules)

**OAuth token refresh logic:**
- Files: `/Users/amcclain/dev/hoist-react/security/BaseOAuthClient.ts:397-415`
- Why fragile: Complex retry and relogin logic with timing-dependent workarounds
- Safe modification: Add integration tests for token expiry scenarios; document retry state machine
- Test coverage: No test files found

**Golden Layout integration (dashboard):**
- Files: `/Users/amcclain/dev/hoist-react/desktop/cmp/dash/canvas/DashCanvasModel.ts`, `/Users/amcclain/dev/hoist-react/desktop/cmp/dash/container/DashContainerModel.ts`, `/Users/amcclain/dev/hoist-react/kit/golden-layout/index.js`
- Why fragile: Depends on unmaintained `golden-layout@1.5.9` library (last publish 2017)
- Safe modification: Thoroughly test layout persistence and resize behavior after any changes
- Test coverage: No test files found

**React-grid-layout integration (dashboard canvas):**
- Files: `/Users/amcclain/dev/hoist-react/desktop/cmp/dash/canvas/DashCanvasModel.ts:7,46`
- Why fragile: Dashboard canvas depends on `react-grid-layout@2.1.1` for drag/resize
- Safe modification: Test with various view configurations; verify persistence state
- Test coverage: No test files found

**React-dates integration:**
- Files: `/Users/amcclain/dev/hoist-react/kit/react-dates/datepicker.css`, `/Users/amcclain/dev/hoist-react/kit/react-dates/index.ts`, `/Users/amcclain/dev/hoist-react/mobile/cmp/input/DateInput.ts`
- Why fragile: Custom styling workaround for SASS-in-CSS issues (CHANGELOG.md:801)
- Safe modification: Avoid updating react-dates without testing date picker styling
- Test coverage: No test files found

**MobX observable/action coupling:**
- Files: Widespread - `/Users/amcclain/dev/hoist-react/mobx/decorators.ts`, `/Users/amcclain/dev/hoist-react/mobx/overrides.ts`
- Why fragile: Strict action enforcement (`enforceActions: 'always'`) means all state mutations must be in actions
- Safe modification: Always use `@action` decorator for methods that modify observables; use `runInAction` for async updates
- Test coverage: No test files found for MobX integration

**Circular dependency risk:**
- Files: `/Users/amcclain/dev/hoist-react/core/persist/PersistenceProvider.ts:197`, `/Users/amcclain/dev/hoist-react/core/ExceptionHandler.ts:221`, `/Users/amcclain/dev/hoist-react/kit/onsen/index.ts:50`
- Why fragile: Comments indicate awareness of circular structure risks, especially in PersistenceProvider and Onsen models
- Safe modification: Avoid creating new circular dependencies; use direct MobX reactions instead of HoistBase methods in infrastructure code
- Test coverage: No test files found

## Scaling Limits

**Icon library size:**
- Current capacity: 1707 lines in icon index - all icons loaded upfront
- Limit: Bundle size impact with all Font Awesome icons imported
- Scaling path: Implement code splitting for icon sets; lazy load icon subsets by category

**Grid record count:**
- Current capacity: Store performance improved for "very large grids" (CHANGELOG.md:2457)
- Limit: MobX observable arrays and computed values have overhead at scale (estimates > 50k records)
- Scaling path: Implement virtual scrolling for massive datasets; consider server-side paging

**Dashboard widget count:**
- Current capacity: react-grid-layout handles typical dashboard widget counts (< 50)
- Limit: Browser DOM/render performance with > 100 widgets
- Scaling path: Implement view-level lazy loading; render only visible widgets

## Dependencies at Risk

**Golden Layout (unmaintained):**
- Risk: `golden-layout@1.5.9` last published in 2017, no longer maintained
- Impact: Used in dashboard container (`DashContainerModel`) for dockable layouts
- Migration plan: Consider migrating to `golden-layout@2.x` (rc-golden-layout fork) or alternative like dockview

**React-dates (deprecated):**
- Risk: `react-dates@21.8.0` deprecated by Airbnb, no longer actively maintained
- Impact: Used in `DateInput` component
- Migration plan: Evaluate migration to react-day-picker or Blueprint's datetime components (already a dependency)

**jQuery dependency:**
- Risk: `jquery@3.x` is legacy technology in React apps
- Impact: Required by golden-layout and potentially Onsen UI
- Migration plan: Remove once golden-layout is replaced; audit Onsen UI usage

**Moment.js (legacy):**
- Risk: `moment@2.30.1` is in maintenance mode, team recommends alternatives
- Impact: Used throughout for date formatting and manipulation
- Migration plan: Migrate to `LocalDate` utility or modern alternative (date-fns, dayjs)

## Missing Critical Features

**Automated testing infrastructure:**
- Problem: No test files found in codebase (excluding node_modules)
- Blocks: Confident refactoring, regression prevention, continuous integration quality gates
- Priority: High - foundational for framework stability

**Performance profiling tools:**
- Problem: No built-in performance monitoring or profiling utilities for developers
- Blocks: Identifying bottlenecks in production apps, optimizing render performance
- Priority: Medium - impacts developer experience and app quality

**Error boundary integration:**
- Problem: No standardized React error boundary pattern in framework
- Blocks: Graceful error handling in component trees
- Priority: Medium - apps must implement themselves

## Test Coverage Gaps

**Core grid functionality:**
- What's not tested: GridModel, Column, sorting, filtering, inline editing, export
- Files: `/Users/amcclain/dev/hoist-react/cmp/grid/GridModel.ts`, `/Users/amcclain/dev/hoist-react/cmp/grid/Grid.ts`, `/Users/amcclain/dev/hoist-react/cmp/grid/columns/Column.ts`
- Risk: Regressions in grid behavior (selection, filtering, export) could go unnoticed
- Priority: High - grid is central component used in all applications

**Store and data layer:**
- What's not tested: Store operations (add, remove, update, revert), filtering, sorting, validation
- Files: `/Users/amcclain/dev/hoist-react/data/Store.ts`, `/Users/amcclain/dev/hoist-react/data/StoreRecord.ts`, `/Users/amcclain/dev/hoist-react/data/Field.ts`
- Risk: Data corruption or unexpected behavior with complex store operations
- Priority: High - store is foundational abstraction

**Form validation:**
- What's not tested: FormModel validation, FieldModel rules, SubformsFieldModel
- Files: `/Users/amcclain/dev/hoist-react/cmp/form/FormModel.ts`, `/Users/amcclain/dev/hoist-react/cmp/form/field/BaseFieldModel.ts`, `/Users/amcclain/dev/hoist-react/cmp/form/field/SubformsFieldModel.ts`
- Risk: Validation bugs affect data quality and user experience
- Priority: High - forms critical for data entry applications

**Authentication and security:**
- What's not tested: OAuth flows, token refresh, identity service
- Files: `/Users/amcclain/dev/hoist-react/security/BaseOAuthClient.ts`, `/Users/amcclain/dev/hoist-react/security/msal/MsalClient.ts`
- Risk: Security bugs or edge cases in auth flows
- Priority: High - security-critical code

**Dashboard persistence:**
- What's not tested: Dashboard state saving/loading, widget layout persistence
- Files: `/Users/amcclain/dev/hoist-react/desktop/cmp/dash/canvas/DashCanvasModel.ts`, `/Users/amcclain/dev/hoist-react/desktop/cmp/dash/container/DashContainerModel.ts`
- Risk: Lost user customizations, layout corruption
- Priority: Medium - impacts user experience but not data integrity

**Cube and pivot functionality:**
- What's not tested: Cube calculations, View aggregations, dimension pivoting
- Files: `/Users/amcclain/dev/hoist-react/data/cube/Cube.ts`, `/Users/amcclain/dev/hoist-react/data/cube/View.ts`
- Risk: Incorrect aggregation results, performance issues with large cubes
- Priority: Medium - used in analytics applications

**Promise extensions:**
- What's not tested: catchDefault, linkTo, timeout, tracking extensions
- Files: `/Users/amcclain/dev/hoist-react/promise/Promise.ts`
- Risk: Error handling edge cases, timeout failures
- Priority: Medium - affects error handling patterns throughout apps

---

*Concerns audit: 2026-02-11*
