/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {markdown, markdownToHtml} from '@xh/hoist/cmp/markdown';
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

    it('renders into a div with the xh-markdown class, merging a className prop', () => {
        const {container} = render(markdown({content: 'hi', className: 'app-note'}));

        const el = container.firstElementChild;
        expect(el.tagName).toBe('DIV');
        expect(el.classList.contains('xh-markdown')).toBe(true);
        expect(el.classList.contains('app-note')).toBe(true);
    });

    it('renders GitHub Flavored Markdown such as strikethrough, tables and autolinks', () => {
        const {container} = render(
            markdown({content: '~~gone~~ www.xh.io\n\n| a | b |\n|---|---|\n| 1 | 2 |'})
        );

        expect(container.querySelector('del')?.textContent).toBe('gone');
        expect(container.querySelector('a')?.getAttribute('href')).toBe('http://www.xh.io');
        expect(container.querySelector('table td')?.textContent).toBe('1');
    });

    it('renders new lines as <br> by default and as spaces with lineBreaks: false', () => {
        const content = 'one\ntwo';

        const withBreaks = render(markdown({content})).container;
        expect(withBreaks.querySelector('br')).not.toBeNull();

        const noBreaks = render(markdown({content, lineBreaks: false})).container;
        expect(noBreaks.querySelector('br')).toBeNull();
        expect(noBreaks.querySelector('p')?.textContent).toBe('one\ntwo');
    });

    it('renders nothing for empty content', () => {
        const {container} = render(markdown({content: null}));

        expect(container.firstElementChild.innerHTML).toBe('');
    });

    it('drops scripts and event handlers from raw HTML but keeps safe markup', () => {
        const {container} = render(
            markdown({content: '<script>window.pwned = true</script><b onclick="x()">bold</b>'})
        );

        expect(container.querySelector('script')).toBeNull();
        expect(container.querySelector('b')?.textContent).toBe('bold');
        expect(container.querySelector('b')?.hasAttribute('onclick')).toBe(false);
        expect(container.textContent).not.toContain('pwned');
    });
});

describe('markdownToHtml', () => {
    it('returns sanitized HTML for a markdown string', () => {
        expect(markdownToHtml('**bold** <img src=x onerror="x()">')).toBe(
            '<p><strong>bold</strong> <img src="x"></p>\n'
        );
    });

    it('returns an empty string for null or empty content', () => {
        expect(markdownToHtml(null)).toBe('');
        expect(markdownToHtml('')).toBe('');
    });
});
