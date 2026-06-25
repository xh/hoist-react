# Compilation & Packaging Notes

## Source Distribution Model

Hoist React is published to NPM as raw TypeScript source—no precompiled bundles. The NPM package
contains the TypeScript files, along with package metadata, and nothing is pre-transpiled.

## Application Compilation Process

Each Hoist application handles compilation using the `configureWebpack()` function from
[hoist-dev-utils](https://github.com/xh/hoist-dev-utils). This standardized Webpack configuration
instructs Babel to transpile both application code and Hoist React source from `node_modules`. The
app build is the point at which TypeScript is converted to JavaScript.

For application developers, this is all built-in—there's no need to configure Babel or Webpack
directly unless implementing custom build requirements.

## Why This Approach?

We chose this approach because we maintain a standardized build pipeline across all Hoist projects.
By centralizing the Webpack configuration in hoist-dev-utils, we ensure consistent compilation
behavior, avoid bundling complexity within the library itself, and keep the source transparent and
debuggable for application developers.

## See Also

- [hoist-dev-utils](https://github.com/xh/hoist-dev-utils) - Webpack configuration and build tooling
- [Toolbox webpack.config.js](https://github.com/xh/toolbox/blob/develop/client-app/webpack.config.js) - Example configuration in a Hoist application


------------------------------------------

☎️ info@xh.io | <https://xh.io>
Copyright © 2026 Extremely Heavy Industries Inc.
