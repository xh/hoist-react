import {Component} from 'react';
import {action, observable, observer} from 'hoist/mobx';
import {defaults, omit} from 'lodash';

import 'codemirror/lib/codemirror.css';
import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/scroll/simplescrollbars.css';
import './JsonEditor.css';

import {elem, elemFactory} from 'hoist';

import {Controlled as CodeMirror} from 'react-codemirror2';
import 'codemirror/mode/javascript/javascript.js';

import 'codemirror/addon/fold/foldcode.js';
import 'codemirror/addon/fold/foldgutter.js';
import 'codemirror/addon/fold/brace-fold.js';

import 'codemirror/addon/scroll/simplescrollbars.js';


@observer
export class JsonEditor extends Component {

    editorProps = null

    @observable value = this.props.value

    defaultCodeMirrorOptions = {
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

    defaultCodeMirrorCmpProps = {
        onBeforeChange: this.onBeforeChange.bind(this)
    }


    render() {
        const codeMirrorOptions = defaults(this.props.codeMirrorOptions, this.defaultCodeMirrorOptions);
        // delete this.props.codeMirrorOptions;

        this.editorProps = defaults(
            {
                options: codeMirrorOptions
            },
            omit(this.props, ['codeMirrorOptions']),
            this.defaultCodeMirrorCmpProps
        );
        this.editorProps.value = this.value;

        return elem(CodeMirror, this.editorProps);
    }

    //------------------
    // Implementation
    //------------------
    @action
    onBeforeChange = (editor, data, value) => {
        this.value = value;
    }

    @action
    format() {
        var value = this.tryPrettyPrint(this.value);
        this.value = value;
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