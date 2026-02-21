/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {div, filler, hbox, input as inputEl, vbox} from '@xh/hoist/cmp/layout';
import {
    hoistCmp,
    HoistProps,
    Intent,
    LayoutProps,
    SelectOption,
    StyleProps
} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {TEST_ID, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {castArray, isEmpty, isEqual, isPlainObject} from 'lodash';
import {ReactElement, ReactNode} from 'react';
import './PopoverPicker.scss';

export interface PopoverPickerProps extends HoistProps, HoistInputProps, LayoutProps, StyleProps {
    /**
     * Preset list of options for selection. Elements can be either a primitive or an object.
     * Primitives will be displayed via toString().
     * Objects must have a `label` property for display and a `value` property.
     * The `labelField` and `valueField` props can customize which fields are used.
     */
    options?: Array<SelectOption | any>;

    /** Field on provided options for sourcing each option's display text (default `label`). */
    labelField?: string;

    /** Field on provided options for sourcing each option's value (default `value`). */
    valueField?: string;

    /** True to allow entry/selection of multiple values. */
    enableMulti?: boolean;

    /**
     * Value to use when the input is empty (default `null`).
     * Recommended usage is `[]` when `enableMulti` is true to ensure value is always an array.
     */
    emptyValue?: any;

    /** True to show a "clear" button in the popover header to deselect all options. */
    enableClear?: boolean;

    /**
     * True to include a text filter input at the top of the popover to narrow the options list.
     * Defaults to true when the option count exceeds `filterThreshold`.
     */
    enableFilter?: boolean;

    /** Number of options above which the filter input is shown by default. Defaults to 8. */
    filterThreshold?: number;

    /** Text to display when control is empty. */
    placeholder?: string;

    /** Icon to display on the trigger button. */
    icon?: ReactElement;

    /** Icon to display on the right side of the trigger button. Defaults to a dropdown chevron. */
    rightIcon?: ReactElement;

    /** Intent applied to the trigger button. */
    intent?: Intent;

    /** True (default) to render trigger button in minimal style. */
    minimal?: boolean;

    /** True to render trigger button in outlined style. */
    outlined?: boolean;

    /** Tooltip text for the trigger button. */
    title?: string;

    /**
     * True (default for single mode) to close the popover after a selection.
     * Defaults to false in multi mode.
     */
    closeOnSelect?: boolean;

    /** Placement of the popover relative to the trigger. Defaults to 'bottom-start'. */
    popoverPosition?: string;

    /** Width of the popover content in pixels. */
    popoverWidth?: number;

    /** Maximum height of the options list before scrolling. Defaults to 300. */
    maxMenuHeight?: number;

    /**
     * Function to render the trigger button text based on the current selection.
     * Receives an array of selected option objects and the full list of option objects.
     * Return a ReactNode for display on the trigger button.
     */
    buttonRenderer?: (selectedOpts: SelectOption[], allOpts: SelectOption[]) => ReactNode;

    /**
     * Function to render each option row in the popover list.
     * Receives the option object and whether it is currently selected.
     * Should return a ReactNode.
     */
    optionRenderer?: (opt: SelectOption, isSelected: boolean) => ReactNode;
}

/**
 * An input control that presents its options in a popover dropdown, triggered by a button
 * displaying the current value or a summary. Supports single and multi-select modes.
 *
 * Designed for space-constrained areas such as toolbars, where a traditional Select component
 * (especially in multi-select "tag picker" mode) is too large. In multi mode, this component
 * displays a compact summary (e.g. "3 of 10 selected") rather than concatenating all selected
 * labels together.
 *
 * This component does not use react-select. It renders a simple, scrollable list of options
 * with check indicators, making it lightweight and easy to style.
 */
export const [PopoverPicker, popoverPicker] = hoistCmp.withFactory<PopoverPickerProps>({
    displayName: 'PopoverPicker',
    className: 'xh-popover-picker',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, PopoverPickerModel);
    }
});
(PopoverPicker as any).hasLayoutSupport = true;

//-----------------------
// Implementation
//-----------------------
class PopoverPickerModel extends HoistInputModel {
    override xhImpl = true;

    @bindable.ref internalOptions: SelectOption[] = [];
    @observable popoverIsOpen: boolean = false;
    @bindable filterValue: string = '';

    get multiMode(): boolean {
        return !!this.componentProps.enableMulti;
    }

    get emptyValue(): any {
        return this.componentProps.emptyValue ?? null;
    }

