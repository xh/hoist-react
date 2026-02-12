# Codebase Structure

**Analysis Date:** 2026-02-11

## Directory Layout

```
hoist-react/
├── admin/                  # Built-in admin console app
├── appcontainer/           # App shell (dialogs, themes, routing)
├── build/                  # Build output (not committed)
├── cmp/                    # Cross-platform components
├── core/                   # Foundation (HoistBase, HoistModel, XH)
├── data/                   # Store, Field, Filter, Cube
├── desktop/                # Desktop platform components
├── docs/                   # Documentation
├── dynamics/               # Dynamic component loading
├── exception/              # Exception handling
├── format/                 # Number/date formatters
├── icon/                   # Icon wrapper
├── inspector/              # Developer inspector tool
├── kit/                    # Third-party library wrappers
├── mobile/                 # Mobile platform components
├── mobx/                   # MobX integration and @bindable
├── node_modules/           # Dependencies (not committed)
├── promise/                # Promise extensions
├── public/                 # Static assets (index.html)
├── security/               # OAuth clients (MSAL, Auth0)
├── static/                 # Polyfills, static resources
├── styles/                 # Global SCSS
├── svc/                    # Built-in services
├── utils/                  # Async, datetime, JS, React utilities
├── .planning/              # GSD planning artifacts
├── package.json            # NPM package definition
├── tsconfig.json           # TypeScript config
└── yarn.lock               # Dependency lockfile
```

## Directory Purposes

**`/core/`:**
- Purpose: Framework foundation - HoistBase, HoistModel, HoistService, hoistCmp, XH singleton
- Contains: Base classes, decorators, element factories, lifecycle infrastructure
- Key files: `XH.ts`, `HoistBase.ts`, `HoistModel.ts`, `HoistService.ts`, `HoistComponent.ts`, `AppSpec.ts`, `elem.ts`
- Subdirectories: `/enums/`, `/impl/`, `/load/`, `/model/`, `/persist/`, `/types/`

**`/data/`:**
- Purpose: Observable data management layer
- Contains: Store, StoreRecord, Field, Cube, Filter system, validation
- Key files: `Store.ts`, `StoreRecord.ts`, `Field.ts`, `RecordAction.ts`, `UrlStore.ts`
- Subdirectories: `/cube/`, `/filter/`, `/impl/`, `/validation/`

**`/svc/`:**
- Purpose: Built-in singleton services
- Contains: 18 services including FetchService, ConfigService, PrefService, IdentityService
- Key files: `FetchService.ts`, `ConfigService.ts`, `PrefService.ts`, `IdentityService.ts`, `TrackService.ts`, `WebSocketService.ts`
- Subdirectories: `/storage/` (LocalStorageService, SessionStorageService)

**`/cmp/`:**
- Purpose: Cross-platform UI components
- Contains: Grid, Chart, DataView, Form, TabContainer, layout containers, filters
- Key subdirectories: `/grid/`, `/chart/`, `/dataview/`, `/form/`, `/tab/`, `/layout/`, `/card/`, `/filter/`, `/input/`
- Pattern: Each subdirectory contains model, component, and supporting files

**`/desktop/`:**
- Purpose: Desktop-specific components built on Blueprint UI
- Contains: Desktop AppContainer, Panel, buttons, inputs, toolbars, Grid helpers
- Key subdirectories: `/cmp/` (panels, buttons, inputs, grid, form, appbar)

**`/mobile/`:**
- Purpose: Mobile-specific components built on Onsen UI
- Contains: Mobile AppContainer, NavigatorModel, mobile panels, touch inputs
- Key file: `register.ts` (component registration)

**`/appcontainer/`:**
- Purpose: Application shell - lifecycle, dialogs, theming, routing
- Contains: AppContainerModel and supporting models
- Key files: `AppContainerModel.ts`, `ThemeModel.ts`, `RouterModel.ts`, `MessageModel.ts`, `ToastModel.ts`, `BannerModel.ts`
- Subdirectories: `/login/` (login UI components)

**`/utils/`:**
- Purpose: General utility functions and classes
- Contains: Timer, LocalDate, async utilities, decorators
- Subdirectories: `/async/`, `/datetime/`, `/js/`, `/react/`, `/impl/`

**`/format/`:**
- Purpose: Formatters for numbers, dates, miscellaneous display values
- Key files: `FormatNumber.ts`, `FormatDate.ts`, `FormatMisc.ts`, `FormatUtils.ts`

