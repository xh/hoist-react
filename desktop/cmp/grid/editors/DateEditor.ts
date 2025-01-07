/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {dateInput, DateInputProps} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {warnIf} from '@xh/hoist/utils/js';
import {EditorProps} from './EditorProps';
import './Editors.scss';
import {useInlineEditorModel} from './impl/InlineEditorModel';

export type DateEditorProps = EditorProps<DateInputProps>;

export const [DateEditor, dateEditor] = hoistCmp.withFactory<DateEditorProps>({
    displayName: 'DateEditor',
    className: 'xh-date-editor',
    memo: false,
    observer: false,
    render(props, ref) {
        // We need to render the day picker popover inside the grid viewport in order for
        // `stopEditingWhenCellsLoseFocus` to work properly - otherwise the day picker becomes
        // unusable due to the grid losing focus and stopping editing when clicking inside picker
        // @ts-ignore -- private
        const portalContainer = props.gridModel.agApi.gridBodyCtrl?.eBodyViewport;

        warnIf(
            !portalContainer,
            'Could not find the grid body viewport for rendering DateEditor picker popover.'
        );

        props = {
            ...props,
            inputProps: {
                enablePicker: !!portalContainer,
                showPickerOnFocus: !!portalContainer,
                portalContainer,
                ...props.inputProps
            }
        };
        return useInlineEditorModel(dateInput, props, ref);
    }
});
