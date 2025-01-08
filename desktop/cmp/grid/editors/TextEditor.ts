/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {textInput, TextInputProps} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {EditorProps} from './EditorProps';
import './Editors.scss';
import {useInlineEditorModel} from './impl/InlineEditorModel';

export type TextEditorProps = EditorProps<TextInputProps>;

export const [TextEditor, textEditor] = hoistCmp.withFactory<TextEditorProps>({
    displayName: 'TextEditor',
    className: 'xh-text-editor',
    memo: false,
    observer: false,
    render(props, ref) {
        return useInlineEditorModel(textInput, props, ref);
    }
});
