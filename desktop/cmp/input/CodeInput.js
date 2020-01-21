/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import ReactDOM from 'react-dom';
import {XH, elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {fragment, box, hbox} from '@xh/hoist/cmp/layout';
import {textArea, dialog} from '@xh/hoist/kit/blueprint';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';
import PT from 'prop-types';
import {defaultsDeep} from 'lodash';

import {HoistInput} from '@xh/hoist/cmp/input';

import 'codemirror/lib/codemirror.css';
import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/scroll/simplescrollbars.css';
import 'codemirror/addon/lint/lint.css';
import 'codemirror/theme/dracula.css';

import * as codemirror from 'codemirror';
import 'codemirror/addon/fold/foldcode.js';
import 'codemirror/addon/fold/foldgutter.js';
import 'codemirror/addon/fold/brace-fold.js';
import 'codemirror/addon/scroll/simplescrollbars.js';
import 'codemirror/addon/lint/lint.js';

import './CodeInput.scss';

/**
 * Code-editor style input, powered by CodeMirror.
 *
 * TODO - understanding sizing spec / requirements for component vs. generated CodeMirror.
 * Reconcile LayoutSupport with width/height props. https://github.com/xh/hoist-react/issues/327
 */
@HoistComponent
@LayoutSupport
export class CodeInput extends HoistInput {

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
        showActionButtons: PT.bool,

        /** A CodeMirror linter. */
        linter: PT.func,

        /**
         * Callback to autoformat the code. Given the unformatted code, this should return a
         * properly-formatted copy.
         */
        formatter: PT.func,

        /** True to display Fullscreen button at top-right of input. */
        showFullscreenButton: PT.bool,

        /** True to display autoformat button at top-right of input. */
        showFormatButton: PT.bool,

        /** Select the CodeMirror mode. */
        mode: PT.string
    };

    get commitOnChange() {
        return withDefault(this.props.commitOnChange, true);
    }

    get showFullscreenButton() {
        return withDefault(this.props.showFullscreenButton, true);
    }

    get showFormatButton() {
        return withDefault(this.props.showFormatButton, !!this.props.formatter);
    }

    constructor(props, context) {
        super(props, context);
        this.addReaction({
            track: () => XH.darkTheme,
            run: () => {
                const {editor} = this;
                if (editor) editor.setOption('theme', XH.darkTheme ? 'dracula' : 'default');
            }
        });
        this.addReaction({
            track: () => this.renderValue,
            run: (value) => {
                const {editor} = this;
                if (editor && editor.getValue() != value) {
                    // CodeMirror will throw on null value.
                    editor.setValue(value == null ? '' : value);
                }
            }
        });
    }

    editor = null;
    baseClassName = 'xh-code-input';

    render() {
        const {width, height, ...layoutProps} = this.getLayoutProps(),
            props = {
                ...layoutProps,
                width: withDefault(width, 300),
                height: withDefault(height, 100)
            };

        return this.fullScreen ? this.renderFullscreen(props) : this.renderInput(props);
    }

    renderFullscreen(props) {
        return fragment(
            dialog({
                className: 'xh-code-input--dialog',
                isOpen: true,
                canOutsideClickClose: true,
                item: this.renderInput({flex: 1}),
                onClose: () => this.setFullScreen(false)
            }),
            box({
                className: 'xh-code-input--placeholder',
                ...props
            })
        );
    }

    renderInput(props) {
        return box({
            items: [
                textArea({
                    value: this.renderValue || '',
                    ref: this.manageCodeEditor,
                    onChange: this.onChange
                }),
                this.renderActionButtons()
            ],

            className: this.getClassName(),
            onBlur: this.onBlur,
            onFocus: this.onFocus,

            ...props
        });
    }

    renderActionButtons() {
        if (!this.hasFocus || (!this.showFormatButton && !this.showFullscreenButton)) return null;
        const {fullScreen} = this;
        return hbox({
            className: 'xh-code-input__action-buttons',
            items: [
                this.showFullscreenButton ? button({
                    icon: Icon.code(),
                    title: 'Auto-format',
                    onClick: () => this.onAutoFormat()
                }) : null,
                this.showFormatButton ? button({
                    icon: fullScreen ? Icon.collapse() : Icon.expand(),
                    title: fullScreen ? 'Exit full screen' : 'Full screen',
                    onClick: () => this.setFullScreen(!fullScreen)
                }) : null
            ]
        });
    }

    //------------------
    // Implementation
    //------------------
    manageCodeEditor = (taCmp) => {
        if (taCmp) {
            this.editor = this.createCodeEditor(taCmp);
        }
    }

    createCodeEditor(taCmp) {
        const {editorProps, width, height} = this.props,
            editorSpec = defaultsDeep(
                editorProps,
                this.createDefaults()
            );

        const taDom = ReactDOM.findDOMNode(taCmp),
            editor = codemirror.fromTextArea(taDom, editorSpec);

        editor.on('change', this.handleEditorChange);

        if (width != null || height != null) {
            editor.setSize(width, height);
        }

        return editor;
    }

    createDefaults() {
        const {disabled, mode, linter} = this.props;
        return {
            mode,
            theme: XH.darkTheme ? 'dracula' : 'default',
            lineWrapping: false,
            lineNumbers: true,
            autoCloseBrackets: true,
            extraKeys: {
                'Cmd-P': this.onAutoFormat,
                'Ctrl-P': this.onAutoFormat
            },
            foldGutter: true,
            scrollbarStyle: 'simple',
            readOnly: disabled ? 'nocursor' : false,
            gutters: [
                'CodeMirror-linenumbers',
                'CodeMirror-foldgutter',
                linter ? 'CodeMirror-lint-markers' : null
            ],
            lint: linter ? {getAnnotations: linter} : false
        };
    }

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
    };

    handleEditorChange = (editor) => {
        this.noteValueChange(editor.getValue());
    };

    onAutoFormat = () => {
        const editor = this.editor,
            val = this.tryPrettyPrint(editor.getValue());

        editor.setValue(val);
    };

    tryPrettyPrint(str) {
        try {
            return this.props.formatter(str);
        } catch (e) {
            return str;
        }
    }

    destroy() {
        // Cleanup editor component as per CodeMirror docs.
        if (this.editor) this.editor.toTextArea();
    }
}
export const codeInput = elemFactory(CodeInput);