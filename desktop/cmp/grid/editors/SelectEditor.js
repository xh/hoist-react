/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {select} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {EditorPropTypes} from './EditorPropTypes';
import './Editors.scss';
import {useInlineEditorModel} from './impl/InlineEditorModel';

export const [SelectEditor, selectEditor] = hoistCmp.withFactory({
    displayName: 'SelectEditor',
    className: 'xh-select-editor',
    memo: false,
    observer: false,
    render(props, ref) {
        props = {
            ...props,
            inputProps: {
                hideDropdownIndicator: true,
                hideSelectedOptionCheck: true,
                selectOnFocus: false,
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
