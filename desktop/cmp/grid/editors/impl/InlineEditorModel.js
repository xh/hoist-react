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
    const {className, inputProps} = props,
        impl = useLocalModel(() => new InlineEditorModel(props));

    useImperativeHandle(ref, () => ({
        getValue: () => impl.value,

        isPopup: () => isPopup,

        // This is called in full-row editing when the user tabs into the cell
        focusIn: () => impl.focus()
    }));

    return component({
        className: classNames('xh-inline-editor', className),
        width: isPopup ? props.agParams.eGridCell.clientWidth : null,
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

    /** @member {Column} */
    column;

    /** @member {GridModel} */
    gridModel;

    /** @member {Record} */
    record;

    /** @member {ICellEditorParams} */
    agParams;

    get startedEdit() {
        return this.agParams?.cellStartedEdit;
    }

    /** @returns {HoistInputModel} */
    get inputModel() {
        return this.ref.current;
    }

    get inputEl() {
        return this.inputModel?.inputEl;
    }

    constructor(props) {
        super();
        makeObservable(this);

        this.props = props;
        this.column = props.column;
        this.gridModel = props.gridModel;
        this.record = props.record;
        this.agParams = props.agParams;

        const {value, charPress} = props.agParams;
        this.value = charPress ?? value;

        // Focus into the input once the component is rendered but only do so if this cell started
        // the editing process. If using full row editing the editor may be rendered but we do not
        // want to focus the input if it was not the cell which initiated the editing.
        if (this.startedEdit) this.addReaction(this.focusOnRenderReaction());
    }

    focus() {
        const {inputEl} = this,
            selectOnFocus = isNil(this.agParams.charPress);

        if (!inputEl) return;

        inputEl.focus();
        if (selectOnFocus) inputEl.select();
    }

    stopEditing() {
        this.agParams?.stopEditing();
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
