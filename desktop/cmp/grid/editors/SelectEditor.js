/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {select} from '@xh/hoist/desktop/cmp/input';
import {useInlineEditorModel} from './impl/InlineEditorModel';
import {EditorPropTypes} from './EditorPropTypes';
import './Editors.scss';

export const [SelectEditor, selectEditor] = hoistCmp.withFactory({
    displayName: 'SelectEditor',
    className: 'xh-select-editor',
    model: false,
    memo: false,
    observer: false,
    render(props, ref) {
        props = {
            ...props,
            inputProps: {
                hideDropdownIndicator: true,
                hideSelectedOptionCheck: true,
                selectOnFocus: false,
                onCommit: () => {
                    // When not full-row editing we end the editing after commit to avoid the need
                    // for the user to click somewhere outside the cell before the record would be
                    // updated
                    const {gridModel} = props;
                    if (!gridModel.fullRowEditing) gridModel.endEditAsync();
                },
                rsOptions: {
                    styles: {
                        menu: styles => ({
                            ...styles,
                            whiteSpace: 'nowrap',
                            width: 'auto',
                            minWidth: '100%'
                        })
                    }
                },
                ...props.inputProps
            }
        };

        return useInlineEditorModel(select, props, ref);
    }
});
SelectEditor.propTypes = {
    ...EditorPropTypes
};
