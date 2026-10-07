/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import type {FetchException, FetchOptions} from '@xh/hoist/svc';
import {authFailure, hoistError, initTestAppAsync, server, xhUrl} from '@xh/hoist/test';
import {http, HttpResponse} from 'msw';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * How FetchService decodes a failed request into a HoistException. Apps, and Hoist's own
 * ExceptionHandler, branch on the decoded name, isRoutine and httpStatus - to choose an alert or
 * an error dialog, to log to the server, to retry, or to force a reload on session mismatch.
 * Server responses below use the shapes hoist-core renders, via the helpers in test/hoistCore.ts.
 */
describe('FetchService', () => {
    beforeAll(async () => {
        await initTestAppAsync();
    });

    describe('hoist-core exceptions', () => {
        it('decodes a routine exception from its JSON body', async () => {
            // ExceptionHandler forces a reload when it sees this name.
            const body = {
                name: 'SessionMismatchException',
                message: 'The reported clientUsername does not match current session user.',
                isRoutine: true
            };
            respondWith(() => hoistError(400, body));

            const e = await fetchFailure();
            expect(e).toMatchObject({...body, httpStatus: 400, isHoistException: true});
            expect(e.serverDetails).toEqual(body);
            // Server-side failures carry no client stack trace.
            expect(e).not.toHaveProperty('stack');
        });

        it('omits the cause from the message of a routine exception', async () => {
            // Fixed in 87.0.0 (5d42d7732) - a routine message is complete and shown to users.
            respondWith(() =>
                hoistError(400, {
                    name: 'ValidationException',
                    message: 'Property [name] cannot be blank',
                    cause: 'Validation Error(s) occurred during save()',
                    isRoutine: true
                })
            );

            const e = await fetchFailure();
            expect(e.message).toBe('Property [name] cannot be blank');
        });

        it('appends the cause to the message of a non-routine exception', async () => {
            // Added in v76.0.0 (ff550652b). hoist-core omits isRoutine when false.
            respondWith(() =>
                hoistError(500, {
                    name: 'ExternalHttpException',
                    message: 'Failure calling https://api.example.com/rates',
                    cause: 'Connection refused'
                })
            );

            const e = await fetchFailure();
            expect(e).toMatchObject({
                name: 'ExternalHttpException',
                message:
                    'Failure calling https://api.example.com/rates (Caused by: Connection refused)',
                isRoutine: false,
                httpStatus: 500
            });
        });

        it.each([
            ['an empty auth filter response', () => authFailure(401)],
            [
                'a NotAuthenticatedException',
                () =>
                    hoistError(401, {
                        name: 'NotAuthenticatedException',
                        message: 'Not Authenticated',
                        isRoutine: true
                    })
            ]
        ])('reports a 401 from %s as Unauthorized', async (_, response) => {
            respondWith(response);

            const e = await fetchFailure();
            expect(e).toMatchObject({
                name: 'Unauthorized',
                message: 'Your session may have timed out and you may need to log in again.',
                httpStatus: 401
            });
        });

        it('reports an empty auth filter rejection by its status', async () => {
            // e.g. a 403 for an inactive user - apps check httpStatus to explain the failure.
            // The message is the reason phrase, which a proxy such as nginx adds - Tomcat has none.
            respondWith(() => authFailure(403, 'Forbidden'));

            const e = await fetchFailure();
            expect(e).toMatchObject({
                name: 'HTTP Error 403',
                message: 'Forbidden',
                httpStatus: 403,
                isRoutine: false
            });
        });
    });

    describe('other failures', () => {
        it('parses JSON error bodies served as application/problem+json', async () => {
            // Added in v78.0.0 (fd5a629c8) - the RFC 9457 format some external APIs use.
            const body = {title: 'Bad Request', status: 400, detail: 'Unknown currency: XYZ'};
            respondWith(() =>
                HttpResponse.json(body, {
                    status: 400,
                    headers: {'Content-Type': 'application/problem+json'}
                })
            );

            const e = await fetchFailure();
            expect(e.serverDetails).toEqual(body);
            expect(e).toMatchObject({name: 'HTTP Error 400', message: 'Bad Request'});
        });

        it('reports a non-JSON error page by its status, keeping the page as server details', async () => {
            // e.g. a proxy's 502 while the server restarts - some apps retry on this status.
            const page = '<html><body>502 Bad Gateway</body></html>';
            respondWith(() => HttpResponse.html(page, {status: 502}));

            const e = await fetchFailure();
            expect(e).toMatchObject({
                name: 'HTTP Error 502',
                message: 'Bad Gateway',
                httpStatus: 502,
                serverDetails: page
            });
        });

        it('rejects with a JSON Parsing Error when a successful response is not JSON', async () => {
            // e.g. an SSO proxy answering an expired session with its login page.
            respondWith(() => HttpResponse.html('<html><body>Sign in</body></html>'));

            const e = await fetchFailure();
            expect(e.name).toBe('JSON Parsing Error');
            expect(e.cause).toBeInstanceOf(SyntaxError);
        });

        it.each([
            ['test/data', 'http://localhost:3000'],
            ['https://api.example.com/rates', 'https://api.example.com']
        ])('reports a network failure for %s as Server Unavailable', async (url, origin) => {
            server.use(http.get('*', () => HttpResponse.error()));

            const e = await fetchFailure({url});
            expect(e).toMatchObject({
                name: 'Server Unavailable',
                message: `Unable to contact the server at ${origin}`,
                isServerUnavailable: true,
                httpStatus: 0
            });
        });
    });

    describe('exception context', () => {
        it('carries the correlation id sent with the request', async () => {
            // Joins a client error report to the server's logs for the same request.
            let sentId: string;
            server.use(
                http.get(xhUrl('test/data'), ({request}) => {
                    sentId = request.headers.get('X-Correlation-ID');
                    return hoistError(500, {message: 'Unexpected failure'});
                })
            );

            const e = await fetchFailure({correlationId: true});
            expect(sentId).toBeTruthy();
            expect(e.correlationId).toBe(sentId);
        });
    });
});

//------------------------
// Helpers
//------------------------
/** Answer GET `test/data` with the given response, for the current test. */
function respondWith(response: () => Response) {
    server.use(http.get(xhUrl('test/data'), response));
}

/** Fetch `test/data` as JSON, returning the exception it rejects with. */
async function fetchFailure(opts: Partial<FetchOptions> = {}): Promise<FetchException> {
    try {
        await XH.fetchJson({url: 'test/data', ...opts});
    } catch (e) {
        return e;
    }
    throw new Error('Expected the fetch to fail');
}