**`/promise/`:**
- Purpose: Promise prototype extensions
- Key files: Exports for `catchDefault`, `track`, `linkTo`, `timeout`, `wait`, `waitFor`

**`/mobx/`:**
- Purpose: MobX integration layer and @bindable decorator
- Key files: `Bindable.ts`, re-exports of MobX decorators with action enforcement

**`/icon/`:**
- Purpose: Font Awesome icon wrapper
- Key files: `Icon.ts`, `XHLogo.tsx`

**`/security/`:**
- Purpose: OAuth client implementations
- Subdirectories: `/msal/` (Microsoft), `/authzero/` (Auth0)

**`/kit/`:**
- Purpose: Third-party library integration wrappers
- Subdirectories: `/ag-grid/`, `/blueprint/`, `/highcharts/`, `/golden-layout/`, `/onsen/`, `/react-select/`, `/react-dates/`, `/react-markdown/`, `/react-dropzone/`, `/react-beautiful-dnd/`, `/swiper/`

**`/admin/`:**
- Purpose: Built-in admin console application
- Contains: Admin app for configs, prefs, activity, client monitoring
- Key files: `AppModel.ts`, `AppComponent.ts`
- Subdirectories: `/tabs/` (clients, cluster, monitor, general, activity, userData), `/regroup/`, `/differ/`, `/jsonsearch/`, `/columns/`

**`/inspector/`:**
- Purpose: Runtime developer tool for inspecting models/services/stores
- Subdirectories: `/instances/`, `/stats/`

**`/docs/`:**
- Purpose: Documentation markdown files
- Key files: `README.md` (documentation index), `lifecycle-app.md`, `lifecycle-models-and-services.md`, `authentication.md`, `persistence.md`, `build-and-deploy.md`, `development-environment.md`

**`/public/`:**
- Purpose: Static HTML and assets served directly
- Key file: `index.html` (loads polyfills and app entry)

**`/static/`:**
- Purpose: Polyfills and resources bundled with framework
- Key file: `polyfills.js`

**`/styles/`:**
- Purpose: Global SCSS stylesheets
- Contains: Base styles, theme variables, component styles

## Key File Locations

**Entry Points:**
- `public/index.html`: HTML shell loading polyfills and app script
- Applications provide: `App.ts` or similar (calls `XH.renderApp(appSpec)`)

**Configuration:**
- `package.json`: NPM package definition, dependencies, scripts
- `tsconfig.json`: TypeScript compiler configuration
- `eslint.config.js`: ESLint configuration
- `.prettierrc.json`: Code formatting rules
- `.stylelintrc`: SCSS linting rules
- `.nvmrc`: Node version specification (20)

**Core Framework API:**
- `/Users/amcclain/dev/hoist-react/core/XH.ts`: Framework singleton
- `/Users/amcclain/dev/hoist-react/core/HoistBase.ts`: Base class for all managed objects
- `/Users/amcclain/dev/hoist-react/core/HoistModel.ts`: Located at `/Users/amcclain/dev/hoist-react/core/model/HoistModel.ts`
- `/Users/amcclain/dev/hoist-react/core/HoistService.ts`: Service base class
- `/Users/amcclain/dev/hoist-react/core/AppSpec.ts`: Application specification class

**Testing:**
- No test files detected in codebase (applications handle their own testing)

## Naming Conventions

**Files:**
- PascalCase for classes/components: `GridModel.ts`, `AppContainerModel.ts`, `HoistBase.ts`
- camelCase for utilities: `elem.ts`, `index.ts`
- README.md for package documentation
- Kebab-case for concept docs: `lifecycle-app.md`, `build-and-deploy.md`

**Directories:**
- Lowercase for packages: `core`, `data`, `svc`, `cmp`
- camelCase for multi-word: `appcontainer`, `zoneGrid`
- Subdirectories often mirror file organization: `/impl/` for implementations, `/enums/` for enums

**Components:**
- Export both PascalCase component and camelCase factory: `[Grid, grid]`, `[Panel, panel]`
- Factory pattern via `hoistCmp.factory()` or `hoistCmp.withFactory()`

**Models:**
- Suffix with `Model`: `GridModel`, `TabContainerModel`, `AppContainerModel`
- Service classes suffix with `Service`: `FetchService`, `ConfigService`

**Observables:**
- Use `@observable` or `@bindable` decorators
- Ref-based observables: `@observable.ref` for objects/arrays
- Computed properties: `@computed` decorator on getters

