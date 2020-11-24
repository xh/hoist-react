/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputPropTypes, hoistInputHost} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import {switchControl} from '@xh/hoist/kit/onsen';
import PT from 'prop-types';
import './SwitchInput.scss';

/**
 * Switch (toggle) control for non-nullable boolean values.
 */
export const [SwitchInput, switchInput] = hoistCmp.withFactory({
    displayName: 'SwitchInput',
    render(props, ref) {
        return hoistInputHost({modelSpec: Model, cmpSpec: cmp, ...props, ref});
    }
});
SwitchInput.propTypes = {
    ...HoistInputPropTypes,

    value: PT.string,

    /** Onsen modifier string */
    modifier: PT.string
};


//-----------------------
// Implementation
//-----------------------
class Model extends HoistInputModel {

    baseClassName = 'xh-switch-input';

    onChange = (e) => {
        this.noteValueChange(e.target.checked);
    };
}

const cmp = hoistCmp.factory(
    ({model, ...props}, ref) => {

        return switchControl({
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