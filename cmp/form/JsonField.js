import {Component} from 'react';
import ReactDOM from 'react-dom';
import {action, observer} from 'hoist/mobx';
import {defaults, isUndefined} from 'lodash';

import {textAreaField} from 'hoist/cmp';
import {elemFactory} from 'hoist/core';

import 'codemirror/lib/codemirror.css';
import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/scroll/simplescrollbars.css';
import 'codemirror/addon/lint/lint.css';
import './JsonEditor.css';

import * as codemirror from 'codemirror';
import * as jsonlint from 'jsonlint-mod-fix';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/addon/fold/foldcode.js';
import 'codemirror/addon/fold/foldgutter.js';
import 'codemirror/addon/fold/brace-fold.js';
import 'codemirror/addon/scroll/simplescrollbars.js';
import 'codemirror/addon/lint/lint.js';

@hoistComponent
export class JsonEditor extends Component {

    editor = null
    taCmp = null

    defaultJsonEditorSpec = {
        mode: 'application/json',
        lineNumbers: true,
        autoCloseBrackets: true,
        extraKeys: {
            'Cmd-P': this.format.bind(this),
            'Ctrl-P': this.format.bind(this)
        },
        foldGutter: true,
        scrollbarStyle: 'simple',
        gutters: [
            'CodeMirror-linenumbers',
            'CodeMirror-foldgutter',
            'CodeMirror-lint-markers'
        ],
        readOnly: false,
        lint: true
    };

    render() {
        const {jsonEditorSpec, ...rest} = this.props;
        return textAreaField({...rest, ref: this.manageJsonEditor});
    }

    //------------------
    // Implementation
    //------------------
    manageJsonEditor = (taCmp) => {
        if (taCmp) {
            this.taCmp = taCmp;
            this.createJsonEditor(taCmp);
        } else {
            this.destroyJsonEditor();
        }
    }

    createJsonEditor(taCmp) {
        const taDom = ReactDOM.findDOMNode(taCmp),
            jsonEditorSpec = defaults(this.props.jsonEditorSpec, this.defaultJsonEditorSpec);

        this.addLinter();
        this.editor = codemirror.fromTextArea(taDom, jsonEditorSpec);
        this.editor.on('change', this.handleEditorChange);
        this.setSize();
    }

    destroyJsonEditor() {

    }

    setSize() {
        if (!(isUndefined(this.props.height) && isUndefined(this.props.width))) {
            const width = isUndefined(this.props.width) ? null : this.props.width,
                height = isUndefined(this.props.height) ? null : this.props.height;
            this.editor.setSize(width, height);
        }
    }

    addLinter() {
        // see https://codemirror.net/demo/lint.html for demo implementation of linting on a codemirror editor
        //     this function is taken from /addon/lint/json-lint.js which did not work with
        //     'jsonlint-mod-fix' (which is a fork of jsonlint, adapted to work with modules).

        // todo: figure out how not to register this helper for each generated json field.
        //       not a big deal that it currently does, the function just overwrites the previous one,
        //       but is a little sloppy.
        codemirror.registerHelper('lint', 'json', function(text) {
            var found = [];

            jsonlint.parser.parseError = function(str, hash) {
                var loc = hash.loc;
                found.push({from: codemirror.Pos(loc.first_line - 1, loc.first_column),
                    to: codemirror.Pos(loc.last_line - 1, loc.last_column),
                    message: str});
            };
            if (!text) return found;

            try {
                jsonlint.parse(text);
            } catch (e) {}

            return found;
        });
    }

    handleEditorChange = (editor) => {
        this.model.setValue(editor.getValue());
    }

    format() {
        var val = this.tryPrettyPrint(this.editor.getValue());
        this.editor.setValue(val);
    }

    tryPrettyPrint(str) {
        try {
            return JSON.stringify(JSON.parse(str), undefined, 2);
        } catch (e) {
            return str;
        }
    }
}

export const jsonEditor = elemFactory(JsonEditor);