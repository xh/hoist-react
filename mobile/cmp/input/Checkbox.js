/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInputPropTypes, HoistInputModel, hoistInputHost} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import {checkbox as onsenCheckbox} from '@xh/hoist/kit/onsen';
import PT from 'prop-types';
import './Checkbox.scss';

/**
 * Checkbox control for boolean values.
 */
export const [Checkbox, checkbox] = hoistCmp.withFactory({
    displayName: 'Checkbox',
    render(props, ref) {
        return hoistInputHost({modelSpec: Model, cmpSpec: cmp, ...props, ref});
    }
});
Checkbox.propTypes = {
    ...HoistInputPropTypes,

    value: PT.string,

    /** Onsen modifier string */
    modifier: PT.string
};

//----------------------------------
// Implementation
//----------------------------------
class Model extends HoistInputModel {

    baseClassName = 'xh-checkbox';

    constructor(props) {
        super(props);
    }

    onChange = (e) => {
        this.noteValueChange(e.target.checked);
    };
}

const cmp = hoistCmp.factory(
    ({model, ...props}, ref) => {
        return onsenCheckbox({
            checked: !!model.renderValue,

            disabled: props.disabled,
            modifier: props.modifier,
            tabIndex: props.tabIndex,

            className: model.getClassName(),
            style: props.style,

            onChange: model.onChange,
            onBlur: model.onBlur,
            onFocus: model.onFocus,
            ref
        });
    }
);