import 'codemirror/lib/codemirror.css';
import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/lint/lint.css';
import 'codemirror/addon/scroll/simplescrollbars.css';
import './JsonEditor.css';

import {elemFactory} from 'hoist';

import {Controlled as CodeMirror} from 'react-codemirror2';
import 'codemirror/mode/javascript/javascript.js';

import 'codemirror/addon/fold/foldcode.js';
import 'codemirror/addon/fold/foldgutter.js';
import 'codemirror/addon/fold/brace-fold.js';


import 'codemirror/addon/lint/lint.js';
import 'codemirror/addon/lint/json-lint.js';

import 'codemirror/addon/scroll/simplescrollbars.js';


export const jsonEditor = elemFactory(CodeMirror, {
    options: {
        mode: 'application/json',
        lineNumbers: true,
        autoCloseBrackets: true,
        extraKeys: {'Ctrl-Q': function(cm) { cm.foldCode(cm.getCursor())}},
        foldGutter: true,
        scrollbarStyle: 'simple',
        gutters: [
            'CodeMirror-linenumbers',
            'CodeMirror-foldgutter'
        ],
        lint: true
    }
});