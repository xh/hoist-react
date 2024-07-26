/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {box, div, fragment, hbox, span} from '@xh/hoist/cmp/layout';
import {
    Awaitable,
    createElement,
    hoistCmp,
    HoistProps,
    LayoutProps,
    PlainObject,
    SelectOption,
    XH
} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {tooltip} from '@xh/hoist/kit/blueprint';
import {
    reactAsyncCreatableSelect,
    reactAsyncSelect,
    reactCreatableSelect,
    reactSelect,
    reactWindowedSelect
} from '@xh/hoist/kit/react-select';
import {action, bindable, makeObservable, observable, override} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {elemWithin, getTestId, TEST_ID, throwIf, withDefault, mergeDeep} from '@xh/hoist/utils/js';
import {createObservableRef, getLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import debouncePromise from 'debounce-promise';
import {castArray, escapeRegExp, isEmpty, isEqual, isNil, isPlainObject, keyBy} from 'lodash';
import {ReactElement, ReactNode} from 'react';
import {components} from 'react-select';
import './Select.scss';

export const MENU_PORTAL_ID = 'xh-select-input-portal';

export interface SelectProps extends HoistProps, HoistInputProps, LayoutProps {
    /** True to focus the control on render. */
    autoFocus?: boolean;

    /**
     * Function to return a "create a new option" string prompt. Requires `enableCreate` true.
     * Passed current query input.
     */
    createMessageFn?: (query: string) => string;

    /** True (default) to close the menu after each selection. */
    closeMenuOnSelect?: boolean;

    /** True to show a "clear" button at the right of the control. */
    enableClear?: boolean;

    /** True to accept and commit input values not present in options or returned by a query. */
    enableCreate?: boolean;

    /**
     * True (default) to enable type-to-search keyboard input. False to disable keyboard input,
     * showing the dropdown menu on click.
     */
    enableFilter?: boolean;

    /** True to allow entry/selection of multiple values - "tag picker" style. */
    enableMulti?: boolean;

    /**
     * True to enable tooltips on selected values. Enable when the space
     * available to the select component might not support showing the value's full text.
     */
    enableTooltips?: boolean;

    /**
     * True to use react-windowed-select for improved performance on large option lists.
     * See https://github.com/jacobworrel/react-windowed-select/.
     *
     * Currently only supported when the enableCreate and queryFn props are not specified.
     * These options require the use of specialized 'Async' or 'Creatable' selects from the
     * underlying react-select library which are not fully implemented in react-windowed-select.
     *
     * Applications should use this option with care.
     */
    enableWindowed?: boolean;

    /**
     * Function called to filter available options for a given query string input.
     * Used for filtering of options provided by `options` prop when `enableFilter` is true.
     * Not to be confused with `queryFn` prop, used in asynchronous mode.
     *
     * Provided function should take an option and a query value and return a boolean.
     * Defaults to a case-insensitive match on word starts.
     */
    filterFn?: (opt: SelectOption, inputVal: string) => boolean;

    /**
     * True to hide the dropdown indicator, i.e. the down-facing arrow at the right of the Select.
     * Defaults to true on tablets, false on desktop.
     */
    hideDropdownIndicator?: boolean;

    /** True to suppress the default check icon rendered for the currently selected option. */
    hideSelectedOptionCheck?: boolean;

    /**
     * True to hide options in the drop-down menu if they have been selected.
     * Defaults to same as enableMulti.
     */
    hideSelectedOptions?: boolean;

    /** Field on provided options for sourcing each option's display text (default `label`). */
    labelField?: string;

    /** Icon to display inline on the left side of the input. */
    leftIcon?: ReactElement;

    /** Function to return loading message during an async query. Passed current query input. */
    loadingMessageFn?: (query: string) => string;

    /** Maximum height of the menu before scrolling. Defaults to 300px. */
    maxMenuHeight?: number;

    /** Placement of the dropdown menu relative to the input control. */
    menuPlacement?: 'auto' | 'top' | 'bottom';

    /** Width in pixels for the dropdown menu - if unspecified, defaults to control width. */
    menuWidth?: number;

    /** Function to return message indicating no options loaded. Passed current query input. */
    noOptionsMessageFn?: (query: string) => string;

    /** True to auto-open the dropdown menu on input focus. */
    openMenuOnFocus?: boolean;

    /**
     * Function to render options in the dropdown list. Called for each option object (which
     * will contain at minimum a value and label field, as well as any other fields present in
     * the source objects).
     */
    optionRenderer?: (SelectOption) => ReactNode;

    /**
     * Preset list of options for selection. Elements can be either a primitive or an object.
     * Primitives will be displayed via toString().
     * Objects must have either:
     *      + A `label` property for display and a `value` property
     *      + A `label` property and an `options` property containing an array of sub-options
     *        to be grouped beneath the option. These sub-options must be either primitives or
     *        `label`:`value` pairs. Deeper nesting is unsupported.
     *
     * See also `queryFn` to  supply options via an async query (i.e. from the server) instead
     * of up-front in this prop.
     */
    options?: Array<SelectOption | any>;

    /** Text to display when control is empty. */
    placeholder?: string;

    /**
     * Delay (in ms) to buffer calls to the async queryFn. Defaults to 300.
     */
    queryBuffer?: number;

    /**
     * Async function to return a list of options for a given query string input.
     * Replaces the `options` prop - use one or the other.
     *
     * For providing external (e.g. server-side) options based on user inputs. Not to be
     * confused with `filterFn`, which should be used to filter through local options when
     * not in async mode.
     */
    queryFn?: (query: string) => Awaitable<Array<SelectOption | any>>;

    /**
     * Escape-hatch props passed directly to react-select. Use with care - not all props
     * in the react-select API are guaranteed to be supported by this Hoist component,
     * and providing them directly can interfere with the implementation of this class.
     */
    rsOptions?: PlainObject;

    /** True to select contents when control receives focus. */
    selectOnFocus?: boolean;

    /** Field on provided options for sourcing each option's value (default `value`). */
    valueField?: string;
}

/**
 * A managed wrapper around the React-Select combobox/dropdown component.
 *
 * Supports advanced options such as:
 *      + Asynchronous queries
 *      + Multiple selection
 *      + Custom dropdown option renderers
 *      + User-created ad-hoc entries
 *      + Use of the library react-windowed-select for improved performance on large option lists.
 *
 * See {@link https://react-select.com|React}
 * See {@link https://github.com/jacobworrel/react-windowed-select}
 */
export const [Select, select] = hoistCmp.withFactory<SelectProps>({
    displayName: 'Select',
    className: 'xh-select',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, SelectInputModel);
    }
});
(Select as any).hasLayoutSupport = true;

