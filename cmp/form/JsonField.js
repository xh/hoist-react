import ReactDOM from 'react-dom';
import {isUndefined} from 'lodash';
import {textArea} from 'hoist/kit/blueprint';

import {HoistField} from './HoistField';
import {elemFactory, hoistComponent} from 'hoist/core';

import 'codemirror/lib/codemirror.css';
import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/scroll/simplescrollbars.css';
import 'codemirror/addon/lint/lint.css';
import 'codemirror/theme/dracula.css';

import * as codemirror from 'codemirror';
import * as jsonlint from 'jsonlint-mod-fix';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/addon/fold/foldcode.js';
import 'codemirror/addon/fold/foldgutter.js';
import 'codemirror/addon/fold/brace-fold.js';
import 'codemirror/addon/scroll/simplescrollbars.js';
import 'codemirror/addon/lint/lint.js';

import './JsonField.css';


/**
 *   A JSON Editor
 *
 * @prop rest, see general properties for HoistField
 *
 * @prop width, width of field, in pixels
 * @prop height, width of field, in pixels
 */
@hoistComponent()
export class JsonField extends HoistField {

    editor = null;
    taCmp = null;

    render() {
        return textArea({
            value: this.renderValue || '',
            onChange: this.onChange,
            ref: this.manageJsonEditor
        });
    }

    //------------------
    // Implementation
    //------------------
    manageJsonEditor = (taCmp) => {
        if (taCmp) {
            this.taCmp = taCmp;
            this.editor = this.createJsonEditor(taCmp);
        }
    }

    createJsonEditor(taCmp) {
        const editorSpec = {
            theme: this.darkTheme ? 'dracula' : 'default',
            mode: 'application/json',
            lineNumbers: true,
            autoCloseBrackets: true,
            extraKeys: {
                'Cmd-P': this.onFormatKey,
                'Ctrl-P': this.onFormatKey
            },
            foldGutter: true,
            scrollbarStyle: 'simple',
            gutters: [
                'CodeMirror-linenumbers',
                'CodeMirror-foldgutter',
                'CodeMirror-lint-markers'
            ],
            readOnly: this.props.disabled,
            lint: true
        };
        
        const props = this.props,
            taDom = ReactDOM.findDOMNode(taCmp),
            editor = codemirror.fromTextArea(taDom, editorSpec);

        editor.on('change', this.handleEditorChange);
        editor.on('focus',  this.onFocus);
        editor.on('blur',  this.onBlur);
        editor.on('keyup',  this.onKeyUp);
        this.model.setCodeMirrorInstance(editor);

        let {height, width} = props;
        if (!(isUndefined(height) && isUndefined(width))) {
            width = isUndefined(width) ? null : width;
            height = isUndefined(height) ? null : height;
            editor.setSize(width, height);
        }
        return editor;
    }

    onKeyUp = (instance, ev) => {
        if (ev.key === 'Enter' && !ev.shiftKey) this.doCommit();
    }

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
    }

    handleEditorChange = (editor) => {
        this.noteValueChange(editor.getValue());
    }
    
    onFormatKey = () => {
        const editor = this.editor,
            val = this.tryPrettyPrint(editor.getValue());

        editor.setValue(val);
    }

    tryPrettyPrint(str) {
        try {
            return JSON.stringify(JSON.parse(str), undefined, 2);
        } catch (e) {
            return str;
        }
    }
}
export const jsonField = elemFactory(JsonField);


//------------------------------------------------------------------------------------------------------
// see https://codemirror.net/demo/lint.html for demo implementation of linting on a codemirror editor
//     this function is taken from /addon/lint/json-lint.js which did not work with
//     'jsonlint-mod-fix' (which is a fork of jsonlint, adapted to work with modules).
//------------------------------------------------------------------------------------------------------
codemirror.registerHelper('lint', 'json', function(text) {
    var found = [];
    jsonlint.parser.parseError = function(str, hash) {
        var loc = hash.loc;
        found.push({
            from: codemirror.Pos(loc.first_line - 1, loc.first_column),
            to: codemirror.Pos(loc.last_line - 1, loc.last_column),
            message: str
        });
    };
    if (!text) return found;

    try {
        jsonlint.parse(text);
    } catch (e) {

    }
    return found;
});