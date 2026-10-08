/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    ExceptionHandler,
    ExceptionHandlerOptions,
    HoistModel,
    LoadSpec,
    ToastSpec,
    XH
} from '@xh/hoist/core';
import type {HoistException} from '@xh/hoist/exception';
import {hoistCore, hoistError, initTestAppAsync, server, xhUrl} from '@xh/hoist/test-support';
import {delay, http, HttpResponse} from 'msw';
import {afterEach, beforeAll, beforeEach, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * Every error an app catches ends up in `XH.handleException()`, directly or via `catchDefault()`.
 * The handler decides whether the user sees a dialog, a toast, or nothing, and whether the error
 * is reported to the Admin Console. It also redacts secrets - passwords, tokens, auth headers -
 * from failed requests before the exception reaches the console, the dialog, or the server.
 */
describe('ExceptionHandler', () => {
    beforeAll(async () => {
        // Room for a full serialized exception, with its stack, in a tracked entry.
        hoistCore.configs.xhActivityTrackingConfig.maxDataLength = 100_000;
        await initTestAppAsync();
        hoistCore.clearRequests();
    });

    // Watch reports without changing them - the handler sends them without awaiting.
    beforeEach(() => {
        vi.spyOn(XH.exceptionHandler, 'logOnServerAsync');
    });
    afterEach(() => dialogModel().close());

    describe('handleException', () => {
        it('shows an unexpected error in a dialog and reports it to the server', async () => {
            const e = await handleAsync(new Error('Save failed'));

            expect(shown()).toMatchObject({
                exception: {message: 'Save failed'},
                options: {title: 'Error', showAsError: true, requireReload: false}
            });
            expect(reports()).toEqual([
                expect.objectContaining({
                    category: 'Client Error',
                    severity: 'ERROR',
                    msg: 'Save failed',
                    data: expect.objectContaining({
                        userAlerted: true,
                        error: expect.objectContaining({name: 'Error', message: 'Save failed'})
                    })
                })
            ]);
            expect(e.message).toBe('Save failed');
        });

        it('shows a routine exception as an alert, without reporting it', async () => {
            await handleAsync(XH.exception({message: 'No trades match', isRoutine: true}));

            expect(shown().options).toMatchObject({title: 'Alert', showAsError: false});
            expect(reports()).toEqual([]);
        });

        it('takes explicit options over its defaults', async () => {
            await handleAsync(XH.exception({message: 'Quota exceeded', isRoutine: true}), {
                title: 'Upload Failed',
                message: 'Your file could not be saved.',
                logOnServer: true
            });

            expect(shown().options).toMatchObject({
                title: 'Upload Failed',
                message: 'Your file could not be saved.'
            });
            expect(reports()).toEqual([expect.objectContaining({severity: 'INFO'})]);
        });

        it('shows nothing and reports nothing when told not to', async () => {
            await handleAsync(new Error('Save failed'), {showAlert: false, logOnServer: false});

            expect(dialogModel().displayData).toBeNull();
            expect(reports()).toEqual([]);
        });

        it('requires a reload on a session mismatch, and keeps that alert up', async () => {
            respondWith(() =>
                hoistError(400, {
                    name: 'SessionMismatchException',
                    message: 'The reported clientUsername does not match current session user.',
                    isRoutine: true
                })
            );
            await handleAsync(await fetchFailureAsync());
            await handleAsync(new Error('Save failed'));

            expect(shown().options).toMatchObject({title: 'Session Mismatch', requireReload: true});
        });

        it('stays silent on a failed auto-refresh, but alerts on a failed user load', async () => {
            // Otherwise a background refresh would alert and report every time it ran.
            respondWith(() => hoistError(500, {name: 'Exception', message: 'Database down'}));
            const model = new PositionsModel();
            onTestFinished(() => model.destroy());

            await model.autoRefreshAsync();
            expect(dialogModel().displayData).toBeNull();
            expect(reports()).toEqual([]);

            await model.loadAsync();
            await flushReportsAsync();
            expect(shown().exception.message).toBe('Database down');
            expect(reports()).toHaveLength(1);
        });

        it('reports the type and number of the load that failed', async () => {
            // Fixed in 89.0.0 - both were read from the loadSpec after it was cloned, so never set.
            respondWith(() => hoistError(500, {name: 'Exception', message: 'Database down'}));
            const model = new PositionsModel();
            onTestFinished(() => model.destroy());

            await model.refreshAsync();
            await flushReportsAsync();

            const [{data}] = reports();
            expect(data.error).toMatchObject({loadType: 'Refresh', loadNumber: 0});
            expect(data.error).not.toHaveProperty('callContext');
        });

        it('stays silent on a fetch aborted by a newer request', async () => {
            server.use(
                http.get(xhUrl('test/data'), async () => {
                    await delay(20);
                    return HttpResponse.json({});
                })
            );
            const aborted = XH.fetchJson({url: 'test/data', autoAbortKey: 'positions'}).catch(
                e => e
            );
            await XH.fetchJson({url: 'test/data', autoAbortKey: 'positions'});
            const e = await aborted;

            await handleAsync(e);
            expect(e.isFetchAborted).toBe(true);
            expect(dialogModel().displayData).toBeNull();
            expect(reports()).toEqual([]);
        });

        it('shows a toast instead of a dialog when asked, or when set as the app default', () => {
            const toast = vi.spyOn(XH, 'toast').mockImplementation(() => null);

            XH.handleException(new Error('Save failed'), {alertType: 'toast', logOnServer: false});
            const prevDefault = ExceptionHandler.defaults.alertType;
            ExceptionHandler.defaults.alertType = 'toast';
            onTestFinished(() => {
                ExceptionHandler.defaults.alertType = prevDefault;
            });
            XH.handleException(XH.exception({message: 'No trades match', isRoutine: true}));

            expect(dialogModel().displayData).toBeNull();
            expect(toast.mock.calls.map(([it]) => (it as ToastSpec).intent)).toEqual([
                'danger',
                'primary'
            ]);
        });
    });

    describe('redaction', () => {
        it('redacts secret keys at any depth in params, body, and headers of a failed fetch', async () => {
            respondWith(() => hoistError(500, {name: 'Exception', message: 'Rates feed down'}));
            const params = {api_key: 'k-123', region: 'US'},
                headers = {AUTHORIZATION: 'Bearer abc', 'X-Desk': 'rates'},
                body = {user: 'jdoe', auth: {Password: 'hunter2'}, legs: [{token: 't-1', qty: 5}]};
            const e = await XH.postJson({url: 'test/data', params, headers, body}).catch(e => e);

            await handleAsync(e);

            const expected = {
                params: {api_key: R, region: 'US'},
                headers: expect.objectContaining({AUTHORIZATION: R, 'X-Desk': 'rates'}),
                body: {user: 'jdoe', auth: {Password: R}, legs: [{token: R, qty: 5}]}
            };
            const {fetchOptions} = shown().exception;
            expect({...fetchOptions, body: JSON.parse(fetchOptions.body)}).toMatchObject(expected);

            const reported = reports()[0].data.error.fetchOptions;
            expect({...reported, body: JSON.parse(reported.body)}).toMatchObject(expected);
        });

        it('leaves the request options passed by the caller unchanged', async () => {
            respondWith(() => hoistError(500, {name: 'Exception', message: 'Rates feed down'}));
            const params = {api_key: 'k-123', filter: {token: 't-1'}},
                headers = {Authorization: 'Bearer abc'},
                e = await XH.fetchJson({url: 'test/data', method: 'GET', params, headers}).catch(
                    e => e
                );

            await handleAsync(e);

            expect(params).toEqual({api_key: 'k-123', filter: {token: 't-1'}});
            expect(headers).toEqual({Authorization: 'Bearer abc'});
        });

        it.each([
            ['a JSON string, key by key', '{"pwd":"hunter2","qty":5}', '{"pwd":"******","qty":5}'],
            ['a form-encoded string, in full', 'user=jdoe&pwd=hunter2', R]
        ])('redacts a body sent as %s', async (_, body, expected) => {
            const e = XH.exception({message: 'Save failed', fetchOptions: {url: 'save', body}});

            await handleAsync(e, {showAlert: false});

            expect(reports()[0].data.error.fetchOptions.body).toEqual(expected);
        });

        it('redacts exact paths, from the app defaults or the call options', async () => {
            const prevPaths = ExceptionHandler.defaults.redactPaths;
            ExceptionHandler.defaults.redactPaths = [...prevPaths, 'serverDetails.accountPin'];
            onTestFinished(() => {
                ExceptionHandler.defaults.redactPaths = prevPaths;
            });
            const serverDetails = {accountPin: '1234', accountId: 'A-1', ssn: '123-45-6789'},
                e = XH.exception({message: 'Lookup failed', serverDetails});

            await handleAsync(e, {redactPaths: ['serverDetails.ssn']});

            const expected = {accountPin: R, accountId: 'A-1', ssn: R};
            expect(shown().exception.serverDetails).toEqual(expected);
            expect(reports()[0].data.error.serverDetails).toEqual(expected);
            // Paths are exact - the shared object they point into is copied, not modified.
            expect(serverDetails.accountPin).toBe('1234');
        });

        it('applies key names only within fetch options, and paths only where they point', () => {
            const e = XH.exception({
                message: 'Lookup failed',
                serverDetails: {password: 'shown'},
                fetchOptions: {url: 'lookup', params: {password: 'hunter2'}}
            });

            const sanitized = XH.exceptionHandler.sanitizeException(e);

            expect(sanitized.serverDetails.password).toBe('shown');
            expect(sanitized.fetchOptions.params.password).toBe(R);
        });
    });

    describe('sanitizeException', () => {
        it('trims circular and deeply nested values so the exception can be serialized', () => {
            const position: any = {name: 'Positions'};
            position.self = position;
            position.history = [position];

            const sanitized = XH.exceptionHandler.sanitizeException(
                XH.exception({message: 'Load failed', position})
            );

            expect(sanitized.position.name).toBe('Positions');
            expect(JSON.stringify(sanitized)).toContain('{...}');
        });

        it('strips HTML tags, private properties, and the cause beyond its name and message', () => {
            const cause = Object.assign(new TypeError('Bad <i>value</i>'), {
                    details: 'x'.repeat(50)
                }),
                e = XH.exception({message: '<b>Save</b> failed', cause, _owner: {}});

            const sanitized = XH.exceptionHandler.sanitizeException(e);

            expect(sanitized.message).toBe('Save failed');
            expect(sanitized.cause).toEqual({name: 'TypeError', message: 'Bad value'});
            expect(sanitized).not.toHaveProperty('_owner');
            expect(sanitized).not.toHaveProperty('isHoistException');
        });

        it('keeps arrays as arrays, including the lines of the stack trace', () => {
            // Fixed in 89.0.0 - every array was serialized as an object keyed by index.
            const e = XH.exception({message: 'Save failed', trades: [{id: 101}, {id: 102}]});

            const sanitized = XH.exceptionHandler.sanitizeException(e);

            expect(sanitized.trades).toEqual([{id: 101}, {id: 102}]);
            expect(sanitized.stack).toBeInstanceOf(Array);
            expect(sanitized.stack[0]).toBe('Exception: Save failed');
        });
    });

    describe('logOnServerAsync', () => {
        it('reports a message entered by the user, with HTML tags stripped', async () => {
            // As the error dialog's "Report" button does.
            const exception = XH.exception({message: 'No trades match', isRoutine: true});

            const sent = await XH.exceptionHandler.logOnServerAsync({
                exception,
                userAlerted: true,
                userMessage: 'I clicked <script>x</script>Save'
            });

            expect(sent).toBe(true);
            expect(reports()).toEqual([
                expect.objectContaining({
                    severity: 'INFO',
                    data: expect.objectContaining({userMessage: 'I clicked xSave'})
                })
            ]);
        });

        it('returns false, without throwing, when the server rejects the report', async () => {
            // The error dialog tells the user whether their report was sent.
            server.use(
                http.post(xhUrl('xh/track'), () =>
                    hoistError(500, {name: 'Exception', message: 'Database down'})
                )
            );

            const sent = await XH.exceptionHandler.logOnServerAsync({
                exception: XH.exception('Save failed'),
                userAlerted: true
            });

            expect(sent).toBe(false);
        });
    });
});

//------------------------
// Helpers
//------------------------
const R = ExceptionHandler.REDACTED;

class PositionsModel extends HoistModel {
    override async doLoadAsync(loadSpec: LoadSpec) {
        await XH.fetchJson({url: 'test/data'}, {loadSpec}).catchDefault();
    }
}

function dialogModel() {
    return XH.appContainerModel.exceptionDialogModel;
}

/** The exception and options shown in the error dialog. */
function shown(): {exception: HoistException; options: ExceptionHandlerOptions} {
    return dialogModel().displayData;
}

/** Client Error entries sent to the server's activity tracking endpoint. */
function reports(): any[] {
    return hoistCore
        .requestsTo('xh/track')
        .flatMap(it => it.json.entries)
        .filter(it => it.category === 'Client Error');
}

/** Pass an exception to `XH.handleException()`, waiting for any report to reach the server. */
async function handleAsync(e: unknown, opts?: ExceptionHandlerOptions): Promise<HoistException> {
    XH.handleException(e, opts);
    await flushReportsAsync();
    return dialogModel().exception ?? (e as HoistException);
}

/** Wait for reports sent so far to reach the server. */
async function flushReportsAsync() {
    const logOnServer = vi.mocked(XH.exceptionHandler.logOnServerAsync);
    await Promise.all(logOnServer.mock.results.map(it => it.value));
}

/** Answer GET `test/data` with the given response, for the current test. */
function respondWith(response: () => Response) {
    server.use(http.get(xhUrl('test/data'), response), http.post(xhUrl('test/data'), response));
}

/** Fetch `test/data` as JSON, returning the exception it rejects with. */
async function fetchFailureAsync(): Promise<HoistException> {
    return XH.fetchJson({url: 'test/data'}).then(
        () => {
            throw new Error('Expected the fetch to fail');
        },
        e => e
    );
}
