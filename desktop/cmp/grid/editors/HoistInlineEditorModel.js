/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {useImperativeHandle} from 'react';
import composeRefs from '@seznam/compose-react-refs';
import classNames from 'classnames';
import {isNil} from 'lodash';
import {HoistModel, useLocalModel} from '@xh/hoist/core';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {start} from '@xh/hoist/promise';
import {createObservableRef} from '@xh/hoist/utils/react';
import './InlineEditors.scss';

/**
 * A Local Model supporting inline cell editor components in Hoist. Provides the base functionality
 * needed for supporting inline cell editing in ag-grid and extension points for editors which need
 * more complex behaviors.
 *
 * To create an instance of a component using this model use the hook
 * {@see useHoistInlineEditorModel}
 */
export class InlineEditorModel extends HoistModel {
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

    // Stub for subclasses to implement for special handling when value is committed for certain
    // types of editors (date, select)
    onCommit() {

    }

    //-----------------------
    // Implementation
    //-----------------------

    focusOnRenderReaction() {
        return {
            when: () => this.inputEl,
            run: () => {
                // Need to wait 1 tick before we can focus
                start(() => {
                    this.focus();
                });
            }
        };
    }
}

/**
 * Hook to render a component to be used for inline cell editing in ag-grid.
 *
 * Implements the lifecycle methods required by ag-grid cell editors.
 * See https://www.ag-grid.com/react-grid/react-hooks/#hooks-with-lifecycle-methods for more details.
 *
 * @param {function} component - react component to render - should be a HoistInput
 * @param {Object} props - props passed to containing component
 * @param {Object} ref - forwardRef passed to containing component
 * @param {Class} modelSpec - specify to use particular subclass of HoistInlineEditorModel
 * @return {element} - react element to be rendered
 */
export function useHoistInlineEditorModel(component, props, ref, modelSpec = InlineEditorModel) {
    const {className, inputProps} = props,
        impl = useLocalModel(() => new modelSpec(props));

    useImperativeHandle(ref, () => ({
        getValue: () => impl.value,

        // This is called in full-row editing when the user tabs into the cell
        focusIn: () => impl.focus()
    }));

    return component({
        className: classNames('xh-inline-editor', className),
        width: null,
        model: impl,
        bind: 'value',
        commitOnChange: true,
        onCommit: () => impl.onCommit(),
        ref: composeRefs(ref, impl.ref),
        ...inputProps
    });
}
