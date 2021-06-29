import {hoistCmp} from '../../../../core';
import {textArea} from '../../input';
import {useInlineEditorModel} from './impl/InlineEditorModel';
import {EditorPropTypes} from './EditorPropTypes';
import './Editors.scss';

export const [TextAreaEditor, textAreaEditor] = hoistCmp.withFactory({
    displayName: 'TextAreaEditor',
    className: 'xh-textarea-editor',
    model: false,
    memo: false,
    observer: false,
    render(props, ref) {
        props.inputProps = {
            ...props.inputProps,
            style: {
                resize: 'vertical',
                ...props.inputProps?.style
            }
        };
        return useInlineEditorModel(textArea, props, ref, true);
    }
});
TextAreaEditor.propTypes = {
    ...EditorPropTypes
};
