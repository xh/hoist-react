/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {searchInput as onsenSearchInput} from '@xh/hoist/kit/onsen';
import {withDefault} from '@xh/hoist/utils/js';
import {HoistInput} from '@xh/hoist/cmp/form';

/**
 * A Search Input
 *
 * @see HoistInput for properties additional to those documented below.
 */
@HoistComponent
export class SearchInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.string,

        /** Text to display when control is empty */
        placeholder: PT.string,

        /** Whether to allow browser spell check, defaults to false */
        spellCheck: PT.bool,

        /** Onsen modifier string */
        modifier: PT.string,

        /** Function which receives keypress event */
        onKeyPress: PT.func,

        /** Whether text in field is selected when field receives focus */
        selectOnFocus: PT.bool
    };

    baseClassName = 'xh-search-input';

    render() {
        const {props} = this,
            spellCheck = withDefault(this.props.spellCheck, false);

        return onsenSearchInput({
            className: this.getClassName(),
            value: this.renderValue || '',
            onChange: this.onChange,
            onKeyPress: this.onKeyPress,
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            style: {...props.style, width: props.width},
            spellCheck,
            disabled: props.disabled,
            placeholder: props.placeholder,
            modifier: props.modifier
        });
    }

    onFocus = (ev) => {
        if (this.props.selectOnFocus && ev.target && ev.target.select) {
            ev.target.select();
        }
        this.noteFocused();
    };

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
    };

    onKeyPress = (ev) => {
        const {onKeyPress} = this.props;

        if (ev.key === 'Enter') this.doCommit();
        if (onKeyPress) onKeyPress(ev);
    };
}
export const searchInput = elemFactory(SearchInput);