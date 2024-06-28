/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {box, div, filler, fragment, frame, hbox, label, span, vbox} from '@xh/hoist/cmp/layout';
import {
    BoxProps,
    hoistCmp,
    HoistProps,
    LayoutProps,
    managed,
    PlainObject,
    XH
} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {clipboardButton} from '@xh/hoist/desktop/cmp/clipboard';
import {textInput} from '@xh/hoist/desktop/cmp/input/TextInput';
import {modalSupport} from '@xh/hoist/desktop/cmp/modalsupport/ModalSupport';
import {ModalSupportModel} from '@xh/hoist/desktop/cmp/modalsupport/ModalSupportModel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {textArea} from '@xh/hoist/kit/blueprint';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
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
import {compact, defaultsDeep, isEqual, isFunction} from 'lodash';
import {ReactElement} from 'react';
import {findDOMNode} from 'react-dom';
import './CodeInput.scss';

export interface CodeInputProps extends HoistInputProps<null>, LayoutProps {
    /** True to focus the control on render. */
    autoFocus?: boolean;

    /** True to commit on every change/keystroke, default false. */
    commitOnChange?: boolean;

    /**
     * Configuration object with any properties supported by the CodeMirror API.
     * @see {@link https://codemirror.net/doc/manual.html#api_configuration|CodeMirror Docs}
     */
    editorProps?: PlainObject;

    /**
     * True to enable case-insensitive searching within the input. Default false, except in
     * fullscreen mode, where search will be shown unless explicitly *disabled*. Note that
     * enabling search forces the display of a toolbar, regardless of `showToolbar` prop.
     */
    enableSearch?: boolean;

    /**
     * Callback to autoformat the code. Given the unformatted code, this should return a
     * properly-formatted copy.
     */
    formatter?: (str: string) => string;

    /**
     * A CodeMirror linter to provide error detection and hinting in the gutter.
     */
    linter?: (text: string) => any[];

    /**
     * A CodeMirror language mode - default none (plain-text). See the CodeMirror docs
     * ({@link https://codemirror.net/mode/}) regarding available modes.
     * Applications must import any mode they wish to enable.
     */
    mode?: string;

    /**
     * True to prevent user modification of editor contents, while still allowing user to
     * focus, select, and copy contents.
     */
    readonly?: boolean;

    /** True (default) to display a copy button at bottom-right of input. */
    showCopyButton?: boolean;

    /**
     * True (default) to display autoformat button at bottom-right of input. Requires a
     * `formatter` to be configured and content to be editable (!readonly, !disabled).
     */
    showFormatButton?: boolean;

    /** True (default) to display fullscreen button at bottom-right of input. */
    showFullscreenButton?: boolean;

    /**
     * True to display action buttons and/or find functionality in a dedicated bottom toolbar.
     * Default is false unless enableSearch==true or in fullscreen mode. When false, enabled
     * action buttons show only when the input focused and float in the bottom-right corner.
     */
    showToolbar?: boolean;
}

/**
 * Code-editor style input, powered by CodeMirror. Displays a gutter with line numbers, mono-spaced
 * styling, and custom key handlers (e.g. tab to indent). Can be customized with options and
 * language modes supported by the underlying CodeMirror library {@link https://codemirror.net/}.
 *
 * Note Hoist also provides a preconfigured {@link JsonInput} component for editing JSON.
 *
 * TODO - understanding sizing spec / requirements for component vs. generated CodeMirror.
 * Reconcile LayoutSupport with width/height props. https://github.com/xh/hoist-react/issues/327
 */
export const [CodeInput, codeInput] = hoistCmp.withFactory<CodeInputProps>({
    displayName: 'CodeInput',
    className: 'xh-code-input',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, CodeInputModel);
    }
});
(CodeInput as any).hasLayoutSupport = true;

//------------------------------
// Implementation
//------------------------------
class CodeInputModel extends HoistInputModel<null> {
    override xhImpl = true;

    @managed
    modalSupportModel: ModalSupportModel = new ModalSupportModel();

    /** A CodeMirror editor instance. */
    editor: any;

    // Support for internal search feature.
    cursor = null;
    @bindable query: string = '';
    @observable currentMatchIdx: number = -1;
    @observable.ref matches = [];
    get matchCount(): number {
        return this.matches.length;
    }

    get fullScreen(): boolean {
        return this.modalSupportModel.isModal;
    }

    get showCopyButton(): boolean {
        return withDefault(this.componentProps.showCopyButton, true);
    }

    get showFullscreenButton(): boolean {
        return withDefault(this.componentProps.showFullscreenButton, true);
    }

    get showFormatButton(): boolean {
        const {disabled, readonly, formatter, showFormatButton} = this.componentProps;
        return (
            !disabled && !readonly && isFunction(formatter) && withDefault(showFormatButton, true)
        );
    }

    get showAnyActionButtons(): boolean {
        const {showCopyButton, showFormatButton, showFullscreenButton} = this;
        return showCopyButton || showFormatButton || showFullscreenButton;
    }

    get showSearchInput(): boolean {
        return withDefault(this.componentProps.enableSearch, this.fullScreen);
    }

