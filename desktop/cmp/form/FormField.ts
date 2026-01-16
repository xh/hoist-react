/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {PopoverPosition, PopperBoundary} from '@blueprintjs/core';
import composeRefs from '@seznam/compose-react-refs/composeRefs';
import {BaseFormFieldProps, FieldModel, FormContext, FormContextType} from '@xh/hoist/cmp/form';
import {box, div, label as labelEl, li, span, ul} from '@xh/hoist/cmp/layout';
import {
    DefaultHoistProps,
    hoistCmp,
    HoistProps,
    HSide,
    TestSupportProps,
    useContextModel,
    uses,
    XH
} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {instanceManager} from '@xh/hoist/core/impl/InstanceManager';
import {maxSeverity, ValidationResult} from '@xh/hoist/data';
import {FormFieldSetModel} from '@xh/hoist/desktop/cmp/form/formfieldset/FormFieldSetModel';
import {fmtDate, fmtDateTime, fmtJson, fmtNumber} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {tooltip} from '@xh/hoist/kit/blueprint';
import {isLocalDate} from '@xh/hoist/utils/datetime';
import {errorIf, getTestId, logWarn, TEST_ID, throwIf, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps, getReactElementName, useOnMount, useOnUnmount} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {first, isBoolean, isDate, isEmpty, isFinite, isNil, isUndefined, kebabCase} from 'lodash';
import {
    Children,
    cloneElement,
    ReactElement,
    ReactNode,
    useContext,
    useEffect,
    useState
} from 'react';
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

        // If within a FormFieldSet, register with its model for validation grouping
        const fieldSetModel = useContextModel(FormFieldSetModel);
        useEffect(() => {
            if (fieldSetModel && model) {
                fieldSetModel.registerChildFieldModel(model);
                return () => fieldSetModel.unregisterChildFieldModel(model);
            }
        }, [fieldSetModel, model]);

        // Model related props
        const isRequired = model?.isRequired || false,
            readonly = model?.readonly || false,
            disabled = props.disabled || model?.disabled || fieldSetModel?.disabled,
            severityToDisplay = model?.validationDisplayed
                ? maxSeverity(model.validationResults)
                : null,
            displayInvalid = severityToDisplay === 'error',
            validationResultsToDisplay = severityToDisplay
                ? model.validationResults.filter(v => v.severity === severityToDisplay)
                : [],
            requiredStr = defaultProp('requiredIndicator', props, formContext, '*'),
            requiredIndicator =
                isRequired && !readonly && requiredStr
                    ? span({
                          item: ' ' + requiredStr,
                          className: 'xh-form-field__required-indicator'
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
            tooltipBoundary = defaultProp('tooltipBoundary', props, formContext, 'clippingParents'),
            readonlyRenderer = defaultProp(
                'readonlyRenderer',
                props,
                formContext,
                defaultReadonlyRenderer
            );

        // Styles
        const classes = [];
        if (childElementName) classes.push(`xh-form-field--${kebabCase(childElementName)}`);
        if (isRequired) classes.push('xh-form-field--required');
        if (inline) classes.push('xh-form-field--inline');
        if (minimal) classes.push('xh-form-field--minimal');
        if (readonly) classes.push('xh-form-field--readonly');
        if (disabled) classes.push('xh-form-field--disabled');

        if (severityToDisplay) {
            classes.push(`xh-form-field--${severityToDisplay}`);
            if (displayInvalid) classes.push('xh-form-field--invalid');
        }

        // Test ID handling
        const testId = getFormFieldTestId(props, formContext, model?.name);
        useOnMount(() => instanceManager.registerModelWithTestId(testId, model));
        useOnUnmount(() => instanceManager.unregisterModelWithTestId(testId));

        // Generate actual element child to render
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
                      displayNotValid: severityToDisplay === 'error',
                      leftErrorIcon,
                      commitOnChange,
                      testId: getTestId(testId, 'input')
                  });

        if (minimal) {
            childEl = tooltip({
                item: childEl,
                className: classNames(
                    'xh-input',
                    severityToDisplay && `xh-input--${severityToDisplay}`,
                    displayInvalid && 'xh-input--invalid'
                ),
                targetTagName:
                    !blockChildren.includes(childElementName) || childWidth ? 'span' : 'div',
                position: tooltipPosition,
                boundary: tooltipBoundary,
                disabled: !severityToDisplay,
                content: getValidationTooltipContent(validationResultsToDisplay)
            });
        }

        // Generate inlined validation messages, if any to show and not rendering in minimal mode.
        let validationMsgEl: ReactElement = null;
        if (severityToDisplay && !minimal) {
            const validationMsgCls = `xh-form-field__inner__validation-msg xh-form-field__inner__validation-msg--${severityToDisplay}`,
                firstMsg = first(validationResultsToDisplay)?.message;

            validationMsgEl =
                validationResultsToDisplay.length > 1
                    ? tooltip({
                          openOnTargetFocus: false,
                          className: validationMsgCls,
                          item: firstMsg + ' (...)',
                          content: getValidationTooltipContent(
                              validationResultsToDisplay
                          ) as ReactElement
                      })
                    : div({
                          className: validationMsgCls,
                          item: firstMsg
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
                    className: 'xh-form-field__label',
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
                        'xh-form-field__inner',
                        childIsSizeable
                            ? 'xh-form-field__inner--flex'
                            : 'xh-form-field__inner--block'
                    ),
                    items: [
                        childEl,
                        div({
                            className: 'xh-form-field__inner__info-msg',
                            omit: !info,
                            item: info
                        }),
                        validationMsgEl
                    ]
                })
            ]
        });
    }
});

