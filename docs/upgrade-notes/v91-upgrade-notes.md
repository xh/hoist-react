# Hoist React v91 Upgrade Notes

> **From:** v90.x → v91.0.0 | **Released:** TBD | **Difficulty:** 🟠 MEDIUM

## Overview

Hoist React v91 resets Hoist's CSS custom properties onto a simpler baseline, and moves element
factories to the standard React `children` key. A codemod automates nearly all of each migration.
v91 also removes Blueprint, requires AG Grid 36.3, renders desktop inline masks without an overlay,
and sends a fetch with `params` but no `method` as a GET.

- **AG Grid 36.3 (required)** - see Step 1.
- **Inline masks (if your app styles them)** - see Step 5.
- **CSS variables (required if your app customizes or reads Hoist's CSS variables)** - see Steps
  2-4. The new baseline is designed to read the way developers - and AI coding agents - expect CSS
  variables to work:
    - **One tier of variables.** The unprefixed override hooks are gone. Previously Hoist defined
      each variable as `--xh-grid-bg: var(--grid-bg, var(--xh-bg))`, with the unprefixed
      `--grid-bg` as the app-level hook. Apps now set the `--xh-*` variables directly.
    - **Sizes carry units.** Size variables hold real lengths (`--xh-spacing: 10px`) instead of
      unitless numbers, and every `-px` companion variable (`--xh-pad-px`, `--xh-font-size-px`,
      ...) is gone - read the base variable directly.
    - **Consistent names.** Variables were renamed to follow one naming grammar - e.g.
      `--xh-pad` → `--xh-spacing`, `--xh-tbar-*` → `--xh-toolbar-*`, `--xh-appbar-color` →
      `--xh-appbar-text-color`. See [Renamed Variables](#renamed-variables) and the naming
      conventions in [`styles/README.md`](../../styles/README.md#naming-conventions).
    - **Overrides on `body.xh-app` always win**, in every theme and platform combination.
    - **Three variables that never had any effect were removed.**

- **Element factory `children` (run the codemod)** - see Step 6. Element specs take child elements
  via `children`, as React does. A type-aware codemod converts app code and reports examples in
  docs. The legacy `item` and `items` keys still work as aliases in v91, but a future major version
  will remove them.
- **`FetchService` default method (review fetches that send `params`)** - see Step 7. A request
  with `params` and no `method` is now a GET, not a POST.
- **Blueprint removed (required if your app imports from `@xh/hoist/kit/blueprint`)** - see Step 8.
  Hoist's desktop components no longer use Blueprint, and Hoist no longer loads its stylesheet.
  Desktop overlays and controls look and behave as before, with keyboard and focus improvements.

The CSS changes also cover the variables added in v90 - the panel splitter (`--xh-panel-splitter-*`,
`--xh-panel-collapsed-strip-*`), `PdfViewer` (`--xh-pdf-viewer-*`) and `StatCard`
(`--xh-stat-card-*`) sets. Their hooks are gone, `--xh-panel-splitter-hit-size` and
`--xh-panel-collapsed-strip-size` now hold lengths, and their `-px` companions are removed.

The most significant impacts are:

- **Grids fail on AG Grid 36.2 or earlier.** Hoist checks the AG Grid version at startup. On an
  older version it logs an error and disables every grid. AG Grid is not a peer dependency of
  Hoist, so your package manager does not warn.
- **Old names and unitless values fail silently.** An app still setting `--grid-bg`, `--xh-pad`, or
  `--xh-font-size: 14` loses that customization without an error. Run the codemod, and watch for
  Hoist's development-mode console warning about unitless size variables.
- **Overrides set on `:root` or `html` no longer apply** - move them to `body.xh-app`. The codemod
  and a development-mode console warning both name any it finds.
- **A spec that sets both `children` and a legacy key now renders `children`.** Before v91 the
  legacy key won. The usual case is a container that spreads its props and adds `items`, as in
  `box({...props, items: [...]})`, where a `children` prop in the spread now hides the `items`.
  Hoist logs a console warning naming the component. The Step 6 codemod fixes these.
- **A fetch with `params` and no `method` is now a GET.** Before v91 it was a POST. A server action
  that accepts only POST rejects it, and a password or other sensitive param ends up in the URL.
- **Imports from `@xh/hoist/kit/blueprint` fail to build.** The package is gone. Blueprint
  components an app imports directly from `@blueprintjs/core` also need replacing - see Step 8.

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v90.x. An app upgrading from an earlier version should complete the
  prior upgrade notes first. The codemod also migrates v89-era variable names.
- [ ] **hoist-core** at >= 40.5.0 (unchanged floor). **hoist-core 44.0 is recommended**, as for
  v90. v91 adds no new server-side requirements. See
  [Version Compatibility](../version-compatibility.md).

## Upgrade Steps

### 1. Update `package.json`

Bump hoist-react to v91 and AG Grid to 36.3. Hoist requires AG Grid 36.3 or later, to avoid a
performance issue in 36.2.

**File:** `client-app/package.json`

Before:

```json
"dependencies": {
    "@xh/hoist": "^90.0.0",
    "ag-grid-community": "~36.2.0",
    "ag-grid-enterprise": "~36.2.0",
    "ag-grid-react": "~36.2.0"
}
```

After:

```json
"dependencies": {
    "@xh/hoist": "^91.0.0",
    "ag-grid-community": "~36.3.0",
    "ag-grid-enterprise": "~36.3.0",
    "ag-grid-react": "~36.3.0"
}
```

Bump `ag-grid-enterprise` only if your app uses it. Then run `pnpm install`, `yarn install`, or
`npm install`.

### 2. Run the CSS Variable Codemod

From your `client-app` directory, after installing v91:

```bash
# Preview first - lists each file it would change, and the report, without writing.
node node_modules/@xh/hoist/docs/codemod/v91/codemod-css-vars.mjs --dry src

# Then apply.
node node_modules/@xh/hoist/docs/codemod/v91/codemod-css-vars.mjs src
```

The dry run counts renames, unit fixes, and `calc()` fixes but does not list them. Review those in
`git diff` after you apply.

The codemod skips `node_modules`. A Hoist package that ships its own styles needs the same
migration in its own repo, and a new release, before apps on v91 pick it up. To skip other code
that is not yours, such as a vendored third-party stylesheet, pass `--exclude <path>`. Repeat it for
each file or folder.

It scans `.scss`, `.css`, `.ts`, `.tsx`, and `.js` files and:

1. **Migrates unprefixed hooks** to their `--xh-*` variable, including the handful whose names
   never matched (see [Old Hook Name Mismatches](#old-hook-name-mismatches)). Only declarations
   inside a root-level selector (`body`, `html`, `:root`, `.xh-app`, `.xh-dark`, `.xh-mobile`, and
   combinations) are migrated - the only places the hooks ever worked. Pass `--no-hooks` to skip.
2. **Renames** every renamed or retired `--xh-*` variable, anywhere it appears.
3. **Adds `px`** to size variables set to a bare number: `--xh-spacing: 8;` → `--xh-spacing: 8px;`.
4. **Simplifies arithmetic** that re-applied the unit: `calc(var(--xh-spacing) * 1px)` →
   `var(--xh-spacing)`, and `calc(var(--xh-toolbar-item-spacing) * 2px)` →
   `calc(var(--xh-toolbar-item-spacing) * 2)`.

Before:
```scss
body.xh-app {
  --pad: 8;
  --border-color: #cccccc;
  --tbar-min-size: 50;
  --grid-header-cell-lr-pad: 14;

  &.xh-dark {
    --tbar-bg: #1d272c;
  }
}

.my-panel__header {
  padding: var(--xh-pad-half-px) var(--xh-pad-px);
  font-size: var(--xh-font-size-small-px);
}
```

After:
```scss
body.xh-app {
  --xh-spacing: 8px;
  --xh-border-color: #cccccc;
  --xh-toolbar-min-size: 50px;
  --xh-grid-header-padding-inline: 14px;

  &.xh-dark {
    --xh-toolbar-bg: #1d272c;
  }
}

.my-panel__header {
  padding: var(--xh-spacing-half) var(--xh-spacing);
  font-size: var(--xh-font-size-small);
}
```

The codemod ends with a report. Work through each section of it:

- **Hook migrations** - every unprefixed name it converted, with file and line. Confirm each was a
  Hoist hook rather than an app variable that happened to share a hook's name (e.g. `--gray`).
- **Possibly local variables** - hook names that are declared and read only within the same files,
  as a stylesheet's own variables would be, such as `--white` and `--black` in a vendored template.
  To keep one as is, run the codemod again on the unmodified files with `--skip-hook <name>`, or
  `--exclude` the file or folder that holds it.
- **Comments naming unprefixed hooks** - the codemod never edits comments. Update each one it lists
  to name the new `--xh-*` variable.
- **Removed variables still referenced** - delete these usages; the variables never had any effect.
- **Warnings** - `calc()` expressions that add a bare number to a size variable (add a unit to the
  number) or divide by one, TypeScript assigning a size variable a bare number, and code that
  references a size variable by name. For the last, check whether the code reads the variable's
  value - e.g. via `getComputedStyle(...).getPropertyValue()` - and appends a unit, which now
  doubles up (`41pxpx`). Also any `--xh-*` variable set on `:root` or `html` - move it to
  `body.xh-app` (Step 4). Also any declaration left as written because, once migrated, it would
  read the variable it declares, such as
  `--xh-grid-header-lr-pad-px: calc(var(--xh-grid-header-lr-pad) * 1px - 1px)`. A custom property
  that reads itself is invalid. Set the new variable to a length instead, or remove the line.
- **Markdown naming old or removed variables** - the codemod never edits `.md` files. Update
  living docs such as a README or `CLAUDE.md` by hand. Leave changelogs and release notes as
  written.

### 3. Review What the Codemod Cannot Migrate

**Hooks set outside a root-level selector.** An unprefixed hook set on a container never had any
effect - Hoist read the hooks only on `body` - so the codemod leaves these alone. Search for any that
remain:

```bash
# Unprefixed custom properties. Add your own app prefix (e.g. --myapp-) to the exclusion list.
grep -rnE '^\s*--[a-z][a-z0-9-]*\s*:' --include='*.scss' --include='*.css' src \
  | grep -vE -- ':[0-9]+:\s*--(xh|ag|bp[0-9]?|fa|myapp)-'
```

For any hit that names a Hoist hook, decide whether you want it at all: renamed to its `--xh-*`
variable, it will *start* applying within that subtree for the first time.

**Names built at runtime.** Variable names assembled dynamically - SCSS interpolation such as
`--xh-grid-tree-group-color-level-#{$i}`, or strings concatenated in TypeScript - are not detected.
Search for `--xh-` near `#{` or string concatenation and update them by hand using the
[Renamed Variables](#renamed-variables) table.

**Unit math on your own variables.** The codemod fixes `* 1px`-style arithmetic only where it reads
a Hoist size variable directly. If your own variable copies one, such as
`--my-font-size: var(--xh-grid-font-size)`, arithmetic on it is not detected. Fix it by hand:
`calc(var(--my-font-size) * 0.5px)` → `calc(var(--my-font-size) * 0.5)`.

**Form-field validation colors.** In prior versions the
`--form-field-{info,invalid,warning}-border-color` hooks fed *two* variables each: the
`-border-color` variable (as intended) and, by mistake, the matching `-box-shadow` variable - so an
app that set the hook to a color replaced the whole `box-shadow` value with a bare color, an
invalid value that browsers silently dropped. That app therefore saw its color on the validation
border but no inset shadow. In v91 the shadow variables reference the `-border-color` variables
properly, so setting `--xh-form-field-invalid-border-color` colors both the border and the inset
shadow. To keep the prior no-shadow appearance, add e.g.
`--xh-form-field-invalid-box-shadow: none;` alongside the color.

### 4. Check Override Selectors

Set overrides on `body.xh-app`. Hoist declares its defaults on `body`, wrapping its dark-theme and
mobile variants in `:where()` so every framework declaration has the specificity of a bare `body`
selector. A `body.xh-app` override therefore wins in every theme and platform combination - the
same reach the old unprefixed hooks had.

Two selectors that worked with the old hooks no longer do:

- **Bare `body`** ties with Hoist's declarations and wins only by source order.
- **`:root` or `html`** has no effect at all. Values set there reach `body` only by inheritance,
  and Hoist's own declarations on `body` take precedence. The old hooks were read wherever Hoist
  declared its variables, so an inherited hook value worked; an inherited `--xh-*` value does not.

Before:
```scss
:root {
  --grid-large-font-size: 16;
}
```

After:
```scss
body.xh-app {
  --xh-grid-large-font-size: 16px;
}
```

The codemod migrates the name and unit here but leaves the selector, and lists the declaration in
its warnings. Change `:root` / `html` to `body.xh-app` by hand. Where you want per-theme values, nest an `&.xh-dark` block as in Step 2.

**Scoped overrides** - setting a variable on a container rather than `body.xh-app` - only reach CSS
that reads that exact variable. Variables derived from it were resolved once on `body`, so
`.my-panel { --xh-spacing: 4px; }` does not change `--xh-spacing-half` within the panel. See "Base
vs. Derived Variables" in [`styles/README.md`](../../styles/README.md#base-vs-derived-variables).

### 5. Check Inline Mask Styling

On desktop, an inline `Mask` now renders as a plain `div` with the class `xh-mask--inline`, not an
overlay. Its backdrop is the `::before` pseudo-element of that `div`. Showing a mask no longer
forces a browser layout. A mask with `inline: false` renders in Hoist's own overlay.

App CSS that targets `.bp6-overlay` classes within an inline mask no longer matches. Search for
Blueprint overlay classes in your styles and check any hit that styles a mask:

```bash
grep -rn 'bp6-overlay' --include='*.scss' --include='*.css' src
```

To change the backdrop color, set `--xh-mask-bg` instead.

### 6. Convert Element Specs to `children`

Element factories and `createElement` now take child elements via the standard React `children`
key. Run the codemod below to convert your app as part of this upgrade.

The legacy `item` and `items` keys still work as aliases in v91, so this change is not breaking and
you can defer it. There is no reason to wait. A future major version will remove the aliases and
force the change. Hoist's docs and examples already use `children` only, and AI coding agents
follow the patterns your code shows them.

```typescript
// Before
panel({
    title: 'Users',
    items: [grid(), toolbar()]
});
box({flex: 1, item: 'Hello'});

// After
panel({
    title: 'Users',
    children: [grid(), toolbar()]
});
box({flex: 1, children: 'Hello'});
```

A text search cannot tell element specs from data, because `items` is also the key for menu items,
column groups and similar configs. The codemod loads your TypeScript project and renames a key only
where the type checker resolves it to Hoist's `ElementSpec`. Keys outside an element spec keep their
names, such as the `input.item` of an `XH.prompt()` call. Run it from the app root, after installing
v91, so that it also scans root-level docs such as `CLAUDE.md`:

```bash
# Preview first - lists each file it would change, and the report, without writing.
node client-app/node_modules/@xh/hoist/docs/codemod/v91/codemod-items-to-children.mjs --dry

# Then apply, and run your formatter over the changed files.
node client-app/node_modules/@xh/hoist/docs/codemod/v91/codemod-items-to-children.mjs
```

The codemod finds `./tsconfig.json` or `./client-app/tsconfig.json`. Pass `--project` to name
another. It edits source files only under the tsconfig folder, never in `node_modules`. It also
collapses `children: children` to the `children` shorthand. The preview counts the renames but
does not list them, so review them in `git diff` after you apply.

Review the report. It lists what the codemod could not convert safely, and changes to check:

- **Conflicts** - a spec with more than one of `children`, `item` and `items`, left unchanged.
  Merge them by hand. In v91 such a spec renders only `children`, where before v91 the legacy key
  won.
- **Not converted** - a likely spec with no type information. An example is an untyped object
  built in one place and passed to a factory later, or app options from a `getAppOptions()`
  override with no return type. Add a type, such as `ElementSpec` or `AppOptionSpec[]`, and run
  the codemod again, or convert by hand.
- **Worth a review** - most often a key moved after a spread that could carry `children`. Before
  v91 the legacy key beat a `children` prop in the spread, and `children` does not. So the codemod
  turns `panel({item: x, ...props})` into `panel({...props, children: x})`, which keeps the old
  behavior. If a caller's `children` should win instead, move the key back before the spread.

**Docs.** The codemod also scans markdown files, such as `CLAUDE.md`, `AGENTS.md` and READMEs, for
factory examples, because agents copy them. By default it only reports suggested renames. Pass
`--fix-docs` to apply them in code blocks that parse cleanly. Pass `--no-docs` to skip markdown.

**Container components.** A component that renders its children inside another factory should
pass them on as `children`. The codemod makes this change:

```typescript
// Before
render({children, ...props}) {
    return vbox({...props, className: 'my-container', items: children});
}

// After
render({children, ...props}) {
    return vbox({...props, className: 'my-container', children});
}
```

A component with its own prop named `items`, such as Blueprint's `OverflowList`, still takes it
via the `$items` escape hatch. See
[Authoring a Container Component](../../core/README.md#authoring-a-container-component).

**TypeScript.** Two type changes can surface new compile errors. `AppOptionSpec.formField` is now
typed as an element spec instead of `any`. `ElementSpec.children` takes the type of the component's
own `children` prop when it declares one, such as a render function.

Toolbox ran this codemod over its whole client - see
[xh/toolbox#958](https://github.com/xh/toolbox/pull/958).

### 7. Set `method` on Fetches That Should POST

`FetchService` now sends a request with no `method` as a GET, whatever its `params`. Before v91, a
request with `params` and no `method` was a POST, with the params in a form-encoded body. This
applies to `XH.fetch()`, `XH.fetchJson()` and `XH.fetchNdjson()`, the same calls on a `Runner`, and
a `PdfViewer` source given as `FetchOptions`. `getJson`, `postJson`, `putJson`, `patchJson` and
`deleteJson` set their own method and are unchanged.

List the calls to check, then look at each one that sets `params` but not `method`:

```bash
grep -rnE '\.(fetch|fetchJson|fetchNdjson)\(' src
```

Grails binds controller `params` from the query string and a form body alike, so a read served by a
Grails action works as a GET without change. Add `method: 'POST'` to a call that:

- changes data on the server.
- sends a password or other sensitive value, which a GET would put in the URL and server logs.
- sends large params, such as serialized JSON, which can exceed URL length limits.
- targets a server action that accepts only POST.

```typescript
// Before v91 - a POST, because it sets params
await XH.fetchJson({url: 'api/orders/cancel', params: {orderId}});

// v91 - set the method to keep it a POST
await XH.fetchJson({url: 'api/orders/cancel', method: 'POST', params: {orderId}});
```

A unit test that serves one of these reads with `hoistCore.route('POST', ...)` and checks `req.form`
now needs `route('GET', ...)` and `req.query`.

### 8. Replace Blueprint Imports

Hoist no longer uses Blueprint. Its desktop components render their own markup and behavior,
`@xh/hoist/kit/blueprint` is gone, and `@blueprintjs/core` is no longer a dependency of Hoist. Find
the imports to change:

```bash
grep -rn "@xh/hoist/kit/blueprint\|@blueprintjs\|@xh/hoist/mobile/cmp/popover" src
```

Mobile apps import `popover` from `@xh/hoist/cmp/popover` in place of the removed
`@xh/hoist/mobile/cmp/popover`. Replace each Blueprint component, whether from
`@xh/hoist/kit/blueprint` or `@blueprintjs/core`, with Hoist's equivalent:

| Was (Blueprint) | Now |
|---|---|
| `dialog`, `Dialog` | `dialog` from `@xh/hoist/desktop/cmp/dialog` |
| `dialogBody`, `dialogFooter`, `dialogFooterActions` | The same names from `@xh/hoist/desktop/cmp/dialog` |
| `popover`, `Popover` | The same names from `@xh/hoist/cmp/popover` |
| `tooltip`, `Tooltip` | The same names from `@xh/hoist/cmp/tooltip` |
| `menuItem`, `menuDivider` | A `MenuItem` config, and `'-'` or `{heading}` for a divider. Map `onClick` to `actionFn`, `labelElement` to `rightElement`, and `shouldDismissPopover: false` to `keepMenuOpen: true` |
| `menu` | `menu` or `menuButton` from `@xh/hoist/desktop/cmp/menu`, with `MenuItem` configs |
| `showContextMenu` | `useContextMenu` from `@xh/hoist/desktop/hooks`, or `PanelProps.contextMenu` |
| `useHotkeys`, `HotkeyConfig` | The same names from `@xh/hoist/desktop/hooks` |
| `OverlayToaster` | `XH.toast()` |
| `alert` | `XH.message()`, `XH.alert()` or `XH.confirm()` |
| `callout` | `callout` from `@xh/hoist/cmp/callout` |
| `bpCard` | `card` from `@xh/hoist/cmp/card` |
| `switchControl` | `switchInput` from `@xh/hoist/desktop/cmp/input` |
| `radio`, `radioGroup` | `radioInput` from `@xh/hoist/desktop/cmp/input` |
| `textArea` | `textArea` from `@xh/hoist/desktop/cmp/input` |
| `rangeSlider` | `slider` from `@xh/hoist/desktop/cmp/input`, with a two-number array as its value |
| `tag` | No standalone equivalent. For tags in a grid cell, `tagsRenderer` from `@xh/hoist/cmp/grid` |
| `button`, `checkbox`, `inputGroup`, `numericInput`, `slider` and other controls | Hoist's components in `@xh/hoist/desktop/cmp/button` and `@xh/hoist/desktop/cmp/input` |
| `Position.BOTTOM_LEFT` and other `Position` values | The string, e.g. `'bottom-left'`, typed as `PopoverPosition` from `@xh/hoist/cmp/popover` |
| `PopoverInteractionKind.HOVER` and other kinds | The string, e.g. `'hover'` |
| `Classes.*` | The class name string, e.g. `'bp6-text-muted'` |

Before:

```typescript
import {dialog, tooltip} from '@xh/hoist/kit/blueprint';

dialog({title: 'Edit', isOpen: model.isOpen, onClose: () => model.close(), children: form()});
tooltip({content: 'Refresh now', position: 'bottom', children: button({icon: Icon.refresh()})});
```

After:

```typescript
import {tooltip} from '@xh/hoist/cmp/tooltip';
import {dialog} from '@xh/hoist/desktop/cmp/dialog';

dialog({title: 'Edit', isOpen: model.isOpen, onClose: () => model.close(), children: form()});
tooltip({content: 'Refresh now', position: 'bottom', children: button({icon: Icon.refresh()})});
```

The props carry over, except Blueprint-only ones. Hoist's `Dialog` always renders in a portal, so
drop `usePortal`. A `Tooltip` takes `position`, not `placement`, and has no `targetProps` - set
handlers and classes on its child instead.

Do not add `@blueprintjs/core` to an app to keep a Blueprint component. Move it onto Hoist's
nearest component, such as a tree-mode `Grid` for a `Tree` or a `textInput` for `EditableText`.

Hoist's markup keeps Blueprint's `bp6-*` class names in v91, alongside its own `xh-*` ones, so app
CSS that targets them still applies. Hoist ships the Blueprint styles its components use, so they
look as before.

Builds with `@xh/hoist-dev-utils` may log `Could not resolve @blueprintjs/icons - Blueprint icon
stubs disabled`. With no Blueprint in the app, this is harmless.

### 9. Check the Console and the UI

Start the app in development mode. Hoist logs a warning at startup if any size variable resolves to
a bare number - almost always an override the codemod could not see, such as one set from
TypeScript or built with interpolation:

```
[ThemeModel] | CSS size variables must include a unit as of Hoist v91 (e.g. '8px', not '8').
Unitless values found for: --xh-spacing, ...
```

The check covers the active theme at startup. Switch themes and reload to check the other.

Hoist also warns if any `--xh-*` variable is set on `:root` or `html`, by a stylesheet or an inline
style. Move each one it names to `body.xh-app` (Step 4):

```
[ThemeModel] | CSS variables set on :root or html have no effect - Hoist's defaults on body take
precedence. Move these overrides to body.xh-app: --xh-spacing, ...
```

Hoist also warns, once per component, if an element spec sets both `children` and a legacy key.
Only `children` renders. Fix each one it names as described in Step 6:

```
Element spec for "Panel" sets both `children` and a legacy `item` / `items` key. Only `children`
is rendered - use `children` alone.
```

Then review the app in both light and dark themes, and on mobile if applicable.

`StatCard` now starts its content at the top, so cards in a `StatCardStrip` keep their titles and
values on the same lines. A card taller than its content no longer centers that content
vertically. To center it again, set `--xh-stat-card-justify-content: center` - on `body.xh-app` for
every card, or on a container for the cards within it.

Popovers have a stronger border and shadow in v91, so they stand out from the content beneath them.
If your app styles `.bp6-popover` or `.bp6-popover-content` directly to change a border, shadow, or
background, set the new `--xh-popover-*` variables instead. To change one popover, set them on its
`popoverClassName`. See "Dialogs and Popovers" in
[`styles/README.md`](../../styles/README.md#dialogs-and-popovers).

## Verification Checklist

After completing all steps:

- [ ] `pnpm install` / `yarn install` / `npm install` completes without errors.
- [ ] AG Grid packages are on `~36.3.0`, and the console shows no AG Grid version error.
- [ ] `pnpm lint` / `yarn lint` / `npm run lint` passes.
- [ ] `pnpm typecheck` / `npx tsc --noEmit` passes.
- [ ] The application builds and loads without console errors.
- [ ] The CSS codemod report has been reviewed - hook migrations, removed variables, and warnings.
- [ ] No CSS variable overrides remain on `:root`, `html`, or bare `body`.
- [ ] The application loads in development mode without the unitless size variable warning or
  the warning about variables set on `:root` or `html`.
- [ ] Custom colors, spacing, and typography render correctly in both light and dark themes (and on
  mobile, if applicable).
- [ ] Inline masks look as intended if your app styles them (Step 5).
- [ ] Form validation styling looks as intended if you override any `-border-color` (Step 3 note).
- [ ] The items-to-children codemod report has been reviewed - conflicts, unconverted specs and
  spreads (Step 6).
- [ ] The application loads without the console warning about a spec that sets both `children`
  and a legacy `item` / `items` key.
- [ ] Each fetch that sets `params` and changes data, sends a sensitive value, or sends large params
  also sets `method: 'POST'` (Step 7).
- [ ] No imports from `@xh/hoist/kit/blueprint` remain, and any Blueprint components the app keeps
  are styled (Step 8).
- [ ] No references to retired CSS variable names remain:
  ```bash
  # Should return nothing
  grep -rnE -- '--xh-[a-z0-9-]+-px\b|--xh-(pad|tbar)(-|\b)' src
  ```

## Renamed Variables

Beyond the renames below, two rules cover every other retired name:

- **Every `-px` variable** is replaced by its base name, which now holds a length:
  `--xh-font-size-px` → `--xh-font-size`, `--xh-scrollbar-size-px` → `--xh-scrollbar-size`.
- **`--xh-tbar-*`** is now **`--xh-toolbar-*`**, and **`-lr-pad`** is now **`-padding-inline`**:
  `--xh-grid-cell-lr-pad` → `--xh-grid-cell-padding-inline`.

| v90 | v91 |
|---|---|
| `--xh-appbar-color` | `--xh-appbar-text-color` |
| `--xh-appbar-title-color` | `--xh-appbar-title-text-color` |
| `--xh-date-range-picker-accent` | `--xh-date-range-picker-accent-color` |
| `--xh-font-size-large-em` | `--xh-font-size-large-relative` |
| `--xh-font-size-small-em` | `--xh-font-size-small-relative` |
| `--xh-form-field-info-color` | `--xh-form-field-info-text-color` |
| `--xh-form-field-invalid-color` | `--xh-form-field-invalid-text-color` |
| `--xh-form-field-label-color` | `--xh-form-field-label-text-color` |
| `--xh-form-field-msg-font-size` | `--xh-form-field-message-font-size` |
| `--xh-form-field-msg-line-height` | `--xh-form-field-message-line-height` |
| `--xh-form-field-msg-margin` | `--xh-form-field-message-margin` |
| `--xh-form-field-msg-text-transform` | `--xh-form-field-message-text-transform` |
| `--xh-form-field-warning-color` | `--xh-form-field-warning-text-color` |
| `--xh-grid-bg-hover` | `--xh-grid-row-hover-bg` |
| `--xh-grid-bg-odd` | `--xh-grid-odd-row-bg` |
| `--xh-grid-cell-change-bg-highlight` | `--xh-grid-cell-changed-bg` |
| `--xh-grid-cell-focus-border-color` | `--xh-grid-cell-focused-border-color` |
| `--xh-grid-selected-row-bg` | `--xh-grid-row-selected-bg` |
| `--xh-grid-selected-row-text-color` | `--xh-grid-row-selected-text-color` |
| `--xh-grid-tree-group-color-level-0` | `--xh-grid-tree-group-level-0-bg` |
| `--xh-grid-tree-icon-px` | `--xh-grid-tree-icon-size` |
| `--xh-loading-indicator-color` | `--xh-loading-indicator-text-color` |
| `--xh-mobile-input-font-size` | `--xh-input-font-size` |
| `--xh-mobile-input-height-px` | `--xh-input-height` |
| `--xh-mobile-input-label-font-size` | `--xh-input-label-font-size` |
| `--xh-pad` | `--xh-spacing` |
| `--xh-pad-double` | `--xh-spacing-double` |
| `--xh-pad-half` | `--xh-spacing-half` |
| `--xh-pad-safe-all` | `--xh-safe-area-inset` |
| `--xh-pad-safe-bottom` | `--xh-safe-area-inset-bottom` |
| `--xh-pad-safe-left` | `--xh-safe-area-inset-left` |
| `--xh-pad-safe-right` | `--xh-safe-area-inset-right` |
| `--xh-pad-safe-top` | `--xh-safe-area-inset-top` |
| `--xh-scrollbar-thumb` | `--xh-scrollbar-thumb-color` |
| `--xh-segmented-control-pad` | `--xh-segmented-control-padding` |
| `--xh-stat-card-detail-color` | `--xh-stat-card-detail-text-color` |
| `--xh-stat-card-title-color` | `--xh-stat-card-title-text-color` |
| `--xh-tbar-item-pad` | `--xh-toolbar-item-spacing` |
| `--xh-title-pad` | `--xh-title-padding` |
| `--xh-zone-grid-cell-lr-pad-px` | `--xh-zone-grid-cell-padding-inline` |
| `--xh-zone-grid-delimiter-color` | `--xh-zone-grid-delimiter-text-color` |
| `--xh-zone-grid-label-color` | `--xh-zone-grid-label-text-color` |

`--xh-grid-tree-group-color-level-1` through `-9` follow the same pattern as level 0.

**Removed** - none of these had any effect:

| Variable | Note |
|---|---|
| `--xh-chart-bg` | Charts take their background from the Highcharts theme. |
| `--xh-resizable-button-bg` | Unused since v90. Panel splitters read `--xh-panel-splitter-button-bg`. |
| `--xh-resizable-button-icon-color` | Unused since v90. Panel splitters read `--xh-panel-splitter-button-icon-color`. |
| `--xh-tab-border-width` | Never applied. |
| `--xh-toolbar-button-bg` | Never applied. |

## Old Hook Name Mismatches

Some v90 unprefixed hooks were named differently from the variable they configured. The codemod
handles these; for reference, their v91 variables are:

| v90 unprefixed hook | v91 variable |
|---|---|
| `--form-field-info-border-color` | `--xh-form-field-info-border-color` (see Step 3 note) |
| `--form-field-invalid-border-color` | `--xh-form-field-invalid-border-color` (see Step 3 note) |
| `--form-field-warning-border-color` | `--xh-form-field-warning-border-color` (see Step 3 note) |
| `--grid-cell-bg-highlight` | `--xh-grid-cell-changed-bg` |
| `--grid-header-cell-lr-pad` | `--xh-grid-header-padding-inline` |
| `--input-placeholder-color` | `--xh-input-placeholder-text-color` |
| `--popover-backdrop` | `--xh-popover-backdrop-bg` |
| `--popover-shadow` | `--xh-popover-box-shadow` |
| `--zone-grid-cell-pad-px` | `--xh-zone-grid-cell-padding-inline` |

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) - canonical example of a Hoist app.
- [`styles/README.md`](../../styles/README.md) - CSS variable system documentation, including
  naming conventions.
- [`codemod-css-vars.mjs`](../codemod/v91/codemod-css-vars.mjs) - the CSS variable migration codemod.
- [`codemod-items-to-children.mjs`](../codemod/v91/codemod-items-to-children.mjs) - the element
  spec `children` codemod.
- [Element Factories](../../core/README.md#element-factories) - the `children` key, the legacy
  aliases, and authoring container components.
