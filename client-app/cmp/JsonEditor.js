import {Controlled as CodeMirror} from 'react-codemirror2';
import js from 'codemirror/mode/javascript/javascript';
import 'codemirror/lib/codemirror.css';
import {elemFactory} from 'hoist';


export const jsonEditor = elemFactory(CodeMirror);