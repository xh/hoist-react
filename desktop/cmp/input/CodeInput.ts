import {EditorView} from '@codemirror/view';
import {EditorState, Extension} from '@codemirror/state';
import {basicSetup} from 'codemirror';
import {javascript} from '@codemirror/lang-javascript';
import {observable} from 'mobx';
import {hoistCmp, HoistProps, LayoutProps, XH} from '@xh/hoist/core';
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {oneDark} from '@codemirror/theme-one-dark';
import {box} from '@xh/hoist/cmp/layout';
import {createObservableRef, getLayoutProps} from '@xh/hoist/utils/react';
import {makeObservable} from '@xh/hoist/mobx';
import './CodeInput.scss';

export interface CodeInputProps extends HoistProps, HoistInputProps, LayoutProps {
    value?: string;

    mode?: string;

    extensions?: Extension[];

    readonly?: boolean;
}

export const [CodeInput, codeInput] = hoistCmp.withFactory<CodeInputProps>({
    displayName: 'CodeInput',
    className: 'xh-code-input',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, CodeInputModel);
    }
});
(CodeInput as any).hasLayoutSupport = true;

const cmp = hoistCmp.factory<CodeInputModel>(({model, ...props}) => {
    return box({
        width: 300,
        height: 100,
        ...getLayoutProps(props),
        item: box({
            width: '100%',
            height: '100%',
            className: 'xh-code-input__inner-wrapper',
            ref: model.parentDivRef
        })
    });
});

class CodeInputModel extends HoistInputModel {
    parentDivRef = createObservableRef<HTMLDivElement>();

    @observable.ref
    state: EditorState;

    @observable.ref
    view: EditorView;

    get editorValue() {
        return this.state?.doc;
    }

    constructor() {
        super();
        makeObservable(this);
        this.addReaction(
            {
                when: () => !!this.parentDivRef.current,
                run: () => {
                    this.createCodeEditor();
                }
            },
            {
                track: () => this.state?.doc.toString(),
                run: val => {
                    console.log(val);
                },
                fireImmediately: true
            },
            {
                track: () => XH.darkTheme,
                run: () => {
                    const newState = this.createEditorState();
                    this.view.setState(newState);
                }
            }
        );
    }

    //-----------------------
    // Implementation
    //----------------------
    private createCodeEditor() {
        this.state = this.createEditorState();
        this.view = this.createEditorView(this.state);
    }

    private createEditorState(): EditorState {
        const {readonly, extensions} = this.componentProps;

        let allExtensions = [
            basicSetup,
            EditorState.readOnly.of(readonly),
            javascript(),
            EditorView.updateListener.of(update => console.log(update.state.doc.toString())),
            EditorView.baseTheme({
                '&light': {
                    backgroundColor: 'white'
                }
            })
        ];

        if (XH.darkTheme) allExtensions.push(oneDark);

        if (extensions) allExtensions.push(...extensions);

        return EditorState.create({
            doc: this.renderValue,
            extensions: allExtensions
        });
    }

    private createEditorView(state: EditorState) {
        return new EditorView({
            state,
            parent: this.parentDivRef.current
        });
    }
}
