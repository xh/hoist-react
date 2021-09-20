/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import PT from 'prop-types';
import {hoistCmp} from '@xh/hoist/core';
import {checkbox} from '@xh/hoist/desktop/cmp/input';
import {useImperativeHandle} from 'react';
import {wait} from '@xh/hoist/promise';
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
        instantEdit = false,
        ...props
    },
    ref) {
        if (instantEdit && props.gridModel.fullRowEditing) {
            console.warn("'instantEdit' not available for GridModel with 'fullRowEditing'");
            instantEdit = false;
        }

        return instantEdit ?
            useInstantEditor(props, ref) :
            useInlineEditorModel(checkbox, props, ref);
    }
});
CheckboxEditor.propTypes = {
    ...EditorPropTypes,

    /**
     * True to change underlying record state immediately upon user editing gesture (i.e. clicking,
     * hitting return).  Defaulted to false.
     *
     * Only applicable if the `fullRowEditing` property on the containing GridModel is `false`.
     */
    instantEdit: PT.bool
};


function useInstantEditor({agParams}, ref) {
    useImperativeHandle(ref, () => ({
        getValue: () => !agParams.value
    }));
    wait().then(() => agParams.stopEditing());

    return null;
}