/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import {reactMarkdown} from '@xh/hoist/kit/react-markdown';
import {Options} from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import type {PluggableList} from 'unified';

interface MarkdownProps extends HoistProps {
    /** Markdown formatted string to render. */
    content: string;

    /** True (default) to render new lines with <br/> tags. */
    lineBreaks?: boolean;

    /** Escape hatch to provide additional options to the React Markdown implementation */
    reactMarkdownOptions?: Partial<Options>;
}

/**
 * Render Markdown formatted strings as HTML (e.g. **foo** becomes <strong>foo</strong>).
 *
 * Note that the remark-gfm plugin is included by default to support GitHub Flavored Markdown,
 * a superset of the CommonMark specification. See https://github.github.com/gfm/ for details.
 */
export const [Markdown, markdown] = hoistCmp.withFactory<MarkdownProps>({
    displayName: 'Markdown',
    render({content, lineBreaks = true, reactMarkdownOptions = {}}) {
        // add default remark plugins, ensure app provided takes precedence
        const remarkPlugins: PluggableList = [],
            appRemarkPlugins = reactMarkdownOptions.remarkPlugins;
        if (appRemarkPlugins) remarkPlugins.push(...appRemarkPlugins);
        if (lineBreaks) remarkPlugins.push(remarkBreaks);
        remarkPlugins.push(remarkGfm);

        return reactMarkdown({
            item: content,
            ...reactMarkdownOptions,
            remarkPlugins
        });
    }
});
