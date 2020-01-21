/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {codeInput} from '@xh/hoist/desktop/cmp/input/CodeInput';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import PT from 'prop-types';

import {HoistInput} from '@xh/hoist/cmp/input';

import * as codemirror from 'codemirror';
import {jsonlint} from './impl/jsonlint';

import 'codemirror/mode/javascript/javascript';

/**
 * Code-editor style input for editing and validating JSON, powered by CodeMirror.
 *
 * TODO - understanding sizing spec / requirements for component vs. generated CodeMirror.
 * Reconcile LayoutSupport with width/height props. https://github.com/xh/hoist-react/issues/327
 */
@HoistComponent
@LayoutSupport
export class JsonInput extends HoistInput {

    @bindable fullScreen = false;

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.string,

        /** True to commit on every change/keystroke, default false. */
        commitOnChange: PT.bool,

        /**
         * Configuration object with any properties supported by the CodeMirror API.
         * @see {@link https://codemirror.net/doc/manual.html#api_configuration|CodeMirror Docs}
         */
        editorProps: PT.object,

        /** True to show Fullscreen + Auto-format buttons at top-right of input. */
        showActionButtons: PT.bool
    };

    baseClassName = 'xh-json-input';

    render() {
        const {props} = this;
        return codeInput({
            linter: function(text) {
                const found = [];

                jsonlint.parseError = function(str, hash) {
                    const loc = hash.loc;
                    found.push({
                        from: codemirror.Pos(loc.first_line - 1, loc.first_column),
                        to: codemirror.Pos(loc.last_line - 1, loc.last_column),
                        message: str
                    });
                };

                if (!text) return found;

                try {
                    jsonlint.parse(text);
                } catch (ignored) {}

                return found;
            },
            formatter: (str) => JSON.stringify(JSON.parse(str), undefined, 2),
            mode: 'application/json',
            showFullscreenButton: this.showActionButtons,
            showFormatButton: this.showActionButtons,
            ...props
        });
    }
}
export const jsonInput = elemFactory(JsonInput);