    get showToolbar(): boolean {
        const {componentProps, showSearchInput, showAnyActionButtons, fullScreen} = this;
        // Always show if showing searchInput - it's the only place searchInput can live.
        if (showSearchInput) return true;
        // Show if prop enabled and at least one action button.
        if (componentProps.showToolbar && showAnyActionButtons) return true;
        // Show if fullscreen w/buttons and prop not explicitly *disabled*.
        return fullScreen && showAnyActionButtons && componentProps.showToolbar !== false;
    }

    get actionButtons(): ReactElement[] {
        const {showCopyButton, showFormatButton, showFullscreenButton} = this;
        return compact([
            showCopyButton
                ? clipboardButton({
                      text: null,
                      title: 'Copy to clipboard',
                      successMessage: 'Contents copied to clipboard',
                      getCopyText: () => this.internalValue
                  })
                : null,
            showFormatButton
                ? button({
                      icon: Icon.magic(),
                      title: 'Auto-format',
                      onClick: () => this.onAutoFormat()
                  })
                : null,
            showFullscreenButton
                ? button({
                      icon: this.fullScreen ? Icon.collapse() : Icon.expand(),
                      title: this.fullScreen ? 'Exit full screen' : 'Full screen',
                      onClick: () => this.toggleFullScreen()
                  })
                : null
        ]);
    }

    override get commitOnChange(): boolean {
        return withDefault(this.componentProps.commitOnChange, true);
    }

    override blur() {
        this.editor?.execCommand('undoSelection');
        this.editor?.getInputField().blur();
    }

    override focus() {
        this.editor?.focus();
    }

    override select() {
        this.editor?.execCommand('selectAll');
    }

    constructor() {
        super();
        makeObservable(this);
        this.addReaction({
            track: () => this.modalSupportModel.isModal,
            run: () => this.focus(),
            debounce: 1
        });
    }

    override onLinked() {
        this.addReaction({
            track: () => XH.darkTheme,
            run: () => {
                const {editor} = this;
                if (editor) editor.setOption('theme', XH.darkTheme ? 'dracula' : 'default');
            }
        });

        this.addReaction({
            track: () => this.renderValue,
            run: value => {
                const {editor} = this;
                if (editor && editor.getValue() != value) {
                    // CodeMirror will throw on null value.
                    editor.setValue(value == null ? '' : value);
                }
            }
        });

        this.addReaction({
            track: () => this.componentProps.readonly || this.componentProps.disabled,
            run: editorReadOnly => {
                this.editor.setOption('readOnly', editorReadOnly);
            }
        });

        this.addReaction({
            track: () => this.query,
            run: query => {
                if (query?.trim()) {
                    this.findAll();
                } else {
                    this.clearSearchResults();
                }
            },
            debounce: 300
        });
    }

    manageCodeEditor = textAreaComp => {
        if (textAreaComp) {
            this.editor = this.createCodeEditor(textAreaComp);
            this.preserveSearchResults();
        }
    };

    createCodeEditor(textAreaComp) {
        const editorSpec = defaultsDeep(this.componentProps.editorProps, this.createDefaults());

        const taDom = findDOMNode(textAreaComp),
            editor = codemirror.fromTextArea(taDom, editorSpec);

        editor.on('change', this.handleEditorChange);
        return editor;
    }

