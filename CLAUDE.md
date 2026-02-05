# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Overview

Hoist React is a full-stack UI development framework for building enterprise web applications. It
provides a curated collection of third-party and custom components, state management, and utilities
built on React and MobX.

## Commands

```bash
# Install dependencies
yarn

# Lint all code
yarn lint
yarn lint:code    # JavaScript/TypeScript only
yarn lint:styles  # SCSS only

# Type checking (declarations only, no emit)
npx tsc --noEmit
```

This is a library package - it has no test suite or dev server. It's meant to be used as a
dependency in Hoist applications (e.g., Toolbox).

## Architecture

### Core Artifacts

The framework is built around three core artifact types:

1. **Models** (`HoistModel`) - State management and business logic classes. Properties are marked
   with MobX decorators to make them observable. Models form hierarchies reflecting app structure.

2. **Components** (`hoistCmp`) - Functional React components wrapped with Hoist support including
   MobX reactivity and model lookup. Created via `hoistCmp.factory({})`.

3. **Services** (`HoistService`) - Singleton classes for data access and app-wide business logic.
   Installed via `XH.installServicesAsync()` and accessed as `XH.myCustomService`.

### Key Singleton: XH

`XH` (in `core/XH.ts`) is the top-level API entry point. It provides:

- Access to all Hoist services (e.g., `XH.configService`, `XH.fetchService`, `XH.myCustomService`)
- App metadata (`XH.appCode`, `XH.appVersion`)
- Common operations (`XH.toast()`, `XH.confirm()`, `XH.handleException()`)

### Directory Structure

Key hoist-react packages include:

- `/admin/` - Built-in admin console
- `/cmp/` - Cross-platform components (Grid, Chart, inputs, layout)
- `/core/` - Base classes (HoistBase, HoistModel, HoistService), XH singleton, component factory
- `/data/` - Store, StoreRecord, Field, filters, and validation
- `/desktop/` - Desktop-specific components and app container
- `/format/` - Number/date formatters
- `/icon/` - Icon utilities
- `/mobile/` - Mobile-specific components and app container
- `/mobx/` - MobX re-exports and utilities
- `/promise/` - Promise extensions (catchDefault, track, timeout, linkTo)
- `/security/` - OAuth clients
- `/styles/` - Global styles and CSS variables
- `/svc/` - Built-in services (Fetch, Config, Pref, Identity, etc.)

### Element Factories vs JSX

Hoist strongly encourages rendering components via element factories (created at component
definition time via the `hoistCmp.factory` util) over JSX. This minimizes XML-style markup and
keeps client side codebases anchored in standard TypeScript/JavaScript syntax:

```typescript
// Element factory style - strongly preferred
panel({
    title: 'Users',
    items: [grid({model: gridModel})],
    bbar: toolbar(button({text: 'Save'}))
})
```

```jsx
// JSX also fully supported - but rarely used by XH
< Panel
title = "Users"
bbar = {<Toolbar><Button text={'Save'}/></Toolbar>}
>
    <Grid model = {gridModel} />
</Panel>
```

Factories can take a config object for props, using the key `item`/`items` for children. A shortcut
form also exists where factories are passed children directly as arguments, when no other props
are required. Factories all support an `omit` prop for conditional rendering.

### `HoistBase` for MobX Integration and Lifecycle

All Hoist artifacts extend `HoistBase`, which provides:

#### MobX Integration Conventions
- `addAutorun()` / `addReaction()` - Managed MobX subscriptions (auto-disposed on destroy)
- `makeObservable()` - Called in constructors to set up MobX observables/actions/computeds
- `@observable` MobX decorator - Marks properties as observable state
- `@action` MobX decorator - Marks methods that modify observable state
- `@bindable` Hoist decorator - Marks properties as observable and generates setter methods automatically
  marked as `@action` - e.g., `setMyProp(value)` for property `myProp` (Hoist custom decorator).
  **Setter convention:** If a class defines an explicit public `setFoo()` method, call it (it likely
  has additional logic). Otherwise for auto-generated `@bindable` setters, prefer direct assignment
  (`model.myProp = value`) over calling the generated setter (`model.setMyProp(value)`).
- `@computed` MobX decorator - Marks getter properties as derived/computed state

#### Memory/lifecycle Management Conventions
- `@managed` decorator - marks child objects for automatic cleanup - apply to properties holding
  `HoistBase` instances or arrays of such instances.
- `destroy()` - Lifecycle cleanup method. `HoistBase` superclass implementation auto-disposes managed
  subscriptions and child objects.

### Promise Conventions

- Methods returning Promises are suffixed with `Async` (e.g., `loadUsersAsync`)
- Promise extensions: `catchDefault()`, `track()`, `timeout()`, `linkTo()`

### Platform Support

Components in `/desktop/` and `/mobile/` are platform-specific. Shared code lives in `/cmp/`,
`/core/`, `/data/`, and `/svc/`.

## Code Style

- TypeScript with experimental decorators enabled
- ESLint with `@xh/eslint-config` and TSDoc syntax checking
- Prettier for formatting
- Stylelint for SCSS

## Key Dependencies

- **MobX** - Reactive state management
- **ag-Grid** - Data grid (requires separate license for enterprise features)
- **Blueprint** - UI component library
- **Router5** - Client-side routing
- **Highcharts** - Charting (requires separate license)

## Reference Implementation: Toolbox

Toolbox is XH's example application showcasing hoist-react patterns and components. It provides
real-world usage examples of models, components, services, and other framework features.

- **GitHub**: https://github.com/xh/toolbox
- **Local checkout**: `../toolbox` (relative to hoist-react root) - likely exists for Hoist library
  developers only. Note that the client-side code that uses hoist-react is in the `../toolbox/client-app/src`
  directory - focus your attention there.

When working on hoist-react library code or documentation, reference Toolbox for practical examples
of how features are used in applications. Note that the local checkout is specific to the Hoist
development environment and would not be available to general application developers who have
hoist-react as a dependency.
