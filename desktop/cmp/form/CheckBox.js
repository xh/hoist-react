/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {checkbox} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import {HoistInput} from '@xh/hoist/cmp/form';

/**
 * CheckBox.
 *
 * Note that this field does not handle null values. For nullable fields, use a Select.
 */
@HoistComponent
export class CheckBox extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.bool,

        inline: PT.bool // TODO: Is this needed?
    };

    baseClassName = 'xh-check-box';

    render() {
        const {props} = this,
            inline = withDefault(props.inline, true);

        return checkbox({
            className: this.getClassName(),
            checked: !!this.renderValue,
            onChange: this.onChange,
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            tabIndex: props.tabIndex,
            style: props.style,
            disabled: props.disabled,
            inline
        });
    }

    onChange = (e) => {
        this.noteValueChange(e.target.checked);
    }
}
export const checkBox = elemFactory(CheckBox);