/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {FieldModel, FormContext} from '@xh/hoist/cmp/form';
import {box, div, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, ModelPublishMode, uses} from '@xh/hoist/core';
import {fmtDate, fmtDateTime, fmtNumber} from '@xh/hoist/format';
import {label as labelCmp} from '@xh/hoist/mobile/cmp/input';
import {isLocalDate} from '@xh/hoist/utils/datetime';
import {errorIf, throwIf, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isBoolean, isDate, isEmpty, isFinite, isUndefined} from 'lodash';
import PT from 'prop-types';
import {Children, cloneElement, useContext} from 'react';
import './FormField.scss';

/**
 * Standardised wrapper around a HoistInput Component. FormField provides consistent layout,
 * labelling, and optional display of validation messages for the input component.
 *
 * This component is intended to be used within a `Form` component and bound to a 'FieldModel'
 * within that Form's backing `FormModel`.  This binding, can happen explicitly, or by name.

 * FormField will setup the binding between its child HoistInput and the FieldModel instance
 * and can display validation messages, switch between read-only and disabled variants of its
 * child, and source default props via the parent Form's `fieldDefaults` prop.
 *
 * FormFields can be sized and otherwise customized via standard layout props. They will
 * adjust their child Inputs to fill their available space (if appropriate given the input type),
 * so the recommended approach is to specify any sizing on the FormField (as opposed to the Input).
 */
export const [FormField, formField] = hoistCmp.withFactory({
    displayName: 'FormField',
    className: 'xh-form-field',
    model: uses(FieldModel, {fromContext: false, publishMode: ModelPublishMode.NONE}),
    memo: false,

    render({model, className, field, children, info, ...props}) {

        // Resolve FieldModel
        const formContext = useContext(FormContext);
        errorIf(
            isEmpty(formContext),
            `Form field could not find valid FormContext. ` +
            `Make sure you are using a Hoist form ('@xh/hoist/cmp/form/form') ` +
            `and not an HTML Form ('@xh/hoist/cmp/layout/form').`
        );
        const formModel = formContext.model;
        model = model || (formModel && field ? formModel.fields[field] : null);

        // Model related props
        const isRequired = model?.isRequired || false,
            readonly = model?.readonly || false,
            disabled = props.disabled || model?.disabled,
            validationDisplayed = model?.validationDisplayed || false,
            notValid = model?.isNotValid || false,
            displayNotValid = validationDisplayed && notValid,
            errors = model?.errors || [],
            requiredStr = defaultProp('requiredIndicator', props, formContext, '*'),
            requiredIndicator = (isRequired && !readonly && requiredStr) ?
                span({
                    item: ' ' + requiredStr,
                    className: 'xh-form-field-required-indicator'
                }) : null,
            isPending = model && model.isValidationPending;

        // Child related props
        const child = getValidChild(children),
            childIsSizeable = child.type?.hasLayoutSupport || false;

        // Display related props
        const layoutProps =  getLayoutProps(props),
            minimal = defaultProp('minimal', props, formContext, false),
            label = defaultProp('label', props, formContext, model?.displayName),
            commitOnChange = defaultProp('commitOnChange', props, formContext, undefined);

        // Styles
        const classes = [];
        if (isRequired) classes.push('xh-form-field-required');
        if (minimal) classes.push('xh-form-field-minimal');
        if (readonly) classes.push('xh-form-field-readonly');
        if (disabled) classes.push('xh-form-field-disabled');
        if (displayNotValid) classes.push('xh-form-field-invalid');

        let childEl = readonly ?
            readonlyChild({model, readonlyRenderer: props.readonlyRenderer}) :
            editableChild({
                model,
                child,
                childIsSizeable,
                disabled,
                commitOnChange,
                width: layoutProps.width,
                height: layoutProps.height,
                flex: layoutProps.flex
            });

        return box({
            className: classNames(className, classes),
            ...layoutProps,
            items: [
                labelCmp({
                    omit: !label,
                    className: 'xh-form-field-label',
                    items: [label, requiredIndicator]
                }),
                div({
                    className: childIsSizeable ? 'xh-form-field-fill' : '',
                    items: [
                        childEl,
                        div({
                            omit: !info,
                            className: 'xh-form-field-info',
                            item: info
                        }),
                        div({
                            omit: minimal || !isPending || !validationDisplayed,
                            className: 'xh-form-field-pending-msg',
                            item: 'Validating...'
                        }),
                        div({
                            omit: minimal || !displayNotValid,
                            className: 'xh-form-field-error-msg',
                            items: notValid ? errors[0] : null
                        })
                    ]
                })
            ]
        });
    }
});

