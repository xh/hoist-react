# Development Environment Setup

The information below applies to Hoist development generally and covers the setup of a local
development environment for both a [Hoist Core](https://github.com/xh/hoist-core) server and a Hoist
React client application.

[Toolbox](https://github.com/xh/toolbox) is our reference app for Hoist development and can be a
useful project to check out and run locally to explore Hoist development. Please refer
to [that project's README](https://github.com/xh/toolbox/blob/develop/README.md) for additional,
Toolbox-specific setup info.

## Prerequisites

Development of Hoist applications requires:

* Git
* A Java JDK (version set by your application - see [Server-side prerequisites](#server-side-prerequisites) below)
* Node (LTS or other recent) + a JS package manager - `pnpm` (XH's standard), `yarn` (v1), or
  `npm` (bundled with Node)

## Git

As the location of this repo should indicate, XH uses git for all of our projects. Ensure you have a
recent-ish version of git installed. For development using a Mac, we recommend installing/updating
via [Homebrew](https://brew.sh/).

## Server-side prerequisites

Hoist Core is the server-side plugin powering Hoist React applications.
See [that project's README](https://github.com/xh/hoist-core/blob/develop/README.md) for more
detailed information about the configuration and use of Hoist's Grails server.

### Java JDK

Running the server-side of a Hoist project requires a Java JDK. Hoist Core supports a range of recent
JDKs (e.g. 17, 21, 25), so the target version is set by the **application**, not by Hoist Core or
Hoist React. By convention each Hoist app pins its version in a `majorJavaVersion` property in
`gradle.properties`, which the Gradle Java toolchain in `build.gradle` consumes.

Check your project's `gradle.properties` for the version it targets and install a matching JDK. (Note
the daemon running Gradle itself may use a different, newer JDK than this compile/runtime target.) Any
common OpenJDK distribution should work; XH's GitHub Actions build runners use
[Eclipse Temurin](https://adoptium.net/).

The JDK version surfaces in the production runtime too: Hoist apps deploy on XH's `xhio/xh-tomcat`
base image, whose tag pins both the Tomcat and JDK versions - e.g. the `jdk21` in
`xhio/xh-tomcat:latest-tc10-jdk21` - in your project's `docker/tomcat/Dockerfile`. These should all
agree: your locally installed JDK, the `majorJavaVersion` in `gradle.properties`, and the JDK baked
into the Tomcat container image should target the same major version.

If using IntelliJ (see below), consider having the IDE download and update a JDK for you:

- From the "File > New Projects Settings" menu, open "Structure for New Projects..." If you have an
  existing project open, you can also select "File > Project Structure" to modify that project.
- Select the "SDKs" option in the navigation tree.
- Click the + button and select "Download JDK..."
- Select the version matching your project's `majorJavaVersion` and a distro of your choice.

### Server-side instance configuration

Before starting the server-side of a project for the first time, ensure you have copied the
project's `.env.template` to `.env` and filled in any missing instance configuration values required
to provide environment-specific database connection and service account details.

Note that some older projects might use a YAML config file in place of `.env` - if you don't see a
`.env.template` file in the root of your project repo, this is likely the case. Consult another
developer on the project or ask XH for assistance.

## Client-side prerequisites

### Node.js

A recent version of Node.js is required to build and run the client-side component of the
application (via Webpack and webpack-dev-server).

- The latest (or any recent) LTS build is recommended - you can download directly from
  https://nodejs.dev/ or use a tool (recommended) such as Homebrew or NVM (node-version-manager) to
  install and update your local node versions.
- Ensure that node is on your path via `node --version`.

### Package manager (pnpm, yarn, or npm)

Hoist apps can be managed with any of the major JS package managers - `pnpm`, `yarn` (v1), or
`npm`. XH has standardized its own repos (hoist-react, hoist-dev-utils, and Toolbox) on
[pnpm](https://pnpm.io) and recommends it for new projects - its isolated `node_modules` layout
surfaces undeclared dependencies early, and its content-addressed store makes installs fast and
disk-efficient. Note that pnpm requires `@xh/hoist-dev-utils` v14+ and that apps declare every
package they import directly - see the hoist-dev-utils CHANGELOG for migration notes. Whichever
tool you choose, decide on one per project and ensure all developers use the same tool. (`npm` has
been found to work better in some corporate environments with intensive workstation and/or
network-level antimalware and other file scanning.)

Projects should pin their package manager version via the `packageManager` field in `package.json`.
Node's bundled [corepack](https://nodejs.org/api/corepack.html) can then provision the pinned
version automatically:

- Run `corepack enable pnpm` (or `corepack enable yarn`) once to put a corepack-managed shim on
  your PATH, then verify with `pnpm --version` from within the project directory. Standalone
  installs (e.g. `npm i -g pnpm`) also work - pnpm v10+ verifies the `packageManager` pin itself.
- Within the `client-app` directory of a Hoist app such as Toolbox, run `pnpm install` (or the
  yarn/npm equivalent) to download and install all client-side dependencies.

## JetBrains IntelliJ

XH uses and recommends the polyglot IDE IntelliJ, from [Jetbrains](https://jetbrains.com) for Hoist
development, specifically the "Ultimate Edition." While not at all _required_ for working with
Hoist, IntelliJ offers an excellent combination of Java/Groovy/Grails support for server-side
development + excellent tooling for modern Javascript apps and related utils such as eslint.

XH developers should have XH-managed licenses for any required JetBrains projects, which can be used
across all of your workstations (real and virtual) for XH and client work.

### Hoist application project setup within IntelliJ

After checking out a new Hoist application project, IntelliJ can automatically configure a new
project for the app by following the "New project from existing sources" workflow and pointing the
IDE at the `build.gradle` file within your project's root directory. This should cause IntelliJ to
detect the Gradle project as a Grails web application, download and index the server-side
dependencies, and setup a ready-to-go "run configuration" to start the project.

For Toolbox / Hoist development, XH uses a "wrapper" project setup to allow for development of
both the Hoist libraries and the Toolbox app from a single IntelliJ project. For client projects
where we are _not_ doing Hoist development, the configuration can be simpler and this wrapper
structure is _not_ required. See the Toolbox README for more information.

### Useful IntelliJ project settings

IntelliJ has hundreds of configuration options, many of which are well-worth exploring but are
beyond the scope of this doc. There are a few recommended settings to highlight, however.

From within the IDE's general preferences / settings dialog:

- Navigate to `Languages & Frameworks > Javascript`:
    - Ensure "ECMAScript 6+" selected in the top-level of this section.
    - Expand `Webpack` - *if doing local Toolbox + Hoist React development*, you can choose to
      configure "Manually" and point IntelliJ at a stub `webpack.config.intellij.js` checked-in at
      the root of your local hoist-react project. This will cause IntelliJ to resolve any
      auto-suggestions or context clues to the local versions of the Hoist classes and utils.
    - Expand `Code Quality Tools > Eslint` - select "Automatic" configuration to enable eslint to
      run and monitor your code as you update it. Note that you will need to have installed your
      local client-side dependencies first (e.g. via `pnpm install`).
    - If using Prettier in your project, enable that as well in the dedicated `Prettier` section.
- Navigate to `Languages & Frameworks > Node.js and NPM`:
    - Ensure the IDE has detected the version of Node you wish to use.
    - You can also specify your project's package manager (e.g. pnpm or yarn), if you wish to use
      the IDE's built-in package manager integration.
- Navigate to `Languages & Frameworks > Stylesheets > Stylelint`:
    - Enable with "Automatic configuration" to turn on local support for Stylelint, if using in your
      project.
- Navigate to `Version Control > Git` - verify the IDE has detected your local git and select
  "Update method: Rebase" to avoid unnecessary merge commits when updating your local repo.
    - The GitToolBox plugin is a useful add-on to IntelliJ, with several useful enhancements to
      version control support.
