/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputPropTypes, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import {Button, ButtonGroup, buttonGroup} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {throwIf, warnIf, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps, getNonLayoutProps} from '@xh/hoist/utils/react';
import {isEmpty, filter, without, castArray} from 'lodash';
import PT from 'prop-types';
import {Children, cloneElement} from 'react';

/**
 * A segmented group of buttons, one of which is depressed to indicate the input's current value.
 *
 * Should receive a list of Buttons as a children. Each Button requires a 'value' prop.
 * The buttons are automatically configured to set this value on click and appear pressed if the
 * ButtonGroupInput's value matches.
 */
export const [ButtonGroupInput, buttonGroupInput] = hoistCmp.withFactory({
    displayName: 'ButtonGroupInput',
    className: 'xh-button-group-input',
    render(props, ref) {
        warnIf(
            props.enableMulti && props.enableClear === false,
            'enableClear prop cannot be set to false when enableMulti is true - setting ignored.'
        );
        return useHoistInputModel(cmp, props, ref, ButtonGroupInputModel);
    }
});
ButtonGroupInput.propTypes = {
    ...HoistInputPropTypes,
    ...ButtonGroup.propTypes,

    /**
     * True to allow buttons to be unselected (aka inactivated). Defaults to false.
     * Does not apply when enableMulti: true.
     */
    enableClear: PT.bool,

    /** True to allow entry/selection of multiple values - "tag picker" style. Defaults to false.*/
    enableMulti: PT.bool,

    /** Intent applied to each button. */
    intent: PT.oneOf(['primary', 'success', 'warning', 'danger']),

    /** True to create minimal-style buttons. */
    minimal: PT.bool,

    /** True to create outlined-style buttons. */
    outlined: PT.bool
};
ButtonGroupInput.hasLayoutSupport = true;


//----------------------------------
// Implementation
//----------------------------------
class ButtonGroupInputModel extends HoistInputModel {
    xhImpl = true;

    get enableMulti() {return !!this.componentProps.enableMulti}
    get enableClear() {return !!this.componentProps.enableClear}

    blur() {
        this.enabledButtons.forEach(it => it.blur());
    }

    focus() {
        this.enabledButtons[0]?.focus();
    }

    get enabledButtons() {
        const btns = this.domEl?.querySelectorAll('button') ?? [];
        return filter(btns, {disabled: false});
    }

    isActive(value) {
        const {renderValue} = this;
        return this.enableMulti ? renderValue?.includes(value) : renderValue === value;
    }

    onButtonClick(value) {
        const isActive = this.isActive(value);
        if (this.enableMulti) {
            const current = this.renderValue ? castArray(this.renderValue) : [];
            value = isActive ? without(current, value) : [...current, value];
            if (isEmpty(value)) value = null;
        } else {
            value = this.enableClear && isActive ? null : value;
        }
        this.noteValueChange(value);
    }
}

const cmp = hoistCmp.factory(
    ({model, className, ...props}, ref) => {
        const {
            children,
            //  HoistInput Props
            bind,
            disabled,
            onChange,
            onCommit,
            tabIndex,
            value,
            // ButtonGroupInput Props
            enableClear,
            enableMulti,
            // Button props applied to each child button
            intent,
            minimal,
            outlined,
            // ...and ButtonGroup gets all the rest
            ...buttonGroupProps
        } = getNonLayoutProps(props);

        const buttons = Children.map(children, button => {
            if (!button) return null;

            const {value, intent: btnIntent} = button.props,
                btnDisabled = disabled || button.props.disabled;

            throwIf(button.type !== Button, 'ButtonGroupInput child must be a Button.');
            throwIf(value == null, 'ButtonGroupInput child must declare a non-null value');

            const isActive = model.isActive(value);

            return cloneElement(button, {
                active: isActive,
                intent: btnIntent ?? intent,
                minimal: withDefault(minimal, false),
                outlined: withDefault(outlined, false),
                disabled: withDefault(btnDisabled, false),
                onClick: () => model.onButtonClick(value),
                // Workaround for https://github.com/palantir/blueprint/issues/3971
                key: `${isActive} ${value}`,
                autoFocus: isActive && model.hasFocus
            });
        });

        return buttonGroup({
            items: buttons,
            ...buttonGroupProps,
            minimal: withDefault(minimal, outlined, false),
            ...getLayoutProps(props),
            onBlur: model.onBlur,
            onFocus: model.onFocus,
            className,
            ref
        });
    }
);
