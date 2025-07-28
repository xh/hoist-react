# Welcome to Hoist React

Additional docs of interest:
* [CHANGELOG.md](https://github.com/xh/hoist-react/blob/develop/CHANGELOG.md) - record of all Hoist
  versions + not-yet-released changes within our SNAPSHOT pre-release.
* [docs/build-and-deploy.md](https://github.com/xh/hoist-react/blob/develop/docs/build-and-deploy.md)
  \- notes on CI configuration and build/deploy considerations.
* [docs/development-environment.md](https://github.com/xh/hoist-react/blob/develop/docs/development-environment.md)
  \- notes on local development environment configuration for Hoist and app developers.
* [docs/upgrade-to-typescript.md](https://github.com/xh/hoist-react/blob/develop/docs/upgrade-to-typescript.md)
  \- guide on upgrading hoist applications to typescript.

Hoist is a web application development toolkit developed by [Extremely Heavy](https://xh.io/).

Hoist is designed as a "full stack" UI development framework, meaning that it has both server and
client components that work together to provide an integrated set of tools and utilities for quickly
constructing sophisticated front-end interfaces - or entire applications - with a strong focus on
building for the enterprise.

Please refer to the [Hoist Core](https://github.com/xh/hoist-core) repository readme for an overview
of Hoist as a whole: its reason for existing, server-side tech stack, general features and
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

Hoist is currently developed exclusively by Extremely Heavy and intended for use by XH and our
client partners to develop enterprise web applications with XH's guidance and direction. That said,
we have released the toolkit under the permissive and open Apache 2.0 license. This allows other
developers, regardless of whether they are current XH clients or not, to checkout, use, modify, and
otherwise explore Hoist and its source code. See [this project's license file](LICENSE.md) for the
full license.

We have selected an open source license as part of our ongoing commitment to openness, transparency,
and ease-of-use, and to clarify and emphasize the suitability of Hoist for use within a wide variety
of enterprise software projects. Note, however, that we cannot at this time commit to any particular
support or contribution model outside of our consulting work. But if you are interested in Hoist
and/or think it might be helpful for a project, please don't hesitate to
[contact us](https://xh.io/contact)!

## Key Libraries and Dependencies

📚 Hoist React is built on a collection of remarkable third-party libraries that have been selected,
combined and integrated by Extremely Heavy. To make the best use of this framework, please review
the technologies below.

|   Library    |                                          Notes                                          |               Link                |
|--------------|-----------------------------------------------------------------------------------------|:---------------------------------:|
| React        | Core technology for efficient componentization and rendering of modern web applications |    [🔗](https://reactjs.org/)     |
| Mobx         | Flexible, well-balanced state management and smart reactivity.                          |    [🔗](https://mobx.js.org/)     |
| Webpack      | Endlessly extensible (if occasionally baffling) bundle and build tool.                  |   [🔗](https://webpack.js.org/)   |
| ag-Grid      | High performance, feature rich HTML5 grid                                               |  [🔗](https://www.ag-grid.com/)   |
| Blueprint    | General purpose UI toolkit for data-dense desktop webapps                               |   [🔗](http://blueprintjs.com/)   |
| Highcharts   | Proven, robust, well-rounded charting and visualization library                         | [🔗](https://www.highcharts.com/) |
| Router5      | Flexible and powerful routing solution                                                  |  [🔗](http://router5.github.io/)  |
| Font Awesome | Icons, icons, icons.                                                                    |   [🔗](http://fontawesome.io/)    |

### Library Licensing Considerations

⚖️ The majority of the libraries listed above and included within Hoist React as dependencies are
open-source and fully free to use. Wherever possible, we have aimed to minimize exposure to
third-party license costs and restrictions. The exceptions to this rule are listed below. For these
libraries, client application(s) using Hoist React must acquire and register appropriate licenses.

**Ag-Grid** is released by its developer under a dual licensing model, with the community edition
available under a permissive MIT license and the Enterprise edition requiring a [paid license from
ag-Grid](https://www.ag-grid.com/license-pricing.php). Applications wishing to use grids in Hoist
React will need to provide a licensed version of ag-Grid. A free community version is available,
however many applications will want to license the enterprise version in order to make use of the
important extra functionality it provides, including row grouping and tree grids.

**Font Awesome** provides a greatly extended set of icons via its
[Pro license](https://fontawesome.com/pro), and Hoist React references / relies on several of these
icons. A pro license includes access to a private npm repository to download the extended library,
accessed via a unique URL. XH can configure appropriate access via npm configuration files or an
enterprise npm repository proxy.

**HighCharts HighStock** is the primary charting library in Hoist, and offers several [licensing and
support options](https://shop.highsoft.com/highstock) for commercial use. Application wishing to use
charts in Hoist will need to provide a licensed version of Highcharts.

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
as such have been extended in a few key ways. See [`Promise.ts`](promise/Promise.ts) for
documentation comments and implementations of Promise-related utilities and direct extensions to the
Promise prototype, including:

+ `catchDefault` - to add standardized exception handling and alerting to a Promise chain, including
  a configurable and end-user-focused error dialog to display an exception message with support for
  disclosing any stack trace and/or reporting user-supplied notes back to the server.
+ `track` - to integrate a Promise-based call with Hoist
  [activity tracking](https://github.com/xh/hoist-core#activity-tracking-and-client-error-reporting),
  timing the duration of a promise-based chain and reporting it back to the server tagged with a
  developer-supplied category, message, and optional extra data.
+ `timeout` - to cut (overly) long-running Promises short
+ `linkTo` - for integration with a `TaskObserver` to track and report on state across one or more
  async operations.

💡 Note that by convention all methods returning a Promise within Hoist React (and XH-developed
applications) are suffixed with the qualifier `Async`, e.g. `loadUsersAsync` or
`restoreDefaultsAsync`. The framework does not rely on this convention for any programmatic
behaviors, but we have found it to be a helpful indicator of any Promise-based, asynchronous API.

## MobX - Reactive State Management

+ Homepage: <https://mobx.js.org/>
+ Docs: <https://mobx.js.org/refguide/api.html>
+ Source: <https://github.com/mobxjs/mobx>

MobX is an essential building block of Hoist React, providing an application state management
solution with "smart' reactivity, tight integration with React Components, and a general API for
reactive programming that extends beyond Components. Please review and familiarize yourself with the
MobX documentation to make the best use of Hoist React.

All Hoist Components include 'observer' support from the 'mobx-react' project. This means that these
Components are automatically re-rendered when any observable state they used during their last
render is modified. This support provides the core engine of reactivity in Hoist.

In addition to Components, MobX is an essential tool for use by Models and Services within Hoist.
The `HoistBase` class adds two key methods by default to these core Hoist artifacts - `addAutorun()`
and `addReaction()`. These methods build on top of the native MobX autorun and reaction utilities
with some additional syntax for clarity (in the case of reactions) and, importantly, a managed
lifecycle that automatically disposes of these listeners when the owning artifact's `destroy` method
is called. See that class for further details on this API.

Hoist leverages MobX in a wide variety of other contexts, including observable data stores, the
handling and validation of form field inputs, routing, and more. In many cases, MobX-provided
reactivity replaces and improves upon an event / callback based model for emitting and responding to
state changes and other updates.


## Core Concepts: XH

Hoist creates and exports [`XH`, a singleton Model instance](core/XH.ts), to coordinate the
framework API at the top level and provide the most commonly used entry points to general
functionality, including the creation, initialization, and aliases of key services. This model
instance is installed as a `window.XH` global for convenient access on the console, although calling
code should access `XH` via a standard import.

This class provides methods for app initialization, exception handling, and service access. It
instantiates Hoist service singletons and installs references to these instances. It also installs
aliases on itself for the most common framework service calls, e.g. `XH.getConf()` as a shortcut to
`XH.configService.get()`.

| Class/File |                                  Note                                  |       Link       |
|------------|------------------------------------------------------------------------|:----------------:|
| `XH.ts`    | Hoist's top-level Model / framework API entry-point, exported as `XH`. | [⚛️](core/XH.ts) |


## Core Concepts: Models, Components, and Services

Three distinct types of artifacts compromise the backbone of a Hoist application: **Models,
Components, and Services**. Any non-trivial application will define and create multiple instances of
these core object types, and understanding how Hoist defines and uses these three core artifacts is
essential to understanding how we at XH build and structure apps.

Models and services are class-based and base classes `HoistModel` and `HoistService` are provided by
Hoist for these object. `HoistAppModel` is a special base class for an Application's primary Model
class that provides additional high-level info about the application.

Components are react functional components, but with additional wrapping provided by Hoist to
support model specification and lookup and and observability. Applications should use the factory
function `hoistCmp` to define Components with this support.

|     Class/File      |                                  Note                                   |            Link             |
|---------------------|-------------------------------------------------------------------------|:---------------------------:|
| `HoistBase.ts`      | Root Base class. Support for mobx, persistence, and resource management |       [⚛️](core/XH.ts)       |
| `HoistModel.ts`     | Base class for Models                                                   |   [⚛️](core/HoistModel.ts)   |
| `HoistService.ts`   | Base class for Services                                                 |  [⚛️](core/HoistService.ts)  |
| `HoistComponent.ts` | Contains `hoistComponent`, factory for creating functional Components   | [⚛️](core/HoistComponent.ts) |
| `HoistAppModel.ts`  | Base class for an App's primary Model class.                            | [⚛️](core/HoistAppModel.ts)  |

### HoistModel

📝 "Models" within Hoist comprise the core class of objects for managing state and business logic.
The `HoistModel` base class marks a class as a Model and installs core MobX and other support.

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

Components will reference properties of these Models within their render methods, and call methods
on these Models in response to user actions or inputs. This can help to structure or encapsulate a
Component's API, but also works with MobX to minimize extra render cycles and respond to state
changes as efficiently as possible. The [`GridModel`](cmp/grid/GridModel.ts) class is a notable
example of managing a complex Component's configuration, state, and API surface via a Model. Hoist's
`LeftRightChooser` Component is managed via its
[dedicated Model class](desktop/cmp/leftrightchooser/LeftRightChooserModel.ts), which includes
nested GridModels.

Models can also exist entirely independent of Components, or be generalized enough to be used as
state sources for multiple, different Components. The
['StoreSelectionModel'](data/StoreSelectionModel.ts) is a good example of this.

#### HoistAppModel

Each client application must define a top-level Model class using
[the specialized `HoistAppModel` base class](core/HoistAppModel.ts). This class defines several
additional methods specific to the high-level lifecycle of the application, including those dealing
with init, and routing. This class instance is available via an import of the `XH` (as
`XH.appModel`) and can be a useful place to hang global state specific to your application.

Please review the inline documentation on the class for additional detailed information on what it
provides and how an Application should provide concrete implementations for certain key methods. For
an example within Hoist React itself, see HoistAppModel for the
[built-in Admin Console](admin/AppModel.ts).

### hoistComponent

⚛️ Components are the most familiar artifacts in React development, and are likely what come to mind
first when most developers think of React. Functional components are the preferred method of
defining components in React and Hoist. To define a functional component in Hoist, simply provide a
render function to the `hoistComponent` function. This will apply core Hoist support, including MobX
reactivity, model lookup, and support for forward refs, and will return the Component.

Note that many layout related Components provide "LayoutSupport". Components supporting this feature
promote most flexbox layout properties (e.g. 'width', 'height', 'flex') to being first class props
on the component itself. This allows many layout operations to be done in declarative Javascript.

### HoistService

⚙️ Services within Hoist are singleton classes designed to encapsulate key data access and business
logic, independent of and distinct from any particular UI component. Services can maintain their own
internal state and data structures and expose methods for use by the rest of the application. A
common use for Services is to fetch and post data to the server, potentially transforming,
validating, or defaulting outbound queries and inbound data to provide a local API to application
Model and Component classes that's tailored to their needs.

Service instances persist for the life of the app and have a defined initialization process. By
convention they are stored within an `svc/` package within an app's file structure.

Use the `HoistService` class to mark a class as a global service within. This installs MobX and
support and defines an empty `initAsync()` lifecycle method. To instantiate and make services
available to application code, use the`XH.installServicesAsync()` method. This method will
construct, initialize, and install the services as a property on the XH object. Note that there is a
strict expectation that service classes will be named ending with the word 'Service', e.g.
`MyCustomService.`. The installed instance in this case would then be made available to application
code as `XH.myCustomService`.

Many core Hoist features are exposed on the client via services such as `PrefService`,
`ConfigService`, and `IdentityService`. See these examples for a better understanding of the kind of
tasks and code patterns commonly used within Service classes.

#### Resource Management

The `HoistBase` class provides a `destroy()` method that will be called when a model is no longer
needed. This lifecycle method ensures that all MobX disposers are called and all resources are
cleaned up when the object is no longer needed. Related objects can also be marked as `@managed`,
ensuring that these subsidiary objects will be cleaned up as well.

For the most part, applications should not need to explicitly call `destroy()`. Any models or
services that Hoist instantiates (via `new`) will be destroyed by Hoist itself when no longer
needed. The main responsibility for applications is to ensure that any objects they explicitly
create with `new` are either marked as `@managed` or destroyed explicitly in `destroy()`.


## Element Factories

| Class/File |                        Note                        |       Link        |
|------------|----------------------------------------------------|:-----------------:|
| `elem.ts`  | Utils for creating elements and element factories. | [⚛️](core/elem.ts) |


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

## Work In Progress

🚧 This readme is currently a work in progress, with several additional sections planned including:
- [ ] Additional info on Application init and lifecycle
- [ ] Client-side services provided by hoist-react (w/some pointers to info already in hoist-core)
- [ ] Theming and styles
- [ ] Bundled formatters and renderers (Dates, numbers)
- [ ] Exception handling and error reporting
- [ ] Admin console and custom snap-ins
- [ ] ....

🙏 Thanks for your patience as we continue to build out this documentation.

------------------------------------------

📫☎️🌎 info@xh.io | https://xh.io/contact
Copyright © 2025 Extremely Heavy Industries Inc. - all rights reserved
