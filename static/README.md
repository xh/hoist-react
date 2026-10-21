# Build-related files

Hoist Dev Utils references the files in this directory within its `configureRsbuild()` build script.

* `polyfills.js` - prepended to each JS app entry point via Rsbuild's `source.preEntry`. SWC
  rewrites its `core-js/stable` import into the polyfills needed for the target browsers.

See [Hoist Dev Utils](https://github.com/xh/hoist-dev-utils) for additional details.
