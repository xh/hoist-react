/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {useHoistInlineEditorModel} from './HoistInlineEditorModel';
import {HoistInlineEditorPropTypes} from './HoistInlineEditorProps';

export const [InlineTextEditor, inlineTextEditor] = hoistCmp.withFactory({
    displayName: 'InlineTextEditor',
    className: 'xh-inline-text-editor',
    model: false,
    memo: false,
    observer: false,
    render(props, ref) {
        return useHoistInlineEditorModel(textInput, props, ref);
    }
});
InlineTextEditor.propTypes = {
    ...HoistInlineEditorPropTypes
};
