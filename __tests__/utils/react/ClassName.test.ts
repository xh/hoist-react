import {getClassName} from '@xh/hoist/utils/react/ClassName';

describe('getClassName', () => {
    it('returns just the base name when props has no className', () => {
        expect(getClassName('xh-button', {})).toBe('xh-button');
    });

    it('appends className from props', () => {
        expect(getClassName('xh-button', {className: 'my-button'})).toBe('xh-button my-button');
    });

    it('appends extra class names passed as rest arguments', () => {
        expect(getClassName('xh-button', {}, 'active', 'focused')).toBe('xh-button active focused');
    });

    it('combines base, props className, and extra names', () => {
        expect(getClassName('base', {className: 'from-props'}, 'extra')).toBe(
            'base from-props extra'
        );
    });

    it('ignores undefined props className', () => {
        expect(getClassName('base', {className: undefined})).toBe('base');
    });

    it('ignores falsy extra names (undefined, null, false)', () => {
        expect(getClassName('base', {}, undefined, null, false as any, 'real')).toBe('base real');
    });
});
