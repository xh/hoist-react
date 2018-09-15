/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {pull, clone, isEmpty, startsWith} from 'lodash';
import {Classes, menuItem, multiSelect as bpMultiSelect} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';

import {BaseSelect} from './BaseSelect';
import './MultiSelect.scss';


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
export class MultiSelect extends BaseSelect {

    static propTypes = {
        ...BaseSelect.propTypes,

        /** Collection of form [{value: string, label: string}, ...] or [val, val, ...] */
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string, PT.bool])),
        /** Custom tagRenderer, a function that receives the value property of each selected option.
         *  Should return a ReactNode or string */
        tagRenderer: PT.func
    };

    delegateProps = ['className', 'disabled'];

    baseClassName = 'xh-multi-select-field';
    
    render() {
        let {placeholder, disabled, tagRenderer} = this.props,
            {internalOptions} = this;

        return bpMultiSelect({
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: internalOptions,
            openOnKeyDown: true,
            onItemSelect: this.onItemSelect,
            itemRenderer: this.itemRenderer,
            itemPredicate: (q, item) => {
                return startsWith(item.label.toLowerCase(), q.toLowerCase());
            },
            tagRenderer: tagRenderer || (i => i),
            tagInputProps: {
                tagProps: {minimal: true},
                className: this.getClassName(),
                placeholder,
                inputProps: {
                    placeholder: '',
                    autoComplete: 'nope'
                },
                onRemove: this.onRemoveTag
            },
            noResults: 'No results found',
            selectedItems: this.renderValue || [],
            onBlur: () => this.noteBlurred(),
            onFocus: () => this.noteFocused(),
            disabled
        });
    }

    onRemoveTag = (tag, idx) => {
        let newVals = isEmpty(this.internalValue) ? [] : clone(this.internalValue);
        newVals = newVals.filter((v, index) => index != idx);
        this.noteValueChange(newVals);
    };

    onItemSelect = (item) => {
        const {value} = item,
            newVals = isEmpty(this.internalValue) ? [] : clone(this.internalValue);
        if (newVals.includes(value)) {
            pull(newVals, value);
        } else {
            newVals.push(value);
        }
        this.noteValueChange(newVals);
    };

    itemRenderer = (option, optionProps) => {
        return menuItem({
            key: option.value,
            text: option.label,
            labelElement: (this.renderValue && this.renderValue.includes(option.value)) ? Icon.check() : '',
            onClick: optionProps.handleClick,
            active: optionProps.modifiers.active
        });
    };

    noteValueChange(val) {
        if (isEmpty(val)) val = null;
        super.noteValueChange(val);
        if (!this.props.commitOnChange) this.doCommit();
    }
}
export const multiSelect = elemFactory(MultiSelect);