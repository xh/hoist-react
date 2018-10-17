/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {find, isObject, startsWith} from 'lodash';
import {observable, settable, action} from '@xh/hoist/mobx';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {Classes, suggest} from '@xh/hoist/kit/blueprint';
import {menuItem} from '@xh/hoist/kit/blueprint';
import {HoistInput} from '@xh/hoist/cmp/form';
import {withDefault, throwIf} from '@xh/hoist/utils/js';
import {wait} from '@xh/hoist/promise';

/**
 * ComboBox - An input with type ahead suggest and menu select
 */
@HoistComponent
export class ComboBox extends HoistInput {
    
    static propTypes = {
        ...HoistInput.propTypes,

        /** true to commit on every key stroke, defaults false */
        commitOnChange: PT.bool,
        /** Text to display when control is empty */
        placeholder: PT.string,
        /** Collection of form [{value: string, label: string}, ...] or [val, val, ...] */
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string])),
        /** Optional custom optionRenderer, a function that receives (option, optionProps) */
        optionRenderer: PT.func,
        /** Whether to force values from given options. Set to true to disallow arbitrary input */
        requireSelection: PT.bool,
        /** Icon to display on the left side of the control */
        leftIcon: PT.element,
        /** Element to display on the right side of the field */
        rightElement: PT.element,

        /**
         * Function to be run when value of control changes to repopulate the available items.
         * Should return a promise resolving to a collection of form:
         *      [{value: string, label: string}, ...]
         * or
         *      [val, val, ...]
         */
        queryFn: PT.func,
        /** Delay (in ms) used to buffer calls to the queryFn (default 100) */
        queryBuffer: PT.number
    };

    baseClassName = 'xh-combo-box';

    @settable @observable.ref selectedItem = null;
    @observable.ref internalOptions = [];

    constructor(props) {
        super(props);
        this.addReaction(this.queryOptionsReaction());
        this.addReaction(this.normalizeOptionsReaction());
        this.addReaction(this.selectedItemReaction());
        throwIf(
            props.queryFn && props.selectionRequired,
            'ComboBox with queryFn not yet implemented with selectionRequired.'
        );
    }

    get commitOnChange() {
        return withDefault(this.props.commitOnChange, false);
    }

    render() {
        const {props, internalOptions} = this,
            placeholder = withDefault(props.placeholder, 'Select');

        return suggest({
            className: this.getClassName(),
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: internalOptions,
            onItemSelect: this.onItemSelect,
            selectedItem: this.selectedItem,
            itemPredicate: (q, item) => {
                return !q || startsWith(item.label.toLowerCase(), q.toLowerCase());
            },
            itemRenderer: this.itemRenderer,
            openOnKeyDown: true,
            inputValueRenderer: (item) => item.label,
            onQueryChange: this.onQueryChange,
            inputProps: {
                onKeyPress: this.onKeyPress,
                onBlur: this.onBlur,
                onFocus: this.onFocus,
                autoComplete: 'nope',
                style: {...props.style, width: props.width},
                leftIcon: props.leftIcon,
                placeholder: placeholder,
                rightElement: props.rightElement
            },
            disabled: props.disabled
        });
    }

    //-----------------------------------------------------------
    // Common handling of options, rendering of selected option
    //-----------------------------------------------------------
    @action
    normalizeOptions(options) {
        options = withDefault(options, []);
        options = options.map(o => {
            const ret = isObject(o) ?
                {label: o.label, value: o.value} :
                {label: o != null ? o.toString() : '-null-', value: o};

            ret.value = this.toInternal(ret.value);
            return ret;
        });

        this.internalOptions = options;
    }


    //--------------------------------
    // Event handlers, callbacks
    //--------------------------------
    itemRenderer = (option, optionProps) => {
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
        if (!this.props.requireSelection) {
            this.noteValueChange(val);
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
            track: () => [this.props.queryFn, this.internalValue],
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