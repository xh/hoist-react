/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {PopoverPosition, PopperBoundary} from '@blueprintjs/core';
import composeRefs from '@seznam/compose-react-refs/composeRefs';
import {BaseFormFieldProps, FieldModel, FormContext, FormContextType} from '@xh/hoist/cmp/form';
import {box, div, label as labelEl, li, span, ul} from '@xh/hoist/cmp/layout';
import {DefaultHoistProps, hoistCmp, HSide, uses, XH} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {instanceManager} from '@xh/hoist/core/impl/InstanceManager';
import {fmtDate, fmtDateTime, fmtJson, fmtNumber} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {tooltip} from '@xh/hoist/kit/blueprint';
import {isLocalDate} from '@xh/hoist/utils/datetime';
import {errorIf, getTestId, logWarn, TEST_ID, throwIf, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps, getReactElementName, useOnMount, useOnUnmount} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isBoolean, isDate, isEmpty, isFinite, isNil, isUndefined, kebabCase} from 'lodash';
import {Children, cloneElement, ReactElement, ReactNode, useContext, useState} from 'react';
import './FormField.scss';

export interface FormFieldProps extends BaseFormFieldProps {
    /**
     * Focus or toggle input when label is clicked.
     * Defaulted from containing Form, or true.
     */
    clickableLabel?: boolean;

    /**
     * Layout field inline with label to the left.
     * Defaulted from containing Form, or false.
     */
    inline?: boolean;

    /** Alignment of label text, default 'left'. */
    labelTextAlign?: HSide;

    /** Width of the label in pixels. */
    labelWidth?: number;

    /**
     * Signal a validation error by inserting a warning glyph in the far left side of the
     * Input, if supported. (Currently TextField and NumberInput only.)
     * Defaulted from containing Form, or false.
     */
    leftErrorIcon?: boolean;

    /**
     * Display validation messages in a tooltip, as opposed to inline within the component.
     * Defaulted from containing Form, or false.
     */
    minimal?: boolean;

