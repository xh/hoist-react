/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {switchControl} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import {HoistInput} from '@xh/hoist/cmp/form';

/**
 * Switch Input.
 */
@HoistComponent
export class SwitchInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.bool,

        /** Label text.  Applications may omit if this input is renderered within a labelled FormField. */
        label: PT.string,
        /** True if the control should appear as an inline element (defaults to true). */
        inline: PT.bool
    };

    baseClassName = 'xh-switch-input';

    render() {
        const {props} = this,
            inline = withDefault(props.inline, true);

        return switchControl({
            className: this.getClassName(),
            checked: !!this.renderValue,
            onChange: this.onChange,
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            tabIndex: props.tabIndex,
            style: props.style,
            disabled: props.disabled,
            label: props.label,
            inline
        });
    }

    onChange = (e) => {
        this.noteValueChange(e.target.checked);
    };
}
export const switchInput = elemFactory(SwitchInput);
