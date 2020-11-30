/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {FieldModel, FormContext} from '@xh/hoist/cmp/form';
import {box, div, label as labelEl, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, ModelPublishMode, uses, XH} from '@xh/hoist/core';
import {fmtDate, fmtDateTime, fmtNumber} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {tooltip} from '@xh/hoist/kit/blueprint';
import {isLocalDate} from '@xh/hoist/utils/datetime';
import {errorIf, throwIf, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps, getReactElementName} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isBoolean, isDate, isEmpty, isFinite, isNil, isUndefined, kebabCase} from 'lodash';
import PT from 'prop-types';
import React, {Children, cloneElement, useContext, useState} from 'react';
import './FormField.scss';

/**
 * Standardised wrapper around a HoistInput Component. FormField provides consistent layout,
 * labelling, and optional display of validation messages for the input component.
 *
 * This component is intended to be used within a `Form` component and bound to a 'FieldModel'
 * within that Form's backing `FormModel`.  This binding, can happen explicitly, or by name.
 *
 * FormField will setup the binding between its child HoistInput and the FieldModel instance and
 * can display validation messages, switch between read-only and disabled variants of its child,
 * and source default props via the parent Form's `fieldDefaults` prop.
 *
 * FormFields can be sized and otherwise customized via standard layout props. They will
 * adjust their child Inputs to fill their available space (if appropriate given the input type),
 * so the recommended approach is to specify any sizing on the FormField (as opposed to the Input).
 */
export const [FormField, formField] = hoistCmp.withFactory({
    displayName: 'FormField',
    className: 'xh-form-field',
    memo: false,
    model: uses(FieldModel, {fromContext: false, publishMode: ModelPublishMode.NONE}),

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
                }) : null;

        // Child related props
        const child = getValidChild(children),
            [stableId] = useState(XH.genId()),
            childId = child.props.id || stableId,
            childIsSizeable = child.type?.hasLayoutSupport || false,
            childCssName = `xh-form-field-${kebabCase(getReactElementName(child))}`;

        // Display related props
        const inline = defaultProp('inline', props, formContext, false),
            minimal = defaultProp('minimal', props, formContext, false),
            leftErrorIcon = defaultProp('leftErrorIcon', props, formContext, false),
            clickableLabel = defaultProp('clickableLabel', props, formContext, true),
            labelAlign = defaultProp('labelAlign', props, formContext, 'left'),
            labelWidth = defaultProp('labelWidth', props, formContext, null),
            label = defaultProp('label', props, formContext, model?.displayName),
            commitOnChange = defaultProp('commitOnChange', props, formContext, undefined),
            tooltipPosition = defaultProp('tooltipPosition', props, formContext, 'right'),
            tooltipBoundary = defaultProp('tooltipBoundary', props, formContext, 'viewport');

        // Styles
        const classes = [childCssName];
        if (isRequired) classes.push('xh-form-field-required');
        if (inline) classes.push('xh-form-field-inline');
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
                childId,
                disabled,
                displayNotValid,
                leftErrorIcon,
                commitOnChange
            });

        if (minimal) {
            childEl = tooltip({
                target: childEl,
                targetClassName: `xh-input ${displayNotValid ? 'xh-input-invalid' : ''}`,
                targetTagName: !blockChildren.includes(getReactElementName(child)) || child.props.width ? 'span' : 'div',
                position: tooltipPosition,
                boundary: tooltipBoundary,
                disabled: !displayNotValid,
                content: getErrorTooltipContent(errors)
            });
        }

        return box({
            key: model?.xhId,
            className: classNames(className, classes),
            ...getLayoutProps(props),
            items: [
                labelEl({
                    omit: !label,
                    className: 'xh-form-field-label',
                    items: [label, requiredIndicator],
                    htmlFor: clickableLabel ? childId : null,
                    style: {
                        textAlign: labelAlign,
                        width: labelWidth,
                        minWidth: isNil(labelWidth) ? 80 : 0
                    }
                }),
                div({
                    className: childIsSizeable ? 'xh-form-field-fill' : '',
                    items: [
                        childEl,
                        div({
                            className: 'xh-form-field-info',
                            omit: !info,
                            item: info
                        }),
                        tooltip({
                            omit: minimal || !displayNotValid,
                            openOnTargetFocus: false,
                            className: 'xh-form-field-error-msg',
                            item: errors ? errors[0] : null,
                            content: getErrorTooltipContent(errors)
                        })
                    ]
                })
            ]
        });
    }
});

