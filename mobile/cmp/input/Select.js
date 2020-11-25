/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputPropTypes, useHoistInputModel} from '@xh/hoist/cmp/input';
import {box, div, hbox, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {reactSelect, reactCreatableSelect} from '@xh/hoist/kit/react-select';
import {action, observable} from '@xh/hoist/mobx';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import {assign, isEmpty, isPlainObject} from 'lodash';
import PT from 'prop-types';
import './Select.scss';

/**
 * A managed wrapper around the React-Select dropdown component.
 *
 * This is simplified version of the desktop Select Input.
 * Asynchronous queries and multiple selection are not supported.
 *
 * Supports custom dropdown option renderers.
 *
 * @see {@link https://react-select.com|React Select Docs}
 */
export const [Select, select] = hoistCmp.withFactory({
    displayName: 'Select',
    className: 'xh-select',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, Model);
    }
});
Select.propTypes = {
    ...HoistInputPropTypes,
    /**
     * Function to return a "create a new option" string prompt. Requires `allowCreate` true.
     * Passed current query input.
     */
    createMessageFn: PT.func,

    /**
     *  True to accept and commit input values not present in options or returned by a query.
     *  Should be used with caution, as mobile keyboard can cause undesirable results.
     * */
    enableCreate: PT.bool,

    /**
     * True to enable type-to-search keyboard input. Defaults to false to disable keyboard input,
     * showing the dropdown menu on click. Should be used with caution, as mobile keyboard can
     * cause undesirable results.
     */
    enableFilter: PT.bool,

    /**
     * Function called to filter available options for a given query string input.
     * Used for filtering of options provided by `options` prop when `enableFilter` is true.
     *
     * Provided function should take an option and a query value and return a boolean.
     * Defaults to a case-insensitive match on word starts.
     */
    filterFn: PT.func,

    /** True to hide the dropdown indicator, i.e. the down-facing arrow at the right of the Select. */
    hideDropdownIndicator: PT.bool,

    /** Field on provided options for sourcing each option's display text (default `label`). */
    labelField: PT.string,

    /** Placement of the dropdown menu relative to the input control. */
    menuPlacement: PT.oneOf(['auto', 'top', 'bottom']),

    /** Width in pixels for the dropdown menu - if unspecified, defaults to control width. */
    menuWidth: PT.number,

    /** Function to return message indicating no options loaded. */
    noOptionsMessageFn: PT.func,

    /**
     * Preset list of options for selection. Elements can be either a primitive or an object.
     * Primitives will be displayed via toString().
     * Objects must have either:
     *      + A `label` property for display and a `value` property
     *      + A `label` property and an `options` property containing an array of sub-options
     *        to be grouped beneath the option.
     *        These sub-options must be either primitives or `label`:`value` pairs: deeper nesting is unsupported.
     *
     * See also `queryFn` to  supply options via an async query (i.e. from the server) instead
     * of up-front in this prop.
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
Select.MENU_PORTAL_ID = 'xh-select-input-portal';
Select.hasLayoutSupport = true;

//-----------------------
// Implementation
//-----------------------
class Model extends HoistInputModel {

    // Normalized collection of selectable options. Passed directly to synchronous select.
    @observable.ref internalOptions = [];
    @action setInternalOptions(options) {this.internalOptions = options}

    get creatableMode() {return !!this.props.enableCreate}
    get filterMode() {return !!this.props.enableFilter}

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

    //-------------------------
    // Options / value handling
    //-------------------------
    filterOption = (opt, inputVal) => {
        // 1) Use function provided by app
        const {filterFn} = this.props;
        if (filterFn) {
            return filterFn(opt, inputVal);
        }

        // 2) ..or use default word start search
        if (!inputVal) return true;
        if (!opt.label) return false;
        const regex = new RegExp(`(^|\\W)${inputVal}`, 'i');
        return regex.test(opt.label);
    };

    onSelectChange = (opt) => {
        this.noteValueChange(opt);
    };

    // Convert external value into option object(s). Options created if missing - this takes the
    // external value from the model, and we will respect that even if we don't know about it.
    // (Exception for a null value, which we will only accept if explicitly present in options.)
    toInternal(external) {
        return this.findOption(external, !isEmpty(external));
    }

    findOption(value, createIfNotFound, options = this.internalOptions) {

        // Do a depth-first search of options
        for (const option of options) {
            if (option.options) {
                const ret = this.findOption(value, false, option.options);
                if (ret) return ret;
            } else {
                if (option.value === value) return option;
            }
        }

        return createIfNotFound ? this.valueToOption(value) : null;
    }

    toExternal(internal) {
        return isEmpty(internal) ? null : internal.value;
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
        return isPlainObject(src) ?
            this.objectToOption(src, depth) :
            this.valueToOption(src);
    }

    objectToOption(src, depth) {
        const {props} = this,
            labelField = withDefault(props.labelField, 'label'),
            valueField = withDefault(props.valueField, 'value');

        throwIf(
            !src.hasOwnProperty(valueField) && !src.hasOwnProperty('options'),
            `Select options provided as Objects must define a '${valueField}' property or a sublist of options.`
        );

        return src.hasOwnProperty('options') ?
            {...src, label: src[labelField], options: this.normalizeOptions(src.options, depth + 1)} :
            {...src, label: withDefault(src[labelField], src[valueField]), value: src[valueField]};
    }

    valueToOption(src) {
        return {label: src != null ? src.toString() : '-null-', value: src};
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
    };

    optionRenderer = (opt) => {
        if (this.suppressCheck) {
            return div(opt.label);
        }

        return this.externalValue === opt.value ?
            hbox({
                items: [
                    div({
                        style: {minWidth: 25, textAlign: 'center'},
                        item: Icon.check({size: 'sm'})
                    }),
                    span(opt.label)
                ],
                paddingLeft: 0
            }) :
            div({item: opt.label, style: {paddingLeft: 25}});
    };

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

    createMessageFn = (q) => {
        const {createMessageFn} = this.props;
        return createMessageFn ? createMessageFn(q) : `Create "${q}"`;
    };
}

const cmp = hoistCmp.factory(
    ({model, className, ...props}, ref) => {
        const {width, ...layoutProps} = getLayoutProps(props),
            rsProps = {
                options: model.internalOptions,
                value: model.renderValue,

                formatOptionLabel: model.formatOptionLabel,
                isSearchable: model.filterMode || model.creatableMode,
                isDisabled: props.disabled,
                menuPlacement: withDefault(props.menuPlacement, 'auto'),
                noOptionsMessage: model.noOptionsMessageFn,
                placeholder: withDefault(props.placeholder, 'Select...'),
                tabIndex: props.tabIndex,
                menuShouldBlockScroll: XH.isMobileApp,

                // A shared div is created lazily here as needed, appended to the body, and assigned
                // a high z-index to ensure options menus render over dialogs or other modals.
                menuPortalTarget: model.getOrCreatePortalDiv(),

                inputId: props.id,
                classNamePrefix: 'xh-select',
                theme: model.getThemeConfig(),

                onBlur: model.onBlur,
                onChange: model.onSelectChange,
                onFocus: model.onFocus,
                filterOption: model.filterOption

            };

        if (props.hideDropdownIndicator) {
            rsProps.components = {
                ...rsProps.components,
                DropdownIndicator: () => null,
                IndicatorSeparator: () => null
            };
        }

        if (props.menuWidth) {
            rsProps.styles = {
                menu: (provided) => ({...provided, width: `${props.menuWidth}px`}),
                ...props.rsOptions?.styles
            };
        }

        assign(rsProps, props.rsOptions);

        if (model.creatableMode) {
            rsProps.formatCreateLabel = model.createMessageFn;
        }

        const factory = model.creatableMode ? reactCreatableSelect : reactSelect;

        return box({
            item: factory(rsProps),
            className,
            ...layoutProps,
            width: withDefault(width, null),
            ref
        });
    }
);
