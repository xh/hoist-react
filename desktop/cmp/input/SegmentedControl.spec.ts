/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {form, FormModel} from '@xh/hoist/cmp/form';
import {HoistModel} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {segmentedControl} from '@xh/hoist/desktop/cmp/input';
import {bindable} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {render} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * How a SegmentedControl takes its size. A FormField sizes its input with layout props, so these
 * must reach the control as styles. Fixed in v91 - they rendered as DOM attributes, such as a
 * stray `flex="1"`, and had no effect.
 */
describe('SegmentedControl', () => {
    beforeAll(() => initTestAppAsync());

    describe('layout props', () => {
        it('applies them as styles, not as DOM attributes', () => {
            const el = renderControl({width: 300, flex: 'none', margin: 4});

            expect(el.style.width).toBe('300px');
            expect(el.style.flex).toMatch(/^(none|0 0 auto)$/);
            expect(el.style.margin).toBe('4px');
            ['width', 'flex', 'margin'].forEach(it => expect(el.hasAttribute(it)).toBe(false));
        });

        it('fills a FormField through its flex style', () => {
            const model = new FormModel({fields: [{name: 'period', initialValue: 'day'}]});
            onTestFinished(() => model.destroy());
            const {container} = render(
                form({
                    model,
                    item: formField({field: 'period', item: segmentedControl({options: OPTIONS})})
                })
            );
            const el = container.querySelector<HTMLElement>('.xh-segmented-control');

            expect(el.style.flex).toMatch(/^1/);
            ['width', 'height', 'flex'].forEach(it => expect(el.hasAttribute(it)).toBe(false));
        });
    });

    describe('wrap', () => {
        it('marks a wrapping control, and no other', () => {
            const cls = 'xh-segmented-control--wrap';

            expect(renderControl({wrap: true}).classList).toContain(cls);
            expect(renderControl().classList).not.toContain(cls);
        });
    });
});

//------------------
// Helpers
//------------------
const OPTIONS = ['day', 'week', 'month'];

class ValueModel extends HoistModel {
    @bindable accessor value: string = 'day';
}

function renderControl(props = {}): HTMLElement {
    const model = new ValueModel();
    onTestFinished(() => model.destroy());
    return render(
        segmentedControl({model, bind: 'value', options: OPTIONS, ...props})
    ).container.querySelector('.xh-segmented-control');
}