interface ReadonlyChildProps extends HoistProps<FieldModel>, TestSupportProps {
    readonlyRenderer: (v: any, model: FieldModel) => ReactNode;
}

const readonlyChild = hoistCmp.factory<ReadonlyChildProps>({
    model: false,

    render({model, readonlyRenderer, testId}) {
        const value = model ? model['value'] : null;
        return div({
            className: 'xh-form-field__readonly-display',
            [TEST_ID]: testId,
            item: readonlyRenderer(value, model)
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
export function defaultReadonlyRenderer(value: any): ReactNode {
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

function getValidationTooltipContent(validationResults: ValidationResult[]): ReactElement | string {
    // If no ValidationResults, something other than null must be returned.
    // If null is returned, as of Blueprint v5, the Blueprint Tooltip component causes deep re-renders of its target
    // when content changes from null <-> not null.
    // In `formField` `minimal:true` mode with `commitonchange:true`, this causes the
    // TextInput component to lose focus when its validation state changes, which is undesirable.
    // It is not clear if this is a bug or intended behavior in BP v5, but this workaround prevents the issue.
    // `Tooltip:content` has been a required prop since at least BP v4, but something about the way it is used in BP v5 changed.
    if (isEmpty(validationResults)) {
        return 'Is Valid';
    } else if (validationResults.length === 1) {
        return first(validationResults).message;
    } else {
        const severity = first(validationResults).severity;
        return ul({
            className: `xh-form-field__validation-tooltip xh-form-field__validation-tooltip--${severity}`,
            items: validationResults.map((it, idx) => li({key: idx, item: it.message}))
        });
    }
}

function defaultProp<N extends keyof Partial<FormFieldProps>>(
    name: N,
    props: Partial<FormFieldProps>,
    formContext: FormContextType,
    defaultVal: FormFieldProps[N]
): Partial<FormFieldProps>[N] {
    const fieldDefault = formContext.fieldDefaults ? formContext.fieldDefaults[name] : null;
    return withDefault(props[name], fieldDefault, defaultVal);
}
function getFormFieldTestId(
    props: Partial<FormFieldProps>,
    formContext: FormContextType,
    fieldName: string
): string {
    return (
        props.testId ??
        (formContext.testId && fieldName ? `${formContext.testId}-${fieldName}` : undefined)
    );
}
