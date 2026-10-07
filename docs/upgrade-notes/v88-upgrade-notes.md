# Hoist React v88 Upgrade Notes

> **From:** v87.x → v88.1.2 | **Released:** 2026-09-28 | **Difficulty:** 🔴 HIGH
>
> **Target v88.1.2 or later.** It restores `MsalClient` defaults that 88.0 dropped and fixes a
> codemod that could delete constructors. Earlier 88 releases are not recommended.

## Overview

Hoist React v88 changes how Hoist apps are written and built. The framework moves from TypeScript's
legacy `experimentalDecorators` to **TC39 Stage 3 decorators**, which requires the `accessor`
keyword on every observable field and retires the `makeObservable(this)` boilerplate. That change
is build-wide, so v88 pairs with **`@xh/hoist-dev-utils` 16**, which emits the new decorator
transform and replaces webpack with **Rsbuild**. Alongside these, v88 upgrades to **MobX 7** and
**AG Grid 36**, and completes the removals scheduled in v86.

Most of the work is mechanical and covered by codemods shipped in the hoist-react package. The
sections that need judgment are the `@persist` ordering audit, custom SCSS targeting AG Grid
internals, and the Rsbuild config migration.

The most significant app-level impacts are:

- **TC39 decorators** - add `accessor` to `@observable` / `@bindable` fields, remove
  `makeObservable(this)`, drop `experimentalDecorators` from `tsconfig.json`. Codemods do most
  of it - see Step 4.
- **`@xh/hoist-dev-utils` 16 with Rsbuild** - replace `webpack.config.js` with
  `rsbuild.config.mjs`, update scripts and CI - see Step 2.
- **MobX 7** - dotted annotations and comparers become named exports (`@observableRef`,
  `@bindableRef`, `compareShallow`). A codemod applies the renames - see Step 4.
- **AG Grid 36** - bump to `36.2`, remove the legacy CSS theme setup from `Bootstrap`, and
  retarget any SCSS aimed at AG Grid internals or the balham theme classes - see Steps 5-6.
- **React 19.3** - bump `react`, `react-dom`, and `@types/react*`. No source changes.
- **Scheduled removals** - `HoistBase.withSpan()`, `FetchOptions.span` / `loadSpec`,
  `PopoverFilterChooser`, `LogSource`, and the `Col`-suffixed column aliases - see Step 7.
- **Routed `TabContainerModel`** - a tab's own route params no longer carry over to sibling tabs.
  Affects only apps whose sibling tabs share a param - see Step 8.

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v87.x with `@xh/hoist-dev-utils` 15.x.
- [ ] **Node.js >= 22.15** - required by `@xh/hoist-dev-utils` 16.
- [ ] **hoist-core** at >= 40.5.0 (unchanged floor). **hoist-core 42.0 is recommended** - it
  moves global ViewManager write access to the server, and v88 reads that setting. See
  [Version Compatibility](../version-compatibility.md).
- [ ] Your package manager (**pnpm**, **yarn**, or **npm**) is available and working.
- [ ] A clean working tree. The codemods in Step 4 rewrite many files - commit first so the
  changes can be reviewed as a diff.

## Upgrade Steps

Take Steps 1-4 together in one commit. hoist-react 88 and dev-utils 16 cannot be mixed with their
predecessors: a legacy-decorator app built with dev-utils 16 loses every `@observable` and
`@bindable` field silently, and dev-utils 15 cannot build v88 at all.

### 1. Update `package.json`

Bump hoist-react to v88, `@xh/hoist-dev-utils` to `^16.0.0`, React to 19.3, and AG Grid to 36.2.

**File:** `package.json`

Before:

```json
"dependencies": {
    "@xh/hoist": "^87.0.0",
    "ag-grid-community": "~35.3.0",
    "ag-grid-enterprise": "~35.3.0",
    "ag-grid-react": "~35.3.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
},
"devDependencies": {
    "@types/react": "~19.2.0",
    "@types/react-dom": "~19.2.0",
    "@xh/hoist-dev-utils": "^15.0.1"
}
```

After:

```json
"dependencies": {
    "@xh/hoist": "^88.0.0",
    "ag-grid-community": "~36.2.0",
    "ag-grid-enterprise": "~36.2.0",
    "ag-grid-react": "~36.2.0",
    "react": "^19.3.0",
    "react-dom": "^19.3.0"
},
"devDependencies": {
    "@types/react": "~19.3.0",
    "@types/react-dom": "~19.3.0",
    "@xh/hoist-dev-utils": "^16.0.0"
}
```

