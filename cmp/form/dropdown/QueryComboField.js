/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {hoistComponent, elemFactory} from 'hoist/core';
import {observable, setter} from 'hoist/mobx';
import {Classes, suggest} from 'hoist/kit/blueprint';

import {BaseDropdownField} from './BaseDropdownField';

/**
 * ComboBox Field which populates its options dynamically based on the current value.
 *
 * @prop rest, see properties for HoistField
 *
 * @prop queryFn, function to be run when value of control changes to repopulate the available items.
 *       Should return a promise resolving to a collection of form [{value: string, label: string}, ...]
 *       or [val, val, ...].
 * @prop queryBuffer, ms delay used to buffer calls to the queryFn (default 100)
 * @prop placeholder, text to display when control is empty
 * @prop itemRenderer, optional custom itemRenderer, a function that receives (item, itemProps)
 */
@hoistComponent()
export class QueryComboField extends BaseDropdownField {
    @observable.ref @setter options = [];

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
            itemRenderer: this.getItemRenderer(),
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
            {queryAsync} = this.props;

        if (queryAsync) {
            queryAsync(value).then(options => {
                this.setOptions(this.normalizeOptions(options));
            });
        }
    }

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
    }

    onKeyPress = (ev) => {
        if (ev.key === 'Enter') {
            this.doCommit();
        }
    }
}
export const queryComboField = elemFactory(QueryComboField);