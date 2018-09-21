/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {isObject} from 'lodash';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {radio, radioGroup} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';

import {HoistInput} from '@xh/hoist/cmp/form';
import './RadioInput.scss';


@HoistComponent
export class RadioInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        /** Collection of form [{value: string, label: string}, ...] or [val, val, ...]
         * Individual radio buttons can be disabled by adding a disabled: true property to an option*/
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string])),
        /** True to display each radio button inline with each other */
        inline: PT.bool,
        /** Alignment of the indicator with respect to it's label.*/
        alignIndicator: PT.oneOf(['left', 'right'])
    };

    static defaultProps = {
        commitOnChange: true
    };

    // blueprint-ready collection of available options, normalized to {label, value} form.
    @observable.ref internalOptions = [];

    constructor(props) {
        super(props);
        this.addAutorun(() => this.normalizeOptions(this.props.options));
    }

    //-----------------------------------------------------------
    // Common handling of options, rendering of selected option
    //-----------------------------------------------------------
    @action
    normalizeOptions(options) {
        options = withDefault(options, []);
        this.internalOptions = options.map(o => {
            const ret = isObject(o) ?
                {label: o.label, value: o.value, disabled: o.disabled} :
                {label: o.toString(), value: o};

            ret.value = this.toInternal(ret.value);
            return ret;
        });
    }

    //---------------------------------------------------------------------------
    // Handling of null values.  Blueprint doesn't allow null for the value of a
    // radio control, but we can use a sentinel value to represent it.
    //----------------------------------------------------------------------------
    toExternal(internal) {
        return internal === NULL_VALUE ? null : internal;
    }

    toInternal(external) {
        return external ===  null ? NULL_VALUE : external;
    }

    render() {
        const {inline, alignIndicator} = this.props,
            {internalOptions} = this;

        const items = internalOptions.map(opt => {
            return radio({
                className: 'xh-radio-input',
                label: opt.label,
                value: opt.value,
                disabled: opt.disabled,
                alignIndicator
            });
        });

        return radioGroup({
            className: this.getClassName(),
            onChange: this.onChange,
            inline,
            selectedValue: this.renderValue,
            items
        });
    }

    onChange = (e) => {
        this.noteValueChange(e.target.value);
    }

}

export const radioInput = elemFactory(RadioInput);
const NULL_VALUE = 'xhNullValue';