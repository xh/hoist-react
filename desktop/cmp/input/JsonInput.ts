/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {fmtJson} from '@xh/hoist/format';
import {codeInput, CodeInputProps} from './CodeInput';
import {jsonlint} from './impl/jsonlint.js';

export type JsonInputProps = CodeInputProps;

/**
 * Code-editor style input for editing and validating JSON, powered by CodeMirror.
 */
export const [JsonInput, jsonInput] = hoistCmp.withFactory<JsonInputProps>({
    displayName: 'JsonInput',
    className: 'xh-json-input',
    render(props, ref) {
        return codeInput({
            linter,
            formatter: fmtJson,
            language: 'json',
            ...props,
            ref
        });
    }
});
(JsonInput as any).hasLayoutSupport = true;

//----------------------
// Implementation
//----------------------
function linter(text: string) {
    const annotations: any[] = [];
    if (!text) return annotations;

    jsonlint.parseError = (message, hash) => {
        const {first_line, first_column, last_line, last_column} = hash.loc;
        annotations.push({
            from: indexFromLineCol(text, first_line, first_column),
            to: indexFromLineCol(text, last_line, last_column),
            message,
            severity: 'error'
        });
    };

    try {
        jsonlint.parse(text);
    } catch (ignored) {}

    return annotations;
}

/** Convert line/col (1-based line, 0-based col) to absolute string index. */
function indexFromLineCol(text: string, line: number, col: number): number {
    const lines = text.split('\n');
    let idx = 0;
    for (let i = 0; i < line - 1; i++) idx += lines[i].length + 1;
    return idx + col;
}
