# Upgrading a Hoist Application to TypeScript (Hoist v54+)

With the release of Hoist React v54 + Hoist Dev-Utils v6.1, **Typescript** is fully supported and
actively recommended for application development.

App developers are encouraged to start migrating their app codebases to take advantage of
the compile-time checking made possible by Typescript, but please note that Hoist _remains_
fully compatible with apps written entirely (or mostly) in pure JavaScript. Developers can take
an incremental approach to adopting TS in their app code - or take the plunge with a more
comprehensive refactoring as we did with our Toolbox demo application.

Regardless, we urge all developers to update their projects with the minimum set of changes below
so those projects can continue to stay on the most recent versions of Hoist.

## Essential Updates

-   Update to the latest `hoist-react` and `hoist-dev-utils` versions within your
    app's `package.json`.
-   Add `typescript` as a devDependency.
    -   Use the major/minor version specified
        by [Hoist's own dependencies](https://github.com/xh/hoist-react/blob/develop/package.json).
    -   We recommend using the `~` semver qualifier to allow auto-updates to newer patch releases
        only, e.g. `~4.9.5`.
-   Add a `tsconfig.json` file to your project's `/client-app` directory, right alongside your
    existing `package.json`.
    -   Consult
        the [file included by Toolbox](https://github.com/xh/toolbox/blob/develop/client-app/tsconfig.json).
    -   The settings will likely be the same as those required by your project, with the one exception
        of the `paths` entry in the Toolbox file. That supports developing hoist-react itself,
        alongside
        the application, and should be omitted from standard application projects.
-   Review and update to the "Breaking Changes" listed within
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

-   Use of `modelConfig` vs. `model` when passing a model configuration as a component prop in the
    form of a plain-object. A case-sensitive search for `model: {` within your client source should
    provide a good starting point. Common with `Panel` models, as those are often specified inline.
-   Columns will now warn if they are passed unknown configuration keys - previously this was allowed,
    with any extra keys spread onto the Column instance as a way for apps to carry around some extra
    data. Use the new dedicated `Column.appData` config instead.

## IDE / Tooling

If using IntelliJ, ensure that your settings are configured correctly to get the most of out TS:

-   Under "Languages & Frameworks > JavaScript", ensure that your ESLint and (if enabled) Prettier
    configs include the `.ts` file extension.
-   Under "Languages & Frameworks > TypeScript", ensure that the IDE has picked up the TS distribution
    from your app's `node_modules` and that the TypeScript language service is enabled.
    -   We recommend checking "show project errors" while leaving "recompile on changes" unchecked.
-   IntelliJ maintains distinct code style settings for JS vs. TS. You will likely want to review your
    TS code style settings and get in sync.
    -   Consider
        copying [the Hoist project's `.editorconfig` file](https://github.com/xh/hoist-react/blob/develop/.editorconfig)
        into your project to apply XH-standardized settings automatically.

If using Husky in your project for git hooks, consider adding `yarn run tsc` to your `pre-commit`
check. Note that for `tsc` to run successfully, you will need to have _at least one_ TypeScript file
in your project. An easy option is to rename `Bootstrap.js -> Bootstrap.ts`.

## Migrating your Application

At this point, you should be able to continue app development with the latest Hoist React on TS and
all of your application code on JS. But to really get the benefits of this big upgrade, you will
want to start writing application code in TS as well. This does _not_ need to happen all at once -
in fact, we recommend an incremental approach so you can merge and test changes as you go,
balancing the update with application/project priorities.

This process boils down to:

-   Selecting a file or package to migrate.
-   Renaming all files within from `.js -> .ts` (and `.jsx -> .tsx` if you are using JSX).
-   Be sure to also rename any `index.js` files you might be using for imports within a given package.
-   Fixing any immediate TS compilation errors in the newly renamed files. The IDE or Webpack build
    should flag them, and you can also run `yarn tsc` to compile directly and review any warnings.
-   Begin strategically adding types within each file, focusing on public properties and APIs.

### Bootstrap.ts + Service Declarations

Each project should have a Bootstrap file at the root of `client-app/src`, which is used to
initialize licensed components and for other very early setup tasks. This file should be easy to
rename with a `.ts` extension to ensure you have at least one TS file in your build.

In that same file, add a declaration statement to let TS know about any of your application
services (`HoistService` instances) that you are initializing. Those are installed on and referenced
from the `XH` object; for TS to consider references to those services valid, it needs to know that
the type of the `XH` singleton (`XHApi`) has a property for each of your services. For users of
IntelliJ, an ignored re-declaration of the XH singleton with this interface helps the IDE properly
notice uses of these services.

In Toolbox, we have the following within `Bootstrap.ts` to declare five TB-specific services (your
services will vary of course) and a custom property installed on `HoistUser`, the type returned
by `XH.getUser()`:

```typescript
declare module '@xh/hoist/core' {
    // Merge interface with XHApi class to include injected services.
    export interface XHApi {
        contactService: ContactService;
        gitHubService: GitHubService;
        oauthService: OauthService;
        portfolioService: PortfolioService;
        taskService: NewTaskService;
    }
    // @ts-ignore - Help IntelliJ recognize uses of injected service methods from the `XH` singleton.
    export const XH: XHApi;

    export interface HoistUser {
        profilePicUrl: string;
    }
}
```

### AppModel.ts

Moving your AppModel(s) to TS is a good next step, as that class often contains centralized
properties or methods that benefit from additional type safety. The same issues around accessing
your AppModel instance from the XH global apply here - TS only knows that `XH.appModel` is a
`HoistAppModel` (the base class), and will warn if you attempt to access custom properties (
e.g. `XH.appModel.myAppSpecificFlag`).

Because an application can have multiple client apps bundled within, we recommend a different
approach to accessing your AppModel from other areas of your app code. Declare a new property on
your AppModel class:

`static instance: AppModel;`

When Hoist initializes your model early on in its lifecycle, it will install a reference to the
singleton instance on this property, allowing your code to access it in a typed manner during
runtime.

### Next Steps

The pace and completeness with which you migrate the rest of your app's codebase is up to you.
Consider prioritizing packages in an order similar to the below to get the most benefit early on
from your TS upgrade:

-   _Services_ - often centralized business logic accessed from multiple parts of the app, a great
    candidate for typed functions and public properties.
-   _POJOs_ - if your app maintains any classes for data modeling, consider typing their public
    properties and any public instance methods.
-   _Utils_ - shared, app specific utility functions are good candidates for typing, with callers
    benefiting from typed parameters and return signatures.
-   _Models & Components_ - the bulk of your client-side codebase...
