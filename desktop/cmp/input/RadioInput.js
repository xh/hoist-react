/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {isObject} from 'lodash';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {radio, radioGroup} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';

import {HoistInput} from '@xh/hoist/cmp/input';
import './RadioInput.scss';

/**
 * An input for managing Radio Buttons.
 */
@HoistComponent
export class RadioInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,

        /** True to display each radio button inline with each other. */
        inline: PT.bool,

        /** Alignment of each option's label relative its radio button, default right. */
        labelAlign: PT.oneOf(['left', 'right']),

        /**
         * Array of available options, of the form:
         *
         *      [{value: string, label: string, disabled: bool}, ...]
         *          - or -
         *      [val, val, ...]
         */
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string]))
    };

    @observable.ref internalOptions = [];
    @action setInternalOptions(options) {this.internalOptions = options}

    constructor(props) {
        super(props);
        this.addReaction({
            track: () => this.props.options,
            run: (opts) => {
                opts = this.normalizeOptions(opts);
                this.setInternalOptions(opts);
            },
            fireImmediately: true
        });
    }

    render() {
        const {props, internalOptions} = this,
            labelAlign = withDefault(props.labelAlign, 'right');

        const items = internalOptions.map(opt => {
            return radio({
                alignIndicator: labelAlign == 'left' ? 'right' : 'left',
                disabled: opt.disabled,
                label: opt.label,
                value: opt.value,
                className: 'xh-radio-input'
            });
        });

        return radioGroup({
            items,
            disabled: props.disabled,
            inline: props.inline,
            selectedValue: this.renderValue,
            className: this.getClassName(),
            onChange: this.onChange
        });
    }


    //-------------------------
    // Options / value handling
    //-------------------------
    normalizeOptions(options) {
        options = options || [];
        return options.map(o => {
            const ret = isObject(o) ?
                {label: o.label, value: o.value, disabled: o.disabled} :
                {label: o.toString(), value: o};

            ret.value = this.toInternal(ret.value);
            return ret;
        });
    }
    
    onChange = (e) => {
        this.noteValueChange(e.target.value);
    }
}
export const radioInput = elemFactory(RadioInput);