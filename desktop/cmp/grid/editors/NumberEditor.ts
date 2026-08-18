/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {withDefault} from '@xh/hoist/utils/js';
import {isNil} from 'lodash';
import {useEffect} from 'react';
import {CustomCellEditorProps} from '@xh/hoist/kit/ag-grid';
import {hoistCmp} from '@xh/hoist/core';
import {numberInput, NumberInputProps} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {EditorProps} from './EditorProps';
import './Editors.scss';
import {useInlineEditorModel} from './impl/InlineEditorModel';

export type NumberEditorProps = EditorProps<NumberInputProps>;

/** Numeric input inline cell editor with guards to reject non-numeric key presses. */
export const [NumberEditor, numberEditor] = hoistCmp.withFactory<NumberEditorProps>({
    displayName: 'NumberEditor',
    className: 'xh-number-editor',
    memo: false,
    observer: false,
    render(props, ref) {
        useNumberGuard(props.agParams);

        // Make sure to override the NumberEditor debounce to 0 to prevent a bug where rapid changes are not saved.
        if (isNil(props.inputProps)) props.inputProps = {};
        // @ts-ignore
        props.inputProps.commitOnChangeDebounce = withDefault(
            // @ts-ignore
            props.inputProps.commitOnChangeDebounce,
            0
        );

        return useInlineEditorModel(numberInput, props, ref);
    }
});

// Characters that can validly begin a numeric entry - digits, sign, and decimal point.
const NUMBER_START_RE = /[0-9.+-]/;

const useNumberGuard = ({onValueChange, eventKey, stopEditing}: CustomCellEditorProps) => {
    // When editing is started by typing a printable character, seed the editor with it if it can
    // legally begin a number (digit, `-`, `+`, or `.`), otherwise stop editing to reject the
    // keystroke - reverting to the original value, as the editor was never seeded.
    useEffect(() => {
        if (eventKey?.length !== 1) return;
        if (NUMBER_START_RE.test(eventKey)) {
            onValueChange(eventKey);
        } else {
            stopEditing(true);
        }
    }, [eventKey, onValueChange, stopEditing]);
};
