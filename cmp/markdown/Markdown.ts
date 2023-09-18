/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import {reactMarkdown} from '@xh/hoist/kit/react-markdown';
import remarkBreaks from 'remark-breaks';

interface MarkdownProps extends HoistProps {
    /**
     * Markdown formatted string to render.
     */
    content: string;

    /** True (default) to render new lines with <br/> tags. */
    lineBreaks?: boolean;
}

/**
 * Render Markdown formatted strings as HTML (e.g. **foo** becomes <strong>foo</strong>).
 */
export const [Markdown, markdown] = hoistCmp.withFactory<MarkdownProps>({
    displayName: 'Markdown',
    render({content, lineBreaks = true}) {
        return reactMarkdown({
            item: content,
            remarkPlugins: lineBreaks ? [remarkBreaks] : null
        });
    }
});
