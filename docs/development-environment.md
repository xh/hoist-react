# 💻 Hoist Development Environment Setup

The information below applies to Hoist development generally and covers the setup of a local
development environment for both a [Hoist Core](https://github.com/xh/toolbox) server and a Hoist
React client application.

[Toolbox](https://github.com/xh/toolbox) is our reference app for Hoist development and can be a
useful project to check out and run locally to explore Hoist development. Please refer
to [that project's README](https://github.com/xh/toolbox/blob/develop/README.md) for additional,
Toolbox-specific setup info.

## tldr;

Development of Hoist applications requires:

* Git
* JDK 17
* Node (LTS or other recent) + `npm` (bundled with Node) or `yarn` (installable via `npm`)

## Git

As the location of this repo should indicate, XH uses git for all of our projects. Ensure you have a
recent-ish version of git installed. For development using a Mac, we recommend installing/updating
via [Homebrew](https://brew.sh/).

## Server-side prerequisites

Hoist Core is the server-side plugin powering Hoist React applications.
See [that project's README](https://github.com/xh/hoist-core/blob/develop/README.md) for more
detailed information about the configuration and use of Hoist's Grails server.

### Java 17 JDK

The one common pre-requisite for running the server-side of a Hoist project is a Java 17 JDK. Any
common OpenJDK distribution should work. XH typically uses the JetBrains distro, which has
improved support for hot reloading, helpful for Hoist projects with a significant amount of server-
side development.

If using IntelliJ (see below), consider having the IDE download and update a JDK for you:

- From the "File > New Projects Settings" menu, open "Structure for New Projects..." If you have an
  existing project open, you can also select "File > Project Structure" to modify that project.
- Select the "SDKs" option in the navigation tree.
- Click the + button and select "Download JDK..."
- Select version 17 and a distro of your choice (JetBrains Runtime is a good default).

### Server-side instance configuration

Before starting the server-side of a project for the first time, ensure you have copied the
project's `template.env` to `.env` and filled in any missing instance configuration values required
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

### Yarn

XH uses both `yarn` (v1) and `npm` (recent/lts) for JS package management - Hoist has no requirement
for one over the other, although `npm` has been found to work better in some corporate environments
with intensive workstation and/or network-level antimalware and other file scanning. The important
thing is to decide on one or the other for your project and ensure all developers use the same tool.

When using `yarn`, we typically include an updated, portable version of yarn bundled within each
project, but a local yarn install is still required to detect and run the portable copy:

- The easiest way to install yarn is with npm (🤯): `npm i -g yarn`
- Once installed, verify it can be run globally with `yarn --version`
- Within the `client-app` directory of a Hoist app such as Toolbox, run `yarn` to download, install,
  and build all client-side dependencies. (Note that `yarn` is a shortcut for `yarn install` - they
  do the same thing.)

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

- Navigate to `Languages & Frameworks > Javascript`:
    - Ensure "ECMAScript 6+" selected in the top-level of this section.
    - Expand `Webpack` - *if doing local Toolbox + Hoist React development*, you can choose to
      configure "Manually" and point IntelliJ at a stub `webpack.config.intellij.js` checked-in at
      the root of your local hoist-react project. This will cause IntelliJ to resolve any
      auto-suggestions or context clues to the local versions of the Hoist classes and utils.
    - Expand `Code Quality Tools > Eslint` - select "Automatic" configuration to enable eslint to
      run and monitor your code as you update it. Note that you will need to have run `yarn` to
      install your local client-side dependencies first.
    - If using Prettier in your project, enable that as well in the dedicated `Prettier` section.
- Navigate to `Languages & Frameworks > Node.js and NPM`:
    - Ensure the IDE has detected the version of Node you wish to use.
    - You can also specify yarn as your package manager, if you wish to use the IDEs built-in yarn
      integration.
- Navigate to `Languages & Frameworks > Stylesheets > Stylelint`:
    - Enable with "Automatic configuration" to turn on local support for Stylelint, if using in your
      project.
- Navigate to `Version Control > Git` - verify the IDE has detected your local git and select
  "Update method: Rebase" to avoid unnecessary merge commits when updating your local repo.
    - The GitToolBox plugin is a useful add-on to IntelliJ, with several useful enhancements to
      version control support.

------------------------------------------

☎️ info@xh.io | <https://xh.io>
Copyright © 2026 Extremely Heavy Industries Inc.
