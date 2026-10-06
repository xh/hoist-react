/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Exception} from '@xh/hoist/exception';
import {describe, expect, it} from 'vitest';

/**
 * The factory behind `XH.exception()`, `throwIf()` and every error that FetchService builds.
 * ExceptionHandler, FetchService and Promise.track branch on the flags it sets and on whether a
 * stack is present, so its output shape is a contract across the whole error path.
 */
describe('Exception', () => {
    describe('create', () => {
        it('creates an Error from a message string', () => {
            const e = Exception.create('Grid not ready');

            expect(e).toBeInstanceOf(Error);
            expect(e.message).toBe('Grid not ready');
            expect(e.name).toBe('Exception');
            expect(e.isHoistException).toBe(true);
            expect(e.isRoutine).toBe(false);
            // 66.1.1 (27ecbe87c) fixed the message missing from the underlying Error and its stack.
            expect(e.stack).toContain('Grid not ready');
        });

        it('creates an Error from a config object, with its properties over the defaults', () => {
            const e = Exception.create({message: 'Bad input', isRoutine: true, fieldName: 'qty'});

            expect(e).toBeInstanceOf(Error);
            expect(e.message).toBe('Bad input');
            expect(e.name).toBe('Exception');
            expect(e.isRoutine).toBe(true);
            expect(e.fieldName).toBe('qty');

            expect(Exception.create({name: 'ValidationException'}).message).toBe(
                'An unknown error occurred'
            );
        });

        it('enhances a native Error in place, keeping its name and stack', () => {
            const src = new TypeError('x is undefined'),
                {stack} = src,
                e = Exception.create(src);

            expect(e).toBe(src);
            expect(e.name).toBe('TypeError');
            expect(e.stack).toBe(stack);
            expect(e.isHoistException).toBe(true);
            expect(e.isRoutine).toBe(false);
        });

        it('returns an existing HoistException unchanged', () => {
            // `throwIf(cond, XH.exception({...}))` passes a built exception back through create().
            const src = Exception.create({message: 'Session expired', isRoutine: true});

            expect(Exception.create(src)).toBe(src);
            expect(src.isRoutine).toBe(true);
        });

        it.each([0, 404, 500])('drops the stack for HTTP status %i', httpStatus => {
            // A client-side stack only misleads for an error the server reported.
            const e = Exception.create({message: 'Request failed', httpStatus});

            expect(e.stack).toBeUndefined();
            expect(e.httpStatus).toBe(httpStatus);
        });
    });

    describe('timeout', () => {
        it.each([
            [5000, 'Timed out after 5secs'],
            [30_003, 'Timed out after 30secs'],
            [1500, 'Timed out after 1500ms'],
            [5250, 'Timed out after 5250ms']
        ])('describes an interval of %i ms as "%s"', (interval, message) => {
            // Near-whole seconds count as whole, since waitFor() reports the elapsed time it saw.
            expect(Exception.timeout({interval}).message).toBe(message);
        });

        it('creates a stackless timeout exception that takes a custom message', () => {
            const e = Exception.timeout({interval: 10_000, message: 'Report took too long'});

            expect(e).toBeInstanceOf(Error);
            expect(e.name).toBe('Timeout Exception');
            expect(e.message).toBe('Report took too long');
            expect(e.isTimeout).toBe(true);
            expect(e.interval).toBe(10_000);
            expect(e.isHoistException).toBe(true);
            expect(e.stack).toBeUndefined();
        });
    });
});
