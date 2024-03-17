/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {box, div, hbox, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, LayoutProps, PlainObject, SelectOption} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {
    reactAsyncCreatableSelect,
    reactAsyncSelect,
    reactCreatableSelect,
    reactSelect
} from '@xh/hoist/kit/react-select';
import {button} from '@xh/hoist/mobile/cmp/button';
import {toolbar} from '@xh/hoist/mobile/cmp/toolbar';
import '@xh/hoist/mobile/register';
import {action, bindable, makeObservable, observable, override} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {createObservableRef, getLayoutProps} from '@xh/hoist/utils/react';
import debouncePromise from 'debounce-promise';
import {escapeRegExp, isEqual, isNil, isPlainObject, keyBy, merge} from 'lodash';
import {Children, ReactNode, ReactPortal} from 'react';
import ReactDom from 'react-dom';
import './Select.scss';

export interface SelectProps extends HoistProps, HoistInputProps, LayoutProps {
    /**
     * Function to return a "create a new option" string prompt. Requires `allowCreate` true.
     * Passed current query input.
     */
    createMessageFn?: (query: string) => string;

    /** True (default) to close the menu after each selection. */
    closeMenuOnSelect?: boolean;

    /**
     * True to accept and commit input values not present in options or returned by a query.
     * Usually used with enableFullscreen, to ensure access to the mobile device keyboard.
     */
    enableCreate?: boolean;

    /**
     * True to enable type-to-search keyboard input. Defaults to false to disable keyboard input,
     * showing the dropdown menu on click. Usually used with enableFullscreen, to ensure access
     * to the mobile device keyboard.
     */
    enableFilter?: boolean;

    /**
     * True to render the select control in a full-screen modal dialog when focused.
     * Recommended for use with enableCreate|enableFilter, as we can guarantee the control
     * will be rendered in the top half of the viewport, above the mobile keyboard.
     */
    enableFullscreen?: boolean;

    /**
     * Optional override for fullscreen z-index. Useful for enabling fullscreen from
     * within components that have a higher z-index.
     */
    fullScreenZIndex?: number;

    /**
     * Function called to filter available options for a given query string input.
     * Used for filtering of options provided by `options` prop when `enableFilter` is true.
     * Not to be confused with `queryFn` prop, used in asynchronous mode.
     *
     * Provided function should take an option and a query value and return a boolean.
     * Defaults to a case-insensitive match on word starts.
     */
    filterFn?: (opt: SelectOption, inputVal: string) => boolean;

    /** True to hide the dropdown indicator, i.e. the down-facing arrow at the right of the Select. */
    hideDropdownIndicator?: boolean;

    /** True to suppress the default check icon rendered for the currently selected option. */
    hideSelectedOptionCheck?: boolean;

    /** True to hide options in the drop down menu if they have been selected.*/
    hideSelectedOptions?: boolean;

    /** Field on provided options for sourcing each option's display text (default `label`). */
    labelField?: string;

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

    /** Delay (in ms) to buffer calls to the async queryFn. Defaults to 300.*/
    queryBuffer?: number;

    /**
     * Async function to return a list of options for a given query string input.
     * Replaces the `options` prop - use one or the other.
     *
     * For providing external (e.g. server-side) options based on user inputs. Not to be
     * confused with `filterFn`, which should be used to filter through local options when
     * not in async mode.
     *
     * Provided function should take a query value and return a Promise resolving to a
     * list of options.
     */
    queryFn?: (query: string) => Promise<SelectOption[]>;

    /**
     * Escape-hatch props passed directly to react-select. Use with care - not all props
     * in the react-select API are guaranteed to be supported by this Hoist component,
     * and providing them directly can interfere with the implementation of this class.
     */
    rsOptions?: PlainObject;

    /** True to select contents when control receives focus. */
    selectOnFocus?: boolean;

    /** Text to display in header when in fullscreen mode. */
    title?: string;

    /** Field on provided options for sourcing each option's value (default `value`). */
    valueField?: string;
}

