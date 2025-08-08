/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {withDefault} from '@xh/hoist/utils/js';
import {isNil} from 'lodash';
import {useCallback, useEffect} from 'react';
import {CustomCellEditorProps, useGridCellEditor} from '@xh/hoist/kit/ag-grid';
import {hoistCmp} from '@xh/hoist/core';
import {numberInput, NumberInputProps} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {EditorProps} from './EditorProps';
import './Editors.scss';
import {useInlineEditorModel} from './impl/InlineEditorModel';

export type NumberEditorProps = EditorProps<NumberInputProps>;

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

const useNumberGuard = ({onValueChange, eventKey}: CustomCellEditorProps) => {
    // Needed (strangely) by agGrid to trigger call of isCancelBeforeStart
    useEffect(() => {
        if (eventKey?.length === 1) onValueChange(eventKey);
    }, [eventKey, onValueChange]);

    // Gets called before editor component is rendered, to give agGrid a chance to
    // cancel the editing before it even starts if char is not a number.
    const isCancelBeforeStart = useCallback(
        () => eventKey?.length === 1 && '1234567890'.indexOf(eventKey) < 0,
        [eventKey]
    );

    useGridCellEditor({
        isCancelBeforeStart
    });
};