//-----------------------
// Implementation
//-----------------------
class SelectInputModel extends HoistInputModel {
    override xhImpl = true;

    // Normalized collection of selectable options. Passed directly to synchronous select.
    // Maintained for (but not passed to) async select to resolve value string <> option objects.
    @bindable.ref internalOptions = [];

    // Prop-backed convenience getters
    get asyncMode(): boolean {
        return !!this.componentProps.queryFn;
    }

    get creatableMode(): boolean {
        return !!this.componentProps.enableCreate;
    }

    get windowedMode(): boolean {
        return !!this.componentProps.enableWindowed;
    }

    get multiMode(): boolean {
        return !!this.componentProps.enableMulti;
    }

    get filterMode(): boolean {
        return this.componentProps.enableFilter ?? true;
    }

    get selectOnFocus(): boolean {
        return (
            this.componentProps.selectOnFocus ??
            (!this.multiMode && (this.filterMode || this.creatableMode))
        );
    }

    get hideDropdownIndicator(): boolean {
        return this.componentProps.hideDropdownIndicator ?? XH.isTablet;
    }

    get hideSelectedOptions(): boolean {
        return this.componentProps.hideSelectedOptions ?? this.multiMode;
    }

    get hideSelectedOptionCheck(): boolean {
        return this.componentProps.hideSelectedOptionCheck || this.hideSelectedOptions;
    }

