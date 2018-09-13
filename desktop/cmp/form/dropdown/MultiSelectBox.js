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
import {Icon} from '@xh/hoist/icon';

import {BaseDropdownInput} from './BaseDropdownInput';
import './MultiSelectBox.scss';


/**
 * A Multi Select Input
 *
 * It is important to control the width of this component. As tags are selected they are added to the field
 * causing it to expand. Tags will wrap once the component reaches its width or max-width or the explicitly set
 * width of its container. Use the className prop to define this style in CSS.
 *
 * @see HoistInput for properties additional to those documented below.
 */
@HoistComponent
export class MultiSelectBox extends BaseDropdownInput {

    static propTypes = {
        ...BaseDropdownInput.propTypes,

        /** Collection of form [{value: string, label: string}, ...] or [val, val, ...] */
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string, PT.bool])),
        /** Optional custom optionRenderer, a function that receives (option, optionProps) */
        itemRenderer: PT.func,
        /** Optional custom tagRenderer, a function that receives the value property of each selected option.
         *  Should return a ReactNode or string */
        tagRenderer: PT.func
    };

    delegateProps = ['className', 'disabled'];

    baseClassName = 'xh-multi-select-field';

    constructor(props) {
        super(props);
        this.addAutorun(() => this.normalizeOptions(this.props.options));
    }

    render() {
        let {placeholder, disabled} = this.props,
            {internalOptions} = this;

        return multiSelect({
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: internalOptions,
            onItemSelect: this.onItemSelect,
            resetOnSelect: true,
            itemRenderer: this.getOptionRenderer(),
            itemPredicate: (q, item) => {
                return startsWith(item.label.toLowerCase(), q.toLowerCase());
            },
            tagRenderer: this.getTagRenderer(),
            tagInputProps: {
                tagProps: {minimal: true},
                className: this.getClassName(),
                placeholder,
                onRemove: this.onRemoveTag
            },
            selectedItems: this.externalValue || [],
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            disabled
        });
    }

    onBlur = () => {
        this.noteBlurred();
    }

    onFocus = () => {
        this.noteFocused();
    }

    onRemoveTag = (tag, idx) => {
        // the tag parameter is determined by the tagRenderer, so it may not match the value representation
        const value = this.externalValue[idx];
        this.onItemSelect({value});
    }

    @action
    setInternalValue(val) {
        const externalVal = this.externalValue ? castArray(clone(this.externalValue)) : [];
        externalVal.includes(val) ? remove(externalVal, (it) => it == val) : externalVal.push(val);

        this.internalValue = isEmpty(externalVal) ? null : externalVal;
    }

    getTagRenderer() {
        return this.props.tagRenderer || this.defaultTagRenderer;
    }

    defaultTagRenderer = (item) => {
        return item;
    }

    defaultOptionRenderer = (option, optionProps) => {
        return menuItem({
            key: option.value,
            text: option.label,
            labelElement: (this.externalValue && this.externalValue.includes(option.value)) ? Icon.check() : '',
            onClick: optionProps.handleClick,
            active: optionProps.modifiers.active
        });
    }

}
export const multiSelectBox = elemFactory(MultiSelectBox);