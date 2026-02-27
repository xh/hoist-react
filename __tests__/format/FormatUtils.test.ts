import {createRenderer} from '@xh/hoist/format/FormatUtils';

describe('createRenderer', () => {
    it('returns a renderer (a function that accepts config)', () => {
        const renderer = createRenderer((v: number) => v * 2);
        expect(typeof renderer).toBe('function');
    });

    it('the renderer returns a value-function that takes a single value', () => {
        const valueFn = createRenderer((v: number) => v * 2)();
        expect(typeof valueFn).toBe('function');
        expect(valueFn(5)).toBe(10);
    });

    it('passes the config object through to the formatter', () => {
        const formatter = (v: number, cfg?: {factor: number}) => v * (cfg?.factor ?? 1);
        const valueFn = createRenderer(formatter)({factor: 3});
        expect(valueFn(5)).toBe(15);
    });

    it('uses undefined config when no config is passed to the renderer', () => {
        const formatter = (v: number, cfg?: {factor: number}) => v * (cfg?.factor ?? 1);
        const valueFn = createRenderer(formatter)();
        expect(valueFn(7)).toBe(7);
    });

    it('each renderer call produces an independent value-function', () => {
        const formatter = (v: number, cfg?: {offset: number}) => v + (cfg?.offset ?? 0);
        const renderer = createRenderer(formatter);
        const add10 = renderer({offset: 10});
        const add20 = renderer({offset: 20});
        expect(add10(5)).toBe(15);
        expect(add20(5)).toBe(25);
    });
});
