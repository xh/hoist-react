# 💻 Hoist Development Environment Setup

The information below applies to Hoist development generally and covers the setup of a local
development environment for both a [Hoist Core](https://github.com/xh/toolbox) server and a Hoist
React client application.

[Toolbox](https://github.com/xh/toolbox) is our reference app for Hoist development. Please also
refer to [that project's README](https://github.com/xh/toolbox/blob/develop/README.md) for
additional, Toolbox-specific setup info.

## Git

As the location of this repo should indicate, XH uses git for all of our projects. Ensure you have a
recent-ish version of git installed. For development using a Mac, we recommend installing/updating
via [Homebrew](https://brew.sh/).

## Server-side prerequisites

### Java 8 JDK

The one common pre-requisite for running the server-side of a Hoist project is a Java 8 JDK. Either
an Oracle or any common OpenJDK distribution should be fine.

If using IntelliJ (see below), consider having the IDE download and update a JDK for you:

-   From the "File > New Projects Settings" menu, open "Structure for New Projects..." If you have an
    existing project open, you can also select "File > Project Structure" to modify that project.
-   Select the "SDKs" option in the navigation tree.
-   Click the + button and select "Download JDK..."
-   Select version 8/1.8 - a known-good option to choose is the "Azul" open source SDK.

### Other server-side requirements

Specific projects can have their own additional requirements for running their server-side
application, typically around database access or connection configuration. Before starting the
server-side of a project for the first time, ensure you have the required instance configuration
YAML file in place to tell your app where and how to connect to its database.

For Toolbox development, see that project's README for TB-specific database info.

## Client-side prerequisites

### Node.js

A recent version of Node.js is required to build and run the client-side component of the
application (via Webpack and webpack-dev-server).

-   The latest (or any recent) LTS build is recommended - you can download directly from
    https://nodejs.dev/ or use a tool (recommended) such as Homebrew or NVM (node-version-manager) to
    install and update your local node versions.
-   Ensure that node is on your path via `node --version`.

### Yarn

XH uses Yarn for JS package management. To reduce variability across workstations, we typically
include an updated, portable version of yarn bundled within each project, but a local yarn install
is still required to detect and run the portable copy.

-   The easiest way to install yarn is with npm (🤯): `npm i -g yarn`
-   Once installed, verify it can be run globally with `yarn --version`
-   Within the `client-app` directory of a Hoist app such as Toolbox, run `yarn` to download, install,
    and build all client-side dependencies. (Note that `yarn` is a shortcut for `yarn install` - they
    do the same thing.)

### Other client-side requirements

Some Hoist React dependencies can require a post-install build step, which looks for and can require
some supporting build tools (such as Python) on your local workstation. Most of the time this works
seamlessly, but contact the XH team if you receive any post-install errors from these dependencies.

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

👉 For Toolbox / Hoist development, XH uses a "wrapper" project setup to allow for development of
both the Hoist libraries and the Toolbox app from a single IntelliJ project. For client projects
where we are _not_ doing Hoist development, the configuration can be simpler and this wrapper
structure is _not_ required. See the Toolbox README for more information.

### Useful IntelliJ project settings

IntelliJ has hundreds of configuration options, many of which are well-worth exploring but are
beyond the scope of this doc. There are a few recommended settings to highlight, however.

From within the IDE's general preferences / settings dialog:

-   Navigate to _Languages & Frameworks > Javascript_:
    -   Ensure "ECMAScript 6+" selected in the top-level of this section.
    -   Expand _Webpack_ - if doing local Toolbox + Hoist React development, you can choose to configure
        "Manually" and point IntelliJ at a stub `webpack.config.intellij.js` checked-in at the root of
        your local hoist-react project. This will cause IntelliJ to resolve any auto-suggestions or
        context clues to the local versions of the Hoist classes and utils.
    -   Expand _Code Quality Tools > Eslint_ - select "Automatic" configuration to enable eslint to run
        and monitor your code as you update it. Note that you will need to have run `yarn` to install
        your local client-side dependencies first.
-   Navigate to _Languages & Frameworks > Node.js and NPM_:
    -   Ensure the IDE has detected the version of Node you wish to use.
    -   You can also specify yarn as your package manager, if you wish to use the IDEs built-in yarn
        integration.
-   Navigate to _Languages & Frameworks > Stylesheets > Stylelint_:
    -   Enable with "Automatic configuration" to turn on local support for Stylelint, if using in your
        project.
-   Navigate to _Version Control > Git_ - verify the IDE has detected your local git and select
    "Update method: Rebase" to avoid introducing unnecessary merge commits when updating your local
    repo.
    -   The GitToolBox plugin is a useful add-on to IntelliJ, with several useful enhancements to
        version control support.

---

📫☎️🌎 info@xh.io | <https://xh.io/contact>

Copyright © 2024 Extremely Heavy Industries Inc.
