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
        /** Optional label for entire control, labels for individual button provided by options prop */
        label: PT.string,
        /** Alignment of the indicator with respect to it's label.*/
        align: PT.oneOf(['left', 'right'])
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
        const {label, inline, align} = this.props,
            {internalOptions} = this;

        // When an option is rendered by BP's RadioGroup component it doesn't pass the alignIndicator to the Radio it creates
        // We therefore pass radio components as children rather than an array of configs as options prop
        // https://github.com/palantir/blueprint/blob/4f55b625352830ad8d46ea0f1f72d2ae752584ee/packages/core/src/components/forms/radioGroup.tsx#L71
        const items = internalOptions.map(opt => {
            return radio({
                className: 'xh-radio-input',
                label: opt.label,
                value: opt.value,
                disabled: opt.disabled,
                alignIndicator: align
            });
        });

        return radioGroup({
            className: this.getClassName(),
            onChange: this.onChange,
            label,
            inline,
            selectedValue: this.toInternal(this.externalValue),
            items
        });
    }

    onChange = (e) => {
        this.noteValueChange(e.target.value);
    }

}

export const radioInput = elemFactory(RadioInput);
const NULL_VALUE = 'xhNullValue';