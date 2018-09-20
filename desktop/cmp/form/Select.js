/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {find, isObject} from 'lodash';
import {div} from '@xh/hoist/cmp/layout';
import {Classes, select as bpSelect} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {menuItem} from '@xh/hoist/kit/blueprint';
import {observable, action, settable} from '@xh/hoist/mobx';
import {HoistInput} from '@xh/hoist/cmp/form';
import {withDefault} from '@xh/hoist/utils/js';
import {Ref} from '@xh/hoist/utils/react';
import {wait} from '@xh/hoist/promise';


import './Select.scss';

/**
 * A Select Input
 *
 * @see HoistInput for properties additional to those documented below.
 */
@HoistComponent
export class Select extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        
        /** Text to display when control is empty */
        placeholder: PT.string,
        /** Collection of form [{value: string, label: string}, ...] or [val, val, ...] */
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string, PT.bool])),
        /** Icon to show on button. */
        icon: PT.element
    };

    baseClassName = 'xh-select';

    child = new Ref();
    @settable @observable.ref activeItem
    @observable.ref internalOptions = [];

    constructor(props) {
        super(props);
        this.addAutorun(() => this.normalizeOptions(this.props.options));
        this.addAutorun(() => {
            this.setActiveItem(find(this.internalOptions, {value: this.renderValue}) || null);
        });
    }
    
    render() {
        const {props, renderValue, internalOptions} = this,
            placeholder = withDefault(props.placeholder, 'Select');

        return bpSelect({
            className: this.getClassName(),
            popoverProps: {popoverClassName: Classes.MINIMAL, popoverRef: this.child.ref, autoFocus:false},
            $items: internalOptions,
            activeItem: this.activeItem,
            onActiveItemChange: (it) => this.setActiveItem(it),
            onItemSelect: this.onItemSelect,
            itemRenderer: this.itemRenderer,
            filterable: false,
            item: button({
                rightIcon: 'caret-down',
                text: this.getDisplayValue(renderValue, internalOptions, placeholder),
                style: {...props.style, width: props.width},
                disabled: props.disabled,
                tabIndex: props.tabIndex,
                icon: props.icon,
                onBlur: this.onBlur,
                onFocus: this.onFocus
            }),
            disabled: props.disabled
        });
    }

    //-------------------------------
    // Helpers, overrides
    //-------------------------------
    @action
    normalizeOptions(options) {
        options = withDefault(options, []);
        this.internalOptions = options.map(o => {
            const ret = isObject(o) ?
                {label: o.label, value: o.value} :
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
        //this.forcePopoverClose();
    }

    forcePopoverClose() {
        const elem = this.child.value;
        if (elem) {
            console.log('whacked');
            elem.style.display = 'none';
        }
    }

    //----------------------------------
    // Handlers, Callbacks
    //-----------------------------------
    itemRenderer = (option, optionProps) => {
        return menuItem({
            key: option.value,
            text: option.label,
            onClick: optionProps.handleClick,
            active: optionProps.modifiers.active
        });
    };

    onItemSelect = (val) => {
        this.noteValueChange(val.value);
    };
}
export const select = elemFactory(Select);