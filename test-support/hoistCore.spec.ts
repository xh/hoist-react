/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {hoistCore, hoistError, initTestAppAsync, TestAppModel} from '@xh/hoist/test-support';
import {beforeAll, beforeEach, describe, expect, it, onTestFinished} from 'vitest';

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
});
