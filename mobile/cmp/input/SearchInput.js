/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputPropTypes, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import {searchInput as onsenSearchInput} from '@xh/hoist/kit/onsen';
import {withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import PT from 'prop-types';

/**
 * A Search Input
 */
export const [SearchInput, searchInput] = hoistCmp.withFactory({
    displayName: 'SearchInput',
    className: 'xh-search-input',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, Model);
    }
});
SearchInput.propTypes = {
    ...HoistInputPropTypes,
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
SearchInput.hasLayoutSupport = true;

//-----------------------
// Implementation
//-----------------------
class Model extends HoistInputModel {

    get commitOnChange() {
        return withDefault(this.props.commitOnChange, false);
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

const cmp = hoistCmp.factory(
    ({model, className, ...props}, ref) => {
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

            onChange: model.onChange,
            onKeyDown: model.onKeyDown,
            onBlur: model.onBlur,
            onFocus: model.onFocus,
            ref
        });
    }
);