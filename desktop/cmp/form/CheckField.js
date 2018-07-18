/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {label} from '@xh/hoist/desktop/cmp/form';
import {checkbox} from '@xh/hoist/kit/blueprint';

import {HoistField} from './HoistField';

/**
 * CheckBox Field.
 *
 * Note that this field does not handle null values.  For nullable fields use a SelectField.
 */
@HoistComponent()
export class CheckField extends HoistField {

    static propTypes = {
        ...HoistField.propTypes,

        /** Value of the control */
        value: PT.bool,

        /** Name for labeling field */
        text: PT.string
    };

    static defaultProps = {
        commitOnChange: true
    }

    delegateProps = ['className', 'disabled'];

    render() {
        const {text, style} = this.props;

        return checkbox({
            checked: !!this.renderValue,
            onChange: this.onChange,
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
export const checkField = elemFactory(CheckField);