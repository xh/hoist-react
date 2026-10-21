/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {hoistCore, hoistError, initTestAppAsync, TestAppModel} from '@xh/hoist/test-support';
import {beforeAll, beforeEach, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * `hoistCore.route()` serves an app's own endpoints in its specs. Apps register routes once per
 * file, often before boot, and override them per test - so a route must outlive the reset after
 * each test, and an override must not leak into the next test.
 */
describe('FakeHoistCore', () => {
    const orders = [{id: 1, qty: 500}];
    let bootOrders: unknown;

    // Loads from an app endpoint at boot, as an app service does.
    class OrdersAppModel extends TestAppModel {
        override async initAsync() {
            bootOrders = await XH.fetchJson({url: 'orders'});
        }
    }

    beforeAll(async () => {
        hoistCore.route('GET', 'orders', () => orders);
        await initTestAppAsync({modelClass: OrdersAppModel});
    });

    // First in the file, so the log would still hold the requests from boot.
    it('starts each test with an empty request log', () => {
        expect(hoistCore.requests).toEqual([]);
    });

    describe('route', () => {
        it('serves a route added before boot to the boot itself', () => {
            expect(bootOrders).toEqual(orders);
        });

        it('keeps a route added in beforeAll() across tests', async () => {
            expect(await XH.fetchJson({url: 'orders'})).toEqual(orders);
        });

        it('lets a route added in a test override a file route', async () => {
            hoistCore.route('GET', 'orders', () => []);
            expect(await XH.fetchJson({url: 'orders'})).toEqual([]);
        });

        it('drops a route added in a test once that test ends', async () => {
            expect(await XH.fetchJson({url: 'orders'})).toEqual(orders);
        });

        describe('with a route added in beforeEach()', () => {
            beforeEach(() => hoistCore.route('GET', 'orders', () => [{id: 2}]));

            it('serves that route in the test', async () => {
                expect(await XH.fetchJson({url: 'orders'})).toEqual([{id: 2}]);
            });
        });

        it('drops a route added in beforeEach() once its test ends', async () => {
            expect(await XH.fetchJson({url: 'orders'})).toEqual(orders);
        });

        it('passes path parameters and records the request path', async () => {
            hoistCore.route('POST', 'orders/:id/notes', req => ({id: req.params.id, ...req.json}));

            const ret = await XH.postJson({url: 'orders/7/notes', body: {text: 'hi'}});

            expect(ret).toEqual({id: '7', text: 'hi'});
            const [req] = hoistCore.requestsTo('orders/7/notes');
            expect(req.method).toBe('POST');
            expect(req.json).toEqual({text: 'hi'});
        });

        it('matches routes by method', async () => {
            hoistCore.route('GET', 'stock', () => 'get');
            hoistCore.route('POST', 'stock', () => 'post');
            hoistCore.route('*', 'any', req => req.method);

            expect(await XH.fetchJson({url: 'stock'})).toBe('get');
            expect(await XH.postJson({url: 'stock'})).toBe('post');
            expect(await XH.fetchJson({url: 'any'})).toBe('GET');
            expect(await XH.postJson({url: 'any'})).toBe('POST');
        });

        it('sends a returned Response as is, and no return value as an empty 204', async () => {
            hoistCore.route('DELETE', 'orders/:id', () => undefined);
            hoistCore.route('GET', 'orders/locked', () =>
                hoistError(409, {name: 'LockedException', message: 'Locked', isRoutine: true})
            );

            expect(await XH.fetchJson({url: 'orders/1', method: 'DELETE'})).toBeNull();
            await expect(XH.fetchJson({url: 'orders/locked'})).rejects.toMatchObject({
                httpStatus: 409,
                message: 'Locked'
            });
        });

        it('serves an absolute URL, recording the full URL as its path', async () => {
            const url = 'https://api.example.com/rates';
            hoistCore.route('GET', url, () => ({usd: 1}));

            expect(await XH.fetchJson({url})).toEqual({usd: 1});
            expect(hoistCore.requestsTo(url)).toHaveLength(1);
        });

        it('overrides a built-in endpoint', async () => {
            hoistCore.route('GET', 'xh/environmentPoll', () => ({appVersion: '9.9.9'}));
            expect(await XH.fetchJson({url: 'xh/environmentPoll'})).toEqual({appVersion: '9.9.9'});
        });

        it('reports a route that throws, and answers 500', async () => {
            const problems: string[] = [],
                onProblem = hoistCore.onProblem;
            hoistCore.onProblem = msg => problems.push(msg);
            onTestFinished(() => {
                hoistCore.onProblem = onProblem;
            });
            hoistCore.route('GET', 'broken', () => {
                throw new Error('No such order');
            });

            await expect(XH.fetchJson({url: 'broken'})).rejects.toMatchObject({httpStatus: 500});
            expect(problems).toEqual(['Route for GET broken threw: Error: No such order']);
        });
    });

    // Models often start a request without awaiting it - e.g. a save from a timer or destroy().
    describe('settleAsync', () => {
        beforeAll(() => hoistCore.route('POST', 'audit', () => wait(50)));

        it('waits for a request started without an await, and its handling', async () => {
            let handled = false;
            void XH.postJson({url: 'audit'}).then(() => (handled = true));

            await hoistCore.settleAsync();

            expect(hoistCore.requestsTo('audit')).toHaveLength(1);
            expect(handled).toBe(true);
        });

        it('waits on real time while a test fakes timers', async () => {
            vi.useFakeTimers();
            void XH.fetchJson({url: 'orders'});

            await hoistCore.settleAsync();

            expect(hoistCore.requestsTo('orders')).toHaveLength(1);
        });

        it('rejects, naming any request still open after the timeout', async () => {
            let release: () => void;
            hoistCore.route('GET', 'held', () => new Promise<void>(r => (release = r)));
            void XH.fetchJson({url: 'held'});

            try {
                await expect(hoistCore.settleAsync(100)).rejects.toThrow('GET held');
            } finally {
                release?.();
            }
        });

        // These two run in order - the second checks what the first left behind.
        let leakedHandled = false;
        it('lets a test end with a request it did not await', () => {
            void XH.postJson({url: 'audit'}).then(() => (leakedHandled = true));
        });

        it('waits at teardown, so that request stays out of the next test', () => {
            expect(leakedHandled).toBe(true);
            expect(hoistCore.requests).toEqual([]);
        });
    });

    // Specs fake timers for debounces and dates, then save through the fake - e.g. a pref push.
    describe('under fake timers', () => {
        beforeAll(() => hoistCore.route('POST', 'orders', req => ({id: 2, ...req.json})));

        it('answers a request without waiting on real time', async () => {
            // A request first, which leaves a connection that the next request could reuse.
            await XH.fetchJson({url: 'orders'});
            vi.useFakeTimers();

            const saved = XH.postJson({url: 'orders', body: {qty: 100}});

            await expect(withinRealMs(saved, 1000)).resolves.toEqual({id: 2, qty: 100});
        });
    });
});

// The clock as loaded - fake timers replace the global, not this reference.
const realSetTimeout = globalThis.setTimeout;

/** Resolve as `promise` does, or reject if it takes longer than `ms` of real time. */
function withinRealMs<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
        realSetTimeout(() => reject(new Error(`Not settled after ${ms}ms of real time`)), ms)
    );
    return Promise.race([promise, timeout]);
}
