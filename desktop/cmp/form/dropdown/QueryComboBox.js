/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {Classes, suggest} from '@xh/hoist/kit/blueprint';

import {BaseComboBox} from './BaseComboBox';

/**
 * ComboBox which populates its options dynamically based on the current value.
 */
@HoistComponent
export class QueryComboBox extends BaseComboBox {
    
    static propTypes = {
        ...BaseComboBox.propTypes,

        /**
         * Function to be run when value of control changes to repopulate the available items.
         * Should return a promise resolving to a collection of form:
         *      [{value: string, label: string}, ...]
         * or
         *      [val, val, ...]
         */
        queryFn: PT.func,
        /** Delay (in ms) used to buffer calls to the queryFn (default 100) */
        queryBuffer: PT.number,
        /** Optional custom optionRenderer, a function that receives (option, optionProps) */
        optionRenderer: PT.func,
        /** Whether to force values from given options. Set to true to disallow arbitrary input */
        requireSelection: PT.bool,
        /** Icon to display on the left side of the field */
        leftIcon: PT.element,
        /** Element to display on the right side of the field */
        rightElement: PT.element
    };

    delegateProps = ['className', 'style', 'placeholder', 'disabled', 'leftIcon', 'rightElement'];

    baseClassName = 'xh-query-combo-box';

    constructor(props) {
        super(props);
        this.addAutorun({
            run: this.syncOptions,
            delay: props.queryBuffer || 100
        });
    }

    render() {
        const {style, width, disabled} = this.props,
            {renderValue, internalOptions} = this;

        return suggest({
            className: this.getClassName(),
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: internalOptions,
            onItemSelect: this.onItemSelect,
            itemRenderer: this.getOptionRenderer(),
            inputValueRenderer: s => s,
            inputProps: {
                value: this.getDisplayValue(renderValue, internalOptions, ''),
                onChange: this.onChange,
                onKeyPress: this.onKeyPress,
                onBlur: this.onBlur,
                onFocus: this.onFocus,
                autoComplete: 'nope',
                style: {...style, width},
                ...this.getDelegateProps()
            },
            disabled
        });
    }

    onBlur = () => {
        this.noteBlurred();
    }

    onFocus = () => {
        this.noteFocused();
    }

    syncOptions() {
        const value = this.internalValue,
            {queryFn} = this.props;

        if (queryFn) {
            queryFn(value).then(options => {
                this.normalizeOptions(options);
            });
        }
    }
}
export const queryComboBox = elemFactory(QueryComboBox);