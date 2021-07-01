import {hoistCmp} from '../../../../core';
import {textArea} from '../../input';
import {useInlineEditorModel} from './impl/InlineEditorModel';
import {EditorPropTypes} from './EditorPropTypes';
import {merge} from 'lodash';
import './Editors.scss';

export const [TextAreaEditor, textAreaEditor] = hoistCmp.withFactory({
    displayName: 'TextAreaEditor',
    className: 'xh-textarea-editor',
    model: false,
    memo: false,
    observer: false,
    render(props, ref) {
        merge({
            inputProps: {
                style: {
                    resize: 'vertical'
                }
            }
        }, props);
        return useInlineEditorModel(textArea, props, ref, true);
    }
});
TextAreaEditor.propTypes = {
    ...EditorPropTypes
};
