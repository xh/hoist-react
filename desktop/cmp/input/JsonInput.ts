/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {json} from '@codemirror/lang-json';
import {hoistCmp} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {codeInput, CodeInputProps} from './CodeInput';
import './CodeInput.scss';

export type JsonInputProps = CodeInputProps;

/**
 * Code-editor style input for editing and validating JSON, powered by CodeMirror.
 */
export const [JsonInput, jsonInput] = hoistCmp.withFactory<JsonInputProps>({
    displayName: 'JsonInput',
    className: 'xh-json-input',
    render(props, ref) {
        return codeInput({
            ...props,
            extensions: [json()],
            flex: 1,
            ref
        });
    }
});
(JsonInput as any).hasLayoutSupport = true;
