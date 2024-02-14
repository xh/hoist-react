/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp, HoistProps, HSide} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {radio, radioGroup} from '@xh/hoist/kit/blueprint';
import {computed, makeObservable} from '@xh/hoist/mobx';
import {getTestId, TEST_ID, withDefault} from '@xh/hoist/utils/js';
import {filter, isObject} from 'lodash';
import './RadioInput.scss';

export interface RadioInputProps extends HoistProps, HoistInputProps {
    /** True to display each radio button inline with each other. */
    inline?: boolean;

    /** Placement of each option's label relative its radio button, default 'right'. */
    labelSide?: HSide;

    /** Array of available options */
    options: (RadioOption | any)[];
}

export interface RadioOption {
    value: any;
    label?: string;
    disabled?: boolean;
}
/**
 * An input for managing Radio Buttons.
 */
export const [RadioInput, radioInput] = hoistCmp.withFactory<RadioInputProps>({
    displayName: 'RadioInput',
    className: 'xh-radio-input',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, RadioInputModel);
    }
});

//-----------------------
// Implementation
//-----------------------
class RadioInputModel extends HoistInputModel {
    override xhImpl = true;

    get enabledInputs(): HTMLInputElement[] {
        const btns = this.domEl?.querySelectorAll('input') ?? [];
        return filter(btns, {disabled: false});
    }

    @computed
    get normalizedOptions(): RadioOption[] {
        const options = this.componentProps.options ?? [];
        return options.map(o => {
            if (isObject(o)) {
                const {label, value, disabled} = o as RadioOption;
                return {value: this.toInternal(value), label, disabled};
            } else {
                return {value: this.toInternal(o), label: o.toString()};
            }
        });
    }

    constructor() {
        super();
        makeObservable(this);
    }

    //-------------------------
    // Options / value handling
    //-------------------------
    onChange = e => {
        this.noteValueChange(e.target.value);
    };

    //-----------------
    // Overrides
    //-----------------
    override blur() {
        this.enabledInputs.forEach(it => it.blur());
    }

    override focus() {
        this.enabledInputs[0]?.focus();
    }
}

const cmp = hoistCmp.factory<RadioInputModel>(({model, className, ...props}, ref) => {
    const {normalizedOptions} = model,
        labelSide = withDefault(props.labelSide, 'right');

    const items = normalizedOptions.map(opt => {
        return radio({
            alignIndicator: labelSide === 'left' ? 'right' : 'left',
            disabled: opt.disabled,
            label: opt.label,
            value: opt.value,
            className: 'xh-radio-input-option',
            [TEST_ID]: getTestId(props.testId, `${opt.label}`),
            onFocus: model.onFocus,
            onBlur: model.onBlur
        });
    });

    return radioGroup({
        className,
        items,
        disabled: props.disabled,
        inline: props.inline,
        selectedValue: model.renderValue,
        onChange: model.onChange,
        testId: props.testId,
        ref
    });
});
