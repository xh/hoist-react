/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {select} from '@xh/hoist/desktop/cmp/input';
import {useHoistInlineEditorModel} from './HoistInlineEditorModel';
import {HoistInlineEditorPropTypes} from './HoistInlineEditorProps';

export const [InlineSelectEditor, inlineSelectEditor] = hoistCmp.withFactory({
    displayName: 'InlineSelectEditor',
    className: 'xh-inline-select-editor',
    model: false,
    memo: false,
    observer: false,
    render(props, ref) {
        props.inputProps = {
            hideDropdownIndicator: true,
            hideSelectedOptionCheck: true,
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
        };
        return useHoistInlineEditorModel(select, props, ref);
    }
});
InlineSelectEditor.propTypes = {
    ...HoistInlineEditorPropTypes
};
