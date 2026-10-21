/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistBase, PlainObject} from '@xh/hoist/core';
import {autorun, bindable, bindableRef} from '@xh/hoist/mobx';
import {isObservable} from 'mobx';
import {describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * `@bindable` and `@bindableRef` - observable properties with a generated `setXxx()` action, which
 * Hoist inputs call through `setBindable()` to write a bound value. Apps declare hundreds of these,
 * and the v88 move to TC39 decorators broke them twice in ways no type check could catch.
 */
describe('bindable', () => {
    it('makes a property observable, with a setter that setBindable() calls', () => {
        class TestModel extends HoistBase {
            @bindable accessor query = '';
        }
        const model = new TestModel(),
            seen = observe(() => model.query);

        model.setBindable('query', 'abc');

        expect(seen).toEqual(['', 'abc']);
    });

    // Broke in the v88 TC39 migration (e213e2ce9): MobX's accessor setter is not an action.
    it('allows direct assignment and setter calls outside an action', () => {
        class TestModel extends HoistBase {
            @bindable accessor query = '';
            @bindableRef accessor selection: PlainObject = null;
        }
        const model = new TestModel(),
            warn = vi.spyOn(console, 'warn');
        // MobX only enforces actions for observed state.
        observe(() => [model.query, model.selection]);

        model.query = 'abc';
        model.selection = {id: 1};
        model.setBindable('query', 'xyz');
        model.setBindable('selection', null);

        expect(model.query).toBe('xyz');
        expect(warn).not.toHaveBeenCalled();
    });

    // Broke in the v88 TC39 migration (e213e2ce9): a setter generated on a subclass shadowed the
    // explicit setter of its superclass, e.g. DashViewModel.setViewState().
    it('never replaces an explicit setter, including one inherited from a superclass', () => {
        class BaseModel extends HoistBase {
            @bindable accessor query = '';

            setQuery(query: string) {
                this.query = query.trim();
            }
        }
        class SubModel extends BaseModel {}

        const sub = new SubModel(),
            base = new BaseModel();
        sub.setBindable('query', ' abc ');
        base.setBindable('query', ' xyz ');

        expect(sub.query).toBe('abc');
        expect(base.query).toBe('xyz');
    });
});

describe('bindableRef', () => {
    it('stores objects by reference, where @bindable converts them to observables', () => {
        class TestModel extends HoistBase {
            @bindable accessor deep: PlainObject = null;
            @bindableRef accessor ref: PlainObject = null;
        }
        const model = new TestModel(),
            value = {a: 1};

        model.deep = value;
        model.ref = value;

        expect(model.ref).toBe(value);
        expect(model.deep).not.toBe(value);
        expect(isObservable(model.deep)).toBe(true);
    });
});

//------------------
// Helpers
//------------------
/** Observe an expression with an autorun, returning the values it produced. */
function observe<T>(fn: () => T): T[] {
    const ret: T[] = [];
    onTestFinished(
        autorun(() => {
            ret.push(fn());
        })
    );
    return ret;
}
