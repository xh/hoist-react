/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputPropTypes, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import {div, textarea as textareaTag} from '@xh/hoist/cmp/layout';
import {withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import PT from 'prop-types';
import './TextArea.scss';

/**
 * A multi-line text input.
 */
export const [TextArea, textArea] = hoistCmp.withFactory({
    displayName: 'TextArea',
    className: 'xh-textarea',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, Model);
    }
});
TextArea.propTypes = {
    ...HoistInputPropTypes,
    value: PT.string,

    /** True to commit on every change/keystroke, default false. */
    commitOnChange: PT.bool,

    /** Height of the control in pixels. */
    height: PT.number,

    /** Function which receives keydown event */
    onKeyDown: PT.func,

    /** Text to display when control is empty */
    placeholder: PT.string,

    /** Whether text in field is selected when field receives focus */
    selectOnFocus: PT.bool,

    /** Whether to allow browser spell check, defaults to true */
    spellCheck: PT.bool
};
TextArea.hasLayoutSupport = true;


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
        const {width, height, ...layoutProps} = getLayoutProps(props);

        return div({
            item: textareaTag({
                value: model.renderValue || '',

                disabled: props.disabled,
                placeholder: props.placeholder,
                spellCheck: withDefault(props.spellCheck, false),
                tabIndex: props.tabIndex,

                onChange: model.onChange,
                onKeyDown: model.onKeyDown,
                onBlur: model.onBlur,
                onFocus: model.onFocus
            }),
            style: {
                ...props.style,
                ...layoutProps,
                width: withDefault(width, null),
                height: withDefault(height, 100)
            },

            className,
            ref
        });
    }
);
