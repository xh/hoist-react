/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {form, FormModel} from '@xh/hoist/cmp/form';
import {HoistInput} from '@xh/hoist/cmp/input';
import {box, fragment, hbox, label} from '@xh/hoist/cmp/layout';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {textInput} from '@xh/hoist/desktop/cmp/input/TextInput';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {elemFactory, HoistComponent, LayoutSupport, managed, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {clipboardButton} from '@xh/hoist/desktop/cmp/clipboard';
import {Icon} from '@xh/hoist/icon';
import {dialog, textArea} from '@xh/hoist/kit/blueprint';
import {bindable} from '@xh/hoist/mobx';
import {withDefault} from '@xh/hoist/utils/js';
import * as codemirror from 'codemirror';
import 'codemirror/addon/fold/brace-fold.js';
import 'codemirror/addon/fold/foldcode.js';
import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/fold/foldgutter.js';
import 'codemirror/addon/lint/lint.css';
import 'codemirror/addon/lint/lint.js';
import 'codemirror/addon/scroll/simplescrollbars.css';
import 'codemirror/addon/scroll/simplescrollbars.js';
import 'codemirror/addon/search/searchcursor.js';
import 'codemirror/addon/selection/mark-selection.js';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import {defaultsDeep, isEqual, isFunction, isNull} from 'lodash';
import PT from 'prop-types';
import ReactDOM from 'react-dom';
import './CodeInput.scss';

/**
 * Code-editor style input, powered by CodeMirror. Displays a gutter with line numbers, mono-spaced
 * styling, and custom key handlers (e.g. tab to indent). Can be customized with options and
 * language modes supported by the underlying CodeMirror library {@link https://codemirror.net/}.
 *
 * Note Hoist also provides a preconfigured {@see JsonInput} component for editing JSON.
 *
 * TODO - understanding sizing spec / requirements for component vs. generated CodeMirror.
 * Reconcile LayoutSupport with width/height props. https://github.com/xh/hoist-react/issues/327
 */
@HoistComponent
@LayoutSupport
export class CodeInput extends HoistInput {

    /** @member {CodeMirror} - a CodeMirror editor instance. */
    editor;
    /** @member {FormModel} */
    @managed formModel = new FormModel({fields: [{name: 'query'}]});
    /** CodeMirror SearchCursor add-on */
    cursor;
    @bindable showToolbar = false;
    @bindable match = null;
    @bindable matches = null;
    selectedMatches = [];

    @bindable fullScreen = false;
    baseClassName = 'xh-code-input';

    static propTypes = {
        ...HoistInput.propTypes,

        /** True to focus the control on render. */
        autoFocus: PT.bool,

        /** True to commit on every change/keystroke, default false. */
        commitOnChange: PT.bool,

        /**
         * Configuration object with any properties supported by the CodeMirror API.
         * @see {@link https://codemirror.net/doc/manual.html#api_configuration|CodeMirror Docs}
         */
        editorProps: PT.object,

        /**
         * True to display Search button at bottom-right of input. When clicked, it will expand
         * to a toolbar component at the bottom-right of input. Will collapse when search input is
         * cleared. Search is case-insensitive.
         */
        enableSearch: PT.bool,

        /**
         * Callback to autoformat the code. Given the unformatted code, this should return a
         * properly-formatted copy.
         */
        formatter: PT.func,

        /** A CodeMirror linter to provide error detection and hinting in the gutter. */
        linter: PT.func,

        /**
         * A CodeMirror language mode - default none (plain-text).
         * See the CodeMirror docs ({@link https://codemirror.net/mode/}) regarding available modes.
         * Applications must import any mode they wish to enable.
         */
        mode: PT.string,

        /**
         * True to prevent user modification of editor contents, while still allowing user to
         * focus, select, and copy contents.
         */
        readonly: PT.bool,

        /** True to display a copy button at bottom-right of input. */
        showCopyButton: PT.bool,

        /**
         * True (default) to display autoformat button at bottom-right of input. Requires a
         * `formatter` to be configured and content to be editable (!readonly, !disabled).
         */
        showFormatButton: PT.bool,

        /** True (default) to display Fullscreen button at bottom-right of input. */
        showFullscreenButton: PT.bool
    };

    get commitOnChange() {return withDefault(this.props.commitOnChange, true)}
    get showCopyButton() {return withDefault(this.props.showCopyButton, false)}
    get showFullscreenButton() {return withDefault(this.props.showFullscreenButton, true)}
    get enableSearch() {return withDefault(this.props.enableSearch, false)}
    get query() {return this.formModel.values.query}

    get showFormatButton() {
        const {disabled, readonly, formatter, showFormatButton} = this.props;
        return (
            !disabled &&
            !readonly &&
            isFunction(formatter) &&
            withDefault(showFormatButton, true)
        );
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

        this.addReaction({
            track: () => [this.props.readonly, this.props.disabled],
            run: (arr) => {
                const [readonly, disabled] = arr;
                this.editor.setOption('readOnly',  disabled || readonly);
            }
        });

        this.addReaction({
            track: () => this.query,
            run: (query) => {
                if (!query) {
                    this.clearSearchResults();
                } else {
                    this.findAll();
                }
            }
        });
    }

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
                this.enableSearch ? this.renderToolbar() : this.renderActionButtons()
            ],
            className: this.getClassName(),
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            ...props
        });
    }

    renderToolbar() {
        const {editor, match, matches, showCopyButton, showFormatButton, showFullscreenButton,
            formModel, hasFocus, fullScreen, showToolbar} = this;
        if (!hasFocus) return null;

        if (!showToolbar) {
            return this.renderActionButtons();
        } else {
            return hbox({
                className: 'xh-code-input__toolbar',
                item: toolbar({
                    items: [
                        form({
                            model: formModel,
                            items: [
                                formField({
                                    field: 'query',
                                    label: null,
                                    item: textInput({
                                        leftIcon: Icon.search(),
                                        width: 150,
                                        enableClear: true,
                                        rightElement: hbox(
                                            label({
                                                className: 'xh-code-input__label',
                                                omit: isNull(matches),
                                                item: `${match} / ${matches}`
                                            }),
                                            button({
                                                icon: Icon.cross(),
                                                omit: !this.query,
                                                tabIndex: -1,
                                                minimal: true,
                                                onClick: () => {
                                                    formModel.fields.query.setValue(null);
                                                    this.setShowToolbar(false);
                                                }
                                            })
                                        ),
                                        onKeyDown: (e) => {
                                            if (e.key == 'Enter') {
                                                if (!e.shiftKey) {
                                                    if (isNull(matches)) this.findAll();
                                                    else this.findNext();
                                                } else {
                                                    this.findPrevious();
                                                }
                                            }
                                        }
                                    })
                                }),
                                button({
                                    icon: Icon.arrowUp(),
                                    title: 'Find previous',
                                    onClick: () => {
                                        if (isNull(matches)) this.findAll();
                                        else this.findPrevious();
                                    }
                                }),
                                button({
                                    icon: Icon.arrowDown(),
                                    title: 'Find next',
                                    onClick: () => {
                                        if (isNull(matches)) this.findAll();
                                        else this.findNext();
                                    }
                                })
                            ]
                        }),
                        (showCopyButton || showFormatButton || showFullscreenButton) ? toolbarSep() : null,
                        showCopyButton ? clipboardButton({
                            text: null,
                            title: 'Copy to clipboard',
                            successMessage: 'Contents copied to clipboard',
                            getCopyText: () => editor.getValue()
                        }) : null,
                        showFormatButton ? button({
                            icon: Icon.magic(),
                            title: 'Auto-format',
                            onClick: () => this.onAutoFormat()
                        }) : null,
                        showFullscreenButton ? button({
                            icon: fullScreen ? Icon.collapse() : Icon.expand(),
                            title: fullScreen ? 'Exit full screen' : 'Full screen',
                            onClick: () => this.setFullScreen(!fullScreen)
                        }) : null
                    ]
                })
            });
        }
    }

    renderActionButtons() {
        const {showCopyButton, showFormatButton, showFullscreenButton, showToolbar, enableSearch} = this;

        if (!this.hasFocus || (!showCopyButton && !showFormatButton && !showFullscreenButton)) {
            return null;
        }

        const {fullScreen, editor} = this;

        return hbox({
            className: 'xh-code-input__action-buttons',
            items: [
                enableSearch ? button({
                    icon: Icon.search(),
                    title: 'Search',
                    minimal: true,
                    onClick: () => this.setShowToolbar(!showToolbar)
                }) : null,
                showCopyButton ? clipboardButton({
                    text: null,
                    title: 'Copy to clipboard',
                    successMessage: 'Contents copied to clipboard',
                    getCopyText: () => editor.getValue()
                }) : null,
                showFormatButton ? button({
                    icon: Icon.magic(),
                    title: 'Auto-format',
                    onClick: () => this.onAutoFormat()
                }) : null,
                showFullscreenButton ? button({
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

    manageCodeEditor = (textAreaComp) => {
        if (textAreaComp) {
            this.editor = this.createCodeEditor(textAreaComp);
            this.preserveSearchResults();
        }
    };

    createCodeEditor(textAreaComp) {
        const {editorProps, width, height} = this.props,
            editorSpec = defaultsDeep(
                editorProps,
                this.createDefaults()
            );

        const taDom = ReactDOM.findDOMNode(textAreaComp),
            editor = codemirror.fromTextArea(taDom, editorSpec);

        editor.on('change', this.handleEditorChange);

        if (width != null || height != null) {
            editor.setSize(width, height);
        }

        return editor;
    }

    createDefaults() {
        const {disabled, readonly, mode, linter, autoFocus} = this.props;
        let gutters = [
            'CodeMirror-linenumbers',
            'CodeMirror-foldgutter'
        ];
        if (linter) gutters.push('CodeMirror-lint-markers');

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
            readOnly: disabled || readonly,
            gutters,
            lint: linter ? {getAnnotations: linter} : false,
            autoFocus
        };
    }

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
    };

    handleEditorChange = (editor) => {
        this.noteValueChange(editor.getValue());
        if (this.cursor) this.clearSearchResults();
    };

    onAutoFormat = () => {
        if (!isFunction(this.props.formatter)) return;

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

    findAll = () => {
        this.clearSearchResults();
        this.cursor = this.editor.getSearchCursor(this.query, 0, true);

        const {cursor, editor, selectedMatches} = this;
        while (cursor.findNext()) {
            const anchor = cursor.from(),
                head = cursor.to();
            selectedMatches.push({
                anchor,
                head,
                textMarker: editor.markText(anchor, head, {className: 'xh-code-input--highlight'})
            });
        }
        const matchLength = selectedMatches.length;
        this.setMatches(matchLength);

        if (matchLength) {
            const first = selectedMatches[0];
            editor.scrollIntoView({from: first.anchor, to: first.head}, 50);
            editor.setSelection(first.anchor, first.head);
            this.setMatch(1);
        } else {
            this.setMatch(0);
        }
    }

    findNext = () => {
        if (!this.cursor || !this.query) return;

        const {editor, query, cursor, selectedMatches} = this,
            matchLength = selectedMatches.length,
            found = cursor.findNext(query);
        if (found) {
            const from = cursor.from(),
                to = cursor.to();
            editor.scrollIntoView({from, to}, 50);
            editor.setSelection(from, to);
            this.setMatch(1 + selectedMatches.findIndex(match => isEqual(match.anchor, from)));
        } else if (matchLength) {
            this.cursor = editor.getSearchCursor(query, 0, true);
            this.findNext();
        }
    };

    findPrevious = () => {
        if (!this.cursor) return;

        const {editor, query, cursor, selectedMatches} = this,
            matchLength = selectedMatches.length,
            found = cursor.findPrevious(query);
        if (found) {
            const from = cursor.from(),
                to = cursor.to();
            editor.scrollIntoView({from, to}, 50);
            editor.setSelection(from, to);
            this.setMatch(1 + selectedMatches.findIndex(match => isEqual(match.anchor, from)));
        } else if (matchLength) {
            this.cursor = editor.getSearchCursor(query, selectedMatches[matchLength - 1].head, true);
            this.findPrevious();
        }
    };

    preserveSearchResults() {
        const {selectedMatches, editor} = this;
        if (selectedMatches.length) {
            selectedMatches.forEach(match => {
                match.textMarker = editor.markText(match.anchor, match.head, {className: 'xh-code-input--highlight'});
            });
        }
    }

    clearSearchResults() {
        this.cursor = null;
        this.setMatches(null);
        this.setMatch(null);
        this.selectedMatches.forEach(match => match.textMarker.clear());
        this.selectedMatches = [];
    }

    destroy() {
        // Cleanup editor component as per CodeMirror docs.
        if (this.editor) this.editor.toTextArea();
    }
}
export const codeInput = elemFactory(CodeInput);
