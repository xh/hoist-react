/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {withDebug, withInfo} from '@xh/hoist/utils/js';
import {describe, expect, it, vi} from 'vitest';

/**
 * Timed logging wrappers. Every HoistBase `withInfo()` / `withDebug()` delegate and the Runner
 * chain go through these, and service install wraps each `initAsync()` in `withDebug()`. They must
 * hand back exactly what the wrapped function returns or throws, at every log level, or failures
 * would be lost.
 */
describe('LogUtils', () => {
    describe('withInfo', () => {
        it('returns a promise as-is, logging its elapsed time once it resolves', async () => {
            vi.useFakeTimers();
            const log = vi.spyOn(console, 'log').mockImplementation(() => {}),
                promise = new Promise(resolve => setTimeout(() => resolve(42), 250));

            const ret = withInfo('Loaded positions', () => promise, 'PositionService');
            expect(ret).toBe(promise);
            expect(log).not.toHaveBeenCalled();

            await vi.advanceTimersByTimeAsync(250);
            expect(log).toHaveBeenCalledOnce();
            expect(log.mock.calls[0]).toEqual(
                expect.arrayContaining(['[PositionService]', 'Loaded positions', '250ms'])
            );
        });

        it('logs a rejection, and passes it through to the caller', async () => {
            const log = vi.spyOn(console, 'log').mockImplementation(() => {}),
                err = new Error('Feed down');

            await expect(withInfo('Loading quotes', () => Promise.reject(err))).rejects.toBe(err);
            expect(log).toHaveBeenCalledOnce();
            expect(log.mock.calls[0]).toEqual(
                expect.arrayContaining(['Loading quotes', 'failed - Feed down', err])
            );
        });

        it('rethrows an error thrown synchronously', () => {
            vi.spyOn(console, 'log').mockImplementation(() => {});
            const err = new Error('Bad config');

            expect(() =>
                withInfo('Parsing config', () => {
                    throw err;
                })
            ).toThrow(err);
        });
    });

    describe('withDebug', () => {
        it('runs the function without logging at the default info level', () => {
            const debug = vi.spyOn(console, 'debug'),
                promise = Promise.resolve();

            expect(withDebug('Initializing', () => promise)).toBe(promise);
            expect(debug).not.toHaveBeenCalled();
        });
    });
});
