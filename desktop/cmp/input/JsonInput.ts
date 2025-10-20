/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hoistCmp, PlainObject} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {fmtJson} from '@xh/hoist/format';
import Ajv, {ValidateFunction} from 'ajv';
import {codeInput, CodeInputProps} from './CodeInput';

export interface JsonInputProps extends CodeInputProps {
    jsonSchema?: PlainObject;
}

/**
 * Code-editor style input for editing and validating JSON, powered by CodeMirror.
 */
export const [JsonInput, jsonInput] = hoistCmp.withFactory<JsonInputProps>({
    displayName: 'JsonInput',
    className: 'xh-json-input',
    render(props, ref) {
        const {jsonSchema, ...rest} = props;

        return codeInput({
            linter: jsonLinterWrapper(jsonSchema),
            formatter: fmtJson,
            language: 'json',
            ...rest,
            ref
        });
    }
});
(JsonInput as any).hasLayoutSupport = true;

//----------------------
// JSON Linter helper
//----------------------

function jsonLinterWrapper(jsonSchema?: PlainObject) {
    let validate: ValidateFunction | undefined;

    if (jsonSchema) {
        const ajv = new Ajv({allErrors: true, strictSchema: true});
        validate = ajv.compile(jsonSchema);
    }

    return (text: string) => {
        const annotations: any[] = [];
        if (!text.trim()) return annotations;
        // Try parsing JSON
        let data;
        try {
            data = JSON.parse(text);
        } catch (err: any) {
            annotations.push({
                from: 0,
                to: Math.min(1, text.length),
                message: err.message,
                severity: 'error'
            });
            return annotations;
        }

        // Skip schema validation if no schema provided
        if (!validate) return annotations;

        const valid = validate(data);
        if (valid || !validate.errors) return annotations;

        for (const err of validate.errors) {
            const path = err.instancePath || '';
            let from = 0;
            let to = 0;

            if (path) {
                const pointerParts = path.split('/').filter(Boolean);
                const key = pointerParts[pointerParts.length - 1];
                const keyIdx = text.indexOf(`"${key}"`);
                if (keyIdx >= 0) {
                    from = keyIdx;
                    to = keyIdx + key.length + 2;
                }
            }

            annotations.push({
                from,
                to,
                message: `${path || '(root)'} ${err.message}`,
                severity: 'error'
            });
        }

        return annotations;
    };
}