    // Managed value for underlying text input under certain conditions
    // This is a workaround for rs-select issue described in hoist-react #880
    @observable inputValue: string = null;
    inputValueChangedSinceSelect = false;
    get manageInputValue(): boolean {
        return this.filterMode && !this.multiMode;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        const queryBuffer = withDefault(this.componentProps.queryBuffer, 300);
        if (queryBuffer) this.doQueryAsync = debouncePromise(this.doQueryAsync, queryBuffer);

        this.addReaction({
            track: () => this.componentProps.options,
            run: opts => {
                opts = this.normalizeOptions(opts);
                this.internalOptions = opts;
            },
            fireImmediately: true
        });
    }

    reactSelectRef = createObservableRef<any>();

    get reactSelect() {
        return this.reactSelectRef.current;
    }

    override blur() {
        this.reactSelect?.blur();
    }

    override focus() {
        this.reactSelect?.focus();
    }

    override select() {
        this.selectText();
    }

    getSelectFactory() {
        const {creatableMode, asyncMode, windowedMode} = this;
        if (windowedMode) {
            throwIf(creatableMode, 'Windowed mode not available when enableCreate is true');
            throwIf(asyncMode, 'Windowed mode not available when queryFn is set');
            return reactWindowedSelect;
        }
        return asyncMode
            ? creatableMode
                ? reactAsyncCreatableSelect
                : reactAsyncSelect
            : creatableMode
              ? reactCreatableSelect
              : reactSelect;
    }

    @action
    onSelectChange = opt => {
        if (this.manageInputValue) {
            this.inputValue = opt ? opt.label : null;
            this.inputValueChangedSinceSelect = false;
        }
        this.noteValueChange(opt);
    };

    //-------------------------
    // Text input handling
    //-------------------------
    @action
    onInputChange = (value, {action}) => {
        if (this.manageInputValue) {
            if (action === 'input-change') {
                this.inputValue = value;
                this.inputValueChangedSinceSelect = true;
            } else if (action === 'input-blur') {
                this.inputValue = null;
                this.inputValueChangedSinceSelect = false;
            }
        }
    };

    @override
    override noteFocused() {
        if (this.manageInputValue) {
            const {renderValue} = this;
            this.inputValue = renderValue ? renderValue.label : null;
        }
        if (this.selectOnFocus) {
            wait().then(() => {
                // Delay to allow re-render. For safety, only select if still focused!
                this.selectText();
            });
        }
        super.noteFocused();
    }

    private selectText() {
        const {reactSelect} = this;
        if (!reactSelect) return;

        // TODO - after update to react-select v5 in HR v59, could not identify any cases that
        //  still required the while loop below. Had been required due to nested layers of
        //  components when using enableWindowed, enableCreate, and/or queryFn. Leaving in place to
        //  avoid breaking some edge-case we're not finding, but could review/simplify once update
        //  is baked in a bit more.
        let selectComp = reactSelect;
        while (selectComp && !selectComp.inputRef) {
            selectComp = selectComp.select;
        }
        const inputElem = selectComp?.inputRef;

        if (this.hasFocus && inputElem && document.activeElement === inputElem) {
            inputElem.select();
        }
    }

    @override
    override setInternalValue(val) {
        const changed = !isEqual(val, this.internalValue);
        super.setInternalValue(val);
        if (changed && this.manageInputValue && this.hasFocus) {
            const {renderValue} = this;
            this.inputValue = renderValue ? renderValue.label : null;
        }
    }

    //-------------------------
    // Options / value handling
    //-------------------------
    filterOption = (opt, inputVal) => {
        const {componentProps, asyncMode, inputValue, inputValueChangedSinceSelect} = this;

        // 1) show all options if input has not changed since last select (i.e. user has not typed)
        //    or if in async mode (i.e. queryFn specified).
        if (
            (this.manageInputValue && (!inputValue || !inputValueChangedSinceSelect)) ||
            asyncMode
        ) {
            return true;
        }

        // 2) Use function provided by app
        const {filterFn} = componentProps;
        if (filterFn) {
            return filterFn(opt, inputVal);
        }

        // 3) ...or use default word start search
        const searchTerm = escapeRegExp(inputVal);
        if (!searchTerm) return true;
        if (!opt.label) return false;
        const regex = new RegExp(`(^|\\W)${searchTerm}`, 'i');
        return regex.test(opt.label);
    };

