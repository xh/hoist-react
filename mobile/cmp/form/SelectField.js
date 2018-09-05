/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {select} from '@xh/hoist/kit/onsen';
import {option} from '@xh/hoist/cmp/layout';
import {isObject} from 'lodash';

import {HoistField} from '@xh/hoist/cmp/form';
import './SelectField.scss';

/**
 * A Select Field
 *
 * @see HoistField for properties additional to those documented below.
 */
@HoistComponent
export class SelectField extends HoistField {

    static propTypes = {
        ...HoistField.propTypes,

        /** Collection of form [{value: string, label: string}, ...] or [val, val, ...] */
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string])).isRequired,

        /** Onsen modifier string */
        modifier: PT.string
    };

    delegateProps = ['disabled', 'modifier'];

    baseClassName = 'xh-select-field';

    render() {
        const {options, style, width} = this.props;

        return select({
            className: this.getClassName(),
            value: this.renderValue || '',
            onChange: this.onChange,
            style: {...style, width},
            items: options.map(it => this.renderOption(it)),
            ...this.getDelegateProps()
        });
    }

    renderOption(o) {
        const value = isObject(o) ? o.value : o,
            label = isObject(o) ? o.label : value;

        return option({
            key: value,
            value: value,
            item: label
        });
    }

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
        this.doCommit();
    }

}

export const selectField = elemFactory(SelectField);