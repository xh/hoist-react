/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {FieldModel} from '@xh/hoist/cmp/form';
import {action, computed, observable, makeObservable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {isEqual} from 'lodash';
import {createRef} from 'react';
import './HoistInput.scss';


/**
 * Abstract superclass for a LocalModel supporting Input components in Hoist.  This class provides
 * common functionality around reading, writing, converting, and displaying input values.
 *
 * If building a classic data-entry form (i.e. multiple labelled inputs used to enter or edit a
 * chunk of data), please review and consider the use of Form and FormField components and their
 * corresponding models. They work together as a system with child HoistInputs to provide
 * consolidated data initialization and extraction, support for client-side validation, and more.
 *
 * HoistInputs can *either* operate in bound mode or in standard controlled mode.
 *      + If provided with `model` and `bind` props (either directly or via a parent FormField),
 *        they will will operate in bound mode, reading their value from the model and writing back
 *        to it on commit (as described below).
 *      + Otherwise, they will get their value directly via the `value` prop.
 *
 * Note that providing a model as a value source may allow for more efficient (re)rendering in a
 * MobX context. The bound value is only read *within* this control, so that changes to its value
 * do not cause the parent of this control to re-render.
 *
 * Regardless of mode, HoistInputs will call an `onChange` callback prop with the latest value
 * as they are updated. They also introduce the notion of "committing" a value to the model when the
 * user has completed a discrete act of data entry. This will vary by input but is commonly marked
 * by the user blurring the input, selecting a record from a combo, or pressing the <enter> key.
 * At this time, any specified `onCommit` callback prop will be called and the value will be flushed
 * back to any bound model.
 *
 * For many inputs (e.g. checkbox, select, switchInput, slider) commit always fires at the same time
 * as the change event. Other inputs such as textInput maintain the distinction described above,
 * but expose a `commitOnChange` prop to force them to eagerly flush their values on every change.
 */
export class HoistInputModel extends HoistModel {

    /** External model of input (may be bound to this) */
    model;

    /** Props on input */
    @observable.ref props;

    /** Ref to rendered component */
    ref = createRef();

    @observable hasFocus = false;
    @observable.ref internalValue = null;

    constructor(props) {
        super();
        makeObservable(this);
        this.model = props.model;
        throwIf(props.onKeyPress, "HoistInputs no longer support a 'onKeyPress' property.  Use 'onKeyDown' instead.");
        throwIf(props.field, "HoistInput no longer supports a 'field' property.  Use 'bind' instead.");

        this.addReaction(this.externalValueReaction());
    }

    /** @return {FieldModel} (if any) associated with this control. */
    getField() {
        const {model} = this;
        return model &&  model instanceof FieldModel ? model : null;
    }

    //------------------------------
    // Value conversion / committing
    //------------------------------
    /**
     * True if this input should commit immediately when its value is changed.
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
            this.internalFromExternal();
    }

    /**
     * The external value associated with control.
     * For bound controls, this is the most recent value committed to the Model.
     */
    @computed
    get externalValue() {
        const {value, bind} = this.props,
            {model} = this;
        if (model && bind) {
            return model[bind];
        }
        return value;
    }

    @action
    setInternalValue(val) {
        if (isEqual(val, this.internalValue)) return;
        this.internalValue = val;
    }

    /**
     * Set normalized internal value and fire associated change events.
     * This is the primary method for HoistInput implementations to call on value change.
     */
    noteValueChange(val) {
        const {onChange} = this.props,
            oldVal = this.internalValue;

        this.setInternalValue(val);
        if (onChange) onChange(this.toExternal(val), this.toExternal(oldVal));
        if (this.commitOnChange) this.doCommitInternal();
    }

    /**
     * Commit the internal value to the external value, fire commit handlers, and synchronize state.
     */
    doCommit() {
        this.doCommitInternal();
        // After explicit commit, we want to fully round-trip external value to get canonical value.
        this.setInternalValue(this.internalFromExternal());
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
     * To be called when the Component has lost focus. Direct subclasses must call
     * via a handler on an appropriate rendered element. A default handler implementation is below.
     */
    @action
    noteBlurred() {
        if (!this.hasFocus) return;

        this.doCommit();

        const field = this.getField();
        if (field) field.displayValidation();

        this.hasFocus = false;
    }

    onBlur = (e) => {
        // Ignore focus jumping internally from *within* the control.
        if (!this.containsElement(e.relatedTarget)) {
            this.noteBlurred();
        }
    };

    /**
     * To be called when the Component gains focus. Direct subclasses must call
     * via a handler on an appropriate rendered element. A default handler implementation is below.
     */
    @action
    noteFocused() {
        if (this.hasFocus) return;

        this.setInternalValue(this.internalFromExternal());
        this.hasFocus = true;
    }

    onFocus = () => this.noteFocused();


    //-----------------------------
    // Additional Utilities
    //-----------------------------
    /**
     * Wrapper around classNames that can add the xh-input and xh-input-invalid classes.
     * @param {...String} extraClassNames
     * @returns {string}
     */
    getClassName(...extraClassNames) {
        const field = this.getField(),
            validityClass = field && field.isNotValid && field.validationDisplayed ? 'xh-input-invalid' : null,
            disabledClass = this.props.disabled ? 'xh-input-disabled' : null;

        return classNames('xh-input', validityClass, disabledClass, this.baseClassName, this.props.className, ...extraClassNames);
    }


    //----------------------
    // Implementation
    //------------------------
    internalFromExternal() {
        const ret = this.toInternal(this.externalValue);

        // keep references consistent (to prevent unwanted renders)
        if (isEqual(this.internalValue, ret)) return this.internalValue;

        return ret;
    }

    externalFromInternal() {
        return this.toExternal(this.internalValue);
    }


    // Ensure that updates to the external value - are always flushed to the internal value but
    // only change internal if not already a valid representation of external to avoid flapping
    externalValueReaction() {
        return {
            track: () => this.externalValue,
            run: (externalVal) => {
                if (this.externalFromInternal() != externalVal) {
                    this.setInternalValue(this.toInternal(externalVal));
                }
            },
            fireImmediately: true
        };
    }

    doCommitInternal() {
        const {onCommit, bind} = this.props,
            {model} = this;
        let currentValue = this.externalValue,
            newValue = this.externalFromInternal();

        if (isEqual(newValue, currentValue)) return;

        if (model && bind) {
            model.setBindable(bind, newValue);
            newValue = this.externalValue; // Re-read effective value after set in case model setter had an opinion
        }

        if (onCommit) onCommit(newValue, currentValue);
    }

    containsElement(elem) {
        const thisElem = this.ref.current;
        if (thisElem) {
            while (elem) {
                if (elem === thisElem) return true;
                elem = elem.parentElement;
            }
        }
        return false;
    }
}