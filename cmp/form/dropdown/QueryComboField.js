/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {observable, setter} from '@xh/hoist/mobx';
import {Classes, suggest} from '@xh/hoist/kit/blueprint';

import {BaseComboField} from './BaseComboField';

/**
 * ComboBox Field which populates its options dynamically based on the current value.
 */
@HoistComponent()
export class QueryComboField extends BaseComboField {
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
        this.addAutorun({
            run: this.syncOptions,
            delay: props.queryBuffer || 100
        });
    }

    render() {
        const {style, width, disabled} = this.props,
            {renderValue} = this;

        return suggest({
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: this.options,
            onItemSelect: this.onItemSelect,
            itemRenderer: this.getOptionRenderer(),
            inputValueRenderer: s => s,
            inputProps: {
                value: this.getDisplayValue(renderValue, this.options, ''),
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
}
export const queryComboField = elemFactory(QueryComboField);