    get closeOnSelect(): boolean {
        return this.componentProps.closeOnSelect ?? !this.multiMode;
    }

    get enableFilter(): boolean {
        const {enableFilter, filterThreshold} = this.componentProps;
        if (enableFilter != null) return enableFilter;
        return this.internalOptions.length > withDefault(filterThreshold, 8);
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.addReaction({
            track: () => this.componentProps.options,
            run: opts => {
                this.internalOptions = this.normalizeOptions(opts);
            },
            fireImmediately: true
        });
    }

    @action
    openPopover() {
        this.popoverIsOpen = true;
        this.filterValue = '';
    }

    @action
    closePopover() {
        this.popoverIsOpen = false;
        this.filterValue = '';
    }

    @action
    onPopoverInteraction(nextOpen: boolean) {
        if (nextOpen) {
            this.openPopover();
        } else {
            this.closePopover();
        }
    }

    @action
    setFilterValue(val: string) {
        this.filterValue = val;
    }

    get filteredOptions(): SelectOption[] {
        const {filterValue, internalOptions} = this;
        if (!filterValue) return internalOptions;
        const term = filterValue.toLowerCase();
        return internalOptions.filter(opt => {
            const label = opt.label ?? '';
            return label.toLowerCase().includes(term);
        });
    }

    onOptionClick(optValue: any) {
        if (this.multiMode) {
            const current = this.getSelectedValues();
            const isSelected = current.some(v => isEqual(v, optValue));
            const next = isSelected
                ? current.filter(v => !isEqual(v, optValue))
                : [...current, optValue];
            this.noteValueChange(isEmpty(next) ? this.emptyValue : next);
        } else {
            this.noteValueChange(optValue);
        }

        if (this.closeOnSelect) {
            this.closePopover();
        }
    }

    clearAll() {
        this.noteValueChange(this.emptyValue);
    }

    getSelectedValues(): any[] {
        const ext = this.externalValue;
        if (ext == null || isEqual(ext, this.emptyValue)) return [];
        return this.multiMode ? castArray(ext) : [ext];
    }

    isSelected(optValue: any): boolean {
        return this.getSelectedValues().some(v => isEqual(v, optValue));
    }

    getSelectedOptions(): SelectOption[] {
        const selected = this.getSelectedValues();
        return this.internalOptions.filter(opt =>
            selected.some(v => isEqual(v, opt.value))
        );
    }

    getButtonText(): ReactNode {
        const {componentProps, internalOptions} = this,
            {buttonRenderer, placeholder} = componentProps,
            selectedOpts = this.getSelectedOptions();

        if (buttonRenderer) {
            return buttonRenderer(selectedOpts, internalOptions);
        }

        if (isEmpty(selectedOpts)) {
            return placeholder ?? 'Select...';
        }

        if (!this.multiMode) {
            return selectedOpts[0].label;
        }

        // Multi mode summary
        const selCount = selectedOpts.length,
            totalCount = internalOptions.length;

        if (selCount === totalCount) return 'All selected';
        if (selCount === 1) return selectedOpts[0].label;
        return `${selCount} of ${totalCount} selected`;
    }

    //-------------------------------
    // Option normalization
    //-------------------------------
    private normalizeOptions(options: any[]): SelectOption[] {
        options = options || [];
        return options.map(it => this.toOption(it));
    }

    private toOption(src: any): SelectOption {
        if (isPlainObject(src)) return this.objectToOption(src);
        return {label: src != null ? src.toString() : '-null-', value: src};
    }

    private objectToOption(src: any): SelectOption {
        const {componentProps} = this,
            labelField = withDefault(componentProps.labelField, 'label'),
            valueField = withDefault(componentProps.valueField, 'value');

        return {
            ...src,
            label: withDefault(src[labelField], src[valueField]?.toString()),
            value: src[valueField]
        };
    }
}

//---------------------------------------------
// Inner render component
//---------------------------------------------
const cmp = hoistCmp.factory<PopoverPickerModel>(({model, className, ...props}, ref) => {
    const layoutProps = getLayoutProps(props),
        hasSelection = !isEmpty(model.getSelectedValues()),
        nothingSelected = !hasSelection;

    return popover({
        className,
        isOpen: model.popoverIsOpen,
        onInteraction: nextOpen => model.onPopoverInteraction(nextOpen),
        minimal: true,
        position: withDefault(props.popoverPosition, 'bottom-start'),
        popoverClassName: 'xh-popover-picker__popover',
        matchTargetWidth: !props.popoverWidth,
        item: triggerButton({model, props, nothingSelected, ref}),
        content: optionsList({model, props}),
        [TEST_ID]: props.testId
    });
});

