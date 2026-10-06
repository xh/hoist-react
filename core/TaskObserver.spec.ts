/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {TaskObserver} from '@xh/hoist/core';
import {reaction} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {describe, expect, it, onTestFinished} from 'vitest';

/**
 * TaskObserver, which drives every load mask and progress message in Hoist apps. Masks render from
 * its observable `isPending` and `message`, so a bug here leaves a UI masked forever, or lets users
 * act on a view that is still loading.
 */
describe('TaskObserver', () => {
    describe('trackLast', () => {
        it('follows only the most recently linked task', async () => {
            const observer = TaskObserver.trackLast(),
                first = deferred(),
                second = deferred(),
                third = deferred();

            first.promise.linkTo(observer);
            second.promise.linkTo(observer);
            second.resolve();
            await wait();
            expect(observer.isPending).toBe(false);

            third.promise.linkTo(observer);
            first.resolve();
            await wait();
            expect(observer.isPending).toBe(true);
        });
    });

    describe('trackAll', () => {
        it('stays pending while any linked task is pending', async () => {
            const observer = TaskObserver.trackAll(),
                first = deferred(),
                second = deferred();

            first.promise.linkTo(observer);
            second.promise.linkTo(observer);
            expect(observer.pendingCount).toBe(2);

            first.resolve();
            await wait();
            expect(observer.isPending).toBe(true);
            expect(observer.pendingCount).toBe(1);

            second.resolve();
            await wait();
            expect(observer.isPending).toBe(false);
        });

        it('combines the state of child observers', async () => {
            // Mask and LoadingIndicator build one of these when bound to an array of observers.
            const gridTask = TaskObserver.trackLast(),
                chartTask = TaskObserver.trackLast({message: 'Loading chart...'}),
                observer = TaskObserver.trackAll({tasks: [gridTask, chartTask]}),
                gridLoad = deferred(),
                chartLoad = deferred();

            gridLoad.promise.linkTo(gridTask);
            chartLoad.promise.linkTo(chartTask);
            expect(observer.pendingCount).toBe(2);
            expect(observer.message).toBe('Loading chart...');

            chartLoad.resolve();
            await wait();
            expect(observer.isPending).toBe(true);

            gridLoad.resolve();
            await wait();
            expect(observer.isPending).toBe(false);
        });
    });

    describe('message', () => {
        it('shows the message of a pending task, falling back to its own', async () => {
            const observer = TaskObserver.trackAll({message: 'Loading...'}),
                load = deferred(),
                save = deferred();

            load.promise.linkTo(observer);
            expect(observer.message).toBe('Loading...');

            save.promise.linkTo({observer, message: 'Saving...'});
            expect(observer.message).toBe('Saving...');

            save.resolve();
            await wait();
            expect(observer.message).toBe('Loading...');
        });
    });

    describe('isPending', () => {
        it('notifies observers as a task starts and settles', async () => {
            const observer = TaskObserver.trackLast(),
                task = deferred(),
                seen: boolean[] = [];
            const dispose = reaction(
                () => observer.isPending,
                isPending => seen.push(isPending)
            );
            onTestFinished(() => dispose());

            task.promise.linkTo(observer);
            expect(seen).toEqual([true]);

            task.resolve();
            await wait();
            expect(seen).toEqual([true, false]);
        });

        it('ends when a linked task fails, without an unhandled rejection', async () => {
            // v88 (6be39da23, #4700) - every linked rejection was also reported as uncaught, even
            // when the caller handled it.
            const observer = TaskObserver.trackLast(),
                unhandled = captureUnhandledRejections();

            await Promise.reject(new Error('Save failed'))
                .linkTo(observer)
                .catch(() => {});
            await wait();

            expect(observer.isPending).toBe(false);
            expect(unhandled).toEqual([]);
        });
    });
});

//------------------
// Helpers
//------------------
function deferred() {
    let resolve: () => void;
    const promise = new Promise<void>(res => (resolve = res));
    return {promise, resolve};
}

/** Collect unhandled promise rejections raised until the end of the current test. */
function captureUnhandledRejections(): unknown[] {
    const ret: unknown[] = [],
        onRejection = (reason: unknown) => ret.push(reason);
    process.on('unhandledRejection', onRejection);
    onTestFinished(() => {
        process.off('unhandledRejection', onRejection);
    });
    return ret;
}
