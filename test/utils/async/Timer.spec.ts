/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {never, wait} from '@xh/hoist/promise';
import {hoistCore, initTestAppAsync} from '@xh/hoist/test';
import {Timer, type TimerSpec} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {beforeAll, beforeEach, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * Timer drives Hoist's own background work - environment polling, websocket heartbeats, idle
 * detection, auto-refresh - and the recurring tasks apps create. These tests pin the guarantees
 * that work relies on: runs never overlap, a failing or hung run does not stop the timer, pauses
 * and delays are honored, and a cancelled timer stays stopped.
 *
 * Timer's heartbeat is coarse (250ms or 1s), so tests assert at checkpoints at least one
 * heartbeat away from when a run is due.
 */
describe('Timer', () => {
    beforeAll(async () => {
        hoistCore.configs.testPollSecs = 2;
        await initTestAppAsync();
        // Stop the timers Hoist's services start on boot, so each test runs only its own timer.
        Timer.cancelAll();
    });

    beforeEach(() => {
        vi.useFakeTimers();
    });

    function createTimer(spec: TimerSpec): Timer {
        const timer = Timer.create(spec);
        onTestFinished(() => timer.cancel());
        return timer;
    }

    const advanceAsync = (ms: number) => vi.advanceTimersByTimeAsync(ms);

    describe('scheduling', () => {
        it('runs right away, then again each time the interval elapses', async () => {
            // Fixed in v20 (cd384dd01) - a runFn that returned no promise broke the timer.
            const runFn = vi.fn(),
                error = vi.spyOn(console, 'error');
            createTimer({runFn, interval: 5 * SECONDS});

            await advanceAsync(1);
            expect(runFn).toHaveBeenCalledOnce();

            await advanceAsync(4 * SECONDS);
            expect(runFn).toHaveBeenCalledOnce();

            await advanceAsync(2 * SECONDS);
            expect(runFn).toHaveBeenCalledTimes(2);
            expect(error).not.toHaveBeenCalled();
        });

        it.each([
            {delay: true, firstRunMs: 30 * SECONDS},
            {delay: 5 * SECONDS, firstRunMs: 5 * SECONDS}
        ])('delays its first run by $firstRunMs ms when delay is $delay', async spec => {
            const {delay, firstRunMs} = spec,
                runFn = vi.fn();
            // A numeric delay is always in ms, whatever the interval units.
            createTimer({runFn, interval: 30, intervalUnits: SECONDS, delay});

            await advanceAsync(firstRunMs - 1);
            expect(runFn).not.toHaveBeenCalled();

            await advanceAsync(2 * SECONDS);
            expect(runFn).toHaveBeenCalledOnce();
        });

        it('starts at once when delay is true but the interval is disabled', () => {
            // Fixed in 89.0.0 - the delay took the negative interval, a negative setTimeout.
            const setTimeout = vi.spyOn(globalThis, 'setTimeout');
            createTimer({runFn: vi.fn(), interval: -1, delay: true});

            expect(setTimeout).toHaveBeenCalledOnce();
            expect(setTimeout.mock.lastCall[1]).toBe(0);
        });

        it('re-evaluates a function interval as its value changes', async () => {
            let interval = 10 * SECONDS;
            const runFn = vi.fn();
            createTimer({runFn, interval: () => interval});

            await advanceAsync(1);
            interval = 2 * SECONDS;

            await advanceAsync(3 * SECONDS);
            expect(runFn).toHaveBeenCalledTimes(2);
        });

        it('reads its interval from the app config named by a string interval', async () => {
            const runFn = vi.fn();
            createTimer({runFn, interval: 'testPollSecs', intervalUnits: SECONDS});

            await advanceAsync(1 * SECONDS);
            expect(runFn).toHaveBeenCalledOnce();

            await advanceAsync(3 * SECONDS);
            expect(runFn).toHaveBeenCalledTimes(2);
        });

        it('clamps an interval below 500ms to 500ms, warning only once', async () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {}),
                runTimes: number[] = [];
            createTimer({runFn: () => runTimes.push(Date.now()), interval: 100});

            await advanceAsync(5 * SECONDS);
            expect(runTimes.length).toBeGreaterThan(2);
            runTimes.slice(1).forEach((time, idx) => {
                expect(time - runTimes[idx]).toBeGreaterThanOrEqual(500);
            });
            expect(warn).toHaveBeenCalledOnce();
        });
    });

    describe('setInterval', () => {
        it.each([0, -1])('pauses at an interval of %i and resumes when set positive', async val => {
            const runFn = vi.fn(),
                timer = createTimer({runFn, interval: 1 * SECONDS});
            await advanceAsync(1);

            timer.setInterval(val);
            await advanceAsync(10 * SECONDS);
            expect(runFn).toHaveBeenCalledOnce();

            timer.setInterval(1 * SECONDS);
            await advanceAsync(1 * SECONDS);
            expect(runFn).toHaveBeenCalledTimes(2);
        });
    });

    describe('runFn', () => {
        it('never overlaps, starting each run a full interval after the last one ends', async () => {
            const starts: number[] = [],
                ends: number[] = [];
            createTimer({
                runFn: async () => {
                    starts.push(Date.now());
                    await wait(3 * SECONDS);
                    ends.push(Date.now());
                },
                interval: 1 * SECONDS
            });

            await advanceAsync(20 * SECONDS);
            expect(starts.length).toBeGreaterThan(2);
            starts.slice(1).forEach((start, idx) => {
                expect(start - ends[idx]).toBeGreaterThanOrEqual(1 * SECONDS);
            });
        });

        it.each([
            ['throws', () => throwError()],
            ['rejects', async () => throwError()]
        ])('keeps running after its runFn %s, logging the error', async (_, impl) => {
            const error = vi.spyOn(console, 'error').mockImplementation(() => {}),
                runFn = vi.fn(impl);
            createTimer({runFn, interval: 1 * SECONDS});

            await advanceAsync(3 * SECONDS);
            expect(runFn.mock.calls.length).toBeGreaterThan(1);
            expect(error).toHaveBeenCalled();
        });

        it('abandons a run that exceeds its timeout, then runs again', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            const runFn = vi.fn(() => never()),
                timer = createTimer({runFn, interval: 1 * SECONDS, timeout: 5 * SECONDS});

            await advanceAsync(4 * SECONDS);
            expect(runFn).toHaveBeenCalledOnce();
            expect(timer.isRunning).toBe(true);

            await advanceAsync(3 * SECONDS);
            expect(runFn).toHaveBeenCalledTimes(2);
        });
    });

    describe('cancel', () => {
        it('never runs again once cancelled, even when cancelled mid-run', async () => {
            let finishRun: () => void;
            const runFn = vi.fn(() => new Promise<void>(resolve => (finishRun = resolve))),
                timer = createTimer({runFn, interval: 1 * SECONDS});
            await advanceAsync(1);

            timer.cancel();
            finishRun();
            await advanceAsync(10 * SECONDS);
            expect(runFn).toHaveBeenCalledOnce();
        });

        it('stops every timer on cancelAll', async () => {
            // XH.suspendApp() relies on this to halt all polling while the app is suspended.
            const runFns = [vi.fn(), vi.fn()];
            runFns.forEach(runFn => createTimer({runFn, interval: 1 * SECONDS}));
            await advanceAsync(1);

            Timer.cancelAll();
            await advanceAsync(10 * SECONDS);
            runFns.forEach(runFn => expect(runFn).toHaveBeenCalledOnce());
        });

        // Fixed in 89.0.0 - a cancelled timer kept its heartbeat, reading its interval forever.
        it('does no further work once destroyed', async () => {
            const interval = vi.fn(() => 1 * SECONDS),
                timer = createTimer({runFn: vi.fn(), interval});
            await advanceAsync(1);

            timer.destroy();
            interval.mockClear();
            await advanceAsync(10 * SECONDS);
            expect(interval).not.toHaveBeenCalled();
        });
    });
});

function throwError(): never {
    throw new Error('Task failed');
}
