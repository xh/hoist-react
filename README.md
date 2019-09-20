# Welcome to Hoist React

Hoist is a web application development toolkit developed by
[Extremely Heavy Industries](https://xh.io/).

Hoist is designed as a "full stack" UI development framework, meaning that it has both server and
client components that work together to provide an integrated set of tools and utilities for quickly
constructing sophisticated front-end interfaces - or entire applications - with a strong focus on
building for the enterprise.

Please refer to the [Hoist Core](https://github.com/xh/hoist-core) repository readme for an
overview of Hoist as a whole: its reason for existing, server-side tech stack, general features and
capabilities.

This repository is *hoist-react*, which is the current reference client-side implementation of
Hoist. While React itself is a remarkably powerful platform on which to build modern web apps, it
represents only a part (however core) of the larger toolset required to create fully functional user
interfaces. Hoist-React brings together a curated collection of third-party and custom components,
supporting libraries, utilities, and tooling.

This enables truly rapid and ready-to-go development, tightly integrated Hoist functionality, and a
minimal number of upfront per-app decisions - while maintaining a high degree of flexibility and
extensibility for demanding custom use cases.

## About this Doc

This readme is intended to highlight the major libraries and components included in Hoist React, as
well as coding tools, conventions, and best practices that are somewhat unique to the framework. It
presumes a strong baseline knowledge of modern Javascript, some experience or understanding of React
and its particular concerns, and a prior review of the core features of Hoist as outlined in the
readme linked above.

Where helpful, this doc provides direct links into the most relevant and commonly used source code
classes and routines. We have aimed to make the code itself as clear, readable, and well-commented
as possible, and we are working to ensure a consistent level of in-code documentation - especially
at the class/component level and for essential public methods.

## Hoist usage, licensing, and support

While we maintain open access to the Hoist codebase via these public repositories, Hoist is intended
for use by clients of Extremely Heavy Industries who are working with us to develop custom
applications for their enterprise.

Please refer to the
[Hoist Core readme](https://github.com/xh/hoist-core#hoist-usage-licensing-and-support) for
additional terms and conditions, all of which apply equally and entirely to Hoist React.

## Key Libraries and Dependencies

📚 Hoist React is built on a collection of remarkable third-party libraries that have been
selected, combined and integrated by Extremely Heavy Industries. To make the best use of this
framework, please review the technologies below.

|   Library    |                                          Notes                                          |                Link                |
|--------------|-----------------------------------------------------------------------------------------|:----------------------------------:|
| React        | Core technology for efficient componentization and rendering of modern web applications |    [🔗](https://reactjs.org/)     |
| Mobx         | Flexible, well-balanced state management and smart reactivity.                          |    [🔗](https://mobx.js.org/)     |
| Webpack      | Endlessly extensible (if occasionally baffling) bundle and build tool.                  |   [🔗](https://webpack.js.org/)   |
| ag-Grid      | High performance, feature rich HTML5 grid                                               |  [🔗](https://www.ag-grid.com/)   |
| Blueprint    | General purpose UI toolkit for data-dense desktop webapps                               |   [🔗](http://blueprintjs.com/)   |
| Highcharts   | Proven, robust, well-rounded charting and visualization library                         | [🔗](https://www.highcharts.com/) |
| Router5      | Flexible and powerful routing solution                                                  |  [🔗](http://router5.github.io/)  |
| Font Awesome | Icons, icons, icons.                                                                    |   [🔗](http://fontawesome.io/)    |

### Library Licensing Considerations

👮 The majority of the libraries listed above and included within Hoist React as dependencies are
open-source and fully free to use. Wherever possible, we have aimed to minimize exposure to
third-party license costs and restrictions. The exceptions to this rule are listed below. For these
libraries, client application(s) using Hoist React must acquire and register appropriate licenses.

**Ag-Grid Enterprise** is required by Hoist React due to its support for a number of key, enterprise
only features, including row grouping and tree grids. Ag-Grid offers several
[licensing models](https://www.ag-grid.com/license-pricing.php) and requires a license key to be
included with the application codebase to verify compliance and avoid console warnings. An
appropriate key can be installed in any Hoist React application by via the `agGridLicenseKey`
parameter to `configureWebpack()` within
[hoist-dev-utils](https://github.com/xh/hoist-dev-utils/blob/master/configureWebpack.js).

**Font Awesome** provides a greatly extended set of icons via its
[Pro license](https://fontawesome.com/pro), and Hoist React references / relies on several of these
icons. A pro license includes access to a private npm repository to download the extended library,
accessed via a unique URL. ExHI can configure appropriate access via npm configuration files or an
enterprise npm repository proxy.

**HighCharts HighStock** is the primary charting library in Hoist, and offers several [licensing and
support options](https://shop.highsoft.com/highstock) for commercial use. Highcharts does not
require the registration or maintenance of any in-code licence keys.

## ECMAScript 2016+

🔮 Hoist React makes full use of the recent additions and improvements to Javascript itself, in the
form of ECMAScript 2016 (ES6/7) and a few more advanced (TC39 stage 2) features. These are enabled
by transpiling Hoist React and application source together, using Babel, as coordinated within a
standardized Webpack build process.

Key features of modern Javascript (and a bit of "BabelScript") used throughout Hoist React include:
* *Modules* - all dependencies imported via ES6 modules and resolved as such by Webpack.
* *Classes* - including [class fields](https://github.com/tc39/proposal-class-fields) and a few
  carefully considered uses of inheritance (😱).
* *Promises and async/await* - see below for additional notes on custom extensions and tooling
  around Promises.
* *Syntax Candy* - object destructuring, default parameters, arrow functions, string/template
  literals, `const`/`let` over `var`, and other recent-ish additions to Array and String prototypes.
* [*Decorators*](https://github.com/tc39/proposal-decorators) - aka annotations - are a core part of
  Mobx and used within Hoist to mixin key behaviors to several core artifacts. Decorator support is
  provided via the `transform-decorators-legacy` Babel plugin, which is specified as a dev
  dependency and enabled by `configureWebpack()` within
  [hoist-dev-utils](https://github.com/xh/hoist-dev-utils/blob/master/configureWebpack.js).

### Promises

🤝 Promises are a core code construct within Hoist React for executing asynchronous operations, and
as such have been extended in a few key ways. See [`Promise.js`](promise/Promise.js) for
documentation comments and implementations of Promise-related utilities and direct extensions to the
Promise prototype, including:

+ `catchDefault` - to add standardized exception handling and alerting to a Promise chain, including
  a configurable and end-user-focused error dialog to display an exception message with support for
  disclosing any stack trace and/or reporting user-supplied notes back to the server.
+ `track` - to integrate a Promise-based call with Hoist
  [activity tracking](https://github.com/xh/hoist-core#activity-tracking-and-client-error-reporting),
  timing the duration of a promise-based chain and reporting it back to the server tagged with a
  developer-supplied category, message, and optional extra data.
+ `timeout` - to cut (overly) long running Promises short
+ `linkTo` - for integration with a `PendingTaskModel` to track and report on state across one or
  more async operations.

💡 Note that by convention all methods returning a Promise within Hoist React (and ExHI-developed
applications) are suffixed with the qualifier `Async`, e.g. `loadUsersAsync` or
`restoreDefaultsAsync`. The framework does not rely on this convention for any programmatic
behaviors, but we have found it to be a helpful indicator of any Promise-based, asynchronous API.

## MobX - Reactive State Management

+ Homepage: <https://mobx.js.org/>
+ Docs: <https://mobx.js.org/refguide/api.html>
+ Source: <https://github.com/mobxjs/mobx>

|      Class/File      |                               Note                                |                 Link                  |
|----------------------|-------------------------------------------------------------------|:-------------------------------------:|
| `ReactiveSupport.js` | Mixin to add MobX reactivity to Components, Models, and Services. | [⚛️](core/mixins/ReactiveSupport.js)  |

MobX is an essential building block of Hoist React, providing an application state management
solution with "smart' reactivity, tight integration with React Components, and a general API for
reactive programming that extends beyond Components. Please review and familiarize yourself with the
MobX documentation to make the best use of Hoist React.

All Hoist Components (functional or class-based) include 'observer' support from the 'mobx-react'
project. This means that these Components are automatically re-rendered when any observable state
they used during their last render is modified. This support provides the core engine of reactivity
in Hoist.

In addition to Components, MobX is an essential tool for use by Models and Services within Hoist.
The `ReactiveSupport` mixin (decorator, linked above) adds two key methods by default to these core
Hoist artifacts - `addAutorun()` and `addReaction()`. These methods build on top of the native MobX
autorun and reaction utilities with some additional syntax for clarity (in the case of reactions)
and, importantly, a managed lifecycle that automatically disposes of these listeners when the owning
artifact's `destroy` method is called. See that class for further details on this API.

Hoist leverages MobX in a wide variety of other contexts, including observable data stores, the
handling and validation of form field inputs, routing, and more. In many cases, MobX-provided
reactivity replaces and improves upon an event / callback based model for emitting and responding to
state changes and other updates.

## Core Concepts: Models, Components, and Services

Three distinct types of objects (in the form of classes) compromise the backbone of a Hoist
application: **Models, Components, and Services**. Any non-trivial application will define and
create multiple instances of these core object types, and understanding how Hoist defines and uses
these three core artifacts is essential to understanding how we at ExHI build and structure apps.

Hoist provides three corresponding decorators to mark a class as a particular type of object and to
install shared functionality and extended features provided by the framework. A fourth decorator is
used to declare the top-level Model for each client application, and a special singleton Model
instance called `XH` is created and managed by Hoist as an entry point to core framework-level state
and functionality.

Finally all of these decorators rely on a set of utility functions defined within `ClassUtils` to
add their particular functionality, behaviors, and methods to the decorated classes.

|     Class/File                |                                  Note                                  |             Link              |
|-------------------------------|------------------------------------------------------------------------|:-----------------------------:|
| `HoistModel.js`               | Mixin for adding core Model support.                                   |   [⚛️](core/HoistModel.js)   |
| `HoistComponentClass.js`      | Mixin for creating class Components                                    | [⚛️](core/HoistComponentClass.js) |
| `HoistComponentFunctional.js` | Factory for creating functional Components                             | [⚛️](core/HoistComponentFunctional.js) |
| `HoistService.js`             | Mixin for adding core Service support.                                 |  [⚛️](core/HoistService.js)  |
| `HoistAppModel.js`            | Mixin for adding additional support to an App's primary Model class.   |    [⚛️](core/HoistAppModel.js)    |
| `XH.js`                       | Hoist's top-level Model / framework API entry-point, exported as `XH`. |       [⚛️](core/XH.js)       |
| `ClassUtils.js`               | Library methods for providing and extending methods on core classes.   | [⚛️](utils/js/ClassUtils.js) |

### HoistModel

📝 "Models" within Hoist comprise the core class of objects for managing state and business logic.
The `@HoistModel` decorator marks a class as a Model and installs core MobX and Event support.
(Model classes do not require any particular superclass - all shared functionality and patterns are
mixed in via the decorator.)

Important characteristics of Model object classes include:

* They define properties to hold state, marking mutable properties with MobX or Hoist decorators to
  make them observable by (one or more) Components, as well as other Models.
* They expose API methods to modify state or perform other actions such as calls to load data.
* They reference / create other parent and child models to create a logical hierarchy that reflects
  the structure and concerns of the application.

Defining, storing, or otherwise pushing state into Model classes (as opposed to Components)
encourages a separation of the application's core underlying logic from its presentation layer. Apps
can be designed and coded as a hierarchy of Model objects that reference properties and call methods
on each other, defining what the application knows and what it does without necessarily diving into
the specifics of how its visible Components are laid out or arranged.

Components can accept one or more models as props, reference properties of these Models within their
render methods, and call methods on these Models in response to user actions or inputs. This can
help to structure or encapsulate a Component's API, but also works with MobX to minimize extra
render cycles and respond to state changes as efficiently as possible. The
[`GridModel`](cmp/grid/GridModel.js) class is a notable example of managing a complex Component's
configuration, state, and API surface via a Model. Hoist's `LeftRightChooser` Component is managed
via its [dedicated Model class](desktop/cmp/leftrightchooser/LeftRightChooserModel.js), which
includes nested GridModels.

Models can also exist entirely independent of Components, or be generalized enough to be used as
state sources for multiple, different Components. The
['StoreSelectionModel'](data/StoreSelectionModel.js) and
[`PendingTaskModel`](utils/async/PendingTaskModel.js) are examples.

#### Singleton XH Model

Hoist creates and exports [`XH`, a singleton Model instance](core/XH.js), to coordinate the
framework API at the top level and provide the most commonly used entry points to general
functionality, including the creation, initialization, and aliases of key services. This model
instance is installed as a `window.XH` global for convenient access on the console, although calling
code should access `XH` via a standard import.

This class provides methods for app initialization, exception handling, and service access. It
instantiates Hoist service singletons and installs references to these instances. It also installs
aliases on itself for the most common framework service calls, e.g. `XH.getConf()` as a shortcut to
`XH.configService.get()`.

#### HoistAppModel

Each client application must define a top-level Model class using
[the specialized `@HoistAppModel` decorator](core/HoistAppModel.js). This decorator installs core
Model support as well as several additional methods specific to the high-level lifecycle of the
application, including those dealing with init, and routing. This class instance is available via an
import of the `XH` (as `XH.appModel`) and can be a useful place to hang global state specific to
your application.

Please review the inline documentation on the decorator for additional detailed information on what
it provides and how an Application should provide concrete implementations for certain key methods.
For an example within Hoist React itself, see HoistAppModel for the
[built-in Admin Console](admin/AppModel.js).

#### Model Cleanup and Destruction

The `HoistModel` decorator provides a `destroy()` method hook that should be called when a model is
no longer needed. This lifecyle method ensures that all MobX disposers are called and any event
listeners are cleared, ensuring the model's resources can be properly garbage collected. This is
typically done by passing to model to `XH.safeDestroy()`.

### HoistComponent

⚛️ Components are the most familiar artifacts in React development, and are likely what come to
mind first when most developers think of React. Functional components are the preferred method of
defining components in React and Hoist. To define a functional component in Hoist, simply wrap a
render function with the `hoistComponent` function. This will apply core Hoist support, including
MobX observability, and support for Forwards refs, and will return the Component.

Alternatively, Hoist continues to fully support ES6 class-based Components. These can be specified
using the '@HoistComponent' decorator. This decorator will enable MobX reactivity and augment a
Component with several useful convenience methods/getters such as `getDOMNode()` and `isDisplayed`.

Note that many layout related HoistComponents provide "LayoutSupport". HoistComponents supporting
this feature promote most flexbox layout properties (e.g. 'width', 'height', 'flex') to being first
class props on the component itself. This allows many layout operations to be done in declarative
Javascript.

### HoistService

⚙️ Services within Hoist are singleton classes designed to encapsulate key data access and business
logic, independent of and distinct from any particular UI component. Services can maintain their own
internal state and data structures and expose methods for use by the rest of the application. A
common use for Services is to fetch and post data to the server, potentially transforming,
validating, or defaulting outbound queries and inbound data to provide a local API to application
Model and Component classes that's tailored to their needs.

Service instances persist for the life of the app and have a defined initialization process. By
convention they are stored within an `svc/` package within an app's file structure.

Use the `@HoistService` decorator to mark a class as a global service within. As with the other
decorators, this installs MobX and Event support and defines an empty `initAsync()` lifecycle
method. To instantiate and make services available to application code, use the
`XH.installServicesAsync()` method. This method will construct, initialize, and install the services
as a property on the XH object. Note that there is a strict expectation that service classes will be
named ending with the word 'Service', e.g. `MyCustomService.`. The installed instance in this case
would then be made available to application code as `XH.myCustomService'.

Many core Hoist features are exposed on the client via services such as `PrefService`,
`ConfigService`, and `IdentityService`. See these examples for a better understanding of the kind of
tasks and code patterns commonly used within Service classes.


## Element Factories

| Class/File |                        Note                        |        Link         |
|------------|----------------------------------------------------|:-------------------:|
| `elem.js`  | Utils for creating elements and element factories. | [⚛️](core/elem.js) |


Hoist encourages the use of Element factories to create element trees in render functions using pure
Javascript. These factory methods take a configuration object where properties and child elements
are specified without any wrapping braces or additional syntax. All Hoist API components have
predefined element factories available for import alongside the core Component. We also provide an
`elemFactory()` function which can be used to create such a factory from any third-party or
application Component.

We believe that this factory approach excels for declarative specification of code-heavy element
trees. New users of Hoist are invited to examine the source code of our core components to see
examples of its use. Its probably the most notable hallmark of our internal code, and where Hoist
diverges most visibly from other React projects.

It's worth noting that this approach is based on an extremely thin layer (<20 lines of code) around
the core React `createElement()` API, and does not impose or rely on any special requirements or
additional libraries. Its also worth noting that this approach is only superficially different from
JSX (see below).

## What about JSX?

JSX is the XML-like extension to Javascript typically used to specify and configure React
components. While it's syntax and appearance within otherwise "vanilla" Javascript code might appear
strange to non-React developers, JSX syntax and conventions are a de-facto standard in the React
community, familiar to React developers, and found in all React guides and tutorials.

**Hoist fully supports JSX.**

All Hoist components can be created with JSX tags, and developers of Hoist-based applications can
exclusively use JSX if they wish. In fact, for element trees with a significant amount of hypertext,
JSX might be a better choice then element factories, and we frequently make internal use of it for
that purpose. Also, JSX can be used interchangably with element factories, even within the same
render method.

Note that JSX is pre-processed (via Babel) into calls to React.createElement() before running in the
browser. Ultimately this produces similar runtime Javascript to the element factory approach
reccomended above.


## Bundled and Managed Components

Hoist includes a wide variety of carefully selected and integrated UI Components, ready to be put to
immediate use within an application. Most of these are built on / composed of Components provided by
well-regarded (and generally awesome) third-party libraries.

An central goal of the Hoist toolkit, however, is to provide a more **managed, normalized, and
integrated** set of patterns, APIs, and links on top of the "raw" library components. This enables
them to work better together, integrate with and leverage core Hoist services such as soft
configuration and user preferences, and appear to end-users as a cohesive and highly polished
system, as opposed to a disparate and sometimes contradictory set of independent UI elements.

### Desktop vs. Mobile

📱 Hoist supports the development of rich, highly functional applications for both traditional
desktop and mobile (phone / tablet) browsers and devices. These platforms have different priorities
and needs when it comes to UI design and interactions, but also share many common needs when it
comes to state management, data models and processing, and other core infrastructure.

The top-level `/desktop/` and `/mobile/` packages contain components and other classes that are
specific to their respective platforms. Wherever possible, however, we have worked to push shareable
Model, Service, and other utility code up into packages common across both.

### Component TODOs

🚧 Several key components / component families deserve some dedicated callouts in this readme, and
will be filled in as soon as possible. These include planned notes on:

- [ ] Grid and GridModel
- [ ] Panel and layouts
- [ ] HoistInput form controls and model-based management of form fields
- [ ] Top-level AppBar and related app infrastructure components
- [ ] Bundled Icon enums

## Build and Deployment

🛠️ This section details the general steps we use to build a typical full-stack Hoist React
application. We consider the Grails-based back-end and React-based front-end to be two sides of the
same application. We build and deploy them together, and so the below includes info on building the
Grails / Gradle based server. That is technically the domain of
[Hoist Core](https://github.com/xh/hoist-core) but is detailed here to provide a consolidated look
at the build process.

***At a high level, the build process:***
* Builds the Grails back-end via Gradle, producing a WAR file.
* Builds the JS front-end via Webpack, producing a set of production ready client assets.
* Copies both outputs into a pair of Docker containers and publishes those containers as the
  end-product of the build.
* Deploys the new images, immediately or in a later step.

Hoist does not mandate the use of any particular CI system, although we recommend and use
[Jetbrains Teamcity](https://www.jetbrains.com/teamcity/) across multiple project deployments. The
examples in this section do reference some Teamcity terms (although these concepts are very general
and applicable to any common CI system).

Hoist also does not require the use of Docker or containerization in general, nor does it rely on
any particular container orchestration technology (e.g. Kubernetes). That said, the move towards
Docker-based deployments is clearly a popular one, and we have found containers to be a useful way
to bundle up and somewhat abstract away the two-part nature of full-stack Hoist UI applications.

💡 Note that the use of `appCode` throughout this section is a placeholder for the actual shortname
assigned to your application. This is a short, camelCased variant of the longer `appName` and is set
within the application source code via both the Gradle and Webpack configs.

### 1\) Setup/Prep

####  1.1) Refresh and Lint JS Client

We do this first to fail fast if the client code doesn’t pass the linter checks, which is relatively
common. This step could also run any preflight unit tests, etc. should you be diligent enough to
have them.

```bash
yarn
yarn lint
```

#### 1.2) Set Gradle project name

It’s best to be explicit with Gradle about the name of the project. By default it uses the name of
the containing directory, which in a CI build is probably a random hash.

Project names can be set via a `settings.gradle`in the project root, but we often don’t want to
check in a `settings.gradle` with each app project. as we commonly build and test [custom Grails
plugins](https://github.com/xh/hoist-core#custom-plugins-for-enterprise-deployments) by running in
a [multi-project build mode](https://docs.gradle.org/current/userguide/multi_project_builds.html)
with an under-development Grails plugin and the app checked out as siblings in a parent wrapper
directory. That parent directory (which is local to the developer’s machine and not in source
control) has its own `settings.gradle` file to bind the app and plugin together. You can’t have more
than one `settings.gradle` in a Gradle project, so this dev-time setup would conflict with a checked
in version should one exist

As a workaround, we can have the build system take the app name (we use a project-level Teamcity
`%param%`) and then write out a `settings.gradle` file in place within the checked out source.

```bash
echo "rootProject.name = \"%appCode%\"" > settings.gradle
```

This step could be avoided by checking in a `settings.gradle` with the app and, should you need the
special plugin development setup outlined above, manually deleting or renaming it (and remembering
to not check that change into source control). In many cases, in-line Grails plugin development will
be a rarity or limited to ExHI or a smaller set of developers.

### 2\) Server and Client Builds

#### 2.1) Build (and optionally publish) Grails server WAR with Gradle

This step calls into a `build.gradle` script checked in with each project to build the Grails
server-side into a WAR and then publish that to an internal Maven repo.

Publishing the built WAR to an internal Maven repo is not necessary, but it does give us some parity
with how we build and publish Grails plugins and is relatively standard with versioned Java
artifacts. That said, the “real” output of the build will be a pair of Docker containers (below),
and we’re not pushing the corresponding client JS assets to Maven or baking them into the WAR - both
of which make publishing the WAR somewhat arbitrary. 🤷 The choice as to whether or not to publish
can depend on the nature of the app and the standards/controls expected within the organization.

This step takes an application version, which is baked into the build. This can be left out, in
which case it will default to the version specified within the app’s `gradle.properties` file. Our
convention is to leave `gradle.properties` checked in with the next snapshot version and have the
builds override via a Gradle `-P` option when doing a particular versioned build. This means that
“snapshot” builds can simply leave the argument off, versioned builds can supply it (we use a
Teamcity param supplied via a required prompt), and `gradle.properties` only needs to change in
source control when a new major release moves us to a new snapshot.

When publishing, the build script is typically also setup to accept credentials w/deploy rights to
the internal Maven repository. The
[Toolbox build script](https://github.com/xh/toolbox/blob/develop/build.gradle) provides an
example - see the `publishing` section.

Teamcity can use its dedicated “Gradle runner” to provide a more customized view on the task, or a
simple command runner could be used. In both cases, a Gradle wrapper should be checked in with the
project and used according to Gradle best practices.

```bash
# If publishing - will build WAR then push to Maven as per particular config in build.gradle
./gradlew publishApp -PxhAppVersion=%appVersion% -PmavenDeployUser=%deployUser% -PmavenDeployPassword=%deployPwd%

# If building WAR only
./gradlew war -PxhAppVersion=%appVersion%
```

In both cases, the output is a `appCode-appVersion.war` file file within `/build/libs`.

#### 2.2) Build JS Client with Webpack

This step builds all the client-side assets (JS/CSS/static resources) with Webpack, taking the
source and dependencies and producing concatenated, minified, and hashed files suitable for serving
to browsers. We use `yarn` as our package manager / runner tool, although `npm` is also fine if
preferred.

This step takes several arguments that are passed via a script in `package.json` to Webpack. Each
project has a `webpack.config.js` file checked into the root of its `client-app` directory that
accepts any args and runs them through a script provided by
[hoist-dev-utils](https://github.com/xh/hoist-dev-utils/blob/master/configureWebpack.js) to
produce a fully-based Webpack configuration object. The two args typically set during the build
process (as opposed to being checked in to the app's `webpack.config.js`) are:

* `appVersion` - the same x.y.z version supplied to the server-side build above. We take the same
  approach on the client as we do on the server, where the next snapshot version is left defaulted
  within the app’s `webpack.config.js` file and then overridden via this arg for versioned builds
  only.
* `appBuild` - this is an optional arg that gets baked into the client code and exposed as a
  variable for display in the built-in Hoist admin client. We use it to pass a git commit hash,
  which then provides another way to cross-reference exactly what snapshot of the codebase was used
  to build any given running application.

An example Teamcity command line runner. ⚠️ Note this must run with `client-app` as its working
directory:

```bash
appVersion=%appVersion%
# Source commit hash from CI system - approach here depends on TC build config/template
gitCommit=%build.vcs.number%
# Grab a shorter version of the full hash
appBuild=${gitCommit:0:10}
echo "Building $appVersion $appBuild"
yarn build --env.appVersion=$appVersion --env.appBuild=$appBuild
```

The output is a set of files within `/client-app/build/` .

### 3\) Docker images

🐳 The primary outputs of the overall build process are a pair of Docker containers, one for the
Grails server and one for the client JS assets. These include the build assets and are tagged with
the desired version, making them (as a pair) a complete and deployable instance of the application.

Applications should be checked in with a `/docker/` directory containing Dockerfiles and configs for
both the server and client containers. Both can be based on
[public images published by ExHI](https://hub.docker.com/r/xhio/), although an inspection of
[those](https://github.com/xh/xh-tomcat) [images](https://github.com/xh/xh-nginx) will show that
they are very thin layers on top of the official Tomcat and nginx images on Docker Hub.

#### 3.1) Build and Publish Tomcat Docker image

The Grails server component is deployed within a Tomcat container. The app should have a minimal
`/docker/tomcat/Dockerfile` (checked into source control) such as:

```dockerfile
FROM xhio/xh-tomcat:latest
COPY setenv.sh bin/
COPY *.war webapps/ROOT.war
```

The `setenv.sh` referenced here can also be checked in with the app project and used to set
environment variables / Java Opts required by Tomcat. This typically contains a reasonable `Xmx`
(max JVM heap) value for the app and a pointer to an “instance config” file used by Hoist apps to
bootstrap themselves with DB credentials and other low-level configuration required at startup. By
convention we place this file within a Docker volume that’s mounted to `/appCode` within each
container

All this means that a `/docker/tomcat/setenv.sh` typically looks like:

```bash
export JAVA_OPTS="$JAVA_OPTS -Xmx2G -Dio.xh.hoist.instanceConfigFile=/appCode/conf.yml"
```

That leaves the build with the job of generating a suitable tag for the container, running the
Docker build, and then pushing to an appropriate (likely internal) Docker registry. The container
tag should include the appCode + `-tomcat` to indicate that this is the Grails-side container.

An example Teamcity command line runner. ⚠️ Note this must run with `docker/tomcat` as its working
directory:

```bash
# Copy the WAR built above into the Docker context.
cp ../../build/libs/*.war .

# Determine an appropriate container tag from CI params.
containerTag=%internalDockerRegistry%/%appCode%-tomcat:%appVersion%
echo "Building Docker container $containerTag"
sudo docker build --pull -t "$containerTag" .

# Note whether build was successful, push if so, return error if not.
ret=$?
if [ $ret -eq 0 ]
then
  sudo docker push "$containerTag"
  ret=$?
else
  echo "Docker container build failed and was not pushed"
fi

# Cleanup and relay exit code to CI
rm *.war
exit $ret
```

#### 3.2) Build and Publish nginx Docker image

The static JS resources are deployed within an nginx container. The app should have a minimal
`/docker/nginx/Dockerfile/ ` (checked into source control) such as:

```dockerfile
FROM xhio/xh-nginx:latest
COPY app.conf $/XH_NGINX_CONFIG_PATH/
COPY build/ $/XH_NGINX_CONTENT_PATH/
```

Note that the `$XH` environment variables are set for convenience within the `xh-nginx` base image
Dockerfile.

The `app.conf` referenced here is an app-specific nginx configuration that should be checked in
alongside the Dockerfile. It should setup the available routes to serve each bundled client app,
configure SSL certificates if needed, do any required redirects, and (importantly) include a *proxy
configuration* to pass traffic through from the nginx container to the Tomcat container. Hoist
deploys typically bind only the nginx ports to the host machine, then link the nginx and Tomcat
containers together via Docker so there’s a single point of entry (nginx) for incoming requests.
This means that no CORS or further, external proxy configuration is required to have the
nginx-dosted client communicate with its Tomcat back-end.

While the exact content of the `app.conf` file will vary depending on the app, a representative
example is below:

```
server {
    server_name  localhost;
    include includes/xh-secure-redirect.conf;
}

server {
    server_name  localhost;
    listen 443 ssl;
    root   /usr/share/nginx/html;

    ssl_certificate     /appCode/ssl/appCode.crt;
    ssl_certificate_key /appCode/ssl/appCode.pem;

    # Redirect root to /app/
    location = / {
        return 301 $scheme://$host/app/;
    }

    # Static JS/CSS/etc assets not matching a more specific selector below
    location / {
        expires $expires;
    }

    # App entry points - ensure trailing slash, match or fallback to index for sub-routes
    location = /admin {
        return 301 $uri/;
    }

    location /admin/ {
        try_files $uri /admin/index.html;
        expires $expires;
    }

    location = /app {
        return 301 $uri/;
    }

    location /app/ {
        try_files $uri /app/index.html;
        expires $expires;
    }

    # Proxy to Grails back-end - appCode-tomcat is defined by Docker (e.g. via link)
    location /api/ {
        proxy_pass http://appCode-tomcat:8080/;
        include includes/xh-proxy.conf;
    }
}
```

***Note that this example configuration:***

* Uses `appCode` as a placeholder - use the same code as configured in the app’s server and client
  builds!
* Calls several optional nginx config includes, sourced from the base `xh-nginx` image. The base
  image also copies in [an overall config](https://github.com/xh/xh-nginx/blob/master/xh.conf)
  that enables gzip compression and sets the `$expires` variable referenced above.
* Redirects insecure requests to HTTPS on port 443 and terminates SSL itself, using certificates
  sourced from `/appCode/ssl` - the conventional location for Hoist apps to store certs and keys
  within an attached Docker volume.
* Sets up locations for each client-app entry point / bundle - here we are shipping two JS apps with
  this container: `app` - the business-user facing app itself - and `admin` - the built-in Hoist
  Admin console. Apps might have other entry points, such as `mobile` or other more specific
  bundles.
* Uses the `try_files` directive to attempt to service requests at sub-paths by handing back asset
  files if they exist, but otherwise falling back to `index.html` within that path. This allows for
  the use of HTML5 “pushState” routing, where in-app routes are written to the URL without the use
  of a traditional `#` symbol (e.g. <http://host/app/details/123>).
* Creates a proxy endpoint at `/api/` to pass traffic through to the Tomcat back-end. This path is
  expected by the JS client, which will automatically prepend it to the path of any local/relative
  Ajax requests. This can be customized if needed on the client by adjusting the `baserUrl` param
  passed to `configureWebpack()`.

The build system now simply needs to copy the built client-side resources into the Docker context
and build the image. The sample below is simplified, but could also include the return code checks
in the Tomcat example above. Note the `-nginx` suffix on the container tag. ⚠️ This example must
also run with `docker/nginx` as its working directory:

```bash
cp -R ../../client-app/build/ .
containerTag=%internalDockerRegistry%/%appCode%-nginx:%appVersion%
echo "Building Docker container $containerTag"
sudo docker build --pull -t "$containerTag" .
sudo docker push "$containerTag"
```

#### 3.3) Docker cleanup

✨ At this point the build is complete and new versioned or snapshot images containing all the
runtime code have been pushed to a Docker registry and are ready for deployment.

It might be beneficial to add one more step to clean up local Docker images on the build agent, to
avoid them continuing to grow and take up disk space indefinitely. Note this forces Docker to pull
the base images anew each time, which takes a small amount of time/bandwidth. It could probably be
made more targeted if desired:

```bash
sudo docker system prune -af
```

### 4\) Docker deployment

🚢 We typically setup distinct targets for build vs. deploy, and configure deployment targets to
prompt for the version number and/or Docker hostname. This process will differ significantly
depending on the use (or not) of orchestration technology such as Kubernetes or AWS Elastic
Container Service (ECS).

Regardless of the specific implementation, the following points should apply:

* Both `appCode-tomcat` and `appCode-nginx` containers should be deployed as a service / pair, and
  be kept at the same version.
* The Tomcat container does not need to have any ports exposed/mapped onto the host (although it
  could if direct access is desired).
* The nginx container typically exposes ports 80 and 443, although if a load balancer or similar is
  also in play that might vary (and would require appropriate adjustments to the `app.conf` nginx
  file outlined above).
* The nginx container must be able to reach the Tomcat container at the same name included in its
  `app.conf` file - by convention, it expects to use `appCode-tomcat`. With straight Docker, this
  can be accomplished via the `--link` option (see below).
* A shared volume can be used to host the instance config .yml file for the Grails server, SSL certs
  as required for nginx, and logs if so configured. This volume must be created in advance on the
  host and populated with any required bootstrap files. How that’s done again will depend on the
  particular Docker environment in play.

A sample Teamcity SSH-exec runner using Docker directly:

```bash
appCode=%appCode%
tomcatName=$appCode-tomcat
tomcatImage=%internalDockerRegistry%/$tomcatName:%appVersion%
echo "Deploying $tomcatImage"

# Stop and remove existing Tomcat container
sudo docker container stop $tomcatName
sudo docker container rm $tomcatName

# Pull Tomcat image at specified version
sudo docker image pull $tomcatImage

# Run Tomcat image and mount local docker volume for YML config / log storage
sudo docker run -d --name $tomcatName --mount type=volume,src=$appCode,dst=/$appCode --restart always $tomcatImage
echo "Deploying $tomcatImage complete"

nginxName=$appCode-nginx
nginxImage=%internalDockerRegistry%/$nginxName:%appVersion%
echo "Deploying $nginxImage"

# Stop and remove existing nginx container
sudo docker container stop $nginxName
sudo docker container rm $nginxName

# Pull nginx image at specified version
sudo docker image pull $nginxImage

# Run nginx image - link to Tomcat for proxying, expose ports, and mount local docker volume for SSL certificate access
sudo docker run -d --name $nginxName --link $tomcatName:$tomcatName -p 80:80 -p 443:443 --mount type=volume,src=$appCode,dst=/$appCode --restart always $nginxImage
echo "Deploying $nginxImage complete"

# Prune Docker, cleaning up dangling images and avoiding disk space bloat
sudo docker system prune -af
```

## Work In Progress

🚧 This readme is currently a work in progress, with several additional sections planned including:
- [ ] Additional info on Application init and lifecycle
- [ ] Client-side services provided by hoist-react (w/some pointers to info already in hoist-core)
- [ ] Theming and styles
- [ ] Bundled formatters and renderers (Dates, numbers)
- [ ] Exception handling and error reporting
- [ ] Admin console + custom snap-ins
- [ ] ....

🙏 Thanks for your patience as we continue to build out this documentation.

------------------------------------------

📫☎️🌎 info@xh.io | <https://xh.io/contact>

Copyright © 2019 Extremely Heavy Industries Inc.
