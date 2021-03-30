import {hoistCmp} from '@xh/hoist/core';
import {dateInput} from '@xh/hoist/desktop/cmp/input';

import {InlineEditorModel, useHoistInlineEditorModel} from './HoistInlineEditor';

export const inlineDateEditor = hoistCmp.factory({
    displayName: 'InlineDateEditor',
    className: 'xh-inline-date-editor',
    model: false,
    memo: false,
    observer: false,
    render(props, ref) {
        return useHoistInlineEditorModel(dateInput, {
            ...props,
            inputProps: {
                // Prefer a more minimal look for rendering in a cell
                rightElement: null,
                showActionsBar: true,
                showPickerOnFocus: true,
                popoverPositions: 'bottom',
                ...props.inputProps
            }
        }, ref, Model);
    }
});

class Model extends InlineEditorModel {
    onCommit() {
        // If we are not full-row editing then stop the edit when a value has been committed
        if (!this.gridModel.fullRowEditing) {
            this.stopEditing();
        }

        // TODO: Need to figure out how to handle this when full row editing...
    }

    // Override to also open the popover on focus
    focus() {
        super.focus();
        this.inputModel?.setPopoverOpen(true);
    }
}
