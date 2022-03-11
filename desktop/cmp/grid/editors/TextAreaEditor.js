import {hoistCmp} from '../../../../core';
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
        return useInlineEditorModel(textArea, props, ref, true);
    }
});
TextAreaEditor.propTypes = {
    ...EditorPropTypes
};
