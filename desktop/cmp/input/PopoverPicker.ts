/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {div, filler, hbox, input as inputEl, span, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, LayoutProps, SelectOption, StyleProps} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {button, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {TEST_ID, withDefault, pluralize} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {castArray, isEmpty, isEqual, isPlainObject} from 'lodash';
import {ReactNode} from 'react';
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
     * Value to use when the input is empty. Defaults to `[]` when `enableMulti` is true,
     * and `null` otherwise.
     */
    emptyValue?: any;

    /**
     * True to allow clearing the current selection. In multi-select mode, shows a "Clear"
     * action in the popover footer. In single-select mode, clicking the already-selected
     * option deselects it.
     */
    enableClear?: boolean;

    /**
     * True to show a "Select All" action in the multi-select popover footer.
     * Only effective when `enableMulti` is true. Defaults to false.
     */
    enableSelectAll?: boolean;

    /**
     * True to include a text filter input at the top of the popover to narrow the options list.
     * Defaults to true when the option count exceeds `filterThreshold`.
     */
    enableFilter?: boolean;

    /** Number of options above which the filter input is shown by default. Defaults to 8. */
    filterThreshold?: number;

    /**
     * Singular noun describing each option (e.g. "state", "region"). When set, used in the
     * default multi-select button text (e.g. "3 states", "All regions") and the popover
     * footer count. Automatically pluralized as needed via {@link pluralize}.
     */
    displayNoun?: string;

    /** Text shown on the trigger button when no value is selected. Defaults to 'Select...'. */
    placeholder?: string;

    /**
     * Props forwarded to the trigger button. Use this to customize the button's appearance,
     * including `icon`, `rightIcon`, `intent`, `minimal`, `outlined`, `tooltip`, and any other
     * {@link ButtonProps}.
     *
     * Defaults to `{minimal: true, outlined: true, rightIcon: Icon.chevronDown()}`.
     */
    buttonProps?: Partial<ButtonProps>;

    /**
     * True (default for single mode) to close the popover after a selection.
     * Defaults to false in multi mode.
     */
    closeOnSelect?: boolean;

    /** Placement of the popover relative to the trigger. Defaults to 'bottom-left'. */
    popoverPosition?: string;

    /**
     * True to render a minimal popover without an arrow or visual separation from the trigger.
     * Defaults to false, displaying the popover with an arrow and slight offset.
     */
    popoverMinimal?: boolean;

    /** Width of the popover content in pixels. */
    popoverWidth?: number;

    /** True to render borders between option rows. Defaults to false. */
    rowBorders?: boolean;

    /** True to use alternating backgrounds for option rows. Defaults to false. */
    stripeRows?: boolean;

    /** Maximum height of the options list before scrolling. Defaults to 300. */
    maxMenuHeight?: number;

    /**
     * Function to render the text displayed on the trigger button for the current selection.
     * Receives an array of selected option objects, the full list of option objects, and the
     * configured `displayNoun` (if any). Return a ReactNode for display. Overrides the default
     * button text, including any `displayNoun`-based summary. Does not replace the button
     * itself — use `buttonProps` to customize the button's icon, intent, or other properties.
     */
    buttonTextRenderer?: (
        selectedOpts: SelectOption[],
        allOpts: SelectOption[],
        displayNoun: string
    ) => ReactNode;

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
 * displays a compact summary (e.g. "3 selected") rather than concatenating all selected labels.
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
        const {emptyValue, enableMulti} = this.componentProps;
        if (emptyValue !== undefined) return emptyValue;
        return enableMulti ? [] : null;
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
            const shouldClear = this.componentProps.enableClear && this.isSelected(optValue);
            this.noteValueChange(shouldClear ? this.emptyValue : optValue);
        }

        if (this.closeOnSelect) {
            this.closePopover();
        }
    }

    selectAll() {
        this.noteValueChange(this.internalOptions.map(o => o.value));
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
        return this.internalOptions.filter(opt => selected.some(v => isEqual(v, opt.value)));
    }

    getButtonText(): ReactNode {
        const {componentProps, internalOptions} = this,
            {buttonTextRenderer, placeholder, displayNoun} = componentProps,
            selectedOpts = this.getSelectedOptions();

        if (buttonTextRenderer) {
            return buttonTextRenderer(selectedOpts, internalOptions, displayNoun);
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

        if (selCount === totalCount)
            return displayNoun ? `All ${pluralize(displayNoun)}` : 'All selected';
        if (selCount === 1) return selectedOpts[0].label;
        return displayNoun ? `${selCount} ${pluralize(displayNoun)}` : `${selCount} selected`;
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
    const hasSelection = !isEmpty(model.getSelectedValues()),
        nothingSelected = !hasSelection;

    return popover({
        className,
        isOpen: model.popoverIsOpen,
        onInteraction: nextOpen => model.onPopoverInteraction(nextOpen),
        minimal: withDefault(props.popoverMinimal, false),
        position: withDefault(props.popoverPosition, 'bottom-left'),
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
        const {width, ...restLayout} = getLayoutProps(props),
            btnProps = props.buttonProps ?? {};

        return button({
            minimal: true,
            outlined: true,
            rightIcon: Icon.chevronDown(),
            ...btnProps,
            ref,
            className: classNames(
                'xh-popover-picker__trigger',
                nothingSelected && 'xh-popover-picker__trigger--empty',
                btnProps.className
            ),
            text: model.getButtonText(),
            disabled: props.disabled,
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
        {enableMulti} = props;

    return vbox({
        className: 'xh-popover-picker__menu',
        style: widthStyle,
        items: [
            enableFilter ? filterInput({model}) : null,
            div({
                className: classNames(
                    'xh-popover-picker__options',
                    props.rowBorders && 'xh-popover-picker__options--row-borders',
                    props.stripeRows && 'xh-popover-picker__options--stripe-rows'
                ),
                style: {maxHeight: maxMenuHeight, overflowY: 'auto'},
                items: isEmpty(filteredOptions)
                    ? div({className: 'xh-popover-picker__no-results', item: 'No matches found.'})
                    : filteredOptions.map(opt => optionItem({model, opt, props}))
            }),
            enableMulti ? menuFooter({model, props}) : null
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
// Menu footer with count, select all, and clear
//---------------------------------------------
const menuFooter = hoistCmp.factory<PopoverPickerModel>(({model, props}) => {
    const selCount = model.getSelectedValues().length,
        totalCount = model.internalOptions.length,
        {displayNoun, enableClear, enableSelectAll} = props,
        noneSelected = selCount === 0,
        allSelected = selCount === totalCount;

    let countText: string;
    if (noneSelected) {
        countText = displayNoun ? `No ${pluralize(displayNoun)} selected` : 'None selected';
    } else {
        countText = displayNoun ? pluralize(displayNoun, selCount, true) : `${selCount} selected`;
    }

    const actions = [];
    if (enableSelectAll) {
        actions.push(
            div({
                className: classNames(
                    'xh-popover-picker__footer-action',
                    allSelected && 'xh-popover-picker__footer-action--disabled'
                ),
                item: 'All',
                onClick: e => {
                    e.stopPropagation();
                    if (!allSelected) model.selectAll();
                }
            })
        );
    }
    if (enableClear) {
        if (actions.length > 0) {
            actions.push(span({className: 'xh-popover-picker__footer-separator', item: '\u00b7'}));
        }
        actions.push(
            div({
                className: classNames(
                    'xh-popover-picker__footer-action',
                    noneSelected && 'xh-popover-picker__footer-action--disabled'
                ),
                item: 'Clear',
                onClick: e => {
                    e.stopPropagation();
                    if (!noneSelected) model.clearAll();
                }
            })
        );
    }

    return hbox({
        className: 'xh-popover-picker__footer',
        items: [
            div({className: 'xh-popover-picker__footer-count', item: countText}),
            filler(),
            ...actions
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
