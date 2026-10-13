/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import {select, SelectProps} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {wait} from '@xh/hoist/promise';
import {EditorProps} from './EditorProps';
import './Editors.scss';
import {useInlineEditorModel} from './impl/InlineEditorModel';

export type SelectEditorProps = EditorProps<SelectProps>;

/** Dropdown select inline cell editor for choice fields in a Grid. */
export const [SelectEditor, selectEditor] = hoistCmp.withFactory<SelectEditorProps>({
    displayName: 'SelectEditor',
    className: 'xh-select-editor',
    memo: false,
    observer: false,
    render(props, ref) {
        const flushOnCommit = !props.gridModel.fullRowEditing && !props.inputProps?.enableMulti;
        props = {
            ...props,
            inputProps: {
                hideDropdownIndicator: true,
                hideSelectedOptionCheck: true,
                onCommit: flushOnCommit
                    ? () => wait().then(() => props.agParams.stopEditing())
                    : null,
                // Auto-size the menu to content, not the narrow cell - but skip when width is already
                // set, via windowed measurement (#4325) or an explicit `menuWidth` (#4057).
                rsOptions:
                    props.inputProps?.enableWindowed || props.inputProps?.menuWidth != null
                        ? {}
                        : {
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

        return useInlineEditorModel(select, props, ref, enterSearchText);
    }
});

// Enter the key that started the edit as search text and open the menu, as typing would. The
// select's value holds an option, so the key cannot be entered as a value as other editors do.
function enterSearchText(input: HoistInputModel, key: string) {
    // Ignore the key when search is off, as the select has no search text to enter it into.
    const rsSelectCmp = (input as any).reactSelectRef?.current;
    if (!rsSelectCmp?.props.isSearchable) return;

    // Wait for the select to finish handling focus, which selects any existing input text.
    wait().then(() => {
        rsSelectCmp.props.onInputChange(key, {
            action: 'input-change',
            prevInputValue: rsSelectCmp.props.inputValue ?? ''
        });
        rsSelectCmp.openMenu('first');
    });
}
