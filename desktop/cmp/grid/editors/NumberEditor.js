/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {numberInput} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {EditorPropTypes} from './EditorPropTypes';
import './Editors.scss';
import {useInlineEditorModel} from './impl/InlineEditorModel';

export const [NumberEditor, numberEditor] = hoistCmp.withFactory({
    displayName: 'NumberEditor',
    className: 'xh-number-editor',
    memo: false,
    observer: false,
    render(props, ref) {
        return useInlineEditorModel(numberInput, props, ref);
    }
});
NumberEditor.propTypes = {
    ...EditorPropTypes
};
