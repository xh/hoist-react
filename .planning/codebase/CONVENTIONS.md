# Coding Conventions

**Analysis Date:** 2026-02-11

## Naming Patterns

**Files:**
- TypeScript component files: PascalCase (e.g., `Card.ts`, `GridModel.ts`, `HoistService.ts`)
- Barrel exports: `index.ts` in each package directory
- SCSS files: Match component name (e.g., `Card.scss` for `Card.ts`)
- Type definition files: PascalCase with descriptive suffix (e.g., `Types.ts`, `Interfaces.ts`)
- Implementation files: lowercase prefix `impl/` (e.g., `impl/InstallServices.ts`)

**Functions:**
- Standard functions: camelCase (e.g., `loadAsync`, `initAsync`, `setCollapsed`)
- Element factory functions: lowercase matching component (e.g., `card()`, `grid()`, `panel()`)
- Async functions: Always suffixed with `Async` (e.g., `loadAsync`, `refreshAsync`, `doLoadAsync`)
- Boolean predicates: Prefix with `is`, `has`, `can` (e.g., `isHoistBase`, `hasRole`, `canEdit`)

**Variables:**
- Local variables: camelCase (e.g., `collapsed`, `renderMode`, `gridModel`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `SCROLLBAR_SIZE`, `TEST_ID`)
- Private fields: Prefix with underscore (e.g., `_created`, `_destroyed`, `_xhImpl`)
- Boolean variables: Descriptive names (e.g., `collapsible`, `maskMoney`, `lockDashEditing`)

**Types:**
- Interfaces: PascalCase, often suffixed with purpose (e.g., `CardProps`, `CardModelConfig`, `GridConfig`)
- Type aliases: PascalCase (e.g., `ColumnOrGroup`, `RowClassFn`, `Some`)
- Enums: PascalCase for name, camelCase for values
- Generic type parameters: Single uppercase letter or descriptive (e.g., `<T>`, `<M extends GridModel>`)

**Classes:**
- Models: Suffix with `Model` (e.g., `CardModel`, `GridModel`, `AppModel`)
- Services: Suffix with `Service` (e.g., `HoistService`, `LookupService`, `TimeEntryService`)
- Base classes: Prefix with `Hoist` or `Base` (e.g., `HoistBase`, `HoistModel`, `BaseFilterFieldSpec`)

## Code Style

**Formatting:**
- Tool: Prettier 3.x
- Config: `.prettierrc.json`
- Print width: 100 characters
- Tab width: 4 spaces (TypeScript), 2 spaces (SCSS, JSON)
- Quotes: Single quotes for strings
- Arrow function parens: Avoid when possible (`arrowParens: "avoid"`)
- Bracket spacing: No spaces inside object literals (`{foo}` not `{ foo }`)
- Trailing commas: None (`trailingComma: "none"`)
- Semicolons: Required

**Linting:**
- Tool: ESLint 9.x with flat config (`eslint.config.js`)
- Base config: `@xh/eslint-config`
- Additional plugins: `eslint-plugin-tsdoc` for TSDoc syntax validation
- TSDoc warnings enabled via `tsdoc/syntax: warn`
- Prettier integration: `eslint-config-prettier` to disable conflicting rules

**SCSS Linting:**
- Tool: Stylelint 16.x
- Config: `stylelint-config-standard-scss`
- Disabled rules: `no-descending-specificity`, `no-duplicate-selectors`

## Import Organization

**Order:**
1. External libraries (React, MobX, lodash, etc.)
2. Hoist framework imports from `@xh/hoist/*`
3. Application/package-relative imports (e.g., `../core`, `./GridModel`)
4. SCSS imports (always last, e.g., `./Card.scss`)

**Path Aliases:**
- `@xh/hoist/*` maps to root directory (configured in `tsconfig.json`)
- Used extensively for cross-package imports within hoist-react

**Import Style:**
- Named imports preferred (e.g., `import {card, grid} from '@xh/hoist/cmp/layout'`)
- Default imports for external libraries (e.g., `import classNames from 'classnames'`)
- Destructure specific exports from lodash (e.g., `import {isEmpty, isNil} from 'lodash'`)

**Examples from codebase:**
```typescript
// External
import classNames from 'classnames';
import {isEmpty, isNil} from 'lodash';
import {action, observable} from 'mobx';

// Hoist framework
import {box, fieldset} from '@xh/hoist/cmp/layout';
import {HoistModel, managed} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';

// Relative
import {CardModel} from './CardModel';
import './Card.scss';
```

## Error Handling

**Patterns:**
- Use `throwIf()` utility for validation (e.g., `throwIf(collapsed && !this.collapsible, 'Card does not support collapsing.')`)
- Use `warnIf()` for non-fatal issues (e.g., `warnIf(tooltip && isMobileApp, 'Tooltips are not supported on mobile - will be ignored.')`)
- Async errors: Wrap in try/catch and use `XH.handleException(e)` for centralized handling
- Service initialization: Catch and manage all non-fatal exceptions to avoid blocking startup
- Loading errors: Track via `lastLoadException` property on Loadable objects

