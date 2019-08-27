/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
import PT from 'prop-types';
import {isArray, isUndefined, isDate, isFinite, isBoolean, isNil, kebabCase} from 'lodash';
import {isLocalDate} from '@xh/hoist/utils/datetime';

import {elemFactory, HoistComponent, LayoutSupport, StableIdSupport} from '@xh/hoist/core';
import {tooltip} from '@xh/hoist/kit/blueprint';
import {FormContext} from '@xh/hoist/cmp/form';
import {HoistInput} from '@xh/hoist/cmp/input';
import {box, div, span, label as labelEl} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import {fmtDateTime, fmtDate, fmtNumber} from '@xh/hoist/format';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {getReactElementName} from '@xh/hoist/utils/react';

import './FormField.scss';

/**
 * Standardised wrapper around a HoistInput Component. FormField provides consistent layout,
 * labelling, and optional display of validation messages for the input component.
 *
 * This component is typically used within a `Form` component and bound by name to a 'FieldModel'
 * within that Form's backing `FormModel`. FormField will setup the binding between its child
 * HoistInput and the FieldModel instance and can display validation messages, switch between
 * read-only and disabled variants of its child, and source default props via the parent Form's
 * `fieldDefaults` prop.
 *
 * FormFields can be sized and otherwise customized via standard @LayoutSupport props. They will
 * adjust their child Inputs to fill their available space (if appropriate given the input type),
 * so the recommended approach is to specify any sizing on the FormField (as opposed to the Input).
 */
@HoistComponent
@LayoutSupport
@StableIdSupport
export class FormField extends Component {

    static propTypes = {

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
        readonlyRenderer: PT.func
    };

    baseClassName = 'xh-form-field';

    blockChildren = ['TextInput', 'JsonInput', 'Select'];

    static contextType = FormContext;

    render() {
        this.ensureConditions();

        const {info} = this.props;

        // Model related props
        const {fieldModel, label} = this,
            isRequired = fieldModel && fieldModel.isRequired,
            readonly = fieldModel && fieldModel.readonly,
            validationDisplayed = fieldModel && fieldModel.validationDisplayed,
            notValid = fieldModel && fieldModel.isNotValid,
            displayNotValid = validationDisplayed && notValid,
            errors = fieldModel ? fieldModel.errors : [],
            inputId = this.props.children.props.id,
            idAttr = inputId ? inputId : this.stableId(),
            requiredStr = (isRequired && !readonly) ? span(' *') : null;

        // Display related props
        const inline = this.getDefaultedProp('inline', false),
            minimal = this.getDefaultedProp('minimal', false),
            leftErrorIcon = this.getDefaultedProp('leftErrorIcon', false),
            clickableLabel = this.getDefaultedProp('clickableLabel', true),
            labelAlign = this.getDefaultedProp('labelAlign', 'left'),
            labelWidth = this.getDefaultedProp('labelWidth', null);

        // Styles
        const classes = [this.childCssName];
        if (isRequired) classes.push('xh-form-field-required');
        if (inline) classes.push('xh-form-field-inline');
        if (minimal) classes.push('xh-form-field-minimal');
        if (readonly) classes.push('xh-form-field-readonly');
        if (displayNotValid) classes.push('xh-form-field-invalid');

        const control = this.prepareChild({displayNotValid, errors, idAttr, leftErrorIcon, minimal, readonly});

        return box({
            key: fieldModel ? fieldModel.xhId : null,
            items: [
                labelEl({
                    omit: !label,
                    className: 'xh-form-field-label',
                    items: [label, requiredStr],
                    htmlFor: clickableLabel ? idAttr : null,
                    style: {
                        textAlign: labelAlign,
                        width: labelWidth,
                        minWidth: isNil(labelWidth) ? 80 : 0
                    }
                }),
                div({
                    className: this.childIsSizeable ? 'xh-form-field-fill' : '',
                    items: [
                        control,
                        div({
                            omit: !info,
                            className: 'xh-form-field-info',
                            item: info
                        }),
                        tooltip({
                            omit: minimal || !displayNotValid,
                            openOnTargetFocus: false,
                            className: 'xh-form-field-error-msg',
                            item: errors ? errors[0] : null,
                            content: this.getErrorTooltipContent(errors)
                        })
                    ]
                })
            ],
            className: this.getClassName(classes),
            ...this.getLayoutProps()
        });
    }


