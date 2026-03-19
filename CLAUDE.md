# CLAUDE.md

This file provides guidance to AI coding assistants — including Claude Code, GitHub Copilot, and
similar tools — when working with code in this repository.

## Project Overview

Hoist-react is the client-side component of the Hoist web application development toolkit, built
by Extremely Heavy Industries (xh.io). It is a **library package** (not a standalone app) published
as `@xh/hoist` and consumed by Hoist application projects. The server-side counterpart is
[hoist-core](https://github.com/xh/hoist-core).

- **Language**: TypeScript
- **Framework**: React with MobX for reactive state management
- **Package manager**: Yarn

## Hoist Developer Tools and Documentation

**IMPORTANT: Do not guess at hoist-react APIs, component props, or framework patterns.** Hoist-react
ships dedicated tools that provide structured access to all framework documentation and TypeScript
type information. **You MUST use these tools before modifying or extending hoist-react code** to
understand existing architecture, configuration patterns, and common pitfalls. The package READMEs
and concept docs are the authoritative reference for how Hoist works -- skipping them risks producing
code that conflicts with established patterns or misses built-in functionality.

Two interfaces are available. Both share the same underlying registries and produce identical output:

**MCP Server (hoist-react)** -- When working in the hoist-react repository, an MCP server is
configured via `.mcp.json` and is very likely already available. Use the `hoist-search-docs`,
`hoist-list-docs`, `hoist-search-symbols`, `hoist-get-symbol`, and `hoist-get-members` tools, plus
`hoist://docs/{id}` resources for direct document access.

**CLI Tools** -- For environments without MCP support, or when you prefer shell commands. These are
real `bin` entries in the hoist-react `package.json` — invoke them exactly as shown with `npx`:

```bash
# Documentation
npx hoist-docs search "grid sorting"         # Search all docs by keyword
npx hoist-docs read cmp/grid                 # Read a specific doc by ID
npx hoist-docs list                          # List all available docs
npx hoist-docs conventions                   # Print coding conventions
npx hoist-docs index                         # Print the documentation catalog

# TypeScript symbols and types
npx hoist-ts search GridModel                # Search for symbols and class members
npx hoist-ts symbol GridModel                # Get detailed type info for a symbol
npx hoist-ts members GridModel               # List all members of a class/interface
```

**Use `search` for discovery** — it does case-insensitive fuzzy matching across both symbol names
and class members. Use `symbol` and `members` only when you already know the exact PascalCase name.
Run `npx hoist-docs --help` and `npx hoist-ts --help` for full usage.

**Recommended workflow:** Start with the documentation index (`hoist-docs index` or `hoist://docs/index`)
to discover available docs. Use the "Quick Reference by Task" table to find the right doc for your
goal, then read the relevant README(s). Supplement with TypeScript symbol lookups for precise API
details. The docs provide architectural context and common pitfalls; the TypeScript tools provide
exact signatures, decorators, and member listings.

### GitHub MCP Server (opt-in)

A Docker-based server providing GitHub API tools (issues, PRs, code search, etc.) via the official
`github-mcp-server` image. This server is configured in `.mcp.json` but **not enabled by default**
— it requires Docker and a GitHub token, which not all developers will have running. If you work
with GitHub issues, PRs, or code search, enabling it is recommended. To do so:

1. Install and start **Docker**
2. Set the **`GITHUB_TOKEN`** environment variable to a GitHub Personal Access Token
3. Add `"github"` to `enabledMcpjsonServers` in `.claude/settings.local.json`:
   ```json
   {
     "enabledMcpjsonServers": ["hoist-react", "github"]
   }
   ```

Local settings merge with the shared `settings.json`, so enabling it locally does not affect other
developers. If Docker is not running or the token is not set when the server is enabled, Claude
Code may show errors on startup — remove `"github"` from your local settings to resolve.

### JetBrains IntelliJ MCP Server (opt-in)

A JetBrains MCP server is also configured in `.mcp.json`, providing tools for interacting with
the IntelliJ IDE (file navigation, code inspections, refactoring, terminal commands, etc.).
This server must be enabled within IntelliJ's settings and requires a running IDE instance to
connect. Add `"jetbrains"` to `enabledMcpjsonServers` in `.claude/settings.local.json` to
enable it for Claude Code.

## Build Commands

```bash
yarn install                     # Install dependencies
yarn lint                        # Lint all code (JS/TS + SCSS)
yarn lint:code                   # Lint JavaScript/TypeScript only
yarn lint:styles                 # Lint SCSS only
npx tsc --noEmit                 # Type check (declarations only, no emit)
```

This is a library — it has no dev server or standalone build. To run locally, use a wrapper
application project (e.g., Toolbox) that includes `@xh/hoist` as a dependency.

## Architecture

### Core Artifacts

The framework is built around three core artifact types:

1. **Models** (`HoistModel`) - State management and business logic classes. Properties are marked
   with MobX decorators to make them observable. Models form hierarchies reflecting app structure.

2. **Components** (`hoistCmp`) - Functional React components wrapped with Hoist support including
   MobX reactivity and model lookup. Created via `hoistCmp.factory({})`.

3. **Services** (`HoistService`) - Singleton classes for data access and app-wide business logic.
   Installed via `XH.installServicesAsync()` and accessed as `XH.myCustomService`.

See [`/core/README.md`](./core/README.md) for detailed coverage of all three artifact types.

### Key Singleton: XH

`XH` (in `core/XH.ts`) is the top-level API entry point. It provides:

- Access to all Hoist services (e.g., `XH.configService`, `XH.fetchService`, `XH.myCustomService`)
- App metadata (`XH.appCode`, `XH.appVersion`)
- Common operations (`XH.toast()`, `XH.confirm()`, `XH.handleException()`)

See [`/core/README.md`](./core/README.md) for the full XH API and
[`/svc/README.md`](./svc/README.md) for built-in service details.

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
    title="Users"
    bbar={<Toolbar><Button text={'Save'}/></Toolbar>}
>
    <Grid model={gridModel}/>
</Panel>
```

Factories can take a config object for props, using the key `item`/`items` for children. A shortcut
form also exists where factories are passed children directly as arguments, when no other props
are required. Factories all support an `omit` prop for conditional rendering.

See [`/core/README.md`](./core/README.md) for full element factory API including conditional
rendering with `omit` and factory creation.

### `HoistBase` for MobX Integration and Lifecycle

All Hoist artifacts extend `HoistBase`, which provides:

#### MobX Integration Conventions

- `addAutorun()` / `addReaction()` - Managed MobX subscriptions (auto-disposed on destroy)
- `makeObservable()` - Called in constructors to set up MobX observables/actions/computeds
- `@observable` MobX decorator - Marks properties as observable state
- `@action` MobX decorator - Marks methods that modify observable state
- `@bindable` Hoist decorator - Marks properties as observable and generates setter methods
  automatically
  marked as `@action` - e.g., `setMyProp(value)` for property `myProp` (Hoist custom decorator).
  **Setter convention:** If a class defines an explicit public `setFoo()` method, call it (it likely
  has additional logic). Otherwise for auto-generated `@bindable` setters, prefer direct assignment
  (`model.myProp = value`) over calling the generated setter (`model.setMyProp(value)`).
- `@computed` MobX decorator - Marks getter properties as derived/computed state

#### Memory/lifecycle Management Conventions

- `@managed` decorator - marks child objects for automatic cleanup - apply to properties holding
  `HoistBase` instances or arrays of such instances.
- `destroy()` - Lifecycle cleanup method. `HoistBase` superclass implementation auto-disposes
  managed
  subscriptions and child objects.

See [`/core/README.md`](./core/README.md) for detailed HoistBase API, persistence support, and
common pitfalls.

### Promise Conventions

- Methods returning Promises are suffixed with `Async` (e.g., `loadUsersAsync`)
- Promise extensions: `catchDefault()`, `track()`, `timeout()`, `linkTo()`

### Prefer Hoist Input Components Over Raw HTML

Always use Hoist's built-in input components (`textInput`, `numberInput`, `select`, `picker`,
`checkbox`, `switchInput`, `dateInput`, `textArea`, etc.) rather than raw HTML `<input>`,
`<select>`,
or `<textarea>` elements. Hoist inputs provide consistent styling, model binding, and proper
integration with the framework's theming and layout system. Raw HTML elements require manual
wrappers and custom SCSS that duplicate what Hoist already provides.

### Platform Support

Components in `/desktop/` and `/mobile/` are platform-specific. Shared code lives in `/cmp/`,
`/core/`, `/data/`, and `/svc/`.

## Code Style

For the full conventions reference — import organization, class structure, component patterns,
null handling, async patterns, error handling, logging, and CSS naming — see
[`docs/coding-conventions.md`](docs/coding-conventions.md). The principles below are the most
important guidelines to internalize:

- **Don't Repeat Yourself** — Extract shared logic into utilities, base class methods, or helpers.
  Balance DRY against readability — extract when a genuine, stable pattern exists, not prematurely.
- **Clear, descriptive naming** — Names should convey intent and read naturally. Be descriptive but
  not verbose (`selectedRecord`, not `r` or `theCurrentlySelectedRecordFromTheStore`).
- **Prefer lodash** for collection/object utilities — it's null-safe, battle-tested, and aids
  readability. Use native JS only when equally expressive (e.g., `array.map()`, `array.filter()`).
- **Keep code concise** — Favor direct, compact expression over verbose or ceremonial patterns.
  Use Hoist's own utilities (`withDefault`, `throwIf`, element factories) to reduce boilerplate.
- **Named exports only** — No default exports. Components export `[Component, factory]` pairs
  from library code, factory only from application/impl code.
- **`null` over `undefined`** — Use `null` as the "no value" sentinel. Check with `== null`
  (loose equality) for concise null-or-undefined testing.

**Commit messages, PRs, and comments**: Do not hard-wrap lines in commit message bodies, pull
request descriptions, or issue/PR comments. Write each sentence or thought as a single unwrapped
line and let the viewing tool handle display wrapping.

## Changelog Maintenance

The project changelog is `CHANGELOG.md` at the repository root. New entries go under the topmost
`-SNAPSHOT` version heading, using emoji-prefixed section headers (e.g. `### 🎁 New Features`,
`### 🐞 Bug Fixes`). Use past-tense, action-driven language and name specific classes, methods, and
config keys in backticks. Hard-wrap changelog entries at 100 characters (unlike commit messages and
PR descriptions, which should not be wrapped). See [`docs/changelog-format.md`](docs/changelog-format.md)
for the full format reference including section headers, voice guidelines, and breaking change
requirements.

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
  developers only. Note that the client-side code that uses hoist-react is in the
  `../toolbox/client-app/src`
  directory - focus your attention there.

When working on hoist-react library code or documentation, reference Toolbox for practical examples
of how features are used in applications. Note that the local checkout is specific to the Hoist
development environment and would not be available to general application developers who have
hoist-react as a dependency.
