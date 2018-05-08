/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {hoistComponent, elemFactory} from 'hoist/core';
import {observable, setter} from 'hoist/mobx';
import {Classes, suggest} from 'hoist/kit/blueprint';

import {BaseDropdownField} from './BaseDropdownField';

/**
 * ComboBox Field which populates its options dynamically based on the current value.
 */
@hoistComponent()
export class QueryComboField extends BaseDropdownField {
    @observable.ref @setter options = [];

    static propTypes = {
        /**
         * Function to be run when value of control changes to repopulate the available items.
         * Should return a promise resolving to a collection of form:
         *      [{value: string, label: string}, ...]
         * or
         *      [val, val, ...]
         */
        queryFn: PT.func.isRequired,
        /** Delay (in ms) used to buffer calls to the queryFn (default 100) */
        queryBuffer: PT.number,
        /** Optional custom optionRenderer, a function that receives (option, optionProps) */
        optionRenderer: PT.func,
        /** Whether to force values from given options. Set to true to disallow arbitrary input */
        requireSelection: PT.bool
    };

    delegateProps = ['className', 'style', 'placeholder', 'disabled'];

    constructor(props) {
        super(props);
        this.addAutoRun(() => this.syncOptions(), {delay: props.queryBuffer || 100});
    }

    render() {
        const {style, width, disabled} = this.props;

        const value = this.renderValue;

        return suggest({
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: this.options,
            onItemSelect: this.onItemSelect,
            itemRenderer: this.getOptionRenderer(),
            inputValueRenderer: s => s,
            inputProps: {
                value: this.getDisplayValue(value, this.options, ''),
                onChange: this.onChange,
                onKeyPress: this.onKeyPress,
                onBlur: this.onBlur,
                onFocus: this.onFocus,
                style: {...style, width},
                ...this.getDelegateProps()
            },
            disabled
        });
    }

    syncOptions() {
        const value = this.internalValue,
            {queryFn} = this.props;

        if (queryFn) {
            queryFn(value).then(options => {
                this.setOptions(this.normalizeOptions(options));
            });
        }
    }

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
    }

}
export const queryComboField = elemFactory(QueryComboField);