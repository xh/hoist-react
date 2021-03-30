import {hoistCmp} from '@xh/hoist/core';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {useHoistInlineEditorModel} from './HoistInlineEditor';

export const InlineTextEditor = hoistCmp({
    displayName: 'InlineTextEditor',
    className: 'xh-inline-text-editor',
    model: false,
    memo: false,
    observer: false,
    render(props, ref) {
        return useHoistInlineEditorModel(textInput, props, ref);
    }
});
