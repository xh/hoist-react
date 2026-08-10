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
- **Package manager**: pnpm (version pinned via the `packageManager` field in `package.json`)

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
`hoist-list-docs`, `hoist-read-doc`, `hoist-search-symbols`, `hoist-get-symbol`, and
`hoist-get-members` tools, plus `hoist://docs/{id}` resources for direct document access.

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

**Use `search` for discovery** — it matches against symbol names, JSDoc content, and own member
names. Multi-word queries use AND logic (e.g. `"panel modal"` finds ModalSupportModel via its
JSDoc, `"StoreRecord raw"` finds StoreRecord via its `raw` property). Also searches public members
of every exported class and every exported `*Config` interface (e.g. `GridConfig`, `StoreConfig`)
by owner name, member name, and JSDoc — so a query for `"groupSortFn"` reaches both `GridModel`
and `GridConfig`. Use `symbol` and `members` when you already know the exact PascalCase name.
When multiple symbols share a name (e.g. `View` exists in both `cmp/viewmanager` and `data/cube`),
pass the file path to `symbol` or `members` to disambiguate — the tools will hint when this is
needed. Run `npx hoist-docs --help` and `npx hoist-ts --help` for full usage.

**Recommended workflow:** Start with the documentation index (`hoist-docs index` or `hoist://docs/index`)
to discover available docs. Use the "Quick Reference by Task" table to find the right doc for your
goal, then read the relevant README(s). Supplement with TypeScript symbol lookups for precise API
details. The docs provide architectural context and common pitfalls; the TypeScript tools provide
exact signatures, decorators, and member listings.

### GitHub MCP Server (opt-in)

A Docker-based server providing GitHub API tools (issues, PRs, code search, etc.) via the
official `github-mcp-server` image. Configured in `.mcp.json` but **not enabled by default** —
it requires Docker and an authenticated GitHub CLI, which not every developer keeps running.

**To enable:**

