# TypeDoc Validation Spike (HDOC-01)

**Date:** 2026-02-13
**TypeDoc version:** 0.28.16 (TypeScript peer: 5.0.x through 5.9.x)
**Verdict:** PARTIALLY VIABLE

## Test Configuration

TypeDoc was installed temporarily as a devDependency and run against a representative subset of
hoist-react entry points.

```json
{
  "entryPoints": [
    "./core/index.ts",
    "./data/index.ts",
    "./cmp/grid/index.ts",
    "./cmp/form/index.ts",
    "./svc/index.ts"
  ],
  "tsconfig": "./tsconfig.json",
  "out": "./build/typedoc-html",
  "json": "./build/typedoc.json",
  "exclude": ["**/node_modules/**", "**/mcp/**", "**/build/**"],
  "excludeExternals": true
}
```

Note: The plan originally specified `./cmp/index.ts` as an entry point, but this file does not
exist. The `cmp/` directory has no top-level barrel file; its subdirectories each have their own
`index.ts`. The config was adjusted to use `cmp/grid/index.ts` and `cmp/form/index.ts` as
representative component entry points.

**Entry points tested:** core (full framework core), data (Store, Cube, records), cmp/grid (GridModel,
Column), cmp/form (FormModel, FieldModel), svc (all framework services).

## Risk Area Results

### 1. experimentalDecorators

**Result:** PARTIAL PASS -- TypeDoc runs without errors, decorated properties are present, but decorator annotations are NOT emitted.

TypeDoc 0.28.16 handled the `experimentalDecorators: true` tsconfig setting without any compilation
errors. All 5 entry points compiled and generated output successfully (0 errors, 232 warnings).

However, TypeDoc does **not** emit decorator metadata in its JSON or HTML output. Properties that are
decorated with `@observable`, `@bindable`, `@managed`, or `@persist` appear in the output with their
types and JSDoc comments, but without any indication of which decorators are applied.

For example, `GridModel.columns` (which has `@observable.ref` in source) appears in the JSON as a
standard property (kind=1024) with type `ColumnOrGroup[]` but no decorator annotation. The JSON
schema (v2.0) has no `decorators` key anywhere in the output -- a search across the entire 7.8MB JSON
found zero nodes with a `decorators` key.

The HTML output does mention `@observable` and `@bindable` in two places, but these come from JSDoc
comment text that references decorators, not from TypeDoc detecting decorators on properties.

**Impact:** For MCP use cases where LLMs need to know which properties are observable or bindable,
TypeDoc output alone is insufficient. ts-morph's `getDecorators()` API remains necessary for this
information.

### 2. Barrel Exports

**Result:** PASS

Barrel re-exports through `index.ts` files (using `export * from './Module'`) are fully resolved.
TypeDoc correctly follows the re-export chain and documents symbols at their original declaration
location:

| Symbol | Entry Point | Resolved Source |
|--------|-------------|-----------------|
| GridModel | cmp/grid/index.ts | cmp/grid/GridModel.ts |
| Column | cmp/grid/index.ts | cmp/grid/columns/Column.ts |
| Store | data/index.ts | data/Store.ts |
| HoistModel | core/index.ts | core/model/HoistModel.ts |
| FormModel | cmp/form/index.ts | cmp/form/FormModel.ts |

No duplicate entries were found -- `GridModel` appears exactly once in the output, sourced from its
declaration file, not from the barrel. All 7 classes in the cmp/grid module resolved correctly to
their original source files.

### 3. Object.freeze Enums

**Result:** PASS

TypeDoc correctly documents the hoist-react enum pattern (`export const X = Object.freeze({...})`
with companion `export type X = ...`). Both the type alias and the variable are present:

**RefreshMode example:**
- **Type alias** (kind=2097152): Present at `core/enums/RefreshMode.ts:13` with the indexed access
  type `(typeof RefreshMode)[keyof typeof RefreshMode]`
- **Variable** (kind=32): Present at `core/enums/RefreshMode.ts:13` with type `Readonly<{...}>`
  containing children `ALWAYS`, `ON_SHOW_LAZY`, `ON_SHOW_ALWAYS`
- The HTML output includes a variable page and a type page, both with member values listed
- The JSDoc comment describing RefreshMode's purpose is preserved in both entries

**RenderMode**: Similarly documented with both type alias and variable entries.

This is the cleanest handling of any tool tested -- TypeDoc represents the dual nature of these
frozen-const-as-enum patterns accurately.

### 4. Path Aliases

**Result:** PASS

TypeDoc fully resolves `@xh/hoist/*` path aliases from tsconfig.json. Analysis of the output:

