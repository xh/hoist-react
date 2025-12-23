/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {useEffect} from 'react';
import {CustomCellEditorProps} from '@xh/hoist/kit/ag-grid';
import {hoistCmp} from '@xh/hoist/core';
import {checkbox, CheckboxProps} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {EditorProps} from './EditorProps';
import './Editors.scss';
import {useInlineEditorModel} from './impl/InlineEditorModel';
import {logWarn} from '@xh/hoist/utils/js';

export interface BooleanEditorProps extends EditorProps<CheckboxProps> {
    /**
     * True to change underlying record state immediately upon user editing gesture (i.e. clicking,
     * hitting return). Defaults to true.
     *
     * Note that this prop is only available if the `fullRowEditing` property on the containing
     * GridModel is false.  It is ignored in `fullRowEditing` mode.
     */
    quickToggle?: boolean;
}

export const [BooleanEditor, booleanEditor] = hoistCmp.withFactory<BooleanEditorProps>({
    displayName: 'BooleanEditor',
    className: 'xh-boolean-editor',
    memo: false,
    observer: false,

    render({quickToggle, ...props}, ref) {
        const {fullRowEditing} = props.gridModel;
        quickToggle = quickToggle ?? !fullRowEditing;

        if (quickToggle && fullRowEditing) {
            logWarn(
                "'quickToggle' prop ignored for GridModel with full row editing.",
                BooleanEditor
            );
            quickToggle = false;
        }

        return quickToggle
            ? useInstantEditor(props.agParams, ref)
            : useInlineEditorModel(checkbox, props, ref);
    }
});

function useInstantEditor(
    {onValueChange, initialValue, stopEditing, eventKey, eGridCell}: CustomCellEditorProps,
    ref
) {
    // Don't toggle if the user has tabbed into the editor. See https://github.com/xh/hoist-react/issues/3943.
    // Fortunately, `eventKey` is null for tab, so we can use that to accept other keyboard events.
    // Unfortunately, it is also null for mouse events, so we check if the grid cell is currently
    // underneath the mouse position via `:hover` selector.
    useEffect(() => {
        const els = document.querySelectorAll(':hover'),
            topEl = els[els.length - 1];

        if (eventKey || topEl === eGridCell) {
            onValueChange(!initialValue);
        }
        stopEditing();
    }, [stopEditing, initialValue, onValueChange, eventKey, eGridCell]);

    return null;
}
