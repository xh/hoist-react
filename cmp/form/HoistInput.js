/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {isFunction, upperFirst} from 'lodash';
import {throwIf} from '@xh/hoist/utils/js';
import {observable, computed, action} from '@xh/hoist/mobx';
import classNames from 'classnames';
import {wait} from '@xh/hoist/promise';

import './HoistInput.scss';

/**
 * Abstract superclass for Components used for data entry with common functionality around reading,
 * writing, converting, and displaying their values.
 *
 * Hoist Inputs can *either* operate in bound mode or in standard controlled mode.
 *      + If provided with `model` and `field` props, they will will operate in bound mode,
 *        reading their value from the model and writing back to it on commit (see below).
 *      + Otherwise, they will get their value directly via the `value` prop.
 *
 * Note that providing a model as a value source may allow for more efficient (re)rendering in a
 * MobX context. The bound value is only read *within* this control, so that changes to its value
 * do not cause the parent of this control to re-render.
 *
 * Regardless of mode, Hoist Inputs will call an `onChange` callback prop with the latest value
 * as it is updated.  They also introduce the notion of "committing" a field to the model when the
 * user has completed a discrete act of data entry. This will vary by field but is commonly marked
 * by the user blurring the field, selecting a record from a combo, or pressing the <enter> key.
 * At this time, and specified `onCommit` callback prop will be called and the value will be flushed
 * back to any bound model.
 *
 * For many fields (e.g. checkbox, select, switchInput, slider) commit always fires at the same time
 * as the change event. Other fields such as textInput maintain the distinction described above,
 * but expose a `commitOnChange` prop to force them to eagerly flush their values on every change.
 *
 * HoistInputs support built-in validation when bound to a model enhanced by `@FieldSupport`.
 * When a HoistInput control is linked to a property on the underlying model decorated by `@field`,
 * the model Field will be used to provide validation info and styling to the input component.
 *
 * For an even more managed display, consider wrapping HoistInputs in a FormField Component, which
 * provide out-of-the-box support for labels and validation messages, both read from the Model.
 */
export class HoistInput extends Component {

    static propTypes = {
        /** Value of the control, if provided directly. */
        value: PT.any,

        /** Handler called when value changes - passed the new value. */
        onChange: PT.func,

        /** Handler called when value is committed to backing model - passed the new value. */
        onCommit: PT.func,

        /** Bound HoistModel instance. */
        model: PT.object,

        /** Property name on bound Model from which to read/write data. */
        field: PT.string,

        /** True to disable user interaction. */
        disabled: PT.bool,

        /** Style block. */
        style: PT.object,

        /** CSS class name. **/
        className: PT.string,

        /** HTML id attribute **/
        id: PT.string,

        /** Tab order for focus control, or -1 to skip. If unset, browser layout-based order. **/
        tabIndex: PT.number
    };

    @observable hasFocus;
    @observable internalValue;

    constructor(props) {
        super(props);

        // Ensure that updates to the external value - sourced from either model or props - are
        // always flushed to the internal value of this control and reflected in renderValue.
        this.addReaction({
            track: () => this.externalValue,
            run: (externalVal) => {
                this.setInternalValue(this.toInternal(externalVal));
            },
            fireImmediately: true
        });
    }

    /**
     * Model-based Field (if any) associated with this control.
     */
    getField() {
        const {model, field} = this.props;
        return model && field && model.hasFieldSupport && model.getField(field);
    }

    //------------------------------
    // Value conversion / committing
    //------------------------------
    /**
     * Should the input commit immediately when value is changed?
     * Components can/do provide a prop to override this value.
     */
    get commitOnChange() {
        return true;
    }

    /** The value to be rendered internally by control. **/
    @computed
    get renderValue() {
        return this.hasFocus ?
            this.internalValue :
            this.toInternal(this.externalValue);
    }

    /**
     * The external value associated with control.
     * For bound controls, this is the most recent value committed to the Model.
     */
    @computed
    get externalValue() {
        const {value, model, field} = this.props;
        if (model && field) {
            return model[field];
        }
        return value;
    }

    /** Set internal value. **/
    @action
    setInternalValue(val) {
        this.internalValue = val;
    }

    /**
     * Set normalized internal value and fire associated change events.
     * This is the primary method for HoistInput implementations to call on value change.
     */
    noteValueChange(val) {
        const {onChange} = this.props;

        this.setInternalValue(val);
        if (onChange) onChange(this.toExternal(val));
        if (this.commitOnChange) this.doCommit();
    }

    /**
     * Commit the internal value to the external value.
     * Fire commit handlers and synchronize state.
     */
    doCommit() {
        const {onCommit, model, field} = this.props;
        let externalValue = this.externalValue,
            newValue = this.toExternal(this.internalValue);

        if (newValue === externalValue) return;

        if (model && field) {
            const setterName = `set${upperFirst(field)}`;
            throwIf(!isFunction(model[setterName]), `Required function '${setterName}()' not found on bound model`);

            model[setterName](newValue);
            newValue = this.externalValue; // Round trip this, in case model decides to intervene.
        }

        if (onCommit) onCommit(newValue);
        this.setInternalValue(this.toInternal(newValue));
    }

    /** Hook to convert an internal representation of the value to an appropriate external one. */
    toExternal(internal) {
        return internal;
    }

    /** Hook to convert an external representation of the value to an appropriate internal one. */
    toInternal(external) {
        return external;
    }


    //------------------------------
    // Focus Management
    //------------------------------
    /**
     * To be called when the Component has lost focus. Direct subclasses of HoistInput must call
     * via a handler on an appropriate rendered element. A default handler implementation is below.
     */
    @action
    noteBlurred() {
        if (!this.hasFocus) return;
        
        this.doCommit();
        
        const field = this.getField();
        if (field) field.startValidating();

        this.hasFocus = false;
    }

    onBlur = () => {
        // Focus very frequently will be jumping internally from element to element *within* a control.
        // This delay prevents extraneous 'flapping' of focus state at this level.
        wait(200).then(() => {
            if (!this.containsElement(document.activeElement)) {
                this.noteBlurred();
            }
        });
    }

    /**
     * To be called when the Component gains focus. Direct subclasses of HoistInput must call
     * via a handler on an appropriate rendered element. A default handler implementation is below.
     */
    @action
    noteFocused() {
        if (this.hasFocus) return;
        
        this.setInternalValue(this.toInternal(this.externalValue));
        this.hasFocus = true;
    }

    onFocus = () => this.noteFocused();


    //-----------------------------
    // Additional Utilities
    //-----------------------------
    /**
     * Override of HoistComponent so we can add the xh-input and xh-input-invalid classes.
     * @param {...String} extraClassNames
     * @returns {String}
     */
    getClassName(...extraClassNames) {
        const field = this.getField(),
            validityClass = field && field.isNotValid ? 'xh-input-invalid' : null;

        return classNames('xh-input', validityClass, this.baseClassName, this.props.className, ...extraClassNames);
    }

}