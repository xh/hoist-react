/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {checkbox} from '@xh/hoist/desktop/cmp/input';
import {useHoistInlineEditorModel} from './HoistInlineEditor';
import {HoistInlineEditorPropTypes} from './HoistInlineEditorProps';

export const [InlineCheckboxEditor, inlineCheckboxEditor] = hoistCmp.withFactory({
    displayName: 'InlineCheckboxEditor',
    className: 'xh-inline-checkbox-editor',
    model: false,
    memo: false,
    observer: false,
    render(props, ref) {
        return useHoistInlineEditorModel(checkbox, props, ref);
    }
});
InlineCheckboxEditor.propTypes = {
    ...HoistInlineEditorPropTypes
};
