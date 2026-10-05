/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

// Load core first, as every app does via its XH import. Hoist's module graph has cycles that only
// resolve in that order - e.g. importing @xh/hoist/format before core fails at load.
import '@xh/hoist/core';

import {Timer} from '@xh/hoist/utils/async';
import {cleanup} from '@testing-library/react';
import {onReactionError} from 'mobx';
import {afterAll, afterEach, beforeAll, vi} from 'vitest';
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

//------------------------------------------------------------------
// Guards - problems are collected as they happen, then fail the
// running test from afterEach() with a message naming the cause.
//------------------------------------------------------------------
const problems: string[] = [];

// A request with no handler. MSW fails the request, but Hoist services often catch and log
// network errors, so this alone would not fail the test.
server.events.on('request:unhandled', ({request}) => {
    problems.push(`Request not handled by fake hoist-core: ${request.method} ${request.url}`);
});

// An error thrown inside a MobX reaction or autorun. MobX catches and logs these.
onReactionError(e => problems.push(`Error in MobX reaction: ${e}`));

// A MobX strict-mode warning - Hoist sets `enforceActions: 'observed'`, so this flags observable
// state changed outside an action.
const consoleWarn = console.warn;
console.warn = (...args: any[]) => {
    if (String(args[0]).startsWith('[MobX]')) problems.push(String(args[0]));
    consoleWarn(...args);
};

beforeAll(() => server.listen({onUnhandledRequest: 'error'}));

afterEach(() => {
    // Unmount anything rendered by React Testing Library - its auto-cleanup needs Vitest globals.
    cleanup();
    vi.useRealTimers();
    server.resetHandlers();
    hoistCore.clearRequests();

    if (problems.length) {
        const msg = problems.splice(0).join('\n');
        throw new Error(`Test triggered problems that Hoist would otherwise swallow:\n${msg}`);
    }
});

afterAll(() => {
    Timer.cancelAll();
    server.close();
});
