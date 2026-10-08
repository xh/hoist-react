# Hoist React v89 Upgrade Notes

> **From:** v88.x → v89.0.0 | **Released:** TBD | **Difficulty:** 🟢 LOW

## Overview

Hoist React v89 is a light upgrade with one required change and one strongly recommended change.

- **TypeScript 7 (strongly recommended)** - Hoist now builds and type-checks with TypeScript 7, the
  native port of the TypeScript compiler. Apps should move to it with this release. It takes a
  `package.json` change and two `tsconfig.json` options - see Steps 2-3.
- **`GridFilterModelConfig.fieldSpecs` (required review)** - `fieldSpecs` is no longer an
  allow-list. A grid with `filterable` columns that `fieldSpecs` omits now shows a filter on those
  columns - see Step 5.

Apps can also stay on TypeScript 5.9. Hoist v89 type-checks under 5.9, 6, and 7, so the TypeScript
move does not have to ship with the Hoist bump. We still recommend that you take both together.

## Why Move to TypeScript 7

TypeScript 7 is a port of the TypeScript 6 compiler to Go. It applies the same type rules as
TypeScript 6 and type-checks much faster. See the [TypeScript 7.0 announcement][ts7] for
Microsoft's benchmarks.

Reasons to move now:

- **Faster type checks.** The `pnpm typecheck` step runs meaningfully faster in CI and locally,
  and the gain grows with the size of the codebase.
- **TypeScript 6 is the last JavaScript release.** Microsoft builds all future TypeScript
  releases on the native compiler. An app that stays on 5.9 builds up migration debt. An app on 7
  takes later releases as routine bumps.
- **The work is small and the same for TypeScript 6.** The `tsconfig.json` changes in Step 3 come
  from new TypeScript 6 defaults. You must make them for any TypeScript upgrade, so a stop at 6
  first adds a second migration and no safety.
- **Same toolchain as Hoist.** Hoist itself builds with TypeScript 7 from v89, and Toolbox checks
  against it in CI.

App builds do not change. `@xh/hoist-dev-utils` compiles with Rsbuild and SWC, which do not use
the TypeScript compiler. TypeScript 7 changes only the `tsc` type check.

### When to Wait

TypeScript 7.0 has no programmatic API. The new API is planned for TypeScript 7.1. A tool that
imports the `typescript` package as a library cannot run on 7.0. ESLint is not affected, because
`@xh/eslint-config` brings its own copy of TypeScript. Check for these cases before you start:

- **Compiler API tools in `client-app/package.json`.** Tools such as `ts-node`, `ts-jest`, custom
  transformers, or an ESLint plugin that the app adds itself import `typescript`. If the app uses
  one, wait for TypeScript 7.1 and for the tool to support it.
- **Separate TypeScript projects.** A test or infrastructure project with its own `package.json`
  and `tsconfig.json` does not need to move with the app. Leave it on its current TypeScript
  version. A project that runs through `ts-node` cannot move to TypeScript 7 until `ts-node`
  supports it.
- **Private registry mirrors.** TypeScript 7 installs its compiler as a native binary, through a
  per-platform optional dependency such as `@typescript/typescript-linux-x64`. If your CI installs
  from a private mirror, confirm that the mirror serves these packages before you switch.

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v88.x with `@xh/hoist-dev-utils` 16.x.
- [ ] **Node.js >= 22.15** (unchanged from v88).
- [ ] **hoist-core** at the same version as for v88. v89 adds no new server requirements.
- [ ] Your package manager (**pnpm**, **yarn**, or **npm**) is available and working.

## Upgrade Steps

### 1. Update `package.json`

Bump hoist-react to v89.

**File:** `client-app/package.json`

Before:

```json
"@xh/hoist": "^88.0.0",
```

After:

```json
"@xh/hoist": "^89.0.0",
```

If you stay on TypeScript 5.9, skip to Step 5.

### 2. Update TypeScript

**File:** `client-app/package.json`

Before:

```json
"typescript": "~5.9.3"
```

After:

```json
"typescript": "~7.0.2"
```

Then run `pnpm install` / `yarn install` / `npm install`, and confirm the version:

```bash
npx tsc -v    # Version 7.0.2
```

- **ESLint needs no change.** `@xh/eslint-config` bundles its own TypeScript for linting and keeps
  it separate from the app's copy. Version 8.1 bundles TypeScript 6, and apps on `^8.0.1` get it
  on their next update.
- **IntelliJ added TypeScript 7 support in version 2026.2.** Update the IDE first. If it does not
  pick up TypeScript 7, select it in the IDE's TypeScript settings.

### 3. Update `tsconfig.json`

TypeScript 6 changed several defaults, and TypeScript 7 keeps them. Two of the new defaults break
Hoist apps, so set the old values explicitly. Both options are valid on TypeScript 5.9 too.

**File:** `client-app/tsconfig.json`

Before:

```json
{
    "compilerOptions": {
        "skipLibCheck": true,
        "useDefineForClassFields": true
    }
}
```

After:

```json
{
    "compilerOptions": {
        "noUncheckedSideEffectImports": false,
        "skipLibCheck": true,
        "strict": false,
        "useDefineForClassFields": true
    }
}
```

- **`strict`** now defaults to `true`. Hoist and Hoist apps are not written for strict mode, and an
  app reports thousands of errors without this setting. Skip it if your app already sets `strict`.
