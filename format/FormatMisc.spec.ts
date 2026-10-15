/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {fmtJson} from '@xh/hoist/format';
import {describe, expect, it} from 'vitest';

/**
 * fmtJson pretty-prints JSON for JsonInput, read-only FormFields and Admin Console displays. Those
 * callers pass either objects or raw strings, and rely on a throw to detect a string that is not
 * valid JSON, falling back to showing it as-is.
 */
describe('fmtJson', () => {
    it('pretty-prints an object and its JSON string the same way', () => {
        const expected = '{\n  "a": 1,\n  "b": [\n    true\n  ]\n}';
        expect(fmtJson({a: 1, b: [true]})).toBe(expected);
        expect(fmtJson('{"a":1,"b":[true]}')).toBe(expected);
    });

    it('returns an empty string for null', () => {
        expect(fmtJson(null)).toBe('');
        expect(fmtJson('null')).toBe('');
    });

    it('throws for a string that is not valid JSON', () => {
        expect(() => fmtJson('{a: 1}')).toThrow(SyntaxError);
    });
});
