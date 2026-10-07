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
