/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {segmentedControl} from '@xh/hoist/mobile/cmp/input';
import {bindable} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {render} from '@testing-library/react';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * An option's own intent tints it even while unselected, so a danger option reads as such before
 * it is chosen. An intent set on the whole control colors only the selected option, or every
 * option would look chosen.
 */
describe('SegmentedControl intents (mobile)', () => {
    beforeAll(() => initTestAppAsync({isMobileApp: true}));

    it('marks only an option with its own intent for an unselected tint', () => {
        const el = renderControl({
                intent: 'primary',
                options: [
                    {value: 'on', label: 'On'},
                    {value: 'off', label: 'Off'},
                    {value: 'drop', label: 'Drop', intent: 'danger'}
                ]
            }),
            classesOf = (label: string) =>
                [...el.querySelectorAll('.xh-segmented-control-option')].find(
                    it => it.textContent === label
                ).classList;

        expect(classesOf('On')).toContain('xh-segmented-control-option--primary');
        expect(classesOf('On')).not.toContain('xh-segmented-control-option--own-intent');
        expect(classesOf('Off')).not.toContain('xh-segmented-control-option--own-intent');
        expect(classesOf('Drop')).toContain('xh-segmented-control-option--danger');
        expect(classesOf('Drop')).toContain('xh-segmented-control-option--own-intent');
    });
});

class FormModel extends HoistModel {
    @bindable accessor value = 'on';
}

function renderControl(props: object): HTMLElement {
    const model = new FormModel();
    return render(
        segmentedControl({model, bind: 'value', ...props} as any)
    ).container.querySelector('.xh-segmented-control');
}
