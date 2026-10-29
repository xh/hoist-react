/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {markdown} from '@xh/hoist/cmp/markdown';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {render} from '@testing-library/react';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * Markdown is a pure display component. Apps and libraries render it where no Hoist model is in
 * context, such as inside another React library's components or a separate React root.
 */
describe('Markdown', () => {
    beforeAll(() => initTestAppAsync());

    // Fixed in v90 - with no model in context, it rendered "No model found" in place of content.
    it('renders its content with no Hoist model in context', () => {
        const {container} = render(markdown({content: 'Hello **world**'}));

        expect(container.textContent).not.toContain('No model found');
        expect(container.querySelector('strong')?.textContent).toBe('world');
    });

    it('renders GitHub Flavored Markdown such as strikethrough, tables and autolinks', () => {
        const {container} = render(
            markdown({content: '~~gone~~ www.xh.io\n\n| a | b |\n|---|---|\n| 1 | 2 |'})
        );

        expect(container.querySelector('del')?.textContent).toBe('gone');
        expect(container.querySelector('a')?.getAttribute('href')).toBe('http://www.xh.io');
        expect(container.querySelector('table td')?.textContent).toBe('1');
    });

    it('renders new lines as <br> by default and not with lineBreaks: false', () => {
        const content = 'one\ntwo';

        const withBreaks = render(markdown({content})).container;
        expect(withBreaks.querySelector('br')).not.toBeNull();

        const noBreaks = render(markdown({content, lineBreaks: false})).container;
        expect(noBreaks.querySelector('br')).toBeNull();
        expect(noBreaks.querySelector('p')?.textContent).toBe('one\ntwo');
    });

    it('renders nothing for empty content', () => {
        const {container} = render(markdown({content: null}));

        expect(container.innerHTML).toBe('');
    });

    it('does not render raw HTML in content', () => {
        const {container} = render(
            markdown({content: '<script>window.pwned = true</script><b>bold</b> text'})
        );

        expect(container.querySelector('script')).toBeNull();
        expect(container.querySelector('b')).toBeNull();
        expect(container.textContent).toContain('text');
    });

    it('passes app remark plugins and components through reactMarkdownOptions', () => {
        const {container} = render(
            markdown({
                content: '[xh](https://xh.io)',
                reactMarkdownOptions: {
                    components: {a: ({href, children}) => `${children} <${href}>`}
                }
            })
        );

        expect(container.querySelector('a')).toBeNull();
        expect(container.textContent).toContain('xh <https://xh.io>');
    });
});
