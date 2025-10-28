/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {autocompletion} from '@codemirror/autocomplete';
import {defaultKeymap, history, historyKeymap, indentWithTab} from '@codemirror/commands';
import {
    defaultHighlightStyle,
    foldGutter,
    foldKeymap,
    indentOnInput,
    LanguageDescription,
    syntaxHighlighting
} from '@codemirror/language';
import {linter, lintGutter} from '@codemirror/lint';
import {highlightSelectionMatches, search} from '@codemirror/search';
import {
    Compartment,
    EditorState,
    Extension,
    RangeSetBuilder,
    StateEffect,
    StateField
} from '@codemirror/state';
import {
    Decoration,
    DecorationSet,
    EditorView,
    highlightActiveLine,
    highlightActiveLineGutter,
    keymap,
    lineNumbers,
    ViewPlugin,
    ViewUpdate
} from '@codemirror/view';
import {dracula, solarizedLight} from '@uiw/codemirror-themes-all';
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {box, div, filler, fragment, frame, hbox, label, span, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, LayoutProps, managed, PlainObject, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {clipboardButton} from '@xh/hoist/desktop/cmp/clipboard';
import {textInput} from '@xh/hoist/desktop/cmp/input/TextInput';
import {modalSupport} from '@xh/hoist/desktop/cmp/modalsupport/ModalSupport';
import {ModalSupportModel} from '@xh/hoist/desktop/cmp/modalsupport/ModalSupportModel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {compact, find, includes, isEmpty, isFunction} from 'lodash';
import {ReactElement} from 'react';
import './CodeInput.scss';
import {languages} from '@codemirror/language-data';

export interface CodeInputProps extends HoistProps, HoistInputProps, LayoutProps {
    /** True to focus the control on render. */
    autoFocus?: boolean;

    /** False to not commit on every change/keystroke, default true. */
    commitOnChange?: boolean;

    // TODO not supported anymore do we want to make it backwards compatible?
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
     * ({@link https://github.com/codemirror/language-data/blob/main/src/language-data.ts}) regarding available languages.
     * String can be the alias or name
     */
    language?: string;

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

    /** False (default) to highlight active line in input. */
    highlightActiveLine?: boolean;
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
class CodeInputModel extends HoistInputModel {
    override xhImpl = true;

    @managed
    modalSupportModel: ModalSupportModel = new ModalSupportModel();

    editor: EditorView;

    // Support for internal search feature.
    cursor = null;
    @bindable query: string = '';
    @observable currentMatchIdx: number = -1;
    @observable.ref matches: {from: number; to: number}[] = [];

    private updateMatchesEffect = StateEffect.define<void>();
    private highlightField: StateField<DecorationSet>;
    private themeCompartment = new Compartment();

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
        this.editor?.contentDOM.blur();
    }

    override focus() {
        this.editor?.focus();
    }

    override select() {
        if (!this.editor) return;
        this.editor.dispatch({selection: {anchor: 0, head: this.editor.state.doc.length}});
    }

    constructor() {
        super();
        makeObservable(this);

        this.highlightField = StateField.define<DecorationSet>({
            create: () => Decoration.none,
            update: (deco, tr) => {
                deco = deco.map(tr.changes);
                if (tr.effects.some(e => e.is(this.updateMatchesEffect))) {
                    const builder = new RangeSetBuilder<Decoration>();
                    this.matches.forEach(match => {
                        builder.add(
                            match.from,
                            match.to,
                            Decoration.mark({class: 'xh-code-input--highlight'})
                        );
                    });
                    deco = builder.finish();
                }
                return deco;
            },
            provide: f => EditorView.decorations.from(f)
        });

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
                if (!this.editor) return;
                this.editor.dispatch({
                    effects: this.themeCompartment.reconfigure(this.getThemeExtension())
                });
            }
        });

        this.addReaction({
            track: () => this.renderValue,
            run: val => {
                if (this.editor && this.editor.state.doc.toString() !== val) {
                    this.editor.dispatch({
                        changes: {from: 0, to: this.editor.state.doc.length, insert: val ?? ''}
                    });
                }
            }
        });

        this.addReaction({
            track: () => this.componentProps.readonly || this.componentProps.disabled,
            run: readOnly => {
                if (this.editor)
                    this.editor.dispatch({
                        effects: StateEffect.appendConfig.of(EditorView.editable.of(!readOnly))
                    });
            }
        });

        this.addReaction({
            track: () => this.query,
            run: query => {
                if (query?.trim()) this.findAll();
                else this.clearSearchResults();
            },
            debounce: 300
        });
    }

    manageCodeEditor = async (container: HTMLElement) => {
        if (!container) return;
        const extensions = await this.getExtensionsAsync();

        // DEBUG
        console.log(extensions);

        const state = EditorState.create({doc: this.renderValue || '', extensions});
        this.editor = new EditorView({state, parent: container});
    };

    onAutoFormat() {
        if (!this.editor) return;
        const val = this.tryPrettyPrint(this.editor.state.doc.toString());
        this.editor.dispatch({changes: {from: 0, to: this.editor.state.doc.length, insert: val}});
    }

    tryPrettyPrint(str: string) {
        try {
            return this.componentProps.formatter?.(str) ?? str;
        } catch (e) {
            return str;
        }
    }

    toggleFullScreen() {
        this.modalSupportModel.toggleIsModal();
        wait().then(() => {
            const scroller = this.editor?.scrollDOM;
            if (scroller) {
                scroller.scrollTop += 2;
                scroller.scrollTop -= 2;
            }
        });
    }

    @action
    findAll() {
        if (!this.editor || !this.query?.trim()) return;

        const doc = this.editor.state.doc.toString();
        const matches = [];
        let idx = doc.indexOf(this.query);
        while (idx !== -1) {
            matches.push({from: idx, to: idx + this.query.length});
            idx = doc.indexOf(this.query, idx + 1);
        }
        this.matches = matches;
        this.currentMatchIdx = matches.length ? 0 : -1;
        this.updateMatchDecorations();

        if (matches.length) {
            const match = matches[0];
            this.editor.dispatch({
                selection: {anchor: match.from, head: match.to},
                scrollIntoView: true
            });
        }
    }

    @action
    findNext() {
        if (!this.editor || !this.matches.length) return;
        this.currentMatchIdx = (this.currentMatchIdx + 1) % this.matches.length;
        const match = this.matches[this.currentMatchIdx];
        this.editor.dispatch({
            selection: {anchor: match.from, head: match.to},
            scrollIntoView: true
        });
    }

    @action
    findPrevious() {
        if (!this.editor || !this.matches.length) return;
        this.currentMatchIdx =
            (this.currentMatchIdx - 1 + this.matches.length) % this.matches.length;
        const match = this.matches[this.currentMatchIdx];
        this.editor.dispatch({
            selection: {anchor: match.from, head: match.to},
            scrollIntoView: true
        });
    }

    @action
    updateMatchDecorations() {
        if (!this.editor) return;
        this.editor.dispatch({effects: this.updateMatchesEffect.of()});
    }

    @action
    clearSearchResults() {
        this.matches = [];
        this.currentMatchIdx = -1;
        this.updateMatchDecorations();
    }

    override destroy() {
        this.editor?.destroy();
        super.destroy();
    }

    //------------------------
    // Implementation
    //------------------------
    private async getExtensionsAsync(): Promise<Extension[]> {
        const {
                autoFocus,
                language,
                readonly,
                highlightActiveLine: highlightActiveLineProp,
                linter: userLinter
            } = this.componentProps,
            extensions = [
                // Theme
                this.themeCompartment.of(this.getThemeExtension()),
                // Editor state
                EditorView.editable.of(!readonly),
                EditorView.updateListener.of((update: ViewUpdate) => {
                    if (update.docChanged) this.noteValueChange(update.state.doc.toString());
                }),
                // Search & custom highlight
                search(),
                syntaxHighlighting(defaultHighlightStyle),
                highlightSelectionMatches(),
                this.highlightField,
                // Editor UI
                foldGutter(),
                lineNumbers(),
                lintGutter(),
                indentOnInput(),
                autocompletion(),
                history(),
                // Linter
                userLinter
                    ? linter(async view => {
                          const text = view.state.doc.toString();
                          return await userLinter(text);
                      })
                    : [],
                // Key bindings
                keymap.of([
                    ...defaultKeymap,
                    ...historyKeymap,
                    ...foldKeymap,
                    indentWithTab,
                    {
                        key: 'Mod-p',
                        run: () => {
                            this.onAutoFormat();
                            return true;
                        }
                    }
                ])
            ];
        if (highlightActiveLineProp)
            extensions.push(highlightActiveLine(), highlightActiveLineGutter());
        if (autoFocus) extensions.push(this.autofocusExtension);
        if (language) extensions.push(await this.getLanguageExtensionAsync(language));

        return extensions.filter(it => !isEmpty(it));
    }
    private getThemeExtension() {
        return XH.darkTheme ? dracula : solarizedLight;
    }

    private async getLanguageExtensionAsync(lang: string) {
        const langDesc: LanguageDescription | undefined = find(
            languages,
            it => includes(it.alias, lang) || it.name.toLowerCase() === lang.toLowerCase()
        );
        if (!langDesc) return [];
        try {
            return await langDesc.load();
        } catch (err) {
            console.error(`Failed to load language: ${lang}`, err);
            return [];
        }
    }

    private autofocusExtension = ViewPlugin.fromClass(
        class {
            constructor(view: EditorView) {
                queueMicrotask(() => view.focus());
            }
        }
    );
}

const cmp = hoistCmp.factory<CodeInputModel>(({model, className, ...props}, ref) => {
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
});

const inputCmp = hoistCmp.factory<CodeInputModel>(({model, ...props}, ref) =>
    vbox({
        items: [
            div({
                className: 'xh-code-input__inner-wrapper',
                ref: model.manageCodeEditor
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
    const {query, currentMatchIdx, matches, fullScreen} = model,
        matchCount = matches.length;

    return fragment(
        // Frame wrapper added due to issues with textInput not supporting all layout props as it should.
        frame({
            flex: 1,
            maxWidth: !fullScreen ? 225 : 400,
            item: textInput({
                width: null,
                flex: 1,
                model,
                bind: 'query',
                leftIcon: Icon.search(),
                enableClear: true,
                commitOnChange: true,
                onKeyDown: e => {
                    if (e.key !== 'Enter') return;
                    if (!matches.length) model.findAll();
                    else if (e.shiftKey) model.findPrevious();
                    else model.findNext();
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
