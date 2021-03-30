import {hoistCmp} from '@xh/hoist/core';
import {numberInput} from '@xh/hoist/desktop/cmp/input';
import {useHoistInlineEditorModel} from './HoistInlineEditor';

export const inlineNumberEditor = hoistCmp.factory({
    displayName: 'InlineNumberEditor',
    className: 'xh-inline-number-editor',
    model: false,
    memo: false,
    observer: false,
    render(props, ref) {
        return useHoistInlineEditorModel(numberInput, props, ref);
    }
});
