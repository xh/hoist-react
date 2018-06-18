/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {label} from '@xh/hoist/cmp/form';
import {switchControl} from '@xh/hoist/kit/blueprint';

import {HoistField} from './HoistField';

/**
 * Switch Field. 
 
 * Note that that component does not handle null values, for nullable fields use a SelectField.
 */
@HoistComponent()
export class SwitchField extends HoistField {

    static propTypes = {
        ...HoistField.propTypes,

        /** Value of the control */
        value: PT.bool,

        /** Name for labeling field */
        text: PT.string,

        /** Use large styles */
        large: PT.bool
    };

    static defaultProps = {
        commitOnChange: true
    };

    delegateProps = ['className', 'disabled'];

    render() {
        const {large, text, style} = this.props;

        return switchControl({
            checked: !!this.renderValue,
            onChange: this.onChange,
            large,
            style: {...style, marginBottom: '0px', marginRight: '0px'},
            label: label(text || ''),
            inline: true,
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