/**
 * A managed wrapper around the React-Select combobox/dropdown component.
 *
 * Supports advanced options such as:
 *      + Asynchronous queries
 *      + Custom dropdown option renderers
 *      + User-created ad-hoc entries
 *      + Full-screen mode
 *
 * Unlike the desktop version, multiple selection and use of react-windowed-select are not
 * currently supported.
 *
 * @see {@link https://react-select.com|React Select Docs}
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
    @bindable fullscreen = false;

    // Prop-backed convenience getters
    get asyncMode() {
        return !!this.componentProps.queryFn;
    }
    get creatableMode() {
        return !!this.componentProps.enableCreate;
    }
    get filterMode() {
        return !!this.componentProps.enableFilter;
    }
    get fullscreenMode() {
        return !!this.componentProps.enableFullscreen;
    }
    get selectOnFocus() {
        return this.componentProps.selectOnFocus ?? (this.filterMode || this.creatableMode);
    }
    get hideSelectedOptions() {
        return this.componentProps.hideSelectedOptions;
    }
    get hideSelectedOptionCheck() {
        return this.componentProps.hideSelectedOptionCheck || this.hideSelectedOptions;
    }

    // Managed value for underlying text input under certain conditions
    // This is a workaround for rs-select issue described in hoist-react #880
    @observable inputValue = null;
    inputValueChangedSinceSelect = false;
    get manageInputValue() {
        return this.filterMode;
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

        if (this.fullscreenMode) {
            this.addReaction(this.fullscreenReaction());
        }
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
        const {creatableMode, asyncMode} = this;
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
        this.fullscreen = false;
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
        if (this.fullscreenMode) {
            this.fullscreen = true;
        }
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

    selectText() {
        const {reactSelect} = this;
        if (!reactSelect) return;

        // Use of windowedMode, creatable and async variants will create levels of nesting we must
        // traverse to get to the underlying Select comp and its inputRef.
        let selectComp = reactSelect.select;
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
        return this.findOption(external, !isNil(external));
    }

    findOption(value, createIfNotFound, options = this.internalOptions) {
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
        return isNil(internal) ? null : internal.value;
    }

    normalizeOptions(options, depth = 0) {
        throwIf(depth > 1, 'Grouped select options support only one-deep nesting.');

        options = options || [];
        return options.map(it => this.toOption(it, depth));
    }

    // Normalize / clone a single source value into a normalized option object. Supports Strings
    // and Objects. Objects are validated/defaulted to ensure a label+value or label+options sublist,
    // with other fields brought along to support Selects emitting value objects with ad hoc properties.
    toOption(src, depth) {
        return isPlainObject(src) ? this.objectToOption(src, depth) : this.valueToOption(src);
    }

    objectToOption(src, depth) {
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

    valueToOption(src) {
        return {label: src != null ? src.toString() : '-null-', value: src};
    }

    //------------------------
    // Async
    //------------------------
    doQueryAsync = query => {
        return this.componentProps
            .queryFn(query)
            .then(matchOpts => {
                // Normalize query return.
                matchOpts = this.normalizeOptions(matchOpts);

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
            })
            .catch(e => {
                this.logError(e);
                throw e;
            });
    };

    loadingMessageFn = params => {
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

    optionRenderer = opt => {
        if (this.hideSelectedOptionCheck) {
            return div(opt.label);
        }

        return this.externalValue === opt.value
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
    // Fullscreen mode
    //------------------------
    fullscreenReaction() {
        return {
            track: () => this.fullscreen,
            run: fullscreen => {
                if (fullscreen) this.focus();
            },
            delay: 1 // Wait for render within fullscreen portal
        };
    }

    getOrCreateFullscreenPortalDiv() {
        const FULLSCREEN_PORTAL_ID = 'xh-select-input-fullscreen-portal';
        let portal = document.getElementById(FULLSCREEN_PORTAL_ID);
        if (!portal) {
            portal = document.createElement('div');
            portal.id = FULLSCREEN_PORTAL_ID;
            document.body.appendChild(portal);
        }
        portal.style.zIndex = withDefault(this.componentProps.fullScreenZIndex, null);
        return portal;
    }

    //------------------------
    // Other Implementation
    //------------------------
    getDropdownIndicatorCmp() {
        return this.componentProps.hideDropdownIndicator
            ? () => null
            : () => Icon.selectDropdown({className: 'xh-select__indicator'});
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

    noOptionsMessageFn = params => {
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
        const MENU_PORTAL_ID = 'xh-select-input-portal';
        let portal = document.getElementById(MENU_PORTAL_ID);
        if (!portal) {
            portal = document.createElement('div');
            portal.id = MENU_PORTAL_ID;
            document.body.appendChild(portal);
        }
        return portal;
    }
}

const cmp = hoistCmp.factory<SelectInputModel>(({model, className, ...props}, ref) => {
    const {width, ...layoutProps} = getLayoutProps(props),
        rsProps: PlainObject = {
            value: model.renderValue,

            formatOptionLabel: model.formatOptionLabel,
            isDisabled: props.disabled,
            closeMenuOnSelect: props.closeMenuOnSelect,
            hideSelectedOptions: model.hideSelectedOptions,
            menuPlacement: withDefault(props.menuPlacement, 'auto'),
            maxMenuHeight: props.maxMenuHeight,
            noOptionsMessage: model.noOptionsMessageFn,
            openMenuOnFocus: props.openMenuOnFocus || model.fullscreen,
            placeholder: withDefault(props.placeholder, 'Select...'),
            tabIndex: props.tabIndex,
            menuShouldBlockScroll: true,

            // Minimize (or hide) bulky dropdown
            components: {
                DropdownIndicator: model.getDropdownIndicatorCmp(),
                IndicatorSeparator: () => null
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
    merge(rsProps, props.rsOptions);

    if (model.fullscreen) {
        return ReactDom.createPortal(
            fullscreenWrapper({
                model,
                title: props.title,
                item: box({
                    item: factory(rsProps),
                    className,
                    ref
                })
            }),
            model.getOrCreateFullscreenPortalDiv()
        ) as ReactPortal;
    } else {
        return box({
            item: factory(rsProps),
            className,
            ...layoutProps,
            width: withDefault(width, null),
            ref
        });
    }
});

const fullscreenWrapper = hoistCmp.factory<SelectInputModel>(({model, title, children}) => {
    return div({
        className: 'xh-select__fullscreen-wrapper',
        items: [
            toolbar({
                className: 'xh-select__fullscreen-toolbar',
                items: [
                    button({
                        icon: Icon.chevronLeft(),
                        onClick: () => (model.fullscreen = false)
                    }),
                    span(title)
                ]
            }),
            Children.only(children)
        ]
    });
});