    /**
     * Minimal validation tooltip will try to fit within the corresponding boundary.
     * @see https://blueprintjs.com/docs/#core/components/popover
     */
    tooltipBoundary?: PopperBoundary;
    /**
     * Position for minimal validation tooltip.
     * @see https://blueprintjs.com/docs/#core/components/popover
     */
    tooltipPosition?: PopoverPosition;
}

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
export const [FormField, formField] = hoistCmp.withFactory<FormFieldProps>({
    displayName: 'FormField',
    className: 'xh-form-field',
    model: uses(FieldModel, {
        fromContext: false,
        publishMode: 'none',
        optional: true
    }),

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
        model = model ?? (formModel && field ? formModel.fields[field] : null);

        if (!model) {
            logWarn(`Unable to bind FormField to field "${field}" on backing FormModel`, FormField);
        }

        // Model related props
        const isRequired = model?.isRequired || false,
            readonly = model?.readonly || false,
            disabled = props.disabled || model?.disabled,
            validationDisplayed = model?.validationDisplayed || false,
            notValid = model?.isNotValid || false,
            displayNotValid = validationDisplayed && notValid,
            errors = model?.errors || [],
            requiredStr = defaultProp('requiredIndicator', props, formContext, '*'),
            requiredIndicator =
                isRequired && !readonly && requiredStr
                    ? span({
                          item: ' ' + requiredStr,
                          className: 'xh-form-field-required-indicator'
                      })
                    : null;

        // Get spec'ed child -- may be null for fields that are always read-only
        const child = getValidChild(children),
            [stableId] = useState(XH.genId()),
            childId = child?.props.id ?? stableId,
            childWidth = child?.props.width,
            childIsSizeable = child?.type?.hasLayoutSupport ?? false,
            childElementName = child ? getReactElementName(child) : null;

        // Display related props
        const inline = defaultProp('inline', props, formContext, false),
            minimal = defaultProp('minimal', props, formContext, false),
            leftErrorIcon = defaultProp('leftErrorIcon', props, formContext, false),
            clickableLabel = defaultProp('clickableLabel', props, formContext, true),
            labelTextAlign = defaultProp('labelTextAlign', props, formContext, 'left'),
            labelWidth = defaultProp('labelWidth', props, formContext, null),
            label = defaultProp('label', props, formContext, model?.displayName),
            commitOnChange = defaultProp('commitOnChange', props, formContext, undefined),
            tooltipPosition = defaultProp('tooltipPosition', props, formContext, 'right'),
            tooltipBoundary = defaultProp('tooltipBoundary', props, formContext, 'viewport'),
            readonlyRenderer = defaultProp(
                'readonlyRenderer',
                props,
                formContext,
                defaultReadonlyRenderer
            );

        // Styles
        const classes = [];
        if (childElementName) classes.push(`xh-form-field-${kebabCase(childElementName)}`);
        if (isRequired) classes.push('xh-form-field-required');
        if (inline) classes.push('xh-form-field-inline');
        if (minimal) classes.push('xh-form-field-minimal');
        if (readonly) classes.push('xh-form-field-readonly');
        if (disabled) classes.push('xh-form-field-disabled');
        if (displayNotValid) classes.push('xh-form-field-invalid');

        const testId = getFormFieldTestId(props, formContext, model.name);
        useOnMount(() => instanceManager.registerModelWithTestId(testId, model));
        useOnUnmount(() => instanceManager.unregisterModelWithTestId(testId));

        // generate actual element child to render
        let childEl: ReactElement =
            !child || readonly
                ? readonlyChild({
                      model,
                      readonlyRenderer,
                      testId: getTestId(testId, 'readonly-display')
                  })
                : editableChild({
                      model,
                      child,
                      childIsSizeable,
                      childId,
                      disabled,
                      displayNotValid,
                      leftErrorIcon,
                      commitOnChange,
                      testId: getTestId(testId, 'input')
                  });

        if (minimal) {
            childEl = tooltip({
                target: childEl,
                targetClassName: `xh-input ${displayNotValid ? 'xh-input-invalid' : ''}`,
                targetTagName:
                    !blockChildren.includes(childElementName) || childWidth ? 'span' : 'div',
                position: tooltipPosition,
                boundary: tooltipBoundary,
                disabled: !displayNotValid,
                content: getErrorTooltipContent(errors)
            });
        }

        return box({
            ref,
            key: model?.xhId,
            className: classNames(className, classes),
            ...getLayoutProps(props),
            testId,
            items: [
                labelEl({
                    omit: !label,
                    className: 'xh-form-field-label',
                    items: [label, requiredIndicator],
                    htmlFor: clickableLabel ? childId : null,
                    style: {
                        textAlign: labelTextAlign,
                        width: labelWidth,
                        minWidth: isNil(labelWidth) ? 80 : 0
                    }
                }),
                div({
                    className: classNames(
                        'xh-form-field-inner',
                        childIsSizeable ? 'xh-form-field-inner--flex' : 'xh-form-field-inner--block'
                    ),
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

const readonlyChild = hoistCmp.factory({
    model: false,

    render({model, readonlyRenderer, testId}) {
        const value = model ? model['value'] : null;
        return div({
            className: 'xh-form-field-readonly-display',
            [TEST_ID]: testId,
            item: readonlyRenderer(value)
        });
    }
});

const editableChild = hoistCmp.factory<FieldModel>({
    model: false,

    render({
        model,
        child,
        childIsSizeable,
        childId,
        disabled,
        displayNotValid,
        leftErrorIcon,
        commitOnChange,
        testId
    }) {
        const {props} = child;

        // Overrides -- be sure not to clobber selected properties on child
        const overrides: DefaultHoistProps = {
            model,
            bind: 'value',
            id: childId,
            disabled: props.disabled || disabled,
            ref: composeRefs(model?.boundInputRef, child.ref),
            testId: props.testId ?? testId
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

        if (displayNotValid && leftErrorIcon) {
            overrides.leftIcon = Icon.warningCircle();
        }

        if (!isUndefined(commitOnChange)) {
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

function defaultReadonlyRenderer(value: any): ReactNode {
    if (isLocalDate(value)) return fmtDate(value);
    if (isDate(value)) return fmtDateTime(value);
    if (isFinite(value)) return fmtNumber(value);
    if (isBoolean(value)) return value.toString();

    // format JSON, but fail and ignore on plain text
    try {
        value = fmtJson(value);
    } catch (e) {}

    return span(value != null ? value.toString() : null);
}

function getErrorTooltipContent(errors: string[]): ReactNode {
    if (isEmpty(errors)) return null;
    if (errors.length === 1) return errors[0];
    return ul({
        className: 'xh-form-field-error-tooltip',
        items: errors.map((it, idx) => li({key: idx, item: it}))
    });
}

function defaultProp(
    name: string,
    props: Partial<FormFieldProps>,
    formContext: FormContextType,
    defaultVal: any
): any {
    const fieldDefault = formContext.fieldDefaults ? formContext.fieldDefaults[name] : null;
    return withDefault(props[name], fieldDefault, defaultVal);
}
function getFormFieldTestId(
    props: Partial<FormFieldProps>,
    formContext: FormContextType,
    fieldName: string
): string {
    return props.testId ?? (formContext.testId ? `${formContext.testId}-${fieldName}` : undefined);
}
