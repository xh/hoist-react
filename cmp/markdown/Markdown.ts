/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import {reactMarkdown} from '@xh/hoist/kit/react-markdown';
import {Components} from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import {PluggableList} from 'unified/lib';

interface MarkdownProps extends HoistProps {
    /** Markdown formatted string to render. */
    content: string;

    /**
     * Map of html tag to tag or functional component to control rendering of standard html
     * elements. See https://www.npmjs.com/package/react-markdown/v/8.0.6#appendix-b-components
     * for details.
     */
    components?: Components;

    /**
     * List of plugins for the Remark library to extend markdown processing.
     */
    remarkPlugins?: PluggableList;

    /**
     * List of plugins for the Rehype library to extend HTML processing.
     */
    rehypePlugins?: PluggableList;

    /** True (default) to render new lines with <br/> tags. */
    lineBreaks?: boolean;
}

/**
 * Render Markdown formatted strings as HTML (e.g. **foo** becomes <strong>foo</strong>).
 *
 * Note that the remark-gfm plugin is included by default to support GitHub Flavored Markdown,
 * a superset of the CommonMark specification. See https://github.github.com/gfm/ for details.
 */
export const [Markdown, markdown] = hoistCmp.withFactory<MarkdownProps>({
    displayName: 'Markdown',
    render({
        content,
        lineBreaks = true,
        components = {},
        remarkPlugins: remark = [],
        rehypePlugins = []
    }) {
        const remarkPlugins: PluggableList = [remarkGfm, ...remark];
        if (lineBreaks) remarkPlugins.push(remarkBreaks);
        return reactMarkdown({
            item: content,
            remarkPlugins,
            rehypePlugins,
            components
        });
    }
});
