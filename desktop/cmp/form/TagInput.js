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
import {isEmpty, castArray, clone, uniq} from 'lodash';
import './TagInput.scss';

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

        /** Text to display when control is empty */
        placeholder: PT.string,
        /** Whether to update the control's value with a duplicate string */
        allowDuplicates: PT.bool,
        /** Whether onChange will be invoked when the control loses focus */
        addOnBlur: PT.bool,
        /** Element to display on the right side of the input */
        rightElement: PT.element,
        /** Separator pattern used to split input text into multiple values. */
        separator: PT.string
    };

    baseClassName = 'xh-tag-input';
    delegateProps = ['placeholder', 'disabled', 'addOnBlur', 'rightElement', 'fill', 'separator'];
    static defaultProps = {
        allowDuplicates: true
    };

    constructor(props) {
        super(props);
    }

    render() {
        return bpTagInput({
            tagProps: {minimal: true},
            className: this.getClassName(),
            onChange: this.onChange,
            values: this.renderValue || [],
            ...this.getDelegateProps()
        });
    }

    onChange = (values) => {
        if (!this.props.allowDuplicates) values = uniq(values);
        this.onTagsChange(values);
    }

    /** Saving this code in case separate add/remove handlers are needed
    onRemoveTag = (tag, idx) => {
        const externalVal = castArray(clone(this.externalValue));
        externalVal.splice(idx,1);
        this.onTagsChange(externalVal)
    }
    */

    onTagsChange = (values) => {
        const newValues = isEmpty(values) ? null : values;
        this.noteValueChange(newValues);
        if (!this.props.commitOnChange) this.doCommit();
    }

}
export const tagInput = elemFactory(TagInput);