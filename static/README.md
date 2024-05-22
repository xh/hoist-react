# Build-related files

Hoist Dev Utils (`@xh/hoist-dev-utils`, aka HDU) references the files in this directory from
within its `configureWebpack()` build script factory.

* `index.html` - passed to `WebpackHTMLPlugin` by HDU v8.0.0, includes the HDU generated
  manifest.json file. NOTE that this was quickly replaced by move of this file to HDU as of the
  v8.1 release of that library.  Maintained here for backwards compatibility with older HDU versions.
* `polyfills.js` - passed to webpack in the `entry` config for each JS app entry point, ensuring
  that it imports the two global polyfills (`core-js` and `regenerator-runtime`) once per app. It is
  hosted here to ensure that the version of these libraries specified as a dependency by hoist-react
  are the ones used / imported for the app. The app should not need to specify its own dependency on
  either library.
* `preflight.js` - included by later HDU versions (see above) before any other Hoist or application
  code runs on the page. Used to start page load timing and run a low-level filter for browser
  compatibility.
* `spinner.png` - included by HDU >= 5.11.0.

See [Hoist Dev Utils](https://github.com/xh/hoist-dev-utils) for additional taskDetails.
