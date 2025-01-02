/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp, HoistProps, HSide} from '@xh/hoist/core';
import {searchInput as onsenSearchInput} from '@xh/hoist/kit/onsen';
import '@xh/hoist/mobile/register';
import {withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import './SearchInput.scss';

export interface SearchInputProps extends HoistProps, HoistInputProps {
    value?: string;

    /** True to commit on every change/keystroke, default false. */
    commitOnChange?: boolean;

    /** Onsen modifier string */
    modifier?: string;

    /** Text to display when control is empty */
    placeholder?: string;

    /** Whether text in field is selected when field receives focus */
    selectOnFocus?: boolean;

    /** Whether to allow browser spell check, defaults to false */
    spellCheck?: boolean;

    /** Alignment of entry text within control, default 'left'. */
    textAlign?: HSide;
}

/**
 * A Search Input
 */
export const [SearchInput, searchInput] = hoistCmp.withFactory<SearchInputProps>({
    displayName: 'SearchInput',
    className: 'xh-search-input',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, SearchInputModel);
    }
});
(SearchInput as any).hasLayoutSupport = true;

//-----------------------
// Implementation
//-----------------------
class SearchInputModel extends HoistInputModel {
    override xhImpl = true;

    override get commitOnChange() {
        return withDefault(this.componentProps.commitOnChange, false);
    }

    onChange = ev => {
        this.noteValueChange(ev.target.value);
    };

    onKeyDown = ev => {
        if (ev.key === 'Enter') this.doCommit();
        this.componentProps.onKeyDown?.(ev);
    };

    override onFocus = ev => {
        if (this.componentProps.selectOnFocus && ev.target && ev.target.select) {
            ev.target.select();
        }
        this.noteFocused();
    };
}

const cmp = hoistCmp.factory<SearchInputModel>(({model, className, ...props}, ref) => {
    const {width, ...layoutProps} = getLayoutProps(props);

    return onsenSearchInput({
        value: model.renderValue || '',

        disabled: props.disabled,
        modifier: props.modifier,
        placeholder: props.placeholder,
        spellCheck: withDefault(props.spellCheck, false),
        tabIndex: props.tabIndex,

        className,
        style: {
            ...props.style,
            ...layoutProps,
            width: withDefault(width, null),
            textAlign: withDefault(props.textAlign, 'left')
        },

        onInput: model.onChange,
        onKeyDown: model.onKeyDown,
        onBlur: model.onBlur,
        onFocus: model.onFocus,
        ref
    });
});
