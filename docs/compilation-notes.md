# Compilation & Packaging Notes

## Source Distribution Model

Hoist React is published to NPM as raw TypeScript source—no precompiled bundles. The NPM package
contains the TypeScript files, along with package metadata, and nothing is pre-transpiled.

## Application Compilation Process

Each Hoist application handles compilation using the `configureRsbuild()` function from
[hoist-dev-utils](https://github.com/xh/hoist-dev-utils). This standardized
[Rsbuild](https://rsbuild.rs) configuration instructs SWC to transpile both application code and
Hoist React source from `node_modules`, including Hoist's TC39 (`2023-11`) decorators. The app
build is the point at which TypeScript is converted to JavaScript.

For application developers, this is all built-in. There is no need to configure Rsbuild or SWC
directly unless implementing custom build requirements.

## Running Against a Local Checkout

Inline mode builds an app against local checkouts in place of the installed packages. A library
change then shows up in the app as you make it.

Apps run inline Hoist through two `package.json` scripts: `startWithHoist` for the dev server and
`testWithHoist` for unit tests. By default, the hoist-react checkout is a sibling of the app's
repo, at `../../hoist-react` from `client-app`.

Two environment variables change what the build and tests use:

| Variable | Use | Dev-utils |
|---|---|---|
| `XH_HOIST_REACT_PATH` | Absolute path to another hoist-react checkout, for example a worktree on a paired branch | 16.3+ |
| `XH_INLINE_PACKAGES` | Comma-separated names of companion packages that ship as source, such as `@xh/hoist-chat-kit`, each with an optional `=/absolute/path`. Needs no script - set it for any start or test command. | 16.4+ |

Set both in the shell, not in a dotenv file. Dotenv values reach neither the scripts' install step
nor the test run. Production builds ignore both. The build banner shows the path and branch of
each checkout it uses.

See the hoist-dev-utils README sections
[Inline Hoist](https://github.com/xh/hoist-dev-utils#inline-hoist) and
[Inline packages](https://github.com/xh/hoist-dev-utils#inline-packages) for script setup, shared
dependencies, and type checks against a checkout.

## Why This Approach?

We chose this approach because we maintain a standardized build pipeline across all Hoist projects.
By centralizing the Rsbuild configuration in hoist-dev-utils, we ensure consistent compilation
behavior, avoid bundling complexity within the library itself, and keep the source transparent and
debuggable for application developers.

## See Also

- [hoist-dev-utils](https://github.com/xh/hoist-dev-utils) - Rsbuild configuration and build tooling
- [Toolbox rsbuild.config.mjs](https://github.com/xh/toolbox/blob/develop/client-app/rsbuild.config.mjs) - Example configuration in a Hoist application


------------------------------------------

☎️ info@xh.io | <https://xh.io>
Copyright © 2026 Extremely Heavy Industries Inc.
