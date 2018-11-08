/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {HoistComponent, elemFactory, LayoutSupport} from '@xh/hoist/core';
import {castArray, isEmpty, isPlainObject, keyBy, find, assign} from 'lodash';
import {observable, action} from '@xh/hoist/mobx';
import {box} from '@xh/hoist/cmp/layout';
import {HoistInput} from '@xh/hoist/cmp/form';
import {withDefault, throwIf} from '@xh/hoist/utils/js';
import {
    reactSelect,
    reactCreatableSelect,
    reactAsyncSelect,
    reactAsyncCreatableSelect
} from '@xh/hoist/kit/react-select';

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

        /** True to accept and commit input values not present in options or returned by a query. */
        enableCreate: PT.bool,

        /**
         * True (default) to enable type-to-search keyboard input. False to disable keyboard input,
         * showing the dropdown menu on click.
         */
        enableFilter: PT.bool,

        /** True to allow entry/selection of multiple values - "tag picker" style. */
        enableMulti: PT.bool,

        /** Field on provided options for sourcing each option's display text (default `value`). */
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
         * Preset list of options for selection. Objects must contain a `value` property; a `label`
         * property will be used for the default display of each option. Other types will be taken
         * as their value directly and displayed via toString().  See also `queryFn` to  supply
         * options via an async query (i.e. from the server) instead of up-front in this prop.
         */
        options: PT.array,

        /**
         * Function to render options in the dropdown list. Called for each option object (which
         * will contain at minimum a value and label field, as well as any other fields present in
         * the source objects). Returns a React.node.
         */
        optionRenderer: PT.func,

        /** Text to display when control is empty. */
        placeholder: PT.string,

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

        /** Field on provided options for sourcing each option's value (default `value`). */
        valueField: PT.string

    };

    baseClassName = 'xh-select';

    // Normalized collection of selectable options. Passed directly to synchronous select.
    // Maintained for (but not passed to) async select to resolve value string <> option objects.
    @observable.ref internalOptions = [];
    @action setInternalOptions(options) {this.internalOptions = options}

    // Prop flags that switch core behavior.
    get asyncMode() {return !!this.props.queryFn}
    get creatableMode() {return !!this.props.enableCreate}
    get multiMode() {return !!this.props.enableMulti}

    constructor(props) {
        super(props);
        this.addReaction({
            track: () => this.props.options,
            run: (opts) => {
                opts = this.normalizeOptions(opts);
                this.setInternalOptions(opts);
            },
            fireImmediately: true
        });
    }

    render() {
        const {props, renderValue} = this,
            rsProps = {
                value: renderValue,

                autoFocus: props.autoFocus,
                formatOptionLabel: this.formatOptionLabel,
                isDisabled: props.disabled,
                isMulti: props.enableMulti,
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
                onFocus: this.onFocus
            };

        if (this.asyncMode) {
            rsProps.loadOptions = this.doQueryAsync;
            rsProps.loadingMessage = this.loadingMessageFn;
        } else {
            rsProps.options = this.internalOptions;
            rsProps.isSearchable = withDefault(props.enableFilter, true);
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
            width: props.width,
            onKeyDown: (e) => {
                // Esc. can be used within the select to clear value / dismiss dropdown menu.
                // Catch in this wrapper box - specifically to avoid dismissing dialogs.
                if (e.key == 'Escape') e.stopPropagation();
            },
            ...this.getLayoutProps()
        });
    }


    //-------------------------
    // Options / value handling
    //-------------------------
    onSelectChange = (opt) => {
        this.noteValueChange(opt);
    }

    // Convert external value into option object(s). Options created if missing - this takes the
    // external value from the model, and we will respect that even if we don't know about it.
    // (Exception for a null value, which we will only accept if explicitly present in options.)
    toInternal(external) {
        if (this.multiMode) {
            if (external == null) external = [];  // avoid [null]
            return castArray(external).map(it => this.findOption(it, !isEmpty(it)));
        }

        return this.findOption(external, !isEmpty(external));
    }

    findOption(val, createIfNotFound) {
        const valAsOption = this.toOption(val),
            match = find(this.internalOptions, {value: valAsOption.value});

        return match ? match : (createIfNotFound ? valAsOption : null);
    }

    toExternal(internal) {
        return this.multiMode ?
            castArray(internal).map(it => it.value) :
            isEmpty(internal) ? null : internal.value;
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
    }

    loadingMessageFn = (params) => {
        const {loadingMessageFn} = this.props,
            q = params.inputValue;

        return loadingMessageFn ? loadingMessageFn(q) : 'Loading...';
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

    formatOptionLabel = (opt, params) => {
        const {optionRenderer} = this.props;

        // Always display the standard label string in the value container (context == 'value').
        // If we need to expose customization here, we could consider a dedicated prop.
        return (optionRenderer && params.context == 'menu') ? optionRenderer(opt) : opt.label;
    }

    noOptionsMessageFn = (params) => {
        const {noOptionsMessageFn} = this.props,
            q = params.inputValue;

        if (noOptionsMessageFn) return noOptionsMessageFn(q);
        if (q) return 'No matches found.';
        return this.asyncMode ? 'Type to search...' : '';
    }

    createMessageFn = (q) => {
        const {createMessageFn} = this.props;
        return createMessageFn ? createMessageFn(q) : `Create "${q}"`;
    }

    getOrCreatePortalDiv() {
        let portal = document.getElementById('xh-select-input-portal');

        if (!portal) {
            portal = document.createElement('div');
            portal.id = 'xh-select-input-portal';
            document.body.appendChild(portal);
        }

        return portal;
    }

}
export const select = elemFactory(Select);