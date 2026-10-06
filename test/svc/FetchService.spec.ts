/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {FetchService} from '@xh/hoist/svc';
import {hoistCore, initTestAppAsync, server, xhUrl} from '@xh/hoist/test';
import {LocalDate, MINUTES, SECONDS} from '@xh/hoist/utils/datetime';
import {http, HttpResponse} from 'msw';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * How FetchService puts requests on the wire and manages their lifecycle. Every server call an app
 * makes goes through this code, and hoist-core binds its controller params to exactly this
 * encoding - a change here still type-checks, but breaks apps at runtime.
 */
describe('FetchService', () => {
    beforeAll(async () => {
        await initTestAppAsync();
        hoistCore.clearRequests();
    });

    describe('urls', () => {
        it('prefixes relative urls with XH.baseUrl', async () => {
            const sent = serve(xhUrl('test/data'));
            await XH.fetchJson({url: 'test/data'});
            expect(sent[0].url.pathname).toBe('/api/test/data');
        });

        it('leaves root-relative and absolute urls unchanged', async () => {
            const rootRelative = serve('/static/manifest.json'),
                absolute = serve('https://api.example.com/rates');

            await XH.fetchJson({url: '/static/manifest.json'});
            await XH.fetchJson({url: 'https://api.example.com/rates'});

            expect(rootRelative).toHaveLength(1);
            expect(absolute).toHaveLength(1);
        });
    });

    describe('params', () => {
        it('sends params as a form-encoded POST when no method is given', async () => {
            // The way PrefService loads prefs - hoist-core reads clientUsername from the form.
            await XH.fetchJson({url: 'xh/getPrefs', params: {clientUsername: 'jdoe'}});

            const [req] = hoistCore.requestsTo('xh/getPrefs');
            expect(req.method).toBe('POST');
            expect(req.headers['content-type']).toBe('application/x-www-form-urlencoded');
            expect(req.form).toEqual({clientUsername: 'jdoe'});
            expect(req.query).toEqual({});
        });

        it.each(['postJson', 'putJson'] as const)(
            '%s sends a JSON body, with params on the query string',
            async method => {
                // The way user-state calls such as xh/setPrefs identify the user to hoist-core.
                const sent = serve(xhUrl('test/state'));
                await XH[method]({
                    url: 'test/state',
                    params: {clientUsername: 'jdoe'},
                    body: {theme: 'dark'}
                });

                const [req] = sent;
                expect(req.url.search).toBe('?clientUsername=jdoe');
                expect(req.headers.get('Content-Type')).toBe('application/json');
                expect(req.headers.get('Accept')).toBe('application/json');
                expect(JSON.parse(req.body)).toEqual({theme: 'dark'});
            }
        );

        // Fixed in 89.0.0 - a PUT sent its form body as text/plain, so the server ignored it.
        it('sends params for a PUT as a form-encoded body', async () => {
            const sent = serve(xhUrl('test/items/1'));
            await XH.fetch({url: 'test/items/1', method: 'PUT', params: {name: 'Widget'}});

            const [req] = sent;
            expect(req.body).toBe('name=Widget');
            expect(req.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');
        });
    });

    describe('param encoding', () => {
        it.each([
            ['repeats array values under one key', {ids: [1, 2]}, 'ids=1&ids=2'],
            [
                'flattens nested objects with dot notation',
                {filter: {field: 'region', value: 'EMEA'}},
                'filter.field=region&filter.value=EMEA'
            ],
            [
                'sends Dates as epoch milliseconds',
                {asOf: new Date('2026-10-04T14:30:00Z')},
                'asOf=1791124200000'
            ],
            ['sends LocalDates as YYYY-MM-DD', {day: LocalDate.get('2026-10-04')}, 'day=2026-10-04']
        ])('%s', async (_, params, expected) => {
            const sent = serve(xhUrl('test/positions'));
            await XH.getJson({url: 'test/positions', params});
            expect(sent[0].url.search).toBe(`?${expected}`);
        });
    });

    describe('headers', () => {
        it('resolves async default headers for each request, based on its options', async () => {
            // The pattern OAuth apps install from their AuthModel - the token must not leak to
            // other hosts.
            const svc = new FetchService(),
                getIdTokenAsync = () => Promise.resolve('id-token');
            onTestFinished(() => svc.destroy());
            svc.addDefaultHeaders(async opts => {
                if (opts.url.startsWith('http')) return null;
                return {Authorization: `Bearer ${await getIdTokenAsync()}`};
            });

            const hoistCall = serve(xhUrl('test/data')),
                externalCall = serve('https://api.example.com/rates');
            await svc.fetchJson({url: 'test/data'});
            await svc.fetchJson({url: 'https://api.example.com/rates'});

            expect(hoistCall[0].headers.get('Authorization')).toBe('Bearer id-token');
            expect(externalCall[0].headers.get('Authorization')).toBeNull();
        });

        it('drops a header set to null, letting fetch set a multipart Content-Type', async () => {
            // The way GridExportService uploads its FormData.
            const sent = serve(xhUrl('test/upload')),
                body = new FormData();
            body.append('params', JSON.stringify({filename: 'trades'}));

            await XH.fetch({
                url: 'test/upload',
                method: 'POST',
                body,
                headers: {'Content-Type': null}
            });

            expect(sent[0].headers.get('Content-Type')).toMatch(/^multipart\/form-data; boundary=/);
        });

        it('generates a correlation id per request when enabled in defaults, unless a request opts out', async () => {
            const {defaults} = FetchService,
                {autoGenCorrelationIds} = defaults;
            defaults.autoGenCorrelationIds = true;
            onTestFinished(() => {
                defaults.autoGenCorrelationIds = autoGenCorrelationIds;
            });

            const sent = serve(xhUrl('test/data'));
            await XH.fetchJson({url: 'test/data'});
            await XH.fetchJson({url: 'test/data', correlationId: false});

            expect(sent[0].headers.get('X-Correlation-ID')).toBeTruthy();
            expect(sent[1].headers.get('X-Correlation-ID')).toBeNull();
        });
    });

    describe('responses', () => {
        it('resolves JSON calls to null for a 204 No Content response', async () => {
            // hoist-core's renderSuccess() and REST deletes respond this way.
            serve(xhUrl('test/items/1'), () => new HttpResponse(null, {status: 204}));
            expect(await XH.deleteJson({url: 'test/items/1'})).toBeNull();
        });
    });

    describe('timeout', () => {
        it('rejects with a Fetch Timeout after 30 seconds by default, and aborts the request', async () => {
            let notifyArrival: () => void;
            const arrived = new Promise<void>(resolve => (notifyArrival = resolve)),
                sent = serve(xhUrl('test/report'), () => {
                    notifyArrival();
                    return hang();
                });

            vi.useFakeTimers();
            const result = XH.fetchJson({url: 'test/report'}),
                assertion = expect(result).rejects.toMatchObject({
                    name: 'Fetch Timeout',
                    message: "Timed out after 30secs loading 'test/report'",
                    isTimeout: true,
                    isFetchTimeout: true
                });

            await arrived;
            await vi.advanceTimersByTimeAsync(30 * SECONDS);
            await assertion;
            expect(sent[0].signal.aborted).toBe(true);
        });

        it('never times out when timeout is null', async () => {
            // GridExportService turns the timeout off for exports, which can run for minutes.
            let release: () => void;
            const released = new Promise<void>(resolve => (release = resolve));
            serve(xhUrl('test/export'), async () => {
                await released;
                return HttpResponse.json({rows: 50000});
            });

            vi.useFakeTimers();
            const result = XH.fetchJson({url: 'test/export', timeout: null});
            await vi.advanceTimersByTimeAsync(5 * MINUTES);
            release();

            expect(await result).toEqual({rows: 50000});
        });
    });

    describe('autoAbortKey', () => {
        it('aborts the pending request each time a new one is made with the same key', async () => {
            // The type-ahead search pattern - a slow response to an earlier query must never land
            // after the latest one.
            let notifyArrival: () => void;
            const nextArrival = () => new Promise<void>(resolve => (notifyArrival = resolve)),
                sent = serve(xhUrl('test/search'), req => {
                    notifyArrival();
                    const q = req.url.searchParams.get('q');
                    return q === 'abc' ? HttpResponse.json({q}) : hang();
                }),
                search = (q: string) =>
                    XH.getJson({url: 'test/search', params: {q}, autoAbortKey: 'search'});

            let arrived = nextArrival();
            const a = search('a');
            await arrived;

            arrived = nextArrival();
            const ab = search('ab');
            await expect(a).rejects.toMatchObject({
                name: 'Fetch Aborted',
                isFetchAborted: true,
                isRoutine: true
            });
            await arrived;

            // The first request's cleanup must not release the key held by the second.
            const abAborted = expect(ab).rejects.toMatchObject({isFetchAborted: true});
            expect(await search('abc')).toEqual({q: 'abc'});
            await abAborted;
            expect(sent.map(it => it.signal.aborted)).toEqual([true, true, false]);
        });
    });
});

//------------------------
// Helpers
//------------------------
/** A request as received by a handler from {@link serve}. */
interface SentRequest {
    url: URL;
    headers: Headers;
    body: string;
    signal: AbortSignal;
}

/**
 * Serve `url` for the current test, recording each request received. Used for endpoints that
 * the fake hoist-core does not provide.
 */
function serve(
    url: string,
    respond: (req: SentRequest) => Response | Promise<Response> = () => HttpResponse.json({})
): SentRequest[] {
    const ret: SentRequest[] = [];
    server.use(
        http.all(url, async ({request}) => {
            const req = {
                url: new URL(request.url),
                headers: request.headers,
                body: await request.text(),
                signal: request.signal
            };
            ret.push(req);
            return respond(req);
        })
    );
    return ret;
}

/** A response that never arrives. */
function hang(): Promise<Response> {
    return new Promise(() => {});
}
