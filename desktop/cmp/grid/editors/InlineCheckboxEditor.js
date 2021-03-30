import {hoistCmp} from '@xh/hoist/core';
import {checkbox} from '@xh/hoist/desktop/cmp/input';
import {useHoistInlineEditorModel} from './HoistInlineEditor';

export const inlineCheckboxEditor = hoistCmp.factory({
    displayName: 'InlineCheckboxEditor',
    className: 'xh-inline-checkbox-editor',
    model: false,
    memo: false,
    observer: false,
    render(props, ref) {
        return useHoistInlineEditorModel(checkbox, props, ref);
    }
});

