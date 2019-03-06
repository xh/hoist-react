/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {HoistComponent, elemFactory, LayoutSupport} from '@xh/hoist/core';
import {isEmpty, isPlainObject, find, assign} from 'lodash';
import {observable, action} from '@xh/hoist/mobx';
import {box, div, hbox, span} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import {HoistInput} from '@xh/hoist/cmp/input';
import {withDefault, throwIf} from '@xh/hoist/utils/js';
import {reactSelect} from '@xh/hoist/kit/react-select';

import './Select.scss';

/**
 * A managed wrapper around the React-Select dropdown component.
 *
 * This is simplified version of the desktop Select Input. Type-to-search has been excluded, due to concerns
 * about showing the on-device keyboard. Consequently, asynchronous queries, multiple selection and user-created
 * ad-hoc entries are not yet supported.
 *
 * Supports custom dropdown option renderers.
 *
 * @see {@link https://react-select.com|React Select Docs}
 */
@LayoutSupport
@HoistComponent
export class Select extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,

        /** Field on provided options for sourcing each option's display text (default `label`). */
        labelField: PT.string,

        /** Placement of the dropdown menu relative to the input control. */
        menuPlacement: PT.oneOf(['auto', 'top', 'bottom']),

        /** Function to return message indicating no options loaded. */
        noOptionsMessageFn: PT.func,

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

        /** True to suppress the default check icon rendered for the currently selected option. */
        hideSelectedOptionCheck: PT.bool,

        /** Text to display when control is empty. */
        placeholder: PT.string,

        /**
         * Escape-hatch props passed directly to react-select. Use with care - not all props
         * in the react-select API are guaranteed to be supported by this Hoist component,
         * and providing them directly can interfere with the implementation of this class.
         */
        rsOptions: PT.object,

        /** Field on provided options for sourcing each option's value (default `value`). */
        valueField: PT.string
    };

    static MENU_PORTAL_ID = 'xh-select-input-portal';

    baseClassName = 'xh-select';

    // Normalized collection of selectable options. Passed directly to synchronous select.
    // Maintained for (but not passed to) async select to resolve value string <> option objects.
    @observable.ref internalOptions = [];
    @action setInternalOptions(options) {this.internalOptions = options}

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
        const props = this.getNonLayoutProps(),
            {width, ...layoutProps} = this.getLayoutProps(),
            rsProps = {
                options: this.internalOptions,
                value: this.renderValue,

                formatOptionLabel: this.formatOptionLabel,
                isSearchable: false,
                isDisabled: props.disabled,
                menuPlacement: withDefault(props.menuPlacement, 'auto'),
                noOptionsMessage: this.noOptionsMessageFn,
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

        assign(rsProps, props.rsOptions);

        return box({
            item: reactSelect(rsProps),
            className: this.getClassName(),
            ...layoutProps,
            width: withDefault(width, null)
        });
    }


    //-------------------------
    // Options / value handling
    //-------------------------
    onSelectChange = (opt) => {
        this.noteValueChange(opt);
    };

    // Convert external value into option object(s). Options created if missing - this takes the
    // external value from the model, and we will respect that even if we don't know about it.
    // (Exception for a null value, which we will only accept if explicitly present in options.)
    toInternal(external) {
        return this.findOption(external, !isEmpty(external));
    }

    findOption(val, createIfNotFound) {
        const valAsOption = this.toOption(val),
            match = find(this.internalOptions, {value: valAsOption.value});

        return match ? match : (createIfNotFound ? valAsOption : null);
    }

    toExternal(internal) {
        return isEmpty(internal) ? null : internal.value;
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
    }

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
    }

    get suppressCheck() {
        const {props} = this;
        return withDefault(props.hideSelectedOptionCheck, false);
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

    noOptionsMessageFn = () => {
        const {noOptionsMessageFn} = this.props;
        if (noOptionsMessageFn) return noOptionsMessageFn();
        return 'No options found.';
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