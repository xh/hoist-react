// Imported once at app entry by the `@xh/hoist-dev-utils` Rsbuild config. With SWC's preset-env in
// `entry` mode, SWC replaces the core-js import below with the specific polyfills needed for
// target browsers.
// The `/stable` entry covers all standardized JS + web features while excluding core-js's shims
// for unfinished proposals, which the bare root entry would inject regardless of targets.
import 'core-js/stable';
