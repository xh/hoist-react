import ReactDOM from 'react-dom';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {PropTypes as PT} from 'prop-types';
import {defaultsDeep} from 'lodash';
import {div} from '@xh/hoist/cmp/layout';
import {textArea} from '@xh/hoist/kit/blueprint';

import {HoistField} from './HoistField';

import 'codemirror/lib/codemirror.css';
import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/scroll/simplescrollbars.css';
import 'codemirror/addon/lint/lint.css';
import 'codemirror/theme/dracula.css';

import * as codemirror from 'codemirror';
import {jsonlint} from './impl/jsonlint';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/mode/jsx/jsx';
import 'codemirror/addon/fold/foldcode.js';
import 'codemirror/addon/fold/foldgutter.js';
import 'codemirror/addon/fold/brace-fold.js';
import 'codemirror/addon/scroll/simplescrollbars.js';
import 'codemirror/addon/lint/lint.js';

import './JsonField.scss';

/**
 * A field for editing and validating JSON, providing a mini-IDE style editor powered by CodeMirror.
 */
@HoistComponent()
export class JsonField extends HoistField {

    static propTypes = {
        ...HoistField.propTypes,

        /** Value of the control */
        value: PT.string,
        
        /** width of field, in pixels */
        width: PT.number,
        /** height of field, in pixels */
        height: PT.number,
        /**
         * Configuration object with any properties supported by the CodeMirror api.
         * @see {@link https://codemirror.net/doc/manual.html#api_configuration|CodeMirror Docs}
         */
        editorProps: PT.object
    };

    constructor() {
        super();
        this.addReaction({
            track: () => XH.darkTheme,
            run: () => {
                const {editor} = this;
                if (editor) editor.setOption('theme', XH.darkTheme ? 'dracula' : 'default');
            }
        });
    }

    editor = null;
    taCmp = null;

    baseClassName = 'xh-json-field';

    render() {
        return div({
            className: this.getClassName(),
            item: textArea({
                value: this.renderValue || '',
                onChange: this.onChange,
                ref: this.manageJsonEditor
            })
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
        const {editorProps, width, height} = this.props,
            editorSpec = defaultsDeep(
                editorProps,
                this.createDefaults()
            );

        const taDom = ReactDOM.findDOMNode(taCmp),
            editor = codemirror.fromTextArea(taDom, editorSpec);

        editor.on('change', this.handleEditorChange);
        editor.on('focus',  this.onFocus);
        editor.on('blur',  this.onBlur);
        editor.on('keyup',  this.onKeyUp);

        if (width != null || height != null) {
            editor.setSize(width, height);
        }

        return editor;
    }

    createDefaults() {
        const {disabled} = this.props;
        return {
            mode: 'application/json',
            theme: XH.darkTheme ? 'dracula' : 'default',
            lineWrapping: false,
            lineNumbers: true,
            autoCloseBrackets: true,
            extraKeys: {
                'Cmd-P': this.onFormatKey,
                'Ctrl-P': this.onFormatKey
            },
            foldGutter: true,
            scrollbarStyle: 'simple',
            readOnly: disabled,
            gutters: [
                'CodeMirror-linenumbers',
                'CodeMirror-foldgutter'
            ],
            lint: true
        };
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

    // CodeMirror docs: If you dynamically create and destroy editors made with `fromTextArea`
    // ...you should make sure to call `toTextArea` to remove the editor
    destroy() {
        if (this.editor) this.editor.toTextArea();
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
    jsonlint.parseError = function(str, hash) {
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