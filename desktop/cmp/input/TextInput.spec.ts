/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {bindable} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {render} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * `maxLength` limits what the user can enter through the native attribute. These guard that it
 * reaches the <input> element, and that it never cuts a value the app set.
 */
describe('TextInput', () => {
    beforeAll(() => initTestAppAsync());

    describe('maxLength', () => {
        it('sets the native attribute on the input element', () => {
            expect(renderInput('abc', {maxLength: 10}).getAttribute('maxlength')).toBe('10');
        });

        it('sets no attribute by default, or for a null maxLength', () => {
            expect(renderInput('abc').hasAttribute('maxlength')).toBe(false);
            expect(renderInput('abc', {maxLength: null}).hasAttribute('maxlength')).toBe(false);
        });

        it('shows a longer bound value in full', () => {
            expect(renderInput('abcdefgh', {maxLength: 5}).value).toBe('abcdefgh');
        });
    });
});

//------------------
// Helpers
//------------------
class FormModel extends HoistModel {
    @bindable accessor value: string;

    constructor(value: string) {
        super();
        this.value = value;
    }
}

function renderInput(value: string, props: any = {}) {
    const model = new FormModel(value);
    onTestFinished(() => model.destroy());
    return render(textInput({model, bind: 'value', ...props})).container.querySelector('input');
}