FormField.propTypes = {

    /**
     * CommitOnChange property for underlying HoistInput (for inputs that support).
     * Defaulted from containing Form.
     */
    commitOnChange: PT.bool,

    /** True to disable user interaction. Defaulted from backing FieldModel. */
    disabled: PT.bool,

    /** Property name on bound FormModel from which to read/write data. */
    field: PT.string,

    /** Additional description or info to be displayed alongside the input control. */
    info: PT.node,

    /**
     * Label for form field. Defaults to Field displayName. Set to null to hide.
     * Can be defaulted from contained Form (specifically, to null to hide all labels).
     */
    label: PT.node,

    /**
     * Apply minimal styling - validation errors are only displayed with a red outline.
     * Defaulted from containing Form, or false.
     */
    minimal: PT.bool,

    /**
     * Optional function for use in readonly mode. Called with the Field's current value
     * and should return an element suitable for presentation to the end-user.
     */
    readonlyRenderer: PT.func,

    /** The indicator to display next to a required field. Defaults to `*`. */
    requiredIndicator: PT.string
};


const readonlyChild = hoistCmp.factory({
    memo: false,
    model: false,

    render({model, readonlyRenderer}) {
        const value = model ? model['value'] : null,
            renderer = withDefault(readonlyRenderer, defaultReadonlyRenderer);
        return div({className: 'xh-form-field-readonly-display', item: renderer(value)});
    }
});


const editableChild = hoistCmp.factory({
    memo: false,
    model: false,

    render({model, child, childIsSizeable, disabled, commitOnChange, width, height, flex}) {
        const {props} = child,
            {propTypes} = child.type;

        const overrides = {
            model,
            bind: 'value',
            disabled: props.disabled || disabled
        };

        // If FormField is sized and item doesn't specify its own dimensions,
        // the item should fill the available size of the FormField.
        // Note: We explicitly set width / height to null to override defaults.
        if ((width || height || flex) && childIsSizeable) {
            if (isUndefined(props.width) && isUndefined(props.flex)) {
                overrides.width = null;
            }

            if (isUndefined(props.height) && height) {
                overrides.height = null;
                overrides.flex = 1;
            }
        }

        if (propTypes.commitOnChange && !isUndefined(commitOnChange)) {
            overrides.commitOnChange = commitOnChange;
        }

        return cloneElement(child, overrides);
    }
});

//--------------------------------
// Helper Functions
//---------------------------------
function getValidChild(children) {
    const child = Children.only(children);
    throwIf(!child, 'FormField child must be a single component.');
    throwIf(child.props.bind || child.props.model, 'HoistInputs should not specify "bind" or "model" props when used with FormField');
    return child;
}

function defaultReadonlyRenderer(value) {
    if (isLocalDate(value)) return fmtDate(value);
    if (isDate(value)) return fmtDateTime(value);
    if (isFinite(value)) return fmtNumber(value);
    if (isBoolean(value)) return value.toString();
    return span(value != null ? value.toString() : null);
}

function defaultProp(name, props, formContext, defaultVal) {
    const fieldDefault = formContext.fieldDefaults ? formContext.fieldDefaults[name] : null;
    return withDefault(props[name], fieldDefault, defaultVal);
}
