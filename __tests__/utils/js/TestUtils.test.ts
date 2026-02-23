import {getTestId} from '@xh/hoist/utils/js/TestUtils';

describe('getTestId', () => {
    it('returns the string directly when given a string', () => {
        expect(getTestId('my-widget')).toBe('my-widget');
    });

    it('appends suffix with a hyphen when suffix is provided', () => {
        expect(getTestId('my-widget', 'btn')).toBe('my-widget-btn');
    });

    it('returns undefined when props object has no testId property', () => {
        expect(getTestId({})).toBeUndefined();
    });

    it('returns undefined even when suffix is provided but testId is absent', () => {
        expect(getTestId({}, 'btn')).toBeUndefined();
    });
});
