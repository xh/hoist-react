/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {dateInput} from '@xh/hoist/desktop/cmp/input';
import {useHoistInlineEditorModel} from './HoistInlineEditorModel';
import {HoistInlineEditorPropTypes} from './HoistInlineEditorProps';

export const [InlineDateEditor, inlineDateEditor] = hoistCmp.withFactory({
    displayName: 'InlineDateEditor',
    className: 'xh-inline-date-editor',
    model: false,
    memo: false,
    observer: false,
    render(props, ref) {
        return useHoistInlineEditorModel(dateInput, props, ref);
    }
});
InlineDateEditor.propTypes = {
    ...HoistInlineEditorPropTypes
};
