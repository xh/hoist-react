/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {searchInput} from '@xh/hoist/mobile/cmp/input';
import {bindable} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * The mobile SearchInput renders a native search input with a leading icon.
 */
describe('SearchInput (mobile)', () => {
    beforeAll(() => initTestAppAsync({isMobileApp: true}));

    it('renders a search input with the bound value and a search icon', () => {
        const {input} = renderInput('ibm');
        expect(input.type).toBe('search');
        expect(input.value).toBe('ibm');
        expect(input.parentElement.querySelector('.xh-search-input__icon svg')).not.toBeNull();
    });

    it('commits the trimmed value on Enter', () => {
        const {input, model} = renderInput(null);
        fireEvent.focus(input);
        fireEvent.change(input, {target: {value: '  aapl '}});
        fireEvent.keyDown(input, {key: 'Enter'});
        expect(model.value).toBe('aapl');
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

function renderInput(value: string) {
    const model = new FormModel(value);
    onTestFinished(() => model.destroy());
    render(searchInput({model, bind: 'value', testId: 'search'}));
    const input = screen.getByTestId('search') as HTMLInputElement;
    return {input, model};
}
