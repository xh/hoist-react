/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import {reactMarkdown} from '@xh/hoist/kit/react-markdown';
import {ReactElement} from 'react';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import {PluggableList} from 'unified/lib';

type ValidElements =
    | 'a'
    | 'blockquote'
    | 'br'
    | 'code'
    | 'em'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'hr'
    | 'img'
    | 'li'
    | 'ol'
    | 'p'
    | 'pre'
    | 'strong'
    | 'ul'
    | 'del'
    | 'input'
    | 'table'
    | 'tbody'
    | 'td'
    | 'th'
    | 'thead'
    | 'tr';

interface MarkdownProps extends HoistProps {
    /** Markdown formatted string to render. */
    content: string;

    /** Map of html tags to render functions. */
    components?: Record<ValidElements, () => ReactElement>;

    /** True (default) to render new lines with <br/> tags. */
    lineBreaks?: boolean;
}

/**
 * Render Markdown formatted strings as HTML (e.g. **foo** becomes <strong>foo</strong>).
 *
 * Note that the remark-gfm plugin is included by default to support GitHub Flavored Markdown,
 * a superset of the CommonMark specification. See https://github.github.com/gfm/ for details.
 *
 * The components prop can be used to change how reactMarkdown renders standard html elements. See
 * https://www.npmjs.com/package/react-markdown/v/8.0.6#appendix-b-components for details.
 */
export const [Markdown, markdown] = hoistCmp.withFactory<MarkdownProps>({
    displayName: 'Markdown',
    render({content, lineBreaks = true, components = {}}) {
        const remarkPlugins: PluggableList = [remarkGfm];
        if (lineBreaks) remarkPlugins.push(remarkBreaks);
        return reactMarkdown({
            item: content,
            remarkPlugins,
            components
        });
    }
});
