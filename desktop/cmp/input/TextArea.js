/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputPropTypes, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import {textArea as bpTextarea} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import PT from 'prop-types';
import './TextArea.scss';

/**
 * A multi-line text input.
 */
export const [TextArea, textArea] = hoistCmp.withFactory({
    displayName: 'TextArea',
    className: 'xh-text-area',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, Model);
    }
});
TextArea.propTypes = {
    ...HoistInputPropTypes,
    value: PT.string,

    /** True to focus the control on render. */
    autoFocus: PT.bool,

    /** True to commit on every change/keystroke, default false. */
    commitOnChange: PT.bool,

    /** True to take up the full width of container. */
    fill: PT.bool,

    /** Ref handler that receives HTML <input> element backing this component. */
    inputRef: PT.oneOfType([PT.instanceOf(Function), PT.instanceOf(Object)]),

    /** Callback for normalized keydown event. */
    onKeyDown: PT.func,

    /** True to select contents when control receives focus. */
    selectOnFocus: PT.bool,

    /** True to allow browser spell check, default false. */
    spellCheck: PT.bool,

    /** Text to display when control is empty. */
    placeholder: PT.string
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
        if (ev.key === 'Enter' && !ev.shiftKey) this.doCommit();
        if (this.props.onKeyDown) this.props.onKeyDown(ev);
    };

    onFocus = (ev) => {
        if (this.props.selectOnFocus) {
            ev.target.select();
        }
        this.noteFocused();
    };
}


const cmp = hoistCmp.factory(
    ({model, className, ...props}, ref) => {
        const {width, height, ...layoutProps} = getLayoutProps(props);

        return bpTextarea({
            value: model.renderValue || '',

            autoFocus: props.autoFocus,
            disabled: props.disabled,
            fill: props.fill,
            inputRef: props.inputRef,
            placeholder: props.placeholder,
            spellCheck: withDefault(props.spellCheck, false),
            tabIndex: props.tabIndex,

            id: props.id,
            className,
            style: {
                ...props.style,
                ...layoutProps,
                width: withDefault(width, 300),
                height: withDefault(height, 100)
            },

            onBlur: model.onBlur,
            onChange: model.onChange,
            onFocus: model.onFocus,
            onKeyDown: model.onKeyDown,
            ref
        });
    }
);
