/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {select, SelectProps} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {logWarn} from '@xh/hoist/utils/js';
import {EditorProps} from './EditorProps';
import './Editors.scss';
import {useInlineEditorModel} from './impl/InlineEditorModel';

export interface SelectEditorProps extends EditorProps<SelectProps> {
    /**
     * True to change underlying record state immediately upon user changing value. Defaults to true.
     *
     * Note that this prop is only available if the `fullRowEditing` property on the containing
     * GridModel and the `enableMulti` property on the Select input are false.  It is ignored in either of these modes.
     */
    quickToggle?: boolean;
}

export const [SelectEditor, selectEditor] = hoistCmp.withFactory<SelectEditorProps>({
    displayName: 'SelectEditor',
    className: 'xh-select-editor',
    memo: false,
    observer: false,
    render({quickToggle, ...props}, ref) {
        const {fullRowEditing} = props.gridModel,
            {enableMulti} = props.inputProps;
        quickToggle = quickToggle ?? (!fullRowEditing && !enableMulti);

        if (quickToggle && fullRowEditing) {
            logWarn(
                "'quickToggle' prop ignored for GridModel with full row editing.",
                SelectEditor
            );
            quickToggle = false;
        } else if (quickToggle && enableMulti) {
            logWarn(
                "'quickToggle' prop ignored for Select input with enableMulti set to true.",
                SelectEditor
            );
            quickToggle = false;
        }

        props = {
            ...props,
            inputProps: {
                hideDropdownIndicator: true,
                hideSelectedOptionCheck: true,
                selectOnFocus: false,
                onCommit: () => {
                    if (quickToggle) {
                        props.agParams.stopEditing();
                    }
                },
                rsOptions: {
                    styles: {
                        menu: styles => ({
                            ...styles,
                            whiteSpace: 'nowrap',
                            width: 'auto',
                            minWidth: '100%'
                        })
                    }
                },
                ...props.inputProps
            }
        };

        return useInlineEditorModel(select, props, ref);
    }
});
