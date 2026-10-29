/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import DOMPurify from 'dompurify';
import {Marked} from 'marked';
import {useMemo} from 'react';

interface MarkdownProps extends HoistProps {
    /** Markdown formatted string to render. */
    content: string;

    /** True (default) to render new lines with <br/> tags. */
    lineBreaks?: boolean;
}

/**
 * Render Markdown formatted strings as HTML (e.g. **foo** becomes <strong>foo</strong>).
 *
 * Supports GitHub Flavored Markdown, a superset of the CommonMark specification - see
 * https://github.github.com/gfm/ for details. Renders into a `div.xh-markdown`.
 *
 * Any raw HTML in the content is sanitized with DOMPurify before rendering, so scripts, event
 * handlers and other unsafe markup are dropped while safe formatting is kept.
 */
export const [Markdown, markdown] = hoistCmp.withFactory<MarkdownProps>({
    displayName: 'Markdown',
    className: 'xh-markdown',
    model: false,
    render({content, lineBreaks = true, className}) {
        const html = useMemo(() => markdownToHtml(content, lineBreaks), [content, lineBreaks]);
        return div({className, dangerouslySetInnerHTML: {__html: html}});
    }
});

/**
 * Convert a Markdown formatted string to sanitized HTML, as {@link Markdown} renders it.
 * @param content - Markdown formatted string.
 * @param lineBreaks - true (default) to render new lines as <br/> tags.
 */
export function markdownToHtml(content: string, lineBreaks: boolean = true): string {
    if (!content) return '';
    const parser = lineBreaks ? parserWithBreaks : parserWithoutBreaks,
        html = parser.parse(content) as string;
    return DOMPurify.sanitize(html);
}

const parserWithBreaks = new Marked({gfm: true, breaks: true}),
    parserWithoutBreaks = new Marked({gfm: true, breaks: false});
