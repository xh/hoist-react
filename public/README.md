# Build-related files

At build time, Hoist Dev Utils v9+ copies the contents of this directory along with the contents of
an application's `/client-app/public/` directory into the build output, making all files available
at runtime via `https://your-app-url/public/`.

Some notes on usage:

* `blank.html` - used by MSAL library for fulfilling OAuth API requirements when a valid redirect
  URL is needed but no content is required.
* `preflight.js` - injected as a script tag by HDU build to run before any other Hoist or
  application code runs on the page. Used to start page load timing and run a low-level filter for
  browser compatibility.
* `spinner.png` - referenced by the `index.html` template. Provides an indicator that the app is
  loading while JS is being downloaded and parsed, before HR init takes over the viewport and
  displays its own built-in spinner.

Note that any app-level files with the same names will override the files provided here.

See [Hoist Dev Utils](https://github.com/xh/hoist-dev-utils) for additional details.
