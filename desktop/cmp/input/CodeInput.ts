import {EditorView} from '@codemirror/view';
import {EditorState, Extension} from '@codemirror/state';
import {observable} from 'mobx';
import {hoistCmp, HoistProps, LayoutProps} from '@xh/hoist/core';
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {box, div} from '@xh/hoist/cmp/layout';
import {createObservableRef, getLayoutProps} from '@xh/hoist/utils/react';
import {makeObservable} from '@xh/hoist/mobx';
import './CodeInput.scss';
import {basicSetup} from 'codemirror';

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
        item: div({
            className: 'xh-code-input__inner-wrapper',
            ref: model.parentDivRef
        })
    });
});

class CodeInputModel extends HoistInputModel {
    parentDivRef = createObservableRef<HTMLDivElement>();

    @observable.ref
    state: EditorState;

    @observable
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
            }
        );
    }

    //-----------------------
    // Implementation
    //----------------------
    private createCodeEditor() {
        this.state = this.createEditorState();
        this.createEditorView(this.state);
    }

    private createEditorState() {
        const {readonly, extensions} = this.componentProps;

        let allExtensions = [
            basicSetup,
            EditorState.readOnly.of(readonly),
            // javascript(),
            EditorView.updateListener.of(update => console.log(update.state.doc.toString()))
        ];

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