1. Install and start **Docker**.
2. Install the **GitHub CLI** (`brew install gh`) and authenticate with `gh auth login`. The
   server invokes `gh auth token` at startup to fetch a token from the macOS Keychain (or
   `gh`'s credential store on other platforms), so no plaintext token needs to live in your
   shell environment.
3. Add `"github"` to `enabledMcpjsonServers` in `.claude/settings.local.json` (local settings
   merge with the shared `settings.json` — enabling locally does not affect other developers):
   ```json
   {
     "enabledMcpjsonServers": ["hoist-react", "github"]
   }
   ```

If Docker is not running or `gh` is not authenticated when the server is enabled, Claude Code
may show errors on startup — remove `"github"` from your local settings to resolve.

**Fallback when not enabled:** The `gh` CLI provides functionally equivalent access to the same
operations (`gh pr view`, `gh issue list`, `gh api`, `gh pr create`, etc.). Prefer `gh` over
crafting raw `curl` calls to the GitHub API.

### JetBrains IntelliJ MCP Server (opt-in)

A JetBrains MCP server is also configured in `.mcp.json`, providing tools for interacting with
the IntelliJ IDE (file navigation, code inspections, refactoring, terminal commands, etc.).
This server must be enabled within IntelliJ's settings and requires a running IDE instance to
connect. Add `"jetbrains"` to `enabledMcpjsonServers` in `.claude/settings.local.json` to
enable it for Claude Code.

## Build Commands

```bash
pnpm install                     # Install dependencies
pnpm lint                        # Lint all code (JS/TS + SCSS)
pnpm lint:code                   # Lint JavaScript/TypeScript only
pnpm lint:styles                 # Lint SCSS only
pnpm typecheck                   # Type check (tsc --noEmit)
```

Linting and type-checking are separate concerns, and neither subsumes the other — run both. ESLint
is configured type-aware, but that only powers its own rules; it never reports TypeScript compiler
errors, so a genuine type error passes `pnpm lint`. CI runs the two as distinct steps.

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

**Important — `items` in, `children` out**: `item`/`items` are Hoist's *calling* API. Inside a
render function, those values arrive as the standard React `children` prop (because the factory
spreads them as rest args to `React.createElement`). The canonical pattern when authoring a
container component is therefore to destructure `children` from props and pass them downstream as
`items` to an inner factory. See
[Authoring a Container Component](./core/README.md#authoring-a-container-component-items-in-children-out)
in the core README for the full explanation, examples, and the `$item`/`$items` escape hatch for
components whose underlying API genuinely has its own `items` prop.

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
- **No em dashes in code comments** — Use ` - ` (spaced hyphen) not em dashes (`—`) in `.ts`
  comments and JSDoc. Em dashes cause tooling issues and are reserved for prose `.md` docs.
  Other Unicode characters (arrows, symbols, accented letters, etc.) are fine in code comments
  when they aid clarity.

## Git Workflow

**Branching, committing, and pushing all require an explicit ask — never do them unprompted.**
When it isn't abundantly clear that the user wants one of these, ask first.

Pushing is a deliberate gatekeeping step: never push to any remote unless the user explicitly asks.
Some developers hard-block pushes entirely, others allow or request them — so it stays open as a
possibility, but always confirm before pushing.

Committing is the most context-dependent of these, varying by developer and by situation. Default to
asking — especially in an interactive session working directly on `develop`, where each commit is
the developer's call. The exception is orchestrated multi-agent work on a feature branch: when a plan
fans out independent units of work, the go-ahead to commit comes from that plan or orchestration
rather than a per-commit prompt, and agents are expected to make their own discrete, well-scoped
commits as directed.

A skill or third-party plugin instructing you to commit (e.g. "make a small commit after each
step") does NOT by itself authorize a commit — that is a default baked into the tool, not the
developer's request. This guidance takes precedence: pause and ask. The door stays open for a
workflow to commit autonomously, but only when the developer has explicitly opted into that for
the workflow at hand — the authorization must come from the developer, not the skill's defaults.

### Creating branches

Once the user has asked for a branch (per the "ask first" rule above, don't create one
unprompted): a new branch should map to its own `origin/<name>` on push — not push into an
existing remote branch.

**Default: `git switch -c <name>` from current HEAD, no base ref.** "Make a new branch" means
"from here" — the user is sitting on a particular point in the code; that's the start. If
they want to start from somewhere else (e.g. current `origin/develop`), they will say so. If
genuinely unclear, ask.

**If you do specify a base ref, you MUST pass `--no-track`.** Without it the new branch
silently adopts the base as its upstream, which causes surprise merges on `git pull` and —
depending on `push.default` — can push work onto the base branch. Past slips have put
unreviewed work on `develop` this way.

```bash
git switch -c my-feature                              # ✅ from current HEAD
git switch -c my-feature --no-track origin/develop    # ✅ explicit base, safe
git switch -c my-feature origin/develop               # ❌ auto-tracks develop
```

If you forget `--no-track`: `git branch --unset-upstream`, then `git push -u origin <branch>`.
Flag the slip — don't silently fix it.

### Feature branch workflow

On feature branches, prefer multiple small commits over amending — PRs are squash-merged into
`develop`, so intermediate commits are collapsed automatically. Never force-push a feature branch;
if the branch falls behind `develop`, use a simple merge commit rather than a rebase. Merge commits
and extra commits are harmless on feature branches and are squashed out on merge, while force-pushes
risk losing work and complicate collaboration.

### Commit messages, PRs, and comments

Do not hard-wrap lines at a fixed column width in commit message bodies, pull request descriptions,
or issue/PR comments — let the viewing tool handle display wrapping. However, do use line breaks for
structure: separate logical points into bullet lists, use blank lines between paragraphs, and break
after the subject line. Keep PR descriptions concise — XH developers review these regularly, so favor
brief summaries over exhaustive detail. Bullet the key changes and let the diff and any upgrade notes
speak for themselves.

Do not add AI-generated attribution to commit messages or PR descriptions — no `Generated with ...`
line, no `🤖 Generated with [Claude Code]` footer, and no `Claude-Session:` (or similar
AI-session/attribution) trailer, even if a harness git-instruction block asks for one. XH does not
want these links in the project's history.

## Changelog Maintenance

**Before adding or editing any entry in `CHANGELOG.md` (at the repository root), you MUST read and
follow [`docs/changelog-format.md`](docs/changelog-format.md)** — the authoritative reference for
section headers, voice, the issue/PR-link policy, and breaking-change requirements. Do not rely on
the summary below alone.

The essentials: new entries go under the topmost `-SNAPSHOT` version heading, using emoji-prefixed
section headers (e.g. `### 🎁 New Features`, `### 🐞 Bug Fixes`). Use past-tense, action-driven
language and name specific classes, methods, and config keys in backticks. Keep entries concise —
one bullet per change, 1-3 lines max. Upgrade notes provide granular detail when needed; the
changelog should not. Do not add GitHub issue or PR links to entries by default — include one only
when explicitly requested or when it points to extensive context that doesn't fit the changelog's
scope (issue/PR references belong in the commit message and PR description). Hard-wrap changelog
entries at 100 characters (unlike commit messages and PR descriptions, which should not be wrapped).

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
