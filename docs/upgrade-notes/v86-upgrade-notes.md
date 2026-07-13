# Hoist React v86 Upgrade Notes

> **From:** v85.x → v86.0.0 | **Released:** TBD | **Difficulty:** 🟠 MEDIUM

## Overview

Hoist React v86 is primarily a **dependency-modernization** release. It absorbs several major
third-party upgrades - MSAL v5, CodeMirror v6, AG Grid 35, react-select 5, react-dropzone 15 - and
retires a cluster of unmaintained micro-dependencies (`golden-layout`, `jquery`,
`react-beautiful-dnd`, `react-dates`, and three small utilities) in favor of Hoist-owned code. Most
of this churn is internal, but a handful of upgrades surface at the application layer.

Alongside the library work, v86 introduces the **`Runner`** API - a fluent builder that composes
spanning, logging, activity tracking, metrics, and task-linking around async work - and
**deprecates** the v85-era `HoistBase.withSpan()` and `FetchOptions.span` / `loadSpec` patterns in
its favor. These still work (with a warning) and are scheduled for removal in v88.

The most significant app-level impacts are:

- **AG Grid 34 → 35** - your app must bump its own `ag-grid-community`, `ag-grid-enterprise`, and
  `ag-grid-react` dependencies to `35.x`. No Hoist API changes.
- **`CodeInput` upgraded to CodeMirror v6** - the `mode` prop is replaced by `language`, the
  `editorProps` escape hatch is removed in favor of first-class props, and apps no longer import
  CodeMirror modes manually.
- **`FileChooser` redesigned** - configuration moved from component props onto the
  `FileChooserModel` constructor, with several props renamed or removed.
- **Mobile `DateInput` now uses the native `<input type="date">`** - the `formatString`,
  `initialMonth`, `placeholder`, and `singleDatePickerProps` props were removed.
- **`HoistBase.withSpan()` and `FetchOptions.span` / `loadSpec` are deprecated** in favor of the
  `Runner` chain (`runner().span()`) and the new `CallContext` argument to fetch methods. Optional
  for v86 (warns), but the recommended pattern has shifted - see Step 6. Apps that just adopted
  `ctx.span` / `FetchOptions.span` in the v85 upgrade should migrate.
- **`jquery` resolution pin can be removed** - it was only present to support `golden-layout`,
  which Hoist has forked and de-jQueried.

