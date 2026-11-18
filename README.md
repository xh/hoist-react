# Hoist React

[![Unit Tests](https://github.com/xh/hoist-react/actions/workflows/unit-tests.yml/badge.svg?branch=develop)](https://github.com/xh/hoist-react/actions/workflows/unit-tests.yml?query=branch%3Adevelop)

A full-stack UI development framework for enterprise web applications, built on React and MobX.
Developed by [Extremely Heavy](https://xh.io/) as the client-side complement to
[Hoist Core](https://github.com/xh/hoist-core).

## Overview

Hoist is a "full stack" UI development framework. It has server and client components that work
together. They provide an integrated set of tools and utilities to build sophisticated front-end
interfaces, or entire applications, quickly. Hoist focuses on building for the enterprise.

For an overview of Hoist as a whole, read the [Hoist Core](https://github.com/xh/hoist-core)
README. It covers why Hoist exists, its server-side tech stack, and its general features and
capabilities.

This repository is *hoist-react*, the current reference client-side implementation of Hoist. React
is a strong platform on which to build modern web apps. It is a core part of the toolset that fully
functional user interfaces need, but it is only one part. Hoist React brings together a curated set
of third-party and custom components, supporting libraries, utilities, and tooling. The result is
rapid, ready-to-go development, tightly integrated functionality, and few upfront decisions
per app. Hoist React also keeps a high degree of flexibility and extensibility for demanding custom
use cases.

### AI-Assisted Development

We design and document Hoist for AI-assisted development. Hoist has strong conventions: a
consistent Model/Component/Service architecture, element factory patterns, and an opinionated
approach to state management. These conventions constrain the solution space, which helps AI coding
assistants produce consistent, idiomatic, and maintainable code.

The documentation is structured for both human developers and AI agents. See
[Documentation](#documentation) for the entry points. AI coding assistants, such as Claude Code and
Copilot, can read [AGENTS.md](AGENTS.md) for coding conventions.

## Getting Started

Install hoist-react as a dependency:

```bash
pnpm add @xh/hoist
# or
npm install @xh/hoist
# or
yarn add @xh/hoist
```

Hoist React requires **React ^19.3** and **React DOM ^19.3** as peer dependencies.

[Toolbox](https://github.com/xh/toolbox) is XH's reference application. It showcases hoist-react
patterns and components, and it is the best starting point for new developers. See
[docs/development-environment.md](docs/development-environment.md) for full local development setup,
and the [Hoist Core README](https://github.com/xh/hoist-core) for server-side configuration.

This repo uses [pnpm](https://pnpm.io). To develop hoist-react locally, run `pnpm install` to
install its dependencies. The `packageManager` field in `package.json` pins the required pnpm
version. You can let [corepack](https://nodejs.org/api/corepack.html) provide that version
automatically (`corepack enable pnpm`), or use a standalone pnpm install of v10+. Applications
consuming the published `@xh/hoist` package are free to use pnpm, yarn, or npm.

## Documentation

Hoist React has package-level READMEs on architecture and usage patterns, plus cross-cutting
concept docs. The primary entry points are:

- [docs/README.md](docs/README.md) - documentation index with a task-oriented quick reference
- [AGENTS.md](AGENTS.md) - AI coding assistant guidance and coding conventions
- [CHANGELOG.md](CHANGELOG.md) - version history and release notes
- [docs/build-and-publish.md](docs/build-and-publish.md) - GitHub Actions CI/CD for hoist-react
- [docs/build-and-deploy-app.md](docs/build-and-deploy-app.md) - building and deploying Hoist applications
- [docs/development-environment.md](docs/development-environment.md) - local development setup
- [docs/unit-testing.md](docs/unit-testing.md) - the unit test suite, and how to write tests

## Architecture at a Glance

Hoist applications have three core artifact types: **Models**, **Components**, and **Services**.
The [`XH`](core/XH.ts) singleton coordinates them and provides the top-level framework API, service
access, and common operations.

**Models** (`HoistModel`) are class-based objects that manage state and business logic. MobX
decorators mark their properties as observable by components and other models. Models form
hierarchies that reflect the structure and concerns of the application. This encourages a clean
split between logic and presentation. See [/core/README.md](core/README.md).

**Components** are React functional components wrapped via `hoistCmp` with Hoist support for MobX
reactivity and model lookup. Components reference model properties in their render methods and call
model methods in response to user actions, keeping rendering logic thin and declarative. See
[/cmp/README.md](cmp/README.md).

**Services** (`HoistService`) are singletons that encapsulate data access and app-wide business
logic, persisting for the life of the application. An app installs services with
`XH.installServicesAsync()`. It then accesses them on `XH`, for example `XH.myCustomService`. See
[/svc/README.md](svc/README.md).

Hoist includes a wide variety of carefully selected and integrated UI components, ready for
immediate use. A central goal of the toolkit is a **managed, normalized, and integrated** set of
patterns, APIs, and behaviors on top of the underlying library components. That layer lets the
components work together and integrate with core Hoist services. To end users, they appear as one
cohesive and highly polished system.

**Element factories** are Hoist's preferred way to compose component trees using pure
TypeScript/JavaScript, without JSX markup. All Hoist components export a factory alongside the
component itself. Hoist also fully supports JSX, and you can use the two interchangeably. Both
compile to `React.createElement()` calls. See [/core/README.md](core/README.md) for full details
on element factories.

**Desktop and mobile** platforms have separate component packages (`/desktop/` and `/mobile/`).
Both share the same models, services, and utilities. See [/mobile/README.md](mobile/README.md) for
mobile-specific guidance.

## Key Libraries and Dependencies

Hoist React builds on a set of third-party libraries that XH selected, combined, and integrated.

| Library      | Notes                                                                           | Link                                                |
|--------------|---------------------------------------------------------------------------------|-----------------------------------------------------|
| React        | Core technology for efficient componentization and rendering of modern web apps | [react.dev](https://react.dev/)                     |
| MobX         | Flexible, well-balanced state management and smart reactivity                   | [mobx.js.org](https://mobx.js.org/)                 |
| Rsbuild      | Fast Rspack-based bundler and dev server, with SWC for transpilation            | [rsbuild.rs](https://rsbuild.rs/)                   |
| AG Grid      | High performance, feature-rich data grid                                        | [ag-grid.com](https://www.ag-grid.com/)             |
| Blueprint    | General purpose UI toolkit for data-dense desktop webapps                       | [blueprintjs.com](https://blueprintjs.com/)         |
| Highcharts   | Proven, well-rounded charting and visualization library                         | [highcharts.com](https://www.highcharts.com/)       |
| RGL          | Drag-and-drop grid layout for DashCanvas dashboards                             | [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout) |
| Router5      | Flexible routing solution                                                       | [router5.js.org](https://router5.js.org/)           |
| Font Awesome | Icons, icons, icons                                                             | [fontawesome.com](https://fontawesome.com/)         |

### Library Licensing Considerations

The majority of the libraries listed above and included within Hoist React as dependencies are
open-source and fully free to use. Wherever possible, we aim to minimize exposure to third-party
license costs and restrictions. The sections below list the exceptions to this rule. For these
libraries, client application(s) using Hoist React must buy and register appropriate licenses.

**AG Grid** uses a dual licensing model. The free community edition has a permissive MIT license,
and the enterprise edition requires a [paid license](https://www.ag-grid.com/license-pricing).
Applications wishing to use grids in Hoist React will need to provide a licensed version of AG Grid.
Many applications will want to license the enterprise version for important extra functionality,
including row grouping and tree grids.

**Font Awesome** provides a greatly extended set of icons via its
[Pro license](https://fontawesome.com/pro), and Hoist React references several of these icons. A
Pro license includes access to a private npm repository to download the extended library, accessed
via a unique URL. XH can configure appropriate access via npm configuration files or an enterprise
npm repository proxy.

**Highcharts HighStock** is the primary charting library in Hoist, and offers several
[licensing and support options](https://shop.highsoft.com/highstock) for commercial use.
Applications wishing to use charts in Hoist will need to provide a licensed version of Highcharts.

## TypeScript and Modern JavaScript

Hoist React and Hoist applications are written in TypeScript. The codebase uses TC39 Stage 3
(`2023-11`) decorators, with TypeScript's `experimentalDecorators` flag off. SWC transpiles them
within a standardized Rsbuild build process provided by
[hoist-dev-utils](https://github.com/xh/hoist-dev-utils).

Key language features used throughout Hoist React include:

- **Decorators** - a core part of MobX integration and used within Hoist to define observable state,
  managed resources, and other key behaviors. See [/core/README.md](core/README.md) for reference.
- **Classes** - including class fields and carefully considered uses of inheritance.
- **Async/await** - for asynchronous operations, with custom Promise extensions for error handling,
  tracking, and timeouts. See [/promise/README.md](promise/README.md).
- **ES Modules** - all dependencies imported via ES modules and resolved by Rsbuild.

## Testing

Hoist React has a suite of unit tests, run with `pnpm test` on [Vitest](https://vitest.dev). The
tests compile the library with the same SWC decorator settings that apps use. They run Hoist's real
services against an in-memory fake of the hoist-core server. CI runs them on every pull request.
See [docs/unit-testing.md](docs/unit-testing.md).

## Licensing and Support

Currently, only Extremely Heavy develops Hoist. We intend it for XH and our client partners, to
build enterprise web applications with XH's guidance and direction. That said, we released the
toolkit under the permissive and open Apache 2.0 license. Any developer, XH client or not, can check
out, use, modify, and otherwise explore Hoist and its source code. See [LICENSE.md](LICENSE.md) for
the full license.

We chose an open source license as part of our ongoing commitment to openness, transparency, and
ease of use. It also clarifies and emphasizes that Hoist is suitable for a wide variety of
enterprise software projects. Note that, at this time, we cannot commit to any particular support or
contribution model outside of our consulting work. But if you are interested in Hoist, or think it
might help a project, please [contact us](https://xh.io)!

---

info@xh.io | https://xh.io
Copyright 2026 Extremely Heavy Industries Inc.