    createDefaults() {
        const {disabled, readonly, mode, linter, autoFocus} = this.componentProps;
        let gutters = ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'];
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

    onChange = ev => {
        this.noteValueChange(ev.target.value);
    };

    handleEditorChange = editor => {
        this.noteValueChange(editor.getValue());
        if (this.cursor) this.clearSearchResults();
    };

    onAutoFormat = () => {
        if (!isFunction(this.componentProps.formatter)) return;

        const editor = this.editor,
            val = this.tryPrettyPrint(editor.getValue());
        editor.setValue(val);
    };

    tryPrettyPrint(str) {
        try {
            return this.componentProps.formatter(str);
        } catch (e) {
            return str;
        }
    }

    toggleFullScreen() {
        this.modalSupportModel.toggleIsModal();

        // 'Nudge' the mouse wheel to trigger CodeMirror to update scrollbar state
        const scrollEvent = d => new window.WheelEvent('mousewheel', {deltaX: d, deltaY: d});
        wait().then(() => {
            this.editor.getScrollerElement().dispatchEvent(scrollEvent(2));
            this.editor.getScrollerElement().dispatchEvent(scrollEvent(-2));
        });
    }

    //------------------------
    // Local Searching
    //------------------------
    @action
    findAll() {
        this.clearSearchResults();
        if (!this.query?.trim()) return;

        this.cursor = this.editor.getSearchCursor(this.query, 0, true);

        const {cursor, editor} = this,
            newMatches = [];

        while (cursor.findNext()) {
            const anchor = cursor.from(),
                head = cursor.to();
            newMatches.push({
                anchor,
                head,
                textMarker: editor.markText(anchor, head, {className: 'xh-code-input--highlight'})
            });
        }

        this.matches = newMatches;
        if (newMatches.length) {
            this.findNext();
        } else {
            this.currentMatchIdx = -1;
        }
    }

    @action
    findNext() {
        const {editor, query, cursor, matchCount} = this;
        if (!cursor || !matchCount) return;

        if (cursor.findNext(query)) {
            this.handleCursorMatchUpdate();
        } else {
            // Loop around
            this.cursor = editor.getSearchCursor(query, 0, true);
            this.findNext();
        }
    }

    @action
    findPrevious() {
        const {editor, query, cursor, matches, matchCount} = this;
        if (!cursor || !matchCount) return;

        if (cursor.findPrevious(query)) {
            this.handleCursorMatchUpdate();
        } else {
            // Loop around
            this.cursor = editor.getSearchCursor(query, matches[matchCount - 1].head, true);
            this.findPrevious();
        }
    }

    @action
    handleCursorMatchUpdate() {
        const {editor, cursor, matches} = this,
            from = cursor.from(),
            to = cursor.to();
        editor.scrollIntoView({from, to}, 50);
        editor.setSelection(from, to);
        this.currentMatchIdx = matches.findIndex(match => isEqual(match.anchor, from));
    }

    preserveSearchResults() {
        const {matches, editor} = this;
        matches.forEach(match => {
            match.textMarker = editor.markText(match.anchor, match.head, {
                className: 'xh-code-input--highlight'
            });
        });
    }

    @action
    clearSearchResults() {
        this.cursor = null;
        this.currentMatchIdx = -1;
        this.matches.forEach(match => match.textMarker.clear());
        this.matches = [];
    }

    override destroy() {
        // Cleanup editor component as per CodeMirror docs.
        if (this.editor) this.editor.toTextArea();
        super.destroy();
    }
}

const cmp = hoistCmp.factory<HoistProps<CodeInputModel, HTMLDivElement> & BoxProps>(
    ({model, className, ...props}, ref) => {
        return box({
            className: 'xh-code-input__outer-wrapper',
            width: 300,
            height: 100,
            ...getLayoutProps(props),
            item: modalSupport({
                model: model.modalSupportModel,
                item: inputCmp({
                    testId: props.testId,
                    width: '100%',
                    height: '100%',
                    className,
                    ref,
                    model
                })
            })
        });
    }
);

const inputCmp = hoistCmp.factory<HoistProps<CodeInputModel, HTMLDivElement> & BoxProps>(
    ({model, ...props}, ref) =>
        vbox({
            items: [
                div({
                    className: 'xh-code-input__inner-wrapper',
                    item: textArea({
                        value: model.renderValue || '',
                        inputRef: model.manageCodeEditor, // TODO - confirm this is correct change
                        onChange: model.onChange
                    })
                }),
                model.showToolbar ? toolbarCmp() : actionButtonsCmp()
            ],
            onBlur: model.onBlur,
            onFocus: model.onFocus,
            ...props,
            ref
        })
);

const toolbarCmp = hoistCmp.factory<CodeInputModel>(({model}) => {
    const {actionButtons, showSearchInput, fullScreen} = model;
    return toolbar({
        className: 'xh-code-input__toolbar',
        compact: !fullScreen,
        items: [searchInputCmp({omit: !showSearchInput}), filler(), ...actionButtons]
    });
});

const searchInputCmp = hoistCmp.factory<CodeInputModel>(({model}) => {
    const {query, cursor, currentMatchIdx, matchCount, fullScreen} = model;
    return fragment(
        // Frame wrapper added due to issues with textInput not supporting all layout props as it should.
        frame({
            flex: 1,
            maxWidth: !fullScreen ? 225 : 400,
            item: textInput({
                width: null,
                flex: 1,
                model: this,
                bind: 'query',
                leftIcon: Icon.search(),
                enableClear: true,
                commitOnChange: true,
                onKeyDown: e => {
                    if (e.key !== 'Enter') return;
                    if (!cursor) {
                        model.findAll();
                    } else if (e.shiftKey) {
                        model.findPrevious();
                    } else {
                        model.findNext();
                    }
                }
            })
        }),
        label({
            className: classNames('xh-code-input__label', !fullScreen ? 'xh-no-pad' : null),
            item: matchCount
                ? `${currentMatchIdx + 1} / ${matchCount}`
                : span({item: '0 results', className: 'xh-text-color-muted'}),
            omit: !query
        }),
        button({
            icon: Icon.arrowUp(),
            title: 'Find previous (shift+enter)',
            className: !fullScreen ? 'xh-no-pad' : null,
            disabled: !matchCount,
            onClick: () => model.findPrevious(),
            omit: !query
        }),
        button({
            icon: Icon.arrowDown(),
            title: 'Find next (enter)',
            className: !fullScreen ? 'xh-no-pad' : null,
            disabled: !matchCount,
            onClick: () => model.findNext(),
            omit: !query
        })
    );
});

const actionButtonsCmp = hoistCmp.factory<CodeInputModel>(({model}) => {
    const {hasFocus, actionButtons} = model;
    return hasFocus && actionButtons.length
        ? hbox({
              className: 'xh-code-input__action-buttons',
              items: actionButtons
          })
        : null;
});
