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
import {jsonlint} from './impl/jsonlint.js';

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
    // No schema → only use JSONLint
    if (!jsonSchema) {
        return (text: string) => jsonLintOnly(text);
    }

    const ajv = new Ajv({...ajvProps}),
        validate = ajv.compile(jsonSchema);

    return (text: string) => {
        const annotations: any[] = [];

        if (!text.trim()) return annotations;

        runJsonLint(text, annotations);
        if (annotations.length) return annotations;

        runAjvValidation(text, validate, annotations);

        return annotations;
    };
}

/** Run JSONLint and append errors to annotations */
function runJsonLint(text: string, annotations: any[]) {
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
}

/** Run AJV schema validation and append errors to annotations */
function runAjvValidation(text: string, validate: ValidateFunction, annotations: any[]) {
    let data: any;
    try {
        data = JSON.parse(text);
    } catch (ignored) {
        return;
    }

    const valid = validate(data);
    if (valid || !validate.errors) return;

    validate.errors.forEach(err => {
        const {from, to} = getErrorPosition(err, text),
            message = formatAjvMessage(err);

        annotations.push({from, to, message, severity: 'error'});
    });
}

/** Determine text positions for AJV error highlighting */
function getErrorPosition(err: any, text: string): {from: number; to: number} {
    let from = 0,
        to = 0,
        key: string;

    if (err.keyword === 'additionalProperties' && err.params?.additionalProperty) {
        key = err.params.additionalProperty;
    } else {
        const parts = (err.instancePath || '').split('/').filter(Boolean);
        key = parts[parts.length - 1];
    }

    if (key) {
        const idx = text.indexOf(`"${key}"`);
        if (idx >= 0) {
            from = idx;
            to = idx + key.length + 2;
        }
    }

    return {from, to};
}

/** Format AJV error messages nicely */
function formatAjvMessage(err: any): string {
    const path = err.instancePath || '(root)';
    if (err.keyword === 'additionalProperties' && err.params?.additionalProperty) {
        return `Unexpected property "${err.params.additionalProperty}"`;
    }
    return `${path} ${err.message}`;
}

/** JSONLint-only linter (used when no jsonSchema prop) */
function jsonLintOnly(text: string) {
    const annotations: any[] = [];
    if (!text) return annotations;

    runJsonLint(text, annotations);
    return annotations;
}

/** Convert line/col to string index */
function indexFromLineCol(text: string, line: number, col: number): number {
    const lines = text.split('\n');
    let idx = 0;
    for (let i = 0; i < line - 1; i++) idx += lines[i].length + 1;
    return idx + col;
}
