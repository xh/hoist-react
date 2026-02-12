# Testing Patterns

**Analysis Date:** 2026-02-11

## Test Framework

**Status:** No test suite present in hoist-react library

**Reasoning:**
- Hoist-react is a library package, not an application
- Testing is performed in consuming applications (e.g., Toolbox, Jobsite, Veracity)
- Library is validated through usage in production applications

**Validation:**
- No test files found in source directories (no `*.test.*` or `*.spec.*` files outside node_modules)
- No test runner configuration (`jest.config.*`, `vitest.config.*`) in root
- No test scripts in `package.json`
- `package.json` scripts section contains only linting commands

## Quality Assurance Approach

**Primary Validation:**
- Type checking via TypeScript compiler (`tsc --noEmit`)
- ESLint static analysis for code quality
- Prettier for code formatting consistency
- Stylelint for SCSS validation
- Manual testing via reference applications

**Commands:**
```bash
yarn lint              # Run all linters
yarn lint:code         # ESLint for TypeScript
yarn lint:styles       # Stylelint for SCSS
npx tsc --noEmit       # Type checking
```

## Lint-Staged (Pre-commit Testing)

**Framework:** lint-staged 16.x with husky 9.x

**Configuration in `package.json`:**
```json
"lint-staged": {
  "*.{js,jsx,ts,tsx}": [
    "prettier --write",
    "eslint"
  ],
  "*.s?(a|c)ss": [
    "prettier --write",
    "stylelint"
  ]
}
```

**Pattern:**
- Pre-commit hook runs linters on staged files only
- Automatically formats with Prettier before linting
- Blocks commit if lint errors found

## Type Safety Patterns

**TypeScript Configuration:**
- `experimentalDecorators: true` - Required for MobX decorators
- `noImplicitOverride: true` - Enforces explicit override keyword
- `composite: true` - Project references support
- `emitDeclarationOnly: true` - Only emit type declarations
- `skipLibCheck: true` - Skip lib checking for performance

**Type Validation:**
- Strong typing throughout codebase
- Generic constraints used extensively (e.g., `<M extends GridModel>`)
- Discriminated unions for variant types
- Type guards for runtime checks (e.g., `isColumnSpec(spec): spec is ColumnSpec`)

**Example from `cmp/grid/Types.ts`:**
```typescript
export function isColumnSpec(spec: ColumnOrGroupSpec): spec is ColumnSpec {
    return !(spec as any).children;
}
```

## Runtime Validation Patterns

**Assertions:**
- `throwIf()` for validation with descriptive messages
- `warnIf()` for non-fatal issues
- Development mode checks via `xhIsDevelopmentMode` global
- MobX observable registration validation in dev mode

**Example from `CardModel.ts`:**
```typescript
@action
setCollapsed(collapsed: boolean) {
    throwIf(collapsed && !this.collapsible, 'Card does not support collapsing.');
    this.collapsed = collapsed;
}
```

**Development Mode Checks:**
- `checkMakeObservable(this)` called in HoistBase constructor during dev
- Validates that MobX decorators are properly registered
- Only active when `xhIsDevelopmentMode` is true

## Code Quality Tools

**ESLint Configuration:**
- File: `eslint.config.js` (flat config format)
- Base: `@xh/eslint-config`
- Plugins: `eslint-plugin-tsdoc` for documentation validation
- Integration: `eslint-config-prettier` prevents conflicts
- Global ignores: `build/**/*`, `.yarn/**/*`, `node_modules/**/*`

**Prettier Configuration:**
- File: `.prettierrc.json`
- Enforces consistent code style
- Integrated into lint-staged workflow
- Runs before ESLint to auto-fix formatting

**Stylelint Configuration:**
- File: `.stylelintrc`
- Base: `stylelint-config-standard-scss`
- Validates SCSS syntax and conventions

## Testing in Consumer Applications

**Reference Applications:**
While hoist-react itself has no test suite, it is validated through usage in:

1. **Toolbox** - XH demo/testbed application
   - Contains component library demos
   - Example apps in `toolbox/client-app/src/examples`
   - Publicly available reference implementation

2. **Production Applications** (not publicly available)
   - Jobsite - XH internal time tracking/invoicing tool
   - Veracity - Large residential mortgage industry application
   - DirectLend - Commercial lending deals application

**Testing Approach:**
- Components tested in real-world usage contexts
- Integration testing via application builds
- Type safety validated at application compile time
- Runtime behavior validated through application usage

## Documentation as Testing

**TSDoc Enforcement:**
- TSDoc syntax validated via `eslint-plugin-tsdoc`
- Warnings emitted for malformed documentation
- Ensures API documentation accuracy

**Documentation Pattern:**
```typescript
/**
 * Core superclass for Services in Hoist.
 *
 * Services are special classes used in both Hoist and application code as
 * centralized points for managing app-wide state and loading / processing
 * data from external APIs.
 *
 * @see XH.installServicesAsync
 */
export class HoistService extends HoistBase {
    /**
     * Called by framework or application to initialize before application startup.
     * Throwing an exception from this method will typically block startup.
     * Service writers should take care to stifle and manage all non-fatal exceptions.
     */
    async initAsync(): Promise<void> {}
}
```

## Build-time Validation

**Type Declarations:**
- Generated to `./build/types` directory
- TypeScript compiler validates entire codebase
- Declarations ensure type safety for consumers

**Build Configuration:**
```json
{
  "compilerOptions": {
    "composite": true,
    "emitDeclarationOnly": true,
    "declarationDir": "./build/types"
  }
}
```

## Common Validation Patterns

**Null/Undefined Checks:**
- Use lodash utilities (`isNil`, `isEmpty`)
- TypeScript strict null checks enabled
- Example: `if (this.collapsible && !isNil(collapsed)) this.collapsed = collapsed;`

**Type Guards:**
- Custom type guard functions for runtime checks
- Pattern: `function isFoo(x): x is Foo { ... }`
- Used extensively in grid column type discrimination

**Enum Validation:**
- String literal unions for type-safe enums
- Example: `type Intent = 'primary' | 'success' | 'warning' | 'danger'`

## Error Prevention Patterns

**Immutability:**
- `readonly` properties prevent accidental modification
- Example from `CardModel.ts`:
```typescript
readonly collapsible: boolean;
readonly defaultCollapsed: boolean;
readonly renderMode: RenderMode;
```

**Memory Leak Prevention:**
- `@managed` decorator for automatic cleanup
- `destroy()` lifecycle method for resource disposal
- Disposers array for MobX reactions

**Observable Registration:**
- Development mode validation ensures `makeObservable()` called
- Prevents silent MobX reactivity failures

## No Unit Testing Rationale

**Design Philosophy:**
- Hoist-react is infrastructure, not application logic
- Components are presentation/coordination, not business logic
- Framework stability proven through production usage
- Type system provides compile-time safety
- Linting provides static analysis
- Real-world applications provide integration testing

**Quality Metrics:**
- Type coverage via TypeScript
- Lint rule compliance via ESLint
- Style consistency via Prettier
- Production stability in multiple large applications

---

*Testing analysis: 2026-02-11*
