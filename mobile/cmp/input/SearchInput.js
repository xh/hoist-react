/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {HoistComponent, LayoutSupport, elemFactory} from '@xh/hoist/core';
import {searchInput as onsenSearchInput} from '@xh/hoist/kit/onsen';
import {withDefault} from '@xh/hoist/utils/js';
import {HoistInput} from '@xh/hoist/cmp/input';

/**
 * A Search Input
 */
@HoistComponent
@LayoutSupport
export class SearchInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.string,

        /** True to commit on every change/keystroke, default false. */
        commitOnChange: PT.bool,

        /** Onsen modifier string */
        modifier: PT.string,

        /** Function which receives keydown event */
        onKeyDown: PT.func,

        /** Text to display when control is empty */
        placeholder: PT.string,

        /** Whether text in field is selected when field receives focus */
        selectOnFocus: PT.bool,

        /** Whether to allow browser spell check, defaults to false */
        spellCheck: PT.bool,

        /** Alignment of entry text within control, default 'left'. */
        textAlign: PT.oneOf(['left', 'right'])
    };

    baseClassName = 'xh-search-input';

    get commitOnChange() {
        return withDefault(this.props.commitOnChange, false);
    }

    render() {
        const props = this.getNonLayoutProps(),
            {width, ...layoutProps} = this.getLayoutProps();

        return onsenSearchInput({
            value: this.renderValue || '',

            disabled: props.disabled,
            modifier: props.modifier,
            placeholder: props.placeholder,
            spellCheck: withDefault(props.spellCheck, false),
            tabIndex: props.tabIndex,

            className: this.getClassName(),
            style: {
                ...props.style,
                ...layoutProps,
                width: withDefault(width, null),
                textAlign: withDefault(props.textAlign, 'left')
            },

            onChange: this.onChange,
            onKeyDown: this.onKeyDown,
            onBlur: this.onBlur,
            onFocus: this.onFocus
        });
    }

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
    };

    onKeyDown = (ev) => {
        const {onKeyDown} = this.props;
        if (ev.key === 'Enter') this.doCommit();
        if (onKeyDown) onKeyDown(ev);
    };

    onFocus = (ev) => {
        if (this.props.selectOnFocus && ev.target && ev.target.select) {
            ev.target.select();
        }
        this.noteFocused();
    };
}
export const searchInput = elemFactory(SearchInput);