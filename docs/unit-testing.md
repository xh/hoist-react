# Unit Testing

Hoist React has a suite of unit tests that run on [Vitest](https://vitest.dev). They cover the
library's models, data layer, formatters, utilities, and services, and they run on every pull
request. This document explains how the tests work, how to run them, and how to write new ones.

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
tests compile it the same way: `vitest.config.mts` runs SWC with the options that
`configureRsbuild()` in hoist-dev-utils passes to Rsbuild. Decorators like `@bindable` and
`@managed` therefore behave in tests exactly as they do in apps.

This is load-bearing. Vite's built-in transform cannot compile decorators at all. Removing the SWC
plugin breaks every test that loads a decorated class.

### A real Hoist environment

Tests run in [jsdom](https://github.com/jsdom/jsdom), which gives them `window`, `document`, and
`localStorage`. Every test file loads the real `@xh/hoist/core` module graph, including the `XH`
singleton. Nothing in Hoist is mocked at the module level.

Vitest gives each test file a fresh module graph. Tests in one file share one `XH`, but no state
leaks from one file to another.

### A fake hoist-core

Most of Hoist depends on the hoist-core server. `Store` reads a soft config, `GridModel` persists
to user prefs, and nearly every service loads data on init. Tests therefore need a server.

`test/hoistCore.ts` provides one. It is a small, in-memory stand-in for hoist-core's `XhController`
endpoints: auth status, environment, configs, prefs, and activity tracking. It answers in the
exact JSON shapes hoist-core renders, and names the server source of each shape. Hoist's real
`fetch` calls reach it through [MSW](https://mswjs.io), so the code under test runs unchanged,
from `FetchService` down.

`initTestAppAsync()` boots a headless app against the fake. It runs the real
`AppContainerModel.initAsync()`, the same sequence a browser runs on page load. It authenticates,
installs every Hoist service, loads configs and prefs, and inits the app model. Nothing is
rendered.

### Guards against silent failures

Hoist catches and logs many errors by design, so a broken code path can still let a test pass.
The global setup in `test/setup.ts` fails a test that triggers any of these:

- A server request the fake does not handle.
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
import {hoistCore, hoistError, initTestAppAsync, server, xhUrl} from '@xh/hoist/test';
import {http} from 'msw';
import {beforeAll, describe, expect, it} from 'vitest';

describe('PrefService', () => {
    beforeAll(async () => {
        hoistCore.prefs.pageSize = {type: 'int', value: 100, defaultValue: 50, isSet: true};
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
  `json`, and `headers`. The log is cleared after each test.
- `server.use()` adds handlers for one test. They are removed after the test.
- `hoistError(status, {...})` renders an error as hoist-core does. `authFailure(status)` renders
  the empty-bodied rejection that hoist-core's auth filter sends.
- A file boots once. To test a different boot outcome, such as access denied, use a separate spec
  file.

Tests that do not touch services, such as `LocalDate` or filter tests, do not need to boot.

### Models and MobX

- MobX reactions run synchronously when an action ends. Assert right after the change.
- Change observable state in an action, through a `@bindable` setter, or with `runInAction`.
- Destroy models the test creates, e.g. with `onTestFinished(() => model.destroy())`.
- Some Hoist state settles on a later tick, e.g. `GridFilterModel.setFilter()`. Await the task or
  `wait()` before asserting.

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
