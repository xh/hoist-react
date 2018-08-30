/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {castArray, clone, isEmpty, remove, startsWith} from 'lodash';
import {action} from '@xh/hoist/mobx';
import {Classes, menuItem, multiSelect} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';

import {BaseDropdownField} from './BaseDropdownField';

/**
 * A Multi Select Field
 *
 * @see HoistField for properties additional to those documented below.
 */
@HoistComponent()
export class MultiSelectField extends BaseDropdownField {

    static propTypes = {
        ...BaseDropdownField.propTypes,

        /** Collection of form [{value: string, label: string}, ...] or [val, val, ...] */
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string, PT.bool])),
        /** Optional custom optionRenderer, a function that receives (option, optionProps) */
        itemRenderer: PT.func
    };

    delegateProps = ['className', 'disabled'];

    constructor(props) {
        super(props);
        this.internalOptions = this.normalizeOptions(props.options);
    }

    componentDidMount() {
        this.addAutorun(() => this.internalOptions = this.normalizeOptions(this.props.options));
    }

    render() {
        let {style, width, placeholder, disabled} = this.props,
            {internalOptions} = this;

        return multiSelect({
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: internalOptions,
            onItemSelect: this.onItemSelect,
            itemRenderer: this.getOptionRenderer(),
            itemPredicate: (q, item) => {
                return startsWith(item.label.toLowerCase(), q.toLowerCase());
            },
            tagRenderer: this.tagRenderer,
            tagInputProps: {tagProps: {minimal: true}, placeholder, onRemove: this.handleTagRemove},
            selectedItems: this.externalValue || [],
            filterable: false,
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            inputProps: {placeholder: 'Hello'},
            disabled
        });
    }

    // this could be a prop al defaultOptionRenderer
    tagRenderer(item) {
        return item;
    }

    // this gets p
    handleTagRemove = (tag, idx) => {
        // the tag string is determined by the tagRender, so might not match the value representation
        const val = this.externalValue[idx];
        this.onItemSelect({value: val});
    }

    @action
    setInternalValue(val) {
        const externalVal = this.externalValue ? castArray(clone(this.externalValue)) : [];
        externalVal.includes(val) ? remove(externalVal, (it) => it == val) : externalVal.push(val);

        this.internalValue = isEmpty(externalVal) ? null : externalVal;
    }

    getOptionRenderer() {
        return this.props.optionRenderer || this.defaultOptionRenderer;
    }

    defaultOptionRenderer = (option, optionProps) => {
        return menuItem({
            key: option.value,
            text: option.label,
            icon: (this.externalValue && this.externalValue.includes(option.value)) ? 'tick' : 'blank',
            onClick: optionProps.handleClick,
            active: optionProps.modifiers.active
        });
    }

}
export const multiSelectField = elemFactory(MultiSelectField);