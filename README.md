# Hoist React Readme

<p align="center">
    <img src="https://xh.io/wp-content/uploads/2018/04/hoist-web-350.png"><br>
    by<br>
    <img src="https://xh.io/wp-content/uploads/2015/01/web-logo-black-2x.png">
</p>

Hoist is a web application development toolkit developed by Extremely Heavy Industries.

Hoist is designed as a "full stack" UI development framework, meaning that it has both server and
client components that work together to provide an integrated set of tools and utilities for quickly
constructing sophisticated front-end interfaces - or entire applications - with a strong focus on
building for the enterprise.

Please refer to the [Hoist Core](https://github.com/exhi/hoist-core) repository readme for an
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
[Hoist Core readme](https://github.com/exhi/hoist-core#hoist-usage-licensing-and-support) for
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
[hoist-dev-utils](https://github.com/exhi/hoist-dev-utils/blob/master/configureWebpack.js).

**Font Awesome** provides a greatly extended set of icons via its
[Pro license](https://fontawesome.com/pro), and Hoist React references / relies on several of these
icons. A pro license includes access to a private npm repository to download the extended library,
accessed via a unique URL. ExHI can configure appropriate access via npm configuration files or an
enterprise npm repository proxy.

**HighCharts HighStock** is the primary charting library in Hoist, and offers several [licensing and
support options](https://shop.highsoft.com/highstock) for commercial use. Highcharts does not
require the registration or maintenance of any in-code licence keys.

## ECMAScript 2016+

Hoist React makes full use of the recent additions and improvements to Javascript itself, in the
form of ECMAScript 2016 (ES6/7) and a few more advanced (TC39 stage 2) features.

Key features of modern Javascript used throughout Hoist React include:
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
  [hoist-dev-utils](https://github.com/exhi/hoist-dev-utils/blob/master/configureWebpack.js).

### Promises

🤝 Promises are a core code construct within Hoist React for executing asynchronous operations, and
as such have been extended in a few key ways. See [`Promise.js`](promise/Promise.js) for
documentation comments and implementations of Promise-related utilities and direct extensions to the
Promise prototype, including:

+ `allSettled` - for coordinating multiple promises
+ `catchDefault` - to add standardized exception handling and alerting to a Promise chain, including
  a configurable and end-user-focused error dialog to display an exception message with support for
  disclosing any stack trace and/or reporting user-supplied notes back to the server.
+ `track` - to integrate a Promise-based call with Hoist
  [activity tracking](https://github.com/exhi/hoist-core#activity-tracking-and-client-error-reporting),
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

+ Homepage: https://mobx.js.org/
+ Docs: https://mobx.js.org/refguide/api.html
+ Source: https://github.com/mobxjs/mobx

|      Class/File      |                               Note                                |                 Link                 |
|----------------------|-------------------------------------------------------------------|:------------------------------------:|
| `ReactiveSupport.js` | Mixin to add MobX reactivity to Components, Models, and Services. | [⚛️](core/mixins/ReactiveSupport.js) |

MobX is an essential building block of Hoist React, providing an application state management
solution with "smart' reactivity, tight integration with React Components, and a general API for
reactive programming that extends beyond Components. Please review and familiarize yourself with the
MobX documentation to make the best use of Hoist React.

Within Components, note that Hoist React makes heavy use of MobX as a replacement for React's own
state model and `setState()` method. See
[this post](https://blog.cloudboost.io/3-reasons-why-i-stopped-using-react-setstate-ab73fc67a42e)
for some useful background on the advantages MobX offers when it comes to Component state and
efficient (re)rendering on state changes. MobX's React integration ensures that Components that
access observable properties within their `render()` methods will intelligently re-render when those
properties are changed.

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

## What about JSX?

| Class/File |                        Note                        |        Link        |
|------------|----------------------------------------------------|:------------------:|
| `elem.js`  | Utils for creating elements and element factories. | [⚛️](core/elem.js) |

JSX is the XML-like extension to Javascript typically used to specify and configure React
components. While it's syntax and appearance within otherwise "vanilla" Javascript code might appear
strange to non-React developers, JSX syntax and conventions are a de-factor standard in the React
community, familiar to React developers, and found in all React guides and tutorials.

Hoist React provides an alternative to JSX that allows Components and their hierarchies to be
specified and configured via simple JS factory methods instead of an XML-like markup. When reviewing
the source for Hoist components, the lack of JSX is one of the most immediately visible hallmarks of
the toolkit. While this can appear to be a radical departure from standard React practice, two key
points are worth noting:

* All Hoist components can be created with JSX tags, and developers of Hoist-based applications can
  freely use JSX as much as they wish.
* The factory functions Hoist exports and employs in place of JSX represent a very thin layer over
  the core React API, and do not impose or rely on any special requirements or additional libraries.

`React.createElement()` is the React API's method for configuring and creating Elements from
Components. JSX is pre-processed (via Babel) into calls to to this method, and the popularity of JSX
arises largely from the fact that multiple calls to `createElement()` to setup a tree or collection
of components do not result in easily readable code or a clear sense of the component hierarchy.

Hoist encourages the use of its `elemFactory()` method to create and export a factory method for any
custom Component. These factory methods take a single configuration object to directly specify the
Component's props, as well as an `items` key to specify its children. These configs are and contain
plain-old-Javascript objects and values, without any wrapping braces or additional syntax required.
The factory method created by the framework calls `createElement()` just as transpiled JSX will do.

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

|     Class/File      |                                  Note                                  |             Link             |
|---------------------|------------------------------------------------------------------------|:----------------------------:|
| `HoistModel.js`     | Mixin for adding core Model support.                                   |   [⚛️](core/HoistModel.js)   |
| `HoistComponent.js` | Mixin for adding core Component support.                               | [⚛️](core/HoistComponent.js) |
| `HoistService.js`   | Mixin for adding core Service support.                                 |  [⚛️](core/HoistService.js)  |
| `HoistApp.js`       | Mixin for adding additional support to an App's primary Model class.   |    [⚛️](core/HoistApp.js)    |
| `XH.js`             | Hoist's top-level Model / framework API entry-point, exported as `XH`. |       [⚛️](core/XH.js)       |
| `ClassUtils.js`     | Library methods for providing and extending methods on core classes.   | [⚛️](utils/js/ClassUtils.js) |

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
[`GridModel`](desktop/cmp/grid/GridModel.js) class is a notable example of managing a complex
Component's configuration, state, and API surface via a Model. Hoist's `LeftRightChooser` Component
is managed via its [dedicated Model class](desktop/cmp/leftrightchooser/LeftRightChooserModel.js),
which includes nested GridModels.

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

#### HoistApp

Each client application must define a top-level Model class using
[the specialized `@HoistApp` decorator](core/HoistApp.js). This decorator installs core Model
support as well as several additional methods specific to the high-level lifecycle of the
application, including those dealing with authorization, init, and routing. This class instance is
available via an import of the `XH` (as `XH.app`) and can be a a useful place to hang global state
specific to your application.

Please review the inline documentation on the decorator for additional detailed information on what
it provides and how an Application should provide concrete implementations for certain key methods.
For an example within Hoist React itself, see HoistApp Model for the
[built-in Admin Console](admin/App.js).

#### Model Cleanup and Destruction

The `HoistModel` decorator provides a `destroy()` method hook that should be called when a model is
no longer needed. This lifecyle method ensures that all MobX disposers are called and any event
listeners are cleared, ensuring the model's resources can be properly garbage collected. This is
typically done by passing to model to `XH.safeDestroy()`.

### HoistComponent

Components are the most familiar artifacts in React development, and are likely what come to mind
first when most developers think of React. The `HoistComponent` decorator can (and usually should)
be applied to Component classes to enable MobX reactivity and augment a Component with several
useful convenience methods.

### HoistService

Services within Hoist are singleton classes designed to encapsulate key data access and business
logic, independent of and distinct from any particular UI component. Services can maintain their own
internal state and data structures and expose methods for use by the rest of the application. A
common use for Services is to fetch and post data to the server, potentially transforming,
validating, or defaulting outbound queries and inbound data to provide a local API to application
Model and Component classes that's tailored to their needs.

Service instances persist for the life of the app and have a defined initialization process. By
convention they are stored within an `svc/` package within an app's file structure.

Use the `@HoistService` decorator to mark a class as a service within an application. As with the
other decorators, this installs MobX and Event support and defines an empty `initAsync()` lifecycle
method. This same file exports the `initServicesAsync` method, which can be called during app
initialization within a `HoistApp` to call the `initAsync()` method on services in parallel or in
phased groups. Services will commonly (but not always) load any reference data they need to function
within their init method.

Many core Hoist features are exposed on the client via services such as `PrefService`,
`ConfigService`, and `IdentityService`. See these examples for a better understanding of the kind of
tasks and code patterns commonly used within Service classes.

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

Hoist supports the development of rich, highly functional applications for both traditional desktop
and mobile (phone / tablet) browsers and devices. These platforms have different priorities and
needs when it comes to UI design and interactions, but also share many common needs when it comes to
state management, data models and processing, and other core infrastructure.

The top-level `/desktop/` and `/mobile/` packages contain components and other classes that are
specific to their respective platforms. Wherever possible, however, we have worked to push shareable
Model, Service, and other utility code up into packages common across both.

## Work In Progress

🚧 This readme is currently a work in progress, with several additional sections planned on
application structure/lifecycle, Hoist-provided components, and more. Thanks for your patience as we
continue to build out this documentation.

:mailbox: :phone: :earth_americas: info@xh.io | https://xh.io/contact
Copyright © 2018 Extremely Heavy Industries Inc.
