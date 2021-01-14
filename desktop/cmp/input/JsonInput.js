/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {CodeInput, codeInput} from './CodeInput';
import * as codemirror from 'codemirror';
import 'codemirror/mode/javascript/javascript';
import {jsonlint} from './impl/jsonlint';

/**
 * Code-editor style input for editing and validating JSON, powered by CodeMirror.
 */
export const [JsonInput, jsonInput] = hoistCmp.withFactory({
    displayName: 'JsonInput',
    className: 'xh-json-input',
    render(props, ref) {
        return codeInput({
            linter,
            formatter,
            mode: 'application/json',
            ...props,
            ref
        });
    }
});
JsonInput.propTypes = CodeInput.propTypes;
JsonInput.hasLayoutSupport = true;


//----------------------
// Implementation
//-----------------------
function linter(text) {
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

function formatter(text) {
    return JSON.stringify(JSON.parse(text), undefined, 2);
}