The MSAL v5, react-select 5, and react-dropzone 15 upgrades are largely internal to Hoist's
`MsalClient`, `Select`, and `FileChooser`. They require **no app action in the common case** - see
the [Library Upgrades](#library-upgrades-mostly-internal) notes at the end for the edge cases worth
checking.

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v85.x
- [ ] Your package manager (**yarn** or **npm**) is available and working
- [ ] **hoist-core** - no new minimum is required to run v86. **hoist-core >= 40.0.1 is required**
  only if you record client metrics via the new `MetricsService` / `Runner.counter()` /
  `Runner.timer()` APIs. See [Version Compatibility](../version-compatibility.md).

## Upgrade Steps

### 1. Update `package.json`

Bump hoist-react to v86, bump `@xh/hoist-dev-utils` to `13.x` (resolving to **13.0.1** or later -
see below), and bump your app's AG Grid dependencies (any `34.x`) to `35.x` to match.

**File:** `package.json`

Before:
```json
"@xh/hoist": "~85.0.0",
"ag-grid-community": "~34.2.0",
"ag-grid-enterprise": "~34.2.0",
"ag-grid-react": "~34.2.0",
"@xh/hoist-dev-utils": "12.x",   // in devDependencies
```

After:
```json
"@xh/hoist": "~86.0.0",
"ag-grid-community": "~35.3.0",
"ag-grid-enterprise": "~35.3.0",
"ag-grid-react": "~35.3.0",
"@xh/hoist-dev-utils": "13.x",   // in devDependencies
```

> **Strongly recommended: pick up `@xh/hoist-dev-utils` 13.0.1.** v86 does not strictly require
> v13 - hoist-react itself still runs on v12 - but a Hoist major upgrade is the natural time to
> refresh build tooling, and 13.0.1 ships a fix worth taking: a `'process.env': '{}'` fallback in
> the Webpack `DefinePlugin` that resolves a runtime crash in `DashCanvas` drag/resize (introduced
> upstream by `react-draggable` 4.6.0, a transitive dep of `react-grid-layout`). The `13.x` range
> resolves to 13.0.1 on a fresh install; if your lockfile pins an older `13.0.0`, update it.
>
> v13's one breaking change is minor or N/A for most apps: `.md` imports now resolve to the file's
> raw **text content** rather than a URL. This matches the `*.md` module declaration hoist-react
> already ships, so passing an imported `.md` straight to the `markdown` component just works. Only
> apps that previously *fetched* the imported value to read it (`fetch(imported).then(r =>
> r.text())`) need to drop the fetch and use the import directly; opt a specific import back to URL
> behavior with `import url from './big.md?url'`. v13 also sets a minimum Node version of
> `>=22.11.0` (the `lts/*` floor already used across Hoist repos).

If your `package.json` carries a `jquery` pin in `resolutions` (added in a prior version to satisfy
`golden-layout`), you can now **remove just that line** - Hoist forked `golden-layout` and dropped
its jQuery dependency. Leave any other `resolutions` entries (`core-js`, `@types/react`, etc.) in
place:

```json
"resolutions": {
    "core-js": "3.x",
    "jquery": "3.x"   // <- remove only this line
}
```

Then run `yarn install` or `npm install` to update dependencies.

**Find affected files:**
```bash
grep -rn "ag-grid" package.json
grep -n "jquery" package.json
```

### 2. Migrate `CodeInput` to CodeMirror v6

`CodeInput` was upgraded from CodeMirror 5 to CodeMirror 6. Three things change for apps:

#### 2a. Replace the `mode` prop with `language`

`mode` took a CodeMirror 5 mode string or MIME type (e.g. `'application/json'`, `'text/x-sql'`).
`language` takes a CodeMirror `language-data` name or alias - matched case-insensitively against
either the language's `name` or its `alias` list - and the matching language module is loaded on
demand.

**Find affected files:**
```bash
grep -rn "codeInput\|CodeInput" client-app/src/
```

Common migrations:

| Old `mode` (CodeMirror 5) | New `language` (CodeMirror 6) |
|---|---|
| `'application/json'` | `'json'` |
| `'javascript'`, `'text/javascript'` | `'javascript'` (or `'js'`) |
| `'jsx'`, `'text/jsx'` | `'jsx'` |
| `'text/x-sql'`, `'text/x-mssql'`, `'text/x-mysql'`, `'text/x-pgsql'` | `'sql'` |
| `'yaml'`, `'text/x-yaml'` | `'yaml'` (or `'yml'`) |
| `'xml'`, `'application/xml'` | `'xml'` |
| `'htmlmixed'`, `'text/html'` | `'html'` |
| `'text/typescript'` | `'typescript'` (or `'ts'`) |
| `'markdown'` | `'markdown'` |

If `language` does not match a known language, `CodeInput` logs a warning and falls back to plain
text (it does not throw).

#### 2b. Remove `editorProps` in favor of first-class props

The `editorProps` pass-through (which forwarded an arbitrary CodeMirror 5 options object) is removed
- CM5 option objects are incompatible with CM6's extension model. The settings apps commonly passed
through it are now discrete props: `readonly`, `language`, `lineNumbers`, and `lineWrapping`.

#### 2c. Drop manual CodeMirror imports and theme options

CodeMirror 5 required apps to import each mode (e.g.
`import 'codemirror/mode/javascript/javascript.js'`). CM6 loads language modules on demand, so
**remove all `import 'codemirror/...'` statements** from your app. Theme is no longer app-configurable - `CodeInput` now follows `XH.darkTheme` automatically
(GitHub light/dark), so the v5 `theme` option (e.g. `'dracula'`) no longer applies.

**Find affected files:**
```bash
grep -rn "from 'codemirror\|import 'codemirror" client-app/src/
```

Before:
```typescript
import 'codemirror/mode/javascript/javascript.js'; // app had to import the mode

codeInput({
    bind: 'config',
    mode: 'application/json',
    readonly: false,
    editorProps: {
        lineNumbers: true,
        lineWrapping: true,
        theme: 'dracula'
    },
    height: 300
})
```

After:
```typescript
// No CodeMirror import required - the language module loads on demand.
codeInput({
    bind: 'config',
    language: 'json',  // was mode: 'application/json'
    readonly: false,
    lineNumbers: true, // was editorProps.lineNumbers
    lineWrapping: true, // was editorProps.lineWrapping
    height: 300
})
```

#### 2d. Rewrite any code that reaches into the underlying editor instance

`CodeInputModel.editor` is now a CodeMirror 6 `EditorView` (it was a CodeMirror 5 editor). Any app
code that called CM5 editor APIs - `editor.markText()`, `editor.getDoc()`, `{line, ch}` position
objects, `editor.setOption()`, etc. - must be rewritten against the CM6 API (`editor.dispatch()`,
`editor.state`, decoration extensions). These are the most likely to be missed because they live in
app logic rather than on the `codeInput()` call.

**Find affected files:**
```bash
grep -rn "\.editor\.\(markText\|getDoc\|setOption\|getCursor\|setValue\|getValue\)" client-app/src/
```

### 3. Migrate `FileChooser` Configuration to `FileChooserModel`

`FileChooser` was redesigned so that all configuration lives on the `FileChooserModel` constructor,
leaving the component with presentation-only props. Several props were renamed or removed.

**Find affected files:**
```bash
grep -rn "fileChooser\|FileChooser" client-app/src/
```

| Old (props on `FileChooser`, v85) | New (v86) |
|---|---|
| `accept` (prop) | `FileChooserModel` config `accept` |
| `maxSize` (prop) | `FileChooserModel` config `maxFileSize` |
| `minSize` (prop) | `FileChooserModel` config `minFileSize` |
| `enableMulti` / `enableAddMulti` (props) | `FileChooserModel` config `maxFiles` (set `1` for single-file; omit for unlimited) |
| `showFileGrid` (prop) | Removed - default display is a grid; customize via the `fileDisplay` content prop |
| `targetText` (prop) | **Preferred:** `FileChooserModel` config `emptyDisplayPrompt` (+ `emptyDisplayHint`). Use the `emptyDisplay` content prop only for a fully custom layout. |

> **`emptyDisplay` and `fileDisplay` switch on file *presence*; v85's `targetText` did not.**
> In v85 the drop target that rendered `targetText` was **always visible** - even with files
> selected - and the file grid (if enabled) sat alongside it. v86 has no always-visible text slot:
> `emptyDisplay` renders **only when no files are selected**, and `fileDisplay` (defaulting to the
> grid/card) renders **only when files are present**. There is therefore no mechanical mapping for a
> `targetText` - you must decide which presence-state its content belonged to:
> - A drop prompt ("Drag and drop files here") is empty-state content - set it as
>   `emptyDisplayPrompt` (a plain string, preferred - keeps Hoist's icon, styling, and the
>   auto-generated constraints hint). When files exist, the grid/`fileDisplay` takes over.
> - A message that only makes sense once a file is chosen (e.g. "Ready to upload") belongs in
>   `fileDisplay`, which replaces the default grid - so set it only if you don't need that grid.
> - If your `targetText` varied on an **app flag** rather than on file presence, preserve that flag
>   *inside* the slot you choose - do not let the empty/file switch silently stand in for it.

Before (v85 - config as component props, model takes no args):
```typescript
this.chooserModel = new FileChooserModel();

fileChooser({
    model: this.chooserModel,
    accept: ['.pdf', '.doc', '.docx'],
    maxSize: 5 * 1024 * 1024,
    minSize: 1024,
    enableMulti: true,
    showFileGrid: true,
    targetText: 'Drag and drop files here, or click to browse...',
    height: 300
})
```

After (v86 - config on the model, component holds presentation props):
```typescript
this.chooserModel = new FileChooserModel({
    accept: ['.pdf', '.doc', '.docx'],
    maxFileSize: 5 * 1024 * 1024, // was maxSize
    minFileSize: 1024,            // was minSize
    maxFiles: 10                  // omit/null for unlimited (replaces enableMulti)
});

fileChooser({
    model: this.chooserModel,
    dropTargetPlacement: 'left',  // 'left' | 'top' | 'hidden'
    height: 300
})
```

For a **single-file** chooser, replace `enableMulti: false` with `maxFiles: 1`:
```typescript
this.chooserModel = new FileChooserModel({accept: ['.csv'], maxFiles: 1});
fileChooser({model: this.chooserModel});
```

The redesign also adds `onFileAccepted` / `onFileRejected` callbacks, configurable rejection toasts,
`maskOnDrag` / `maskOnDisabled` options, and a programmatic `openFileBrowser()` method - see the
New Features section of the [CHANGELOG](../../CHANGELOG.md).

**If you subclass `FileChooserModel`:** the `onFilesChange(files)` hook was removed. Replace an
`onFilesChange` override (and any `super.onFilesChange(...)` calls) with the `onFileAccepted` /
`onFileRejected` config callbacks, or add a reaction on the observable `files` array:

```typescript
// Before (v85): override the removed hook
override onFilesChange(files: File[]) {
    super.onFilesChange(files);
    this.validateSelection(files);
}

// After (v86): config callback, or a reaction on `this.files`
constructor() {
    super({onFileAccepted: files => this.validateSelection(files)});
    // - or - this.addReaction({track: () => this.files, run: files => this.validateSelection(files)});
}
```

**Prefer the styled text prompt over rebuilding the UI.** Most `targetText` values were a string or
a simple `placeholder(Icon.upload(), '...')` - which is exactly what the default empty display
already renders. Map these to `emptyDisplayPrompt` (a plain string on the model), optionally with
`emptyDisplayHint`: you keep Hoist's upload icon, styling, and the auto-generated summary of accepted
types and size/count limits. This holds even when `targetText` was a `placeholder(...)` element -
collapse it back to the prompt string rather than reaching for a content prop.

```typescript
// Before (v85) - a plain-text or simple-placeholder targetText
fileChooser({model, targetText: 'Drop loan docs here'})
fileChooser({model, targetText: placeholder(Icon.upload(), 'Drop loan docs here')})

// After (v86) - map targetText to a styled prompt on the model; icon, styling, and the constraints
// hint come for free, and the component render needs no change
new FileChooserModel({emptyDisplayPrompt: 'Drop loan docs here'});
```

Reserve the `emptyDisplay` / `fileDisplay` content props for layouts the prompt/hint genuinely can't
express. Note they are **not** interchangeable targets for a `targetText`: `emptyDisplay` renders
only when empty and `fileDisplay` only when files are present, so content meant for the
file-populated state must go to `fileDisplay` - never `emptyDisplay`.

**If your `targetText` was conditional** - a ternary or computed expression - work out what the
condition actually tracked before migrating, because v86 already switches content on file presence.

In the common case the condition tracked *file presence* (a flag toggled as files are added and
removed). v86's built-in switch replaces it directly: the no-file prompt becomes `emptyDisplayPrompt`
and the flag is dropped. The plain drop text needs no content prop at all - only the custom "ready"
affirmation, meant for the file-populated state, uses `fileDisplay` (which overrides the default
grid). `enableMulti` moves to `maxFiles` on the model:

```typescript
// Before (v85) - targetText always visible, toggled by a presence-derived flag
fileChooser({
    model,
    enableMulti: !singleDoc,
    targetText: hasFile
        ? placeholder(Icon.check({intent: 'success'}), 'Ready to upload')
        : placeholder(Icon.upload(), 'Drag and drop files here')
})

// After (v86) - the presence switch is built in, so the flag is no longer needed
this.chooserModel = new FileChooserModel({
    maxFiles: singleDoc ? 1 : null,
    emptyDisplayPrompt: 'Drag and drop files here'
});
fileChooser({
    model: this.chooserModel,
    fileDisplay: placeholder(Icon.check({intent: 'success'}), 'Ready to upload')
})
```

The trap is a condition that is **independent of file presence** (e.g. an "uploads open" flag). Its
branches are *not* an empty/file pair, so splitting them across `emptyDisplay` / `fileDisplay` would
drop the condition and silently re-key the content onto presence. Keep such a flag *inside* the slot
its content belongs to - here, still on the styled prompt:

```typescript
// independent flag - preserved on the styled prompt (model config), not mapped onto presence
new FileChooserModel({
    emptyDisplayPrompt: acceptingUploads ? 'Drag and drop files here' : 'Uploads are closed'
});
```

### 4. Remove Deleted Mobile `DateInput` Props

The mobile `DateInput` (`@xh/hoist/mobile/cmp/input`) now renders the browser's native
`<input type="date">`, dropping the abandoned `react-dates` dependency. Four props were removed with
no replacement - the native control owns display format, placeholder, and initial view:

- `formatString` - display/parse format is now the user's OS locale.
- `initialMonth` - the native picker manages its own initial view.
- `placeholder` - native date inputs do not support placeholder text.
- `singleDatePickerProps` - the underlying `react-dates` picker no longer exists.

`minDate` / `maxDate`, `enableClear`, `valueType`, and the icon/alignment props are all retained.

**Find affected files:**
```bash
grep -rn "formatString\|initialMonth\|singleDatePickerProps" client-app/src/
```
(Be sure the matches are on the **mobile** `DateInput` - the desktop `DateInput` still supports
`formatString`.)

Before (mobile):
```typescript
dateInput({
    bind: 'startDate',
    valueType: 'localDate',
    formatString: 'MM/DD/YYYY',      // REMOVED
    placeholder: 'Select a date...', // REMOVED
    initialMonth: LocalDate.today(), // REMOVED
    minDate: LocalDate.today().subtract(30),
    maxDate: LocalDate.today(),
    enableClear: true
})
```

After (mobile):
```typescript
dateInput({
    bind: 'startDate',
    valueType: 'localDate',
    minDate: LocalDate.today().subtract(30), // still supported
    maxDate: LocalDate.today(),              // still supported
    enableClear: true
})
```

### 5. Remove Usage of `serializeIcon()` / `deserializeIcon()` (rare)

The `serializeIcon()` and `deserializeIcon()` helpers were removed from `@xh/hoist/icon`. They
existed only to support `DashContainer` icon persistence (see Step 8) and have no known app
consumers. If your app imported them directly, replace with the equivalent inline calls:

**Find affected files:**
```bash
grep -rn "serializeIcon\|deserializeIcon" client-app/src/
```

| Removed | Replacement |
|---|---|
| `serializeIcon(iconElem)` | `pickBy(iconElem.props)` (via lodash) |
| `deserializeIcon(iconDef)` | `Icon.icon(iconDef)` |

### 6. Migrate to the `Runner` API (recommended)

`HoistBase.withSpan()` and the `FetchOptions.span` / `loadSpec` fields are **deprecated** (they log
a warning and are scheduled for removal in **v88**). The replacement is the `Runner` chain, started
via `HoistBase.runner()`, which composes spanning and threads a shared `CallContext` (trace + load
state) across call boundaries. Fetch methods now accept that `CallContext` as an optional **second
argument**.

> **Most apps are affected through `loadSpec`, not `span`.** Few apps ever called `withSpan()` or
> set `FetchOptions.span`, but **nearly every load-aware service forwards its `loadSpec` to fetch
> calls** - typically as the `{loadSpec}` shorthand inside the options object (e.g.
> `XH.fetchJson({url, loadSpec})`). Every such call now logs a deprecation warning. Migrate by
> passing the `CallContext` as the fetch method's second argument instead.

> **Note on v85 churn:** the v85 upgrade introduced `FetchOptions.span` and a
> `HoistBase.span().run()` form. In v86 those are superseded - `HoistBase.span()` is replaced by
> `runner().span()`, and `span` / `loadSpec` move off `FetchOptions` onto the `CallContext`
> argument. If you adopted the v85 pattern, migrate now to avoid the v88 removal.

**Find affected files:**
```bash
# Matches withSpan, plus span / loadSpec passed as object keys OR ES6 shorthand ({loadSpec}, etc.)
grep -rnE "withSpan|\bspan\b\s*[:,}]|\bloadSpec\b\s*[:,}]" client-app/src/
```
The bare-word matching is important - a narrower pattern like `loadSpec:` misses the common
`{loadSpec}` shorthand and would wrongly report this step as N/A. Note the `\bspan\b` clause is
noisy: it also matches the `span` layout factory (`import {span} from '@xh/hoist/cmp/layout'`) and
`span` SCSS selectors. If the `withSpan` count is zero, you can ignore the `span` hits and focus on
`withSpan` and `loadSpec`.

**`loadSpec` carried on app-defined query objects:** many services don't pass `loadSpec` straight
into a fetch call - they thread it through their own typed query interface and forward it down
several layers. Trace each `loadSpec` to the `XH.fetch*` call it ultimately reaches; only that final
call site changes (move `loadSpec` to the second argument). The intermediate signatures that carry
`loadSpec` on a query object stay as they are.

```typescript
// App query interface carrying loadSpec - unchanged
interface ExceptionsQuery {
    loanId: number;
    loadSpec: LoadSpec;
}

// Only the terminal fetch call changes:
async listForLoanAsync({loanId, loadSpec}: ExceptionsQuery) {
    return XH.fetchJson({url: `loans/${loanId}/exceptions`}, {loadSpec}); // was {url, loadSpec}
}
```

Before (deprecated in v86 - both the common `loadSpec` form and the rarer `span` forms):
```typescript
// Common: forwarding loadSpec into a fetch call (often alongside other options like `track`)
override async doLoadAsync(loadSpec) {
    this.data = await XH.fetchJson({url: 'portfolio/data', track: 'Loaded data', loadSpec});
}

// Rarer: explicit spans
await this.withSpan('loadPortfolio', async span => {
    this.summary = await XH.fetchJson({url: 'portfolio/summary', span});
});
this.lookups = await XH.fetchJson({url: 'portfolio/lookups', span: ctx.span});
```

After (pass a `CallContext` as the fetch method's second argument):
```typescript
// Common: loadSpec moves to the CallContext - other options (url, track, ...) stay in the first arg
override async doLoadAsync(loadSpec) {
    this.data = await XH.fetchJson({url: 'portfolio/data', track: 'Loaded data'}, {loadSpec});
}

// Rarer: Runner chain for explicit spans
await this.runner()
    .span('loadPortfolio')
    .run(ctx => XH.fetchJson({url: 'portfolio/summary'}, ctx));

// Or the Runner's fetch shortcuts directly:
this.lookups = await this.runner(ctx).fetchJson({url: 'portfolio/lookups'});
```

If your app has a custom `HoistAuthModel`, its `completeAuthAsync()` override now receives an
optional `CallContext`. Forwarding it nests auth requests under the bootstrap trace. This is
**optional and provider-agnostic** (Auth0, MSAL, Okta, custom) - the parameter is optional, so an
existing no-arg override still compiles:

```typescript
override async completeAuthAsync(ctx?: CallContextLike): Promise<IdentityInfo> {
    await this.myOAuthClient.initAsync();
    return super.completeAuthAsync(ctx);
}
```

### 7. Replace `PersistenceProvider.mergePersistOptions()` with `persistOptions()` (rare)

`PersistenceProvider.mergePersistOptions()` is **deprecated** (it logs a warning and is scheduled
for removal in **v87**). It is replaced by the exported `persistOptions()` function from
`@xh/hoist/core`, which has an identical signature - so this is a straight find-and-replace. Few
apps call this directly; it is used mostly inside Hoist when composing parent/caller `persistWith`
options into a single `PersistOptions`.

**Find affected files:**
```bash
grep -rn "mergePersistOptions" client-app/src/
```

Before (deprecated in v86):
```typescript
import {PersistenceProvider} from '@xh/hoist/core';

const opts = PersistenceProvider.mergePersistOptions(defaults, parentPersistWith, persistWith);
```

After (v86):
```typescript
import {persistOptions} from '@xh/hoist/core';

const opts = persistOptions(defaults, parentPersistWith, persistWith);
```

`persistOptions()` also picks up the new `pathPrefix` support (concatenated rather than replaced
across arguments) - see the [persistence doc](../persistence.md) for hierarchical namespacing.

### 8. `DashContainerModel` Icon Persistence (no action required)

`DashContainerModel` no longer persists a per-view `icon` in its saved layout state, aligning it
with `DashCanvasModel`. Icons now always come from the `DashViewSpec`. Apps that set
`DashViewModel.icon` at runtime still see it render, but the override is no longer saved across
reloads. **No migration is required** - stale `icon` entries in previously-persisted layout blobs
are simply ignored. If you relied on a per-view icon override surviving a reload, set the icon on the
`DashViewSpec` instead.

## Library Upgrades (mostly internal)

These upgrades are absorbed by Hoist's own components and require no app action in the common case.
Check the noted edge cases:

- **MSAL `@azure/msal-browser` 4 → 5** - internal to `MsalClient`. The new redirect-bridge assets
  (`public/blank.html`, `public/msal-redirect-bridge.min.js`) are copied into your build
  automatically by `hoist-dev-utils`. **Edge case:** if your app ships its own
  `public/blank.html`, update it to load `msal-redirect-bridge.min.js` and call
  `msalRedirectBridge.broadcastResponseToMainFrame()`, or popup/redirect auth will break under v5.
  Apps that override MSAL options via `msalClientOptions` should review the
  [v4 → v5 migration guide](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/v4-migration)
  for any renamed/removed `system` / `cache` / `auth` keys they pass.
- **react-select 4 → 5** (and **react-windowed-select 3 → 5**) - internal to Hoist's `Select`.
  **Edge case:** if you pass react-select-specific options through `Select`'s `rsOptions` prop,
  review them against the [react-select v5 changes](https://react-select.com/upgrade-guide).
- **react-dropzone 10 → 15** - internal to the redesigned `FileChooser` (Step 3). No direct action.
- **`react-beautiful-dnd` removed** - replaced by the maintained `@hello-pangea/dnd` fork, which has
  an identical API. Drag-and-drop is unchanged: the `@xh/hoist/kit/react-beautiful-dnd` import path
  is **retained** (now backed by the fork), so apps importing from the Hoist kit need no change.
  Only code importing the raw `react-beautiful-dnd` package directly must switch its import to
  `@xh/hoist/kit/react-beautiful-dnd` (or `@hello-pangea/dnd`).
- **Removed micro-deps with direct app imports** - if your app imported any of these *directly*
  (rather than through Hoist), migrate to the Hoist-owned replacement and drop the dependency:

  | Removed package | Hoist replacement |
  |---|---|
  | `clipboard-copy` | `copyToClipboard` from `@xh/hoist/utils/js` |
  | `@seznam/compose-react-refs` | `composeRefs` from `@xh/hoist/utils/react` |
  | `debounce-promise` | `debouncePromise` from `@xh/hoist/promise` |

  **Find affected files:**
  ```bash
  grep -rn "from 'clipboard-copy'\|@seznam/compose-react-refs\|from 'debounce-promise'" client-app/src/
  ```
- **`golden-layout`, `jquery`, `react-dates` removed** - `golden-layout` was forked in-house and
  `react-dates` is gone with the mobile `DateInput` rewrite; neither is typically imported directly
  by apps. The one app-facing follow-up is removing the `jquery` resolution pin (Step 1).

## Verification Checklist

After completing all steps:

- [ ] `yarn install` / `npm install` completes without errors
- [ ] `yarn lint` / `npm run lint` passes (or only pre-existing warnings remain)
- [ ] `npx tsc --noEmit` passes - **primary gate** for the `CodeInput`, `FileChooser`, and mobile
  `DateInput` API changes
- [ ] Application loads without console errors
- [ ] Your app's `ag-grid-*` dependencies are on `35.x`: `grep -n "ag-grid" package.json`
- [ ] No `import 'codemirror/...'` statements remain:
  `grep -rn "import 'codemirror\|from 'codemirror" client-app/src/`
- [ ] All `CodeInput` instances use `language` (not `mode`) and no `editorProps`:
  `grep -rn "mode:\|editorProps" client-app/src/` (verify matches are not `CodeInput`)
- [ ] All `FileChooser` config moved onto `FileChooserModel`; no removed props remain:
  `grep -rn "enableMulti\|enableAddMulti\|showFileGrid\|targetText\|maxSize\|minSize" client-app/src/`
  (verify matches are on `FileChooser` - `enableMulti` is also a valid prop on `Select` /
  `ButtonGroupInput`, and `maxSize` / `minSize` are common Highcharts / layout / config keys; all
  unrelated and unaffected)
- [ ] No removed mobile `DateInput` props remain:
  `grep -rn "initialMonth\|singleDatePickerProps" client-app/src/`
- [ ] No `PersistenceProvider.mergePersistOptions()` calls remain (swapped to `persistOptions()`):
  `grep -rn "mergePersistOptions" client-app/src/`
- [ ] Grids render and function correctly (sorting, filtering, grouping)
- [ ] Code editors render with the correct syntax highlighting and light/dark theme
- [ ] File choosers accept, reject, and display files correctly
- [ ] On mobile, date inputs open the native date picker and honor `minDate` / `maxDate`
- [ ] If you use MSAL: login (including popup/redirect flows) and silent token refresh succeed
- [ ] (Recommended) Deprecation warnings for `withSpan` / `FetchOptions.span` / `loadSpec` are
  addressed before v88 - check the browser console on app load/refresh, and grep with the
  shorthand-aware pattern from Step 6:
  `grep -rnE "withSpan|\bspan\b\s*[:,}]|\bloadSpec\b\s*[:,}]" client-app/src/`

## Reference

- [AG Grid v35 upgrade guide](https://www.ag-grid.com/javascript-data-grid/upgrading-to-ag-grid-35/)
- [MSAL v4 → v5 migration guide](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/v4-migration)
- [react-select v5 upgrade guide](https://react-select.com/upgrade-guide)
- [Toolbox on GitHub](https://github.com/xh/toolbox) - canonical example of a Hoist app; see its
  `CodeInput`, `FileChooser`, and `AuthModel` usage for the expected v86 shape.
