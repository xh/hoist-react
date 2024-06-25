# Build-related files

Hoist Dev Utils (`@xh/hoist-dev-utils`, aka HDU) references the files in this directory from
within its `configureWebpack()` build script factory.

* `polyfills.js` - passed to webpack in the `entry` config for each JS app entry point, ensuring
  that it imports the two global polyfills (`core-js` and `regenerator-runtime`) once per app. It is
  hosted here to ensure that the version of these libraries specified as a dependency by hoist-react
  are the ones used / imported for the app. The app should not need to specify its own dependency on
  either library.

See [Hoist Dev Utils](https://github.com/xh/hoist-dev-utils) for additional details.