## Where to Add New Code

**New Custom Service:**
- Implementation: Application-specific (not in hoist-react)
- Pattern: Extend `HoistService` from `/Users/amcclain/dev/hoist-react/core/HoistService.ts`
- Install: In application's `AppModel.initAsync()` via `XH.installServicesAsync()`
- Access: Via `XH.serviceName` after installation

**New Component:**
- Cross-platform component: `/Users/amcclain/dev/hoist-react/cmp/{feature}/`
- Desktop component: `/Users/amcclain/dev/hoist-react/desktop/cmp/{feature}/`
- Mobile component: `/Users/amcclain/dev/hoist-react/mobile/cmp/{feature}/`
- Pattern: Create `{Feature}Model.ts`, `{Feature}.ts`, `index.ts`
- Export: Factory and component from `index.ts`

**New Model:**
- Application models: Application-specific (not in hoist-react)
- Framework models: `/Users/amcclain/dev/hoist-react/{package}/` as appropriate
- Pattern: Extend `HoistModel`, add `@observable` state, implement `doLoadAsync()` if needed

**New Utility:**
- General utilities: `/Users/amcclain/dev/hoist-react/utils/{category}/`
- Promise extensions: `/Users/amcclain/dev/hoist-react/promise/`
- Format utilities: `/Users/amcclain/dev/hoist-react/format/`
- MobX utilities: `/Users/amcclain/dev/hoist-react/mobx/`

**New Data Structure:**
- Store-related: `/Users/amcclain/dev/hoist-react/data/`
- Filter-related: `/Users/amcclain/dev/hoist-react/data/filter/`
- Cube-related: `/Users/amcclain/dev/hoist-react/data/cube/`

**Application Code (not in hoist-react):**
- Application root: `App.ts` or `{AppName}App.ts`
- Application model: `AppModel.ts` (extends `HoistAppModel`)
- Panel models: `{Feature}Model.ts`
- Panel components: `{Feature}Panel.ts`
- Services: `{Feature}Service.ts`
- Follow conventions in sample apps (Jobsite, Veracity, DirectLend)

## Special Directories

**`/node_modules/`:**
- Purpose: Installed NPM dependencies
- Generated: Yes (via `yarn install`)
- Committed: No

**`/build/`:**
- Purpose: Compiled output from TypeScript
- Generated: Yes (via `tsc`)
- Committed: No

**`.planning/`:**
- Purpose: GSD command artifacts (codebase docs, phase plans)
- Generated: Yes (via `/gsd:map-codebase`, `/gsd:plan-phase`)
- Committed: No (typically)

**`/core/impl/`:**
- Purpose: Internal implementations not exposed in public API
- Contains: `InstanceManager`, `PlatformManager`, `InstallServices`
- Usage: Framework internals only

**`/cmp/{component}/impl/`:**
- Purpose: Internal component implementations
- Pattern: Used across Grid, Chart, Filter, Store components
- Usage: Supporting classes not meant for direct application use

**`/kit/`:**
- Purpose: Wraps third-party libraries to provide consistent integration
- Pattern: Each subdirectory wraps one library
- Usage: Import from kit packages rather than direct third-party imports

## Package Index Files

Most packages export via `index.ts`:
- `/Users/amcclain/dev/hoist-react/core/index.ts`
- `/Users/amcclain/dev/hoist-react/data/index.ts`
- `/Users/amcclain/dev/hoist-react/svc/index.ts`
- `/Users/amcclain/dev/hoist-react/cmp/{component}/index.ts`
- Pattern: Re-export public API, hide `/impl/` internals

## Import Path Patterns

**Framework imports:**
```typescript
import {HoistModel, XH, managed} from '@xh/hoist/core';
import {GridModel} from '@xh/hoist/cmp/grid';
import {Store} from '@xh/hoist/data';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {fmtNumber} from '@xh/hoist/format';
```

**Platform-specific imports:**
```typescript
// Desktop
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {textInput} from '@xh/hoist/desktop/cmp/input';

// Mobile
import {button} from '@xh/hoist/mobile/cmp/button';
import {page} from '@xh/hoist/mobile/cmp/page';
```

**Cross-platform components work everywhere:**
```typescript
import {grid} from '@xh/hoist/cmp/grid';
import {chart} from '@xh/hoist/cmp/chart';
```

---

*Structure analysis: 2026-02-11*
