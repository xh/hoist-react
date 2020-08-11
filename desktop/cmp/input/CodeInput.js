/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInput} from '@xh/hoist/cmp/input';
import {box, filler, fragment, hbox, label} from '@xh/hoist/cmp/layout';
import {textInput} from '@xh/hoist/desktop/cmp/input/TextInput';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {elemFactory, HoistComponent, LayoutSupport, XH} from '@xh/hoist/core';
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
    /** CodeMirror SearchCursor add-on */
    cursor;
    @bindable query;
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
         * True to enable case-insensitive search tool for input. When set to true, showToolbar
         * will also default to true.
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
        showFullscreenButton: PT.bool,

        /** True to display action buttons and/or find functionality in toolbar below input. */
        showToolbar: PT.bool
    };

    get commitOnChange() {return withDefault(this.props.commitOnChange, true)}
    get enableSearch() {return withDefault(this.props.enableSearch, false)}
    get showCopyButton() {return withDefault(this.props.showCopyButton, false)}
    get showFullscreenButton() {return withDefault(this.props.showFullscreenButton, true)}
    get showToolbar() {return withDefault(this.props.showToolbar, this.props.enableSearch)}

    get showFormatButton() {
        const {disabled, readonly, formatter, showFormatButton} = this.props;
        return (
            !disabled &&
            !readonly &&
            isFunction(formatter) &&
            withDefault(showFormatButton, true)
        );
    }

    get actionButtons() {
        const {showCopyButton, showFormatButton, showFullscreenButton, fullScreen, editor} = this;
        if (!showCopyButton && !showFormatButton && !showFullscreenButton) {
            return null;
        }

        return [
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
                icon: this.fullScreen ? Icon.collapse() : Icon.expand(),
                title: this.fullScreen ? 'Exit full screen' : 'Full screen',
                onClick: () => this.setFullScreen(!fullScreen)
            }) : null
        ];
    }

    get searchInput() {
        const {enableSearch, fullScreen, query, match, matches, selectedMatches} = this;

        if (!enableSearch && !fullScreen) return null;

        return [
            textInput({
                flex: 1,
                model: this,
                bind: 'query',
                leftIcon: Icon.search(),
                enableClear: true,
                commitOnChange: true,
                onKeyDown: (e) => {
                    if (e.key == 'Enter') {
                        if (!e.shiftKey) {
                            if (isNull(matches)) {
                                this.findAll();
                            } else {
                                this.findNext();
                            }
                        } else {
                            this.findPrevious();
                        }
                    }
                }
            }),
            label({
                className: 'xh-code-input__label',
                item: (isNull(matches) || !query) ? '0 results' : `${match} / ${matches}`
            }),
            button({
                icon: Icon.arrowUp(),
                title: 'Find previous',
                disabled: selectedMatches?.length <= 1,
                onClick: () => isNull(matches) ? this.findAll() : this.findPrevious()
            }),
            button({
                icon: Icon.arrowDown(),
                title: 'Find next',
                disabled: selectedMatches?.length <= 1,
                onClick: () => isNull(matches) ? this.findAll() : this.findNext()
            })
        ];
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
            },
            fireImmediately: true,
            debounce: 300
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
                this.showToolbar || this.fullScreen ? this.renderToolbar() : this.renderActionButtons()
            ],
            className: this.getClassName(),
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            ...props
        });
    }

    renderToolbar() {
        const showSearch = this.enableSearch || this.fullScreen;

        return toolbar({
            className: 'xh-code-input__toolbar',
            items: [
                showSearch ? null : filler(),
                ...(this.searchInput ?? []),
                showSearch ? toolbarSep() : null,
                ...(this.actionButtons ?? [])
            ]
        });
    }

    renderActionButtons() {
        if (!this.hasFocus) {
            return null;
        }

        return hbox({
            className: 'xh-code-input__action-buttons',
            items: this.actionButtons
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

    findAll() {
        if (!this.query) return;

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
            this.findNext();
        } else {
            this.setMatch(0);
        }
    }

    findNext() {
        if (!this.cursor) return;

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
    }

    findPrevious() {
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
    }

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
