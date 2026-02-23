/**
 * @jest-environment jsdom
 */
import {
    getLayoutProps,
    getNonLayoutProps,
    splitLayoutProps
} from '@xh/hoist/utils/react/LayoutPropUtils';

describe('getLayoutProps', () => {
    it('converts numeric width/height to px strings', () => {
        const result = getLayoutProps({width: 100, height: 200});
        expect(result.width).toBe('100px');
        expect(result.height).toBe('200px');
    });

    it('leaves string dimension values unchanged', () => {
        const result = getLayoutProps({width: '50%', height: 'auto'});
        expect(result.width).toBe('50%');
        expect(result.height).toBe('auto');
    });

    it('converts numeric flex values to strings', () => {
        const result = getLayoutProps({flex: 1, flexGrow: 2});
        expect(result.flex).toBe('1');
        expect(result.flexGrow).toBe('2');
    });

    it('converts margin/padding true to the CSS variable', () => {
        const result = getLayoutProps({margin: true, padding: true});
        expect(result.margin).toBe('var(--xh-pad-px)');
        expect(result.padding).toBe('var(--xh-pad-px)');
    });

    it('removes margin/padding when set to false', () => {
        const result = getLayoutProps({margin: false, padding: false});
        expect('margin' in result).toBe(false);
        expect('padding' in result).toBe(false);
    });

    it('converts multi-value margin/padding strings to px', () => {
        const result = getLayoutProps({padding: '10 20'});
        expect(result.padding).toBe('10px 20px');
    });

    it('excludes non-layout props', () => {
        const result = getLayoutProps({width: 100, className: 'foo', onClick: jest.fn()});
        expect('className' in result).toBe(false);
        expect('onClick' in result).toBe(false);
        expect(result.width).toBe('100px');
    });

    it('returns an empty object when no layout props are present', () => {
        expect(getLayoutProps({className: 'foo', id: 'bar'})).toEqual({});
    });
});

describe('getNonLayoutProps', () => {
    it('returns only non-layout props', () => {
        const result = getNonLayoutProps({width: 100, className: 'foo', id: 'bar'});
        expect(result).toEqual({className: 'foo', id: 'bar'});
        expect('width' in result).toBe(false);
    });

    it('returns the full object when no layout props are present', () => {
        const props = {className: 'foo', id: 'bar'};
        expect(getNonLayoutProps(props)).toEqual(props);
    });

    it('returns an empty object when all props are layout props', () => {
        expect(getNonLayoutProps({width: 100, height: 200})).toEqual({});
    });
});

describe('splitLayoutProps', () => {
    it('splits props into layout and non-layout parts', () => {
        const [layout, rest] = splitLayoutProps({width: 100, className: 'foo'});
        expect(layout).toEqual({width: '100px'});
        expect(rest).toEqual({className: 'foo'});
    });

    it('returns the original props object as rest when there are no layout props', () => {
        const props = {className: 'foo'};
        const [layout, rest] = splitLayoutProps(props);
        expect(layout).toEqual({});
        expect(rest).toBe(props); // same reference — optimization
    });
});
