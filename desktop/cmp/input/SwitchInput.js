/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputPropTypes, hoistInputHost} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import {switchControl} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
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

    value: PT.bool,

    /** True if the control should appear as an inline element (defaults to true). */
    inline: PT.bool,

    /**
     * Label displayed adjacent to the control itself.
     * Can be used with or without an additional overall label as provided by FormField.
     */
    label: PT.oneOfType([PT.string, PT.element]),

    /** Alignment of the inline label relative to the control itself, default right. */
    labelAlign: PT.oneOf(['left', 'right'])
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
        const labelAlign = withDefault(props.labelAlign, 'right');

        return switchControl({
            checked: !!model.renderValue,

            alignIndicator: labelAlign === 'left' ? 'right' : 'left',
            disabled: props.disabled,
            inline: withDefault(props.inline, true),
            label: props.label,
            style: props.style,
            tabIndex: props.tabIndex,

            id: props.id,
            className: model.getClassName(),

            onBlur: model.onBlur,
            onChange: model.onChange,
            onFocus: model.onFocus,
            ref
        });
    }
);