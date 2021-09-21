/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {dateInput} from '@xh/hoist/desktop/cmp/input';
import {warnIf} from '@xh/hoist/utils/js';
import {useInlineEditorModel} from './impl/InlineEditorModel';
import {EditorPropTypes} from './EditorPropTypes';
import './Editors.scss';

export const [DateEditor, dateEditor] = hoistCmp.withFactory({
    displayName: 'DateEditor',
    className: 'xh-date-editor',
    model: false,
    memo: false,
    observer: false,
    render(props, ref) {
        // We need to render the day picker popover inside the grid viewport in order for
        // `stopEditingWhenCellsLoseFocus` to work properly - otherwise the day picker becomes
        // unusable due to the grid losing focus and stopping the editing when clicking inside the
        // picker
        const portalContainer = props.gridModel.agApi.gridBodyComp?.eBodyViewport;
        warnIf(!portalContainer, 'Could not find the grid body viewport for rendering DateEditor picker popover.');

        props = {
            ...props,
            inputProps: {
                rightElement: null,
                showPickerOnFocus: true,
                popoverBoundary: 'scrollParent', // try to fit the picker within the grid viewport
                portalContainer,
                ...props.inputProps
            }
        };
        return useInlineEditorModel(dateInput, props, ref);
    }
});
DateEditor.propTypes = {
    ...EditorPropTypes
};
