/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import * as codemirror from 'codemirror';
import 'codemirror/mode/javascript/javascript';
import {fmtJson} from '@xh/hoist/format';
import {codeInput, CodeInputProps} from './CodeInput';
import {jsonlint} from './impl/jsonlint';

export type JsonInputProps = CodeInputProps;

/**
 * Code-editor style input for editing and validating JSON, powered by CodeMirror.
 */
export const [JsonInput, jsonInput] = hoistCmp.withFactory<JsonInputProps>({
    displayName: 'JsonInput',
    className: 'xh-json-input',
    render(props, ref) {
        return codeInput({
            linter: linter,
            formatter: fmtJson,
            mode: 'application/json',
            ...props,
            ref
        });
    }
});
(JsonInput as any).hasLayoutSupport = true;

//----------------------
// Implementation
//-----------------------
function linter(text: string) {
    const errors = [];
    if (!text) return errors;

    jsonlint.parseError = function(str, hash) {
        const loc = hash.loc;
        errors.push({
            from: codemirror.Pos(loc.first_line - 1, loc.first_column),
            to: codemirror.Pos(loc.last_line - 1, loc.last_column),
            message: str
        });
    };

    try {
        jsonlint.parse(text);
    } catch (ignored) {}

    return errors;
}