Also:

- If the app declares `mobx` or `mobx-react-lite` directly, bump them to `7.x` and `5.x`. Most
  apps import MobX through `@xh/hoist/mobx` and declare neither.
- If a `resolutions` / `overrides` block pins `@types/react`, update it to `19.3`.
- If the app declares `ag-charts-community` (for sparklines or integrated charts), bump it to
  `~14.2.0`, the version AG Grid 36.2 pins.
- **AG Grid Enterprise license:** 36.2 requires a license valid for releases on or after
  2 June 2026. An older key shows a watermark and a console error - check before upgrading.
- **pnpm apps:** replace the webpack entries in `pnpm-workspace.yaml` `publicHoistPattern` with
  `@rsbuild/core`, so the `rsbuild` bin is on the script path.

  ```yaml
  publicHoistPattern:
    - '@rsbuild/core'
  ```

Do not run install yet - finish Step 2 first, or the old `webpack` scripts will fail.

### 2. Replace `webpack.config.js` with `rsbuild.config.mjs`

`@xh/hoist-dev-utils` 16 is Rsbuild-only. `configureWebpack()` is gone, replaced by
`configureRsbuild()`, which takes the same options with a few renames.

**File:** `client-app/webpack.config.js` (delete) → `client-app/rsbuild.config.mjs` (create)

Before:

```javascript
const configureWebpack = require('@xh/hoist-dev-utils/configureWebpack'),
    pkg = require('./package.json');

module.exports = (env = {}) => {
    return configureWebpack({
        appCode: 'myapp',
        appName: 'My App',
        appVersion: pkg.version,
        favicon: './public/favicon.svg',
        devServerOpenPage: 'app/',
        ...env
    });
};
```

After:

```javascript
import configureRsbuild, {readCliEnv} from '@xh/hoist-dev-utils/configureRsbuild';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url),
    pkg = require('./package.json');

export default ({envMode}) => {
    return configureRsbuild({
        appCode: 'myapp',
        appName: 'My App',
        appVersion: pkg.version,
        favicon: './public/favicon.svg',
        devServerOpenPage: 'app/',
        prodBuild: envMode === 'prod',
        inlineHoist: envMode === 'inlineHoist',
        ...readCliEnv()
    });
};
```

Option renames, if the app used them: `babelPresetEnvOptions` → `swcOptions`, `terserOptions` →
`minifyOptions`, `stats` / `infrastructureLoggingLevel` → `logLevel`, `babelIncludePaths` /
`babelExcludePaths` → `extraIncludePaths` / `extraExcludePaths`. The first three are rejected with
a pointer to the replacement; the path options still work with a deprecation warning.
`analyzeBundles` has no replacement - drop it and use Rsbuild's built-in Rsdoctor support.

Update the scripts. Build-time overrides become `XH_*` environment variables, because the
Rsbuild CLI has no `--env key=value` flag.

**File:** `client-app/package.json`

Before:

```json
"build": "webpack --env prodBuild",
"start": "pnpm install && cross-env NODE_OPTIONS=--max_old_space_size=3072 webpack-dev-server",
"startWithHoist": "pnpm install && cross-env NODE_OPTIONS=--max_old_space_size=3072 webpack-dev-server --env inlineHoist",
"startWithIp": "pnpm start --env devHost=$(ipconfig getifaddr en0)"
```

After:

```json
"build": "rsbuild build --env-mode prod",
"start": "pnpm install && rsbuild dev",
"startWithHoist": "pnpm install && rsbuild dev --env-mode inlineHoist",
"startWithIp": "XH_DEV_HOST=$(ipconfig getifaddr en0) pnpm start"
```

Delete any `*AndAnalyze` scripts - `analyzeBundles` is gone. Keep `cross-env` in front of any
`XH_*` assignment that must run on Windows. `readCliEnv()` maps a fixed set of `XH_*` variables
onto options - for example `--env devHttps=true` becomes `XH_DEV_HTTPS=true`. Not every option
has one - `readCliEnv()` in `@xh/hoist-dev-utils/configureRsbuild.js` lists them.

Update CI release builds the same way:

```bash
# Before
pnpm build --env appVersion="$VERSION" --env appBuild="$TAG"
# After
XH_APP_VERSION="$VERSION" XH_APP_BUILD="$TAG" pnpm build
```

