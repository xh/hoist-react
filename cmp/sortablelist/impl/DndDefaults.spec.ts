/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    DND_PLUGINS,
    DND_SENSORS,
    dndPlugins,
    ScopedDragStyles
} from '@xh/hoist/cmp/sortablelist/impl/DndDefaults';
import {
    AutoScroller,
    Cursor,
    PointerActivationConstraints,
    PreventSelection
} from '@xh/hoist/kit/dnd-kit';
import {afterEach, describe, expect, it, vi} from 'vitest';

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

/**
 * dnd-kit's Cursor and PreventSelection plugins add and remove page-wide `*` style rules on every
 * drag, forcing the browser to restyle and lay out the whole page - a stutter at each drag start
 * on a large dashboard. Hoist leaves them out, and scopes its drag styles to the dragged item's
 * container.
 */
describe('drag start cost', () => {
    const pluginOf = (it: any) => it?.plugin ?? it,
        marked = (el: Element) => el.classList.contains('xh-dnd-pointer-drag');

    function setup() {
        const handlers: Record<string, (e: any) => void> = {},
            manager = {
                monitor: {
                    addEventListener: (type: string, fn: (e: any) => void) => {
                        handlers[type] = fn;
                        return () => delete handlers[type];
                    }
                }
            },
            container = document.createElement('div'),
            element = container.appendChild(document.createElement('div')),
            operation = {source: {element}},
            removeAllRanges = vi.fn();
        vi.spyOn(document, 'getSelection').mockReturnValue({removeAllRanges} as any);
        const plugin = new ScopedDragStyles(manager as any),
            start = (nativeEvent: Event) => handlers.dragstart({operation, nativeEvent}),
            end = () => handlers.dragend({operation});
        return {plugin, handlers, container, removeAllRanges, start, end};
    }

    afterEach(() => vi.restoreAllMocks());

    it('leaves out the plugins that inject page-wide style rules', () => {
        const plugins = (DND_PLUGINS as any[]).map(pluginOf);
        expect(plugins).not.toContain(Cursor);
        expect(plugins).not.toContain(PreventSelection);
        expect(plugins).toContain(ScopedDragStyles);
    });

    it('clears text selection from drag start until drag end', () => {
        const {removeAllRanges, start, end} = setup();

        start(new MouseEvent('pointermove'));
        expect(removeAllRanges).toHaveBeenCalledTimes(1);
        document.dispatchEvent(new Event('selectionchange'));
        expect(removeAllRanges).toHaveBeenCalledTimes(2);

        end();
        document.dispatchEvent(new Event('selectionchange'));
        expect(removeAllRanges).toHaveBeenCalledTimes(2);
    });

    it("marks the dragged item's container during a pointer drag only", () => {
        const {container, start, end} = setup();

        start(new MouseEvent('pointermove'));
        expect(marked(container)).toBe(true);
        end();
        expect(marked(container)).toBe(false);

        start(new KeyboardEvent('keydown'));
        expect(marked(container)).toBe(false);
        end();
    });

    it('does nothing while disabled', () => {
        const {plugin, container, removeAllRanges, start, end} = setup();
        plugin.disable();

        start(new MouseEvent('pointermove'));
        expect(marked(container)).toBe(false);
        expect(removeAllRanges).not.toHaveBeenCalled();
        end();
    });

    it('cleans up when destroyed mid-drag', () => {
        const {plugin, handlers, container, removeAllRanges, start} = setup();

        start(new MouseEvent('pointermove'));
        plugin.destroy();
        expect(handlers).toEqual({});
        expect(marked(container)).toBe(false);
        document.dispatchEvent(new Event('selectionchange'));
        expect(removeAllRanges).toHaveBeenCalledTimes(1);
    });
});
