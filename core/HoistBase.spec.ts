/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistBase} from '@xh/hoist/core';
import {bindable, observable} from '@xh/hoist/mobx';
import {describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * HoistBase's managed MobX subscriptions and cleanup. Every Hoist model, service and store wires
 * itself to observable state with addReaction() and addAutorun(), then relies on destroy() to tear
 * it down. A break here silently changes when app code runs, or leaves it running after its owner
 * is gone.
 */
describe('HoistBase', () => {
    describe('addReaction', () => {
        it('runs when the tracked value changes, passing the new and previous values', () => {
            const model = autoDestroy(new TestModel()),
                calls = [];
            model.addReaction({
                track: () => model.x,
                run: (x, prevX) => calls.push([x, prevX, model.y])
            });

            model.y = 1; // Read only by run, so not tracked.
            expect(calls).toEqual([]);

            model.x = 1;
            expect(calls).toEqual([[1, 0, 1]]);
        });

        it('runs at once with fireImmediately', () => {
            const model = autoDestroy(new TestModel()),
                run = vi.fn();
            model.addReaction({track: () => model.x, run, fireImmediately: true});

            expect(run).toHaveBeenCalledOnce();
            expect(run.mock.lastCall[0]).toBe(0);
        });

        it('runs only once, when the predicate first passes, with when', () => {
            const model = autoDestroy(new TestModel()),
                run = vi.fn();
            model.addReaction({when: () => model.x > 1, run});

            model.x = 1;
            expect(run).not.toHaveBeenCalled();

            model.x = 2;
            model.x = 0;
            model.x = 3;
            expect(run).toHaveBeenCalledOnce();
        });

        it.each([
            ['identity', 2],
            ['shallow', 1],
            ['structural', 1]
        ] as const)('compares tracked values with the %s comparer', (equals, runCount) => {
            const model = autoDestroy(new TestModel()),
                run = vi.fn();
            // Returns a new array on each evaluation, with the same content for x = 1 and x = 2.
            model.addReaction({track: () => [Math.sign(model.x)], run, equals});

            model.x = 1;
            model.x = 2;
            expect(run).toHaveBeenCalledTimes(runCount);
        });

        it.each([
            ['both track and when', {track: () => 1, when: () => true}, "either 'track' or 'when'"],
            ['neither track nor when', {}, "either 'track' or 'when'"],
            ['runImmediately', {track: () => 1, runImmediately: true}, 'Did you mean'],
            ['an unknown comparer', {track: () => 1, equals: 'deep'}, 'Unknown value for equals']
        ])('throws for a spec with %s, rather than ignoring it', (_, spec, error) => {
            const model = autoDestroy(new TestModel());
            expect(() => model.addReaction({run: () => {}, ...spec} as any)).toThrow(error);
        });

        it('binds run to its owner', () => {
            class Model extends TestModel {
                onXChange(x: number) {
                    this.y = x * 10;
                }
            }
            const model = autoDestroy(new Model());
            model.addReaction({track: () => model.x, run: model.onXChange});

            model.x = 2;
            expect(model.y).toBe(20);
        });

        // E.g. ViewManagerModel passes several specs, some of them conditionally null.
        it('adds several specs at once, skipping nulls, with a disposer for each', () => {
            const model = autoDestroy(new TestModel()),
                runX = vi.fn(),
                runY = vi.fn(),
                specX = {track: () => model.x, run: runX},
                specY = {track: () => model.y, run: runY},
                disposers = model.addReaction(specX, null, specY);
            expect(disposers[1]).toBeNull();

            disposers[0]();
            model.x = 1;
            model.y = 1;
            expect(runX).not.toHaveBeenCalled();
            expect(runY).toHaveBeenCalledOnce();
        });

        it('debounces run, calling it once with the latest value', async () => {
            vi.useFakeTimers();
            const model = autoDestroy(new TestModel()),
                run = vi.fn();
            model.addReaction({track: () => model.x, run, debounce: 300});

            model.x = 1;
            model.x = 2;
            model.x = 3;
            await vi.advanceTimersByTimeAsync(299);
            expect(run).not.toHaveBeenCalled();

            await vi.advanceTimersByTimeAsync(1);
            expect(run).toHaveBeenCalledOnce();
            expect(run.mock.lastCall[0]).toBe(3);
        });

        it('accepts a debounce spec with lodash options', async () => {
            vi.useFakeTimers();
            const model = autoDestroy(new TestModel()),
                run = vi.fn();
            model.addReaction({track: () => model.x, run, debounce: {interval: 50, leading: true}});

            model.x = 1;
            expect(run).toHaveBeenCalledOnce();

            model.x = 2;
            model.x = 3;
            await vi.advanceTimersByTimeAsync(50);
            expect(run).toHaveBeenCalledTimes(2);
            expect(run.mock.lastCall[0]).toBe(3);
        });

        // MobX runs reaction effects in an action, but a debounced run fires later from a timer.
        it('calls a debounced run in an action', async () => {
            vi.useFakeTimers();
            const model = autoDestroy(new TestModel()),
                warn = vi.spyOn(console, 'warn');
            model.addAutorun(() => model.plain); // MobX only enforces actions for observed state.
            model.addReaction({
                track: () => model.x,
                run: x => {
                    model.plain = x;
                },
                debounce: 10
            });

            model.x = 1;
            await vi.advanceTimersByTimeAsync(10);
            expect(model.plain).toBe(1);
            expect(warn).not.toHaveBeenCalled();
        });
    });

    describe('addAutorun', () => {
        it('binds run to its owner, whether given a function or a spec', () => {
            class Model extends TestModel {
                syncY() {
                    this.y = this.x * 10;
                }
            }
            const fnModel = autoDestroy(new Model()),
                specModel = autoDestroy(new Model());
            fnModel.addAutorun(fnModel.syncY);
            specModel.addAutorun({run: specModel.syncY});

            fnModel.x = 2;
            specModel.x = 3;
            expect(fnModel.y).toBe(20);
            expect(specModel.y).toBe(30);
        });
    });

    describe('destroy', () => {
        it('disposes reactions and autoruns', () => {
            const model = new TestModel(),
                runReaction = vi.fn(),
                runAutorun = vi.fn(() => model.x);
            model.addReaction({track: () => model.x, run: runReaction});
            model.addAutorun(runAutorun);

            model.destroy();
            model.x = 1;

            expect(runReaction).not.toHaveBeenCalled();
            expect(runAutorun).toHaveBeenCalledOnce();
        });

        // BUG: core/HoistBase.ts:404-405 - bindAndDebounce never cancels the debounced run, and
        // destroy() only disposes the MobX reaction, so a run pending at destroy still fires. A
        // common case is `run: () => this.loadAsync(), debounce: 300` on a model just unmounted.
        it.fails('cancels a pending debounced reaction run', async () => {
            vi.useFakeTimers();
            const model = new TestModel(),
                run = vi.fn();
            model.addReaction({track: () => model.x, run, debounce: 300});

            model.x = 1;
            model.destroy();
            await vi.advanceTimersByTimeAsync(300);

            expect(run).not.toHaveBeenCalled();
        });

        // Fixed in v79 (#4168): a cycle of managed references overflowed the stack on destroy.
        it('runs only once, even when managed references form a cycle', () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {}); // Repeat calls log a warning.
            const a = new TestModel(),
                b = new TestModel(),
                resource = {destroy: vi.fn()};
            a.markManaged(b);
            b.markManaged(a);
            a.markManaged(resource);

            a.destroy();
            a.destroy();

            expect(b.isDestroyed).toBe(true);
            expect(resource.destroy).toHaveBeenCalledOnce();
        });
    });

    describe('markManaged', () => {
        it('returns the object, and destroys it with its owner', () => {
            const owner = new TestModel(),
                child = new TestModel();

            expect(owner.markManaged(child)).toBe(child);
            expect(child.isDestroyed).toBe(false);

            owner.destroy();
            expect(child.isDestroyed).toBe(true);
        });

        // E.g. an object created by an async load that completes after its owner was destroyed.
        it('destroys the object at once if its owner is already destroyed', () => {
            const owner = new TestModel(),
                child = new TestModel();
            owner.destroy();

            owner.markManaged(child);
            expect(child.isDestroyed).toBe(true);
        });
    });
});

//------------------
// Helpers
//------------------
class TestModel extends HoistBase {
    @bindable accessor x = 0;
    @bindable accessor y = 0;
    // Unlike a @bindable, assignment is not wrapped in an action.
    @observable accessor plain = 0;
}

/** Destroy an object when the current test finishes, unless the test already did. */
function autoDestroy<T extends HoistBase>(obj: T): T {
    onTestFinished(() => {
        if (!obj.isDestroyed) obj.destroy();
    });
    return obj;
}
