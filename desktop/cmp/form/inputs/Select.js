/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {find, isObject} from 'lodash';
import {Classes, select as bpSelect} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {menuItem} from '@xh/hoist/kit/blueprint';
import {observable, action} from '@xh/hoist/mobx';
import {HoistInput} from '@xh/hoist/cmp/form';
import {withDefault} from '@xh/hoist/utils/js';
import {Ref} from '@xh/hoist/utils/react';

import './Select.scss';

/**
 * Control to select from a list of preset options. Renders as a button that triggers a popup list.
 *
 * Best for lists of a limited size. See ComboBox if keyboard entry, querying, and/or user-supplied
 * ad hoc values are required.
 */
@HoistComponent
export class Select extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,

        /** Collection of form [{value: string, label: string}, ...] or [val, val, ...] */
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string, PT.bool])),

        /** Button text when no value is set. */
        placeholder: PT.string,

        /** Button icon. */
        icon: PT.element,

        /**
         * Custom renderer for a list item entry. Should return a BP menuItem.
         *
         * See defaultItemRenderer on this class for core requirements. Note that menuItem.text
         * takes a React node and along with the multiline prop can be used for more detailed
         * list option displays.
         */
        itemRenderer: PT.func
    };

    baseClassName = 'xh-select';

    selectRef = new Ref();
    popoverRef = new Ref();
    @observable.ref activeItem
    @observable.ref internalOptions = [];

    constructor(props) {
        super(props);
        this.addAutorun(() => this.normalizeOptions(this.props.options));
        this.addAutorun(() => {
            const match = find(this.internalOptions, {value: this.renderValue});
            this.setActiveItem(match || null);
        });
    }

    render() {
        const {props, renderValue, internalOptions} = this,
            placeholder = withDefault(props.placeholder, 'Select');

        return bpSelect({
            $items: internalOptions,
            item: button({
                autoFocus: props.autoFocus,
                disabled: props.disabled,
                icon: props.icon,
                rightIcon: 'caret-down',
                tabIndex: props.tabIndex,
                text: this.getDisplayValue(renderValue, internalOptions, placeholder),

                style: {
                    ...props.style,
                    width: props.width
                },

                onBlur: this.onBlur,
                onFocus: this.onFocus
            }),

            activeItem: this.activeItem,
            disabled: props.disabled,
            filterable: false,
            itemRenderer: withDefault(props.itemRenderer, this.defaultItemRenderer),
            popoverProps: {
                popoverClassName: Classes.MINIMAL,
                popoverRef: this.popoverRef.ref
            },
            ref: this.selectRef.ref,

            className: this.getClassName(),

            onActiveItemChange: (it) => this.onSelectActiveItemChange(it),
            onItemSelect: this.onItemSelect
        });
    }

    @action
    normalizeOptions(options) {
        options = withDefault(options, []);
        this.internalOptions = options.map(o => {
            const ret = isObject(o) ?
                // Spread additional object props to internal opt to make available to itemRenderer.
                {label: o.label, value: o.value, ...o} :
                {label: o != null ? o.toString() : '-null-', value: o};

            ret.value = this.toInternal(ret.value);
            return ret;
        });
    }

    getDisplayValue(value, items, placeholder) {
        const match = find(items, {value});

        if (match) return match.label;
        return (value == null) ? placeholder : value.toString();
    }

    noteBlurred() {
        super.noteBlurred();
        this.forcePopoverClose();
    }

    forcePopoverClose() {
        const select = this.selectRef.value;
        if (select) select.setState({isOpen: false});
    }

    @action
    setActiveItem(v) {
        this.activeItem = v;
    }

    // This handler will get called as the user navigates in the list, and we need to ensure we
    // accept those changes so the list UI will updates. However it will also be called after
    // the popover closes with the first item in the list, regardless of the component value.
    // We want to skip this last call to let our autorun leave it at the desired selection.
    onSelectActiveItemChange = (v) => {
        const select = this.selectRef.value;
        if (select && select.state.isOpen) {
            this.setActiveItem(v);
        }
    }

    defaultItemRenderer = (option, optionProps) => {
        return menuItem({
            key: option.value,
            text: option.label,
            onClick: optionProps.handleClick,
            active: optionProps.modifiers.active
        });
    };

    onItemSelect = (item) => {
        this.noteValueChange(item.value);
    };
}
export const select = elemFactory(Select);