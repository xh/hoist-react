/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {DND_PLUGINS, DND_SENSORS, dndPlugins} from '@xh/hoist/cmp/sortablelist/impl/DndDefaults';
import {AutoScroller, PointerActivationConstraints} from '@xh/hoist/kit/dnd-kit';
import {describe, expect, it} from 'vitest';

/**
 * Every Hoist list starts a drag the same way: a short hold lifts the item, as the cue that it is
 * held, and a mouse that moves first starts it at once. Touch waits for the hold, so a finger can
 * still scroll the list.
 */
describe('DND_SENSORS', () => {
    const constraintsFor = (pointerType: string) => {
        const [pointer] = DND_SENSORS as any[];
        return pointer.options.activationConstraints({pointerType});
    };

    it('starts a mouse drag on a 200ms hold or 4px of movement, whichever comes first', () => {
        const [hold, move] = constraintsFor('mouse');
        expect(hold).toBeInstanceOf(PointerActivationConstraints.Delay);
        expect(hold.options).toEqual({value: 200, tolerance: 5});
        expect(move).toBeInstanceOf(PointerActivationConstraints.Distance);
        expect(move.options).toEqual({value: 4});
    });

    it('starts a touch drag only on the hold', () => {
        const constraints = constraintsFor('touch');
        expect(constraints).toHaveLength(1);
        expect(constraints[0]).toBeInstanceOf(PointerActivationConstraints.Delay);
    });
});

/** Hoist's auto-scroll runs slower than dnd-kit's default acceleration of 25. */
describe('dndPlugins', () => {
    const acceleration = (plugins: any[]) =>
        plugins.find(it => it.plugin === AutoScroller)?.options.acceleration;

    it('sets the auto-scroll acceleration, defaulting to 15', () => {
        expect(acceleration(DND_PLUGINS as any[])).toBe(15);
        expect(acceleration(dndPlugins(8) as any[])).toBe(8);
    });
});
