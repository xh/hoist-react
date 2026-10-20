/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {PlainObject, XH} from '@xh/hoist/core';
import {FetchService} from '@xh/hoist/svc';
import {hoistCore, initTestAppAsync, server, xhUrl} from '@xh/hoist/test-support';
import {http, HttpResponse} from 'msw';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * Which requests FetchService sends a W3C `traceparent` header to while tracing is enabled.
 * `traceparent` is not a CORS-safelisted header, so a third-party API that does not allow it
 * fails its preflight - sending it there would break the call as soon as an app turns tracing on.
 */
describe('FetchService', () => {
    beforeAll(async () => {
        hoistCore.configs.xhTraceConfig.enabled = true;
        await initTestAppAsync();
    });

    describe('trace propagation', () => {
        it("sends traceparent to the app's own server by default", async () => {
            const relative = serve(xhUrl('test/data')),
                sameOrigin = serve(`${window.location.origin}/static/manifest.json`);

            await XH.fetchJson({url: 'test/data'});
            await XH.fetchJson({url: `${window.location.origin}/static/manifest.json`});

            expect(relative[0].headers.get('traceparent')).toMatch(TRACEPARENT);
            expect(sameOrigin[0].headers.get('traceparent')).toMatch(TRACEPARENT);
        });

        it('omits traceparent for other origins by default', async () => {
            const sent = serve('https://api.example.com/rates');
            await XH.fetchJson({url: 'https://api.example.com/rates'});
            expect(sent[0].headers.get('traceparent')).toBeNull();
        });

        it('lets a request override the default', async () => {
            const own = serve(xhUrl('test/data')),
                other = serve('https://api.example.com/rates');

            await XH.fetchJson({url: 'test/data', propagateTrace: false});
            await XH.fetchJson({url: 'https://api.example.com/rates', propagateTrace: true});

            expect(own[0].headers.get('traceparent')).toBeNull();
            expect(other[0].headers.get('traceparent')).toMatch(TRACEPARENT);
        });

        it('applies an app-wide default from FetchService.defaults', async () => {
            const {defaults} = FetchService,
                {propagateTrace} = defaults;
            defaults.propagateTrace = opts => opts.url.startsWith('https://partner.example.com/');
            onTestFinished(() => {
                defaults.propagateTrace = propagateTrace;
            });

            const partner = serve('https://partner.example.com/orders'),
                own = serve(xhUrl('test/data'));
            await XH.fetchJson({url: 'https://partner.example.com/orders'});
            await XH.fetchJson({url: 'test/data'});

            expect(partner[0].headers.get('traceparent')).toMatch(TRACEPARENT);
            expect(own[0].headers.get('traceparent')).toBeNull();
        });

        it('honors the option for streamed NDJSON requests', async () => {
            const sent = serve(
                xhUrl('test/stream'),
                () =>
                    new HttpResponse('{"id":1}\n', {
                        headers: {'Content-Type': 'application/x-ndjson'}
                    })
            );

            await readAllAsync(XH.fetchNdjson({url: 'test/stream'}).lines);
            await readAllAsync(XH.fetchNdjson({url: 'test/stream', propagateTrace: false}).lines);

            expect(sent[0].headers.get('traceparent')).toMatch(TRACEPARENT);
            expect(sent[1].headers.get('traceparent')).toBeNull();
        });
    });
});

//------------------------
// Helpers
//------------------------
const TRACEPARENT = /^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/;

/** Serve `url` for the current test, recording the headers of each request received. */
function serve(
    url: string,
    respond: () => Response = () => HttpResponse.json({})
): {headers: Headers}[] {
    const ret: {headers: Headers}[] = [];
    server.use(
        http.all(url, ({request}) => {
            ret.push({headers: request.headers});
            return respond();
        })
    );
    return ret;
}

/** Read a stream of records to its end. */
async function readAllAsync(lines: AsyncGenerator<PlainObject>): Promise<PlainObject[]> {
    const ret: PlainObject[] = [];
    for await (const line of lines) ret.push(line);
    return ret;
}
