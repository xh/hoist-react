/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {numberInput, NumberInputProps} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {EditorProps} from './EditorProps';
import './Editors.scss';
import {useInlineEditorModel} from './impl/InlineEditorModel';

export type NumberEditorProps = EditorProps<NumberInputProps>;

export const [NumberEditor, numberEditor] = hoistCmp.withFactory<NumberEditorProps>({
    displayName: 'NumberEditor',
    className: 'xh-number-editor',
    memo: false,
    observer: false,
    render(props, ref) {
        return useInlineEditorModel(numberInput, props, ref);
    }
});