FormField.propTypes = {

    /**
     * Focus or toggle input when label is clicked.
     * Defaulted from containing Form, or true.
     */
    clickableLabel: PT.bool,

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
     * Layout field inline with label to the left.
     * Defaulted from containing Form, or false.
     */
    inline: PT.bool,

    /**
     * Label for form field. Defaults to Field displayName. Set to null to hide.
     * Can be defaulted from contained Form (specifically, to null to hide all labels).
     */
    label: PT.node,

    /** Alignment of label text, default 'left'. */
    labelAlign: PT.oneOf(['left', 'right']),

    /** Width of the label in pixels. */
    labelWidth: PT.number,

    /**
     * Signal a validation error by inserting a warning glyph in the far left side of the
     * Input, if supported. (Currently TextField and NumberInput only.)
     * Defaulted from containing Form, or false.
     */
    leftErrorIcon: PT.bool,

    /**
     * Display validation messages in a tooltip, as opposed to inline within the component.
     * Defaulted from containing Form, or false.
     */
    minimal: PT.bool,

    /**
     * Optional function for use in readonly mode. Called with the Field's current value
     * and should return an element suitable for presentation to the end-user.
     */
    readonlyRenderer: PT.func,

    /** The indicator to display next to a required field. Defaults to `*`. */
    requiredIndicator: PT.string,

    /**
     * Minimal validation tooltip will try to fit within the corresponding boundary.
     * @see https://blueprintjs.com/docs/#core/components/popover
     */
    tooltipBoundary: PT.oneOf(['scrollParent', 'viewport', 'window']),

    /**
     * Position for minimal validation tooltip.
     * @see https://blueprintjs.com/docs/#core/components/popover
     */
    tooltipPosition: PT.oneOf([
        'top-left', 'top', 'top-right',
        'right-top', 'right', 'right-bottom',
        'bottom-right', 'bottom', 'bottom-left',
        'left-bottom', 'left', 'left-top',
        'auto', 'auto-start', 'auto-end'
    ])
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

    render({model, child, childIsSizeable, childId, disabled, displayNotValid, leftErrorIcon, commitOnChange}) {
        const {props} = child,
            {propTypes} = child.type;

        const overrides = {
            model,
            bind: 'value',
            disabled: props.disabled || disabled,
            id: childId
        };

        // If a sizeable child input doesn't specify its own dimensions,
        // the input should fill the available size of the FormField.
        // Note: We explicitly set width / height to null to override defaults.
        if (childIsSizeable) {
            if (isUndefined(props.width) && isUndefined(props.flex)) {
                overrides.width = null;
                overrides.flex = 1;
            }

            if (isUndefined(props.height)) {
                overrides.height = null;
            }
        }

        if (displayNotValid && propTypes.leftIcon && leftErrorIcon) {
            overrides.leftIcon = Icon.warningCircle();
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
const blockChildren = ['CodeInput', 'JsonInput', 'Select', 'TextInput'];

function getValidChild(children) {
    const child = Children.only(children);
    throwIf(!child, 'FormField must have a single child.');
    throwIf(child.props.bind || child.props.model, 'Child Inputs should not specify "bind" or "model" props when used with FormField');
    return child;
}

function defaultReadonlyRenderer(value) {
    if (isLocalDate(value)) return fmtDate(value);
    if (isDate(value)) return fmtDateTime(value);
    if (isFinite(value)) return fmtNumber(value);
    if (isBoolean(value)) return value.toString();
    return span(value != null ? value.toString() : null);
}

function getErrorTooltipContent(errors) {
    if (!errors || !errors.length) return null;
    if (errors.length === 1) return errors[0];
    return (
        <ul className="xh-form-field-error-tooltip">
            {errors.map((it, idx) => <li key={idx}>{it}</li>)}
        </ul>
    );
}

function defaultProp(name, props, formContext, defaultVal) {
    const fieldDefault = formContext.fieldDefaults ? formContext.fieldDefaults[name] : null;
    return withDefault(props[name], fieldDefault, defaultVal);
}
