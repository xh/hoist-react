/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import PT from 'prop-types';
import {hoistCmp} from '@xh/hoist/core';
import {checkbox} from '@xh/hoist/desktop/cmp/input';
import {useImperativeHandle} from 'react';
import {wait} from '@xh/hoist/promise';
import {useInlineEditorModel} from './impl/InlineEditorModel';
import {EditorPropTypes} from './EditorPropTypes';
import './Editors.scss';

export const [BooleanEditor, booleanEditor] = hoistCmp.withFactory({
    displayName: 'BooleanEditor',
    className: 'xh-boolean-editor',
    memo: false,
    observer: false,
    render({
        quickToggle,
        ...props
    },
    ref) {
        const {fullRowEditing} = props.gridModel;
        quickToggle = quickToggle ?? !fullRowEditing;

        if (quickToggle && fullRowEditing) {
            console.warn("'quickToggle' prop ignored for GridModel with full row editing.");
            quickToggle = false;
        }

        return quickToggle ?
            useInstantEditor(props, ref) :
            useInlineEditorModel(checkbox, props, ref);
    }
});
BooleanEditor.propTypes = {
    ...EditorPropTypes,

    /**
     * True to change underlying record state immediately upon user editing gesture (i.e. clicking,
     * hitting return). Defaults to true.
     *
     * Note that this prop is only available if the `fullRowEditing` property on the containing
     * GridModel is false.  It is ignored in `fullRowEditing' mode.
     */
    quickToggle: PT.bool
};


function useInstantEditor({agParams}, ref) {
    useImperativeHandle(ref, () => ({
        getValue: () => !agParams.value
    }));
    wait().then(() => agParams.stopEditing());

    return null;
}
