/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FieldModel, FormContext} from '@xh/hoist/cmp/form';
import {box, div, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, ModelPublishMode, uses, XH} from '@xh/hoist/core';
import {fmtDate, fmtDateTime, fmtNumber} from '@xh/hoist/format';
import {label as labelCmp} from '@xh/hoist/mobile/cmp/input';
import {isLocalDate} from '@xh/hoist/utils/datetime';
import {errorIf, throwIf, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isBoolean, isDate, isEmpty, isFinite, isUndefined} from 'lodash';
import PT from 'prop-types';
import {Children, cloneElement, useContext} from 'react';
import composeRefs from '@seznam/compose-react-refs/composeRefs';
import './FormField.scss';

/**
 * Standardised wrapper around a HoistInput component for use in a form. FormField provides
 * consistent layout, labelling, and optional display of validation messages for the field.
 * FormField also supports an alternative read-only display of the bound data.
 *
 * This component is intended to be used within a `Form` component and bound to a 'FieldModel'
 * within that Form's backing `FormModel`. FormField will set up the binding between its input and the
 * FieldModel instance and can display validation messages, switch between read-only and disabled
 * variants of its child, and source default props via the parent Form's `fieldDefaults` prop.
 *
 * This component is designed to work with an instance of `HoistInput` as its input, and makes use
 * of many of HoistInput's props. For best results with a customized input, consider wrapping a
 * HoistInput and passing all props along to it.   At the very least, all custom inputs
 * must accept 'model' and 'bind' props in order to show and edit data.
 *
 * FormFields can be sized and otherwise customized via standard layout props. They will
 * adjust their child inputs to fill their available space (if appropriate given the input type),
 * so the recommended approach is to specify any sizing on the FormField (as opposed to the input).
 */
export const [FormField, formField] = hoistCmp.withFactory({
    displayName: 'FormField',
    className: 'xh-form-field',
    model: uses(FieldModel, {fromContext: false, publishMode: ModelPublishMode.NONE}),

    render({model, className, field, children, info, ...props}, ref) {

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

        // Get spec'ed child -- may be null for fields that are always read-only
        const child = getValidChild(children),
            childIsSizeable = child?.type?.hasLayoutSupport ?? false;

        // Display related props
        const layoutProps =  getLayoutProps(props),
            minimal = defaultProp('minimal', props, formContext, false),
            label = defaultProp('label', props, formContext, model?.displayName),
            commitOnChange = defaultProp('commitOnChange', props, formContext, undefined),
            readonlyRenderer = defaultProp('readonlyRenderer', props, formContext, defaultReadonlyRenderer);

        // Styles
        const classes = [];
        if (isRequired) classes.push('xh-form-field-required');
        if (minimal) classes.push('xh-form-field-minimal');
        if (readonly) classes.push('xh-form-field-readonly');
        if (disabled) classes.push('xh-form-field-disabled');
        if (displayNotValid) classes.push('xh-form-field-invalid');

        let childEl = readonly || !child ?
            readonlyChild({model, readonlyRenderer}) :
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
            ref,
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
     * Optional function for use in readonly mode. Called with the Field's current value and should
     * return an element suitable for presentation to the end-user. Defaulted from containing Form.
     */
    readonlyRenderer: PT.func,

    /** The indicator to display next to a required field. Defaults to `*`. */
    requiredIndicator: PT.string
};


const readonlyChild = hoistCmp.factory({
    model: false,

    render({model, readonlyRenderer}) {
        const value = model ? model['value'] : null;
        return div({className: 'xh-form-field-readonly-display', item: readonlyRenderer(value)});
    }
});


const editableChild = hoistCmp.factory({
    model: false,

    render({model, child, childIsSizeable, disabled, commitOnChange, width, height, flex}) {
        const {props} = child,
            {propTypes} = child.type;

        // Overrides -- be sure not to clobber selected properties on child
        const overrides = {
            model,
            bind: 'value',
            disabled: props.disabled || disabled,
            ref: composeRefs(model._boundInputRef, child.ref)
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

        if (propTypes?.commitOnChange && !isUndefined(commitOnChange)) {
            overrides.commitOnChange = commitOnChange;
        }

        return cloneElement(child, overrides);
    }
});

//--------------------------------
// Helper Functions
//---------------------------------
function getValidChild(children) {
    const count = Children.count(children);
    if (count === 0) return null;
    if (count > 1) {
        throw XH.exception(
            'Add a single HoistInput child to FormField, or zero children if always readonly.'
        );
    }

    const child = Children.only(children);
    throwIf(
        child.props.bind || child.props.model,
        'Child of FormField should not specify "bind" or "model" props. These props will ' +
        'will be set by the FormField to bind it appropriately.'
    );

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
