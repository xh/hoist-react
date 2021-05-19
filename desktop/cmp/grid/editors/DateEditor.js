/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {dateInput} from '@xh/hoist/desktop/cmp/input';
import {useInlineEditorModel} from './InlineEditorModel';
import {InlineEditorPropTypes} from './InlineEditorProps';

export const [DateEditor, dateEditor] = hoistCmp.withFactory({
    displayName: 'DateEditor',
    className: 'xh-date-editor',
    model: false,
    memo: false,
    observer: false,
    render(props, ref) {
        return useInlineEditorModel(dateInput, props, ref);
    }
});
DateEditor.propTypes = {
    ...InlineEditorPropTypes
};
