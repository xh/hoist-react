/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {inputGroup} from '@xh/hoist/kit/blueprint';
import {fmtDateTime} from '@xh/hoist/format';
import {div} from '@xh/hoist/cmp/layout';

import {HoistInput} from '@xh/hoist/cmp/form';

/**
 * A Display Field
 *
 * @see HoistInput for properties additional to those documented below.
 */
@HoistComponent
export class DisplayField extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,

        /** Value of the control */
        value: PT.string,
        /** Type of input desired */
        type: PT.oneOf(['text', 'password'])
    };

    delegateProps = ['className', 'type'];

    baseClassName = 'xh-display-input';

    render() {
        const {style, width} = this.props;

        // return inputGroup({
        //     className: this.getClassName(),
        //     value: this.renderDisplayValue() || '',
        //     style: {...style, width},
        //     readOnly: true,
        //     ...this.getDelegateProps()
        // });

        return div({
            className: this.getClassName(),
            style: {...style, width},
            item: this.renderDisplayValue() || '',
            ...this.getDelegateProps()
        });
    }

    renderDisplayValue() {
        const value = this.renderValue;

        if (value instanceof Date) {
            return fmtDateTime(value);
        } else if (value && this.props.type === 'password') {
            return value.replace(/./g, '*');
        } else {
            return value;
        }
    }

}

export const displayField = elemFactory(DisplayField);