import {
    deepFreeze,
    ensureNotEmpty,
    ensureUnique,
    ensureUniqueBy,
    executeIfFunction,
    filterConsecutive,
    getOrCreate,
    intersperse,
    isJSON,
    mergeDeep,
    ordinalize,
    pluralize,
    singularize,
    trimToDepth,
    withDefault
} from '@xh/hoist/utils/js/LangUtils';

describe('withDefault', () => {
    it('returns the first defined argument', () => {
        expect(withDefault(1, 2, 3)).toBe(1);
        expect(withDefault(undefined, 2)).toBe(2);
        expect(withDefault(undefined, undefined, 3)).toBe(3);
    });

    it('treats null as a defined value', () => {
        expect(withDefault(null, 2)).toBeNull();
    });

    it('treats 0 and false as defined values', () => {
        expect(withDefault(0, 1)).toBe(0);
        expect(withDefault(false, true)).toBe(false);
    });

    it('returns undefined when all args are undefined', () => {
        expect(withDefault(undefined, undefined)).toBeUndefined();
    });
});

describe('getOrCreate', () => {
    it('creates and caches a value on a plain object', () => {
        const obj: Record<string, number> = {};
        let callCount = 0;
        const fn = () => ++callCount;

        const result1 = getOrCreate(obj, 'key', fn);
        const result2 = getOrCreate(obj, 'key', fn);

        expect(result1).toBe(1);
        expect(result2).toBe(1); // cached — fn not called again
        expect(callCount).toBe(1);
    });

    it('creates and caches a value in a Map', () => {
        const map = new Map<string, string>();
        let callCount = 0;
        const fn = () => {
            callCount++;
            return 'computed';
        };

        const result1 = getOrCreate(map, 'key', fn);
        const result2 = getOrCreate(map, 'key', fn);

        expect(result1).toBe('computed');
        expect(result2).toBe('computed');
        expect(callCount).toBe(1);
    });

    it('stores separate values per key', () => {
        const obj: Record<string, number> = {};
        getOrCreate(obj, 'a', () => 1);
        getOrCreate(obj, 'b', () => 2);
        expect(obj['a']).toBe(1);
        expect(obj['b']).toBe(2);
    });
});

describe('deepFreeze', () => {
    it('freezes a plain object', () => {
        const obj = deepFreeze({a: 1, b: 2});
        expect(Object.isFrozen(obj)).toBe(true);
    });

    it('freezes nested plain objects', () => {
        const obj = deepFreeze({a: {b: {c: 3}}});
        expect(Object.isFrozen(obj.a)).toBe(true);
        expect(Object.isFrozen(obj.a.b)).toBe(true);
    });

    it('freezes arrays', () => {
        const arr = deepFreeze([1, 2, 3]);
        expect(Object.isFrozen(arr)).toBe(true);
    });

    it('returns non-plain objects (class instances) unchanged and unfrozen', () => {
        class MyClass {
            x = 1;
        }
        const instance = new MyClass();
        deepFreeze(instance as any);
        expect(Object.isFrozen(instance)).toBe(false);
    });
});

describe('trimToDepth', () => {
    it('returns primitives unchanged', () => {
        expect(trimToDepth(42)).toBe(42);
        expect(trimToDepth('hello')).toBe('hello');
        expect(trimToDepth(null)).toBeNull();
    });

    it('replaces nested content beyond depth 0 with placeholders', () => {
        expect(trimToDepth({a: 1}, 0)).toBe('{...}');
        expect(trimToDepth([1, 2, 3], 0)).toBe('[...]');
    });

    it('preserves one level and replaces deeper content at depth 1', () => {
        const result = trimToDepth({a: 1, b: {c: 2}}, 1);
        expect(result.a).toBe(1);
        expect(result.b).toBe('{...}');
    });

    it('preserves two levels at depth 2', () => {
        const result = trimToDepth({a: {b: {c: 3}}}, 2);
        expect(result.a.b).toBe('{...}');
    });

    it('handles nested arrays', () => {
        const result = trimToDepth({items: [1, 2, 3]}, 1);
        expect(result.items).toBe('[...]');
    });
});

describe('isJSON', () => {
    it('returns true for valid JSON strings', () => {
        expect(isJSON('{"a":1}')).toBe(true);
        expect(isJSON('"hello"')).toBe(true);
        expect(isJSON('42')).toBe(true);
        expect(isJSON('true')).toBe(true);
        expect(isJSON('[1,2,3]')).toBe(true);
        expect(isJSON('null')).toBe(true);
    });

    it('returns false for invalid JSON', () => {
        expect(isJSON('not json')).toBe(false);
        expect(isJSON('{a:1}')).toBe(false);
        expect(isJSON(undefined)).toBe(false);
    });
});

describe('ensureNotEmpty', () => {
    it('does not throw for non-empty values', () => {
        expect(() => ensureNotEmpty([1])).not.toThrow();
        expect(() => ensureNotEmpty({a: 1})).not.toThrow();
        expect(() => ensureNotEmpty('hello')).not.toThrow();
    });

    it('throws for empty array', () => {
        expect(() => ensureNotEmpty([])).toThrow();
    });

    it('throws for empty object', () => {
        expect(() => ensureNotEmpty({})).toThrow();
    });

    it('throws for null and undefined', () => {
        expect(() => ensureNotEmpty(null)).toThrow();
        expect(() => ensureNotEmpty(undefined)).toThrow();
    });

    it('includes custom message in thrown error', () => {
        expect(() => ensureNotEmpty([], 'Must not be empty')).toThrow('Must not be empty');
    });
});

