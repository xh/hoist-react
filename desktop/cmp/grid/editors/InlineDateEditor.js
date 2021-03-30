import {hoistCmp} from '@xh/hoist/core';
import {dateInput} from '@xh/hoist/desktop/cmp/input';
import {makeObservable} from '@xh/hoist/mobx';
import {start} from '@xh/hoist/promise';

import {InlineEditorModel, useHoistInlineEditorModel} from './HoistInlineEditor';

export const InlineDateEditor = hoistCmp({
    displayName: 'InlineDateEditor',
    className: 'xh-inline-date-editor',
    model: false,
    memo: false,
    observer: false,
    render(props, ref) {
        const inputProps = {
            // Prefer a more minimal look for rendering in a cell
            rightElement: null,
            showActionsBar: true,
            popoverPositions: 'bottom',
            // Feels more natural for the editing to end after picking a date so the user does not need to press enter
            onCommit: () => props.stopEditing(),
            ...props.inputProps
        };

        return useHoistInlineEditorModel(dateInput, {...props, inputProps}, ref, Model);
    }
});

class Model extends InlineEditorModel {
    constructor(props) {
        super(props);
        makeObservable(this);

        // Open the date picker popover immediately once we are fully mounted
        this.addReaction({
            track: () => this.inputModel,
            run: (inputModel) => {
                if (!inputModel) return;
                start(() => inputModel.setPopoverOpen(true));
            }
        });
    }
}
