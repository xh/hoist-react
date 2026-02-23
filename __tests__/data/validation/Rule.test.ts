import {Rule, maxSeverity} from '@xh/hoist/data/validation/Rule';

describe('Rule', () => {
    it('stores a single constraint wrapped in an array', () => {
        const constraint = () => null;
        const rule = new Rule({check: constraint});
        expect(rule.check).toEqual([constraint]);
    });

    it('stores multiple constraints as an array', () => {
        const c1 = () => null,
            c2 = () => null;
        const rule = new Rule({check: [c1, c2]});
        expect(rule.check).toEqual([c1, c2]);
    });

    it('stores the when predicate', () => {
        const when = () => true;
        const rule = new Rule({check: () => null, when});
        expect(rule.when).toBe(when);
    });

    it('when is undefined when not provided', () => {
        const rule = new Rule({check: () => null});
        expect(rule.when).toBeUndefined();
    });
});

describe('maxSeverity', () => {
    it('returns null for an empty array', () => {
        expect(maxSeverity([])).toBeNull();
    });

    it('returns "error" when at least one result has error severity', () => {
        expect(
            maxSeverity([
                {severity: 'warning', message: 'w'},
                {severity: 'error', message: 'e'}
            ])
        ).toBe('error');
    });

    it('returns "warning" when the highest severity is warning', () => {
        expect(
            maxSeverity([
                {severity: 'info', message: 'i'},
                {severity: 'warning', message: 'w'}
            ])
        ).toBe('warning');
    });

    it('returns "info" when only info results are present', () => {
        expect(maxSeverity([{severity: 'info', message: 'i'}])).toBe('info');
    });

    it('error takes priority over warning and info', () => {
        expect(
            maxSeverity([
                {severity: 'error', message: 'e'},
                {severity: 'warning', message: 'w'},
                {severity: 'info', message: 'i'}
            ])
        ).toBe('error');
    });
});
