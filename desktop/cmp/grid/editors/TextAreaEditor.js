import {hoistCmp} from '../../../../core';
import {textArea} from '../../input';
import {useInlineEditorModel} from './InlineEditorModel';
import {InlineEditorPropTypes} from './InlineEditorProps';

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
    ...InlineEditorPropTypes
};
