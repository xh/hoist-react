/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

// Load core first, as every app does via its XH import. Hoist's module graph has cycles that only
// resolve in that order - e.g. importing @xh/hoist/format before core fails at load.
import {XH} from '@xh/hoist/core';

import {wait} from '@xh/hoist/promise';
import {Timer} from '@xh/hoist/utils/async';
import {cleanup} from '@testing-library/react';
import {onReactionError, when} from 'mobx';
import {afterAll, beforeAll, beforeEach, vi} from 'vitest';
import {hoistCore, server} from './hoistCore';

/**
 * Global setup for every test file, run by Vitest before each file's tests.
 *
 * Starts the fake hoist-core and installs guards that fail a test for problems that would
 * otherwise pass silently - Hoist catches and logs many errors by design, so a broken code path
 * can still let a test go green.
 */

// React 19 checks this flag to flag state updates that happen outside of `act()`.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// jsdom has no matchMedia, which ThemeModel reads on app init. Report no media query matches.
window.matchMedia ??= (query: string) =>
    ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false
    }) as MediaQueryList;

// jsdom has no Screen Orientation API, which every supported browser has and ViewportSizeModel
// reads. Report a landscape screen.
if (!window.screen.orientation) {
    Object.defineProperty(window.screen, 'orientation', {
        value: {type: 'landscape-primary', angle: 0, addEventListener: () => {}}
    });
}

// Onsen UI, loaded by the mobile platform, throws "Invalid state" at import unless the root
// element's computed style lists a transition property. jsdom lists only the properties set on it.
document.documentElement.style.transitionDuration = '0s';

// Fake timers leave setImmediate alone. undici, which serves Node's fetch(), calls it before it
// reuses an idle keep-alive connection, so faking it stalls the request until the connection
// times out 4s later. Browsers have no setImmediate, so Hoist code never needs it faked. The list
// is Vitest's default without it. setConfig() replaces the whole object, so this also restates
// Vitest's other two defaults. A spec can still pass its own `toFake` to `vi.useFakeTimers()`.
vi.setConfig({
    fakeTimers: {
        toFake: [
            'setTimeout',
            'clearTimeout',
            'setInterval',
            'clearInterval',
            'Date',
            'Temporal',
            'Intl',
            'hrtime',
            'performance',
            'requestAnimationFrame',
            'cancelAnimationFrame',
            'requestIdleCallback',
            'cancelIdleCallback'
        ],
        loopLimit: 10_000,
        shouldClearNativeTimers: true
    }
});

//------------------------------------------------------------------
// Guards - problems are collected as they happen, then fail the
// test when it finishes, with a message naming the cause.
//------------------------------------------------------------------
const problems: string[] = [];

// A request or WebSocket with no handler. Hoist services often catch and log network errors, so a
// failed request alone would not fail the test. Throwing makes MSW fail the request - a callback
// that returns normally lets it through to the real network.
function onUnhandledFrame({frame}: {frame: {data: unknown}}): never {
    const {request, connection} = frame.data as FrameData,
        target = request
            ? `${request.method} ${request.url}`
            : `WebSocket ${connection.client.url}`,
        msg = `Not handled by fake hoist-core: ${target}`;
    problems.push(msg);
    throw new Error(msg);
}

// What an MSW network frame carries - an HTTP request, or a WebSocket connection.
interface FrameData {
    request?: Request;
    connection?: {client: {url: URL}};
}

// An error thrown by a route added with hoistCore.route(). The client sees a 500.
hoistCore.onProblem = msg => problems.push(msg);

// An error thrown inside a MobX reaction or autorun. MobX catches and logs these.
onReactionError(e => problems.push(`Error in MobX reaction: ${e}`));

// A MobX strict-mode warning - Hoist sets `enforceActions: 'observed'`, so this flags observable
// state changed outside an action.
const consoleWarn = console.warn;
console.warn = (...args: any[]) => {
    if (String(args[0]).startsWith('[MobX]')) problems.push(String(args[0]));
    consoleWarn(...args);
};

beforeAll(() => {
    server.listen({onUnhandledFrame});
    hoistCore.trackFetch();
});

beforeEach(({onTestFinished}) => {
    // Routes added from here on - in beforeEach() or in the test - last only for this test.
    hoistCore.startTest();
    // Each test sees only its own requests, not those from boot or from an earlier test.
    hoistCore.clearRequests();
    // Not an afterEach(): Vitest skips the remaining after-hooks once one throws, so an app's
    // failing afterEach() would leak this test's timers, routes and components into the next.
    onTestFinished(endTestAsync);
});

async function endTestAsync() {
    // Unmount anything rendered by React Testing Library - its auto-cleanup needs Vitest globals.
    // Report an unmount error as a problem, so the resets below still run.
    try {
        cleanup();
    } catch (e) {
        problems.push(`Error unmounting rendered components: ${e}`);
    }
    vi.useRealTimers();
    // Let requests the test started without awaiting finish now, before its routes are removed -
    // otherwise they land in the next test's request log. Includes any sent by an unmount above.
    try {
        await hoistCore.settleAsync();
    } catch (e) {
        problems.push(e.message);
    }
    server.resetHandlers();
    hoistCore.endTest();

    if (problems.length) {
        const msg = problems.splice(0).join('\n');
        throw new Error(`Test triggered problems that Hoist would otherwise swallow:\n${msg}`);
    }
}

// XH builds its AppContainerModel on load, and the model's ViewportSizeModel measures the window
// on debounced timers of up to 300ms. Let those run before Vitest tears down jsdom at the end of a
// file - firing afterwards, with no `window`, they would throw. Costs nothing for files that run
// longer than that, which is most of them. The wait is capped because a test that switches to fake
// timers early can stall those timers for good - and then nothing is left to fire.
const viewportSettled = when(() => !!XH.appContainerModel.viewportSizeModel.size).then(() =>
    wait(400)
);

afterAll(async () => {
    await Promise.race([viewportSettled, wait(1000)]);
    Timer.cancelAll();
    server.close();
});