    // Convert external value into option object(s). Options created if missing - this takes the
    // external value from the model, and we will respect that even if we don't know about it.
    // (Exception for a null value, which we will only accept if explicitly present in options.)
    override toInternal(external) {
        if (this.multiMode) {
            if (external == null) external = []; // avoid [null]
            return castArray(external).map(it => this.findOption(it, !isNil(it)));
        }

        return this.findOption(external, !isNil(external));
    }

    private findOption(value, createIfNotFound, options = this.internalOptions) {
        // Do a depth-first search of options
        for (const option of options) {
            if (option.options) {
                const ret = this.findOption(value, false, option.options);
                if (ret) return ret;
            } else {
                if (isEqual(option.value, value)) return option;
            }
        }

        return createIfNotFound ? this.valueToOption(value) : null;
    }

    override toExternal(internal) {
        if (isNil(internal)) return null;

        if (this.multiMode) {
            if (isEmpty(internal)) return null;
            return castArray(internal).map(it => it.value);
        }

        return internal.value;
    }

    private normalizeOptions(options, depth = 0) {
        throwIf(depth > 1, 'Grouped select options support only one-deep nesting.');

        options = options || [];
        return options.map(it => this.toOption(it, depth));
    }

    // Normalize / clone a single source value into a normalized option object. Supports Strings
    // and Objects. Objects are validated/defaulted to ensure a label+value or label+options sublist,
    // with other fields brought along to support Selects emitting value objects with ad hoc properties.
    private toOption(src, depth) {
        return isPlainObject(src) ? this.objectToOption(src, depth) : this.valueToOption(src);
    }

    private objectToOption(src, depth) {
        const {componentProps} = this,
            labelField = withDefault(componentProps.labelField, 'label'),
            valueField = withDefault(componentProps.valueField, 'value');

        throwIf(
            !src.hasOwnProperty(valueField) && !src.hasOwnProperty('options'),
            `Select options provided as Objects must define a '${valueField}' property or a sublist of options.`
        );

        return src.hasOwnProperty('options')
            ? {
                  ...src,
                  label: src[labelField],
                  options: this.normalizeOptions(src.options, depth + 1)
              }
            : {
                  ...src,
                  label: withDefault(src[labelField], src[valueField]),
                  value: src[valueField]
              };
    }

    private valueToOption(src) {
        return {label: src != null ? src.toString() : '-null-', value: src};
    }

    //------------------------
    // Async
    //------------------------
    doQueryAsync = async query => {
        const rawOpts = await this.componentProps.queryFn(query),
            matchOpts = this.normalizeOptions(rawOpts);

        // Carry forward and add to any existing internalOpts to allow our value
        // converters to continue all selected values in multiMode.
        const matchesByVal = keyBy(matchOpts, 'value'),
            newOpts = [...matchOpts];
        this.internalOptions.forEach(currOpt => {
            const matchOpt = matchesByVal[currOpt.value];
            if (!matchOpt) newOpts.push(currOpt); // avoiding dupes
        });
        this.internalOptions = newOpts;

        // But only return the matching options back to the combo.
        return matchOpts;
    };

    loadingMessageFn = params => {
        // workaround for https://github.com/jacobworrel/react-windowed-select/issues/19
        if (!params) return '';
        const {loadingMessageFn} = this.componentProps,
            q = params.inputValue;

        return loadingMessageFn ? loadingMessageFn(q) : 'Loading...';
    };

    //----------------------
    // Option Rendering
    //----------------------
    formatOptionLabel = (opt, params) => {
        // Always display the standard label string in the value container (context == 'value').
        // If we need to expose customization here, we could consider a dedicated prop.
        if (params.context !== 'menu') {
            return opt.label;
        }

        // For rendering dropdown menu items, use an optionRenderer if provided - or use the
        // implementation here to render a checkmark next to the active selection.
        const optionRenderer = this.componentProps.optionRenderer || this.optionRenderer;
        return optionRenderer(opt);
    };

