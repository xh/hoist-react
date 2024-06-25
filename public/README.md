# Build-related files

The contents of this directory will be combined with a similiar directory specified by the app and
mad available to the application for download at runtime in the apps `/public` directory.
Note that the version specified in the application, will override any version specified here.
Some notes on usage:
* `preflight.js` - injected as a script tag by HDU build to run before any other Hoist or
   application code runs on the page. Used to start page load timing and run a low-level filter for
   browser compatibility.
* `spinner.png` - referenced by the`index.html` template. Provides an indicator that the app is
   loading while JS is being downloaded  and parsed, before HR init takes over the viewport and
   displays its own built-in spinner.
*  `blank.html` -- used by MSAL library for fulfilling OAuth API requirements when a valid redirect
    URL is needed, but no content is required.

See [Hoist Dev Utils](https://github.com/xh/hoist-dev-utils) for additional details.