**Exception handling example:**
```typescript
try {
    await XH.timeEntryService.updateReleaseDateAsync(newDate);
    XH.successToast('Release date updated successfully');
} catch (e) {
    XH.handleException(e);
}
```

## Logging

**Framework:** Custom utilities in `@xh/hoist/utils/js`

**Patterns:**
- Available on all HoistBase instances via delegate methods:
  - `this.logInfo(...messages)`
  - `this.logWarn(...messages)`
  - `this.logError(...messages)`
  - `this.logDebug(...messages)`
- Context wrappers: `withInfo()`, `withDebug()` for scoped logging
- Development mode: Additional validation via `checkMakeObservable()` in dev builds

## Comments

**When to Comment:**
- Public API documentation: Always use JSDoc for exported classes, interfaces, methods
- Complex business logic: Inline comments explaining "why" not "what"
- TODO markers: Use for planned improvements (e.g., `// TODO - review other state inserted by library`)
- License headers: Every file includes standard copyright header

**JSDoc/TSDoc:**
- Enabled and validated via `eslint-plugin-tsdoc`
- Used extensively on:
  - Class declarations with purpose and lifecycle notes
  - Public methods with `@param` and `@returns` tags
  - Complex type definitions
  - Framework extension points (e.g., `doLoadAsync()`)
- Example from `HoistService.ts`:
```typescript
/**
 * Core superclass for Services in Hoist. Services are special classes used in both Hoist and
 * application code as centralized points for managing app-wide state and loading / processing
 * data from external APIs.
 *
 * Services are distinct from Models in that they are typically constructed and initialized within
 * either `XH` (for Hoist-provided services) or within the `initAsync()` method of your primary
 * `AppModel` - see {@link XH.installServicesAsync}.
 */
export class HoistService extends HoistBase implements Loadable {
    // ...
}
```

**Copyright Header:**
- Present in all source files
- Format:
```typescript
/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
```

## Function Design

**Size:** No strict limits, but methods should be focused on single responsibility

**Parameters:**
- Use config objects for functions with multiple optional parameters
- Example: `constructor({collapsible = false, defaultCollapsed = false, ...}: CardModelConfig = {})`
- Destructure in parameter list when practical
- Use `Partial<>` wrapper for config objects when all properties are optional

**Return Values:**
- Async functions always return `Promise<T>`
- Use `void` for functions with no return value
- Type return values explicitly in public APIs
- Use union types for multiple possible returns (e.g., `Promise<void> | undefined`)

**Async Conventions:**
- All async methods end with `Async` suffix
- Return promises explicitly typed
- Use `async/await` syntax, not `.then()` chains
- Example from `AppModel.ts`:
```typescript
async showSetReleaseDatePromptAsync() {
    const newDate = await XH.prompt<LocalDate>({...});
    if (newDate) {
        try {
            await XH.timeEntryService.updateReleaseDateAsync(newDate);
        } catch (e) {
            XH.handleException(e);
        }
    }
}
```

## Module Design

**Exports:**
- Barrel exports via `index.ts` in each package
- Export all public APIs (components, models, types) from barrel
- Example from `cmp/card/index.ts`:
```typescript
export * from './Card';
// Exports both Card component and card factory
```

**Barrel Files:**
- Used extensively throughout codebase
- Located at package root (e.g., `cmp/card/index.ts`)
- Export all public artifacts from package
- Allow importing from package root: `import {card, CardModel} from '@xh/hoist/cmp/card'`

## MobX Patterns

**Decorators:**
- `@observable` - Standard observable property
- `@observable.ref` - Reference equality only (e.g., for objects/arrays)
- `@action` - Methods that modify observables
- `@computed` - Derived/calculated properties
- `@bindable` - Hoist custom decorator combining `@observable` with auto-generated `@action` setter
- `@managed` - Marks child objects for automatic cleanup on destroy

**MobX Registration:**
- Every class with MobX decorators MUST call `makeObservable(this)` in constructor
- Typically first line after `super()`:
```typescript
constructor() {
    super();
    makeObservable(this);
}
```

**Setter Convention:**
- For `@bindable` properties, prefer direct assignment over calling generated setter
- Exception: If explicit `setFoo()` method exists (not auto-generated), call it as it likely has additional logic
- Example:
```typescript
// Prefer this for @bindable
model.collapsed = true;

// Over this
model.setCollapsed(true); // Only if setCollapsed has custom logic
```

## TypeScript Conventions

**Compiler Options:**
- Target: ES2022
- Module: ES2022
- JSX: react (element factories preferred over JSX)
- Experimental decorators: enabled
- Strict mode: enabled (noImplicitOverride, etc.)

**Type Annotations:**
- Explicit return types on public methods
- Inferred types acceptable for local variables
- Use `readonly` for immutable properties
- Example from `CardModel.ts`:
```typescript
readonly collapsible: boolean;
readonly defaultCollapsed: boolean;
readonly renderMode: RenderMode;
```

**Interface vs Type:**
- Use `interface` for object shapes and component props (e.g., `CardProps`, `GridConfig`)
- Use `type` for unions, functions, and complex types (e.g., `ColumnRenderer`, `GridContextMenuToken`)

---

*Convention analysis: 2026-02-11*
