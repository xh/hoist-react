/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {moveIndexForOrder, moveItem} from '@xh/hoist/cmp/sortablelist/impl/DndUtils';
import {describe, expect, it} from 'vitest';

/**
 * A drag's live order is computed by `moveItem` and rendered by React, so dnd-kit never moves the
 * DOM itself. A wrong result shows the wrong preview, and becomes the order a drop commits.
 */
describe('moveItem', () => {
    const lists = {list: ['a', 'b', 'c', 'd']};

    it('takes the target slot when moving down or up within a list', () => {
        expect(moveItem(lists, 'a', 'list', 'c').list).toEqual(['b', 'c', 'a', 'd']);
        expect(moveItem(lists, 'd', 'list', 'b').list).toEqual(['a', 'd', 'b', 'c']);
    });

    it('inserts before the target when moving to another list', () => {
        const ret = moveItem({visible: ['a', 'b'], hidden: ['x', 'y']}, 'y', 'visible', 'b');
        expect(ret).toEqual({visible: ['a', 'y', 'b'], hidden: ['x']});
    });

    it('returns the same object when nothing would change', () => {
        expect(moveItem(lists, 'b', 'list', 'b')).toBe(lists);
        expect(moveItem(lists, 'b', 'list', 'missing')).toBe(lists);
        expect(moveItem(lists, 'missing', 'list', 'b')).toBe(lists);
        expect(moveItem(lists, 'b', 'other', 'c')).toBe(lists);
    });
});

/** Commits a reorder of a subset - visible columns - back into the full list it came from. */
describe('moveIndexForOrder', () => {
    const all = ['a', 'b', 'c', 'x', 'y'];

    it.each([
        ['before its successor, moving down', 'a', ['b', 'c', 'a'], 2],
        ['before its successor, moving up', 'c', ['c', 'a', 'b'], 0],
        ['before its successor, from outside the subset', 'y', ['a', 'y', 'b', 'c'], 1],
        ['after its predecessor when last', 'x', ['a', 'b', 'c', 'x'], 3],
        ['after its predecessor, from outside the subset', 'y', ['a', 'b', 'c', 'y'], 3]
    ])('places the key %s', (_, key, order, expected) => {
        expect(moveIndexForOrder(all, key, order)).toBe(expected);
    });

    it('returns -1 when the order places the key next to nothing', () => {
        expect(moveIndexForOrder(all, 'a', ['a'])).toBe(-1);
        expect(moveIndexForOrder(all, 'q', ['a', 'q'])).toBe(-1);
    });
});
