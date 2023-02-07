# Upgrading a Hoist Application to TypeScript (Hoist v54+)

With the release of Hoist React v54 + Hoist Dev-Utils v6.1, **Typescript** is fully supported and
actively recommended for application development.

App developers are encouraged to start migrating their app codebases to take advantage of
the compile-time checking made possible by Typescript, but please note that Hoist *remains*
fully compatible with apps written entirely (or mostly) in pure JavaScript. Developers can take
an incremental approach to adopting TS in their app code - or take the plunge with a more
comprehensive refactoring as we did with our Toolbox demo application.

Regardless, we urge all developers to update their projects with the minimum set of changes below
so those projects can continue to stay on the most recent versions of Hoist.

## Essential Updates

* Update to the latest `hoist-react` and `hoist-dev-utils` versions within your
  app's `package.json`.
* Add `typescript` as a devDependency.
    * Use the major/minor version specified
      by [Hoist's own dependencies](https://github.com/xh/hoist-react/blob/develop/package.json).
    * We recommend using the `~` semver qualifier to allow auto-updates to newer patch releases
      only, e.g. `~4.9.5`.
* Add a `tsconfig.json` file to your project's `/client-app` directory, right alongside your
  existing `package.json`.
    * Consult
      the [file included by Toolbox](https://github.com/xh/toolbox/blob/develop/client-app/tsconfig.json).
    * The settings will likely be the same as those required by your project, with the one exception
      of the `paths` entry in the Toolbox file. That supports developing hoist-react itself,
      alongside
      the application, and should be omitted from standard application projects.
* Review and update to the "Breaking Changes" listed within
  Hoist's [CHANGELOG](https://github.com/xh/hoist-react/blob/develop/CHANGELOG.md) for the Hoist TS
  release and any other Hoist releases you are taking into your application with this update.

This should be a good checkpoint at which to run your application. Even without converting any app
files to TS, you should be able to successfully compile and run - after adjusting for any of the
breaking changes noted above.

## Expected / Common Deprecations

The additional checks now included and enforced by Hoist toolkit code will very likely flag
pre-existing issues (hopefully minor!) with application code passing unknown config properties or
calling Hoist APIs in unexpected ways - look for and correct any compilation or runtime errors while
browsing through your application with the developer console open.

The following deprecations will be common, but should be easy to adjust for:

* Use of `modelConfig` vs. `model` when passing a model configuration as a component prop in the
  form of a plain-object. A case-sensitive search for `model: {` within your client source should
  provide a good starting point. Common with `Panel` models, as those are often specified inline.
* Columns will now warn if they are passed unknown configuration keys - previously this was allowed,
  with any extra keys spread onto the Column instance as a way for apps to carry around some extra
  data. Use the new dedicated `Column.appData` config instead.

## IDE / Tooling

If using IntelliJ, ensure that your settings are configured correctly to get the most of out TS:

* Under "Languages & Frameworks > JavaScript", ensure that yourESLint and (if enabled) Prettier
  configs include the `.ts` file extension.
* Under "Languages & Frameworks > TypeScript", ensure that the IDE has picked up the TS distribution
  from your app's `node_modules` and that the TypeScript language service is enabled.
    * We recommend checking "show project errors" while leaving "recompile on changes" unchecked.
* IntelliJ maintains distinct code style settings for JS vs. TS. You will likely want to review your
  TS code style settings and get in sync.
    * Consider
      copying [the Hoist project's `.editorconfig` file](https://github.com/xh/hoist-react/blob/develop/.editorconfig)
      into your project to apply XH-standardized settings automatically.

If using Husky in your project for git hooks, consider adding `yarn run tsc` to your `pre-commit`
check. Note that for `tsc` to run successfully, you will need to have _at least one_ TypeScript file
in your project. An easy option is to rename `Bootstrap.js -> Bootstrap.ts`.