- **128 unique source file paths** in the output, all using clean relative paths (e.g., `cmp/grid/GridModel.ts`)
- **Zero** source file paths containing `@xh/hoist` (unresolved alias)
- **12,489** `@xh/hoist` references in the JSON appear in `"package"` fields, which is TypeDoc's
  normal way of recording package origin for cross-references -- not unresolved imports

TypeDoc uses the TypeScript compiler internally with the provided tsconfig.json, so path alias
resolution is handled natively.

### 5. JSON Output Quality

**Result:** PASS

The JSON output (schema version 2.0, 7.8MB for 5 entry points) is well-structured and
programmatically consumable:

**Structure:**
- Top-level: `schemaVersion`, `children` (modules), `symbolIdMap`, `files`
- Modules map to entry points: `cmp/form`, `cmp/grid`, `core`, `data`, `svc`
- Each symbol has: `id`, `name`, `variant`, `kind`, `flags`, `sources` (file + line + URL), `type`, `comment`

**Symbol Coverage:**
| Category | Count |
|----------|-------|
| Classes | 85 |
| Interfaces | 100 |
| Type Aliases | 96 |
| Variables | 50 |
| Functions | 36 |
| **Total** | **367** |

**JSDoc Preservation:**
- 109 of 185 classes/interfaces have JSDoc comments preserved
- Comments include summary text, `@param` tags, `@returns` tags, and inline `@link` references
- Block tags and modifier tags are structured, not raw strings

**Type Information:**
- Full type objects with resolution: references include target ID, name, and package
- Generic types, arrays, union types, intersection types all represented
- Getter/setter accessors properly typed (kind=262144)

**Weaknesses:**
- No decorator metadata (as noted in Risk Area 1)
- No method body information (expected -- TypeDoc documents API surface, not implementation)
- Cross-module link resolution limited to included entry points (232 warnings about unresolved links)

## Errors/Warnings

TypeDoc completed with **0 errors and 232 warnings**. Warnings fall into three categories:

1. **Unused @param tags** (46 warnings): JSDoc `@param` names not matching actual parameter names,
   primarily for the inherited `addReaction` method's `specs` parameter. This is a JSDoc accuracy
   issue in the source code, not a TypeDoc problem.

2. **"Not included in documentation" references** (31 warnings): Types referenced in the documented
   code but not among the included entry points (e.g., `LocalDate`, `DashViewModel`, `AgGridModel`).
   Expected when documenting a subset of entry points.

3. **"Failed to resolve link"** (155 warnings): JSDoc `{@link}` references pointing to symbols not
   in the documentation set. Same root cause as category 2 -- subset entry points. Would be resolved
   if all packages were included.

No TypeScript compilation errors. No crashes. No silent failures.

## Recommendation

**TypeDoc is PARTIALLY VIABLE for hoist-react documentation.**

### What works well
- Barrel export resolution is excellent -- handles the 56-file re-export chain cleanly
- Object.freeze enum pattern is documented correctly (both type and variable)
- Path alias resolution works natively via tsconfig.json
- JSON output is well-structured and programmatically consumable
- JSDoc comments are faithfully preserved with structured tags
- HTML output generates browsable class pages with hierarchy, members, and navigation
- Class hierarchy rendering works (extends chains, implements)

### What does not work
- **Decorator annotations are completely absent** from both JSON and HTML output. TypeDoc's JSON
  schema (v2.0) has no concept of decorators. This is a significant gap for hoist-react, where
  `@observable`, `@bindable`, `@managed`, and `@persist` decorators carry critical semantic meaning.
  An LLM cannot determine which properties are observable vs. plain from TypeDoc output alone.

### Implications for the project

1. **ts-morph remains the primary extraction source for MCP tools.** ts-morph's `getDecorators()` API
   provides the decorator information that TypeDoc cannot. For the MCP server's `hoist-get-symbol` and
   `hoist-get-members` tools, ts-morph is the authoritative source.

2. **TypeDoc JSON could serve as a supplementary data source.** The JSON output contains well-structured
   type information and JSDoc comments that could cross-validate ts-morph extraction or fill gaps. It
   is not needed for Phase 3 but could be useful in future phases.

3. **TypeDoc HTML could serve future human-browsable documentation needs** if combined with a custom
   plugin or post-processing step that injects decorator annotations. This is out of scope for the
   current project but technically feasible.

4. **TypeDoc should NOT be kept as a permanent dependency** at this time. It adds ~11 packages to
   devDependencies and is not needed for the MCP server's planned functionality. It can be re-added
   if a future phase requires human-browsable docs.
