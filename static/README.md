# Build-related files

The files in this directory are used / referenced by the `@xh/hoist-dev-utils` package's
`configureWebpack()` utility.

* The path to `index.html` is passed to `WebpackHTMLPlugin`, which uses it to build the HTML index
  files for each JS app entry point created by the webpack build.
* The path to `polyfills.js` is passed to webpack in the `entry` config for each JS app entry point,
  ensuring that it imports the two global polyfills (`core-js` and `regenerator-runtime`) once per
  app. It is hosted here to ensure that the version of these libraries specified as a dependency by
  this project are the ones used / imported for the app. The app should not need to specify its own
  dependency on either library.

See [Hoist Dev Utils](https://github.com/xh/hoist-dev-utils) for additional details.