describe('ensureUnique', () => {
    it('does not throw for arrays with unique items', () => {
        expect(() => ensureUnique([1, 2, 3])).not.toThrow();
        expect(() => ensureUnique(['a', 'b', 'c'])).not.toThrow();
        expect(() => ensureUnique([])).not.toThrow();
    });

    it('throws for arrays with duplicate items', () => {
        expect(() => ensureUnique([1, 2, 2])).toThrow();
        expect(() => ensureUnique(['a', 'a'])).toThrow();
    });

    it('includes custom message in thrown error', () => {
        expect(() => ensureUnique([1, 1], 'Duplicates found')).toThrow('Duplicates found');
    });
});

describe('ensureUniqueBy', () => {
    it('does not throw when all items have unique keys', () => {
        const items = [
            {id: 1, name: 'a'},
            {id: 2, name: 'b'}
        ];
        expect(() => ensureUniqueBy(items, 'id')).not.toThrow();
    });

    it('throws when items share the same key value', () => {
        const items = [
            {id: 1, name: 'a'},
            {id: 1, name: 'b'}
        ];
        expect(() => ensureUniqueBy(items, 'id')).toThrow();
    });

    it('includes the key name in the default error message', () => {
        const items = [{id: 1}, {id: 1}];
        expect(() => ensureUniqueBy(items, 'id')).toThrow('id');
    });
});

describe('singularize', () => {
    it('converts plural words to singular', () => {
        expect(singularize('dogs')).toBe('dog');
        expect(singularize('categories')).toBe('category');
        expect(singularize('boxes')).toBe('box');
    });

    it('leaves already-singular words unchanged', () => {
        expect(singularize('dog')).toBe('dog');
        expect(singularize('person')).toBe('person');
    });
});

describe('pluralize', () => {
    it('converts singular words to plural', () => {
        expect(pluralize('dog')).toBe('dogs');
        expect(pluralize('category')).toBe('categories');
        expect(pluralize('box')).toBe('boxes');
    });

    it('conditionally pluralizes based on count', () => {
        expect(pluralize('item', 1)).toBe('item');
        expect(pluralize('item', 2)).toBe('items');
        expect(pluralize('item', 0)).toBe('items');
    });

    it('includes count in output when includeCount is true', () => {
        expect(pluralize('item', 1, true)).toBe('1 item');
        expect(pluralize('item', 5, true)).toBe('5 items');
    });
});

describe('ordinalize', () => {
    it('adds correct ordinal suffixes', () => {
        expect(ordinalize(1)).toBe('1st');
        expect(ordinalize(2)).toBe('2nd');
        expect(ordinalize(3)).toBe('3rd');
        expect(ordinalize(4)).toBe('4th');
        expect(ordinalize(11)).toBe('11th');
        expect(ordinalize(12)).toBe('12th');
        expect(ordinalize(13)).toBe('13th');
        expect(ordinalize(21)).toBe('21st');
        expect(ordinalize(22)).toBe('22nd');
        expect(ordinalize(100)).toBe('100th');
    });
});

describe('filterConsecutive', () => {
    const isSep = (s: string) => s === '-';

    it('removes a leading separator', () => {
        expect(['-', 'a', 'b'].filter(filterConsecutive(isSep))).toEqual(['a', 'b']);
    });

    it('removes a trailing separator', () => {
        expect(['a', 'b', '-'].filter(filterConsecutive(isSep))).toEqual(['a', 'b']);
    });

    it('collapses consecutive separators to one', () => {
        expect(['a', '-', '-', 'b'].filter(filterConsecutive(isSep))).toEqual(['a', '-', 'b']);
    });

    it('preserves a single separator between items', () => {
        expect(['a', '-', 'b'].filter(filterConsecutive(isSep))).toEqual(['a', '-', 'b']);
    });

    it('removes all separators when only separators exist', () => {
        expect(['-', '-', '-'].filter(filterConsecutive(isSep))).toEqual([]);
    });

    it('does not affect arrays with no separators', () => {
        expect(['a', 'b', 'c'].filter(filterConsecutive(isSep))).toEqual(['a', 'b', 'c']);
    });
});

describe('intersperse', () => {
    it('inserts separator between every element', () => {
        expect(intersperse([1, 2, 3], 0)).toEqual([1, 0, 2, 0, 3]);
    });

    it('returns a single-element array unchanged', () => {
        expect(intersperse([1], 0)).toEqual([1]);
    });

    it('returns an empty array unchanged', () => {
        expect(intersperse([], 0)).toEqual([]);
    });

    it('works with string separators', () => {
        expect(intersperse(['a', 'b', 'c'], '|')).toEqual(['a', '|', 'b', '|', 'c']);
    });
});

describe('executeIfFunction', () => {
    it('returns a non-function value directly', () => {
        expect(executeIfFunction(42)).toBe(42);
        expect(executeIfFunction('hello')).toBe('hello');
        expect(executeIfFunction(null)).toBeNull();
    });

    it('executes a function and returns its result', () => {
        expect(executeIfFunction(() => 42)).toBe(42);
        expect(executeIfFunction(() => 'hello')).toBe('hello');
    });
});

describe('mergeDeep', () => {
    it('deeply merges plain objects', () => {
        const target = {a: {x: 1}};
        const result = mergeDeep(target, {a: {y: 2}});
        expect(result).toEqual({a: {x: 1, y: 2}});
    });

    it('mutates and returns the target', () => {
        const target = {a: 1};
        const result = mergeDeep(target, {b: 2});
        expect(result).toBe(target);
    });

    it('replaces (not merges) array values from source', () => {
        const target = {items: [1, 2, 3]};
        mergeDeep(target, {items: [4, 5]});
        expect(target.items).toEqual([4, 5]);
    });

    it('merges multiple sources left to right', () => {
        const result = mergeDeep({}, {a: 1}, {b: 2}, {a: 3});
        expect(result).toEqual({a: 3, b: 2});
    });
});
