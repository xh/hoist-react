/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {pull, clone, isEmpty, startsWith, isObject} from 'lodash';

import {Classes, menuItem, multiSelect as bpMultiSelect} from '@xh/hoist/kit/blueprint';
import {div} from '@xh/hoist/cmp/layout';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {HoistInput} from '@xh/hoist/cmp/form';
import {withDefault} from '@xh/hoist/utils/js';
import {observable, action, settable} from '@xh/hoist/mobx';


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
export class MultiSelect extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,

        value: PT.arrayOf(PT.string),

        /** Text to display when control is empty */
        placeholder: PT.string,
        /** Collection of form [{value: string, label: string}, ...] or [val, val, ...] */
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string, PT.bool])),
        /** Custom tagRenderer, a function that receives the value property of each selected option.
         *  Should return a ReactNode or string */
        tagRenderer: PT.func
    };
    
    baseClassName = 'xh-multi-select';

    @observable.ref internalOptions = [];
    @settable @observable query = '';

    constructor(props) {
        super(props);
        this.addAutorun(() => this.normalizeOptions(this.props.options));
    }

    render() {
        const {props} = this,
            placeholder = withDefault(props.placeholder, 'Select'),
            tagRenderer = withDefault(props.tagRenderer, val => val);

        return div({
            onFocus: this.onFocus,
            onBlur: this.onBlur,
            item: bpMultiSelect({
                popoverProps: {popoverClassName: Classes.MINIMAL},
                $items: this.internalOptions,
                query: this.query,
                openOnKeyDown: true,
                onQueryChange: (q) => this.setQuery(q),
                onItemSelect: this.onItemSelect,
                itemRenderer: this.itemRenderer,
                itemPredicate: (q, item) => {
                    q = q.toLowerCase();
                    return startsWith(item.label.toLowerCase(), q) || startsWith(item.value.toLowerCase(), q);
                },
                tagRenderer: tagRenderer,
                tagInputProps: {
                    tagProps: {minimal: true},
                    className: this.getClassName(),
                    placeholder,
                    onFocus: this.onFocus,
                    onBlur: this.onBlur,
                    tabIndex: props.tabIndex,
                    inputProps: {
                        placeholder: '',
                        autoComplete: 'nope'
                    },
                    onRemove: this.onRemoveTag
                },
                noResults: 'No results found',
                selectedItems: this.renderValue || [],
                disabled: props.disabled
            })
        });
    }

    //-----------------------
    // Helpers, overrides
    //------------------------
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

    noteValueChange(val) {
        if (isEmpty(val)) val = null;
        super.noteValueChange(val);
    }

    //-------------------------
    // Handlers, Callbacks
    //-------------------------
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
        this.setQuery('');
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
}
export const multiSelect = elemFactory(MultiSelect);