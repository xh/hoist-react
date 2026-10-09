# Unit Testing

Hoist React has a suite of unit tests that run on [Vitest](https://vitest.dev). They cover the
library's models, data layer, formatters, utilities, and services, and they run on every pull
request. This document explains how the tests work, how to run them, and how to write new ones.
Apps write unit tests in the same style with the `@xh/hoist/test-support` kit - see
[Unit Tests in an App](#unit-tests-in-an-app).

Unit tests complement end-to-end tests. Playwright tests drive a real app in a real browser
against a real server. Unit tests run in milliseconds against one class or function. They pin
down contracts that apps rely on, such as how `Store` reuses records or how `FetchService` decodes
a server error.

## Running Tests

```bash
pnpm test                         # Run all tests once
pnpm test:watch                   # Re-run affected tests as files change
pnpm test:ui                      # Browse and run tests in the Vitest UI
pnpm test data/Store              # Run spec files whose path contains "data/Store"
pnpm test -t "reuses records"     # Run tests whose name contains "reuses records"
```

IntelliJ runs and debugs Vitest tests natively. Use the gutter icon next to any `describe` or `it`.

## How It Works

### Same compiler as apps

Apps compile hoist-react from source with Rsbuild and SWC, using TC39 `2023-11` decorators. The
tests compile it the same way: `vitest.config.mts` is built on `configureVitest()` from
hoist-dev-utils, the preset that app test suites use. It compiles with the SWC inside Rspack and the
same settings as `configureRsbuild()`. Decorators like `@bindable` and `@managed` therefore behave
in tests exactly as they do in apps.

The config passes `selfHost: true`, which points `@xh/hoist` at this repo. This suite thus checks
the preset on every PR. To try a preset change before it is published, run
`pnpm link ../hoist-dev-utils`, then `pnpm test`.

This is load-bearing. Vite's built-in transform cannot compile decorators at all, so a test that
loads a decorated class fails without the preset's SWC plugin.

### A real Hoist environment

Tests run in [jsdom](https://github.com/jsdom/jsdom), which gives them `window`, `document`, and
`localStorage`. Every test file loads the real `@xh/hoist/core` module graph, including the `XH`
singleton. Nothing in Hoist is mocked at the module level.

Each test file works like one page load. Vitest gives each file a fresh module graph, so each file
gets its own `XH` and its own fake hoist-core. No state leaks from one file to another.

The tests in one file share both. If one test saves a pref or sets a role on `hoistCore`, the next
test still sees it. Undo the change in the test that made it, or move the test to its own file.
Between tests, the setup resets only the request log and the routes a test added.

### A fake hoist-core

Most of Hoist depends on the hoist-core server. `Store` reads a soft config, `GridModel` persists
to user prefs, and nearly every service loads data on init. Tests therefore need a server.

`test-support/hoistCore.ts` provides one. It is a small, in-memory stand-in for hoist-core's
`XhController` endpoints: auth status, environment, configs, prefs, and activity tracking. It
answers in the exact JSON shapes hoist-core renders, and names the server source of each shape.
Hoist's real `fetch` calls reach it through [MSW](https://mswjs.io), so the code under test runs
unchanged, from `FetchService` down.

`initTestAppAsync()` boots a headless app against the fake. It runs the real
`AppContainerModel.initAsync()`, the same sequence a browser runs on page load. It authenticates,
installs every Hoist service, loads configs and prefs, and inits the app model. Nothing is
rendered.

### Guards against silent failures

Hoist catches and logs many errors by design, so a broken code path can still let a test pass.
The global setup in `test-support/setup.ts` fails a test that triggers any of these:

- A server request or WebSocket the fake does not handle. MSW fails it, so it never reaches a real
  server.
- An error thrown inside a MobX reaction or autorun.
- A MobX strict-mode warning, which means observable state changed outside an action.

## Writing Tests

### Placement and naming

Put a spec next to the code it tests, named after it: `data/Store.spec.ts` tests `data/Store.ts`.
Split a large subject by concern, e.g. `data/StoreValidation.spec.ts`. Specs are excluded from
the published package, and from the MCP symbol index.

Name `describe` blocks after the class or function, then the method or feature. Name each test
for the behavior it checks, in the present tense. The test list should read as a spec of what
Hoist guarantees:

```typescript
describe('Store', () => {
    describe('loadData', () => {
        it('reuses record instances for unchanged rows', () => { /* ... */ });
        it('replaces records whose data changed', () => { /* ... */ });
    });
});
```

Start each spec file with a short comment that states what it protects and why it matters. When a
test guards against a past bug, say so in a one-line comment with the version or commit.

### What to test

Test the behavior apps rely on, through the public API:

- Contracts that many apps depend on, like `Store` record reuse or `FetchService` error decoding.
- Intricate logic, like `Cube` incremental updates or `LocalDate` calendar math.
- Anything that has broken before. A past regression is the best reason for a test.

Do not test:

- Rendering, layout, and styling. jsdom has no layout engine. Leave these to Playwright.
- Third-party libraries such as AG Grid, Blueprint, or numbro.
- Trivial getters, or values that only restate the code.
- Private implementation details. If a test breaks when the code is refactored with no change in
  behavior, it is testing the wrong thing.

Prefer real objects over mocks. Build a real `Store` with real records, run a real service against
the fake server. Spy on `XH` methods only where they reach UI, e.g. `XH.toast()`.

Keep test data inline and small, so each test reads on its own. Use `it.each` tables for
formatters and parsers, where each row is a meaningful case rather than a random input.

### Tests that need the server

Boot the test app once per file. Adjust `hoistCore` state first to boot against other data:

```typescript
import {XH} from '@xh/hoist/core';
import {hoistCore, hoistError, initTestAppAsync, server, xhUrl} from '@xh/hoist/test-support';
import {http} from 'msw';
import {beforeAll, describe, expect, it} from 'vitest';

describe('PrefService', () => {
    beforeAll(async () => {
        hoistCore.prefs.pageSize = {type: 'int', defaultValue: 50, value: 100};
        await initTestAppAsync();
    });

    it('sends changed prefs to the server as JSON', async () => {
        XH.setPref('pageSize', 200);
        await XH.prefService.pushPendingAsync();

        const [req] = hoistCore.requestsTo('xh/setPrefs');
        expect(req.json).toMatchObject({pageSize: 200});
        expect(req.query.clientUsername).toBe('jdoe');
    });

    it('rejects when the server reports a session mismatch', async () => {
        server.use(
            http.post(xhUrl('xh/setPrefs'), () =>
                hoistError(400, {name: 'SessionMismatchException', isRoutine: true})
            )
        );
        // ...
    });
});
```

- `hoistCore.requestsTo(path)` returns the requests the fake served, parsed into `query`, `form`,
  `json`, and `headers`. The setup clears the log before each test, so a test sees only its own
  requests.
- `hoistCore.route()` serves an endpoint the fake lacks, or overrides one - see
  [The app's server state](#the-apps-server-state).
- `server.use()` adds raw MSW handlers for one test. They are removed after the test.
- `await hoistCore.settleAsync()` waits until the fake has answered every open request, and the
  client has handled the answers. See
  [Requests a test did not await](#requests-a-test-did-not-await).
- `hoistError(status, {...})` renders an error as hoist-core does. `authFailure(status)` renders
  the empty-bodied rejection that hoist-core's auth filter sends. `noContent()` renders the empty
  204 that hoist-core sends for an endpoint with no result.
- A file boots once. To test a different boot outcome, such as access denied, use a separate spec
  file. `initTestAppAsync()` rejects, naming `XH.appState`, if boot stops before `RUNNING`. That
  includes `LOGIN_REQUIRED`, where an app with a login form waits for the user to sign in.

Tests that do not touch services, such as `LocalDate` or filter tests, do not need to boot.

### Requests a test did not await

Models often start a request without returning its promise, such as a save from a timer or from
`destroy()`. Call `hoistCore.settleAsync()` before you assert on that request:

```typescript
it('saves the draft when destroyed', async () => {
    model.destroy(); // posts the draft, without returning the promise
    await hoistCore.settleAsync();

    const [req] = hoistCore.requestsTo('drafts');
    expect(req.json).toEqual({text: 'Hello'});
});
```

A request counts as open from the client's `fetch()` call until its response arrives. The setup
also waits when each test ends, so such a request cannot land in the next test's log. A response
that never arrives fails the test after 2s, and the failure names the request.

`settleAsync()` does not wait for a request that has not started yet. A request sent after a
debounce or timer, such as a `@persist` write or a `PrefService` push, starts only when that timer
fires. Wait out or advance the timer first.

### Models and MobX

- MobX reactions run synchronously when an action ends. Assert right after the change.
- Change observable state in an action, through a `@bindable` setter, or with `runInAction`.
- Destroy models the test creates, e.g. with `onTestFinished(() => model.destroy())`.
- Some Hoist state settles on a later tick, e.g. `GridFilterModel.setFilter()`. Await the task or
  `wait()` before asserting.
- Assign a `@bindable` field directly, as in `model.comment = 'x'`. Its generated setter, such as
  `setComment()`, exists at runtime but has no type, so `tsc` rejects a call to it.
- A `@persist` field writes its state 250ms after a change. A value equal to its default clears the
  saved entry, so the saved state leaves it out. For a pref, `await wait(300)`, then
  `await XH.prefService.pushPendingAsync()` before asserting on the request.
- `GridModel` calls that need a rendered grid, such as `preSelectFirstAsync()`, wait 3s for one in a
  model test and then do nothing. Leave grid selection out of model specs.

### Timers

Use Vitest fake timers for debounces, delays, and dates. Advance with the async variants, which
let pending promises resolve between timers:

```typescript
vi.useFakeTimers();
model.setQuery('abc');
await vi.advanceTimersByTimeAsync(300);
```

- Never call `vi.runAllTimers()`. Hoist's `Timer` heartbeat never ends.
- When you expect a timer-driven rejection, attach the assertion before advancing time.
- Use `vi.setSystemTime()` for code that reads the current date.
- Requests to the fake hoist-core run normally under fake timers. The kit sends each request on
  its own connection, so no request waits on a timer that the test has frozen.

The setup restores real timers after every test. All tests run in the `America/New_York` time
zone, so date logic gives the same result on every machine.

### Components

Most of Hoist's value is in models, so most tests should be model tests. Component tests are for
the contracts of the component layer itself, such as how `hoistCmp` factories pass `items` and
resolve models. Use [React Testing Library](https://testing-library.com/react). The setup unmounts
rendered components after each test.

### When a test finds a bug

Write the test for the correct behavior. If the fix belongs in a separate change, mark the test
`it.fails()` and add a `// BUG:` comment that describes the problem. The suite stays green, and the
test starts failing once the bug is fixed, as a reminder to remove the marker.

### Desktop and mobile

A module graph can load the desktop or the mobile platform, not both. `initTestAppAsync()` boots a
desktop app by default. Pass `{isMobileApp: true}` to boot a mobile app, in a spec file of its own.

## Unit Tests in an App

Apps use the same kit as hoist-react: the fake hoist-core, `initTestAppAsync()`, and the guards
above. The [Writing Tests](#writing-tests) guidance applies to app specs too. App tests need
hoist-react 89 and hoist-dev-utils 16.1 - see [Version Compatibility](./version-compatibility.md).

### Setup

1. Add the test runners as devDependencies, for example with pnpm:

    ```bash
    pnpm add -D vitest jsdom msw @testing-library/react @testing-library/dom
    ```

    Take the latest versions that fit the optional peer ranges in the `package.json` of
    `@xh/hoist`. pnpm warns about any version outside those ranges, and `configureVitest()` fails
    the run on a Vitest major outside its range. If a newer major is out, add the major that
    `@xh/hoist` supports, for example `vitest@^N`.

2. Add scripts to the app's `package.json`:

    ```json
    "scripts": {
        "test": "vitest run",
        "test:watch": "vitest"
    }
    ```

3. Add `vitest.config.mts` beside `rsbuild.config.mjs`:

    ```typescript
    import configureVitest from '@xh/hoist-dev-utils/configureVitest';
    import {defineConfig} from 'vitest/config';

    export default defineConfig(configureVitest({appCode: 'myApp'}));
    ```

4. Write each spec beside the code it tests, as `Foo.spec.ts` for `Foo.ts`, and run `pnpm test`.

`configureVitest()` compiles specs with the same SWC settings and build constants as the app
build, and loads the kit's setup file. The hoist-dev-utils README lists its options, including a
mode that runs specs against a local hoist-react checkout. React Testing Library is required even
if no spec renders, because the kit's setup unmounts rendered components after each test.

### The app's server state

The fake serves Hoist's own endpoints, with hoist-core's default configs and prefs. It knows
nothing about the app. `XH.getConf()` and `XH.getPref()` throw on an unknown key unless the call
passes a default, so seed each config and pref that the code under test reads. Seed them before
boot, because the client reads them once, at boot.

Seed a pref with its `type` and `defaultValue`. Add `value` only for a user who has set their own.
The fake reports `isSet` to the client from whether `value` is there.

App services load from app endpoints. Serve each one with `hoistCore.route(method, path, fn)`,
where `path` is relative to `XH.baseUrl`, as in `XH.fetchJson()`. The function returns the
response body, a `Response` such as `hoistError(...)`, or nothing for an empty 204.

```typescript
import {type InitContext, XH} from '@xh/hoist/core';
import {hoistCore, initTestAppAsync, TestAppModel} from '@xh/hoist/test-support';
import {beforeAll, it} from 'vitest';
import {OrderService} from './OrderService';

// Installs the services under test, as the app's AppModel would.
class OrdersTestModel extends TestAppModel {
    override async initAsync(ctx: InitContext) {
        await XH.installServicesAsync(OrderService, ctx);
    }
}

beforeAll(async () => {
    hoistCore.configs.orderLimit = 1000;
    hoistCore.prefs.orderView = {type: 'json', defaultValue: {}};
    hoistCore.roles = ['ORDER_ADMIN'];
    hoistCore.user = {...hoistCore.user, region: 'EMEA'}; // a custom HoistUser field
    hoistCore.route('GET', 'orders', () => [{id: 1, qty: 500}]);
    hoistCore.route('POST', 'orders/:id/approve', req => ({id: req.params.id, approved: true}));
    await initTestAppAsync({modelClass: OrdersTestModel});
});

it('flags orders over the configured limit', () => {
    // ...
});
```

- A route added in `beforeAll()` or a setup file lasts for the rest of the file. A route added in
  `beforeEach()` or in a test lasts for that test, so a test can override a file's route.
- `hoistCore.requestsTo('orders/7/approve')` returns the requests a route served.
- `XH.fetchJson()` with `params` and no `method` sends a form-encoded POST, not a GET. Serve it with
  `route('POST', ...)` and read the params from `req.form`, not `req.query`.
- A path can also be an absolute URL, for an external API the app calls.
- A request that the fake does not serve fails the test, and the failure names the URL.
- A file boots once, so test each role set or user in its own spec file.
- The fake returns canned data. It does not enforce the server's business rules or role scoping.
  Test those against a real server.

### What to test in an app

Test the app's own logic: model rules, derived state, data transforms, calculations, validation,
and the requests its services send. Leave Hoist itself, rendering, and layout out of app specs.
Do not import `Bootstrap.ts` or the entry points in `src/apps/` from a spec, because they register
libraries and render the app when they load.

Add `pnpm test` to the app's CI after its type check. Add it to snapshot and release builds too,
so a failing suite blocks the publish.

## Test Reports

`pnpm test:report` runs the suite and writes a report of the run to `.vitest/report/`:

- `index.html` - every test, grouped by package, file, and `describe` block, with failures first.
  It is a single self-contained file. Open it straight from disk.
- `summary.md` - the same report as Markdown. CI shows it on the run page.
- `comment.md` - a compact version that CI posts to pull requests.

Tests marked `it.fails()` appear in the reports as known bugs, so they stay visible until fixed.

## Continuous Integration

The Unit Tests workflow (`.github/workflows/unit-tests.yml`) runs the suite on every pull request
and push to `develop`. Snapshot and release deploys also run the tests, and a failure blocks the
publish. The results show up in several places:

- **The PR checks list.** The "Unit Tests" check links to its run.
- **The run page.** Its summary lists every test by package, with failures and diffs first.
- **The PR diff.** Each failing assertion is annotated on the line where it failed.
- **The PR conversation.** A single comment shows the current result, updated on each push.
- **The `unit-test-report` artifact.** The HTML report, attached to every run.

To run the workflow on a branch without opening a PR:

```bash
gh workflow run unit-tests.yml --ref my-branch
```

Some steps need one-time repo settings:

- **Require passing tests to merge.** In the branch protection rule for `develop`, add the "Vitest"
  check as a required status check.
- **Publish a live report.** Enable GitHub Pages with "GitHub Actions" as its source, and set the
  repo variable `PUBLISH_TEST_REPORT` to `true`. Each push to `develop` then publishes the HTML
  report to the repo's Pages site.

## Working With AI Agents

Coding agents follow the same workflow as developers. `CLAUDE.md` points agents to this document
and asks them to add or update tests alongside library changes.

- **Locally**, an agent runs `pnpm test` and reads the failures from its output. Each failure
  includes the assertion diff and the line in the spec.
- **On a PR**, an agent checks status with `gh pr checks`, and reads the failing output with
  `gh run view <run-id> --log-failed`. The PR comment and run summary give the same detail in
  Markdown.
- **The `@claude` GitHub integration** can read check results on a PR. It does not install
  dependencies, so it relies on the CI run after it pushes a fix.
