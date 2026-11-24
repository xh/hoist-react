/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {groupingChooser} from '@xh/hoist/mobile/cmp/grouping';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {render, screen} from '@testing-library/react';
import {beforeAll, describe, expect, it} from 'vitest';

describe('GroupingChooser (mobile)', () => {
    beforeAll(() => initTestAppAsync({isMobileApp: true}));

    it('labels its button with the current grouping', () => {
        const model = new GroupingChooserModel({
            dimensions: ['region', 'sector'],
            initialValue: ['region', 'sector']
        });
        render(groupingChooser({model, testId: 'gc'}));
        expect(screen.getByTestId('gc').textContent).toBe(model.getValueLabel(model.value));
    });

    it('labels its button with emptyText when ungrouped', () => {
        const model = new GroupingChooserModel({
            dimensions: ['region'],
            initialValue: [],
            allowEmpty: true
        });
        render(groupingChooser({model, emptyText: 'No grouping', testId: 'gc'}));
        expect(screen.getByTestId('gc').textContent).toBe('No grouping');
    });
});
