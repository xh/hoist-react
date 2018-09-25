/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {action} from '@xh/hoist/mobx';
import {Classes, menuItem, tagInput as bpTagInput} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {HoistInput} from '@xh/hoist/cmp/form';
import {Icon} from '@xh/hoist/icon';

/**
 * A Tag Input Component
 *
 *
 * @see HoistInput for properties additional to those documented below.
 */
@HoistComponent
export class TagInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,

        /** Optional custom optionRenderer, a function that receives (option, optionProps) */
        itemRenderer: PT.func,
        /** Optional custom tagRenderer, a function that receives the value property of each selected option.
         *  Should return a ReactNode or string */
        tagRenderer: PT.func,
        placeholder: PT.string
    };

    delegateProps = ['className', 'disabled'];

    baseClassName = 'xh-tag-input';

    constructor(props) {
        super(props);
    }

    render() {
        let {placeholder, disabled} = this.props,
            {internalOptions} = this;

        return bpTagInput({
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            tagProps: {minimal: true},
            className: this.getClassName(),
            placeholder,
            inputProps: {
                placeholder: '',
                autoComplete: 'nope'
            },
            onRemove: this.onRemoveTag,
            $values: this.externalValue,
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
export const tagInput = elemFactory(tagInput);