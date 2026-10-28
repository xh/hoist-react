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
});
