/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistInputModel} from '@xh/hoist/cmp/input';
import {ElementFactory, HoistModel, PlainObject, useLocalModel} from '@xh/hoist/core';
import {EditorProps} from '@xh/hoist/desktop/cmp/grid/editors/EditorProps';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {createObservableRef} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isNil} from 'lodash';
import {ForwardedRef, ReactElement, useImperativeHandle} from 'react';

/**
 * Hook to render a component to be used for inline cell editing in ag-grid.
 * @internal - Hoist provides components wrapping the currently-supported `HoistInput`s.
 *
 * Implements the lifecycle methods required by ag-grid cell editors.
 * See https://www.ag-grid.com/react-grid/react-hooks/#hooks-with-lifecycle-methods for details.
 *
 * @param component - ElementFactory for HoistInput to render.
 * @param props - props passed to containing component
 * @param ref - forwardRef passed to containing component
 */
export function useInlineEditorModel(
    component: ElementFactory,
    props: EditorProps<any>,
    ref: ForwardedRef<any>
): ReactElement {
    const {className, inputProps, agParams} = props,
        impl = useLocalModel(() => new InlineEditorModel(agParams));

    useImperativeHandle(ref, () => ({
        getValue: () => {
            impl.ref.current?.doCommit();
            return impl.value;
        },

        // This is called in full-row editing when the user tabs into the cell
        focusIn: () => impl.focus(),

        inputModel: () => impl.ref.current
    }));

    return component({
        className: classNames('xh-inline-editor', className),
        width: agParams.eGridCell.clientWidth,
        model: impl,
        bind: 'value',
        commitOnChange: true,
        ref: impl.ref,
        ...inputProps
    });
}


/**
 * Local Model supporting inline cell editor components. Provides base functionality required by
 * ag-grid plus extension points for editors needing more complex behaviors.
 *
 * @internal - created via {@link useInlineEditorModel}
 */
class InlineEditorModel extends HoistModel {
    xhImpl = true;

    @bindable value;

    ref = createObservableRef<HoistInputModel>();

    agParams: PlainObject; // ICellEditorParams

    get inputEl() {
        return this.ref.current?.inputEl;
    }

    constructor(agParams) {
        super();
        makeObservable(this);

        this.agParams = agParams;
        this.value = agParams.value;

        // Focus into the input once the component is rendered but only do so if this cell started
        // the editing process. If using full row editing the editor may be rendered but we do not
        // want to focus the input if it was not the cell which initiated the editing.
        if (agParams.cellStartedEdit) {
            this.addReaction(this.focusOnRenderReaction());
        }
    }

    focus() {
        const {inputEl} = this;
        if (!inputEl) return;

        inputEl.focus();

        const {charPress} = this.agParams;
        if (isNil(charPress)) {
            inputEl.select();
        } else {
            inputEl.value = charPress;
        }
    }

    //-----------------------
    // Implementation
    //-----------------------
    private focusOnRenderReaction() {
        return {
            when: () => !!this.inputEl,
            run: () => wait(10).then(() => this.focus())
        };
    }
}