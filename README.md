# Hoist React

A full-stack UI development framework for enterprise web applications, built on React and MobX.
Developed by [Extremely Heavy](https://xh.io/) as the client-side complement to
[Hoist Core](https://github.com/xh/hoist-core).

## Overview

Hoist is designed as a "full stack" UI development framework, meaning that it has both server and
client components that work together to provide an integrated set of tools and utilities for quickly
constructing sophisticated front-end interfaces — or entire applications — with a strong focus on
building for the enterprise.

Please refer to the [Hoist Core](https://github.com/xh/hoist-core) repository readme for an
overview of Hoist as a whole: its reason for existing, server-side tech stack, general features and
capabilities.

This repository is *hoist-react*, the current reference client-side implementation of Hoist. While
React itself is a remarkably powerful platform on which to build modern web apps, it represents only
a part (however core) of the larger toolset required to create fully functional user interfaces.
Hoist React brings together a curated collection of third-party and custom components, supporting
libraries, utilities, and tooling. This enables truly rapid and ready-to-go development, tightly
integrated Hoist functionality, and a minimal number of upfront per-app decisions — while maintaining
a high degree of flexibility and extensibility for demanding custom use cases.

### AI-Assisted Development

Hoist is designed and documented for AI-assisted development. The framework's strong conventions —
its consistent Model/Component/Service architecture, element factory patterns, and opinionated
approach to state management — constrain the solution space in ways that help AI coding assistants
produce consistent, idiomatic, and maintainable code.

The project maintains extensive, structured documentation optimized for both human developers and AI
agents: a task-oriented [documentation index](docs/README.md), package-level READMEs covering
architecture and usage patterns, and cross-cutting concept docs. AI coding assistants (Claude Code,
Copilot, and similar tools) can consult [AGENTS.md](AGENTS.md) for coding conventions and
[docs/README.md](docs/README.md) for the full documentation catalog.

## Getting Started

Install hoist-react as a dependency:

```bash
npm install @xh/hoist
# or
yarn add @xh/hoist
```

Hoist React requires **React ~18.2** and **React DOM ~18.2** as peer dependencies.

[Toolbox](https://github.com/xh/toolbox) is XH's reference application — it showcases hoist-react
patterns and components and is the best starting point for new developers. See
[docs/development-environment.md](docs/development-environment.md) for full local development setup,
and the [Hoist Core README](https://github.com/xh/hoist-core) for server-side configuration.

## Documentation

Hoist React maintains thorough documentation across package-level READMEs and cross-cutting concept
docs. The primary entry points are:

- [docs/README.md](docs/README.md) — documentation index with a task-oriented quick reference
- [AGENTS.md](AGENTS.md) — AI coding assistant guidance and coding conventions
- [CHANGELOG.md](CHANGELOG.md) — version history and release notes
- [docs/build-and-deploy.md](docs/build-and-deploy.md) — CI/CD configuration and deployment
- [docs/development-environment.md](docs/development-environment.md) — local development setup

## Architecture at a Glance

Hoist applications are built around three core artifact types — **Models**, **Components**, and
**Services** — coordinated by the [`XH`](core/XH.ts) singleton, which provides the top-level
framework API, service access, and common operations.

**Models** (`HoistModel`) are class-based objects that manage state and business logic. Properties
are marked with MobX decorators to make them observable by components and other models. Models form
hierarchies that reflect the structure and concerns of the application, encouraging a clean
separation of logic from presentation. See [/core/README.md](core/README.md).

**Components** are React functional components wrapped via `hoistCmp` with Hoist support for MobX
reactivity and model lookup. Components reference model properties in their render methods and call
model methods in response to user actions, keeping rendering logic thin and declarative. See
[/cmp/README.md](cmp/README.md).

**Services** (`HoistService`) are singletons that encapsulate data access and app-wide business
logic, persisting for the life of the application. They are installed via
`XH.installServicesAsync()` and accessed as e.g. `XH.myCustomService`. See
[/svc/README.md](svc/README.md).

Hoist includes a wide variety of carefully selected and integrated UI components, ready for
immediate use. A central goal of the toolkit is to provide a **managed, normalized, and integrated**
set of patterns, APIs, and behaviors on top of the underlying library components — enabling them to
work together, integrate with core Hoist services, and appear to end-users as a cohesive and highly
polished system.

**Element factories** are Hoist's preferred way to compose component trees using pure
TypeScript/JavaScript, without JSX markup. All Hoist components export a factory alongside the
component itself. JSX is also fully supported and can be used interchangeably — both approaches
compile to `React.createElement()` calls. See [/core/README.md](core/README.md) for full details
on element factories.

**Desktop and mobile** platforms are supported via separate component packages (`/desktop/` and
`/mobile/`), while models, services, and utilities are shared across both. See
[/mobile/README.md](mobile/README.md) for mobile-specific guidance.

## Key Libraries and Dependencies

Hoist React is built on a collection of remarkable third-party libraries that have been selected,
combined, and integrated by XH.

| Library      | Notes                                                                           | Link                                                |
|--------------|---------------------------------------------------------------------------------|-----------------------------------------------------|
| React        | Core technology for efficient componentization and rendering of modern web apps | [reactjs.org](https://react.dev/)                   |
| MobX         | Flexible, well-balanced state management and smart reactivity                   | [mobx.js.org](https://mobx.js.org/)                 |
| Webpack      | Endlessly extensible (if occasionally baffling) bundle and build tool           | [webpack.js.org](https://webpack.js.org/)           |
| ag-Grid      | High performance, feature-rich data grid                                        | [ag-grid.com](https://www.ag-grid.com/)             |
| Blueprint    | General purpose UI toolkit for data-dense desktop webapps                       | [blueprintjs.com](https://blueprintjs.com/)         |
| Highcharts   | Proven, robust, well-rounded charting and visualization library                 | [highcharts.com](https://www.highcharts.com/)       |
| Router5      | Flexible and powerful routing solution                                          | [router5.js.org](https://router5.js.org/)           |
| Font Awesome | Icons, icons, icons                                                             | [fontawesome.com](https://fontawesome.com/)         |

### Library Licensing Considerations

The majority of the libraries listed above and included within Hoist React as dependencies are
open-source and fully free to use. Wherever possible, we have aimed to minimize exposure to
third-party license costs and restrictions. The exceptions to this rule are listed below. For these
libraries, client application(s) using Hoist React must acquire and register appropriate licenses.

**ag-Grid** is released under a dual licensing model, with the community edition available under a
permissive MIT license and the enterprise edition requiring a
[paid license](https://www.ag-grid.com/license-pricing). Applications wishing to use grids in Hoist
React will need to provide a licensed version of ag-Grid. A free community version is available,
however many applications will want to license the enterprise version for important extra
functionality including row grouping and tree grids.

**Font Awesome** provides a greatly extended set of icons via its
[Pro license](https://fontawesome.com/pro), and Hoist React references several of these icons. A
Pro license includes access to a private npm repository to download the extended library, accessed
via a unique URL. XH can configure appropriate access via npm configuration files or an enterprise
npm repository proxy.

**Highcharts HighStock** is the primary charting library in Hoist, and offers several
[licensing and support options](https://shop.highsoft.com/highstock) for commercial use.
Applications wishing to use charts in Hoist will need to provide a licensed version of Highcharts.

## TypeScript and Modern JavaScript

Hoist React and Hoist applications are written in TypeScript. The codebase makes use of experimental
(TC39 Stage 2) decorators via Babel — a notable difference from standard TypeScript decorator
support — as coordinated within a standardized Webpack build process provided by
[hoist-dev-utils](https://github.com/xh/hoist-dev-utils).

Key language features used throughout Hoist React include:

- **Decorators** — a core part of MobX integration and used within Hoist to define observable state,
  managed resources, and other key behaviors. See [/core/README.md](core/README.md) for reference.
- **Classes** — including class fields and carefully considered uses of inheritance.
- **Async/await** — for asynchronous operations, with custom Promise extensions for error handling,
  tracking, and timeouts. See [/promise/README.md](promise/README.md).
- **ES Modules** — all dependencies imported via ES modules and resolved by Webpack.

## Licensing and Support

Hoist is currently developed exclusively by Extremely Heavy and intended for use by XH and our
client partners to develop enterprise web applications with XH's guidance and direction. That said,
we have released the toolkit under the permissive and open Apache 2.0 license. This allows other
developers, regardless of whether they are current XH clients or not, to checkout, use, modify, and
otherwise explore Hoist and its source code. See [LICENSE.md](LICENSE.md) for the full license.

We have selected an open source license as part of our ongoing commitment to openness, transparency,
and ease-of-use, and to clarify and emphasize the suitability of Hoist for use within a wide variety
of enterprise software projects. Note, however, that we cannot at this time commit to any particular
support or contribution model outside of our consulting work. But if you are interested in Hoist
and/or think it might be helpful for a project, please don't hesitate to
[contact us](https://xh.io)!

---

info@xh.io | https://xh.io
Copyright 2026 Extremely Heavy Industries Inc.
