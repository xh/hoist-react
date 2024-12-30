/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {select, SelectProps} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {wait} from '@xh/hoist/promise';
import {EditorProps} from './EditorProps';
import './Editors.scss';
import {useInlineEditorModel} from './impl/InlineEditorModel';

export type SelectEditorProps = EditorProps<SelectProps>;

export const [SelectEditor, selectEditor] = hoistCmp.withFactory<SelectEditorProps>({
    displayName: 'SelectEditor',
    className: 'xh-select-editor',
    memo: false,
    observer: false,
    render(props, ref) {
        const flushOnCommit = !props.gridModel.fullRowEditing && !props.inputProps?.enableMulti;
        props = {
            ...props,
            inputProps: {
                hideDropdownIndicator: true,
                hideSelectedOptionCheck: true,
                selectOnFocus: false,
                onCommit: flushOnCommit
                    ? () => wait().then(() => props.agParams.stopEditing())
                    : null,
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
