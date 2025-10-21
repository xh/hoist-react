/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hoistCmp, PlainObject} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {fmtJson} from '@xh/hoist/format';
import Ajv, {Options, SchemaObject, ValidateFunction} from 'ajv';
import {codeInput, CodeInputProps} from './CodeInput';

export interface JsonInputProps extends CodeInputProps {
    /**
     * JSON Schema object used to validate the input JSON. Accepts any valid JSON Schema keywords
     * supported by AJV, such as `type`, `properties`, `required`, and `additionalProperties`.
     * @see https://ajv.js.org/json-schema.html
     */
    jsonSchema?: SchemaObject;

    /**
     * Configuration object with any properties supported by the AJV API.
     * @see {@link https://ajv.js.org/options.html}
     */
    ajvProps?: Options;
}

/**
 * Code-editor style input for editing and validating JSON, powered by CodeMirror.
 */
export const [JsonInput, jsonInput] = hoistCmp.withFactory<JsonInputProps>({
    displayName: 'JsonInput',
    className: 'xh-json-input',
    render(props, ref) {
        const {jsonSchema, ajvProps, ...rest} = props;

        return codeInput({
            linter: jsonLinterWrapper(jsonSchema, ajvProps),
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

function jsonLinterWrapper(jsonSchema?: PlainObject, ajvProps?: Options) {
    let validate: ValidateFunction | undefined;

    if (jsonSchema) {
        const ajv = new Ajv({...ajvProps});
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
            let from = 0,
                to = 0,
                key = '';

            // Handle "additionalProperties" separately
            if (err.keyword === 'additionalProperties' && err.params?.additionalProperty) {
                key = err.params.additionalProperty;
            } else {
                const pointerParts = path.split('/').filter(Boolean);
                key = pointerParts[pointerParts.length - 1];
            }

            // Try to locate the key in the JSON text for highlighting
            if (key) {
                const keyIdx = text.indexOf(`"${key}"`);
                if (keyIdx >= 0) {
                    from = keyIdx;
                    to = keyIdx + key.length + 2;
                }
            }

            let message = `${path || '(root)'} ${err.message}`;
            if (err.keyword === 'additionalProperties' && key) {
                message = `Unexpected property "${key}"`;
            }

            annotations.push({
                from,
                to,
                message,
                severity: 'error'
            });
        }

        return annotations;
    };
}
