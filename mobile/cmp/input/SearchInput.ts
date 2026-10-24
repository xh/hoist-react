/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {div, hbox, input} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import '@xh/hoist/mobile/register';
import {TEST_ID, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import './SearchInput.scss';
import type {Property} from 'csstype';

export interface SearchInputProps extends HoistProps, HoistInputProps {
    value?: string;

    /** True to commit on every change/keystroke, default false. */
    commitOnChange?: boolean;

    /** Text to display when control is empty */
    placeholder?: string;

    /** Whether text in field is selected when field receives focus */
    selectOnFocus?: boolean;

    /** Whether to allow browser spell check, defaults to false */
    spellCheck?: boolean;

    /** Alignment of entry text within control, default 'left'. */
    textAlign?: Property.TextAlign;

    /**
     * True to trim leading/trailing whitespace from this input's value as committed to any bound
     * model and reported to `onChange` / `onCommit`. Default true.
     */
    trimWhitespace?: boolean;
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

    override get trimWhitespace() {
        return withDefault(this.componentProps.trimWhitespace, true);
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

    return hbox({
        ref,
        className,
        display: 'inline-flex',
        style: {
            ...props.style,
            ...layoutProps,
            width: withDefault(width, null)
        },
        items: [
            div({className: 'xh-search-input__icon', item: Icon.search()}),
            input({
                className: 'xh-search-input__input',
                type: 'search',
                value: model.renderValue || '',

                disabled: props.disabled,
                placeholder: props.placeholder,
                spellCheck: withDefault(props.spellCheck, false),
                tabIndex: props.tabIndex,

                style: {textAlign: withDefault(props.textAlign, 'left')},
                [TEST_ID]: props.testId,
                ...props.domAttrs,

                onChange: model.onChange,
                onKeyDown: model.onKeyDown,
                onBlur: model.onBlur,
                onFocus: model.onFocus
            })
        ]
    });
});
