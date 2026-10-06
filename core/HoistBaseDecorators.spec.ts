/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistBase, managed} from '@xh/hoist/core';
import {observableRef} from '@xh/hoist/mobx';
import {describe, expect, it} from 'vitest';

/**
 * `@managed`, which ties the child objects a HoistBase creates to its lifecycle. Most models hold
 * their child models this way, and a failure leaks them silently. It depends on how the compiler
 * runs TC39 decorators for each kind of property, so these tests also guard the toolchain.
 * `@persist` is covered in HoistBasePersist.spec.ts.
 */
describe('managed', () => {
    // Broke in the v88 TC39 migration (e213e2ce9): fields registered via addInitializer, which the
    // compiler did not reliably call for field decorators.
    it('destroys values held by fields, accessors and getters', () => {
        class Owner extends HoistBase {
            @managed field = new Child();
            @managed @observableRef accessor accessorField = new Child();
            children = [new Child(), new Child()];

            // A getter returning an array, like FormModel.fieldList.
            @managed get getter() {
                return this.children;
            }
        }
        const owner = new Owner(),
            {field, accessorField, children} = owner;

        owner.destroy();

        expect(field.isDestroyed).toBe(true);
        expect(accessorField.isDestroyed).toBe(true);
        expect(children.map(c => c.isDestroyed)).toEqual([true, true]);
    });

    it('destroys a value set in the constructor, and skips an empty field', () => {
        class Owner extends HoistBase {
            @managed child: Child;
            @managed unset: Child = null;

            constructor() {
                super();
                this.child = new Child();
            }
        }
        const owner = new Owner(),
            {child} = owner;

        owner.destroy();

        expect(child.isDestroyed).toBe(true);
    });

    // Each class registers its managed field names on its own prototype, copying those of its
    // superclass, when its first instance is created.
    it.each([
        ['superclass', true],
        ['subclass', false]
    ])('registers fields per class when a %s is created first', (_, baseFirst) => {
        class Base extends HoistBase {
            @managed a = new Child();
        }
        class Owner extends Base {
            @managed b = new Child();
        }
        // A sibling subclass holding a `b` that it does not own.
        class Borrower extends Base {
            b: Child;
            constructor(b: Child) {
                super();
                this.b = b;
            }
        }
        let base: Base, owner: Owner;
        if (baseFirst) {
            base = new Base();
            owner = new Owner();
        } else {
            owner = new Owner();
            base = new Base();
        }
        const borrowed = new Child(),
            borrower = new Borrower(borrowed);

        [base, owner, borrower].forEach(m => m.destroy());

        expect(base.a.isDestroyed).toBe(true);
        expect(owner.a.isDestroyed).toBe(true);
        expect(owner.b.isDestroyed).toBe(true);
        expect(borrower.a.isDestroyed).toBe(true);
        expect(borrowed.isDestroyed).toBe(false);
    });
});

//------------------
// Helpers
//------------------
class Child extends HoistBase {}
