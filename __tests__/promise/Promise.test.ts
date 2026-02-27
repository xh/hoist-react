// Mock @xh/hoist/core to prevent the XH singleton cascade.
// Only TaskObserver and XH are used as runtime values in Promise.ts.
jest.mock('@xh/hoist/core', () => ({
    XH: {},
    TaskObserver: class {
        static forPromise() {
            return {};
        }
        linkTo() {}
    }
}));
// action is used in thenAction — identity function keeps behaviour correct for tests.
jest.mock('@xh/hoist/mobx', () => ({
    action: (fn: Function) => fn
}));

import {never, resolve, wait, waitFor} from '@xh/hoist/promise/Promise';

describe('resolve', () => {
    it('returns a promise that resolves immediately', async () => {
        await expect(resolve(42)).resolves.toBe(42);
    });

    it('resolves to undefined when no value is passed', async () => {
        await expect(resolve()).resolves.toBeUndefined();
    });
});

describe('never', () => {
    it('returns a promise that stays pending', async () => {
        let settled = false;
        never().then(() => (settled = true));
        // Flush microtask queue — promise should still be pending.
        await Promise.resolve();
        expect(settled).toBe(false);
    });
});

describe('wait', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('resolves after the specified interval', async () => {
        const p = wait(1000);
        jest.advanceTimersByTime(1000);
        await expect(p).resolves.toBeUndefined();
    });

    it('does not resolve before the interval has elapsed', async () => {
        let resolved = false;
        wait(1000).then(() => (resolved = true));
        jest.advanceTimersByTime(500);
        await Promise.resolve(); // flush microtasks
        expect(resolved).toBe(false);
    });

    it('resolves immediately with a 0ms interval', async () => {
        const p = wait(0);
        jest.runAllTimers();
        await expect(p).resolves.toBeUndefined();
    });
});

describe('waitFor', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('resolves immediately when the condition is already true', async () => {
        const p = waitFor(() => true, {interval: 50, timeout: 1000});
        await expect(p).resolves.toBeUndefined();
    });

    it('resolves once the condition becomes true', async () => {
        let ready = false;
        const p = waitFor(() => ready, {interval: 50, timeout: 1000});
        ready = true;
        jest.advanceTimersByTime(50);
        await expect(p).resolves.toBeUndefined();
    });

    it('rejects when the condition is never met within the timeout', async () => {
        const p = waitFor(() => false, {interval: 50, timeout: 200});
        jest.advanceTimersByTime(300);
        await expect(p).rejects.toThrow();
    });

    it('throws synchronously for invalid interval or timeout', () => {
        expect(() => waitFor(() => true, {interval: 0})).toThrow('Invalid interval');
        expect(() => waitFor(() => true, {interval: 50, timeout: 0})).toThrow('Invalid timeout');
    });
});
