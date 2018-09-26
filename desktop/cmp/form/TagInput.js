/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {tagInput as bpTagInput} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {HoistInput} from '@xh/hoist/cmp/form';
import './TagInput.scss'

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
        placeholder: PT.string,
        allowDuplicates: PT.bool,
        addOnBlur: PT.bool,
        rightElement: PT.element
    };

    static defaultProps = {
        commitOnChange: true,
        allowDuplicates: false
    };

    baseClassName = 'xh-tag-input';
    delegateProps = ['placeholder', 'disabled', 'addOnBlur','rightElement'];

    constructor(props) {
        super(props);
    }

    render() {
        return bpTagInput({
            tagProps: {minimal: true},
            className: this.getClassName(),
            onChange: this.onChange,
            onRemove: this.onRemoveTag,
            values: this.renderValue || [],
            ...this.getDelegateProps()
        });
    }

    onChange = (values) => {
        this.onTagsChange(values)
    }

    onRemoveTag = (tag, idx) => {
        const externalVal = castArray(clone(this.externalValue));
        externalVal.splice(idx,1);
        this.onTagsChange(externalVal)
    }

    onTagsChange = (values) => {
        const newValues = isEmpty(values) ? null : values;
        this.noteValueChange(newValues);
        if(!this.props.commitOnChange) this.doCommit();
    }


}
export const tagInput = elemFactory(TagInput);