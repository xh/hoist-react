import {stripTags} from '@xh/hoist/utils/js/HtmlUtils';

describe('stripTags', () => {
    it('removes simple block tags', () => {
        expect(stripTags('<p>Hello</p>')).toBe('Hello');
        expect(stripTags('<div>content</div>')).toBe('content');
    });

    it('removes inline tags', () => {
        expect(stripTags('<strong>bold</strong>')).toBe('bold');
        expect(stripTags('<em>italic</em>')).toBe('italic');
    });

    it('removes tags with attributes', () => {
        expect(stripTags('<a href="https://example.com">link</a>')).toBe('link');
        expect(stripTags('<span class="foo" id="bar">text</span>')).toBe('text');
    });

    it('strips nested tags leaving only text', () => {
        expect(stripTags('<p><strong>bold</strong> and plain</p>')).toBe('bold and plain');
    });

    it('returns plain strings unchanged', () => {
        expect(stripTags('no tags here')).toBe('no tags here');
    });

    it('handles self-closing tags', () => {
        expect(stripTags('before<br/>after')).toBe('beforeafter');
        expect(stripTags('before<br />after')).toBe('beforeafter');
    });

    it('returns falsy inputs as-is', () => {
        expect(stripTags(null)).toBeNull();
        expect(stripTags(undefined)).toBeUndefined();
        expect(stripTags('')).toBe('');
        expect(stripTags(0 as any)).toBe(0);
    });
});
