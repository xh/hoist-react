/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {TaskObserver, XH} from '@xh/hoist/core';
import {autorun, observable} from '@xh/hoist/mobx';
import {debouncePromise, never, resolve, wait, waitFor} from '@xh/hoist/promise';
import {MINUTES, SECONDS} from '@xh/hoist/utils/datetime';
import {describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * Hoist's Promise extensions sit under nearly every async call in an app: `catchDefault()` reports
 * errors, `track()` records activity, `linkTo()` drives load masks, and `timeout()` bounds every
 * fetch. These tests pin the contracts apps rely on, including several that have broken before.
 */
describe('Promise', () => {
    describe('timeout', () => {
        it('resolves with the value of a promise that settles in time', async () => {
            vi.useFakeTimers();
            const result = wait(1 * SECONDS)
                .then(() => 'loaded')
                .timeout(5 * SECONDS);

            await vi.advanceTimersByTimeAsync(5 * SECONDS);
            await expect(result).resolves.toBe('loaded');
        });

        it('rejects with a timeout exception if the promise does not settle in time', async () => {
            vi.useFakeTimers();
            const result = never().timeout({interval: 5 * SECONDS, message: 'Too slow'});
            const assertion = expect(result).rejects.toMatchObject({
                isTimeout: true,
                interval: 5 * SECONDS,
                message: 'Too slow'
            });

            await vi.advanceTimersByTimeAsync(5 * SECONDS);
            await assertion;
        });

        it('passes through an earlier rejection unchanged', async () => {
            vi.useFakeTimers();
            const error = new Error('Server error'),
                result = wait(1 * SECONDS)
                    .then(() => Promise.reject(error))
                    .timeout(5 * SECONDS);
            const assertion = expect(result).rejects.toBe(error);

            await vi.advanceTimersByTimeAsync(5 * SECONDS);
            await assertion;
        });
    });

    describe('waitFor', () => {
        it('rejects with a timeout exception if the condition is never met', async () => {
            // Fixed in v54 (791a0bfe1) - the timeout was first thrown inside a setTimeout callback,
            // so the promise never settled.
            vi.useFakeTimers();
            const result = waitFor(() => false, {timeout: 1 * SECONDS}),
                assertion = expect(result).rejects.toMatchObject({isTimeout: true});

            await vi.advanceTimersByTimeAsync(2 * SECONDS);
            await assertion;
        });

        it('waits indefinitely for the condition when timeout is null', async () => {
            // Null timeout support added in v76.2 (b9a9ea0c9).
            vi.useFakeTimers();
            let ready = false,
                settled = false;
            const result = waitFor(() => ready, {interval: 1 * SECONDS, timeout: null}).finally(
                () => (settled = true)
            );

            await vi.advanceTimersByTimeAsync(10 * MINUTES);
            expect(settled).toBe(false);

            ready = true;
            await vi.advanceTimersByTimeAsync(1 * SECONDS);
            await expect(result).resolves.toBeUndefined();
        });
    });

    describe('debouncePromise', () => {
        it('makes one call with the latest args, shared by all calls within the wait', async () => {
            // Backs the queryBuffer of async Select inputs, called on each keystroke.
            vi.useFakeTimers();
            const queryFn = vi.fn(async (query: string) => `results for ${query}`),
                debounced = debouncePromise(queryFn, 100);

            const first = debounced('a');
            await vi.advanceTimersByTimeAsync(60);
            const second = debounced('ab');
            await vi.advanceTimersByTimeAsync(60);
            const third = debounced('abc');
            expect(second).toBe(first);
            expect(third).toBe(first);

            await vi.advanceTimersByTimeAsync(99);
            expect(queryFn).not.toHaveBeenCalled();

            await vi.advanceTimersByTimeAsync(1);
            expect(queryFn).toHaveBeenCalledExactlyOnceWith('abc');
            await expect(first).resolves.toBe('results for abc');
        });

        it.each([
            ['throws', () => throwError('Query failed')],
            ['rejects', async () => throwError('Query failed')]
        ])('rejects all calls within the wait when the function %s', async (_, impl) => {
            vi.useFakeTimers();
            const debounced = debouncePromise(impl, 100),
                assertions = [debounced(), debounced()].map(p =>
                    expect(p).rejects.toThrow('Query failed')
                );

            await vi.advanceTimersByTimeAsync(100);
            await Promise.all(assertions);
        });
    });

    describe('catchWhen', () => {
        it('handles errors that match a name, list of names, or predicate', async () => {
            const error = Object.assign(new Error('Bad JSON'), {name: 'SyntaxError'}),
                handler = (e: Error) => `handled ${e.name}`;

            await expect(Promise.reject(error).catchWhen('SyntaxError', handler)).resolves.toBe(
                'handled SyntaxError'
            );
            await expect(
                Promise.reject(error).catchWhen(['TypeError', 'SyntaxError'], handler)
            ).resolves.toBe('handled SyntaxError');
            await expect(
                Promise.reject(error).catchWhen((e: Error) => e.message === 'Bad JSON', handler)
            ).resolves.toBe('handled SyntaxError');

            // With no handler, a matching error is swallowed.
            await expect(Promise.reject(error).catchWhen('SyntaxError')).resolves.toBeUndefined();
        });

        it('rethrows errors that do not match, unchanged', async () => {
            const error = new TypeError('Not a function'),
                handler = vi.fn();

            await expect(Promise.reject(error).catchWhen('SyntaxError', handler)).rejects.toBe(
                error
            );
            await expect(Promise.reject(error).catchWhen(() => false, handler)).rejects.toBe(error);
            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('catchDefault', () => {
        it('passes a rejection to XH.handleException with its options, then resolves', async () => {
            const handleException = vi.spyOn(XH, 'handleException').mockImplementation(() => {}),
                error = new Error('Save failed');

            const result = await Promise.reject(error).catchDefault({alertType: 'toast'});

            expect(result).toBeUndefined();
            expect(handleException).toHaveBeenCalledExactlyOnceWith(error, {alertType: 'toast'});
        });
    });

    describe('catchDefaultWhen', () => {
        it('passes only matching errors to XH.handleException, rethrowing others', async () => {
            const handleException = vi.spyOn(XH, 'handleException').mockImplementation(() => {}),
                aborted = Object.assign(new Error('Aborted'), {name: 'AbortError'}),
                failed = new Error('Save failed'),
                isAbort = (e: Error) => e.name === 'AbortError';

            await expect(
                Promise.reject(aborted).catchDefaultWhen(isAbort, {showAlert: false})
            ).resolves.toBeUndefined();
            await expect(
                Promise.reject(failed).catchDefaultWhen(isAbort, {showAlert: false})
            ).rejects.toBe(failed);
            expect(handleException).toHaveBeenCalledExactlyOnceWith(aborted, {showAlert: false});
        });
    });

    describe('track', () => {
        it('tracks a resolved promise with its start time and elapsed time', async () => {
            // Fixed in v73 (3a60f0973) - severity was reversed, tracking successes as errors.
            vi.useFakeTimers();
            const track = vi.spyOn(XH, 'track').mockImplementation(() => {}),
                start = Date.now(),
                result = wait(1500)
                    .then(() => 'loaded')
                    .track({category: 'Portfolio', message: 'Loaded portfolio'});

            await vi.advanceTimersByTimeAsync(1500);

            await expect(result).resolves.toBe('loaded');
            expect(track).toHaveBeenCalledExactlyOnceWith({
                category: 'Portfolio',
                message: 'Loaded portfolio',
                timestamp: start,
                elapsed: 1500
            });
        });

        it('tracks a rejected promise as an error, and still rejects', async () => {
            const track = vi.spyOn(XH, 'track').mockImplementation(() => {}),
                error = XH.exception({message: 'Portfolio not found', correlationId: 'abc-123'});

            const result = Promise.reject(error).track({
                message: 'Loaded portfolio',
                data: {portfolioId: 7}
            });

            await expect(result).rejects.toBe(error);
            expect(track).toHaveBeenCalledExactlyOnceWith(
                expect.objectContaining({
                    message: 'Loaded portfolio',
                    severity: 'ERROR',
                    correlationId: 'abc-123',
                    data: {
                        error: expect.objectContaining({message: 'Portfolio not found'}),
                        data: {portfolioId: 7}
                    }
                })
            );
        });

        it('does not track a routine exception', async () => {
            // Fixed in v74 (3cf737fdb) - routine exceptions such as auto-aborted fetches were tracked.
            const track = vi.spyOn(XH, 'track').mockImplementation(() => {}),
                error = XH.exception({message: 'Fetch aborted', isRoutine: true});

            await expect(Promise.reject(error).track('Loaded portfolio')).rejects.toBe(error);
            expect(track).not.toHaveBeenCalled();
        });

        it('omits the elapsed time when an interactive re-login happened mid-call', async () => {
            // Time spent on user input during a re-login would skew the reported timing.
            vi.useFakeTimers();
            const track = vi.spyOn(XH, 'track').mockImplementation(() => {}),
                acm = XH.appContainerModel,
                prevRelogin = acm.lastRelogin,
                start = Date.now(),
                result = wait(10 * SECONDS).track('Loaded portfolio');
            onTestFinished(() => {
                acm.lastRelogin = prevRelogin;
            });

            acm.lastRelogin = {started: start + 1 * SECONDS, completed: start + 8 * SECONDS};
            await vi.advanceTimersByTimeAsync(10 * SECONDS);
            await result;
            expect(track).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({elapsed: null}));
        });
    });

    describe('linkTo', () => {
        // TaskObserver.spec.ts covers how a linked promise drives an observer.
        it('skips linking when given no observer, or when omit is true or returns true', async () => {
            // LoadSupport links a null observer for auto-refreshes, so they do not mask.
            let finishLoad: () => void;
            const observer = TaskObserver.trackLast(),
                load = new Promise<void>(resolve => (finishLoad = resolve));

            load.linkTo(null);
            load.linkTo({observer, omit: true});
            load.linkTo({observer, omit: () => true});
            expect(observer.isPending).toBe(false);

            load.linkTo({observer, omit: () => false});
            expect(observer.isPending).toBe(true);

            finishLoad();
            await load;
        });
    });

    describe('thenAction', () => {
        it('runs its callback as a MobX action', async () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {}),
                count = observable.box(0);
            onTestFinished(autorun(() => count.get()));

            // Control - a plain then() trips MobX strict mode when it changes observed state.
            await resolve(1).then(v => count.set(v));
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('[MobX]'));
            warn.mockClear();

            await resolve(2).thenAction(v => count.set(v));
            expect(warn).not.toHaveBeenCalled();
            expect(count.get()).toBe(2);
        });
    });
});

//------------------------
// Helpers
//------------------------
function throwError(message: string): never {
    throw new Error(message);
}
