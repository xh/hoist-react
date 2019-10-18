/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {HoistInput} from '@xh/hoist/cmp/input';
import {box, div, hbox, span} from '@xh/hoist/cmp/layout';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {
    reactAsyncCreatableSelect,
    reactAsyncSelect,
    reactCreatableSelect,
    reactSelect
} from '@xh/hoist/kit/react-select';
import {action, observable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import debouncePromise from 'debounce-promise';
import {assign, castArray, find, isEmpty, isNil, isPlainObject, keyBy} from 'lodash';
import PT from 'prop-types';
import React from 'react';
import {createFilter} from 'react-select';

import './Select.scss';

/**
 * A managed wrapper around the React-Select combobox/dropdown component.
 *
 * Supports advanced options such as:
 *      + Asynchronous queries
 *      + Multiple selection
 *      + Custom dropdown option renderers
 *      + User-created ad-hoc entries
 *
 * @see {@link https://react-select.com|React Select Docs}
 */
@LayoutSupport
@HoistComponent
export class Select extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,

        /** True to focus the control on render. */
        autoFocus: PT.bool,

        /**
         * Function to return a "create a new option" string prompt. Requires `allowCreate` true.
         * Passed current query input.
         */
        createMessageFn: PT.func,

        /** True to show a "clear" button at the right of the control.  Defaults to false. */
        enableClear: PT.bool,

        /** True to accept and commit input values not present in options or returned by a query. */
        enableCreate: PT.bool,

        /**
         * True (default) to enable type-to-search keyboard input. False to disable keyboard input,
         * showing the dropdown menu on click.
         */
        enableFilter: PT.bool,

        /** True to allow entry/selection of multiple values - "tag picker" style. */
        enableMulti: PT.bool,

        /** True to suppress the default check icon rendered for the currently selected option. */
        hideSelectedOptionCheck: PT.bool,

        /** Field on provided options for sourcing each option's display text (default `label`). */
        labelField: PT.string,

        /** Function to return loading message during an async query. Passed current query input. */
        loadingMessageFn: PT.func,

        /** Placement of the dropdown menu relative to the input control. */
        menuPlacement: PT.oneOf(['auto', 'top', 'bottom']),

        /** Function to return message indicating no options loaded. Passed current query input. */
        noOptionsMessageFn: PT.func,

        /** True to auto-open the dropdown menu on input focus. */
        openMenuOnFocus: PT.bool,

        /**
         * Function to render options in the dropdown list. Called for each option object (which
         * will contain at minimum a value and label field, as well as any other fields present in
         * the source objects). Returns a React.node.
         */
        optionRenderer: PT.func,

        /**
         * Preset list of options for selection. Objects must contain a `value` property; a `label`
         * property will be used for the default display of each option. Other types will be taken
         * as their value directly and displayed via toString().  See also `queryFn` to  supply
         * options via an async query (i.e. from the server) instead of up-front in this prop.
         */
        options: PT.array,

        /** Text to display when control is empty. */
        placeholder: PT.string,

        /**
         * Delay (in ms) to buffer calls to the async queryFn. Defaults to 300.
         */
        queryBuffer: PT.number,

        /**
         * Async function to return a list of options for a given query string input.
         * Replaces the `options` prop - use one or the other.
         */
        queryFn: PT.func,

        /**
         * Escape-hatch props passed directly to react-select. Use with care - not all props
         * in the react-select API are guaranteed to be supported by this Hoist component,
         * and providing them directly can interfere with the implementation of this class.
         */
        rsOptions: PT.object,

        /** True to select contents when control receives focus. */
        selectOnFocus: PT.bool,

        /** Field on provided options for sourcing each option's value (default `value`). */
        valueField: PT.string
    };

    static MENU_PORTAL_ID = 'xh-select-input-portal';

    baseClassName = 'xh-select';

    // Normalized collection of selectable options. Passed directly to synchronous select.
    // Maintained for (but not passed to) async select to resolve value string <> option objects.
    @observable.ref internalOptions = [];
    @action setInternalOptions(options) {this.internalOptions = options}

    // Prop-backed convenience getters
    get asyncMode() {return !!this.props.queryFn}
    get creatableMode() {return !!this.props.enableCreate}
    get multiMode() {return !!this.props.enableMulti}
    get filterMode() {return withDefault(this.props.enableFilter, true)}

    // Managed value for underlying text input under certain conditions
    // This is a workaround for rs-select issue described in hoist-react #880
    @observable inputValue = null;
    get manageInputValue() {
        return this.filterMode && !this.multiMode;
    }

    // Custom local option filtering to leverage default filter fn w/change to show all options if
    // input has not been changed since last select (i.e. user has not typed).
    // Applied only when manageInputValue if true.
    _inputChangedSinceSelect = false;
    _defaultLocalFilterFn = createFilter();
    _localFilterFn = (opt, inputVal) => {
        return !this.inputValue || !this._inputChangedSinceSelect || this._defaultLocalFilterFn(opt, inputVal);
    };

    constructor(props) {
        super(props);

        const queryBuffer = withDefault(props.queryBuffer, 300);
        if (queryBuffer) this.doQueryAsync = debouncePromise(this.doQueryAsync, queryBuffer);

        this.addReaction({
            track: () => this.props.options,
            run: (opts) => {
                opts = this.normalizeOptions(opts);
                this.setInternalOptions(opts);
            },
            fireImmediately: true
        });
    }

    reactSelectRef = React.createRef();

    render() {
        const props = this.getNonLayoutProps(),
            {width, ...layoutProps} = this.getLayoutProps(),
            rsProps = {
                value: this.renderValue,

                autoFocus: props.autoFocus,
                formatOptionLabel: this.formatOptionLabel,
                isDisabled: props.disabled,
                isMulti: props.enableMulti,
                // Explicit false ensures consistent default for single and multi-value instances.
                isClearable: withDefault(props.enableClear, false),
                menuPlacement: withDefault(props.menuPlacement, 'auto'),
                noOptionsMessage: this.noOptionsMessageFn,
                openMenuOnFocus: props.openMenuOnFocus,
                placeholder: withDefault(props.placeholder, 'Select...'),
                tabIndex: props.tabIndex,

                // A shared div is created lazily here as needed, appended to the body, and assigned
                // a high z-index to ensure options menus render over dialogs or other modals.
                menuPortalTarget: this.getOrCreatePortalDiv(),

                inputId: props.id,
                classNamePrefix: 'xh-select',
                theme: this.getThemeConfig(),

                onBlur: this.onBlur,
                onChange: this.onSelectChange,
                onFocus: this.onFocus,

                ref: this.reactSelectRef
            };

        if (this.manageInputValue) {
            rsProps.inputValue = this.inputValue || '';
            rsProps.onInputChange = this.onInputChange;
            rsProps.filterOption = this._localFilterFn;
        }

        if (this.asyncMode) {
            rsProps.loadOptions = this.doQueryAsync;
            rsProps.loadingMessage = this.loadingMessageFn;
            if (this.renderValue) rsProps.defaultOptions = [this.renderValue];
        } else {
            rsProps.options = this.internalOptions;
            rsProps.isSearchable = this.filterMode;
        }

        if (this.creatableMode) {
            rsProps.formatCreateLabel = this.createMessageFn;
        }

        const factory = this.asyncMode ?
            (this.creatableMode ? reactAsyncCreatableSelect : reactAsyncSelect) :
            (this.creatableMode ? reactCreatableSelect : reactSelect);

        assign(rsProps, props.rsOptions);
        return box({
            item: factory(rsProps),
            className: this.getClassName(),
            onKeyDown: (e) => {
                // Esc. and Enter can be listened for by parents -- stop the keydown event
                // propagation only if react-select already likely to have used for menu management.
                const {menuIsOpen} = this.reactSelectRef.current ? this.reactSelectRef.current.state : {};
                if (menuIsOpen && (e.key == 'Escape' || e.key == 'Enter')) {
                    e.stopPropagation();
                }
            },
            ...layoutProps,
            width: withDefault(width, 200)
        });
    }

    @action
    onSelectChange = (opt) => {
        if (this.manageInputValue) {
            this.inputValue = opt ? opt.label : null;
            this._inputChangedSinceSelect = false;
        }
        this.noteValueChange(opt);
    };

    //-------------------------
    // Text input handling
    //-------------------------
    @action
    onInputChange = (value, {action}) => {
        if (this.manageInputValue) {
            if (action == 'input-change') {
                this.inputValue = value;
                this._inputChangedSinceSelect = true;
                if (!value) this.noteValueChange(null);
            } else if (action == 'input-blur') {
                this.inputValue = null;
                this._inputChangedSinceSelect = false;
            }
        }
    };

    @action
    noteFocused() {
        if (this.manageInputValue) {
            const {renderValue} = this;
            this.inputValue = renderValue ? renderValue.label : null;
        }
        if (this.props.selectOnFocus) {
            wait(1).then(() => {
                // Delay to allow re-render. For safety, only select if still focused!
                const rsRef = this.reactSelectRef.current;
                if (!rsRef) return;

                // Use of creatable and async variants will create another level of nesting we must
                // traverse to get to the underlying Select comp and its inputRef.
                const refComp = rsRef.select,
                    selectComp = refComp.constructor.name == 'Select' ? refComp : refComp.select,
                    inputElem = selectComp.inputRef;

                if (this.hasFocus && inputElem && document.activeElement == inputElem) {
                    inputElem.select();
                }
            });
        }
        super.noteFocused();
    }

    //-------------------------
    // Options / value handling
    //-------------------------

    // Convert external value into option object(s). Options created if missing - this takes the
    // external value from the model, and we will respect that even if we don't know about it.
    // (Exception for a null value, which we will only accept if explicitly present in options.)
    toInternal(external) {
        if (this.multiMode) {
            if (external == null) external = [];  // avoid [null]
            return castArray(external).map(it => this.findOption(it, !isNil(it)));
        }

        return this.findOption(external, !isNil(external));
    }

    findOption(val, createIfNotFound) {
        const valAsOption = this.toOption(val),
            match = find(this.internalOptions, {value: valAsOption.value});

        return match ? match : (createIfNotFound ? valAsOption : null);
    }

    toExternal(internal) {
        if (isNil(internal)) return null;

        if (this.multiMode) {
            if (isEmpty(internal)) return null;
            return castArray(internal).map(it => it.value);
        }

        return internal.value;
    }

    normalizeOptions(options) {
        options = options || [];
        return options.map(it => this.toOption(it));
    }

    // Normalize / clone a single source value into a normalized option object. Supports Strings
    // and Objects. Objects are validated/defaulted to ensure a label+value, with other fields
    // brought along to support Selects emitting value objects with ad hoc properties.
    toOption(src) {
        const {props} = this,
            srcIsObject = isPlainObject(src),
            labelField = withDefault(props.labelField, 'label'),
            valueField = withDefault(props.valueField, 'value');

        throwIf(
            srcIsObject && !src.hasOwnProperty(valueField),
            `Select options/values provided as Objects must define a '${valueField}' property.`
        );

        return srcIsObject ?
            {...src, label: withDefault(src[labelField], src[valueField]), value: src[valueField]} :
            {label: src != null ? src.toString() : '-null-', value: src};
    }

    //------------------------
    // Async
    //------------------------
    doQueryAsync = (query) => {
        return this.props
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
                    if (!matchOpt) newOpts.push(currOpt);  // avoiding dupes
                });

                this.setInternalOptions(newOpts);

                // But only return the matching options back to the combo.
                return matchOpts;
            });
    };

    loadingMessageFn = (params) => {
        const {loadingMessageFn} = this.props,
            q = params.inputValue;

        return loadingMessageFn ? loadingMessageFn(q) : 'Loading...';
    };


    //----------------------
    // Option Rendering
    //----------------------
    formatOptionLabel = (opt, params) => {
        // Always display the standard label string in the value container (context == 'value').
        // If we need to expose customization here, we could consider a dedicated prop.
        if (params.context != 'menu') {
            return opt.label;
        }

        // For rendering dropdown menu items, use an optionRenderer if provided - or use the
        // implementation here to render a checkmark next to the active selection.
        const optionRenderer = this.props.optionRenderer || this.optionRenderer;
        return optionRenderer(opt);
    };

    optionRenderer = (opt) => {
        if (this.suppressCheck) {
            return div({item: opt.label, style: {paddingLeft: 8}});
        }

        return this.externalValue === opt.value ?
            hbox(
                div({
                    style: {minWidth: 25, textAlign: 'center'},
                    item: Icon.check({size: 'sm'})
                }),
                span(opt.label)
            ) :
            div({item: opt.label, style: {paddingLeft: 25}});
    };

    get suppressCheck() {
        const {props} = this;
        return withDefault(props.hideSelectedOptionCheck, props.enableMulti);
    }

    //------------------------
    // Other Implementation
    //------------------------
    getThemeConfig() {
        return (base) => {
            return {
                ...base,
                spacing: {...base.spacing, menuGutter: 3},
                borderRadius: 3
            };
        };
    }

    noOptionsMessageFn = (params) => {
        const {noOptionsMessageFn} = this.props,
            q = params.inputValue;

        if (noOptionsMessageFn) return noOptionsMessageFn(q);
        if (q) return 'No matches found.';
        return this.asyncMode ? 'Type to search...' : '';
    };

    createMessageFn = (q) => {
        const {createMessageFn} = this.props;
        return createMessageFn ? createMessageFn(q) : `Create "${q}"`;
    };

    getOrCreatePortalDiv() {
        let portal = document.getElementById('xh-select-input-portal');

        if (!portal) {
            portal = document.createElement('div');
            portal.id = Select.MENU_PORTAL_ID;
            document.body.appendChild(portal);
        }

        return portal;
    }

}
export const select = elemFactory(Select);