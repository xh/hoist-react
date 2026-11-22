/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {DynamicTabSwitcherModel} from '@xh/hoist/desktop/cmp/tab/dynamic/DynamicTabSwitcherModel';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it} from 'vitest';

/** A drag in the dynamic tab switcher reorders the user's tabs, which persist as favorites. */
describe('DynamicTabSwitcherModel', () => {
    beforeAll(() => initTestAppAsync());

    it('moves a visible tab to a new index, keeping the rest in order', () => {
        const container = new TabContainerModel({
                tabs: ['a', 'b', 'c', 'd'].map(id => ({id, content: () => null}))
            }),
            model = new DynamicTabSwitcherModel(
                {mode: 'dynamic', initialFavorites: ['a', 'b', 'c', 'd']},
                container
            );

        model.moveTab(0, 2);
        expect(model.visibleTabs.map(it => it.id)).toEqual(['b', 'c', 'a', 'd']);

        model.moveTab(3, 0);
        expect(model.visibleTabs.map(it => it.id)).toEqual(['d', 'b', 'c', 'a']);
    });
});
