/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {find, isObject, startsWith} from 'lodash';
import {observable, bindable, settable, action} from '@xh/hoist/mobx';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {Classes, suggest} from '@xh/hoist/kit/blueprint';
import {menuItem} from '@xh/hoist/kit/blueprint';
import {HoistInput} from '@xh/hoist/cmp/form';
import {withDefault, throwIf} from '@xh/hoist/utils/js';
import {wait} from '@xh/hoist/promise';

/**
 * Control to select from a list of options. Renders as a text input with a popup list, with support
 * for querying (implemented as an async promise function to enable both local and remote queries)
 * as well as ad-hoc user entries.
 */
@HoistComponent
export class ComboBox extends HoistInput {
    
    static propTypes = {
        ...HoistInput.propTypes,

        /** True to commit on every change/keystroke, default false. */
        commitOnChange: PT.bool,

        /** Custom renderer text displayed within the input control, passed the selected item. */
        inputValueRenderer: PT.func,

        /** Icon to display inline on the left side of the input. */
        leftIcon: PT.element,

        /**
         * Custom renderer for each option within the popup list. Should return a BP menuItem.
         *
         * See defaultOptionRenderer on this class for API / requirements. Note that menuItem.text
         * takes a React node, and along with the multiline prop, can be used to render rich
         * list option templates.
         */
        optionRenderer: PT.func,

        /** Collection of form [{value: string, label: string}, ...] or [val, val, ...] */
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string])),

        /** Text to display when control is empty. */
        placeholder: PT.string,

        /** True (default) accepts only values from options; false allows arbitrary text input. */
        requireSelection: PT.bool,

        /** Element to display inline on the right side of the input. */
        rightElement: PT.element,

        /** Delay (in ms) used to buffer calls to the queryFn (default 100) */
        queryBuffer: PT.number,

        /**
         * Function called when the input value of the control changes to repopulate the available
         * options. Should return a Promise resolving to a new list of options in the same format.
         */
        queryFn: PT.func,

        /** Width of the control in pixels. */
        width: PT.number
    };

    baseClassName = 'xh-combo-box';

    @bindable internalQueryValue;
    @settable @observable.ref selectedItem = null;
    @observable.ref internalOptions = [];

    constructor(props) {
        super(props);
        this.addReaction(this.queryOptionsReaction());
        this.addReaction(this.normalizeOptionsReaction());
        this.addReaction(this.selectedItemReaction());
        // throwIf(
        //     props.queryFn && this.requireSelection,
        //     'ComboBox with queryFn not yet implemented with selectionRequired.'
        // );
    }

    get commitOnChange() {
        return withDefault(this.props.commitOnChange, false);
    }

    get requireSelection() {
        return withDefault(this.props.requireSelection, true);
    }

    render() {
        const {props, internalOptions} = this;

        return suggest({
            $items: internalOptions,

            inputProps: {
                autoComplete: 'nope',
                leftIcon: props.leftIcon,
                placeholder: withDefault(props.placeholder, 'Select'),
                rightElement: props.rightElement,

                style: {
                    ...props.style,
                    width: props.width
                },

                onBlur: this.onBlur,
                onFocus: this.onFocus,
                onKeyPress: this.onKeyPress,
            },

            inputValueRenderer: withDefault(props.inputValueRenderer, this.defaultInputValueRenderer),
            itemPredicate: (q, item) => {
                return !q || startsWith(item.label.toLowerCase(), q.toLowerCase());
            },
            itemRenderer: withDefault(props.optionRenderer, this.defaultOptionRenderer),
            openOnKeyDown: true,
            popoverProps: {popoverClassName: Classes.MINIMAL},

            disabled: props.disabled,
            selectedItem: this.selectedItem,

            className: this.getClassName(),

            onItemSelect: this.onItemSelect,
            onQueryChange: this.onQueryChange
        });
    }

    @action
    normalizeOptions(options) {
        options = withDefault(options, []);
        options = options.map(o => {
            const ret = isObject(o) ?
                // Spread additional object properties to opt to make available to optionRenderer.
                {label: o.label, value: o.value, ...o} :
                {label: o != null ? o.toString() : '-null-', value: o};

            ret.value = this.toInternal(ret.value);
            return ret;
        });

        this.internalOptions = options;
    }

    defaultInputValueRenderer = (option) => {
        return option.label;
    }

    defaultOptionRenderer = (option, optionProps) => {
        return menuItem({
            key: option.value,
            text: option.label,
            onClick: optionProps.handleClick,
            active: optionProps.modifiers.active
        });
    }

    onItemSelect = (item) => {
        this.noteValueChange(item.value);
    }

    onQueryChange = (val) => {
        this.setInternalQueryValue(val);
        if (!this.requireSelection || !val) {
            this.noteValueChange(val || null);
        }
    }

    onKeyPress = (ev) => {
        if (ev.key === 'Enter') {
            wait(1).then(() => this.doCommit());
        }
    }

    //------------------------
    // Reactions
    //------------------------
    normalizeOptionsReaction() {
        return {
            track: () => this.props.options,
            run: this.normalizeOptions,
            fireImmediately: true
        };
    }

    queryOptionsReaction() {
        return {
            track: () => [this.props.queryFn, this.internalQueryValue],
            run: ([queryFn, value]) => {
                if (queryFn) {
                    queryFn(value).then(options => this.normalizeOptions(options));
                }
            },
            delay: this.props.queryBuffer || 100,
            fireImmediately: true
        };
    }

    selectedItemReaction() {
        return {
            track: () => [this.internalOptions, this.renderValue],
            run: ([options, value]) => {
                let match = find(options, {value}) || null;
                if (!match && value != null) {
                    match = {value, label: value};
                }
                this.setSelectedItem(match);
            },
            fireImmediately: true
        };
    }
}
export const comboBox = elemFactory(ComboBox);