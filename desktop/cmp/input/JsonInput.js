/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInput} from '@xh/hoist/cmp/input';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {codeInput, CodeInput} from '@xh/hoist/desktop/cmp/input';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import * as codemirror from 'codemirror';
import 'codemirror/mode/javascript/javascript';
import {jsonlint} from './impl/jsonlint';

/**
 * Code-editor style input for editing and validating JSON, powered by CodeMirror.
 */
@HoistComponent
@LayoutSupport
export class JsonInput extends HoistInput {

    @bindable fullScreen = false;

    static propTypes = {
        ...CodeInput.propTypes
    };

    baseClassName = 'xh-json-input';

    constructor(props, context) {
        super(props, context);
        makeObservable(this);
    }

    render() {
        const {props} = this;
        return codeInput({
            linter: this.linter,
            formatter: this.formatter,
            mode: 'application/json',
            ...props
        });
    }

    linter(text) {
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

    formatter(text) {
        return JSON.stringify(JSON.parse(text), undefined, 2);
    }
}
export const jsonInput = elemFactory(JsonInput);