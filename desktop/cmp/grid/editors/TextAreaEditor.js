/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {textArea} from '../../input';
import {useInlineEditorModel} from './impl/InlineEditorModel';
import {EditorPropTypes} from './EditorPropTypes';
import './Editors.scss';

export const [TextAreaEditor, textAreaEditor] = hoistCmp.withFactory({
    displayName: 'TextAreaEditor',
    className: 'xh-textarea-editor',
    memo: false,
    observer: false,
    render(props, ref) {
        props = {
            ...props,
            inputProps: {
                style: {
                    resize: 'vertical'
                },
                ...props.inputProps
            }
        };
        return useInlineEditorModel(textArea, props, ref);
    }
});
TextAreaEditor.propTypes = {
    ...EditorPropTypes
};
