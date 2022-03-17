# Build-related files

Hoist Dev Utils (`@xh/hoist-dev-utils`, aka HDU) references the files in this directory from within
its `configureWebpack()` build script factory.

* `index.html` - passed to `WebpackHTMLPlugin` to build the HTML index files for each JS app entry
  point created by the webpack build.
* `polyfills.js` - passed to webpack in the `entry` config for each JS app entry point, ensuring
  that it imports the two global polyfills (`core-js` and `regenerator-runtime`) once per app. It is
  hosted here to ensure that the version of these libraries specified as a dependency by hoist-react
  are the ones used / imported for the app. The app should not need to specify its own dependency on
  either library.
* `preflight.js` - included by HDU before any other Hoist or application code runs on the page. Used
  to start page load timing and run a low-level filter for browser compatibility.
* `requiredBlueprintIcons.js` - included by HDU as a (very) streamlined replacement for the full set
  of Blueprint JS icons otherwise required by that library. See the comment at the top of the file
  for additional details and links.
* `spinner.png` - included by HDU and embedded within static `index.html` entry page to
  provide visual indicator that something is happening when JS app has yet to d/l and start.

See [Hoist Dev Utils](https://github.com/xh/hoist-dev-utils) for additional details.
