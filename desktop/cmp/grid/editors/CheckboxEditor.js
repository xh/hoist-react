/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import PT from 'prop-types';
import {hoistCmp} from '@xh/hoist/core';
import {checkbox} from '@xh/hoist/desktop/cmp/input';
import {useInlineEditorModel} from './impl/InlineEditorModel';
import {EditorPropTypes} from './EditorPropTypes';
import './Editors.scss';


export const [CheckboxEditor, checkboxEditor] = hoistCmp.withFactory({
    displayName: 'CheckboxEditor',
    className: 'xh-checkbox-editor',
    model: false,
    memo: false,
    observer: false,
    render({
        commitOnChange = true,
        instantEdit = true,
        ...props
    }, 
    ref) {
        if (props.gridModel.fullRowEditing) {
            commitOnChange = instantEdit = false;
        } else {
            commitOnChange = instantEdit ? true : commitOnChange;
        }

        props = {
            instantEdit,
            ...props,
            inputProps: {
                onChange: commitOnChange ? () => setTimeout(props.agParams.stopEditing, 0) : null,
                ...props.inputProps
            }
        };
        return useInlineEditorModel(checkbox, props, ref);
    }
});
CheckboxEditor.propTypes = {
    ...EditorPropTypes,

    /** 
     * True to close checkbox cell and register change on record immediately after change.
     * User does not have to tab out of the cell, hit enter, or click elsewhere.
     * Defaulted to true.  
     * Forced to true if instantEdit is true.
     * Forced to false if gridModel.fullRowEditing is true
     */
    commitOnChange: PT.bool,

    /** 
     * True to change checked state immediately upon opening of editor. 
     * Defaulted to true.
     * Forced to false if gridModel.fullRowEditing is true.
     */
    instantEdit: PT.bool
};
