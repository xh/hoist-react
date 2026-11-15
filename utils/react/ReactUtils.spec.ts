/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {span} from '@xh/hoist/cmp/layout';
import {isBlankNode} from '@xh/hoist/utils/react';
import {describe, expect, it} from 'vitest';

/**
 * Components call isBlankNode to decide whether to render the element that wraps an optional
 * label or title. A wrong answer either drops real content, such as a zero, or leaves an empty
 * element and its gap on screen.
 */
describe('isBlankNode', () => {
    it.each([
        ['null', null],
        ['undefined', undefined],
        ['false', false],
        ['true', true],
        ['an empty string', ''],
        ['a string of spaces', '   '],
        ['a string of tabs and line breaks', '\t\n ']
    ])('is true for %s', (_, node) => {
        expect(isBlankNode(node)).toBe(true);
    });

    it.each([
        ['text', 'Orders'],
        ['text with space around it', ' Orders '],
        ['zero', 0],
        ['a number', 42],
        ['NaN', NaN],
        ['an element', span()],
        ['an empty array', []],
        ['an array of nodes', ['Orders', null]]
    ])('is false for %s', (_, node) => {
        expect(isBlankNode(node)).toBe(false);
    });
});
