import {Component} from 'react';
import ReactDOM from 'react-dom';
import {action, observable, observer} from 'hoist/mobx';
import {defaults, isUndefined} from 'lodash';

import {textArea} from 'hoist/kit/blueprint';

import * as codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/scroll/simplescrollbars.css';
import './JsonEditor.css';

import {elemFactory} from 'hoist/core';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/addon/fold/foldcode.js';
import 'codemirror/addon/fold/foldgutter.js';
import 'codemirror/addon/fold/brace-fold.js';

import 'codemirror/addon/scroll/simplescrollbars.js';


@observer
export class JsonEditor extends Component {

    editor = null
    taCmp = null
    @observable value = this.props.value

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
            'CodeMirror-foldgutter'
        ],
        readOnly: false
    }

    render() {

        const {jsonEditorSpec, ...rest} = this.props;
        return textArea({...rest, ref: this.manageJsonEditor});
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

        this.editor = codemirror.fromTextArea(taDom, jsonEditorSpec);
        this.setSize();
        this.addListeners();

    }

    destroyJsonEditor() {

    }

    setSize = () => {
        if (!(isUndefined(this.props.height) && isUndefined(this.props.width))) {
            const width = isUndefined(this.props.width) ? null : this.props.width,
                height = isUndefined(this.props.height) ? null : this.props.height;
            this.editor.setSize(width, height);
        }
    }

    addListeners() {
        this.editor.on('change', this.handleEditorChange.bind(this));
    }

    @action
    handleEditorChange = (editor) => {
        this.props.model.value = editor.getValue();
    }

    format() {
        var value = this.tryPrettyPrint(this.editor.getValue());
        this.editor.setValue(value);
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