Per-developer defaults such as `XH_DEV_HOST` belong in a gitignored `client-app/.env.local`, which
Rsbuild loads on every run. Add `.env.local` and `.env.*.local` to `.gitignore`.

Apps carrying their own `declare module '*.png'` / `'*.md'` style declarations in a local
`types.d.ts` can drop them - hoist-react's `assets.d.ts` now covers the common asset types.

Now run `pnpm install` / `yarn install` / `npm install`, then `pnpm dedupe` / `npm dedupe`. An
in-place upgrade can leave older copies of packages that Hoist now requires at a newer version -
`@codemirror/state` and `@codemirror/view` in particular - and `tsc` then fails inside Hoist's
`CodeInput` with conflicting types.

If an AI agent runs the upgrade with the hoist-react MCP server, restart the server now. In Claude
Code, reconnect with `/mcp` or restart the session. The server reads the installed `@xh/hoist`
version only when it starts, so until then it answers with v87 docs and types. The `hoist-docs`
and `hoist-ts` CLI tools read the installed version on each call and need no restart.

See the [dev-utils migration guide](https://github.com/xh/hoist-dev-utils/blob/develop/README.md#migrating-from-v15-webpack)
for the full option reference, and Toolbox's
[`rsbuild.config.mjs`](https://github.com/xh/toolbox/blob/develop/client-app/rsbuild.config.mjs)
for a worked example. Toolbox tracks `next`, so its version numbers will not match the block
above.

### 3. Update `tsconfig.json`

Remove `experimentalDecorators`. TC39 decorators are TypeScript's default.

**File:** `client-app/tsconfig.json`

Before:

```json
"compilerOptions": {
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "jsx": "react",
```

After:

```json
"compilerOptions": {
    "allowSyntheticDefaultImports": true,
    "jsx": "react",
```

Remove it from any other `tsconfig.json` that compiles app sources, such as a Playwright or other
E2E test project. Those fail with decorator errors until it is gone.

### 4. Migrate decorators and MobX names

Three codemods ship in the hoist-react package under `docs/codemod/v88/`. Each takes a `--dry`
flag and one or more paths, and rewrites `.ts` / `.tsx` files in place. Run them from the app
root against the client source:

```bash
CODEMODS=client-app/node_modules/@xh/hoist/docs/codemod/v88

# 1. Rename MobX 7 dotted annotations and comparers: @observable.ref -> @observableRef,
#    @bindable.ref -> @bindableRef, @computed.struct -> @computedStruct, comparer.* -> compare*.
#    Also redirects direct 'mobx' imports through '@xh/hoist/mobx'.
node $CODEMODS/codemod-mobx7-rename.mjs client-app/src

# 2. Insert `accessor` on every @observable / @bindable field.
node $CODEMODS/codemod-add-accessor.mjs client-app/src

# 3. Delete makeObservable(this) calls, now-empty constructors, and unused imports.
node $CODEMODS/codemod-remove-makeObservable.mjs client-app/src
```

The net effect on a typical model:

Before:

```typescript
import {bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';

export class UsersModel extends HoistModel {
    @observable.ref users: User[] = [];
    @bindable selectedUserId: string = null;
    @bindable @persist showInactive = false;

    @computed
    get selectedUser() {
        return this.users.find(it => it.id === this.selectedUserId);
    }

    constructor() {
        super();
        makeObservable(this);
    }
}
```

After:

```typescript
import {bindable, computed, observable, observableRef} from '@xh/hoist/mobx';

export class UsersModel extends HoistModel {
    @observableRef accessor users: User[] = [];
    @bindable accessor selectedUserId: string = null;
    @bindable @persist accessor showInactive = false;

    @computed
    get selectedUser() {
        return this.users.find(it => it.id === this.selectedUserId);
    }
}
```

`@computed` (getters), `@action` (methods), and `@managed` (plain properties) do not take
`accessor`. The codemods rewrite imports without regard to the app's Prettier config, so run
`npx prettier --write client-app/src` (or the app's lint-fix script) next. Then run
`npx tsc --noEmit` and the linter - any site the codemods missed surfaces as a decorator-signature
error, and leftover imports as unused-variable warnings. One known skip: a field whose final
decorator line is a call form with a trailing comment, such as
`@persist.with({...}) // note`, gets no `accessor` - add it by hand.

**Check for lost constructors.** Versions of `codemod-remove-makeObservable.mjs` before 88.1.2
could delete a constructor that merged defaults into its `super()` call, such as
`super({...defaults, ...config})`, mistaking it for an empty pass-through. If you ran an earlier
copy, scan the diff for removed `super(` lines that took anything other than the constructor's own
params:

```bash
git diff <pre-upgrade-ref> -- 'client-app/src/**/*.ts' 'client-app/src/**/*.tsx' | grep -A3 '^-\s*super('
```

**Audit `@persist` ordering by hand.** `@persist` must now come *after* the MobX decorator. The
codemods do not reorder decorators, and a reversed pair fails silently: `PersistenceProvider`
logs an error to the console and the field simply stops persisting, with no type error.

```bash
# Reversed on one line: `@persist @bindable ...`, `@persist.with({...}) @observable ...`
grep -rnE '@persist(\.with\(.*\))?\s+@(bindable|observable)' client-app/src/

# Reversed across lines: prints the MobX decorator line under a leading `@persist`
grep -rnE -A1 '^\s*@persist(\.with\(.*\))?\s*(//.*)?$' client-app/src/ | grep -E '^\S+-[0-9]+-\s*@(bindable|observable)'
```

The stacked form, with `@persist.with({...})` on its own line above `@bindable`, is easy to miss
in review. The second command finds it.

Before:

```typescript
@persist @bindable accessor showInactive = false;

@persist.with({path: 'gridState'})
@bindable accessor gridState = null;
```

After:

```typescript
@bindable @persist accessor showInactive = false;

@bindable
@persist.with({path: 'gridState'})
accessor gridState = null;
```

**Audit enumeration of model instances.** `accessor` fields are prototype getter/setters, not own
enumerable properties, so `Object.keys(model)`, `JSON.stringify(model)`, and spread
(`{...model}`) no longer see them. Read named properties instead.

```bash
grep -rn "Object.keys(this)\|JSON.stringify(this)\|{\.\.\.this}" client-app/src/
```

That grep is a starting point - also check helpers that enumerate a model passed in as an argument.

**Class-level `@managed`.** Legacy decorators silently ignored a stray `@managed` on a class
declaration. TC39 decorators reject it at compile time - delete it. The codemods leave it alone.

```bash
grep -rn -B1 "^export class \|^class " client-app/src/ | grep "@managed"
```

**Runtime import cycles.** Decorators now run at class-definition time, so a runtime import cycle
that was benign under legacy decorators can throw a `ReferenceError` at startup, when a decorator
evaluates before its binding initializes. If the app fails to boot after this step, look for
cycles through barrel files. Enabling `@typescript-eslint/consistent-type-imports` and applying
its autofix erases type-only edges and resolves most cases.

### 5. Update `Bootstrap.ts` - remove the legacy AG Grid theme setup

Hoist now styles grids through AG Grid's Theming API. The legacy CSS theme conflicts with it, so
remove the `provideGlobalGridOptions({theme: 'legacy'})` call and the theme stylesheet imports.

**File:** `client-app/src/Bootstrap.ts`

Before:

```typescript
import {ModuleRegistry, provideGlobalGridOptions} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-balham.css';

// ...module registration...

provideGlobalGridOptions({theme: 'legacy'});
installAgGrid(AgGridReact as any, ClientSideRowModelModule.version);
```

After:

```typescript
import {ModuleRegistry} from 'ag-grid-community';

// ...module registration...

installAgGrid(AgGridReact as any, ClientSideRowModelModule.version);
```

Module registration is unchanged from v87. Apps registering `ValidationModule` in development may
keep doing so, or switch to AG Grid 36's `enableDevValidations()` for finer control over what it
reports - see Toolbox's `Bootstrap.ts` for an example.

### 6. Update SCSS targeting AG Grid

AG Grid 36 restructures the grid DOM into a single scrollable container and renames its internal
layout classes. Hoist also no longer applies the `.ag-theme-balham` / `.ag-theme-balham-dark`
classes. Only apps with custom SCSS or DOM queries reaching into AG Grid are affected - for
example, `.ag-body-viewport` is now `.ag-grid-viewport`, and `.ag-floating-top` /
`.ag-floating-bottom` are now `.ag-grid-pinned-top-rows` / `.ag-grid-pinned-bottom-rows`.

**Find affected files:**

```bash
grep -rn "ag-theme-\|ag-floating-top\|ag-floating-bottom\|ag-center-cols\|ag-body-viewport\|ag-pinned-" client-app/src/
```

Review every `ag-theme-` hit, including wildcard selectors such as `[class*='ag-theme-']`. AG Grid's
theming API applies its own generated `ag-theme-*` class, so a wildcard selector left in place can
match it by accident.

If the app has E2E or other test code that selects grid elements (for example a Playwright
project), run the same search there. A selector for a renamed class matches nothing, and a test
that skips when it finds no rows then passes without asserting anything.

For theme-class selectors, retarget to Hoist's `.xh-ag-grid` wrapper, or better, express the
override as theme params. The new `GridModel.theme` config takes AG Grid theme param overrides for
one grid, and `AgGridModel.defaults.theme` applies them app-wide.

Before:

```scss
.ag-theme-balham .ag-header {
    background-color: navy;
}
```

After (preferred - theme params):

```typescript
new GridModel({
    theme: {headerBackgroundColor: 'navy'},
    // ...
});
```

After (CSS, where params do not suffice):

```scss
.xh-ag-grid .ag-header {
    background-color: navy;
}
```

For internal layout classes, consult the
[AG Grid 36 upgrade guide](https://www.ag-grid.com/react-data-grid/upgrading-to-ag-grid-36/) for
the new names. Theme defaults now resolve against an inner `.ag-styled-root` element.

`GridModel.enableFullWidthScroll` is now a no-op - AG Grid 36 renders a single full-width
horizontal scrollbar natively. Remove the config from any `GridModel` that sets it.

### 7. Migrate off removed APIs

All of these were deprecated in v86 or earlier. Search for each and replace as shown.

```bash
grep -rn "withSpan\|mergePersistOptions\|PopoverFilterChooser\|LogSource" client-app/src/
grep -rnw "boolCheckCol\|numberCol\|fileExtCol\|dateCol\|timeCol\|dateTimeCol\|compactDateCol\|localDateCol" client-app/src/
grep -rn -A4 "XH.fetch" client-app/src/ | grep "span:\|loadSpec:"
```

Hits on `this.runner({span})` or `loadAsync({span})` are fine - those APIs keep their fields.

| Removed | Replacement |
|---|---|
| `HoistBase.withSpan()` | `this.runner().span(...)`. `TraceService.withSpan()` remains for advanced use. |
| `FetchOptions.span` / `FetchOptions.loadSpec` | Pass a `CallContextLike` as the second argument. |
| `PersistenceProvider.mergePersistOptions()` | `persistOptions()` |
| `PopoverFilterChooser` | `filterChooser({popover: true})` |
| `LogSource` type | `NameSource` from `@xh/hoist/utils/js` |
| `boolCheckCol`, `numberCol`, `fileExtCol`, `dateCol`, `timeCol`, `dateTimeCol`, `compactDateCol`, `localDateCol` | The un-suffixed spec: `boolCheck`, `number`, `fileExt`, `date`, `time`, `dateTime`, `compactDate`, `localDate` |

Before:

```typescript
await XH.fetch({url: 'fileManager/download', params: {filename}, span: ctx.span});

columns: [{field: 'tradeDate', ...localDateCol}]
```

After:

```typescript
await XH.fetch({url: 'fileManager/download', params: {filename}}, {span: ctx.span});

columns: [{field: 'tradeDate', ...localDate}]
```

Toolbox's Admin Console imports the column specs as a namespace to keep them readable next to
the `number` type: `import * as Col from '@xh/hoist/cmp/grid/columns'`, then `...Col.number`.

### 8. Review routed `TabContainerModel` params

A routed container no longer forwards a tab's own route params to the sibling tab being
activated. Only params declared by the container's route, or an ancestor route, carry over. Apps
whose sibling tabs each declared the same param, relying on it bleeding across, must declare it
once on the parent route instead.

**Find affected files:**

```bash
grep -rln "TabContainerModel\|tabContainer(" client-app/src/ | xargs grep -n "route:"
```

Before (each sibling declares `?view`, expecting it to persist across tab switches):

```typescript
{
    name: 'reports',
    path: '/reports',
    children: [
        {name: 'summary', path: '/summary?view'},
        {name: 'detail', path: '/detail?view'}
    ]
}
```

After (declared once on the shared parent):

```typescript
{
    name: 'reports',
    path: '/reports?view',
    children: [
        {name: 'summary', path: '/summary'},
        {name: 'detail', path: '/detail'}
    ]
}
```

Sibling tabs that deliberately own separate values of a same-named param now get that behavior
for free - see Toolbox's Routing example under Layout > Tab Container.

Routed containers also now restore each tab's last route and params when the user switches back.
Set `restoreTabRouteParams: false` on the container to opt out.

### 9. Other notable changes

None of these break compilation, but review the ones that apply.

- **Global ViewManager access moves to the server** (hoist-core 42). `ViewManagerModel.manageGlobal`
  now defaults to the server's `xhJsonBlobConfig.globalWriteRoles` setting. Once on core 42,
  remove app-side `manageGlobal: XH.getUser().isHoistAdmin` configs and set the role on the
  server. An explicit `true` no longer grants access beyond the server's.
- **`ExceptionHandlerOptions.hideParams`** is deprecated in favor of `redactPaths`, which redacts
  matching keys at any depth and covers common secret names by default.
- **Single-line text inputs trim whitespace** on commit. Pass `trimWhitespace: false` to opt out.
- **Banner CSS**: `XH.showBanner()` now renders the new `Banner` component. Its root is no longer
  a `Toolbar`, and `.xh-banner__click_target` is now `.xh-banner__content`.
- **Grid cell and tooltip CSS**: cell validation classes `.xh-cell--invalid` / `--warning` /
  `--info` are deprecated in favor of `.xh-cell--flag-{intent}`. The `.xh-grid-tooltip--default`
  and `--custom` classes are removed - target `.xh-grid-tooltip` or the new
  `.xh-grid-tooltip-frame` utility. `--validation--single` is now `--validation-single`.

  ```bash
  grep -rn "xh-banner__click_target\|xh-cell--invalid\|xh-cell--warning\|xh-cell--info\|xh-grid-tooltip--" client-app/src/
  ```

- **Menu item typing tightened.** `GridContextMenuItemLike` and `MenuItemLike` no longer accept
  an open `string`. A menu array built from dynamic strings, such as `items.map(...)`, now needs
  an explicit `MenuItemLike[]` / `GridContextMenuItemLike[]` annotation or cast. Shows up as a
  `tsc` error, not at runtime.
- **Hand-built popover menus** can move to the new desktop `Menu` / `MenuButton` components,
  which take the same `MenuItem` configs as grid context menus.

## Verification Checklist

After completing all steps:

- [ ] `pnpm install` / `yarn install` / `npm install` completes without errors
- [ ] `npx tsc --noEmit` passes - the authoritative check that no `accessor` site was missed
- [ ] `pnpm lint` / `yarn lint` / `npm run lint` passes (or only pre-existing warnings remain)
- [ ] `grep -rn "makeObservable\|experimentalDecorators" client-app/src client-app/tsconfig.json`
  returns nothing
- [ ] Both `@persist` ordering greps from Step 4 return nothing (`@persist` comes after the MobX
  decorator, on one line or stacked)
- [ ] Dev server starts with `rsbuild dev`; production build succeeds and CI passes its version
  and build tag through `XH_APP_VERSION` / `XH_APP_BUILD`
- [ ] Application loads without console errors, including no AG Grid theme-conflict warning
- [ ] **Observability**: bound inputs update their models, and computed values re-render
- [ ] **Persisted state**: every `@persist` field and `persistWith` model round-trips across a
  reload
- [ ] **Grids**: render with Hoist's standard look in both light and dark themes; sorting,
  filtering, grouping, column pinning, and the full-width horizontal scrollbar work; any custom
  grid SCSS reviewed
- [ ] **Routed tabs**: switching tabs keeps shared params and restores each tab's last route
- [ ] Forms validate and submit correctly
- [ ] Global ViewManager views can be saved by the intended role (core 42 apps)

## Reference

- [hoist-dev-utils 16 migration guide](https://github.com/xh/hoist-dev-utils/blob/develop/README.md#migrating-from-v15-webpack)
- [AG Grid 36 upgrade guide](https://www.ag-grid.com/react-data-grid/upgrading-to-ag-grid-36/)
- [MobX 7 changelog](https://github.com/mobxjs/mobx/blob/main/packages/mobx/CHANGELOG.md)
- [Version Compatibility](../version-compatibility.md) - hoist-core and dev-utils pairings
- [Toolbox on GitHub](https://github.com/xh/toolbox) - canonical example of a Hoist app, upgraded
  to v88
