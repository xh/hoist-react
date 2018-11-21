/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {select as onsenSelect} from '@xh/hoist/kit/onsen';
import {option} from '@xh/hoist/cmp/layout';
import {isObject} from 'lodash';

import {HoistInput} from '@xh/hoist/cmp/form';

/**
 * A Select Input
 *
 * @see HoistInput for properties additional to those documented below.
 */
@HoistComponent
export class Select extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,

        /** Collection of form [{value: string, label: string}, ...] or [val, val, ...] */
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string])).isRequired,

        /** Onsen modifier string */
        modifier: PT.string
    };

    baseClassName = 'xh-select';

    render() {
        const {props} = this,
            items = props.options.map(it => this.renderOption(it));
        console.log(items);

        return onsenSelect({
            className: this.getClassName(),
            value: this.renderValue || '',
            onChange: this.onChange,
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            style: {...props.style, width: props.width},
            items,
            disabled: props.disabled,
            modifier: props.modifier
        });
    }

    renderOption(o) {
        const value = isObject(o) ? o.value : o,
            label = isObject(o) ? o.label : value;

        return option({
            key: value,
            value,
            item: label
        });
    }

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
        this.doCommit();
    };
}
export const select = elemFactory(Select);