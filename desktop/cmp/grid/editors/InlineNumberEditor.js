/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {numberInput} from '@xh/hoist/desktop/cmp/input';
import {useHoistInlineEditorModel} from './HoistInlineEditor';
import {HoistInlineEditorPropTypes} from './HoistInlineEditorProps';

export const [InlineNumberEditor, inlineNumberEditor] = hoistCmp.withFactory({
    displayName: 'InlineNumberEditor',
    className: 'xh-inline-number-editor',
    model: false,
    memo: false,
    observer: false,
    render(props, ref) {
        return useHoistInlineEditorModel(numberInput, props, ref);
    }
});
InlineNumberEditor.propTypes = {
    ...HoistInlineEditorPropTypes
};
