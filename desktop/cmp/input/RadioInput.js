/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInputPropTypes, HoistInputModel, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import {radio, radioGroup} from '@xh/hoist/kit/blueprint';
import {computed, makeObservable} from '@xh/hoist/mobx';
import {withDefault} from '@xh/hoist/utils/js';
import {filter, isObject} from 'lodash';
import PT from 'prop-types';
import './RadioInput.scss';

/**
 * An input for managing Radio Buttons.
 */
export const [RadioInput, radioInput] = hoistCmp.withFactory({
    displayName: 'RadioInput',
    className: 'xh-radio-input',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, Model);
    }
});
RadioInput.propTypes = {
    ...HoistInputPropTypes,
    /** True to display each radio button inline with each other. */
    inline: PT.bool,

    /** Alignment of each option's label relative its radio button, default right. */
    labelAlign: PT.oneOf(['left', 'right']),

    /**
     * Array of available options, of the form:
     *
     *      [{value: string, label: string, disabled: bool}, ...]
     *          - or -
     *      [val, val, ...]
     */
    options: PT.arrayOf(PT.oneOfType([PT.object, PT.string]))
};

//-----------------------
// Implementation
//-----------------------
class Model extends HoistInputModel {

    blur() {
        this.enabledInputs.forEach(it => it.blur());
    }

    focus() {
        this.enabledInputs[0]?.focus();
    }

    get enabledInputs() {
        const btns = this.domEl?.querySelectorAll('input') ?? [];
        return filter(btns, {disabled: false});
    }

    @computed
    get normalizedOptions() {
        const options = this.props.options ?? [];
        return options.map(o => {
            const ret = isObject(o) ?
                {label: o.label, value: o.value, disabled: o.disabled} :
                {label: o.toString(), value: o};

            ret.value = this.toInternal(ret.value);
            return ret;
        });
    }

    constructor(props) {
        super(props);
        makeObservable(this);
    }

    //-------------------------
    // Options / value handling
    //-------------------------
    onChange = (e) => {
        this.noteValueChange(e.target.value);
    }
}

const cmp = hoistCmp.factory(
    ({model, className, ...props}, ref) => {
        const {normalizedOptions} = model,
            labelAlign = withDefault(props.labelAlign, 'right');

        const items = normalizedOptions.map(opt => {
            return radio({
                alignIndicator: labelAlign === 'left' ? 'right' : 'left',
                disabled: opt.disabled,
                label: opt.label,
                value: opt.value,
                className: 'xh-radio-input-option',
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
            ref
        });
    }
);