    //--------------------
    // Implementation
    //--------------------
    get form() {
        return this.context;
    }

    get formModel() {
        const {form} = this;
        return form ? form.model : null;
    }

    get fieldModel() {
        const {formModel} = this,
            {field} = this.props;
        return formModel && field ? formModel.fields[field] : null;
    }

    // Label can be provided via props, defaulted from form fieldDefaults ("null" being the expected
    // use case to hide all labels), or sourced from fieldModel displayName.
    get label() {
        const {fieldModel, form} = this;

        return withDefault(
            this.props.label,
            form ? form.fieldDefaults.label : undefined,
            fieldModel ? fieldModel.displayName : null
        );
    }

    get childIsSizeable() {
        const child = this.props.children;
        return child && child.type.hasLayoutSupport;
    }

    get childCssName() {
        const child = this.props.children;
        return child ? `xh-form-field-${kebabCase(getReactElementName(child))}` : null;
    }

    getDefaultedProp(name, defaultVal) {
        const {form} = this;
        return withDefault(
            this.props[name],
            form ? form.fieldDefaults[name] : undefined,
            defaultVal
        );
    }

    prepareChild({displayNotValid, leftErrorIcon, idAttr, errors, minimal, readonly}) {
        const {fieldModel} = this,
            item = this.props.children,
            {props} = item,
            {propTypes} = item.type;

        const overrides = {
            model: fieldModel,
            bind: 'value',
            disabled: props.disabled || (fieldModel && fieldModel.disabled),
            id: idAttr
        };

        // If a sizeable child input doesn't specify its own dimensions,
        // the input should fill the available size of the FormField.
        // Note: We explicitly set width / height to null to override defaults.
        if (this.childIsSizeable) {
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

        const commitOnChange = this.getDefaultedProp('commitOnChange');
        if (propTypes.commitOnChange && !isUndefined(commitOnChange)) {
            overrides.commitOnChange = commitOnChange;
        }

        const target = readonly ? this.renderReadonly() : React.cloneElement(item, overrides);

        if (!minimal) return target;

        return tooltip({
            target,
            targetClassName: `xh-input ${displayNotValid ? 'xh-input-invalid' : ''}`,
            targetTagName: !this.blockChildren.includes(getReactElementName(target)) || target.props.width ? 'span' : 'div',
            position: 'right',
            disabled: !displayNotValid,
            content: this.getErrorTooltipContent(errors)
        });
    }

    renderReadonly() {
        const {fieldModel} = this,
            value = fieldModel ? fieldModel['value'] : null,
            renderer = withDefault(this.props.readonlyRenderer, this.defaultReadonlyRenderer);

        return div({
            className: 'xh-form-field-readonly-display',
            item: renderer(value)
        });
    }

    defaultReadonlyRenderer(value) {
        if (isLocalDate(value)) return fmtDate(value);
        if (isDate(value)) return fmtDateTime(value);
        if (isFinite(value)) return fmtNumber(value);
        if (isBoolean(value)) return value.toString();
        return span(value != null ? value.toString() : null);
    }

    getErrorTooltipContent(errors) {
        if (!errors || !errors.length) return null;
        if (errors.length == 1) return errors[0];
        return (
            <ul className="xh-form-field-error-tooltip">
                {errors.map((it, idx) => <li key={idx}>{it}</li>)}
            </ul>
        );
    }

    ensureConditions() {
        const child = this.props.children;
        throwIf(!child || isArray(child) || !(child.type.prototype instanceof HoistInput), 'FormField child must be a single component that extends HoistInput.');
        throwIf(child.props.bind || child.props.model, 'HoistInputs should not specify "bind" or "model" props when used with FormField');
    }
}
export const formField = elemFactory(FormField);