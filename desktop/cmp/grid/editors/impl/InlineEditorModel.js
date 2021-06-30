/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {useImperativeHandle} from 'react';
import classNames from 'classnames';
import {isNil} from 'lodash';
import {HoistModel, useLocalModel} from '@xh/hoist/core';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {start} from '@xh/hoist/promise';
import {createObservableRef} from '@xh/hoist/utils/react';

/**
 * Hook to render a component to be used for inline cell editing in ag-grid.
 * @private - Hoist provides components wrapping the currently-supported `HoistInput`s.
 *
 * Implements the lifecycle methods required by ag-grid cell editors.
 * See https://www.ag-grid.com/react-grid/react-hooks/#hooks-with-lifecycle-methods for details.
 *
 * @param {function} component - React Component to render - should be a HoistInput
 * @param {Object} props - props passed to containing component
 * @param {Object} ref - forwardRef passed to containing component
 * @param {boolean} [isPopup] - true if this editor should be rendered as a popup over the cell
 *      instead of withing the actual cell element. Popup editors will have their width set to
 *      match the cell by default.
 * @return {ReactElement} - React Element to be rendered
 */
export function useInlineEditorModel(component, props, ref, isPopup = false) {
    const {className, inputProps, agParams} = props,
        impl = useLocalModel(() => new InlineEditorModel(agParams));

    useImperativeHandle(ref, () => ({
        getValue: () => impl.value,

        isPopup: () => isPopup,

        // This is called in full-row editing when the user tabs into the cell
        focusIn: () => impl.focus()
    }));

    return component({
        className: classNames('xh-inline-editor', className),
        width: isPopup ? agParams.eGridCell.clientWidth : null,
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
 * @private - created via {@see useInlineEditorModel}
 */
class InlineEditorModel extends HoistModel {
    @bindable value;

    ref = createObservableRef();

    /** @member {ICellEditorParams} */
    agParams;

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
    focusOnRenderReaction() {
        return {
            when: () => this.inputEl,
            run: () => start(() => this.focus()) // wait 1 tick before we can focus
        };
    }
}
