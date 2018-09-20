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
            inline,
            style: props.style,
            disabled: props.disabled
        });
    }

    onChange = (e) => {
        this.noteValueChange(e.target.checked);
    };
}
export const switchInput = elemFactory(SwitchInput);