    private optionRenderer = opt => {
        if (this.hideSelectedOptionCheck) {
            return div(opt.label);
        }

        return castArray(this.externalValue).includes(opt.value)
            ? hbox({
                  items: [
                      div({
                          style: {minWidth: 25, textAlign: 'center'},
                          item: Icon.check({size: 'sm'})
                      }),
                      span(opt.label)
                  ],
                  paddingLeft: 0
              })
            : div({item: opt.label, style: {paddingLeft: 25}});
    };

    //------------------------
    // Other Implementation
    //------------------------
    // cache to avoid re-renders and focus issues, note this "freezes" leftIcon
    _valueContainerCmp = null;
    getValueContainerCmp() {
        if (!this._valueContainerCmp) {
            const {leftIcon} = this.componentProps;
            this._valueContainerCmp = leftIcon
                ? props =>
                      fragment(
                          span({className: 'xh-select__control__left-icon', item: leftIcon}),
                          createElement(components.ValueContainer, props)
                      )
                : components.ValueContainer;
        }

        return this._valueContainerCmp;
    }

    _menuCmp = null;
    getMenuCmp() {
        if (!this._menuCmp) {
            const testId = getTestId(this.componentProps, 'menu');
            this._menuCmp = testId
                ? props =>
                      createElement(components.Menu, {
                          ...props,
                          innerProps: {[TEST_ID]: testId, ...props.innerProps}
                      })
                : components.Menu;
        }
        return this._menuCmp;
    }

    getDropdownIndicatorCmp() {
        return this.hideDropdownIndicator
            ? () => null
            : () => Icon.selectDropdown({className: 'xh-select__indicator'});
    }

    // As per example @ https://react-select.com/components#replaceable-components
    getClearIndicatorCmp() {
        return props => {
            const {ref, ...restInnerProps} = props.innerProps;
            return div({
                ...restInnerProps,
                ref,
                [TEST_ID]: getTestId(this.componentProps, 'clear-btn'),
                item: Icon.x({className: 'xh-select__indicator'})
            });
        };
    }

    getThemeConfig() {
        return base => {
            return {
                ...base,
                spacing: {...base.spacing, menuGutter: 3},
                borderRadius: 3
            };
        };
    }

    getMultiValueLabelCmp() {
        return this.componentProps.enableTooltips
            ? props => {
                  props = this.withTooltip(props, 'xh-select__tooltip__target');
                  return createElement(components.MultiValueLabel, props);
              }
            : components.MultiValueLabel;
    }

    getSingleValueCmp() {
        return this.componentProps.enableTooltips
            ? props => {
                  props = this.withTooltip(props, 'xh-select__tooltip__target');
                  return createElement(components.SingleValue, props);
              }
            : components.SingleValue;
    }

    noOptionsMessageFn = params => {
        // account for bug in react-windowed-select https://github.com/jacobworrel/react-windowed-select/issues/19
        if (!params) return '';
        const {noOptionsMessageFn} = this.componentProps,
            q = params.inputValue;

        if (noOptionsMessageFn) return noOptionsMessageFn(q);
        if (q) return 'No matches found.';
        return this.asyncMode ? 'Type to search...' : '';
    };

    createMessageFn = q => {
        const {createMessageFn} = this.componentProps;
        return createMessageFn ? createMessageFn(q) : `Create "${q}"`;
    };

    getOrCreatePortalDiv() {
        const id = MENU_PORTAL_ID;
        let portal = document.getElementById(id);
        if (!portal) {
            portal = document.createElement('div');
            portal.id = id;
            document.body.appendChild(portal);
        }
        return portal;
    }

    private withTooltip(props: PlainObject, className: string): PlainObject {
        return {
            ...props,
            children: tooltip({
                className,
                content: props.children,
                item: props.children
            })
        };
    }
}

