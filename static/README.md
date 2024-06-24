# Build-related files

Hoist Dev Utils (`@xh/hoist-dev-utils`, aka HDU) references the files in this directory from
within its `configureWebpack()` build script factory.

* `index.html` - OBSOLETE - was passed to `WebpackHTMLPlugin` as of HDU v8.0.0 but quickly replaced
  by move of this file into HDU project itself in v8.1.0. Maintained here for backwards compat.
  with older HDU versions, but will be removed in future.
* `polyfills.js` - passed to webpack in the `entry` config for each JS app entry point, ensuring
  that it imports the two global polyfills (`core-js` and `regenerator-runtime`) once per app. It is
  hosted here to ensure that the version of these libraries specified as a dependency by hoist-react
  are the ones used / imported for the app. The app should not need to specify its own dependency on
  either library.
* `preflight.js` - copied by HDU into the build output's `public` directory and injected as a script
  tag by HDU build to run before any other Hoist or application code runs on the page. Used to start
  page load timing and run a low-level filter for browser compatibility.
* `spinner.png` - copied by HDU into the build output's `public` directory and referenced by the
  `index.html` template. Provides an indicator that the app is loading while JS is being downloaded
  and parsed, before HR init takes over the viewport and displays its own built-in spinner.

See [Hoist Dev Utils](https://github.com/xh/hoist-dev-utils) for additional details.
