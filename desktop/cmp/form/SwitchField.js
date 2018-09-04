/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {switchControl} from '@xh/hoist/kit/blueprint';

import {HoistField} from '@xh/hoist/cmp/form';

/**
 * Switch Field. 
 * Note that that component does not handle null values. For nullable fields, use a SelectField.
 */
@HoistComponent()
export class SwitchField extends HoistField {

    static propTypes = {
        ...HoistField.propTypes,
        value: PT.bool
    };

    static defaultProps = {
        commitOnChange: true,
        inline: true
    };

    baseClassName = 'xh-switch-field';

    render() {
        return switchControl({
            className: this.getClassName(),
            checked: !!this.renderValue,
            onChange: this.onChange,
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            ...this.getDelegateProps()
        });
    }

    onChange = (e) => {
        this.noteValueChange(e.target.checked);
    }

}
export const switchField = elemFactory(SwitchField);