- **`noUncheckedSideEffectImports`** now defaults to `true`. It rejects every
  `import './MyPanel.scss'`, because TypeScript cannot find declarations for a stylesheet. As an
  alternative, keep the check on and declare stylesheet modules in a `.d.ts` file:
  `declare module '*.scss';`.

Check for these other changes, which do not affect a standard Hoist app:

- **`types`** now defaults to `[]`, so TypeScript no longer loads every `@types` package
  automatically. If the app uses globals from one, such as `process` from `@types/node`, list it:
  `"types": ["node"]`.
- **`baseUrl`** and **`moduleResolution: node`** are removed. Hoist apps use
  `moduleResolution: bundler` and no `baseUrl`.

```bash
grep -nE "baseUrl|moduleResolution|\"strict\"|\"types\"" client-app/tsconfig.json
```

### 4. Fix Inference Differences

TypeScript 7 can infer a type differently from TypeScript 5.9 in rare cases. Run the type check
and fix each error at the call site.

```bash
pnpm typecheck    # or: npx tsc --noEmit
```

Toolbox hit one case. TypeScript 7 infers `string[]` for an array that mixes typed constants with a
string literal, where 5.9 kept the union type:

Before:

```typescript
@bindableRef accessor presets: DateRangePresetToken[] = sortBy(
    [...DEFAULT_DATE_RANGE_PRESETS, 'prevDay'],
    it => DATE_RANGE_PRESET_TOKENS.indexOf(it)
);
```

After:

```typescript
@bindableRef accessor presets: DateRangePresetToken[] = sortBy(
    [...DEFAULT_DATE_RANGE_PRESETS, 'prevDay' as DateRangePresetToken],
    it => DATE_RANGE_PRESET_TOKENS.indexOf(it)
);
```

v89 also fixes a Hoist typing that failed under TypeScript 6 and later. `GridProps.agOptions` now
accepts an `HTMLElement` for `popupParent` and the other DOM-typed AG Grid options. No app change
is needed.

### 5. Review `GridFilterModelConfig.fieldSpecs`

`fieldSpecs` is no longer an allow-list. `GridFilterModel` now creates a default spec for every
`filterable` column that `fieldSpecs` omits, and for columns added later through `setColumns()`.
Before v89, a spec for any one field disabled filters on all other `filterable` columns.

**Find affected files:**

```bash
grep -rn "fieldSpecs" client-app/src/
```

For each grid that sets `fieldSpecs`, check the columns that the list omits. If a column should
have no filter, set `filterable: false` on it.

Before:

```typescript
filterModel: {
    fieldSpecs: ['company', 'city']
},
columns: [
    {field: 'company', filterable: true},
    {field: 'city', filterable: true},
    {field: 'notes', filterable: true}    // v88: no filter, because fieldSpecs omits it
]
```

After:

```typescript
filterModel: {
    fieldSpecs: ['company', 'city']
},
columns: [
    {field: 'company', filterable: true},
    {field: 'city', filterable: true},
    {field: 'notes', filterable: false}
]
```

You can now pass a spec for only the fields that need custom config, such as a values renderer.

### 6. Review Grid Rendering Defaults

Two `Grid` rendering defaults changed for performance. Most apps need no change, but check the
two cases below.

**Column virtualisation is on by default.** `GridModel.useVirtualColumns` now defaults to `true`,
so a grid renders cells only for the columns within or near its viewport (ag-Grid's own default).
Hoist's autosizing does not depend on rendered cells, so it is unaffected. If a grid needs every
column's cells in the DOM - typically for test automation that reads offscreen cells - set the
flag explicitly:

```typescript
new GridModel({
    useVirtualColumns: false,
    ...
});
```

**Plain cells have no wrapper span.** A column with no `renderer` now displays its value as text
written by ag-Grid, with no React component and no `xh-cell-inner-wrapper` span in the cell. The
cell carries an `xh-cell--plain` class. Columns with a `renderer`, tree columns, and columns with
an ag-Grid `cellRenderer` via `agOptions` are unchanged.

**Find affected styles and selectors:**

```bash
grep -rn "xh-cell-inner-wrapper" client-app/src/
```

For a rule that should apply to such a column, target the cell. For a renderer-less column that
must keep the span, add a renderer that returns the value.

Before:

```scss
.my-grid .xh-cell-inner-wrapper {
  color: var(--xh-text-color-muted);
}
```

After:

```scss
.my-grid .ag-cell {
  color: var(--xh-text-color-muted);
}
```

## Verification Checklist

After completing all steps:

- [ ] `pnpm install` / `yarn install` / `npm install` completes without errors.
- [ ] `npx tsc -v` reports TypeScript 7 (if you took Steps 2-3).
- [ ] `pnpm lint` / `yarn lint` / `npm run lint` passes.
- [ ] `pnpm typecheck` / `npx tsc --noEmit` passes.
- [ ] The CI type check step passes.
- [ ] The application builds and loads without console errors.
- [ ] Grids with a `GridFilterModel` show filters only on the intended columns.
- [ ] Wide grids scroll as expected, and any automation reading offscreen cells sets
      `useVirtualColumns: false`.
- [ ] Styles targeting `xh-cell-inner-wrapper` still apply where intended.

## Reference

- [Announcing TypeScript 7.0][ts7]
- [Announcing TypeScript 6.0][ts6] - the full list of changed defaults and removed options.
- [Toolbox on GitHub](https://github.com/xh/toolbox) - canonical example of a Hoist app.

[ts6]: https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/
[ts7]: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