const cmp = hoistCmp.factory<SelectInputModel>(({model, className, ...props}, ref) => {
    const {width, height, ...layoutProps} = getLayoutProps(props),
        rsProps: PlainObject = {
            value: model.renderValue,

            autoFocus: props.autoFocus,
            formatOptionLabel: model.formatOptionLabel,
            isDisabled: props.disabled,
            isMulti: props.enableMulti,
            closeMenuOnSelect: props.closeMenuOnSelect,
            hideSelectedOptions: model.hideSelectedOptions,
            maxMenuHeight: props.maxMenuHeight,

            // Explicit false ensures consistent default for single and multi-value instances.
            isClearable: withDefault(props.enableClear, false),
            menuPlacement: withDefault(props.menuPlacement, 'auto'),
            noOptionsMessage: model.noOptionsMessageFn,
            openMenuOnFocus: props.openMenuOnFocus,
            placeholder: withDefault(props.placeholder, 'Select...'),
            tabIndex: props.tabIndex,

            // Minimize (or hide) bulky dropdown
            components: {
                DropdownIndicator: model.getDropdownIndicatorCmp(),
                ClearIndicator: model.getClearIndicatorCmp(),
                Menu: model.getMenuCmp(),
                IndicatorSeparator: () => null,
                ValueContainer: model.getValueContainerCmp(),
                MultiValueLabel: model.getMultiValueLabelCmp(),
                SingleValue: model.getSingleValueCmp()
            },

            // A shared div is created lazily here as needed, appended to the body, and assigned
            // a high z-index to ensure options menus render over dialogs or other modals.
            menuPortalTarget: model.getOrCreatePortalDiv(),

            inputId: props.id,
            classNamePrefix: 'xh-select',
            theme: model.getThemeConfig(),

            onBlur: model.onBlur,
            onChange: model.onSelectChange,
            onFocus: model.onFocus,
            filterOption: model.filterOption,

            ref: model.reactSelectRef
        };

    if (model.manageInputValue) {
        rsProps.inputValue = model.inputValue || '';
        rsProps.onInputChange = model.onInputChange;
        rsProps.controlShouldRenderValue = !model.hasFocus;
        rsProps.onMenuOpen = () => {
            wait().then(() => {
                const selectedEl = document.getElementsByClassName(
                    'xh-select__option--is-selected'
                )[0];
                selectedEl?.scrollIntoView({block: 'end'});
            });
        };
    }

    if (model.asyncMode) {
        rsProps.loadOptions = model.doQueryAsync;
        rsProps.loadingMessage = model.loadingMessageFn;
        if (model.renderValue) rsProps.defaultOptions = [model.renderValue];
    } else {
        rsProps.options = model.internalOptions;
        rsProps.isSearchable = model.filterMode;
    }

    if (model.creatableMode) {
        rsProps.formatCreateLabel = model.createMessageFn;
    }

    if (props.menuWidth) {
        rsProps.styles = {
            menu: provided => ({...provided, width: `${props.menuWidth}px`}),
            ...props.rsOptions?.styles
        };
    }

    const factory = model.getSelectFactory();
    mergeDeep(rsProps, props.rsOptions);

    return box({
        item: factory(rsProps),
        className: classNames(className, height ? 'xh-select--has-height' : null),
        onKeyDown: e => {
            // Esc. and Enter can be listened for by parents -- stop the keydown event
            // propagation only if react-select already likely to have used for menu management.
            // note: menuIsOpen will be undefined on AsyncSelect due to a react-select bug.
            const menuIsOpen = model.reactSelect?.state?.menuIsOpen;
            if (menuIsOpen && (e.key === 'Escape' || e.key === 'Enter')) {
                e.stopPropagation();
            }
        },
        onMouseDown: e => {
            // Some internal elements, like the dropdown indicator and the rendered single value,
            // fire 'mousedown' events. These can bubble and inadvertently close Popovers that
            // contain Selects.
            const target = e?.target as HTMLElement;
            if (target && elemWithin(target, 'bp5-popover')) {
                e.stopPropagation();
            }
        },
        testId: props.testId,
        ...layoutProps,
        width: withDefault(width, 200),
        height: height,
        ref
    });
});