//---------------------------------------------
// Trigger button
//---------------------------------------------
const triggerButton = hoistCmp.factory<PopoverPickerModel>(
    ({model, props, nothingSelected, ref}) => {
        const {width, ...restLayout} = getLayoutProps(props);

        return button({
            ref,
            className: classNames(
                'xh-popover-picker__trigger',
                nothingSelected && 'xh-popover-picker__trigger--empty'
            ),
            text: model.getButtonText(),
            icon: props.icon,
            rightIcon: withDefault(props.rightIcon, Icon.chevronDown()),
            disabled: props.disabled,
            intent: props.intent,
            minimal: withDefault(props.minimal, true),
            outlined: props.outlined,
            title: props.title,
            active: model.popoverIsOpen,
            ...restLayout,
            width: withDefault(width, 160),
            style: props.style,
            [TEST_ID]: props.testId ? `${props.testId}-trigger` : undefined,
            onClick: () => {
                if (model.popoverIsOpen) {
                    model.closePopover();
                } else {
                    model.openPopover();
                }
            }
        });
    }
);

//---------------------------------------------
// Options list (popover content)
//---------------------------------------------
const optionsList = hoistCmp.factory<PopoverPickerModel>(({model, props}) => {
    const {filteredOptions, enableFilter} = model,
        maxMenuHeight = withDefault(props.maxMenuHeight, 300),
        popoverWidth = props.popoverWidth,
        widthStyle = popoverWidth ? {width: popoverWidth} : undefined,
        {enableClear, enableMulti} = props,
        hasHeader = enableClear || (enableMulti && model.getSelectedValues().length > 0);

    return vbox({
        className: 'xh-popover-picker__menu',
        style: widthStyle,
        items: [
            enableFilter
                ? filterInput({model})
                : null,
            hasHeader
                ? menuHeader({model})
                : null,
            div({
                className: 'xh-popover-picker__options',
                style: {maxHeight: maxMenuHeight, overflowY: 'auto'},
                items: isEmpty(filteredOptions)
                    ? div({className: 'xh-popover-picker__no-results', item: 'No matches found.'})
                    : filteredOptions.map(opt => optionItem({model, opt, props}))
            })
        ]
    });
});

//---------------------------------------------
// Filter text input inside popover
//---------------------------------------------
const filterInput = hoistCmp.factory<PopoverPickerModel>(({model}) => {
    return div({
        className: 'xh-popover-picker__filter',
        item: div({
            className: 'xh-popover-picker__filter-input-wrapper',
            items: [
                Icon.filter({className: 'xh-popover-picker__filter-icon'}),
                inputEl({
                    type: 'text',
                    className: 'xh-popover-picker__filter-input',
                    placeholder: 'Filter...',
                    value: model.filterValue,
                    autoFocus: true,
                    onChange: e => model.setFilterValue(e.target.value),
                    onClick: e => e.stopPropagation()
                })
            ]
        })
    });
});

//---------------------------------------------
// Menu header with clear action
//---------------------------------------------
const menuHeader = hoistCmp.factory<PopoverPickerModel>(({model}) => {
    const selCount = model.getSelectedValues().length;
    if (selCount === 0) return null;

    return hbox({
        className: 'xh-popover-picker__header',
        items: [
            div({
                className: 'xh-popover-picker__header-count',
                item: `${selCount} selected`
            }),
            filler(),
            div({
                className: 'xh-popover-picker__header-clear',
                item: 'Clear',
                onClick: e => {
                    e.stopPropagation();
                    model.clearAll();
                }
            })
        ]
    });
});

//---------------------------------------------
// Single option item
//---------------------------------------------
const optionItem = hoistCmp.factory<PopoverPickerModel>(({model, opt, props}) => {
    const isSelected = model.isSelected(opt.value),
        {optionRenderer} = props;

    return div({
        className: classNames(
            'xh-popover-picker__option',
            isSelected && 'xh-popover-picker__option--selected'
        ),
        onClick: e => {
            e.stopPropagation();
            model.onOptionClick(opt.value);
        },
        items: optionRenderer
            ? optionRenderer(opt, isSelected)
            : [
                  div({
                      className: 'xh-popover-picker__option-check',
                      item: isSelected ? Icon.check({size: 'sm'}) : null
                  }),
                  div({
                      className: 'xh-popover-picker__option-label',
                      item: opt.label
                  })
              ]
    });
});
