/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {Classes, select as bpSelect} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {menuItem} from '@xh/hoist/kit/blueprint';
import {BaseSelect} from './BaseSelect';
import {find} from 'lodash';
import {observable, settable} from '@xh/hoist/mobx';
import './Select.scss';

/**
 * A Select Input
 *
 * @see HoistInput for properties additional to those documented below.
 */
@HoistComponent
export class Select extends BaseSelect {

    static propTypes = {
        ...BaseSelect.propTypes,

        /** Collection of form [{value: string, label: string}, ...] or [val, val, ...] */
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string, PT.bool]))
    };

    delegateProps = ['className', 'disabled'];

    baseClassName = 'xh-select-field';

    @settable @observable.ref activeItem

    constructor(props) {
        super(props);
        this.addAutorun(() => {
            this.setActiveItem(find(this.internalOptions, ((it) => it.value == this.renderValue)) || null);
        });
    }
    
    render() {
        let {style, width, placeholder, disabled} = this.props,
            {renderValue, internalOptions} = this;
        
        return bpSelect({
            className: this.getClassName(),
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: internalOptions,
            activeItem: this.activeItem,
            onActiveItemChange: (it) => this.setActiveItem(it),
            onItemSelect: this.onItemSelect,
            itemRenderer: this.itemRenderer,
            filterable: false,
            item: button({
                rightIcon: 'caret-down',
                text: this.getDisplayValue(renderValue, internalOptions, placeholder),
                style: {...style, width},
                ...this.getDelegateProps()
            }),
            onBlur: () => this.noteBlurred(),
            onFocus: () => this.noteFocused(),
            disabled
        });
    }

    itemRenderer = (option, optionProps) => {
        return menuItem({
            key: option.value,
            text: option.label,
            onClick: optionProps.handleClick,
            active: optionProps.modifiers.active
        });
    }

    onItemSelect = (val) => {
        this.noteValueChange(val.value);
    }

    getDisplayValue(value, items, placeholder) {
        const match = find(items, {value});

        if (match) return match.label;
        return (value == null) ? placeholder : value.toString();
    }

    noteValueChange(val) {
        super.noteValueChange(val);
        if (!this.props.commitOnChange) this.doCommit();
    }
}
export const select = elemFactory(Select);